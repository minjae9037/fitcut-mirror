import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getRegionProfile, sanitizeRegion } from "@/lib/mirilook-regions";
import { sanitizeAudience } from "@/lib/mirilook-styles";
import { protectMutationRequest } from "@/lib/server/request-security";
import { logCost } from "@/lib/server/cost-log";

export const runtime = "nodejs";
export const maxDuration = 30;

// Personalized + season-aware (TPO) outfit recommendations. Given the chosen
// hairstyle, hair color, gender, region, the customer's memo, and the target
// date's season, an LLM returns tailored item directions. The studio still
// renders each item's image via /api/style/outfit using the returned query.
const ALLOWED_ITEM_IDS = [
  "top",
  "bottom",
  "glasses",
  "shoes",
  "bag",
  "watch",
  "bracelet",
  "necklace",
  "earrings",
  "hat",
  "sunglasses",
  "earphones",
  "circle-lens",
] as const;

type ItemId = (typeof ALLOWED_ITEM_IDS)[number];

type OutfitItem = {
  description: string;
  id: ItemId;
  label: string;
  query: string;
  tags: string[];
};

export async function POST(request: Request) {
  const securityError = protectMutationRequest(request, {
    maxBodyBytes: 64 * 1024,
    rateLimit: {
      key: "style:outfit-reco",
      limit: 30,
      windowMs: 10 * 60 * 1000,
    },
  });

  if (securityError) {
    return securityError;
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }

  let body: {
    audience?: string;
    date?: string;
    hairColorName?: string;
    memo?: string;
    region?: string;
    styleName?: string;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const audience = sanitizeAudience(body.audience ?? null);
  const region = sanitizeRegion(body.region ?? null);
  const regionProfile = getRegionProfile(region);
  const hairColorName = clampText(body.hairColorName, 40);
  const styleName = clampText(body.styleName, 80);
  const memo = clampText(body.memo, 300);
  const { monthLabel, season } = resolveSeason(body.date);

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.OPENAI_RECOMMENDATION_MODEL ?? "gpt-4.1-mini";

  try {
    const completion = await openai.chat.completions.create({
      messages: [
        {
          content:
            "You are a professional Korean personal stylist. You design wearable, season-appropriate outfits that harmonize with a specific hairstyle and hair color. Respond ONLY with valid JSON.",
          role: "system",
        },
        {
          content: buildPrompt({
            audience,
            hairColorName,
            memo,
            monthLabel,
            regionLabel: regionProfile.englishLabel,
            season,
            styleName,
          }),
          role: "user",
        },
      ],
      model,
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    logCost("text.outfit-reco", { model, usage: completion.usage });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as { items?: unknown };
    const items = sanitizeItems(parsed.items);

    if (!items.length) {
      return NextResponse.json({ error: "no_items" }, { status: 502 });
    }

    return NextResponse.json({ items, season });
  } catch (error) {
    console.error("outfit recommendation generation failed", error);

    return NextResponse.json({ error: "generation_failed" }, { status: 500 });
  }
}

function buildPrompt({
  audience,
  hairColorName,
  memo,
  monthLabel,
  regionLabel,
  season,
  styleName,
}: {
  audience: "male" | "female";
  hairColorName: string;
  memo: string;
  monthLabel: string;
  regionLabel: string;
  season: string;
  styleName: string;
}) {
  const genderLabel = audience === "female" ? "여성" : "남성";

  return `${genderLabel} 고객의 헤어스타일에 어울리는 코디(의류·잡화)를 추천하세요.

[고객/맥락]
- 성별: ${genderLabel}
- 선택한 헤어스타일: ${styleName || "지정 안 됨"}
- 헤어 컬러: ${hairColorName || "지정 안 됨"}
- 시장/지역: ${regionLabel}
- 착용 시점(계절): ${season} (${monthLabel})
- 고객 메모(취향/상황): ${memo || "없음"}

[규칙]
- ${season} 계절에 맞는 소재·기장·레이어링·색감으로 제안하세요(예: 여름=린넨/반팔/얇은 소재, 겨울=니트/코트/보온).
- 선택한 헤어스타일과 컬러의 분위기를 살리도록(얼굴 주변 라인, 톤 매칭) 추천하세요.
- 고객 메모가 있으면 그 상황/취향을 우선 반영하세요.
- 정확히 8개 항목을 추천하되, 각 항목의 id는 아래 목록에서만 선택하세요(중복 금지).
- id 목록: top(상의), bottom(하의), glasses(안경), shoes(신발), bag(가방), watch(시계), bracelet(팔찌), necklace(목걸이), earrings(귀걸이), hat(모자), sunglasses(선글라스), earphones(이어폰), circle-lens(서클렌즈)
- query는 한국어 쇼핑 검색어로, 계절·성별·핵심 키워드를 포함하세요(예: "${genderLabel} ${season} 니트 가디건").
- description은 왜 이 고객·헤어·계절에 맞는지 1~2문장(한국어).

[출력 형식 — JSON만]
{"items":[{"id":"top","label":"상의","description":"...","query":"...","tags":["...","..."]}, ...]}`;
}

function sanitizeItems(value: unknown): OutfitItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const items: OutfitItem[] = [];

  for (const entry of value) {
    if (!entry || typeof entry !== "object") {
      continue;
    }

    const record = entry as Record<string, unknown>;
    const id = typeof record.id === "string" ? record.id.trim() : "";

    if (!ALLOWED_ITEM_IDS.includes(id as ItemId) || seen.has(id)) {
      continue;
    }

    const label = clampText(record.label, 24) || id;
    const description = clampText(record.description, 220);
    const query = clampText(record.query, 80);
    const tags = Array.isArray(record.tags)
      ? record.tags
          .filter((tag): tag is string => typeof tag === "string")
          .map((tag) => clampText(tag, 16))
          .filter(Boolean)
          .slice(0, 4)
      : [];

    if (!query) {
      continue;
    }

    seen.add(id);
    items.push({ description, id: id as ItemId, label, query, tags });

    if (items.length >= 8) {
      break;
    }
  }

  return items;
}

function clampText(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/[<>]/g, "").trim().slice(0, maxLength);
}

function resolveSeason(rawDate: string | undefined) {
  const parsed = rawDate ? new Date(rawDate) : new Date();
  const date = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const month = date.getMonth() + 1;

  const season =
    month >= 3 && month <= 5
      ? "봄"
      : month >= 6 && month <= 8
        ? "여름"
        : month >= 9 && month <= 11
          ? "가을"
          : "겨울";

  return { monthLabel: `${month}월`, season };
}
