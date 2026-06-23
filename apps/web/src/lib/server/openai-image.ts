import OpenAI from "openai";

type ImageEditInput = {
  front: File;
  side: File;
  prompt: string;
  source?: "front" | "side" | "both";
};

export async function editHairImage({
  front,
  prompt,
  side,
  source = "both",
}: ImageEditInput) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const image =
    source === "front" ? [front] : source === "side" ? [side] : [front, side];

  const result = await openai.images.edit({
    model: process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-2",
    image,
    prompt,
    n: 1,
    size: "1024x1024",
    quality: normalizeQuality(process.env.OPENAI_IMAGE_QUALITY),
    output_format: "jpeg",
    output_compression: normalizeCompression(
      process.env.OPENAI_IMAGE_COMPRESSION,
    ),
    input_fidelity: "high",
    background: "opaque",
  });

  const imageBase64 = result.data?.[0]?.b64_json;

  if (!imageBase64) {
    throw new Error("OpenAI did not return an image.");
  }

  return `data:image/jpeg;base64,${imageBase64}`;
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
