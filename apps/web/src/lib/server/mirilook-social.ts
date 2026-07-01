import {
  pilotSocialPosts,
  pilotSocialProfiles,
  type MirilookSocialPost,
  type MirilookSocialProfile,
  type MirilookSocialComment,
} from "@/lib/mirilook-social";
import {
  getSocialPostStorageBucket,
  getSupabaseAdminClient,
} from "@/lib/server/supabase-admin";
import { resolveProfileAvatarUrl } from "@/lib/server/profile-avatar";

type SocialPostRow = {
  body: string | null;
  created_at: string | null;
  display_name: string | null;
  dm_policy: string | null;
  handle: string | null;
  hashtags: string[] | null;
  id: string;
  image_path: string | null;
  image_paths?: string[] | null;
  profile_id: string | null;
  recommendation_score: number | null;
};

type ReactionRow = {
  post_id: string | null;
  reaction_type: string | null;
};

type ShareRow = {
  post_id: string | null;
};

type CommentRow = {
  body: string | null;
  created_at: string | null;
  display_name: string | null;
  handle: string | null;
  id: string;
  post_id: string | null;
};

type ProfileRow = {
  avatar_url: string | null;
  bio: string | null;
  display_name: string | null;
  email: string | null;
  handle: string | null;
  id: string;
};

type SocialPostQueryResult = {
  data: unknown[] | null;
  error: { code?: string; message?: string } | null;
};

export async function loadSocialCommunity(): Promise<{
  connected: boolean;
  posts: MirilookSocialPost[];
  profiles: MirilookSocialProfile[];
}> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return {
      connected: false,
      posts: pilotSocialPosts,
      profiles: pilotSocialProfiles,
    };
  }

  const profilePromise = supabase
    .from("profiles")
    .select("id, display_name, email, avatar_url, bio, handle")
    .order("updated_at", { ascending: false })
    .limit(30);
  let postResult = (await supabase
    .from("social_posts")
    .select(
      "id, profile_id, display_name, handle, body, image_path, image_paths, hashtags, dm_policy, recommendation_score, created_at",
    )
    .eq("status", "published")
    .eq("visibility", "public")
    .order("created_at", { ascending: false })
    .limit(30)) as SocialPostQueryResult;

  if (isMissingImagePathsColumn(postResult.error)) {
    postResult = (await supabase
      .from("social_posts")
      .select(
        "id, profile_id, display_name, handle, body, image_path, hashtags, dm_policy, recommendation_score, created_at",
      )
      .eq("status", "published")
      .eq("visibility", "public")
      .order("created_at", { ascending: false })
      .limit(30)) as SocialPostQueryResult;
  }

  const profileResult = await profilePromise;
  const profileRows = (profileResult.data ?? []) as ProfileRow[];

  if (postResult.error) {
    console.error("social posts load failed", postResult.error);

    return {
      connected: true,
      posts: pilotSocialPosts,
      profiles: await mapProfiles(supabase, profileRows),
    };
  }

  const rows = (postResult.data ?? []) as SocialPostRow[];
  const postIds = rows.map((row) => row.id);
  const [reactionCounts, shareCounts, commentsByPost, authorProfilesById] = await Promise.all([
    loadReactionCounts(postIds),
    loadShareCounts(postIds),
    loadComments(postIds),
    loadAuthorProfiles(supabase, rows, profileRows),
  ]);
  const posts: MirilookSocialPost[] = await Promise.all(
    rows.map(async (row) => {
      const imageUrls = await resolveSocialImageUrls(row.image_paths, row.image_path);
      const authorProfile = row.profile_id
        ? authorProfilesById.get(row.profile_id)
        : undefined;
      const avatarUrl = authorProfile?.avatar_url
        ? await resolveProfileAvatarUrl(supabase, authorProfile.avatar_url)
        : undefined;

      return {
        avatarUrl,
        body: row.body ?? "",
        commentCount: commentsByPost.get(row.id)?.length ?? 0,
        comments: commentsByPost.get(row.id) ?? [],
        createdAt: row.created_at ?? new Date().toISOString(),
        displayName: row.display_name || "미리룩 회원",
        dislikeCount: reactionCounts.get(row.id)?.dislikes ?? 0,
        dmPolicy: row.dm_policy === "deny" ? "deny" : "allow",
        handle: row.handle || "mirilook_member",
        hashtags: row.hashtags ?? [],
        id: row.id,
        imageUrl: imageUrls[0] ?? "/mock/mirilook-result-front.png",
        imageUrls,
        likeCount: reactionCounts.get(row.id)?.likes ?? 0,
        profileId: row.profile_id,
        recommendationScore: Number(row.recommendation_score ?? 0),
        shareCount: shareCounts.get(row.id) ?? 0,
      };
    }),
  );

  return {
    connected: true,
    posts: posts.length ? posts : pilotSocialPosts,
    profiles: await mapProfiles(supabase, profileRows),
  };
}

async function loadAuthorProfiles(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  posts: SocialPostRow[],
  knownProfiles: ProfileRow[],
) {
  const profilesById = new Map(knownProfiles.map((profile) => [profile.id, profile]));
  const missingProfileIds = Array.from(
    new Set(
      posts
        .map((post) => post.profile_id)
        .filter((profileId): profileId is string =>
          Boolean(profileId && !profilesById.has(profileId)),
        ),
    ),
  );

  if (!missingProfileIds.length) {
    return profilesById;
  }

  const result = await supabase
    .from("profiles")
    .select("id, display_name, email, avatar_url, bio, handle")
    .in("id", missingProfileIds);

  if (result.error) {
    console.error("social author profiles load failed", result.error);
    return profilesById;
  }

  ((result.data ?? []) as ProfileRow[]).forEach((profile) => {
    profilesById.set(profile.id, profile);
  });

  return profilesById;
}

async function loadReactionCounts(postIds: string[]) {
  const supabase = getSupabaseAdminClient();
  const grouped = new Map<string, { dislikes: number; likes: number }>();

  if (!supabase || !postIds.length) {
    return grouped;
  }

  const result = await supabase
    .from("social_reactions")
    .select("post_id, reaction_type")
    .in("post_id", postIds);

  if (result.error) {
    console.error("social reactions load failed", result.error);
    return grouped;
  }

  ((result.data ?? []) as ReactionRow[]).forEach((row) => {
    if (!row.post_id) {
      return;
    }

    const current = grouped.get(row.post_id) ?? { dislikes: 0, likes: 0 };

    if (row.reaction_type === "like") {
      current.likes += 1;
    }

    if (row.reaction_type === "dislike") {
      current.dislikes += 1;
    }

    grouped.set(row.post_id, current);
  });

  return grouped;
}

async function loadShareCounts(postIds: string[]) {
  const supabase = getSupabaseAdminClient();
  const grouped = new Map<string, number>();

  if (!supabase || !postIds.length) {
    return grouped;
  }

  const result = await supabase.from("social_shares").select("post_id").in("post_id", postIds);

  if (result.error) {
    console.error("social shares load failed", result.error);
    return grouped;
  }

  ((result.data ?? []) as ShareRow[]).forEach((row) => {
    if (!row.post_id) {
      return;
    }

    grouped.set(row.post_id, (grouped.get(row.post_id) ?? 0) + 1);
  });

  return grouped;
}

async function loadComments(postIds: string[]) {
  const supabase = getSupabaseAdminClient();
  const grouped = new Map<string, MirilookSocialComment[]>();

  if (!supabase || !postIds.length) {
    return grouped;
  }

  const result = await supabase
    .from("social_comments")
    .select("id, post_id, display_name, handle, body, created_at")
    .in("post_id", postIds)
    .eq("status", "published")
    .order("created_at", { ascending: true });

  if (result.error) {
    console.error("social comments load failed", result.error);
    return grouped;
  }

  ((result.data ?? []) as CommentRow[]).forEach((row) => {
    if (!row.post_id) {
      return;
    }

    const comments = grouped.get(row.post_id) ?? [];
    comments.push({
      body: row.body ?? "",
      createdAt: row.created_at ?? new Date().toISOString(),
      displayName: row.display_name || "미리룩 회원",
      handle: row.handle ?? undefined,
      id: row.id,
    });
    grouped.set(row.post_id, comments);
  });

  return grouped;
}

async function mapProfiles(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  rows: ProfileRow[],
): Promise<MirilookSocialProfile[]> {
  const profiles = (
    await Promise.all(
      rows.map(async (row) => {
      const displayName = row.display_name || row.email?.split("@")[0] || "미리룩 회원";

      return {
        avatarUrl: await resolveProfileAvatarUrl(supabase, row.avatar_url),
        bio: row.bio || "미리룩에서 스타일을 탐색 중입니다.",
        displayName,
        handle: row.handle || createHandle(displayName, row.id),
        id: row.id,
      };
      }),
    )
  ).slice(0, 24);

  return profiles.length ? profiles : pilotSocialProfiles;
}

async function resolveSocialImageUrls(
  paths: string[] | null | undefined,
  fallbackPath: string | null,
) {
  const imagePaths = normalizeSocialImagePaths(paths, fallbackPath)
    .map((path) => path.trim())
    .filter(Boolean);

  if (!imagePaths.length) {
    return ["/mock/mirilook-result-front.png"];
  }

  const supabase = getSupabaseAdminClient();

  const resolved = await Promise.all(
    imagePaths.map(async (path) => {
      if (path.startsWith("http") || path.startsWith("/")) {
        return path;
      }

      if (!supabase) {
        return "/mock/mirilook-result-front.png";
      }

      const signed = await supabase.storage
        .from(getSocialPostStorageBucket())
        .createSignedUrl(path, 60 * 60);

      return signed.data?.signedUrl ?? "/mock/mirilook-result-front.png";
    }),
  );

  const unique = Array.from(new Set(resolved.filter(Boolean)));

  return unique.length ? unique : ["/mock/mirilook-result-front.png"];
}

function normalizeSocialImagePaths(
  paths: string[] | null | undefined,
  fallbackPath: string | null,
) {
  const candidates = paths?.length ? paths : fallbackPath ? [fallbackPath] : [];

  return candidates.flatMap((path) => decodeLegacySocialImagePath(path));
}

function decodeLegacySocialImagePath(path: string | null) {
  if (!path) {
    return [];
  }

  if (!path.startsWith("multi:")) {
    return [path];
  }

  try {
    const parsed = JSON.parse(path.slice("multi:".length)) as unknown;

    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function createHandle(displayName: string, id: string) {
  const seed = `${displayName}-${id.slice(0, 6)}`
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return seed || `member_${id.slice(0, 6)}`;
}

function isMissingImagePathsColumn(
  error: { code?: string; message?: string } | null,
) {
  return (
    error?.code === "42703" &&
    /image_paths/i.test(error.message ?? "")
  );
}
