import type { ImageEditInput } from "./openai-image";
import { logCost } from "@/lib/server/cost-log";

type GeminiInlineData = {
  data?: string;
  mimeType?: string;
  mime_type?: string;
};

type GeminiPart = {
  inlineData?: GeminiInlineData;
  inline_data?: GeminiInlineData;
  text?: string;
};

type GeminiUsageMetadata = {
  candidatesTokenCount?: number;
  promptTokenCount?: number;
  totalTokenCount?: number;
};

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: GeminiPart[];
    };
  }>;
  usageMetadata?: GeminiUsageMetadata;
};

export async function editHairImageWithGemini({
  base,
  baseReferences,
  front,
  leftSide,
  prompt,
  rightSide,
  side,
  source = "both",
  styleReferences,
}: ImageEditInput) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const model = normalizeGeminiModel(
    process.env.GEMINI_IMAGE_MODEL ?? "gemini-3-pro-image",
  );
  const endpoint = buildGeminiEndpoint(model, apiKey);
  const imageParts = await Promise.all(
    getReferenceImages({
      base,
      baseReferences,
      front,
      leftSide,
      rightSide,
      side,
      source,
      styleReferences,
    }).map(fileToInlineDataPart),
  );

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: buildGeminiPrompt(prompt),
            },
            ...imageParts,
          ],
        },
      ],
      generationConfig: buildGeminiGenerationConfig(),
    }),
  });

  if (!response.ok) {
    const message = await response.text();

    throw new Error(
      `Gemini image request failed (${response.status}): ${message.slice(0, 700)}`,
    );
  }

  const payload = (await response.json()) as GeminiGenerateContentResponse;
  logCost("image.gemini.final-angle", {
    images: 1,
    model,
    usageMetadata: payload.usageMetadata,
  });
  const inlineData = findInlineImageData(payload);

  if (!inlineData?.data) {
    throw new Error("Gemini did not return an image.");
  }

  return `data:${inlineData.mimeType ?? inlineData.mime_type ?? "image/png"};base64,${inlineData.data}`;
}

function buildGeminiPrompt(prompt: string) {
  return `
${prompt}

Provider-specific instruction:
Use all uploaded images as visual references. Generated stage references, when provided, appear before the original customer photos and may include the selected style image, the canonical front image, left/front/right base images, top crown image, or rear image. Style reference images, when provided, appear before the customer identity photos and must be used only for hairstyle attributes such as length, bangs, parting, layers, curls, texture, volume, and color mood.
Identity priority rule: the original customer photos are the only authority for face, identity, skin tone, makeup/no-makeup tone, expression, facial proportions, and real clothing. Style reference images have zero identity authority. Never average, blend, morph, or borrow the style reference person's eyes, nose, mouth, jaw, cheek fullness, skin tone, makeup, body, pose, or background.
When multiple style reference images are provided, analyze them together first as one grouped celebrity-hair slot for the current card. Treat the first style reference as the primary hairstyle target, and use the remaining references as alternate hairstyle views or detail references. Do not paste or clone a celebrity hairstyle mechanically. Fit the synthesized hairstyle to the customer's face shape, forehead height, cheek fullness, jaw width, head width, hairline, and head silhouette by adjusting fringe density, part ratio, side volume, crown height, layer start, curl size, nape length, and color intensity.
Preserve the same customer identity and hairstyle system across the staged set, while changing only what the requested salon reference angle requires.
Return exactly one finished photorealistic image as inline image data. Do not return a collage, contact sheet, app UI, text-only answer, caption, watermark, or extra people.
`;
}

function buildGeminiGenerationConfig() {
  const imageConfig: Record<string, string> = {};
  const aspectRatio = process.env.GEMINI_IMAGE_ASPECT_RATIO ?? "1:1";
  const imageSize = process.env.GEMINI_IMAGE_SIZE ?? "1K";

  if (aspectRatio) {
    imageConfig.aspectRatio = aspectRatio;
  }

  if (imageSize) {
    imageConfig.imageSize = imageSize;
  }

  return {
    responseModalities: ["TEXT", "IMAGE"],
    ...(Object.keys(imageConfig).length ? { imageConfig } : {}),
  };
}

function buildGeminiEndpoint(model: string, apiKey: string) {
  const baseUrl = (
    process.env.GEMINI_API_BASE_URL ??
    "https://generativelanguage.googleapis.com/v1beta"
  ).replace(/\/$/, "");

  return `${baseUrl}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
}

function normalizeGeminiModel(model: string) {
  return model.replace(/^models\//, "").trim();
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

async function fileToInlineDataPart(file: File) {
  const data = Buffer.from(await file.arrayBuffer()).toString("base64");

  return {
    inlineData: {
      data,
      mimeType: file.type || "image/jpeg",
    },
  };
}

function findInlineImageData(payload: GeminiGenerateContentResponse) {
  const parts =
    payload.candidates?.flatMap((candidate) => candidate.content?.parts ?? []) ??
    [];

  for (const part of parts) {
    const inlineData = part.inlineData ?? part.inline_data;

    if (inlineData?.data) {
      return inlineData;
    }
  }
}
