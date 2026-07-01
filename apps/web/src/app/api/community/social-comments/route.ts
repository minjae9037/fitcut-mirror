import { type MirilookSocialComment } from "@/lib/mirilook-social";
import { queueNotificationEvent } from "@/lib/server/notifications";
import { protectMutationRequest } from "@/lib/server/request-security";
import {
  getSupabaseAdminClient,
  getVerifiedSupabaseUser,
} from "@/lib/server/supabase-admin";

export const runtime = "nodejs";
export const maxDuration = 30;

type CommentPayload = {
  body?: string;
  displayName?: string;
  postId?: string;
  sessionKey?: string;
};

export async function POST(request: Request) {
  const securityError = protectMutationRequest(request, {
    maxBodyBytes: 32 * 1024,
    rateLimit: {
      key: "community:social-comments",
      limit: 60,
      windowMs: 10 * 60 * 1000,
    },
  });

  if (securityError) {
    return securityError;
  }

  let payload: CommentPayload;

  try {
    payload = (await request.json()) as CommentPayload;
  } catch {
    return Response.json({ error: "Invalid comment payload." }, { status: 400 });
  }

  const postId = sanitizeUuid(payload.postId);
  const body = sanitizeText(payload.body, 500);

  if (!postId || !body) {
    return Response.json(
      { accepted: false, reason: "comment_required" },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return Response.json({ accepted: false, reason: "supabase_not_configured" });
  }

  const user = await getVerifiedSupabaseUser(request);
  const sessionKey = sanitizeText(payload.sessionKey, 80);

  if (!user && !sessionKey) {
    return Response.json(
      { accepted: false, reason: "session_required" },
      { status: 400 },
    );
  }

  const post = await supabase
    .from("social_posts")
    .select("id, status, visibility")
    .eq("id", postId)
    .maybeSingle();

  if (post.error) {
    console.error("social comment post lookup failed", post.error);

    return Response.json(
      { accepted: false, reason: "post_lookup_failed" },
      { status: 500 },
    );
  }

  if (!post.data || post.data.status !== "published" || post.data.visibility !== "public") {
    return Response.json(
      { accepted: false, reason: "post_not_available" },
      { status: 404 },
    );
  }

  const profile = user
    ? await supabase
        .from("profiles")
        .select("display_name, email, handle")
        .eq("id", user.id)
        .maybeSingle()
    : null;

  if (profile?.error) {
    console.error("social comment profile lookup failed", profile.error);
  }

  const displayName =
    sanitizeText(profile?.data?.display_name, 60) ||
    sanitizeText(payload.displayName, 60) ||
    sanitizeText(user?.email?.split("@")[0], 60) ||
    "미리룩 방문자";
  const handle =
    sanitizeHandle(profile?.data?.handle) ||
    (user ? createHandle(displayName, user.id) : undefined);

  const insert = await supabase
    .from("social_comments")
    .insert({
      body,
      commenter_profile_id: user?.id ?? null,
      display_name: displayName,
      handle: handle ?? null,
      post_id: postId,
      session_key: user ? null : sessionKey,
      status: "published",
    })
    .select("id, created_at")
    .single();

  if (insert.error) {
    console.error("social comment insert failed", insert.error);

    return Response.json(
      { accepted: false, reason: "supabase_insert_failed" },
      { status: 500 },
    );
  }

  const count = await supabase
    .from("social_comments")
    .select("*", { count: "exact", head: true })
    .eq("post_id", postId)
    .eq("status", "published");

  await queueNotificationEvent({
    body: "커뮤니티 게시물에 새 댓글이 달렸습니다.",
    eventType: "community_comment",
    payload: {
      commentId: insert.data.id,
      postId,
    },
    title: "새 커뮤니티 댓글",
    url: `/community?post=${postId}`,
  });

  const comment: MirilookSocialComment = {
    body,
    createdAt: insert.data.created_at ?? new Date().toISOString(),
    displayName,
    handle,
    id: insert.data.id,
  };

  return Response.json({
    accepted: true,
    comment,
    commentCount: count.count ?? null,
  });
}

function sanitizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return "";
  }

  const trimmed = value.replace(/[<>]/g, "").trim();

  return trimmed.slice(0, maxLength);
}

function sanitizeHandle(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .toLowerCase()
    .replace(/[^a-z0-9가-힣_.-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

function sanitizeUuid(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  const trimmed = value.trim();

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(
    trimmed,
  )
    ? trimmed
    : "";
}

function createHandle(displayName: string, userId: string) {
  return (
    sanitizeHandle(`${displayName}_${userId.slice(0, 6)}`) ||
    `member_${userId.slice(0, 6)}`
  );
}
