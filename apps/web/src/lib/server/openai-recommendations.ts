import OpenAI from "openai";
import {
  fitcutStyles,
  styleCatalog,
  type FitcutStyle,
} from "@/lib/fitcut-styles";

type RecommendationPick = {
  id: string;
  reason: string;
  tags: string[];
};

type RecommendationPayload = {
  summary: string;
  picks: RecommendationPick[];
};

export async function recommendHairStyles(front: File, side: File) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const [frontUrl, sideUrl] = await Promise.all([
    fileToDataUrl(front),
    fileToDataUrl(side),
  ]);

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_RECOMMENDATION_MODEL ?? "gpt-4.1-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a senior Korean men's hair designer. Recommend realistic, salon-actionable hairstyles from the provided catalog only. Return Korean copy for the customer.",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: buildRecommendationPrompt(),
          },
          {
            type: "image_url",
            image_url: {
              url: frontUrl,
              detail: "low",
            },
          },
          {
            type: "image_url",
            image_url: {
              url: sideUrl,
              detail: "low",
            },
          },
        ],
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "fitcut_recommendations",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["summary", "picks"],
          properties: {
            summary: {
              type: "string",
              description:
                "A short Korean summary of the user's visible hair and face-shape suitability.",
            },
            picks: {
              type: "array",
              description:
                "Exactly 9 unique hairstyle recommendations from the catalog.",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["id", "reason", "tags"],
                properties: {
                  id: {
                    type: "string",
                    enum: styleCatalog.map((style) => style.id),
                  },
                  reason: {
                    type: "string",
                  },
                  tags: {
                    type: "array",
                    items: {
                      type: "string",
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const content = completion.choices[0]?.message?.content;

  if (!content) {
    throw new Error("OpenAI did not return hairstyle recommendations.");
  }

  const payload = JSON.parse(content) as RecommendationPayload;
  const recommendations = normalizeRecommendations(payload.picks);

  return {
    notes: [
      "정면과 측면 사진을 함께 기준으로 보았어요.",
      payload.summary ||
        "얼굴형, 옆 라인, 현재 모발 볼륨을 기준으로 어울릴 가능성이 높은 스타일을 골랐습니다.",
      "마음에 드는 디자인을 누르면 크게 확인하고, 버튼을 눌러 상담용 9장을 생성할 수 있습니다.",
    ],
    recommendations,
  };
}

function buildRecommendationPrompt() {
  const catalog = styleCatalog
    .map(
      (style) =>
        `- ${style.id}: ${style.name}. Good for: ${style.reason}. Hair prompt: ${style.prompt}`,
    )
    .join("\n");

  return `
Analyze the uploaded front and side photos together.

Pick exactly 9 unique hairstyles from this catalog. Do not always choose the first nine. Choose based on visible face shape, head shape, current hair volume, side silhouette, forehead exposure, and whether the result is realistic for a first salon pilot test.

For each pick:
- Use only an id from the catalog.
- Write a short Korean reason customized to this customer's photos.
- Add 2 or 3 short Korean tags.
- Avoid duplicate style ids.
- Include a balanced range: at least 2 short styles, 2 medium/soft styles, and 1 volume/perm option when suitable.

Catalog:
${catalog}
`;
}

function normalizeRecommendations(picks: RecommendationPick[]) {
  const catalogMap = new Map(styleCatalog.map((style) => [style.id, style]));
  const selected: FitcutStyle[] = [];
  const seen = new Set<string>();

  for (const pick of picks) {
    const style = catalogMap.get(pick.id);

    if (!style || seen.has(style.id)) {
      continue;
    }

    seen.add(style.id);
    selected.push({
      ...style,
      reason: sanitizeReason(pick.reason, style.reason),
      tags: sanitizeTags(pick.tags, style.tags),
    });

    if (selected.length === 9) {
      break;
    }
  }

  for (const style of styleCatalog) {
    if (selected.length === 9) {
      break;
    }

    if (!seen.has(style.id)) {
      selected.push(style);
      seen.add(style.id);
    }
  }

  return selected.length ? selected : fitcutStyles;
}

function sanitizeReason(value: string | undefined, fallback: string) {
  const trimmed = value?.trim();

  if (!trimmed || trimmed.length > 140) {
    return fallback;
  }

  return trimmed;
}

function sanitizeTags(value: string[] | undefined, fallback: string[]) {
  const tags = Array.isArray(value)
    ? value
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 3)
    : [];

  return tags.length ? tags : fallback;
}

async function fileToDataUrl(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const mimeType = file.type || "image/jpeg";

  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}
