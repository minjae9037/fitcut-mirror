import { getSupabaseAdminClient } from "@/lib/server/supabase-admin";
import { queueNotificationEvent } from "@/lib/server/notifications";
import { protectMutationRequest } from "@/lib/server/request-security";

export const runtime = "nodejs";
export const maxDuration = 30;

type MessagePayload = {
  body?: string;
  contact?: string;
  postId?: string;
  senderName?: string;
};

export async function POST(request: Request) {
  const securityError = protectMutationRequest(request, {
    maxBodyBytes: 32 * 1024,
    rateLimit: {
      key: "community:messages",
      limit: 40,
      windowMs: 10 * 60 * 1000,
    },
  });

  if (securityError) {
    return securityError;
  }

  let payload: MessagePayload;

  try {
    payload = (await request.json()) as MessagePayload;
  } catch {
    return Response.json({ error: "Invalid message payload." }, { status: 400 });
  }

  const postId = sanitizeUuid(payload.postId);
  const body = sanitizeText(payload.body, 1000);

  if (!postId || !body) {
    return Response.json(
      { error: "Post id and message body are required." },
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

  const post = await supabase
    .from("community_posts")
    .select("id, dm_policy, status, profile_id")
    .eq("id", postId)
    .maybeSingle();

  if (post.error) {
    console.error("community message post lookup failed", post.error);

    return Response.json(
      {
        accepted: false,
        reason: "post_lookup_failed",
      },
      { status: 500 },
    );
  }

  if (!post.data || post.data.status !== "published") {
    return Response.json(
      {
        accepted: false,
        reason: "post_not_available",
      },
      { status: 404 },
    );
  }

  if (post.data.dm_policy !== "allow") {
    return Response.json(
      {
        accepted: false,
        reason: "dm_not_allowed",
      },
      { status: 403 },
    );
  }

  const insert = await supabase.from("community_messages").insert({
    body,
    contact: sanitizeText(payload.contact, 120),
    post_id: postId,
    sender_name: sanitizeText(payload.senderName, 60),
    status: "pending",
  });

  if (insert.error) {
    console.error("community message insert failed", insert.error);

    return Response.json(
      {
        accepted: false,
        reason: "supabase_insert_failed",
      },
      { status: 500 },
    );
  }

  const notification = await queueNotificationEvent({
    body: "새 DM 요청이 도착했습니다. 관리자 화면에서 전달 여부를 확인해 주세요.",
    eventType: "community_dm",
    payload: {
      contact: sanitizeText(payload.contact, 120),
      postId,
      senderName: sanitizeText(payload.senderName, 60),
    },
    targetProfileId: post.data.profile_id ?? undefined,
    title: "새 커뮤니티 DM 요청",
    url: "/votes",
  });

  return Response.json({
    accepted: true,
    notificationQueued: notification.queued,
    notificationReason: notification.queued ? undefined : notification.reason,
  });
}

function sanitizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.replace(/[<>]/g, "").trim();

  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function sanitizeUuid(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  const trimmed = value.trim();

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    trimmed,
  )
    ? trimmed
    : "";
}
