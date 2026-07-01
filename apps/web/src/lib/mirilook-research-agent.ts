import {
  defaultAgeGroup,
  getAgeGroupProfile,
  MirilookAgeGroups,
  researchScoringCriteria,
  type MirilookAgeGroup,
} from "@/lib/mirilook-demographics";
import {
  getRegionPriorityStyleIds,
  getRegionProfile,
  MirilookRegions,
  type MirilookRegionId,
} from "@/lib/mirilook-regions";
import {
  defaultAudience,
  getStylesByAudience,
  type MirilookAudience,
  type MirilookStyleId,
} from "@/lib/mirilook-styles";

type ResearchPlatform =
  | "web"
  | "instagram"
  | "youtube"
  | "salon-menu"
  | "influencer";

type ResearchTarget = {
  platform: ResearchPlatform;
  label: string;
  query: string;
};

export type ResearchAgentPlan = {
  ageGroup: MirilookAgeGroup;
  audience: MirilookAudience;
  region: MirilookRegionId;
  title: string;
  cachePolicy: string;
  sourceSummary: string;
  rankingRule: string;
  scoringCriteria: string[];
  targets: ResearchTarget[];
};

export type MonthlyResearchQueueItem = {
  ageGroup: Exclude<MirilookAgeGroup, "all">;
  audience: MirilookAudience;
  cacheKey: string;
  plan: ResearchAgentPlan;
  region: MirilookRegionId;
  researchMonth: string;
  seedStyleIds: MirilookStyleId[];
  sourceUrl: string;
};

export const MirilookResearchQueueTaskId = "mirilook-monthly-research-queue";

const researchAudienceOrder: MirilookAudience[] = [defaultAudience, "female"];
const researchAgeGroupOrder = MirilookAgeGroups.filter(
  (item): item is (typeof MirilookAgeGroups)[number] & {
    id: Exclude<MirilookAgeGroup, "all">;
  } => item.id !== "all",
);

const regionKeywords: Record<MirilookRegionId, string[]> = {
  korea: ["한국", "서울", "K-beauty", "Korean salon"],
  china: ["China", "Douyin", "Xiaohongshu", "Chinese salon"],
  japan: ["Japan", "Tokyo", "Osaka", "Japanese salon"],
  america: ["US", "New York", "LA", "barber", "salon"],
  europe: ["Europe", "London", "Paris", "Milan", "Berlin"],
};

const audienceKeywords: Record<MirilookAudience, string[]> = {
  male: ["men haircut", "men hairstyle", "barber", "grooming"],
  female: ["women haircut", "women hairstyle", "layers", "perm", "hair color"],
};

const ageKeywords: Record<MirilookAgeGroup, string[]> = {
  all: ["all ages", "multi age", "세대별"],
  teen: ["teen", "student", "10대"],
  "20s": ["20s", "20대", "dating", "profile photo"],
  "30s": ["30s", "30대", "professional", "office"],
  "40s": ["40s", "40대", "volume", "refined"],
  "50s": ["50s", "50대", "volume", "anti-aging"],
  "60s": ["60s", "60대", "gray hair", "easy care"],
  "70plus": ["70s", "70대", "senior", "easy care"],
};

export function getResearchAgentPlan(
  region: MirilookRegionId,
  audience: MirilookAudience,
  ageGroup: MirilookAgeGroup = defaultAgeGroup,
): ResearchAgentPlan {
  const profile = getRegionProfile(region);
  const ageProfile = getAgeGroupProfile(ageGroup);
  const regionQuery = regionKeywords[region].join(" ");
  const audienceQuery = audienceKeywords[audience].join(" ");
  const ageQuery = ageKeywords[ageGroup].join(" ");
  const audienceLabel = audience === "female" ? "women" : "men";

  return {
    ageGroup,
    audience,
    region,
    title: `${profile.englishLabel} ${ageProfile.englishLabel} ${audienceLabel} hairstyle trend research`,
    cachePolicy:
      "Refresh once every month. Keep the latest monthly cache by country/region, audience, and age group. Each country should maintain 14 demographic buckets: 7 age cohorts x 2 service modes. Use the cached trend evidence during customer recommendations until the next verified research cycle replaces it.",
    sourceSummary:
      "Compare repeat appearances across search results, Instagram salon feeds, YouTube creator/barber videos, local salon menus, influencer references, and cross-platform shareability. Store only sources with visible hairstyle evidence and a clear region/audience/age fit.",
    rankingRule:
      "Use trend evidence as a tie-breaker after face/head-shape fit, customer preference, current hair feasibility, and salon realism. Recommend 7 high-fit styles plus 2 challenge styles that may feel bold at first but still suit the customer.",
    scoringCriteria: researchScoringCriteria,
    targets: [
      {
        platform: "web",
        label: "Web search",
        query: `${regionQuery} ${audienceQuery} ${ageQuery} monthly hairstyle trend salon`,
      },
      {
        platform: "instagram",
        label: "Instagram salon feeds",
        query: `${profile.englishLabel} ${ageProfile.englishLabel} ${audienceLabel} salon hair trend Instagram`,
      },
      {
        platform: "youtube",
        label: "YouTube videos",
        query: `${profile.englishLabel} ${ageProfile.englishLabel} ${audienceLabel} haircut trend YouTube`,
      },
      {
        platform: "salon-menu",
        label: "Local salon menus",
        query: `${profile.englishLabel} salon menu ${ageProfile.englishLabel} ${audienceLabel} haircut`,
      },
      {
        platform: "influencer",
        label: "Influencer references",
        query: `${profile.englishLabel} ${ageProfile.englishLabel} ${audienceLabel} influencer hairstyle reference`,
      },
    ],
  };
}

export function buildResearchAgentBrief(
  region: MirilookRegionId,
  audience: MirilookAudience,
  ageGroup: MirilookAgeGroup = defaultAgeGroup,
  styleIds: MirilookStyleId[] = [],
) {
  const plan = getResearchAgentPlan(region, audience, ageGroup);
  const ageProfile = getAgeGroupProfile(ageGroup);
  const styleMap = new Map(
    getStylesByAudience(audience).map((style) => [style.id, style.name]),
  );
  const styleNames = styleIds
    .map((styleId) => styleMap.get(styleId))
    .filter(Boolean)
    .slice(0, 9);
  const targetLines = plan.targets
    .map((target) => `${target.label}: ${target.query}`)
    .join(" | ");

  return [
    `Customer demographic cache: ${ageProfile.englishLabel}. ${ageProfile.prompt}`,
    plan.cachePolicy,
    "Country routing rule: use the selected Country button as the market region; never infer nationality, ethnicity, or country from a face photo.",
    plan.sourceSummary,
    plan.rankingRule,
    `Scoring criteria: ${plan.scoringCriteria.join(" / ")}.`,
    styleNames.length
      ? `Fallback trend seed: ${styleNames.join(", ")}.`
      : "Fallback trend seed: none.",
    `Research channels: ${targetLines}.`,
  ].join("\n");
}

export function getMonthlyResearchQueue(
  region: MirilookRegionId,
  researchMonth = getCurrentResearchMonth(),
): MonthlyResearchQueueItem[] {
  return researchAgeGroupOrder.flatMap((ageGroup) =>
    researchAudienceOrder.map((audience) => {
      const plan = getResearchAgentPlan(region, audience, ageGroup.id);
      const cacheKey = buildResearchCacheKey(region, audience, ageGroup.id, researchMonth);

      return {
        ageGroup: ageGroup.id,
        audience,
        cacheKey,
        plan,
        region,
        researchMonth,
        seedStyleIds: getRegionPriorityStyleIds(region, audience).slice(0, 9),
        sourceUrl: `mirilook://research-queue/${cacheKey}`,
      };
    }),
  );
}

export function getAllMonthlyResearchQueues(
  researchMonth = getCurrentResearchMonth(),
) {
  return MirilookRegions.flatMap((region) =>
    getMonthlyResearchQueue(region.id, researchMonth),
  );
}

export function buildResearchCacheKey(
  region: MirilookRegionId,
  audience: MirilookAudience,
  ageGroup: MirilookAgeGroup,
  researchMonth = getCurrentResearchMonth(),
) {
  return `${researchMonth}/${region}/${audience}/${ageGroup}`;
}

export function getCurrentResearchMonth(date = new Date()) {
  return date.toISOString().slice(0, 7);
}
