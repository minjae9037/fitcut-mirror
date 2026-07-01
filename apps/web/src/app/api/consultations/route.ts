import {
  getConsultationStorageBucket,
  getSupabaseAdminClient,
  getVerifiedSupabaseUser,
} from "@/lib/server/supabase-admin";
import { protectMutationRequest } from "@/lib/server/request-security";

export const runtime = "nodejs";
export const maxDuration = 60;

type ConsultationImagePayload = {
  imageUrl?: string;
  label?: string;
};

type ConsultationPayload = {
  audienceName?: string;
  consultingFocusNames?: string[];
  createdAt?: string;
  hairColorName?: string;
  id?: string;
  images?: ConsultationImagePayload[];
  makeupImages?: ConsultationImagePayload[];
  memo?: string;
  outfitImages?: ConsultationImagePayload[];
  recommendationImages?: ConsultationImagePayload[];
  regionName?: string;
  sourcePhotos?: ConsultationImagePayload[];
  sourcePhotoCount?: number;
  styleId?: string;
  styleName?: string;
  styleReason?: string;
  styleTags?: string[];
  salonProcess?: string;
  maintenanceAdvice?: string;
  outfitAdvice?: string;
  makeupAdvice?: string;
};

type ConsultationDeletePayload = {
  sessionId?: string;
};

type SessionRow = {
  audience_name: string | null;
  consulting_focus_names: string[] | null;
  created_at: string;
  hair_color_name: string | null;
  id: string;
  profile_id: string | null;
  region_name: string | null;
  selected_style_id: string | null;
  source_photo_count: number | null;
  style_memo: string | null;
  style_name: string | null;
};

type AssetRow = {
  angle_label: string | null;
  asset_type: string | null;
  display_order: number | null;
  original_url: string | null;
  session_id: string;
  storage_path: string | null;
};

type RecommendationRow = {
  caution: string | null;
  reason: string | null;
  salon_process: string | null;
  session_id: string;
  style_id: string | null;
  tags: string[] | null;
};

type SupabaseAdminClient = NonNullable<ReturnType<typeof getSupabaseAdminClient>>;
type ConsultationAssetType =
  | "final_angle"
  | "makeup_image"
  | "outfit_image"
  | "recommendation_preview"
  | "source_photo";

const consultationAssetTypes: ConsultationAssetType[] = [
  "final_angle",
  "makeup_image",
  "outfit_image",
  "source_photo",
  "recommendation_preview",
];

export async function GET(request: Request) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return Response.json({
      items: [],
      reason: "supabase_not_configured",
      synced: false,
    });
  }

  const user = await getVerifiedSupabaseUser(request);

  if (!user) {
    return Response.json({
      items: [],
      reason: "not_authenticated",
      synced: false,
    });
  }

  try {
    const sessionsResult = await supabase
      .from("generation_sessions")
      .select(
        "id, profile_id, created_at, audience_name, consulting_focus_names, hair_color_name, region_name, selected_style_id, source_photo_count, style_memo, style_name",
      )
      .eq("profile_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);

    if (sessionsResult.error) {
      throw sessionsResult.error;
    }

    const sessions = (sessionsResult.data ?? []) as SessionRow[];
    const sessionIds = sessions.map((session) => session.id);

    if (!sessionIds.length) {
      return Response.json({
        items: [],
        synced: true,
      });
    }

    const assetsResult = await supabase
      .from("generation_assets")
      .select("session_id, asset_type, angle_label, display_order, storage_path, original_url")
      .in("session_id", sessionIds)
      .in("asset_type", consultationAssetTypes)
      .order("display_order", { ascending: true });

    if (assetsResult.error) {
      throw assetsResult.error;
    }

    const assetsBySession = new Map<string, AssetRow[]>();

    ((assetsResult.data ?? []) as AssetRow[]).forEach((asset) => {
      const current = assetsBySession.get(asset.session_id) ?? [];
      current.push(asset);
      assetsBySession.set(asset.session_id, current);
    });
    const recommendationsBySession = await loadRecommendationsBySession(
      supabase,
      sessionIds,
    );

    const items = await Promise.all(
      sessions.map(async (session) => {
        const recommendation = recommendationsBySession.get(session.id);
        const advice = decodeRecommendationAdvice(recommendation?.caution);
        const sessionAssets = assetsBySession.get(session.id) ?? [];
        const [
          images,
          sourcePhotos,
          recommendationImages,
          outfitImages,
          makeupImages,
        ] = await Promise.all([
          buildSignedAssetImages(filterAssetsByType(sessionAssets, "final_angle"), 9),
          buildSignedAssetImages(filterAssetsByType(sessionAssets, "source_photo"), 3),
          buildSignedAssetImages(
            filterAssetsByType(sessionAssets, "recommendation_preview"),
            9,
          ),
          buildSignedAssetImages(filterAssetsByType(sessionAssets, "outfit_image"), 16),
          buildSignedAssetImages(filterAssetsByType(sessionAssets, "makeup_image"), 4),
        ]);

        return {
          audienceName: session.audience_name ?? undefined,
          consultingFocusNames: session.consulting_focus_names ?? [],
          createdAt: session.created_at,
          hairColorName: session.hair_color_name ?? "",
          id: session.id,
          images,
          makeupImages,
          makeupAdvice: advice.makeupAdvice,
          maintenanceAdvice: advice.maintenanceAdvice,
          memo: session.style_memo ?? undefined,
          outfitAdvice: advice.outfitAdvice,
          outfitImages,
          recommendationImages,
          regionName: session.region_name ?? undefined,
          salonProcess: recommendation?.salon_process ?? undefined,
          sourcePhotos,
          sourcePhotoCount: session.source_photo_count ?? 0,
          styleId: session.selected_style_id ?? recommendation?.style_id ?? "",
          styleName: session.style_name ?? "미리룩 상담 결과",
          styleReason: recommendation?.reason ?? undefined,
          styleTags: recommendation?.tags ?? [],
        };
      }),
    );

    return Response.json({
      items,
      synced: true,
    });
  } catch (error) {
    console.error("consultation history load failed", error);

    return Response.json(
      {
        items: [],
        reason: "supabase_history_load_failed",
        synced: false,
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const securityError = protectMutationRequest(request, {
    maxBodyBytes: 80 * 1024 * 1024,
    rateLimit: {
      key: "consultations:create",
      limit: 20,
      windowMs: 10 * 60 * 1000,
    },
  });

  if (securityError) {
    return securityError;
  }

  let payload: ConsultationPayload;

  try {
    payload = (await request.json()) as ConsultationPayload;
  } catch {
    return Response.json(
      { error: "Invalid consultation payload." },
      { status: 400 },
    );
  }

  const validationError = validatePayload(payload);

  if (validationError) {
    return Response.json({ error: validationError }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return Response.json({
      reason: "supabase_not_configured",
      saved: false,
    });
  }

  const sessionId = sanitizeId(payload.id);
  const createdAt = normalizeIsoDate(payload.createdAt);
  const bucket = getConsultationStorageBucket();
  const user = await getVerifiedSupabaseUser(request);

  if (!user) {
    return Response.json({
      reason: "not_authenticated",
      saved: false,
    });
  }

  try {
    const profileUpsert = await supabase.from("profiles").upsert(
      {
        email: user.email ?? null,
        id: user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

    if (profileUpsert.error) {
      console.warn("profile upsert before consultation save failed", profileUpsert.error);
    }

    const uploadResults = (
      await Promise.all([
        buildAssetUploads({
          assetType: "final_angle",
          bucket,
          fallbackLabelPrefix: "result",
          items: Array.isArray(payload.images) ? payload.images : [],
          limit: 9,
          sessionId,
          supabase,
        }),
        buildAssetUploads({
          assetType: "source_photo",
          bucket,
          fallbackLabelPrefix: "source",
          items: Array.isArray(payload.sourcePhotos) ? payload.sourcePhotos : [],
          limit: 3,
          sessionId,
          supabase,
        }),
        buildAssetUploads({
          assetType: "recommendation_preview",
          bucket,
          fallbackLabelPrefix: "recommendation",
          items: Array.isArray(payload.recommendationImages)
            ? payload.recommendationImages
            : [],
          limit: 9,
          sessionId,
          supabase,
        }),
        buildAssetUploads({
          assetType: "outfit_image",
          bucket,
          fallbackLabelPrefix: "outfit",
          items: Array.isArray(payload.outfitImages) ? payload.outfitImages : [],
          limit: 16,
          sessionId,
          supabase,
        }),
        buildAssetUploads({
          assetType: "makeup_image",
          bucket,
          fallbackLabelPrefix: "makeup",
          items: Array.isArray(payload.makeupImages) ? payload.makeupImages : [],
          limit: 4,
          sessionId,
          supabase,
        }),
      ])
    ).flat();

    const sessionInsert = await supabase.from("generation_sessions").upsert({
      audience_name: sanitizeText(payload.audienceName, 40),
      completed_at: createdAt,
      consulting_focus_names: sanitizeStringArray(payload.consultingFocusNames, 8),
      created_at: createdAt,
      hair_color_name: sanitizeText(payload.hairColorName, 80),
      id: sessionId,
      profile_id: user.id,
      region_name: sanitizeText(payload.regionName, 80),
      selected_style_id: sanitizeText(payload.styleId, 120),
      source_photo_count: normalizeCount(payload.sourcePhotoCount),
      status: "completed",
      style_memo: sanitizeText(payload.memo, 1000),
      style_name: sanitizeText(payload.styleName, 120),
      uploaded_count: normalizeCount(payload.sourcePhotoCount),
    });

    if (sessionInsert.error) {
      throw sessionInsert.error;
    }

    const assetDelete = await supabase
      .from("generation_assets")
      .delete()
      .eq("session_id", sessionId)
      .in("asset_type", consultationAssetTypes);

    if (assetDelete.error) {
      throw assetDelete.error;
    }

    if (uploadResults.length) {
      const assetInsert = await supabase.from("generation_assets").insert(
        uploadResults.map((result) => ({
          angle_label: result.angleLabel,
          asset_type: result.assetType,
          display_order: result.displayOrder,
          original_url: result.originalUrl,
          provider: "mirilook-web",
          session_id: sessionId,
          status: result.storagePath ? "stored" : "referenced",
          storage_path: result.storagePath,
        })),
      );

      if (assetInsert.error) {
        throw assetInsert.error;
      }
    }

    await saveSelectedRecommendation(supabase, sessionId, payload);

    return Response.json({
      assetCount: uploadResults.length,
      saved: true,
      sessionId,
    });
  } catch (error) {
    console.error("consultation save failed", error);

    return Response.json({
      reason: "supabase_save_failed",
      saved: false,
    });
  }
}

export async function DELETE(request: Request) {
  const securityError = protectMutationRequest(request, {
    maxBodyBytes: 16 * 1024,
    rateLimit: {
      key: "consultations:delete",
      limit: 60,
      windowMs: 10 * 60 * 1000,
    },
  });

  if (securityError) {
    return securityError;
  }

  let payload: ConsultationDeletePayload;

  try {
    payload = (await request.json()) as ConsultationDeletePayload;
  } catch {
    return Response.json(
      { error: "Invalid consultation delete payload." },
      { status: 400 },
    );
  }

  const sessionId = sanitizeExistingId(payload.sessionId);

  if (!sessionId) {
    return Response.json({ error: "Session id is required." }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  const user = await getVerifiedSupabaseUser(request);

  if (!supabase) {
    return Response.json({
      deleted: false,
      reason: "supabase_not_configured",
    });
  }

  if (!user) {
    return Response.json({
      deleted: false,
      reason: "not_authenticated",
    });
  }

  try {
    const sessionResult = await supabase
      .from("generation_sessions")
      .select("id, profile_id")
      .eq("id", sessionId)
      .maybeSingle();

    if (sessionResult.error) {
      throw sessionResult.error;
    }

    if (!sessionResult.data) {
      return Response.json({
        assetCount: 0,
        deleted: true,
        sessionId,
        sessionWasPresent: false,
      });
    }

    if (sessionResult.data.profile_id !== user.id) {
      return Response.json(
        {
          deleted: false,
          reason: "not_owner",
        },
        { status: 403 },
      );
    }

    const assetResult = await supabase
      .from("generation_assets")
      .select("storage_path")
      .eq("session_id", sessionId)
      .not("storage_path", "is", null);

    if (assetResult.error) {
      throw assetResult.error;
    }

    const storagePaths = (assetResult.data ?? [])
      .map((asset) =>
        typeof asset.storage_path === "string" ? asset.storage_path : "",
      )
      .filter(Boolean);

    if (storagePaths.length) {
      const removeResult = await supabase.storage
        .from(getConsultationStorageBucket())
        .remove(storagePaths);

      if (removeResult.error) {
        throw removeResult.error;
      }
    }

    const deleteResult = await supabase
      .from("generation_sessions")
      .delete()
      .eq("id", sessionId)
      .select("id")
      .maybeSingle();

    if (deleteResult.error) {
      throw deleteResult.error;
    }

    return Response.json({
      assetCount: storagePaths.length,
      deleted: true,
      sessionId,
      sessionWasPresent: Boolean(deleteResult.data),
    });
  } catch (error) {
    console.error("consultation delete failed", error);

    return Response.json(
      {
        deleted: false,
        reason: "supabase_delete_failed",
      },
      { status: 500 },
    );
  }
}

async function buildAssetUploads({
  assetType,
  bucket,
  fallbackLabelPrefix,
  items,
  limit,
  sessionId,
  supabase,
}: {
  assetType: ConsultationAssetType;
  bucket: string;
  fallbackLabelPrefix: string;
  items: ConsultationImagePayload[];
  limit: number;
  sessionId: string;
  supabase: SupabaseAdminClient;
}) {
  return Promise.all(
    items.slice(0, limit).map(async (image, index) => {
      const imageUrl = image.imageUrl ?? "";
      const label =
        sanitizeText(image.label, 80) || `${fallbackLabelPrefix}-${index + 1}`;
      const parsed = parseDataImage(imageUrl);

      if (!parsed) {
        return {
          angleLabel: label,
          assetType,
          displayOrder: index + 1,
          originalUrl: imageUrl.startsWith("blob:") ? null : imageUrl.slice(0, 900),
          storagePath: null,
        };
      }

      const extension = parsed.mimeType === "image/png" ? "png" : "jpg";
      const storagePath = `${sessionId}/${assetType}-${String(index + 1).padStart(2, "0")}-${slugify(label)}.${extension}`;
      const upload = await supabase.storage.from(bucket).upload(storagePath, parsed.buffer, {
        cacheControl: "31536000",
        contentType: parsed.mimeType,
        upsert: true,
      });

      if (upload.error) {
        throw upload.error;
      }

      return {
        angleLabel: label,
        assetType,
        displayOrder: index + 1,
        originalUrl: null,
        storagePath,
      };
    }),
  );
}

function validatePayload(payload: ConsultationPayload) {
  if (!payload.id || typeof payload.id !== "string") {
    return "Consultation id is required.";
  }

  if (!payload.styleName || typeof payload.styleName !== "string") {
    return "Style name is required.";
  }

  const resultImages = Array.isArray(payload.images) ? payload.images : [];
  const recommendationImages = Array.isArray(payload.recommendationImages)
    ? payload.recommendationImages
    : [];
  const sourcePhotos = Array.isArray(payload.sourcePhotos)
    ? payload.sourcePhotos
    : [];
  const outfitImages = Array.isArray(payload.outfitImages)
    ? payload.outfitImages
    : [];
  const makeupImages = Array.isArray(payload.makeupImages)
    ? payload.makeupImages
    : [];

  if (
    !resultImages.length &&
    !recommendationImages.length &&
    !sourcePhotos.length &&
    !outfitImages.length &&
    !makeupImages.length
  ) {
    return "At least one history image is required.";
  }

  if (resultImages.length > 9) {
    return "At most 9 result images can be saved.";
  }

  if (recommendationImages.length > 9) {
    return "At most 9 recommendation images can be saved.";
  }

  if (sourcePhotos.length > 3) {
    return "At most 3 source photos can be saved.";
  }

  if (outfitImages.length > 16) {
    return "At most 16 outfit images can be saved.";
  }

  if (makeupImages.length > 4) {
    return "At most 4 makeup images can be saved.";
  }

  return "";
}

function filterAssetsByType(assets: AssetRow[], assetType: ConsultationAssetType) {
  return assets.filter((asset) => asset.asset_type === assetType);
}

async function buildSignedAssetImages(assets: AssetRow[], limit = 9) {
  const supabase = getSupabaseAdminClient();
  const bucket = getConsultationStorageBucket();

  const images = await Promise.all(
    assets
      .slice()
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
      .slice(0, limit)
      .map(async (asset, index) => {
        let imageUrl = asset.original_url ?? "";

        if (asset.storage_path && supabase) {
          const signed = await supabase.storage
            .from(bucket)
            .createSignedUrl(asset.storage_path, 60 * 60);

          if (signed.error) {
            console.warn("consultation asset signed url failed", signed.error);
          }

          imageUrl = signed.data?.signedUrl ?? imageUrl;
        }

        return {
          assetType: asset.asset_type,
          displayOrder: asset.display_order ?? index + 1,
          imageUrl,
          label: asset.angle_label ?? `${index + 1}번`,
        };
      }),
  );

  return images.filter((image) => Boolean(image.imageUrl));
}

async function loadRecommendationsBySession(
  supabase: SupabaseAdminClient,
  sessionIds: string[],
) {
  const result = await supabase
    .from("hairstyle_recommendations")
    .select("session_id, style_id, reason, tags, salon_process, caution")
    .in("session_id", sessionIds)
    .order("rank", { ascending: true });

  if (result.error) {
    console.warn("consultation recommendation load failed", result.error);
    return new Map<string, RecommendationRow>();
  }

  const bySession = new Map<string, RecommendationRow>();

  ((result.data ?? []) as RecommendationRow[]).forEach((recommendation) => {
    if (!bySession.has(recommendation.session_id)) {
      bySession.set(recommendation.session_id, recommendation);
    }
  });

  return bySession;
}

async function saveSelectedRecommendation(
  supabase: SupabaseAdminClient,
  sessionId: string,
  payload: ConsultationPayload,
) {
  const styleId = sanitizeText(payload.styleId, 120);
  const reason = sanitizeText(payload.styleReason, 600);
  const salonProcess = sanitizeText(payload.salonProcess, 400);
  const tags = sanitizeStringArray(payload.styleTags, 6);
  const advice = encodeRecommendationAdvice(payload);

  if (!styleId && !reason && !salonProcess && !advice && !tags.length) {
    return;
  }

  const deleteResult = await supabase
    .from("hairstyle_recommendations")
    .delete()
    .eq("session_id", sessionId);

  if (deleteResult.error) {
    console.warn("previous recommendation delete failed", deleteResult.error);
  }

  const insertResult = await supabase.from("hairstyle_recommendations").insert({
    caution: advice,
    rank: 1,
    reason,
    salon_process: salonProcess,
    session_id: sessionId,
    style_id: styleId,
    tags,
  });

  if (insertResult.error) {
    console.warn("selected recommendation save failed", insertResult.error);
  }
}

function encodeRecommendationAdvice(payload: ConsultationPayload) {
  const advice = {
    makeupAdvice: sanitizeText(payload.makeupAdvice, 400),
    maintenanceAdvice: sanitizeText(payload.maintenanceAdvice, 400),
    outfitAdvice: sanitizeText(payload.outfitAdvice, 400),
  };

  if (!advice.makeupAdvice && !advice.maintenanceAdvice && !advice.outfitAdvice) {
    return null;
  }

  return JSON.stringify(advice);
}

function decodeRecommendationAdvice(value: string | null | undefined) {
  if (!value) {
    return {
      makeupAdvice: undefined,
      maintenanceAdvice: undefined,
      outfitAdvice: undefined,
    };
  }

  try {
    const parsed = JSON.parse(value) as {
      makeupAdvice?: unknown;
      maintenanceAdvice?: unknown;
      outfitAdvice?: unknown;
    };

    return {
      makeupAdvice: sanitizeText(parsed.makeupAdvice, 400) ?? undefined,
      maintenanceAdvice: sanitizeText(parsed.maintenanceAdvice, 400) ?? undefined,
      outfitAdvice: sanitizeText(parsed.outfitAdvice, 400) ?? undefined,
    };
  } catch {
    return {
      makeupAdvice: undefined,
      maintenanceAdvice: sanitizeText(value, 400) ?? undefined,
      outfitAdvice: undefined,
    };
  }
}

function sanitizeId(value: string | undefined) {
  const sanitized =
    value?.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80) ||
    `mirilook-${Date.now()}`;

  return sanitized || `mirilook-${Date.now()}`;
}

function sanitizeExistingId(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  const trimmed = value.trim();

  return /^[a-zA-Z0-9_-]{1,80}$/.test(trimmed) ? trimmed : "";
}

function sanitizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function sanitizeStringArray(value: unknown, maxItems: number) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().slice(0, 80))
    .filter(Boolean)
    .slice(0, maxItems);
}

function normalizeCount(value: unknown) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.max(0, Math.min(10, Math.round(parsed)));
}

function normalizeIsoDate(value: unknown) {
  if (typeof value !== "string") {
    return new Date().toISOString();
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function parseDataImage(value: string) {
  const match = value.match(/^data:(image\/(?:jpeg|jpg|png));base64,([a-zA-Z0-9+/=]+)$/);

  if (!match) {
    return null;
  }

  const mimeType = match[1] === "image/jpg" ? "image/jpeg" : match[1];

  return {
    buffer: Buffer.from(match[2], "base64"),
    mimeType,
  };
}

function slugify(value: string) {
  return (
    value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9가-힣]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "result"
  );
}
