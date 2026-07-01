import OpenAI from "openai";
import {
  defaultAgeGroup,
  getAgeGroupProfile,
  isMirilookAgeGroup,
  type MirilookAgeGroup,
} from "@/lib/mirilook-demographics";
import {
  filterStylesByCurrentHairLength,
  getFallbackStylesByAudience,
  getHairLengthLabel,
  getStylesByAudience,
  sanitizeHairLength,
  type MirilookAudience,
  type MirilookHairLength,
  type MirilookStyle,
} from "@/lib/mirilook-styles";
import {
  getRegionProfile,
  type MirilookRegionId,
} from "@/lib/mirilook-regions";
import { loadRegionPriorityStyleIds } from "@/lib/server/mirilook-region-trends";
import { logCost } from "@/lib/server/cost-log";

type RecommendationPick = {
  bucket: "core" | "challenge";
  id: string;
  makeupAdvice: string;
  maintenanceAdvice: string;
  outfitAdvice: string;
  reason: string;
  salonProcess: string;
  tags: string[];
};

type RecommendationPayload = {
  currentHairLength: MirilookHairLength;
  summary: string;
  picks: RecommendationPick[];
};

type DemographicSignalPayload = {
  backupAgeGroup: MirilookAgeGroup;
  confidence: number;
  currentHairLength: MirilookHairLength;
  primaryAgeGroup: MirilookAgeGroup;
  visibleImpression: string;
};

export type RecommendationModeId = "current-length" | "face-fit";

export type PremiumAddOnId = "outfit-coordination" | "makeup-style";

export type RecommendationPhotoSlot = "front" | "left" | "right" | "side";

export type RecommendationPhotoContext = {
  hasActualFront?: boolean;
  primaryReferenceSlot?: RecommendationPhotoSlot;
  secondaryReferenceSlot?: RecommendationPhotoSlot;
  uploadedSlots?: RecommendationPhotoSlot[];
};

export async function recommendHairStyles({
  front,
  leftSide,
  photoContext = {},
  rightSide,
  side,
  ageGroup = defaultAgeGroup,
  audience,
  premiumAddOns = [],
  recommendationMode = "current-length",
  region,
  styleMemo,
}: {
  ageGroup?: MirilookAgeGroup;
  front: File;
  leftSide?: File;
  photoContext?: RecommendationPhotoContext;
  rightSide?: File;
  side: File;
  audience: MirilookAudience;
  premiumAddOns?: PremiumAddOnId[];
  recommendationMode?: RecommendationModeId;
  region: MirilookRegionId;
  styleMemo?: string;
}) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const sideFiles = [side, leftSide, rightSide].filter(
    (file): file is File => Boolean(file),
  );
  const [frontUrl, ...sideUrls] = await Promise.all([
    fileToDataUrl(front),
    ...sideFiles
      .filter((file): file is File => Boolean(file))
      .map((file) => fileToDataUrl(file)),
  ]);
  const photoContextBrief = buildPhotoContextBrief(photoContext, {
    hasExtraLeft: Boolean(leftSide),
    hasExtraRight: Boolean(rightSide),
  });
  const demographicSignal = await analyzeDemographicSignals({
    ageGroup,
    audience,
    frontUrl,
    openai,
    photoContextBrief,
    region,
    sideUrls,
  });
  const ageGroupCandidates = buildAgeGroupCandidates(
    ageGroup,
    demographicSignal,
  );
  const regionalPriority = await loadRegionPriorityStyleIds(
    region,
    audience,
    ageGroupCandidates[0],
    ageGroupCandidates.slice(1),
  );
  const recommendationModel =
    process.env.OPENAI_RECOMMENDATION_MODEL ?? "gpt-4.1-mini";
  const completionStartedAt = Date.now();

  const completion = await openai.chat.completions.create({
    model: recommendationModel,
    messages: [
      {
        role: "system",
        content:
          "You are a senior hair designer for Miri Look. Recommend realistic, salon-actionable hairstyles from the provided catalog only. Preserve the customer's visible gender expression and return Korean copy for the customer. The selected Country button value is the only market-region source; never infer or override country from the photos.",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: buildRecommendationPrompt(
              sideUrls.length + 1,
              ageGroup,
              ageGroupCandidates,
              demographicSignal,
              audience,
              region,
              regionalPriority.styleIds,
              regionalPriority.source,
              regionalPriority.evidenceBrief,
              recommendationMode,
              premiumAddOns,
              photoContextBrief,
              styleMemo,
            ),
          },
          {
            type: "image_url",
            image_url: {
              url: frontUrl,
              detail: "low",
            },
          },
          ...sideUrls.map(
            (url) =>
              ({
                type: "image_url",
                image_url: {
                  url,
                  detail: "low",
                },
              }) as const,
          ),
        ],
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "mirilook_recommendations",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          required: [
            "currentHairLength",
            "summary",
            "picks",
          ],
          properties: {
            currentHairLength: {
              type: "string",
              enum: ["very_short", "short", "bob", "medium", "long", "unknown"],
              description:
                "Visible current hair length. Use bob for jaw, chin, neck, or upper-shoulder bob. Use medium only when hair clearly passes the shoulder or collarbone. Use long only when it clearly extends below the collarbone or chest.",
            },
            summary: {
              type: "string",
              description:
                "A short Korean salon summary of visible photo quality, face balance, head shape, hair volume, and recommendation direction.",
            },
            picks: {
              type: "array",
              description:
                "Exactly 9 unique hairstyle recommendations from the catalog.",
              items: {
                type: "object",
                additionalProperties: false,
                required: [
                  "id",
                  "reason",
                  "bucket",
                  "tags",
                  "salonProcess",
                  "maintenanceAdvice",
                  "outfitAdvice",
                  "makeupAdvice",
                ],
                properties: {
                  id: {
                    type: "string",
                    enum: getStylesByAudience(audience).map((style) => style.id),
                  },
                  reason: {
                    type: "string",
                    description:
                      "Korean customer-facing fit reason. Focus on why it suits the visible face/head shape and silhouette.",
                  },
                  bucket: {
                    type: "string",
                    enum: ["core", "challenge"],
                    description:
                      "core for the 7 high-fit recommendations, challenge for the 2 bold but still suitable recommendations.",
                  },
                  tags: {
                    type: "array",
                    items: {
                      type: "string",
                    },
                  },
                  salonProcess: {
                    type: "string",
                    description:
                      "Concise Korean salon action note: cut, perm, down perm, color, bleach, styling, or grow-out needed.",
                  },
                  maintenanceAdvice: {
                    type: "string",
                    description:
                      "Concise Korean maintenance and caution note: daily styling, touch-up cycle, side volume, damage, or grow-out risk.",
                  },
                  outfitAdvice: {
                    type: "string",
                    description:
                      "Concise Korean outfit coordination advice when requested. Otherwise empty string.",
                  },
                  makeupAdvice: {
                    type: "string",
                    description:
                      "Concise Korean makeup advice when requested for a female customer. Otherwise empty string.",
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  console.info("mirilook recommendation llm duration", {
    ageGroups: regionalPriority.ageGroups,
    audience,
    elapsedMs: Date.now() - completionStartedAt,
    model: recommendationModel,
    region,
    source: regionalPriority.source,
    sourceCount: regionalPriority.sourceCount,
  });
  logCost("text.recommendation", {
    model: recommendationModel,
    usage: completion.usage,
  });

  const content = completion.choices[0]?.message?.content;

  if (!content) {
    throw new Error("OpenAI did not return hairstyle recommendations.");
  }

  const payload = JSON.parse(content) as RecommendationPayload;
  const parsedCurrentHairLength = sanitizeHairLength(payload.currentHairLength);
  const currentHairLength =
    parsedCurrentHairLength === "unknown"
      ? demographicSignal.currentHairLength
      : parsedCurrentHairLength;
  const recommendations = normalizeRecommendations(
    payload.picks,
    audience,
    regionalPriority.styleIds,
    currentHairLength,
    recommendationMode === "current-length",
  );
  const audienceLabel = audience === "female" ? "여성 헤어" : "남성 헤어";
  const regionProfile = getRegionProfile(region);
  const recommendationModeLabel =
    recommendationMode === "face-fit"
      ? "얼굴 적합 기준"
      : "현재 기장 기준";
  const premiumAddOnLabels = getPremiumAddOnLabels(premiumAddOns, audience);

  return {
    notes: [
      recommendationMode === "current-length"
        ? `현재 모발 기장은 ${getHairLengthLabel(currentHairLength)}으로 판단했고, 현재 기장과 같거나 더 짧아지는 후보만 우선 반영했습니다.`
        : `현재 모발 기장은 ${getHairLengthLabel(currentHairLength)}으로 참고하되, 얼굴에 어울리는 장기 전환 스타일도 함께 검토했습니다.`,
      `${regionProfile.label} · ${audienceLabel} 기준으로 얼굴상, 사진상 인상, 월간 트렌드를 함께 비교했습니다.`,
      `사진상 스타일 인상은 "${demographicSignal.visibleImpression}"로 참고했고, 트렌드 캐시는 ${regionalPriority.ageGroups.map((item) => getAgeGroupProfile(item).label).join(" → ")} 순서로 반영했습니다.`,
      `${recommendationModeLabel}으로 추천했습니다.`,
      regionalPriority.source === "supabase"
        ? `리서치 agent가 저장한 월간 트렌드 근거 ${regionalPriority.sourceCount}개와 우선순위를 함께 반영했습니다.`
        : `아직 월간 리서치 DB가 없어 ${regionProfile.label} 국가별 기본 seed를 우선 반영했습니다.`,
      premiumAddOnLabels.length
        ? `프리미엄 확장 상담: ${premiumAddOnLabels.join(", ")} 방향을 추천 사유에 함께 반영했습니다.`
        : "",
      payload.summary ||
        "Choose a look, preview it on your face, and bring a clearer reference to your stylist.",
      "추천은 안정적으로 잘 어울릴 7개와, 첫인상은 낯설 수 있지만 어울릴 가능성이 있는 도전형 2개로 구성했습니다.",
      "마음에 드는 디자인을 누르면 크게 확인하고, 버튼을 눌러 상담용 9장을 생성할 수 있습니다.",
    ].filter(Boolean),
    currentHairLength,
    recommendations,
  };
}

async function analyzeDemographicSignals({
  ageGroup,
  audience,
  frontUrl,
  openai,
  photoContextBrief,
  region,
  sideUrls,
}: {
  ageGroup: MirilookAgeGroup;
  audience: MirilookAudience;
  frontUrl: string;
  openai: OpenAI;
  photoContextBrief: string;
  region: MirilookRegionId;
  sideUrls: string[];
}): Promise<DemographicSignalPayload> {
  const model =
    process.env.OPENAI_DEMOGRAPHIC_SIGNAL_MODEL ??
    process.env.OPENAI_RECOMMENDATION_MODEL ??
    "gpt-4.1-mini";
  const startedAt = Date.now();

  try {
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content:
            "You classify only non-sensitive hairstyle consultation signals. Do not infer nationality, ethnicity, identity, country, culture, or exact age from the photos. Return broad styling-cohort hints for trend-cache routing only.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: buildDemographicSignalPrompt(
                ageGroup,
                audience,
                region,
                photoContextBrief,
              ),
            },
            {
              type: "image_url",
              image_url: {
                detail: "low",
                url: frontUrl,
              },
            },
            ...sideUrls.map(
              (url) =>
                ({
                  type: "image_url",
                  image_url: {
                    detail: "low",
                    url,
                  },
                }) as const,
            ),
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "mirilook_demographic_signal",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: [
              "primaryAgeGroup",
              "backupAgeGroup",
              "currentHairLength",
              "confidence",
              "visibleImpression",
            ],
            properties: {
              primaryAgeGroup: {
                type: "string",
                enum: ["all", "teen", "20s", "30s", "40s", "50s", "60s", "70plus"],
                description:
                  "Broad trend-cache cohort only. Use all when uncertain.",
              },
              backupAgeGroup: {
                type: "string",
                enum: ["all", "teen", "20s", "30s", "40s", "50s", "60s", "70plus"],
                description:
                  "Adjacent or safer trend-cache cohort. Use all when uncertain.",
              },
              currentHairLength: {
                type: "string",
                enum: ["very_short", "short", "bob", "medium", "long", "unknown"],
              },
              confidence: {
                type: "number",
                minimum: 0,
                maximum: 1,
              },
              visibleImpression: {
                type: "string",
                description:
                  "Short non-sensitive styling impression such as youthful, neutral, mature, refined, casual, soft, sharp, or uncertain.",
              },
            },
          },
        },
      },
    });
    console.info("mirilook demographic signal llm duration", {
      ageGroup,
      audience,
      elapsedMs: Date.now() - startedAt,
      model,
      region,
      status: "ok",
    });
    logCost("text.demographic-signal", {
      model,
      usage: completion.usage,
    });

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      return getFallbackDemographicSignal(ageGroup);
    }

    return normalizeDemographicSignal(JSON.parse(content));
  } catch (error) {
    console.error("demographic signal analysis failed", error);
    console.info("mirilook demographic signal llm duration", {
      ageGroup,
      audience,
      elapsedMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
      model,
      region,
      status: "fallback",
    });

    return getFallbackDemographicSignal(ageGroup);
  }
}

function buildDemographicSignalPrompt(
  ageGroup: MirilookAgeGroup,
  audience: MirilookAudience,
  region: MirilookRegionId,
  photoContextBrief: string,
) {
  const regionProfile = getRegionProfile(region);
  const ageHint =
    ageGroup === "all"
      ? "No explicit age cohort was selected. Use a broad visible styling-cohort hint only when helpful."
      : `The selected internal age cohort is ${ageGroup}. Prefer it unless the photos strongly suggest using all as a safer cache.`;

  return `
Market region from Country button: ${regionProfile.englishLabel}.
Hard country boundary: this value comes only from the website Country button. Do not infer or adjust country, culture, or market from the photos.
Selected service mode: ${audience === "female" ? "women's" : "men's"} hairstyle.
${ageHint}

Reference orientation map:
${photoContextBrief}

Task:
- Pick primaryAgeGroup only for monthly trend-cache lookup, not as a customer-facing age claim.
- Do not identify exact age, nationality, ethnicity, country, culture, or gender identity.
- If the visual evidence is weak, set primaryAgeGroup to "all" and confidence below 0.45.
- Use backupAgeGroup as an adjacent safer cohort or "all".
- Also classify currentHairLength for salon feasibility.
- visibleImpression must be non-sensitive styling language only.
`;
}

function normalizeDemographicSignal(value: unknown): DemographicSignalPayload {
  const payload =
    value && typeof value === "object"
      ? (value as Partial<DemographicSignalPayload>)
      : {};
  const confidence = Number(payload.confidence);
  const visibleImpression =
    typeof payload.visibleImpression === "string"
      ? payload.visibleImpression.replace(/[<>]/g, "").trim().slice(0, 120)
      : "";

  return {
    backupAgeGroup: sanitizeSignalAgeGroup(payload.backupAgeGroup),
    confidence: Number.isFinite(confidence)
      ? Math.max(0, Math.min(1, confidence))
      : 0,
    currentHairLength: sanitizeHairLength(payload.currentHairLength),
    primaryAgeGroup: sanitizeSignalAgeGroup(payload.primaryAgeGroup),
    visibleImpression: visibleImpression || "uncertain",
  };
}

function getFallbackDemographicSignal(
  primaryAgeGroup: MirilookAgeGroup = defaultAgeGroup,
): DemographicSignalPayload {
  return {
    backupAgeGroup: "all",
    confidence: 0,
    currentHairLength: "unknown",
    primaryAgeGroup,
    visibleImpression: "uncertain",
  };
}

function sanitizeSignalAgeGroup(value: unknown): MirilookAgeGroup {
  return typeof value === "string" && isMirilookAgeGroup(value)
    ? value
    : defaultAgeGroup;
}

function buildAgeGroupCandidates(
  selectedAgeGroup: MirilookAgeGroup,
  signal: DemographicSignalPayload,
) {
  const candidates =
    selectedAgeGroup === "all"
      ? [signal.primaryAgeGroup, signal.backupAgeGroup, "all"]
      : [
          selectedAgeGroup,
          signal.primaryAgeGroup,
          signal.backupAgeGroup,
          "all",
        ];

  return Array.from(
    new Set(
      candidates.filter((item): item is MirilookAgeGroup =>
        typeof item === "string" && isMirilookAgeGroup(item),
      ),
    ),
  );
}

function formatConfidence(value: number) {
  return Number.isFinite(value) ? value.toFixed(2) : "0.00";
}

function buildRecommendationPrompt(
  referenceCount: number,
  ageGroup: MirilookAgeGroup,
  ageGroupCandidates: MirilookAgeGroup[],
  demographicSignal: DemographicSignalPayload,
  audience: MirilookAudience,
  region: MirilookRegionId,
  regionalPriorityStyleIds: string[],
  regionalPrioritySource: "supabase" | "fallback",
  regionalEvidenceBrief: string,
  recommendationMode: RecommendationModeId,
  premiumAddOns: PremiumAddOnId[],
  photoContextBrief: string,
  styleMemo = "",
) {
  const audienceLabel = audience === "female" ? "women's" : "men's";
  const regionProfile = getRegionProfile(region);
  const ageProfile = getAgeGroupProfile(ageGroup);
  const audienceSpecificGuidance =
    audience === "female"
      ? [
          "- Women's salon specifics: evaluate current and desired length, layers, bangs/fringe, face-framing pieces, curl size, hair ends, shine, personal-color harmony, makeup tone, outfit mood, and maintenance difficulty.",
          "- Do not default to men's short styles. Only choose pixie or short cuts when they are in the women's catalog and are realistic for the customer's visible style.",
          "- Avoid changing facial fullness or making the face look slimmer/heavier in the reasoning; preserve the person's natural facial impression.",
        ].join("\n")
      : [
          "- Men's grooming specifics: evaluate forehead exposure, side volume, parting, fringe, taper/down-perm need, crown lift, nape, hairline, personal color, outfit mood, and daily styling difficulty.",
          "- Explain when a style needs down perm, regular trims, or grow-out before it becomes realistic.",
        ].join("\n");
  const catalog = getStylesByAudience(audience)
    .map(
      (style) =>
        `- ${style.id}: ${style.name}. Good for: ${style.reason}. Hair prompt: ${style.prompt}`,
    )
    .join("\n");
  const modeInstruction = buildModeInstruction(recommendationMode);
  const premiumInstruction = buildPremiumInstruction(premiumAddOns, audience);

  return `
Analyze the uploaded reference photos together. Use the orientation map below instead of assuming every first image is a true front photo.

Reference orientation map:
${photoContextBrief}

Reference image count: ${referenceCount}.
Service mode: ${audienceLabel} hairstyle recommendation.
Market region: ${regionProfile.englishLabel}.
Internal demographic research reference: ${ageProfile.englishLabel}. ${ageProfile.prompt}
Photo-derived demographic cache order: ${ageGroupCandidates.join(" -> ")}.
Photo-derived visible styling signal: ${demographicSignal.visibleImpression || "uncertain"} (confidence ${formatConfidence(demographicSignal.confidence)}). This is not exact age identification.
Regional trend priority source: ${regionalPrioritySource}.
Regional priority style ids: ${regionalPriorityStyleIds.join(", ") || "none"}.
Regional research evidence brief:
${regionalEvidenceBrief || "No research evidence available."}
Recommendation basis:
${modeInstruction}
Premium add-on requirements:
${premiumInstruction}
Customer request memo: ${styleMemo.trim() || "No additional memo."}

Before choosing hairstyles, assess only visible evidence from the photos:
- Customer presentation: preserve the visible gender expression, makeup/no-makeup tone, clothing mood, and overall personal style. Stay inside the selected ${audienceLabel} service catalog unless the photos clearly conflict with that mode.
- Country routing: use the Country button value as the only market region (${regionProfile.englishLabel}). Do not infer nationality, ethnicity, culture, or country from the customer's face, background, signage, language, or the customer's memo text. The memo describes desired styling only and must never change the market region.
- Country boundary: use only ${regionProfile.englishLabel} trend evidence and priority ids. Do not borrow trend assumptions from Korea, Japan, China, America, Europe, or any other market unless that exact market is the selected Country button value.
- Demographic routing: use only broad visible styling context for age-cohort fit (teen, 20s, 30s, 40s, 50s, 60s, 70+) and gender presentation. Do not state exact age or gender identity. If uncertain, rely on the all-cohort cache and selected service mode.
- Visible impression calibration: do not guess or state a numeric age. Instead, describe whether the styling impression appears youthful, neutral, mature, soft, sharp, refined, casual, or formal. Prioritize the visible impression and face/head fit over rigid age-cohort trends.
- Regional priority: ${regionProfile.prompt}
- Research agent brief: ${regionProfile.researchBrief}
- Research evidence rule: use regional web, Instagram, YouTube, salon-menu, and influencer evidence only as a tie-breaker after visible fit, selected customer preferences, current hair feasibility, and salon realism.
- Photo reliability: front/side quality, lighting, forehead/ear/crown visibility. If uncertain, say it is photo-based estimation.
- Face balance: face length/width, cheekbone width, jaw angle, chin shape, forehead exposure.
- Head shape: side volume, crown flatness, back-head volume, nape line, temple and ear area.
- Hair texture estimate: straight/wavy/curly, density, thickness, root lift, side-hair stiffness.
- Current length feasibility: fringe, top, side, nape, and whether each candidate is possible now.
- Salon process: cut only, styling only, perm, down perm, color, bleach, or grow-out needed.
${audienceSpecificGuidance}

Current hair length classification rule:
- Return currentHairLength as "very_short" only for buzz/pixie-like very short hair.
- Return "short" for short hair above the jaw/ear or clearly short men's grooming lengths.
- Return "bob" for jaw, chin, neck, or upper-shoulder bob hair. If the ends sit around the neck or just above the shoulder, this is bob, not medium.
- Return "medium" only when the hair clearly passes the shoulder/collarbone but is not chest-length.
- Return "long" only when the hair clearly extends below the collarbone/chest area.
- In current-length salon consultation mode, never choose a style longer than currentHairLength. Same length or shorter is allowed; longer styles require extensions/grow-out and belong to face-fit exploration mode.

Recommendation algorithm:
1. Summarize the customer's visible face impression and head/hair constraints from the photos without guessing sensitive traits.
2. Compare that visible fit with the monthly research cache for the selected region and the 14 demographic buckets: 7 age cohorts (teen, 20s, 30s, 40s, 50s, 60s, 70+) x 2 service modes (men/women). Use this cache order first: ${ageGroupCandidates.join(" -> ")}.
2-0. The selected region is locked to ${regionProfile.englishLabel}; photos may not change the country and non-${regionProfile.englishLabel} trend evidence is out of scope.
2-1. Do not ask for or infer exact age. If the person visually presents youthful, mature, refined, casual, soft, or sharp, calibrate the style to that visible impression rather than forcing a rigid age-cohort trend.
3. Pick exactly 7 "core" hairstyles that are highly likely to suit the customer's face/head shape, age-group context, selected recommendation basis, and salon realism.
4. Pick exactly 2 "challenge" hairstyles that may feel bold or unfamiliar at first but still have a defensible fit for the customer's face/head shape and trend context.
5. The final 9 must be diverse. Do not fill all recommendations with the same parting, same length, same fringe shape, or same silhouette.

Pick exactly 9 unique hairstyles from this ${audienceLabel} catalog. Do not always choose the first nine. Choose based on visible face shape, head shape, current hair volume, side silhouette, forehead exposure, visual impression, internal demographic trend evidence, and whether the result is realistic for a first salon pilot test.
Reflect the customer request memo when it is compatible with the face/head references, but do not choose styles that look unrealistic or technically misleading for a salon consultation.
If the recommendation basis is current-length, avoid hairstyles that cannot be achieved from the visible current length within one salon visit. If the basis is face-fit, you may recommend grow-out or transition styles when they clearly suit the face, but the Korean reason must state the required transition.
When several hairstyles fit equally well, prioritize styles supported by the monthly regional demographic research evidence and priority ids. If regional evidence conflicts with the customer's visible suitability, explain the safer alternative in Korean rather than forcing the trend.

For each pick:
- Use only an id from the catalog.
- Set bucket to "core" for the 7 high-fit styles and "challenge" for the 2 bold-but-suitable styles.
- Write reason as a concise Korean fit reason customized to this customer's photos. Focus on why it suits the face/head shape and what it does to the silhouette.
- Write salonProcess as a separate Korean salon action note: cut, trim, perm, down perm, color, bleach, styling, or grow-out needed.
- Write maintenanceAdvice as a separate Korean maintenance/caution note: daily styling, touch-up cycle, side volume, damage, or grow-out risk.
- If outfit coordination is selected, write outfitAdvice as one compact Korean styling cue: tops, bottoms, outerwear, accessory, color mood, or occasion. Otherwise set outfitAdvice to "".
- If makeup style is selected for a female customer, write makeupAdvice as one compact Korean beauty cue: base finish, lip tone, brow/eye balance, and overall mood. Otherwise set makeupAdvice to "".
- Add 2 or 3 short Korean tags.
- Use tags for concrete salon cues such as "다운펌", "볼륨", "기장 필요", "관리 쉬움", "염색".
- Avoid duplicate style ids.
- Include exactly 7 core styles and exactly 2 challenge styles.
- Do not recommend styles that require impossible length, hide important face-balance issues, or mislead the stylist.

Catalog:
${catalog}
`;
}

function buildPhotoContextBrief(
  photoContext: RecommendationPhotoContext,
  {
    hasExtraLeft,
    hasExtraRight,
  }: {
    hasExtraLeft: boolean;
    hasExtraRight: boolean;
  },
) {
  const primary = photoContext.primaryReferenceSlot ?? "front";
  const secondary = photoContext.secondaryReferenceSlot ?? "side";
  const lines = [
    `- Image 1: primary identity reference from the ${getPhotoSlotLabel(primary)} upload slot.`,
    `- Image 2: secondary head-shape reference from the ${getPhotoSlotLabel(secondary)} upload slot.`,
  ];
  let imageNumber = 3;

  if (hasExtraLeft) {
    lines.push(
      `- Image ${imageNumber}: additional left-side reference from the ${getPhotoSlotLabel("left")} upload slot.`,
    );
    imageNumber += 1;
  }

  if (hasExtraRight) {
    lines.push(
      `- Image ${imageNumber}: additional right-side reference from the ${getPhotoSlotLabel("right")} upload slot.`,
    );
  }

  if (photoContext.hasActualFront === false) {
    lines.push(
      "- Important: the customer did not upload a true front photo. Do not treat Image 1 as a true front angle. Use it as identity/face-shape evidence only, and mention photo-angle uncertainty in Korean if relevant.",
    );
  } else {
    lines.push(
      "- A true front reference is available or inferred from the front upload slot. Use it for face balance and fringe/forehead judgment.",
    );
  }

  const uploadedSlots = (photoContext.uploadedSlots ?? [])
    .map(getPhotoSlotLabel)
    .join(", ");

  if (uploadedSlots) {
    lines.push(`- Uploaded slots received from the client: ${uploadedSlots}.`);
  }

  return lines.join("\n");
}

function getPhotoSlotLabel(slot: RecommendationPhotoSlot) {
  switch (slot) {
    case "front":
      return "front-facing";
    case "left":
      return "left-side";
    case "right":
      return "right-side";
    default:
      return "side";
  }
}

function buildModeInstruction(recommendationMode: RecommendationModeId) {
  if (recommendationMode === "face-fit") {
    return [
      "Face-fit exploration mode.",
      "This mode is mainly for personal curiosity and future planning outside an immediate salon constraint.",
      "The primary goal is to find hairstyles that harmonize with the customer's visible face shape, head shape, facial impression, and personal style even when the current hair length must change over time.",
      "Current visible length is still evidence for feasibility notes, but it is not a hard constraint. If a style requires grow-out, perm, bleach, or a transition cut, state it clearly in Korean.",
      "Include more aspirational options when they are defensibly flattering, but never mislead the customer into thinking they are achievable in one salon visit.",
    ].join("\n");
  }

  return [
    "Current-length salon consultation mode.",
    "This mode is mainly for salon use, where the customer and stylist need practical options based on the hair currently visible in the uploaded photos.",
    "The primary goal is to recommend hairstyles that are realistically possible from the visible fringe, top, side, nape, and back length.",
    "Prioritize styles achievable today or in the near term through cut, trim, perm, down perm, root volume, color, or simple styling.",
    "Avoid recommending styles requiring substantial grow-out unless the customer explicitly selected that style; if included, the Korean reason must warn that grow-out is needed.",
  ].join("\n");
}

function buildPremiumInstruction(
  premiumAddOns: PremiumAddOnId[],
  audience: MirilookAudience,
) {
  const labels = getPremiumAddOnLabels(premiumAddOns, audience);

  if (!labels.length) {
    return "No premium add-on selected. Focus on hairstyle suitability only.";
  }

  const instructions = [
    `Selected premium add-ons: ${labels.join(", ")}.`,
    premiumAddOns.includes("outfit-coordination")
      ? "For outfit coordination, add a compact Korean styling cue to each reason: tops, bottoms, outerwear, accessory, color mood, or occasion that pairs with the hairstyle."
      : "",
    premiumAddOns.includes("makeup-style") && audience === "female"
      ? "For makeup style, add a compact Korean beauty cue to each reason: base finish, lip tone, brow/eye balance, and overall mood that pairs with the hairstyle."
      : "",
    "Premium guidance is consultation copy, not a request to change facial identity. Keep it concise.",
  ].filter(Boolean);

  return instructions.join("\n");
}

function getPremiumAddOnLabels(
  premiumAddOns: PremiumAddOnId[],
  audience: MirilookAudience,
) {
  const labels: string[] = [];

  if (premiumAddOns.includes("outfit-coordination")) {
    labels.push("코디 추천");
  }

  if (premiumAddOns.includes("makeup-style") && audience === "female") {
    labels.push("메이크업 스타일");
  }

  return labels;
}

function normalizeRecommendations(
  picks: RecommendationPick[],
  audience: MirilookAudience,
  regionalPriorityStyleIds: MirilookStyle["id"][],
  currentHairLength: MirilookHairLength = "unknown",
  constrainToCurrentLength = false,
) {
  const fullCatalog = getStylesByAudience(audience);
  const filteredCatalog = filterStylesByCurrentHairLength(
    fullCatalog,
    currentHairLength,
    constrainToCurrentLength,
  );
  const catalog = filteredCatalog.length ? filteredCatalog : fullCatalog;
  const catalogMap = new Map(catalog.map((style) => [style.id, style]));
  const regionalFallback = regionalPriorityStyleIds
    .map((styleId) => catalogMap.get(styleId))
    .filter((style): style is MirilookStyle => Boolean(style));
  const selected: MirilookStyle[] = [];
  const seen = new Set<string>();

  const orderedPicks = [
    ...picks.filter((pick) => pick.bucket === "core"),
    ...picks.filter((pick) => pick.bucket === "challenge"),
    ...picks.filter(
      (pick) => pick.bucket !== "core" && pick.bucket !== "challenge",
    ),
  ];

  for (const pick of orderedPicks) {
    const style = catalogMap.get(pick.id);

    if (!style || seen.has(style.id)) {
      continue;
    }

    seen.add(style.id);
    selected.push({
      ...style,
      makeupAdvice: sanitizeAdvice(pick.makeupAdvice),
      maintenanceAdvice: sanitizeAdvice(pick.maintenanceAdvice),
      outfitAdvice: sanitizeAdvice(pick.outfitAdvice),
      recommendationBucket: pick.bucket,
      reason: sanitizeReason(pick.reason, style.reason),
      salonProcess: sanitizeAdvice(pick.salonProcess),
      tags: sanitizeTags(pick.tags, style.tags),
    });

    if (selected.length === 9) {
      break;
    }
  }

  for (const style of [...regionalFallback, ...catalog]) {
    if (selected.length === 9) {
      break;
    }

    if (!seen.has(style.id)) {
      selected.push(style);
      seen.add(style.id);
    }
  }

  if (selected.length) {
    return selected;
  }

  const fallback = filterStylesByCurrentHairLength(
    getFallbackStylesByAudience(audience),
    currentHairLength,
    constrainToCurrentLength,
  );

  return fallback.length ? fallback : getFallbackStylesByAudience(audience);
}

// Phrases implying the customer's actual face/body would change (slimming,
// face-narrowing, looking younger) contradict our identity-preservation
// policy, so fall back to the neutral catalog reason when they appear.
const identityViolatingReasonPattern =
  /얼굴이?\s*(작아|갸름|날씬|얇아|좁아|길어|짧아|커)|살이?\s*빠|슬림|동안|어려\s*보|young(?:er)?|slim(?:mer)?|thinner|narrower\s+face/i;

function sanitizeReason(value: string | undefined, fallback: string) {
  const trimmed = value?.trim();

  if (!trimmed || trimmed.length > 220) {
    return fallback;
  }

  if (identityViolatingReasonPattern.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}

function sanitizeAdvice(value: string | undefined) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return undefined;
  }

  return trimmed.slice(0, 180);
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
