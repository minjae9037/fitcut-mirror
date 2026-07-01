import { HairMoneyCommunityPostReward } from "@/lib/mirilook-payments";
import { normalizeHashtags, type MirilookSocialPost } from "@/lib/mirilook-social";
import { rewardHairMoneyForCommunityPost } from "@/lib/server/hair-money";
import { queueNotificationEvent } from "@/lib/server/notifications";
import { protectMutationRequest } from "@/lib/server/request-security";
import {
  getConsultationStorageBucket,
  getSocialPostStorageBucket,
  getSupabaseAdminClient,
  getVerifiedSupabaseUser,
  type VerifiedSupabaseUser,
} from "@/lib/server/supabase-admin";
import { resolveProfileAvatarUrl } from "@/lib/server/profile-avatar";

export const runtime = "nodejs";
export const maxDuration = 60;

const maxSocialPostImageCount = 24;
const maxConsultationFeedSourceImages = 3;
const maxConsultationFeedRecommendationImages = 9;
const maxConsultationFeedFinalImages = 9;

type SocialPostMutationRow = {
  id: string;
  image_path: string | null;
  image_paths?: string[] | null;
  profile_id: string | null;
};

type SupabaseAdminClient = NonNullable<ReturnType<typeof getSupabaseAdminClient>>;

type ConsultationFeedPayload = {
  body?: unknown;
  dmPolicy?: unknown;
  hashtags?: unknown;
  selectedAssets?: unknown;
  sessionId?: unknown;
};

type ConsultationAssetRow = {
  angle_label: string | null;
  asset_type: string | null;
  display_order: number | null;
  original_url: string | null;
  storage_path: string | null;
};

type ConsultationFeedAssetSelection = {
  assetType: "final_angle" | "recommendation_preview" | "source_photo";
  displayOrder: number;
};

type CommunityPostReward = {
  alreadyRewarded: boolean;
  amount: number;
  applied: boolean;
  balance: number | null;
};

// Grants Hair Money for sharing to the public feed. Idempotent per post id, so
// editing/re-saving the same post never double-credits. Never blocks the post:
// a reward failure is logged and the post still succeeds.
async function grantCommunityPostReward(
  profileId: string,
  postId: string,
): Promise<CommunityPostReward> {
  try {
    const result = await rewardHairMoneyForCommunityPost({ postId, profileId });

    return {
      alreadyRewarded: !result.applied && result.synced,
      amount: HairMoneyCommunityPostReward,
      applied: result.applied,
      balance: typeof result.balance === "number" ? result.balance : null,
    };
  } catch (error) {
    console.error("community post hair money reward failed", error);

    return {
      alreadyRewarded: false,
      amount: HairMoneyCommunityPostReward,
      applied: false,
      balance: null,
    };
  }
}

export async function POST(request: Request) {
  const securityError = protectMutationRequest(request, {
    maxBodyBytes: 48 * 1024 * 1024,
    rateLimit: {
      key: "community:social-posts:write",
      limit: 30,
      windowMs: 10 * 60 * 1000,
    },
  });

  if (securityError) {
    return securityError;
  }

  const supabase = getSupabaseAdminClient();
  const user = await getVerifiedSupabaseUser(request);

  if (!supabase || !user) {
    return Response.json(
      {
        accepted: false,
        reason: !supabase ? "supabase_not_configured" : "auth_required",
      },
      { status: !supabase ? 503 : 401 },
    );
  }

  if (isJsonRequest(request)) {
    const payload = (await request.json().catch(() => null)) as
      | ConsultationFeedPayload
      | null;

    if (!payload) {
      return Response.json(
        { accepted: false, reason: "invalid_payload" },
        { status: 400 },
      );
    }

    return publishConsultationSessionToFeed(supabase, user, payload);
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Invalid social post payload." }, { status: 400 });
  }

  const images = getUploadImages(formData);
  const body = sanitizeText(formData.get("body"), 1200);
  const hashtags = normalizeHashtags(String(formData.get("hashtags") ?? ""));
  const dmPolicy = formData.get("dmPolicy") === "deny" ? "deny" : "allow";

  if (!images.length) {
    return Response.json(
      { accepted: false, reason: "image_required" },
      { status: 400 },
    );
  }

  if (!body) {
    return Response.json(
      { accepted: false, reason: "body_required" },
      { status: 400 },
    );
  }

  if (images.length > maxSocialPostImageCount) {
    return Response.json(
      { accepted: false, reason: "too_many_images" },
      { status: 400 },
    );
  }

  if (images.some((image) => !/^image\/(jpeg|png|webp)$/.test(image.type))) {
    return Response.json(
      { accepted: false, reason: "unsupported_image_type" },
      { status: 400 },
    );
  }

  const profile = await supabase
    .from("profiles")
    .select("display_name, email, avatar_url, bio, handle")
    .eq("id", user.id)
    .maybeSingle();

  if (profile.error) {
    console.error("social profile lookup failed", profile.error);
  }

  const displayName =
    sanitizeText(profile.data?.display_name, 60) ||
    sanitizeText(user.email?.split("@")[0], 60) ||
    "미리룩 회원";
  const handle =
    sanitizeHandle(profile.data?.handle) || createHandle(displayName, user.id);
  const storagePaths: string[] = [];

  for (const [index, image] of images.entries()) {
    const storagePath = `${user.id}/${Date.now()}-${index + 1}-${randomId()}.${extensionFor(image.type)}`;
    const upload = await supabase.storage
      .from(getSocialPostStorageBucket())
      .upload(storagePath, image, {
        contentType: image.type,
        upsert: false,
      });

    if (upload.error) {
      console.error("social image upload failed", upload.error);

      if (storagePaths.length) {
        await supabase.storage.from(getSocialPostStorageBucket()).remove(storagePaths);
      }

      return Response.json(
        { accepted: false, reason: "storage_upload_failed" },
        { status: 500 },
      );
    }

    storagePaths.push(storagePath);
  }

  const score = calculateRecommendationScore(body, hashtags);
  let insert = await supabase
    .from("social_posts")
    .insert({
      body,
      display_name: displayName,
      dm_policy: dmPolicy,
      handle,
      hashtags,
      image_path: storagePaths[0],
      image_paths: storagePaths,
      profile_id: user.id,
      recommendation_score: score,
      status: "published",
      visibility: "public",
    })
    .select("id, created_at")
    .single();

  if (insert.error && isMissingImagePathsColumn(insert.error)) {
    insert = await supabase
      .from("social_posts")
      .insert({
        body,
        display_name: displayName,
        dm_policy: dmPolicy,
        handle,
        hashtags,
        image_path: encodeLegacySocialImagePath(storagePaths),
        profile_id: user.id,
        recommendation_score: score,
        status: "published",
        visibility: "public",
      })
      .select("id, created_at")
      .single();
  }

  if (insert.error) {
    console.error("social post insert failed", insert.error);
    await supabase.storage.from(getSocialPostStorageBucket()).remove(storagePaths);

    return Response.json(
      {
        accepted: false,
        reason: "supabase_insert_failed",
      },
      { status: 500 },
    );
  }

  const signedUrls = await createSignedImageUrls(storagePaths);
  const avatarUrl = profile.data?.avatar_url
    ? await resolveProfileAvatarUrl(supabase, profile.data.avatar_url)
    : undefined;

  await queueNotificationEvent({
    body: "새 커뮤니티 사진 게시물이 등록되었습니다.",
    eventType: "social_post_created",
    payload: {
      hashtags,
      postId: insert.data.id,
      profileId: user.id,
    },
    title: "새 커뮤니티 게시물",
    url: "/community",
  });

  const hairMoneyReward = await grantCommunityPostReward(user.id, insert.data.id);

  return Response.json({
    accepted: true,
    hairMoneyReward,
    post: {
      avatarUrl,
      body,
      commentCount: 0,
      comments: [],
      createdAt: insert.data.created_at ?? new Date().toISOString(),
      displayName,
      dislikeCount: 0,
      dmPolicy,
      handle,
      hashtags,
      id: insert.data.id,
      imageUrl: signedUrls[0] ?? "",
      imageUrls: signedUrls,
      likeCount: 0,
      profileId: user.id,
      recommendationScore: score,
      shareCount: 0,
    } satisfies MirilookSocialPost,
  });
}

async function publishConsultationSessionToFeed(
  supabase: SupabaseAdminClient,
  user: VerifiedSupabaseUser,
  payload: ConsultationFeedPayload,
) {
  const sessionId = sanitizeSessionId(payload.sessionId);
  const body = sanitizeText(payload.body, 1200);
  const hashtags = normalizeHashtags(String(payload.hashtags ?? ""));
  const dmPolicy = payload.dmPolicy === "deny" ? "deny" : "allow";
  const selectedAssets = normalizeConsultationFeedAssetSelections(
    payload.selectedAssets,
  );

  if (!sessionId) {
    return Response.json(
      { accepted: false, reason: "consultation_required" },
      { status: 400 },
    );
  }

  if (!body) {
    return Response.json(
      { accepted: false, reason: "body_required" },
      { status: 400 },
    );
  }

  const session = await supabase
    .from("generation_sessions")
    .select("id, profile_id")
    .eq("id", sessionId)
    .maybeSingle<{ id: string; profile_id: string | null }>();

  if (session.error) {
    console.error("consultation session lookup failed", session.error);

    return Response.json(
      { accepted: false, reason: "consultation_lookup_failed" },
      { status: 500 },
    );
  }

  if (!session.data) {
    return Response.json(
      { accepted: false, reason: "consultation_not_found" },
      { status: 404 },
    );
  }

  if (session.data.profile_id !== user.id) {
    return Response.json(
      { accepted: false, reason: "not_owner" },
      { status: 403 },
    );
  }

  const assetsResult = await supabase
    .from("generation_assets")
    .select("asset_type, angle_label, display_order, original_url, storage_path")
    .eq("session_id", sessionId)
    .in("asset_type", ["final_angle", "recommendation_preview", "source_photo"])
    .order("display_order", { ascending: true });

  if (assetsResult.error) {
    console.error("consultation assets lookup failed", assetsResult.error);

    return Response.json(
      { accepted: false, reason: "consultation_lookup_failed" },
      { status: 500 },
    );
  }

  const assets = selectConsultationFeedAssets(
    (assetsResult.data ?? []) as ConsultationAssetRow[],
    selectedAssets,
  );

  if (!assets.length) {
    return Response.json(
      { accepted: false, reason: "consultation_image_required" },
      { status: 400 },
    );
  }

  const storagePaths = await copyConsultationAssetsToSocialPosts(
    supabase,
    user.id,
    assets,
  );

  if (storagePaths instanceof Response) {
    return storagePaths;
  }

  const profile = await supabase
    .from("profiles")
    .select("display_name, email, avatar_url, bio, handle")
    .eq("id", user.id)
    .maybeSingle();

  if (profile.error) {
    console.error("social profile lookup failed", profile.error);
  }

  const displayName =
    sanitizeText(profile.data?.display_name, 60) ||
    sanitizeText(user.email?.split("@")[0], 60) ||
    "Miri Look 회원";
  const handle =
    sanitizeHandle(profile.data?.handle) || createHandle(displayName, user.id);
  const score = calculateRecommendationScore(body, hashtags);
  let insert = await supabase
    .from("social_posts")
    .insert({
      body,
      display_name: displayName,
      dm_policy: dmPolicy,
      handle,
      hashtags,
      image_path: storagePaths[0],
      image_paths: storagePaths,
      profile_id: user.id,
      recommendation_score: score,
      status: "published",
      visibility: "public",
    })
    .select("id, created_at")
    .single();

  if (insert.error && isMissingImagePathsColumn(insert.error)) {
    insert = await supabase
      .from("social_posts")
      .insert({
        body,
        display_name: displayName,
        dm_policy: dmPolicy,
        handle,
        hashtags,
        image_path: encodeLegacySocialImagePath(storagePaths),
        profile_id: user.id,
        recommendation_score: score,
        status: "published",
        visibility: "public",
      })
      .select("id, created_at")
      .single();
  }

  if (insert.error) {
    console.error("social post insert failed", insert.error);
    await supabase.storage.from(getSocialPostStorageBucket()).remove(storagePaths);

    return Response.json(
      { accepted: false, reason: "supabase_insert_failed" },
      { status: 500 },
    );
  }

  const signedUrls = await createSignedImageUrls(storagePaths);
  const avatarUrl = profile.data?.avatar_url
    ? await resolveProfileAvatarUrl(supabase, profile.data.avatar_url)
    : undefined;

  await queueNotificationEvent({
    body: "커뮤니티 사진 게시물이 등록되었습니다.",
    eventType: "social_post_created",
    payload: {
      hashtags,
      postId: insert.data.id,
      profileId: user.id,
    },
    title: "커뮤니티 게시물",
    url: "/community",
  });

  const hairMoneyReward = await grantCommunityPostReward(user.id, insert.data.id);

  return Response.json({
    accepted: true,
    hairMoneyReward,
    post: {
      avatarUrl,
      body,
      commentCount: 0,
      comments: [],
      createdAt: insert.data.created_at ?? new Date().toISOString(),
      displayName,
      dislikeCount: 0,
      dmPolicy,
      handle,
      hashtags,
      id: insert.data.id,
      imageUrl: signedUrls[0] ?? "",
      imageUrls: signedUrls,
      likeCount: 0,
      profileId: user.id,
      recommendationScore: score,
      shareCount: 0,
    } satisfies MirilookSocialPost,
  });
}

export async function PATCH(request: Request) {
  const securityError = protectMutationRequest(request, {
    maxBodyBytes: 64 * 1024,
    rateLimit: {
      key: "community:social-posts:update",
      limit: 60,
      windowMs: 10 * 60 * 1000,
    },
  });

  if (securityError) {
    return securityError;
  }

  const supabase = getSupabaseAdminClient();
  const user = await getVerifiedSupabaseUser(request);

  if (!supabase || !user) {
    return Response.json(
      {
        accepted: false,
        reason: !supabase ? "supabase_not_configured" : "auth_required",
      },
      { status: !supabase ? 503 : 401 },
    );
  }

  const payload = (await request.json().catch(() => null)) as {
    body?: unknown;
    dmPolicy?: unknown;
    hashtags?: unknown;
    postId?: unknown;
  } | null;
  const postId = sanitizePostId(payload?.postId);
  const body = sanitizeText(payload?.body, 1200);
  const hashtags = normalizeHashtags(String(payload?.hashtags ?? ""));
  const dmPolicy = payload?.dmPolicy === "deny" ? "deny" : "allow";

  if (!postId) {
    return Response.json(
      { accepted: false, reason: "post_required" },
      { status: 400 },
    );
  }

  if (!body) {
    return Response.json(
      { accepted: false, reason: "body_required" },
      { status: 400 },
    );
  }

  const ownership = await loadOwnedSocialPost(supabase, postId, user.id);

  if (ownership instanceof Response) {
    return ownership;
  }

  const score = calculateRecommendationScore(body, hashtags);
  const update = await supabase
    .from("social_posts")
    .update({
      body,
      dm_policy: dmPolicy,
      hashtags,
      recommendation_score: score,
      updated_at: new Date().toISOString(),
    })
    .eq("id", postId)
    .select("id")
    .single();

  if (update.error) {
    console.error("social post update failed", update.error);

    return Response.json(
      { accepted: false, reason: "supabase_update_failed" },
      { status: 500 },
    );
  }

  return Response.json({
    accepted: true,
    post: {
      body,
      dmPolicy,
      hashtags,
      id: postId,
      recommendationScore: score,
    },
  });
}

export async function DELETE(request: Request) {
  const securityError = protectMutationRequest(request, {
    maxBodyBytes: 16 * 1024,
    rateLimit: {
      key: "community:social-posts:delete",
      limit: 60,
      windowMs: 10 * 60 * 1000,
    },
  });

  if (securityError) {
    return securityError;
  }

  const supabase = getSupabaseAdminClient();
  const user = await getVerifiedSupabaseUser(request);

  if (!supabase || !user) {
    return Response.json(
      {
        accepted: false,
        reason: !supabase ? "supabase_not_configured" : "auth_required",
      },
      { status: !supabase ? 503 : 401 },
    );
  }

  const payload = (await request.json().catch(() => null)) as {
    postId?: unknown;
  } | null;
  const postId = sanitizePostId(payload?.postId);

  if (!postId) {
    return Response.json(
      { accepted: false, reason: "post_required" },
      { status: 400 },
    );
  }

  const ownership = await loadOwnedSocialPost(supabase, postId, user.id);

  if (ownership instanceof Response) {
    return ownership;
  }

  const deleted = await supabase
    .from("social_posts")
    .delete()
    .eq("id", postId)
    .select("id")
    .single();

  if (deleted.error) {
    console.error("social post delete failed", deleted.error);

    return Response.json(
      { accepted: false, reason: "supabase_delete_failed" },
      { status: 500 },
    );
  }

  const storagePaths = collectSocialStoragePaths(ownership);

  if (storagePaths.length) {
    const remove = await supabase.storage
      .from(getSocialPostStorageBucket())
      .remove(storagePaths);

    if (remove.error) {
      console.warn("social post storage cleanup failed", remove.error);
    }
  }

  return Response.json({
    accepted: true,
    deleted: true,
    postId,
  });
}

function getUploadImages(formData: FormData) {
  const files = formData
    .getAll("images")
    .filter((item): item is File => item instanceof File && item.size > 0);
  const legacyImage = formData.get("image");

  if (!files.length && legacyImage instanceof File && legacyImage.size > 0) {
    return [legacyImage];
  }

  return files;
}

function normalizeConsultationFeedAssetSelections(value: unknown) {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const selections: ConsultationFeedAssetSelection[] = [];
  const seen = new Set<string>();

  value.forEach((item) => {
    if (!item || typeof item !== "object") {
      return;
    }

    const assetType = (item as { assetType?: unknown }).assetType;
    const displayOrder = Number((item as { displayOrder?: unknown }).displayOrder);

    if (
      assetType !== "source_photo" &&
      assetType !== "recommendation_preview" &&
      assetType !== "final_angle"
    ) {
      return;
    }

    if (!Number.isInteger(displayOrder) || displayOrder < 1 || displayOrder > 99) {
      return;
    }

    const key = getConsultationAssetSelectionKey({
      assetType,
      displayOrder,
    });

    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    selections.push({
      assetType,
      displayOrder,
    });
  });

  return selections.slice(0, maxSocialPostImageCount);
}

function selectConsultationFeedAssets(
  assets: ConsultationAssetRow[],
  selectedAssets?: ConsultationFeedAssetSelection[],
) {
  const storedAssets = assets
    .filter((asset) => Boolean(asset.storage_path?.trim()))
    .sort(
      (a, b) =>
        (a.display_order ?? Number.MAX_SAFE_INTEGER) -
        (b.display_order ?? Number.MAX_SAFE_INTEGER),
    );

  if (selectedAssets) {
    const assetsByKey = new Map(
      storedAssets.map((asset) => [getConsultationAssetKey(asset), asset]),
    );

    return selectedAssets
      .map((selection) => assetsByKey.get(getConsultationAssetSelectionKey(selection)))
      .filter((asset): asset is ConsultationAssetRow => Boolean(asset))
      .slice(0, maxSocialPostImageCount);
  }

  const sourcePhotos = storedAssets
    .filter((asset) => asset.asset_type === "source_photo")
    .slice(0, maxConsultationFeedSourceImages);
  const recommendationPreviews = storedAssets
    .filter((asset) => asset.asset_type === "recommendation_preview")
    .slice(0, maxConsultationFeedRecommendationImages);
  const finalAngles = storedAssets.filter(
    (asset) => asset.asset_type === "final_angle",
  ).slice(0, maxConsultationFeedFinalImages);

  return [
    ...sourcePhotos,
    ...recommendationPreviews,
    ...finalAngles,
  ].slice(0, maxSocialPostImageCount);
}

function getConsultationAssetKey(asset: ConsultationAssetRow) {
  return `${asset.asset_type ?? ""}:${asset.display_order ?? 0}`;
}

function getConsultationAssetSelectionKey(
  selection: ConsultationFeedAssetSelection,
) {
  return `${selection.assetType}:${selection.displayOrder}`;
}

async function copyConsultationAssetsToSocialPosts(
  supabase: SupabaseAdminClient,
  userId: string,
  assets: ConsultationAssetRow[],
) {
  const sourceBucket = getConsultationStorageBucket();
  const targetBucket = getSocialPostStorageBucket();
  const storagePaths: string[] = [];

  for (const [index, asset] of assets.entries()) {
    const sourcePath = asset.storage_path?.trim();

    if (!sourcePath) {
      continue;
    }

    const downloaded = await supabase.storage
      .from(sourceBucket)
      .download(sourcePath);

    if (downloaded.error || !downloaded.data) {
      console.error("consultation image download failed", {
        error: downloaded.error,
        sourcePath,
      });

      if (storagePaths.length) {
        await supabase.storage.from(targetBucket).remove(storagePaths);
      }

      return Response.json(
        { accepted: false, reason: "consultation_image_read_failed" },
        { status: 500 },
      );
    }

    const contentType = normalizeStoredImageContentType(
      downloaded.data.type,
      sourcePath,
    );

    if (!/^image\/(jpeg|png|webp)$/.test(contentType)) {
      if (storagePaths.length) {
        await supabase.storage.from(targetBucket).remove(storagePaths);
      }

      return Response.json(
        { accepted: false, reason: "unsupported_image_type" },
        { status: 400 },
      );
    }

    const storagePath = `${userId}/${Date.now()}-${index + 1}-${randomId()}.${extensionFor(contentType)}`;
    const upload = await supabase.storage
      .from(targetBucket)
      .upload(storagePath, await downloaded.data.arrayBuffer(), {
        contentType,
        upsert: false,
      });

    if (upload.error) {
      console.error("consultation image copy upload failed", upload.error);

      if (storagePaths.length) {
        await supabase.storage.from(targetBucket).remove(storagePaths);
      }

      return Response.json(
        { accepted: false, reason: "storage_upload_failed" },
        { status: 500 },
      );
    }

    storagePaths.push(storagePath);
  }

  if (!storagePaths.length) {
    return Response.json(
      { accepted: false, reason: "consultation_image_required" },
      { status: 400 },
    );
  }

  return storagePaths;
}

async function loadOwnedSocialPost(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  postId: string,
  userId: string,
) {
  let result = await supabase
    .from("social_posts")
    .select("id, profile_id, image_path, image_paths")
    .eq("id", postId)
    .maybeSingle<SocialPostMutationRow>();

  if (isMissingImagePathsColumn(result.error)) {
    result = await supabase
      .from("social_posts")
      .select("id, profile_id, image_path")
      .eq("id", postId)
      .maybeSingle<SocialPostMutationRow>();
  }

  if (result.error) {
    console.error("social post ownership lookup failed", result.error);

    return Response.json(
      { accepted: false, reason: "supabase_lookup_failed" },
      { status: 500 },
    );
  }

  if (!result.data) {
    return Response.json(
      { accepted: false, reason: "post_not_found" },
      { status: 404 },
    );
  }

  if (result.data.profile_id !== userId) {
    return Response.json(
      { accepted: false, reason: "not_owner" },
      { status: 403 },
    );
  }

  return result.data;
}

function collectSocialStoragePaths(post: SocialPostMutationRow) {
  const paths = normalizeSocialStoragePaths(post.image_paths, post.image_path);

  return Array.from(
    new Set(
      paths
        .map((item) => item.trim())
        .filter(
          (item) =>
            item &&
            !item.startsWith("http") &&
            !item.startsWith("/") &&
            !item.includes(".."),
        ),
    ),
  );
}

function normalizeSocialStoragePaths(
  paths: string[] | null | undefined,
  fallbackPath: string | null,
) {
  const candidates = paths?.length ? paths : fallbackPath ? [fallbackPath] : [];

  return candidates.flatMap((path) => decodeLegacySocialImagePath(path));
}

async function createSignedImageUrls(storagePaths: string[]) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return [];
  }

  const signed = await Promise.all(
    storagePaths.map((path) =>
      supabase.storage
        .from(getSocialPostStorageBucket())
        .createSignedUrl(path, 60 * 60),
    ),
  );

  return signed.map((result) => result.data?.signedUrl ?? "").filter(Boolean);
}

function isJsonRequest(request: Request) {
  return /application\/json/i.test(request.headers.get("content-type") ?? "");
}

function sanitizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return "";
  }

  const trimmed = value.replace(/[<>]/g, "").trim();

  return trimmed.slice(0, maxLength);
}

function sanitizeSessionId(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  const trimmed = value.trim();

  return /^[a-z0-9][a-z0-9._:-]{2,180}$/i.test(trimmed) &&
    !trimmed.includes("..")
    ? trimmed
    : "";
}

function sanitizePostId(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  const trimmed = value.trim();

  return /^[a-f0-9-]{32,36}$/i.test(trimmed) ? trimmed : "";
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

function createHandle(displayName: string, userId: string) {
  return (
    sanitizeHandle(`${displayName}_${userId.slice(0, 6)}`) ||
    `member_${userId.slice(0, 6)}`
  );
}

function randomId() {
  return Math.random().toString(36).slice(2, 10);
}

function extensionFor(contentType: string) {
  if (contentType === "image/png") {
    return "png";
  }

  if (contentType === "image/webp") {
    return "webp";
  }

  return "jpg";
}

function normalizeStoredImageContentType(contentType: string, path: string) {
  if (/^image\/(jpeg|png|webp)$/.test(contentType)) {
    return contentType;
  }

  if (/\.png$/i.test(path)) {
    return "image/png";
  }

  if (/\.webp$/i.test(path)) {
    return "image/webp";
  }

  return "image/jpeg";
}

function encodeLegacySocialImagePath(paths: string[]) {
  return paths.length > 1 ? `multi:${JSON.stringify(paths)}` : (paths[0] ?? "");
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

function calculateRecommendationScore(body: string, hashtags: string[]) {
  const textScore = Math.min(22, Math.floor(body.length / 24));
  const tagScore = Math.min(30, hashtags.length * 6);
  const styleScore = hashtags.some((tag) => /헤어|컷|펌|스타일|코디|메이크업/.test(tag))
    ? 28
    : 14;

  return 45 + textScore + tagScore + styleScore;
}

function isMissingImagePathsColumn(
  error: { code?: string; message?: string } | null,
) {
  return error?.code === "42703" && /image_paths/i.test(error.message ?? "");
}
