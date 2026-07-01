import {
  getRegionPriorityStyleIds,
  type MirilookRegionId,
} from "@/lib/mirilook-regions";
import { buildResearchAgentBrief } from "@/lib/mirilook-research-agent";
import {
  defaultAgeGroup,
  type MirilookAgeGroup,
} from "@/lib/mirilook-demographics";
import {
  getStylesByAudience,
  type MirilookAudience,
  type MirilookStyleId,
} from "@/lib/mirilook-styles";
import { getSupabaseAdminClient } from "@/lib/server/supabase-admin";

type RegionalPriorityRow = {
  age_group: string | null;
  recommendation_bucket: string | null;
  style_id: string | null;
};

type RegionalTrendSourceRow = {
  age_group: string | null;
  confidence: number | string | null;
  metrics: Record<string, unknown> | null;
  platform: string | null;
  research_month: string | null;
  summary: string | null;
  target_persona: string | null;
  title: string | null;
};

export type RegionPriorityResult = {
  ageGroups: MirilookAgeGroup[];
  evidenceBrief: string;
  source: "supabase" | "fallback";
  sourceCount: number;
  styleIds: MirilookStyleId[];
};

export async function loadRegionPriorityStyleIds(
  region: MirilookRegionId,
  audience: MirilookAudience,
  ageGroup: MirilookAgeGroup = defaultAgeGroup,
  backupAgeGroups: MirilookAgeGroup[] = [],
): Promise<RegionPriorityResult> {
  const ageGroups = getAgeGroupFilter(ageGroup, backupAgeGroups);
  const fallback = getRegionPriorityStyleIds(region, audience);
  const fallbackEvidenceBrief = buildResearchAgentBrief(
    region,
    audience,
    ageGroup,
    fallback,
  );
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return {
      ageGroups,
      evidenceBrief: fallbackEvidenceBrief,
      source: "fallback",
      sourceCount: 0,
      styleIds: fallback,
    };
  }

  const [priorityResult, sourceResult] = await Promise.all([
    supabase
      .from("regional_style_priorities")
      .select("style_id, age_group, recommendation_bucket")
      .eq("region_id", region)
      .eq("audience", audience)
      .in("age_group", ageGroups)
      .eq("status", "active")
      .order("priority_rank", { ascending: true })
      .limit(18),
    supabase
      .from("regional_trend_sources")
      .select("age_group, platform, title, summary, confidence, metrics, target_persona, research_month")
      .eq("region_id", region)
      .eq("audience", audience)
      .in("age_group", ageGroups)
      .in("status", ["verified", "active"])
      .order("research_month", { ascending: false })
      .order("researched_at", { ascending: false })
      .limit(6),
  ]);

  if (priorityResult.error) {
    console.error("regional style priority load failed", priorityResult.error);

    return {
      ageGroups,
      evidenceBrief: fallbackEvidenceBrief,
      source: "fallback",
      sourceCount: 0,
      styleIds: fallback,
    };
  }
  if (sourceResult.error) {
    console.error("regional trend source load failed", sourceResult.error);
  }

  const allowedStyleIds = new Set(
    getStylesByAudience(audience).map((style) => style.id),
  );
  const styleIds = prioritizeAgeRows(
    (priorityResult.data ?? []) as RegionalPriorityRow[],
    ageGroups,
  )
    .map((row) => row.style_id?.trim())
    .filter((styleId): styleId is string =>
      Boolean(styleId && allowedStyleIds.has(styleId)),
    )
    .filter((styleId, index, values) => values.indexOf(styleId) === index);
  const evidenceBrief = buildTrendEvidenceBrief(
    region,
    audience,
    ageGroup,
    ageGroups,
    styleIds.length ? styleIds : fallback,
    (sourceResult.data ?? []) as RegionalTrendSourceRow[],
  );

  return styleIds.length
    ? {
        ageGroups,
        evidenceBrief,
        source: "supabase",
        sourceCount: sourceResult.error ? 0 : (sourceResult.data ?? []).length,
        styleIds,
      }
    : {
        ageGroups,
        evidenceBrief: fallbackEvidenceBrief,
        source: "fallback",
        sourceCount: 0,
        styleIds: fallback,
      };
}

function buildTrendEvidenceBrief(
  region: MirilookRegionId,
  audience: MirilookAudience,
  ageGroup: MirilookAgeGroup,
  ageGroups: MirilookAgeGroup[],
  styleIds: MirilookStyleId[],
  sources: RegionalTrendSourceRow[],
) {
  if (!sources.length) {
    return buildResearchAgentBrief(region, audience, ageGroup, styleIds);
  }

  const sourceLines = sources
    .map((source, index) => {
      const platform = source.platform?.trim() || "unknown";
      const sourceAgeGroup = source.age_group?.trim() || "all";
      const title = source.title?.trim() || `source ${index + 1}`;
      const summary = source.summary?.replace(/\s+/g, " ").trim() || "";
      const targetPersona = source.target_persona?.replace(/\s+/g, " ").trim();
      const researchMonth = source.research_month
        ? ` ${source.research_month.slice(0, 7)}`
        : "";
      const parsedConfidence = Number(source.confidence);
      const confidence = Number.isFinite(parsedConfidence)
        ? ` confidence ${parsedConfidence.toFixed(2)}`
        : "";
      const metricBrief = formatMetrics(source.metrics);

      return `[${platform}${researchMonth} age=${sourceAgeGroup}] ${title}${confidence}: ${summary}${
        targetPersona ? ` Target: ${targetPersona}.` : ""
      }${metricBrief ? ` Metrics: ${metricBrief}.` : ""}`.slice(0, 520);
    })
    .join("\n");

  return [
    "Verified research agent evidence is available. Use these sources as regional trend tie-breakers after personal face/head suitability and customer preferences.",
    `Demographic cache lookup order: ${ageGroups.join(" -> ")}.`,
    sourceLines,
    `Priority style ids from verified research: ${styleIds.join(", ")}.`,
  ].join("\n");
}

function prioritizeAgeRows(
  rows: RegionalPriorityRow[],
  ageGroups: MirilookAgeGroup[],
) {
  const orderedRows: RegionalPriorityRow[] = [];

  for (const ageGroup of ageGroups) {
    orderedRows.push(
      ...rows.filter((row) =>
        ageGroup === "all"
          ? row.age_group === "all" || !row.age_group
          : row.age_group === ageGroup,
      ),
    );
  }

  return orderedRows;
}

function getAgeGroupFilter(
  ageGroup: MirilookAgeGroup,
  backupAgeGroups: MirilookAgeGroup[] = [],
) {
  const ordered =
    ageGroup === "all"
      ? [...backupAgeGroups, "all"]
      : [ageGroup, ...backupAgeGroups, "all"];

  return Array.from(new Set(ordered)) as MirilookAgeGroup[];
}

function formatMetrics(metrics: Record<string, unknown> | null) {
  if (!metrics) {
    return "";
  }

  return Object.entries(metrics)
    .map(([key, value]) => {
      if (value === null || value === undefined || value === "") {
        return "";
      }

      return `${key}=${String(value).slice(0, 40)}`;
    })
    .filter(Boolean)
    .slice(0, 6)
    .join(", ");
}
