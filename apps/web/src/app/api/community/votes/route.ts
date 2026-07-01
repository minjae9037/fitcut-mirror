import { getSupabaseAdminClient } from "@/lib/server/supabase-admin";
import { queueNotificationEvent } from "@/lib/server/notifications";
import { protectMutationRequest } from "@/lib/server/request-security";

export const runtime = "nodejs";
export const maxDuration = 30;

type VotePayload = {
  comment?: string;
  postId?: string;
  selectedStyleId?: string;
  tags?: string[];
  voterGender?: string;
};

export async function POST(request: Request) {
  const securityError = protectMutationRequest(request, {
    maxBodyBytes: 32 * 1024,
    rateLimit: {
      key: "community:votes",
      limit: 80,
      windowMs: 10 * 60 * 1000,
    },
  });

  if (securityError) {
    return securityError;
  }

  let payload: VotePayload;

  try {
    payload = (await request.json()) as VotePayload;
  } catch {
    return Response.json({ error: "Invalid vote payload." }, { status: 400 });
  }

  const postId = sanitizeUuid(payload.postId);
  const tags = sanitizeStringArray(payload.tags, 6);

  if (!postId || !tags.length) {
    return Response.json(
      { error: "Post id and at least one vote tag are required." },
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
    .select("id, status, target_gender, profile_id")
    .eq("id", postId)
    .maybeSingle();

  if (post.error) {
    console.error("community vote post lookup failed", post.error);

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

  const voterGender = normalizeGender(payload.voterGender);

  if (
    (post.data.target_gender === "male" || post.data.target_gender === "female") &&
    voterGender !== post.data.target_gender
  ) {
    return Response.json(
      {
        accepted: false,
        reason: "target_gender_mismatch",
      },
      { status: 403 },
    );
  }

  const insert = await supabase.from("style_votes").insert({
    comment: sanitizeText(payload.comment, 500),
    post_id: postId,
    selected_style_id: sanitizeText(payload.selectedStyleId, 120),
    status: "published",
    tags,
    voter_gender: voterGender,
  });

  if (insert.error) {
    console.error("community vote insert failed", insert.error);

    return Response.json(
      {
        accepted: false,
        reason: "supabase_insert_failed",
      },
      { status: 500 },
    );
  }

  const notification = await queueNotificationEvent({
    body: "새 스타일 투표가 도착했습니다. 커뮤니티에서 반응을 확인해 보세요.",
    eventType: "community_vote",
    payload: {
      postId,
      selectedStyleId: sanitizeText(payload.selectedStyleId, 120),
      tags,
    },
    targetProfileId: post.data.profile_id ?? undefined,
    title: "새 스타일 투표",
    url: "/votes",
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

function sanitizeStringArray(value: unknown, maxItems: number) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.replace(/[<>]/g, "").trim().slice(0, 40))
    .filter(Boolean)
    .slice(0, maxItems);
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
