export const MirilookConsultationTaskId = "mirilook-generate-consultation";

export type MirilookConsultationJobPayload = {
  audience: "male" | "female";
  consultationShareToken?: string;
  finalProvider?: "gemini" | "openai";
  hairColorId?: string;
  hairColorName?: string;
  imageAssetIds: string[];
  ownerProfileId?: string;
  region?: string;
  requestedAngles: string[];
  selectedPreviewPath?: string;
  selectedStyleId: string;
  selectedStyleName: string;
  sessionId: string;
  styleMemo?: string;
};

export function validateConsultationJobPayload(value: unknown) {
  if (!isRecord(value)) {
    return null;
  }

  const sessionId = text(value.sessionId, 120);
  const selectedStyleId = text(value.selectedStyleId, 120);
  const selectedStyleName = text(value.selectedStyleName, 120);
  const audience = value.audience === "female" ? "female" : "male";
  const imageAssetIds = stringArray(value.imageAssetIds, 12, 160);
  const requestedAngles = stringArray(value.requestedAngles, 12, 80);

  if (
    !sessionId ||
    !selectedStyleId ||
    !selectedStyleName ||
    imageAssetIds.length < 2 ||
    requestedAngles.length < 1
  ) {
    return null;
  }

  return {
    audience,
    consultationShareToken: text(value.consultationShareToken, 160) ?? undefined,
    finalProvider: value.finalProvider === "openai" ? "openai" : "gemini",
    hairColorId: text(value.hairColorId, 120) ?? undefined,
    hairColorName: text(value.hairColorName, 120) ?? undefined,
    imageAssetIds,
    ownerProfileId: text(value.ownerProfileId, 120) ?? undefined,
    region: text(value.region, 40) ?? undefined,
    requestedAngles,
    selectedPreviewPath: text(value.selectedPreviewPath, 240) ?? undefined,
    selectedStyleId,
    selectedStyleName,
    sessionId,
    styleMemo: text(value.styleMemo, 1000) ?? undefined,
  } satisfies MirilookConsultationJobPayload;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function stringArray(value: unknown, maxItems: number, maxLength: number) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => text(item, maxLength))
    .filter((item): item is string => Boolean(item))
    .slice(0, maxItems);
}

function text(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed ? trimmed.slice(0, maxLength) : null;
}
