import {
  defaultAgeGroup,
  sanitizeAgeGroup,
} from "@/lib/mirilook-demographics";
import {
  MirilookRegions,
  getRegionProfile,
  sanitizeRegion,
} from "@/lib/mirilook-regions";
import {
  getMonthlyResearchQueue,
  getResearchAgentPlan,
} from "@/lib/mirilook-research-agent";
import {
  defaultAudience,
  getStylesByAudience,
  sanitizeAudience,
  type MirilookAudience,
} from "@/lib/mirilook-styles";
import { requireAdminRequest } from "@/lib/server/admin-auth";
import { runMonthlyResearchAutomation } from "@/lib/server/mirilook-research-automation";
import { ensureMonthlyResearchQueue } from "@/lib/server/mirilook-research-queue";
import { getSupabaseAdminClient } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";
export const maxDuration = 300;

type ResearchTrendPayload = {
  action?: "ensure_monthly_queue" | "run_monthly_research";
  ageGroup?: string;
  audience?: string;
  limitPairs?: number | string;
  priorities?: Array<{
    bucket?: string;
    rationale?: string;
    score?: number | string;
    styleId?: string;
  }>;
  regionId?: string;
  source?: {
    confidence?: number | string;
    metrics?: Record<string, unknown>;
    observedStyleIds?: string[];
    platform?: string;
    researchMonth?: string;
    status?: string;
    summary?: string;
    targetPersona?: string;
    title?: string;
    url?: string;
  };
};

export async function POST(request: Request) {
  const adminError = requireAdminRequest(request);

  if (adminError) {
    return adminError;
  }

  let payload: ResearchTrendPayload;

  try {
    payload = (await request.json()) as ResearchTrendPayload;
  } catch {
    return Response.json({ error: "Invalid research trend payload." }, { status: 400 });
  }

  const region = sanitizeRegion(payload.regionId ?? null);

  if (payload.action === "ensure_monthly_queue") {
    const result = await ensureMonthlyResearchQueue({
      region,
      researchMonth:
        typeof payload.source?.researchMonth === "string"
          ? payload.source.researchMonth.slice(0, 7)
          : undefined,
    });

    return Response.json(
      {
        ...result,
        region,
      },
      { status: result.accepted ? 200 : 500 },
    );
  }

  if (payload.action === "run_monthly_research") {
    const result = await runMonthlyResearchAutomation({
      audience:
        typeof payload.audience === "string"
          ? sanitizeAudience(payload.audience)
          : undefined,
      limitPairs: normalizeLimitPairs(payload.limitPairs),
      region,
      researchMonth:
        typeof payload.source?.researchMonth === "string"
          ? payload.source.researchMonth.slice(0, 7)
          : undefined,
    });

    return Response.json(
      {
        ...result,
        region,
      },
      { status: result.accepted ? 200 : 500 },
    );
  }

  const audience = sanitizeAudience(payload.audience ?? null);
  const ageGroup = sanitizeAgeGroup(payload.ageGroup ?? defaultAgeGroup);
  const priorities = normalizePriorities(payload.priorities, audience);

  if (!priorities.length) {
    return Response.json(
      { error: "At least one valid priority style is required." },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return Response.json({
      accepted: false,
      reason: "supabase_not_configured",
    });
  }

  const sourceInsert = await supabase
    .from("regional_trend_sources")
    .insert({
      audience,
      age_group: ageGroup,
      confidence: normalizeScore(payload.source?.confidence, 1),
      metrics: normalizeMetrics(payload.source?.metrics),
      observed_style_ids: priorities.map((item) => item.styleId),
      platform: sanitizeText(payload.source?.platform, 80) ?? "manual-research",
      region_id: region,
      research_month: normalizeResearchMonth(payload.source?.researchMonth),
      source_url: sanitizeUrl(payload.source?.url),
      status: sanitizeStatus(payload.source?.status, "candidate"),
      summary: sanitizeText(payload.source?.summary, 1200),
      target_persona: sanitizeText(payload.source?.targetPersona, 260),
      title: sanitizeText(payload.source?.title, 160),
    })
    .select("id")
    .single();

  if (sourceInsert.error) {
    console.error("regional trend source insert failed", sourceInsert.error);

    return Response.json(
      {
        accepted: false,
        reason: "source_insert_failed",
      },
      { status: 500 },
    );
  }

  const sourceId = sourceInsert.data?.id;
  const priorityRows = priorities.map((item, index) => ({
    age_group: ageGroup,
    audience,
    priority_rank: index + 1,
    rationale: item.rationale,
    recommendation_bucket: item.bucket,
    region_id: region,
    research_month: normalizeResearchMonth(payload.source?.researchMonth),
    score: item.score,
    source_ids: sourceId ? [sourceId] : [],
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
    console.error("regional style priority upsert failed", priorityUpsert.error);

    return Response.json(
      {
        accepted: false,
        reason: "priority_upsert_failed",
      },
      { status: 500 },
    );
  }

  return Response.json({
    accepted: true,
    ageGroup,
    audience,
    priorityCount: priorityRows.length,
    region,
    sourceId,
  });
}

export async function GET(request: Request) {
  const adminError = requireAdminRequest(request);

  if (adminError) {
    return adminError;
  }

  const url = new URL(request.url);
  const region = sanitizeRegion(url.searchParams.get("regionId"));
  const ageGroup = sanitizeAgeGroup(
    url.searchParams.get("ageGroup") ?? defaultAgeGroup,
  );
  const audience = sanitizeAudience(
    url.searchParams.get("audience") ?? defaultAudience,
  );
  const regionProfile = getRegionProfile(region);
  const researchPlan = getResearchAgentPlan(region, audience, ageGroup);

  return Response.json({
    selected: {
      ageGroup,
      audience,
      monthlyQueue: getMonthlyResearchQueue(region),
      priorityStyleIds: regionProfile.priorityStyleIds[audience],
      region,
      researchPlan,
    },
    regions: MirilookRegions.map((region) => ({
      id: region.id,
      label: region.label,
      launchStage: region.launchStage,
      researchBrief: region.researchBrief,
    })),
    usage:
      "POST regionId, audience, source, and priorities[] to update regional trend priority.",
  });
}

function normalizePriorities(
  priorities: ResearchTrendPayload["priorities"],
  audience: MirilookAudience,
) {
  const allowedStyleIds = new Set(
    getStylesByAudience(audience).map((style) => style.id),
  );
  const seen = new Set<string>();
  const normalized: Array<{
    bucket: "core" | "challenge";
    rationale: string | null;
    score: number | null;
    styleId: string;
  }> = [];

  for (const item of Array.isArray(priorities) ? priorities : []) {
    const priority = {
      bucket: sanitizeBucket(item.bucket, normalized.length),
      rationale: sanitizeText(item.rationale, 600),
      score: normalizeScore(item.score, 100),
      styleId: sanitizeText(item.styleId, 120),
    };

    if (
      !priority.styleId ||
      !allowedStyleIds.has(priority.styleId) ||
      seen.has(priority.styleId)
    ) {
      continue;
    }

    seen.add(priority.styleId);
    normalized.push({
      ...priority,
      styleId: priority.styleId,
    });

    if (normalized.length === 18) {
      break;
    }
  }

  return normalized;
}

function normalizeScore(value: unknown, max: number) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.max(0, Math.min(max, parsed));
}

function normalizeMetrics(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .map(([key, metric]) => [
        key.replace(/[^\w-]/g, "").slice(0, 40),
        typeof metric === "number" || typeof metric === "string"
          ? String(metric).replace(/[<>]/g, "").slice(0, 120)
          : "",
      ])
      .filter(([key, metric]) => key && metric),
  );
}

function normalizeResearchMonth(value: unknown) {
  if (typeof value !== "string") {
    return `${new Date().toISOString().slice(0, 7)}-01`;
  }

  const match = value.match(/^(\d{4})-(\d{2})(?:-\d{2})?$/);

  if (!match) {
    return `${new Date().toISOString().slice(0, 7)}-01`;
  }

  return `${match[1]}-${match[2]}-01`;
}

function normalizeLimitPairs(value: unknown) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 2;
  }

  return Math.max(1, Math.min(10, Math.round(parsed)));
}

function sanitizeBucket(value: unknown, index: number): "core" | "challenge" {
  return value === "challenge" || index >= 7 ? "challenge" : "core";
}

function sanitizeStatus(value: unknown, fallback: string) {
  const status = sanitizeText(value, 40);

  return status && ["candidate", "verified", "active"].includes(status)
    ? status
    : fallback;
}

function sanitizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.replace(/[<>]/g, "").trim();

  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function sanitizeUrl(value: unknown) {
  const text = sanitizeText(value, 500);

  if (!text) {
    return null;
  }

  try {
    const url = new URL(text);

    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}
