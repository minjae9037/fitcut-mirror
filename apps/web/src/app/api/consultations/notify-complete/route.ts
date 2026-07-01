import { readServerEnv } from "@/lib/server/env";
import {
  dispatchQueuedNotifications,
  queueNotificationEvent,
} from "@/lib/server/notifications";
import { getSupabaseAdminClient } from "@/lib/server/supabase-admin";

const APP_URL = "https://mirilook.com";

export const runtime = "nodejs";
export const maxDuration = 30;

// Internal endpoint: the background consultation job calls this on completion to
// notify the session owner via web push ("your board is ready") even after they
// have left the page. Web-push keys live on Vercel, so delivery happens here.
// Authenticated with the Supabase service-role key (task-only, server-to-server).

type NotifyPayload = { sessionId?: string };

type SessionRow = {
  profile_id: string | null;
  status: string | null;
  style_name: string | null;
};

export async function POST(request: Request) {
  const serviceKey = readServerEnv("SUPABASE_SERVICE_ROLE_KEY");
  const authHeader = request.headers.get("authorization") ?? "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!serviceKey || !bearer || bearer !== serviceKey) {
    return Response.json({ notified: false, reason: "unauthorized" }, { status: 401 });
  }

  let payload: NotifyPayload;

  try {
    payload = (await request.json()) as NotifyPayload;
  } catch {
    return Response.json({ notified: false, reason: "invalid_payload" }, { status: 400 });
  }

  const sessionId = (payload.sessionId ?? "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 120);

  if (!sessionId) {
    return Response.json({ notified: false, reason: "missing_session" }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return Response.json({ notified: false, reason: "supabase_not_configured" });
  }

  const sessionResult = await supabase
    .from("generation_sessions")
    .select("profile_id, status, style_name")
    .eq("id", sessionId)
    .maybeSingle<SessionRow>();

  const session = sessionResult.data;

  if (!session?.profile_id) {
    return Response.json({ notified: false, reason: "session_not_found" });
  }

  const styleName = (session.style_name ?? "").trim();
  const body = styleName
    ? `${styleName} 상담용 9장이 완성되었습니다. 히스토리에서 확인하세요.`
    : "상담용 이미지가 완성되었습니다. 히스토리에서 확인하세요.";

  const queued = await queueNotificationEvent({
    body,
    eventType: "consultation_ready",
    payload: { sessionId },
    targetProfileId: session.profile_id,
    title: "미리룩 상담 이미지 완성",
    url: "/history",
  });

  if (!queued.queued) {
    return Response.json({ notified: false, reason: queued.reason });
  }

  const dispatch = await dispatchQueuedNotifications(20);

  // Also email the owner (reaches users who didn't enable push). Best-effort.
  const emailed = await sendCompletionEmail(supabase, session.profile_id, styleName);

  return Response.json({
    dispatched: dispatch,
    emailed,
    eventId: queued.eventId,
    notified: true,
  });
}

async function sendCompletionEmail(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  profileId: string,
  styleName: string,
): Promise<boolean> {
  const apiKey = readServerEnv("RESEND_API_KEY");
  const fromEmail = readServerEnv("RESEND_FROM_EMAIL");

  if (!apiKey || !fromEmail) {
    return false;
  }

  try {
    const profile = await supabase
      .from("profiles")
      .select("email")
      .eq("id", profileId)
      .maybeSingle<{ email: string | null }>();

    const to = (profile.data?.email ?? "").trim();

    if (!to || !to.includes("@")) {
      return false;
    }

    const styleLabel = styleName ? `${styleName} ` : "";
    const html = `
<div style="font-family:Apple SD Gothic Neo,Malgun Gothic,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1d1912">
  <h2 style="margin:0 0 8px">미리룩 상담 이미지가 완성되었어요</h2>
  <p style="margin:0 0 16px;line-height:1.6;color:#5b5144">${styleLabel}상담용 9각도 이미지 생성이 끝났습니다. 아래 버튼에서 결과를 확인하고 미용사에게 공유하세요.</p>
  <a href="${APP_URL}/history" style="display:inline-block;background:#f3d28a;color:#1a1712;font-weight:700;text-decoration:none;padding:12px 20px;border-radius:8px">결과 보러가기</a>
  <p style="margin:20px 0 0;font-size:12px;color:#8f826f">미리룩 · Miri Look</p>
</div>`;

    const response = await fetch("https://api.resend.com/emails", {
      body: JSON.stringify({
        from: fromEmail,
        html,
        subject: "미리룩 상담 이미지가 완성되었어요",
        to: [to],
      }),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    return response.ok;
  } catch (error) {
    console.warn("completion email failed", error);
    return false;
  }
}
