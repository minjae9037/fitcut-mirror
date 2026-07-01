import {
  getSupabaseAdminClient,
  getVerifiedSupabaseUser,
} from "@/lib/server/supabase-admin";
import { queueNotificationEvent } from "@/lib/server/notifications";
import { protectMutationRequest } from "@/lib/server/request-security";

export const runtime = "nodejs";
export const maxDuration = 30;

type VoteRequestPayload = {
  body?: string;
  contact?: string;
  dmPolicy?: "allow" | "deny";
  purpose?: string;
  requesterGender?: "male" | "female" | "other";
  title?: string;
};

export async function POST(request: Request) {
  const securityError = protectMutationRequest(request, {
    maxBodyBytes: 32 * 1024,
    rateLimit: {
      key: "community:vote-requests",
      limit: 24,
      windowMs: 10 * 60 * 1000,
    },
  });

  if (securityError) {
    return securityError;
  }

  let payload: VoteRequestPayload;

  try {
    payload = (await request.json()) as VoteRequestPayload;
  } catch {
    return Response.json({ error: "Invalid vote request payload." }, { status: 400 });
  }

  const title = sanitizeText(payload.title, 100);
  const body = sanitizeText(payload.body, 1000);

  if (!title || !body) {
    return Response.json(
      { error: "Title and body are required." },
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

  const dmPolicy = payload.dmPolicy === "allow" ? "allow" : "deny";
  const purpose = sanitizeText(payload.purpose, 80);
  const requesterGender = normalizeGender(payload.requesterGender);
  const targetGender = getTargetGender(requesterGender);
  const user = await getVerifiedSupabaseUser(request);

  const insert = await supabase
    .from("community_posts")
    .insert({
      anonymous_name: "익명",
      body,
      contact: sanitizeText(payload.contact, 120),
      dm_policy: dmPolicy,
      post_type: "vote",
      profile_id: user?.id ?? null,
      purpose,
      requester_gender: requesterGender,
      status: "pending",
      target_gender: targetGender,
      title,
      visibility: "pilot",
    })
    .select("id")
    .single();

  if (insert.error) {
    console.error("vote request insert failed", insert.error);

    return Response.json(
      {
        accepted: false,
        reason: "supabase_insert_failed",
      },
      { status: 500 },
    );
  }

  const notification = await queueNotificationEvent({
    body: "새 스타일 투표 요청이 접수되었습니다. 관리자 화면에서 공개 여부를 확인해 주세요.",
    eventType: "community_vote_request",
    payload: {
      dmPolicy,
      postId: insert.data?.id,
      purpose,
      requesterGender,
      targetGender,
      title,
    },
    title: "새 스타일 투표 요청",
    url: "/admin",
  });

  return Response.json({
    accepted: true,
    notificationQueued: notification.queued,
    notificationReason: notification.queued ? undefined : notification.reason,
  });
}

function normalizeGender(value: unknown) {
  if (value === "male" || value === "female" || value === "other") {
    return value;
  }

  return null;
}

function getTargetGender(value: "female" | "male" | "other" | null) {
  if (value === "male") {
    return "female";
  }

  if (value === "female") {
    return "male";
  }

  return null;
}

function sanitizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed ? trimmed.slice(0, maxLength) : null;
}
