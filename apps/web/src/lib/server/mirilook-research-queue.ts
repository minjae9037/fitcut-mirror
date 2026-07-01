import {
  getAllMonthlyResearchQueues,
  getMonthlyResearchQueue,
  getCurrentResearchMonth,
  type MonthlyResearchQueueItem,
} from "@/lib/mirilook-research-agent";
import type { MirilookRegionId } from "@/lib/mirilook-regions";
import { getSupabaseAdminClient } from "@/lib/server/supabase-admin";

type EnsureMonthlyResearchQueueOptions = {
  region?: MirilookRegionId;
  researchMonth?: string;
};

export async function ensureMonthlyResearchQueue({
  region,
  researchMonth = getCurrentResearchMonth(),
}: EnsureMonthlyResearchQueueOptions = {}) {
  const supabase = getSupabaseAdminClient();
  const queue = region
    ? getMonthlyResearchQueue(region, researchMonth)
    : getAllMonthlyResearchQueues(researchMonth);

  if (!supabase) {
    return {
      accepted: false,
      queuedCount: 0,
      reason: "supabase_not_configured",
      researchMonth,
    };
  }

  if (!queue.length) {
    return {
      accepted: true,
      queuedCount: 0,
      researchMonth,
    };
  }

  const sourceUrls = queue.map((item) => item.sourceUrl);
  const deleteExisting = await supabase
    .from("regional_trend_sources")
    .delete()
    .in("source_url", sourceUrls)
    .eq("status", "candidate");

  if (deleteExisting.error) {
    console.error("monthly research queue cleanup failed", deleteExisting.error);

    return {
      accepted: false,
      queuedCount: 0,
      reason: "queue_cleanup_failed",
      researchMonth,
    };
  }

  const insertResult = await supabase.from("regional_trend_sources").insert(
    queue.map((item) => buildQueueSourceRow(item)),
  );

  if (insertResult.error) {
    console.error("monthly research queue insert failed", insertResult.error);

    return {
      accepted: false,
      queuedCount: 0,
      reason: "queue_insert_failed",
      researchMonth,
    };
  }

  return {
    accepted: true,
    queuedCount: queue.length,
    researchMonth,
  };
}

function buildQueueSourceRow(item: MonthlyResearchQueueItem) {
  return {
    age_group: item.ageGroup,
    audience: item.audience,
    confidence: 0,
    metrics: {
      cache_key: item.cacheKey,
      queue_status: "pending_research",
      research_targets: item.plan.targets.length,
    },
    observed_style_ids: item.seedStyleIds,
    platform: "agent-queue",
    region_id: item.region,
    research_month: `${item.researchMonth}-01`,
    source_url: item.sourceUrl,
    status: "candidate",
    summary: [
      item.plan.cachePolicy,
      item.plan.sourceSummary,
      item.plan.rankingRule,
      `Targets: ${item.plan.targets
        .map((target) => `${target.label}=${target.query}`)
        .join(" | ")}`,
    ].join("\n"),
    target_persona: `${item.plan.title}. Pending verified source review.`,
    title: item.plan.title,
  };
}
