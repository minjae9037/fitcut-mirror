import { getSupabaseAdminClient, getVerifiedSupabaseUser } from "@/lib/server/supabase-admin";
import { protectMutationRequest } from "@/lib/server/request-security";

export const runtime = "nodejs";
export const maxDuration = 30;

type ReactionPayload = {
  postId?: string;
  reactionType?: "like" | "dislike";
  sessionKey?: string;
};

export async function POST(request: Request) {
  const securityError = protectMutationRequest(request, {
    maxBodyBytes: 16 * 1024,
    rateLimit: {
      key: "community:social-reactions",
      limit: 120,
      windowMs: 10 * 60 * 1000,
    },
  });

  if (securityError) {
    return securityError;
  }

  let payload: ReactionPayload;

  try {
    payload = (await request.json()) as ReactionPayload;
  } catch {
    return Response.json({ error: "Invalid reaction payload." }, { status: 400 });
  }

  const postId = sanitizeUuid(payload.postId);
  const reactionType =
    payload.reactionType === "dislike" ? "dislike" : payload.reactionType === "like" ? "like" : "";

  if (!postId || !reactionType) {
    return Response.json(
      { accepted: false, reason: "invalid_reaction" },
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
    console.error("social reaction post lookup failed", post.error);

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

  const existingQuery = supabase
    .from("social_reactions")
    .select("id")
    .eq("post_id", postId)
    .limit(1);
  const existing = user
    ? await existingQuery.eq("reactor_profile_id", user.id).maybeSingle()
    : await existingQuery
        .is("reactor_profile_id", null)
        .eq("session_key", sessionKey)
        .maybeSingle();

  if (existing.error) {
    console.error("social reaction lookup failed", existing.error);

    return Response.json(
      { accepted: false, reason: "supabase_lookup_failed" },
      { status: 500 },
    );
  }

  const result = existing.data
    ? await supabase
        .from("social_reactions")
        .update({ reaction_type: reactionType })
        .eq("id", existing.data.id)
    : await supabase.from("social_reactions").insert({
        post_id: postId,
        reaction_type: reactionType,
        reactor_profile_id: user?.id ?? null,
        session_key: user ? null : sessionKey,
      });

  if (result.error) {
    console.error("social reaction save failed", result.error);

    return Response.json(
      { accepted: false, reason: "supabase_save_failed" },
      { status: 500 },
    );
  }

  const counts = await loadReactionCounts(postId);

  return Response.json({
    accepted: true,
    dislikeCount: counts.dislikes,
    likeCount: counts.likes,
    reactionType,
  });
}

async function loadReactionCounts(postId: string) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return { dislikes: 0, likes: 0 };
  }

  const result = await supabase
    .from("social_reactions")
    .select("reaction_type")
    .eq("post_id", postId);

  if (result.error) {
    console.error("social reaction count failed", result.error);
    return { dislikes: 0, likes: 0 };
  }

  return ((result.data ?? []) as Array<{ reaction_type: string | null }>).reduce(
    (counts, row) => {
      if (row.reaction_type === "like") {
        counts.likes += 1;
      }

      if (row.reaction_type === "dislike") {
        counts.dislikes += 1;
      }

      return counts;
    },
    { dislikes: 0, likes: 0 },
  );
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
