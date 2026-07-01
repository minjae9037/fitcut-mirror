// Client helpers for background generation. Feature-flagged OFF by default:
// when disabled, the studio behaves exactly as before. When enabled, the studio
// pre-uploads source photos, enqueues a server-side job, and polls for results.

export function isBackgroundGenerationEnabled() {
  return process.env.NEXT_PUBLIC_MIRILOOK_BG_GENERATION === "true";
}

export type PrepareBackgroundResult = {
  prepared: boolean;
  reason?: string;
  selectedPreviewPath?: string;
  sessionId?: string;
  sourceAssetPaths?: string[];
};

export type PrepareBackgroundInput = {
  apiBaseUrl: string;
  audience?: string;
  hairColorId?: string;
  hairColorName?: string;
  headers?: Record<string, string>;
  regionName?: string;
  selectedPreview?: { imageUrl: string; label?: string };
  sessionId: string;
  sourcePhotos: { imageUrl: string; label?: string }[];
  styleId?: string;
  styleName?: string;
};

export async function prepareBackgroundSession(
  input: PrepareBackgroundInput,
): Promise<PrepareBackgroundResult> {
  try {
    const response = await fetch(`${input.apiBaseUrl}/api/consultations/prepare/`, {
      body: JSON.stringify({
        audience: input.audience,
        hairColorId: input.hairColorId,
        hairColorName: input.hairColorName,
        regionName: input.regionName,
        selectedPreview: input.selectedPreview,
        sessionId: input.sessionId,
        sourcePhotos: input.sourcePhotos,
        styleId: input.styleId,
        styleName: input.styleName,
      }),
      headers: { "content-type": "application/json", ...(input.headers ?? {}) },
      method: "POST",
    });

    return (await response
      .json()
      .catch(() => ({ prepared: false, reason: "parse_error" }))) as PrepareBackgroundResult;
  } catch {
    return { prepared: false, reason: "network_error" };
  }
}

export type EnqueueBackgroundInput = {
  apiBaseUrl: string;
  audience: "male" | "female";
  hairColorId?: string;
  hairColorName?: string;
  headers?: Record<string, string>;
  imageAssetIds: string[];
  region?: string;
  requestedAngles: string[];
  selectedPreviewPath?: string;
  selectedStyleId: string;
  selectedStyleName: string;
  sessionId: string;
  styleMemo?: string;
};

export type EnqueueBackgroundResult = {
  accepted: boolean;
  reason?: string;
};

export async function enqueueBackgroundJob(
  input: EnqueueBackgroundInput,
): Promise<EnqueueBackgroundResult> {
  try {
    const response = await fetch(`${input.apiBaseUrl}/api/consultations/jobs/`, {
      body: JSON.stringify({
        audience: input.audience,
        hairColorId: input.hairColorId,
        hairColorName: input.hairColorName,
        imageAssetIds: input.imageAssetIds,
        region: input.region,
        requestedAngles: input.requestedAngles,
        selectedPreviewPath: input.selectedPreviewPath,
        selectedStyleId: input.selectedStyleId,
        selectedStyleName: input.selectedStyleName,
        sessionId: input.sessionId,
        styleMemo: input.styleMemo,
      }),
      headers: { "content-type": "application/json", ...(input.headers ?? {}) },
      method: "POST",
    });

    return (await response
      .json()
      .catch(() => ({ accepted: false, reason: "parse_error" }))) as EnqueueBackgroundResult;
  } catch {
    return { accepted: false, reason: "network_error" };
  }
}

export type BackgroundStatusResult = {
  completedCount?: number;
  done: boolean;
  images: Array<{ displayOrder: number; imageUrl: string; label: string }>;
  ready: boolean;
  reason?: string;
  status: string;
  styleName?: string | null;
  total?: number;
};

export async function fetchBackgroundStatus(input: {
  apiBaseUrl: string;
  headers?: Record<string, string>;
  sessionId: string;
}): Promise<BackgroundStatusResult> {
  try {
    const response = await fetch(
      `${input.apiBaseUrl}/api/consultations/status/?sessionId=${encodeURIComponent(input.sessionId)}`,
      { headers: { ...(input.headers ?? {}) }, method: "GET" },
    );

    return (await response.json().catch(() => ({
      done: false,
      images: [],
      ready: false,
      reason: "parse_error",
      status: "unknown",
    }))) as BackgroundStatusResult;
  } catch {
    return { done: false, images: [], ready: false, reason: "network_error", status: "unknown" };
  }
}
