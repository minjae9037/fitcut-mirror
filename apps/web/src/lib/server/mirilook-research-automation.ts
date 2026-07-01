import OpenAI from "openai";
import {
  MirilookAgeGroups,
  type MirilookAgeGroup,
} from "@/lib/mirilook-demographics";
import {
  buildResearchCacheKey,
  getCurrentResearchMonth,
  getResearchAgentPlan,
} from "@/lib/mirilook-research-agent";
import {
  MirilookRegions,
  type MirilookRegionId,
} from "@/lib/mirilook-regions";
import {
  defaultAudience,
  getStylesByAudience,
  type MirilookAudience,
  type MirilookStyleId,
} from "@/lib/mirilook-styles";
import { ensureMonthlyResearchQueue } from "@/lib/server/mirilook-research-queue";
import { getSupabaseAdminClient } from "@/lib/server/supabase-admin";

type AutomatedResearchOptions = {
  audience?: MirilookAudience;
  limitPairs?: number;
  region?: MirilookRegionId;
  researchMonth?: string;
};

type ResearchCohortPayload = {
  ageGroup: MirilookAgeGroup;
  confidence: number;
  observedStyleIds: string[];
  priorities: Array<{
    bucket: "core" | "challenge";
    rationale: string;
    score: number;
    styleId: string;
  }>;
  sources: Array<{
    platform: string;
    title: string;
    url: string;
  }>;
  summary: string;
  targetPersona: string;
};

type ResearchAutomationPayload = {
  cohorts: ResearchCohortPayload[];
};

const automatedAgeGroups = MirilookAgeGroups.map((item) => item.id).filter(
  (ageGroup): ageGroup is Exclude<MirilookAgeGroup, "all"> =>
    ageGroup !== "all",
);

export async function runMonthlyResearchAutomation({
  audience,
  limitPairs = Number(process.env.MIRILOOK_RESEARCH_PAIR_LIMIT ?? 10),
  region,
  researchMonth = getCurrentResearchMonth(),
}: AutomatedResearchOptions = {}) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return {
      accepted: false,
      processedPairs: 0,
      reason: "supabase_not_configured",
      researchMonth,
    };
  }

  if (!process.env.OPENAI_API_KEY) {
    const queueResult = await ensureMonthlyResearchQueue({ region, researchMonth });

    return {
      ...queueResult,
      accepted: false,
      processedPairs: 0,
      reason: "openai_not_configured",
    };
  }

  const queueResult = await ensureMonthlyResearchQueue({ region, researchMonth });

  if (!queueResult.accepted) {
    return {
      ...queueResult,
      processedPairs: 0,
    };
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  const pairs = getResearchPairs(region, audience).slice(
    0,
    Math.max(1, Math.min(10, limitPairs)),
  );
  let sourceCount = 0;
  let priorityCount = 0;
  const failedPairs: string[] = [];

  for (const pair of pairs) {
    try {
      const result = await researchRegionAudiencePair({
        audience: pair.audience,
        openai,
        region: pair.region,
        researchMonth,
      });
      const saved = await saveAutomatedResearchResult({
        audience: pair.audience,
        payload: result,
        region: pair.region,
        researchMonth,
      });

      sourceCount += saved.sourceCount;
      priorityCount += saved.priorityCount;
    } catch (error) {
      console.error("automated research pair failed", {
        audience: pair.audience,
        error,
        region: pair.region,
      });
      failedPairs.push(`${pair.region}:${pair.audience}`);
    }
  }

  return {
    accepted: failedPairs.length < pairs.length,
    failedPairs,
    processedPairs: pairs.length - failedPairs.length,
    priorityCount,
    queuedCount: queueResult.queuedCount,
    researchMonth,
    sourceCount,
  };
}

function getResearchPairs(
  region?: MirilookRegionId,
  audience?: MirilookAudience,
) {
  const regions = region
    ? MirilookRegions.filter((item) => item.id === region)
    : MirilookRegions;
  const audiences: MirilookAudience[] = audience
    ? [audience]
    : [defaultAudience, "female"];

  return regions.flatMap((regionItem) =>
    audiences.map((audienceItem) => ({
      audience: audienceItem,
      region: regionItem.id,
    })),
  );
}

async function researchRegionAudiencePair({
  audience,
  openai,
  region,
  researchMonth,
}: {
  audience: MirilookAudience;
  openai: OpenAI;
  region: MirilookRegionId;
  researchMonth: string;
}) {
  const styles = getStylesByAudience(audience);
  const styleCatalog = styles
    .map((style) => `${style.id}: ${style.name} - ${style.reason}`)
    .join("\n");
  const plans = automatedAgeGroups
    .map((ageGroup) => {
      const plan = getResearchAgentPlan(region, audience, ageGroup);

      return [
        `${ageGroup}: ${plan.title}`,
        `Targets: ${plan.targets
          .map((target) => `${target.label}=${target.query}`)
          .join(" | ")}`,
      ].join("\n");
    })
    .join("\n\n");

  const response = await openai.responses.create({
    include: ["web_search_call.action.sources"],
    input: [
      "Research current monthly hairstyle trend evidence for Miri Look.",
      `Research month: ${researchMonth}.`,
      `Country/market boundary: ${region}. Use only this selected market. Do not mix Korea, Japan, China, America, or Europe evidence unless it is the selected market.`,
      `Audience: ${audience}.`,
      "Use web search for public web, Instagram/YouTube result pages, salon menu pages, and influencer references. Do not scrape private pages or fabricate source URLs.",
      "If evidence is weak for a cohort, say so in summary and keep confidence below 0.45.",
      "Return only style ids from this catalog:",
      styleCatalog,
      "Cohort research plans:",
      plans,
    ].join("\n\n"),
    instructions:
      "You are Miri Look's research agent. Produce structured, verifiable trend-cache data. Sources must be public URLs found during this response. Prioritize repeated cross-platform hairstyle evidence, salon feasibility, and demographic fit. Do not infer customer nationality from photos because this task has no customer photos.",
    max_output_tokens: 3800,
    model: process.env.OPENAI_RESEARCH_MODEL ?? "gpt-4.1-mini",
    store: false,
    temperature: 0.2,
    text: {
      format: {
        name: "mirilook_monthly_research",
        schema: buildResearchSchema(styles.map((style) => style.id)),
        strict: true,
        type: "json_schema",
      },
    },
    tool_choice: "auto",
    tools: [{ type: "web_search_preview" }],
  });
  const payload = JSON.parse(response.output_text) as ResearchAutomationPayload;

  return normalizeResearchPayload(payload, styles.map((style) => style.id));
}

function buildResearchSchema(styleIds: string[]) {
  return {
    additionalProperties: false,
    properties: {
      cohorts: {
        items: {
          additionalProperties: false,
          properties: {
            ageGroup: {
              enum: automatedAgeGroups,
              type: "string",
            },
            confidence: {
              maximum: 1,
              minimum: 0,
              type: "number",
            },
            observedStyleIds: {
              items: {
                enum: styleIds,
                type: "string",
              },
              maxItems: 12,
              type: "array",
            },
            priorities: {
              items: {
                additionalProperties: false,
                properties: {
                  bucket: {
                    enum: ["core", "challenge"],
                    type: "string",
                  },
                  rationale: {
                    type: "string",
                  },
                  score: {
                    maximum: 100,
                    minimum: 0,
                    type: "number",
                  },
                  styleId: {
                    enum: styleIds,
                    type: "string",
                  },
                },
                required: ["styleId", "bucket", "score", "rationale"],
                type: "object",
              },
              maxItems: 12,
              minItems: 5,
              type: "array",
            },
            sources: {
              items: {
                additionalProperties: false,
                properties: {
                  platform: {
                    type: "string",
                  },
                  title: {
                    type: "string",
                  },
                  url: {
                    type: "string",
                  },
                },
                required: ["platform", "title", "url"],
                type: "object",
              },
              maxItems: 6,
              type: "array",
            },
            summary: {
              type: "string",
            },
            targetPersona: {
              type: "string",
            },
          },
          required: [
            "ageGroup",
            "summary",
            "targetPersona",
            "confidence",
            "observedStyleIds",
            "priorities",
            "sources",
          ],
          type: "object",
        },
        maxItems: 7,
        minItems: 7,
        type: "array",
      },
    },
    required: ["cohorts"],
    type: "object",
  };
}

function normalizeResearchPayload(
  payload: ResearchAutomationPayload,
  allowedStyleIds: string[],
) {
  const allowed = new Set(allowedStyleIds);
  const byAgeGroup = new Map<MirilookAgeGroup, ResearchCohortPayload>();

  for (const cohort of Array.isArray(payload.cohorts) ? payload.cohorts : []) {
    if (!automatedAgeGroups.includes(cohort.ageGroup as never)) {
      continue;
    }

    const priorities = normalizePriorities(cohort.priorities, allowed);

    if (priorities.length < 5) {
      continue;
    }

    byAgeGroup.set(cohort.ageGroup, {
      ageGroup: cohort.ageGroup,
      confidence: clampNumber(cohort.confidence, 0, 1),
      observedStyleIds: normalizeStyleIds(cohort.observedStyleIds, allowed),
      priorities,
      sources: normalizeSources(cohort.sources),
      summary: sanitizeText(cohort.summary, 1200),
      targetPersona: sanitizeText(cohort.targetPersona, 260),
    });
  }

  return automatedAgeGroups
    .map((ageGroup) => byAgeGroup.get(ageGroup))
    .filter((cohort): cohort is ResearchCohortPayload => Boolean(cohort));
}

async function saveAutomatedResearchResult({
  audience,
  payload,
  region,
  researchMonth,
}: {
  audience: MirilookAudience;
  payload: ResearchCohortPayload[];
  region: MirilookRegionId;
  researchMonth: string;
}) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return {
      priorityCount: 0,
      sourceCount: 0,
    };
  }

  let sourceCount = 0;
  let priorityCount = 0;

  for (const cohort of payload) {
    const syntheticSourceUrl = `mirilook://research-agent/${buildResearchCacheKey(
      region,
      audience,
      cohort.ageGroup,
      researchMonth,
    )}`;

    await supabase
      .from("regional_trend_sources")
      .delete()
      .eq("source_url", syntheticSourceUrl);

    const sourceInsert = await supabase
      .from("regional_trend_sources")
      .insert({
        age_group: cohort.ageGroup,
        audience,
        confidence: cohort.confidence,
        metrics: {
          automated: true,
          generated_at: new Date().toISOString(),
          source_count: cohort.sources.length,
          sources: cohort.sources,
        },
        observed_style_ids: cohort.observedStyleIds.length
          ? cohort.observedStyleIds
          : cohort.priorities.map((item) => item.styleId),
        platform: "research-agent",
        region_id: region,
        research_month: `${researchMonth}-01`,
        source_url: syntheticSourceUrl,
        status: cohort.confidence >= 0.55 ? "active" : "verified",
        summary: cohort.summary,
        target_persona: cohort.targetPersona,
        title: `${region} ${audience} ${cohort.ageGroup} automated monthly research`,
      })
      .select("id")
      .single();

    if (sourceInsert.error) {
      console.error("automated research source insert failed", sourceInsert.error);
      continue;
    }

    sourceCount += 1;

    await supabase
      .from("regional_style_priorities")
      .update({
        status: "hidden",
        updated_at: new Date().toISOString(),
      })
      .eq("region_id", region)
      .eq("audience", audience)
      .eq("age_group", cohort.ageGroup)
      .eq("status", "active");

    const priorityRows = cohort.priorities.map((item, index) => ({
      age_group: cohort.ageGroup,
      audience,
      priority_rank: index + 1,
      rationale: item.rationale,
      recommendation_bucket: item.bucket,
      region_id: region,
      research_month: `${researchMonth}-01`,
      score: item.score,
      source_ids: [sourceInsert.data.id],
      status: "active",
      style_id: item.styleId,
      updated_at: new Date().toISOString(),
    }));
    const priorityUpsert = await supabase
      .from("regional_style_priorities")
      .upsert(priorityRows, {
        onConflict: "region_id,audience,age_group,style_id",
      });

    if (priorityUpsert.error) {
      console.error("automated research priority upsert failed", priorityUpsert.error);
      continue;
    }

    priorityCount += priorityRows.length;
  }

  return {
    priorityCount,
    sourceCount,
  };
}

function normalizePriorities(
  priorities: ResearchCohortPayload["priorities"],
  allowed: Set<string>,
) {
  const seen = new Set<string>();

  return (Array.isArray(priorities) ? priorities : [])
    .map((item, index) => ({
      bucket: item.bucket === "challenge" || index >= 7 ? "challenge" : "core",
      rationale: sanitizeText(item.rationale, 600),
      score: clampNumber(item.score, 0, 100),
      styleId: sanitizeText(item.styleId, 120),
    }))
    .filter((item) => {
      if (!item.styleId || !allowed.has(item.styleId) || seen.has(item.styleId)) {
        return false;
      }

      seen.add(item.styleId);
      return true;
    })
    .slice(0, 12) as ResearchCohortPayload["priorities"];
}

function normalizeStyleIds(values: unknown, allowed: Set<string>) {
  const seen = new Set<string>();

  return (Array.isArray(values) ? values : [])
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter((value) => {
      if (!allowed.has(value) || seen.has(value)) {
        return false;
      }

      seen.add(value);
      return true;
    })
    .slice(0, 12) as MirilookStyleId[];
}

function normalizeSources(values: unknown) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((source) => {
      if (!source || typeof source !== "object" || Array.isArray(source)) {
        return null;
      }

      const record = source as Record<string, unknown>;

      return {
        platform: sanitizeText(record.platform, 40),
        title: sanitizeText(record.title, 160),
        url: sanitizePublicUrl(record.url),
      };
    })
    .filter(
      (source): source is { platform: string; title: string; url: string } =>
        Boolean(source?.platform && source.title && source.url),
    )
    .slice(0, 6);
}

function sanitizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/[<>]/g, "").trim().slice(0, maxLength);
}

function sanitizePublicUrl(value: unknown) {
  const text = sanitizeText(value, 500);

  if (!text) {
    return "";
  }

  try {
    const url = new URL(text);

    return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
  } catch {
    return "";
  }
}

function clampNumber(value: unknown, min: number, max: number) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return min;
  }

  return Math.max(min, Math.min(max, parsed));
}
