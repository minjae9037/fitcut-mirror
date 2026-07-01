import {
  getSupabaseAdminClient,
  getVerifiedSupabaseUser,
} from "@/lib/server/supabase-admin";
import { queueNotificationEvent } from "@/lib/server/notifications";
import { protectMutationRequest } from "@/lib/server/request-security";

export const runtime = "nodejs";
export const maxDuration = 30;

const allowedTargetTypes = new Set([
  "community_post",
  "community_comment",
  "community_message",
  "social_post",
  "style_vote",
  "review",
  "share",
  "consultation",
]);

type ModerationReportPayload = {
  body?: string;
  reason?: string;
  reporterContact?: string;
  targetId?: string;
  targetType?: string;
};

export async function POST(request: Request) {
  const securityError = protectMutationRequest(request, {
    maxBodyBytes: 32 * 1024,
    rateLimit: {
      key: "moderation:reports",
      limit: 30,
      windowMs: 10 * 60 * 1000,
    },
  });

  if (securityError) {
    return securityError;
  }

  let payload: ModerationReportPayload;

  try {
    payload = (await request.json()) as ModerationReportPayload;
  } catch {
    return Response.json({ error: "Invalid report payload." }, { status: 400 });
  }

  const targetType = sanitizeTargetType(payload.targetType);
  const targetId = sanitizeText(payload.targetId, 140);
  const reason = sanitizeText(payload.reason, 120);

  if (!targetType || !targetId || !reason) {
    return Response.json(
      { error: "Target type, target id, and reason are required." },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return Response.json({
      accepted: false,
      reason: "supabase_not_configured",
    });
  }

  const user = await getVerifiedSupabaseUser(request);
  const body = sanitizeText(payload.body, 1000);
  const reporterContact = sanitizeText(payload.reporterContact, 160);

  const insert = await supabase
    .from("moderation_events")
    .insert({
      body,
      reason,
      reporter_contact: reporterContact,
      reporter_profile_id: user?.id ?? null,
      status: "new",
      target_id: targetId,
      target_type: targetType,
    })
    .select("id")
    .single();

  if (insert.error) {
    console.error("moderation report insert failed", insert.error);

    return Response.json(
      {
        accepted: false,
        reason: "supabase_insert_failed",
      },
      { status: 500 },
    );
  }

  const notification = await queueNotificationEvent({
    body: `새 신고가 접수되었습니다. 대상: ${targetType} / 사유: ${reason}`,
    eventType: "moderation_report",
    payload: {
      reportId: insert.data?.id,
      targetId,
      targetType,
    },
    title: "커뮤니티 신고 접수",
    url: "/admin",
  });

  return Response.json({
    accepted: true,
    notificationQueued: notification.queued,
    notificationReason: notification.queued ? undefined : notification.reason,
    reportId: insert.data?.id,
  });
}

function sanitizeTargetType(value: unknown) {
  const text = sanitizeText(value, 80);

  return text && allowedTargetTypes.has(text) ? text : "";
}

function sanitizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.replace(/[<>]/g, "").trim();

  return trimmed ? trimmed.slice(0, maxLength) : null;
}
