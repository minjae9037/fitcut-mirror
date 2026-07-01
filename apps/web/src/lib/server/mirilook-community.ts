import {
  pilotCommunityPosts,
  type MirilookCommunityPost,
} from "@/lib/mirilook-community";
import { getSupabaseAdminClient } from "@/lib/server/supabase-admin";

type CommunityPostRow = {
  anonymous_name: string | null;
  body: string | null;
  created_at: string | null;
  dm_policy: string | null;
  id: string;
  purpose: string | null;
  requester_gender: string | null;
  status: string | null;
  target_gender: string | null;
  title: string | null;
};

type VoteRow = {
  post_id: string | null;
  tags: string[] | null;
};

type CommentRow = {
  post_id: string | null;
};

export async function loadCommunityPosts(): Promise<{
  connected: boolean;
  posts: MirilookCommunityPost[];
}> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return {
      connected: false,
      posts: pilotCommunityPosts,
    };
  }

  const postResult = await supabase
    .from("community_posts")
    .select(
      "id, anonymous_name, title, body, purpose, requester_gender, target_gender, dm_policy, status, created_at",
    )
    .eq("post_type", "vote")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(12);

  if (postResult.error) {
    console.error("community posts load failed", postResult.error);

    return {
      connected: true,
      posts: pilotCommunityPosts,
    };
  }

  const rows = (postResult.data ?? []) as CommunityPostRow[];
  const postIds = rows.map((row) => row.id);

  if (!postIds.length) {
    return {
      connected: true,
      posts: pilotCommunityPosts,
    };
  }

  const [voteResult, commentResult] = await Promise.all([
    supabase
      .from("style_votes")
      .select("post_id, tags")
      .in("post_id", postIds)
      .neq("status", "hidden"),
    supabase
      .from("community_comments")
      .select("post_id")
      .in("post_id", postIds)
      .eq("status", "published"),
  ]);

  if (voteResult.error || commentResult.error) {
    console.error("community interactions load failed", {
      comments: commentResult.error,
      votes: voteResult.error,
    });
  }

  const votesByPost = groupVotes((voteResult.data ?? []) as VoteRow[]);
  const commentsByPost = groupCounts((commentResult.data ?? []) as CommentRow[]);

  return {
    connected: true,
    posts: rows.map((row) => {
      const voteSummary = votesByPost.get(row.id);

      return {
        anonymousName: row.anonymous_name || "익명",
        body: row.body || "",
        commentCount: commentsByPost.get(row.id) ?? 0,
        createdAt: row.created_at || new Date().toISOString(),
        dmPolicy: row.dm_policy === "allow" ? "allow" : "deny",
        id: row.id,
        purpose: row.purpose || "스타일 투표",
        requesterGender: normalizeGender(row.requester_gender),
        status: row.status || "published",
        targetGender: normalizeGender(row.target_gender),
        title: row.title || "스타일 투표",
        topTags: voteSummary?.topTags ?? [],
        voteCount: voteSummary?.count ?? 0,
      };
    }),
  };
}

function groupVotes(rows: VoteRow[]) {
  const grouped = new Map<string, { count: number; tagCounts: Map<string, number> }>();

  rows.forEach((row) => {
    if (!row.post_id) {
      return;
    }

    const current =
      grouped.get(row.post_id) ?? { count: 0, tagCounts: new Map<string, number>() };

    current.count += 1;
    (row.tags ?? []).forEach((tag) => {
      current.tagCounts.set(tag, (current.tagCounts.get(tag) ?? 0) + 1);
    });
    grouped.set(row.post_id, current);
  });

  return new Map(
    Array.from(grouped.entries()).map(([postId, summary]) => [
      postId,
      {
        count: summary.count,
        topTags: Array.from(summary.tagCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([tag]) => tag),
      },
    ]),
  );
}

function groupCounts(rows: CommentRow[]) {
  const grouped = new Map<string, number>();

  rows.forEach((row) => {
    if (row.post_id) {
      grouped.set(row.post_id, (grouped.get(row.post_id) ?? 0) + 1);
    }
  });

  return grouped;
}

function normalizeGender(value: string | null): MirilookCommunityPost["requesterGender"] {
  if (value === "male" || value === "female" || value === "other") {
    return value;
  }

  return null;
}
