import OpenAI from "openai";

type ImageEditInput = {
  base?: File;
  front: File;
  side: File;
  prompt: string;
  source?: "front" | "side" | "both";
  size?: string;
};

export async function editHairImage({
  base,
  front,
  prompt,
  side,
  size = process.env.OPENAI_IMAGE_SIZE ?? "1024x1024",
  source = "both",
}: ImageEditInput) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const image = getReferenceImages({ base, front, side, source });

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

  const imageBase64 = result.data?.[0]?.b64_json;

  if (!imageBase64) {
    throw new Error("OpenAI did not return an image.");
  }

  return `data:image/jpeg;base64,${imageBase64}`;
}

function getReferenceImages({
  base,
  front,
  side,
  source,
}: {
  base?: File;
  front: File;
  side: File;
  source: "front" | "side" | "both";
}) {
  const primary =
    source === "front" ? [front] : source === "side" ? [side] : [front, side];

  return base ? [base, ...primary] : primary;
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

  return 70;
}
