import OpenAI from "openai";
import { logCost } from "@/lib/server/cost-log";

export type ImageEditInput = {
  base?: File;
  baseReferences?: File[];
  costLabel?: string;
  front: File;
  leftSide?: File;
  rightSide?: File;
  side: File;
  prompt: string;
  source?: "front" | "side" | "both";
  size?: string;
  styleReferences?: File[];
};

export async function editHairImage({
  base,
  baseReferences,
  costLabel = "image",
  front,
  leftSide,
  prompt,
  rightSide,
  side,
  size = process.env.OPENAI_IMAGE_SIZE ?? "1024x1024",
  source = "both",
  styleReferences,
}: ImageEditInput) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const image = getReferenceImages({
    base,
    baseReferences,
    front,
    leftSide,
    rightSide,
    side,
    source,
    styleReferences,
  });

  const result = await openai.images.edit({
    model: process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-2",
    image,
    prompt,
    n: 1,
    size,
    quality: normalizeQuality(process.env.OPENAI_IMAGE_QUALITY),
    output_format: "jpeg",
    output_compression: normalizeCompression(
      process.env.OPENAI_IMAGE_COMPRESSION,
    ),
    background: "opaque",
  });

  logCost(`image.openai.${costLabel}`, {
    images: 1,
    model: process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-2",
    quality: normalizeQuality(process.env.OPENAI_IMAGE_QUALITY),
    size,
    usage: (result as { usage?: unknown }).usage,
  });

  const imageBase64 = result.data?.[0]?.b64_json;

  if (!imageBase64) {
    throw new Error("OpenAI did not return an image.");
  }

  return `data:image/jpeg;base64,${imageBase64}`;
}

function getReferenceImages({
  base,
  baseReferences,
  front,
  leftSide,
  rightSide,
  side,
  source,
  styleReferences,
}: {
  base?: File;
  baseReferences?: File[];
  front: File;
  leftSide?: File;
  rightSide?: File;
  side: File;
  source: "front" | "side" | "both";
  styleReferences?: File[];
}) {
  const sideReferences =
    leftSide || rightSide
      ? [leftSide, rightSide].filter((file): file is File => Boolean(file))
      : [side];
  const primary = source === "front" ? [front] : [front, ...sideReferences];
  const generatedReferences = [
    base,
    ...(baseReferences ?? []),
  ].filter((file): file is File => Boolean(file));
  const hairstyleReferences = (styleReferences ?? []).filter(
    (file): file is File => Boolean(file),
  );

  return [...generatedReferences, ...hairstyleReferences, ...primary];
}

function normalizeQuality(value: string | undefined) {
  if (value === "medium" || value === "high" || value === "auto") {
    return value;
  }

  return "low";
}

function normalizeCompression(value: string | undefined) {
  const parsed = Number(value);

  if (Number.isFinite(parsed)) {
    return Math.min(100, Math.max(0, Math.round(parsed)));
  }

  return 60;
}
