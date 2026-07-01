import {
  getConsultationStorageBucket,
  getSupabaseAdminClient,
} from "@/lib/server/supabase-admin";

export const runtime = "nodejs";
export const maxDuration = 30;

type GenerationAssetRow = {
  angle_label: string | null;
  display_order: number | null;
  original_url: string | null;
  storage_path: string | null;
};

type ShareRow = {
  expires_at: string;
  revoked_at: string | null;
  session_id: string;
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token: rawToken } = await context.params;
  const token = sanitizeToken(rawToken);

  if (!token) {
    return Response.json({ error: "invalid_share_token" }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return Response.json({ error: "supabase_not_configured" }, { status: 503 });
  }

  const shareResult = await supabase
    .from("consultation_shares")
    .select("session_id, expires_at, revoked_at")
    .eq("token", token)
    .maybeSingle<ShareRow>();

  if (shareResult.error || !shareResult.data) {
    return Response.json({ error: "share_not_found" }, { status: 404 });
  }

  if (shareResult.data.revoked_at) {
    return Response.json({ error: "share_revoked" }, { status: 410 });
  }

  if (new Date(shareResult.data.expires_at).getTime() < Date.now()) {
    return Response.json({ error: "share_expired" }, { status: 410 });
  }

  const assetResult = await supabase
    .from("generation_assets")
    .select("angle_label, display_order, original_url, storage_path")
    .eq("session_id", shareResult.data.session_id)
    .eq("asset_type", "final_angle")
    .order("display_order", { ascending: true })
    .returns<GenerationAssetRow[]>();

  if (assetResult.error) {
    console.error("share thumbnail asset lookup failed", assetResult.error);

    return Response.json(
      { error: "thumbnail_lookup_failed" },
      { status: 500 },
    );
  }

  const asset = selectThumbnailAsset(assetResult.data ?? []);

  if (!asset) {
    return Response.json({ error: "thumbnail_not_found" }, { status: 404 });
  }

  if (asset.storage_path) {
    const download = await supabase.storage
      .from(getConsultationStorageBucket())
      .download(asset.storage_path);

    if (download.error || !download.data) {
      console.error("share thumbnail download failed", download.error);

      return Response.json(
        { error: "thumbnail_download_failed" },
        { status: 500 },
      );
    }

    return new Response(download.data, {
      headers: buildImageHeaders(
        download.data.type || getContentType(asset.storage_path),
        getSafeFileName(asset.storage_path),
      ),
    });
  }

  const originalUrl = sanitizeHttpsUrl(asset.original_url);

  if (originalUrl) {
    return Response.redirect(originalUrl, 302);
  }

  return Response.json({ error: "thumbnail_not_found" }, { status: 404 });
}

function selectThumbnailAsset(assets: GenerationAssetRow[]) {
  const sorted = assets
    .slice()
    .sort((a, b) => (a.display_order ?? 999) - (b.display_order ?? 999))
    .filter((asset) => asset.storage_path || sanitizeHttpsUrl(asset.original_url));

  return (
    sorted.find((asset) => asset.angle_label?.includes("정면")) ??
    sorted.find((asset) => {
      const label = asset.angle_label ?? "";

      return !/상단|후면|하단/.test(label);
    }) ??
    sorted[0] ??
    null
  );
}

function buildImageHeaders(contentType: string, fileName: string) {
  return new Headers({
    "Cache-Control": "public, max-age=3600, s-maxage=86400",
    "Content-Disposition": `inline; filename="${fileName}"`,
    "Content-Type": contentType,
  });
}

function getContentType(path: string) {
  const lowerPath = path.toLowerCase();

  if (lowerPath.endsWith(".png")) {
    return "image/png";
  }

  if (lowerPath.endsWith(".webp")) {
    return "image/webp";
  }

  return "image/jpeg";
}

function getSafeFileName(path: string) {
  return (
    path
      .split("/")
      .pop()
      ?.replace(/[^a-zA-Z0-9가-힣._-]/g, "-")
      .slice(0, 120) || "mirilook-thumbnail.jpg"
  );
}

function sanitizeHttpsUrl(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  try {
    const url = new URL(value);

    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function sanitizeToken(value: string) {
  return /^[a-zA-Z0-9_-]{12,96}$/.test(value) ? value : "";
}
