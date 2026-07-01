import {
  getConsultationStorageBucket,
  getSupabaseAdminClient,
  getVerifiedSupabaseUser,
} from "@/lib/server/supabase-admin";
import { protectMutationRequest } from "@/lib/server/request-security";

export const runtime = "nodejs";
export const maxDuration = 30;

// Phase 1 of background generation: upload the original source photos to
// Supabase storage and create a "preparing" session BEFORE generation so a
// server-side job (Phase 3) can read them. Additive + auth-gated; the existing
// client-side flow is unaffected when this is not called.

type PrepareSourcePhoto = {
  imageUrl?: string;
  label?: string;
};

type PreparePayload = {
  audience?: string;
  hairColorId?: string;
  hairColorName?: string;
  regionName?: string;
  selectedPreview?: PrepareSourcePhoto;
  sessionId?: string;
  sourcePhotos?: PrepareSourcePhoto[];
  styleId?: string;
  styleName?: string;
};

export async function POST(request: Request) {
  const securityError = protectMutationRequest(request, {
    maxBodyBytes: 40 * 1024 * 1024,
    rateLimit: {
      key: "consultations:prepare",
      limit: 30,
      windowMs: 10 * 60 * 1000,
    },
    requireOrigin: true,
  });

  if (securityError) {
    return securityError;
  }

  let payload: PreparePayload;

  try {
    payload = (await request.json()) as PreparePayload;
  } catch {
    return Response.json({ error: "Invalid prepare payload." }, { status: 400 });
  }

  const sessionId = sanitizeId(payload.sessionId);
  const sourcePhotos = (
    Array.isArray(payload.sourcePhotos) ? payload.sourcePhotos : []
  ).slice(0, 3);

  if (!sessionId) {
    return Response.json({ error: "sessionId is required." }, { status: 400 });
  }

  if (sourcePhotos.length < 2) {
    return Response.json(
      { error: "At least two source photos are required." },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return Response.json({ prepared: false, reason: "supabase_not_configured" });
  }

  const user = await getVerifiedSupabaseUser(request);

  if (!user) {
    return Response.json({ prepared: false, reason: "not_authenticated" });
  }

  const bucket = getConsultationStorageBucket();

  try {
    const profileUpsert = await supabase.from("profiles").upsert(
      { email: user.email ?? null, id: user.id, updated_at: new Date().toISOString() },
      { onConflict: "id" },
    );

    if (profileUpsert.error) {
      console.warn("profile upsert before prepare failed", profileUpsert.error);
    }

    const uploads = await Promise.all(
      sourcePhotos.map(async (photo, index) => {
        const label = sanitizeText(photo.label, 80) || `source-${index + 1}`;
        const parsed = parseDataImage(photo.imageUrl ?? "");

        if (!parsed) {
          return null;
        }

        const extension = parsed.mimeType === "image/png" ? "png" : "jpg";
        const storagePath = `${sessionId}/source_photo-${String(index + 1).padStart(2, "0")}-${slugify(label)}.${extension}`;
        const upload = await supabase.storage.from(bucket).upload(storagePath, parsed.buffer, {
          cacheControl: "31536000",
          contentType: parsed.mimeType,
          upsert: true,
        });

        if (upload.error) {
          throw upload.error;
        }

        return { angleLabel: label, displayOrder: index + 1, storagePath };
      }),
    );

    const storedUploads = uploads.filter(
      (item): item is { angleLabel: string; displayOrder: number; storagePath: string } =>
        Boolean(item),
    );

    if (storedUploads.length < 2) {
      return Response.json(
        { error: "Source photos could not be decoded." },
        { status: 400 },
      );
    }

    const sessionUpsert = await supabase.from("generation_sessions").upsert({
      audience_name: sanitizeText(payload.audience, 40),
      created_at: new Date().toISOString(),
      hair_color_name: sanitizeText(payload.hairColorName, 80),
      id: sessionId,
      profile_id: user.id,
      region_name: sanitizeText(payload.regionName, 80),
      selected_style_id: sanitizeText(payload.styleId, 120),
      source_photo_count: storedUploads.length,
      status: "preparing",
      style_name: sanitizeText(payload.styleName, 120),
      uploaded_count: storedUploads.length,
    });

    if (sessionUpsert.error) {
      throw sessionUpsert.error;
    }

    const assetDelete = await supabase
      .from("generation_assets")
      .delete()
      .eq("session_id", sessionId)
      .eq("asset_type", "source_photo");

    if (assetDelete.error) {
      throw assetDelete.error;
    }

    const assetRows = storedUploads.map((result) => ({
      angle_label: result.angleLabel,
      asset_type: "source_photo",
      display_order: result.displayOrder,
      original_url: null,
      provider: "mirilook-web",
      session_id: sessionId,
      status: "stored",
      storage_path: result.storagePath,
    }));

    // Optional: the selected style preview, so the background job can use it as
    // the hairstyle reference for the 9-angle board.
    let selectedPreviewPath: string | null = null;
    const previewParsed = parseDataImage(payload.selectedPreview?.imageUrl ?? "");

    if (previewParsed) {
      const previewExt = previewParsed.mimeType === "image/png" ? "png" : "jpg";
      const previewPath = `${sessionId}/recommendation_preview-00-selected.${previewExt}`;
      const previewUpload = await supabase.storage
        .from(bucket)
        .upload(previewPath, previewParsed.buffer, {
          cacheControl: "31536000",
          contentType: previewParsed.mimeType,
          upsert: true,
        });

      if (!previewUpload.error) {
        selectedPreviewPath = previewPath;
        assetRows.push({
          angle_label: "선택 스타일 프리뷰",
          asset_type: "recommendation_preview",
          display_order: 0,
          original_url: null,
          provider: "mirilook-web",
          session_id: sessionId,
          status: "stored",
          storage_path: previewPath,
        });
      }
    }

    await supabase
      .from("generation_assets")
      .delete()
      .eq("session_id", sessionId)
      .eq("asset_type", "recommendation_preview");

    const assetInsert = await supabase.from("generation_assets").insert(assetRows);

    if (assetInsert.error) {
      throw assetInsert.error;
    }

    return Response.json({
      prepared: true,
      selectedPreviewPath,
      sessionId,
      sourceAssetPaths: storedUploads.map((result) => result.storagePath),
    });
  } catch (error) {
    console.error("consultation prepare failed", error);

    return Response.json(
      { prepared: false, reason: "prepare_failed" },
      { status: 500 },
    );
  }
}

function sanitizeId(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 120);
}

function sanitizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function slugify(value: string) {
  // Supabase storage keys must be ASCII-safe (Korean labels break uploads).
  // Uniqueness is guaranteed by the index prefix in the path.
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "photo"
  );
}

function parseDataImage(value: string) {
  const match = value.match(
    /^data:(image\/(?:jpeg|jpg|png));base64,([a-zA-Z0-9+/=]+)$/,
  );

  if (!match) {
    return null;
  }

  return {
    buffer: Buffer.from(match[2], "base64"),
    mimeType: match[1] === "image/jpg" ? "image/jpeg" : match[1],
  };
}
