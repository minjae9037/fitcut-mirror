import type { MirilookAudience, MirilookStyleId } from "@/lib/mirilook-styles";

import {
  getFallbackStylesByAudience,
  getStylesByAudience,
  type MirilookStyle,
} from "@/lib/mirilook-styles";

export type MirilookRegionId = "korea" | "china" | "japan" | "america" | "europe";

export type MirilookRegionProfile = {
  id: MirilookRegionId;
  label: string;
  englishLabel: string;
  launchStage: "primary" | "planned";
  summary: string;
  researchBrief: string;
  prompt: string;
  priorityStyleIds: Record<MirilookAudience, MirilookStyleId[]>;
};

export const defaultRegion: MirilookRegionId = "korea";

export const MirilookRegions: MirilookRegionProfile[] = [
  {
    id: "korea",
    label: "한국",
    englishLabel: "Korea",
    launchStage: "primary",
    summary: "K-beauty, 미용실 상담, 자연스러운 실사화 기준",
    researchBrief:
      "Korea launch baseline. Use salon-actionable Korean copy and prioritize wearable K-beauty references for the first market.",
    prompt:
      "Primary market: Korea. Prioritize realistic Korean salon communication, K-beauty grooming, wearable daily styling, and references a Korean stylist can execute.",
    priorityStyleIds: {
      male: [
        "leaf-cut",
        "soft-parted",
        "shadow-perm",
        "comma-hair",
        "down-perm-two-block",
        "dandy-cut",
        "ivy-league",
        "crop-cut",
        "side-part-taper",
      ],
      female: [
        "long-layered-c-curl",
        "side-bang-layered",
        "medium-c-curl",
        "medium-s-curl",
        "butterfly-layered",
        "tassel-bob",
        "build-perm",
        "long-hush-cut",
        "short-bob",
      ],
    },
  },
  {
    id: "china",
    label: "중국",
    englishLabel: "China",
    launchStage: "planned",
    summary: "중화권 플랫폼 리서치 후 현지 트렌드 우선 반영",
    researchBrief:
      "Research queue: Douyin, Xiaohongshu, Weibo, local salon menus, influencer hair references, and city-tier differences.",
    prompt:
      "Future market: China. Treat regional trend priorities as provisional until the research agent validates them. Keep styling premium, polished, photogenic, and salon-realistic.",
    priorityStyleIds: {
      male: [
        "shadow-perm",
        "soft-parted",
        "comma-hair",
        "leaf-cut",
        "dandy-cut",
        "side-part-taper",
        "textured-fringe",
        "natural-wave",
        "slick-back-taper",
      ],
      female: [
        "butterfly-layered",
        "long-layered-c-curl",
        "elizabeth-perm",
        "sleek-long-straight",
        "side-bang-layered",
        "medium-s-curl",
        "hime-cut",
        "build-perm",
        "tassel-bob",
      ],
    },
  },
  {
    id: "japan",
    label: "일본",
    englishLabel: "Japan",
    launchStage: "planned",
    summary: "일본 살롱·SNS 리서치 후 질감과 레이어 기준 반영",
    researchBrief:
      "Research queue: Instagram Japan salons, YouTube haircut channels, Hot Pepper Beauty menus, and Tokyo/Osaka trend differences.",
    prompt:
      "Future market: Japan. Treat trend priorities as provisional until the research agent validates them. Emphasize texture, soft silhouette, subtle layers, and stylist-readable details.",
    priorityStyleIds: {
      male: [
        "textured-fringe",
        "short-mash",
        "natural-wave",
        "soft-wolf",
        "leaf-cut",
        "dandy-cut",
        "semi-crop",
        "curtain-perm",
        "side-part-taper",
      ],
      female: [
        "long-hush-cut",
        "wolf-hush-women",
        "medium-layered-bob",
        "hime-cut",
        "tassel-bob",
        "soft-pixie",
        "medium-c-curl",
        "side-bang-layered",
        "long-layered-c-curl",
      ],
    },
  },
  {
    id: "america",
    label: "미국",
    englishLabel: "America",
    launchStage: "planned",
    summary: "미국권 grooming·salon trend 리서치 후 현지화",
    researchBrief:
      "Research queue: Instagram/TikTok/YouTube barbers and salons, Pinterest boards, celebrity grooming, and city/lifestyle segmentation.",
    prompt:
      "Future market: America. Treat trend priorities as provisional until research validation. Favor clear lifestyle segmentation, barber/salon vocabulary, and photogenic but practical references.",
    priorityStyleIds: {
      male: [
        "crop-cut",
        "ivy-league",
        "short-quiff",
        "french-crop",
        "buzz-taper",
        "slick-back-taper",
        "side-part-taper",
        "textured-fringe",
        "soft-wolf",
      ],
      female: [
        "butterfly-layered",
        "sleek-long-straight",
        "medium-layered-bob",
        "long-layered-c-curl",
        "soft-pixie",
        "short-bob",
        "medium-s-curl",
        "tassel-bob",
        "long-hush-cut",
      ],
    },
  },
  {
    id: "europe",
    label: "유럽",
    englishLabel: "Europe",
    launchStage: "planned",
    summary: "국가별 차이가 커서 Europe cluster로 시작 후 세분화",
    researchBrief:
      "Research queue: UK/France/Italy/Germany salon feeds, fashion-week adjacent styling, street style, and low-maintenance premium cuts.",
    prompt:
      "Future market: Europe. Treat trend priorities as provisional until country-level research is complete. Emphasize understated premium styling, natural texture, and low-maintenance salon execution.",
    priorityStyleIds: {
      male: [
        "french-crop",
        "crop-cut",
        "slick-back-taper",
        "ivy-league",
        "natural-wave",
        "side-part-taper",
        "buzz-taper",
        "soft-wolf",
        "curtain-perm",
      ],
      female: [
        "sleek-long-straight",
        "long-layered-c-curl",
        "medium-layered-bob",
        "tassel-bob",
        "soft-pixie",
        "short-bob",
        "butterfly-layered",
        "medium-c-curl",
        "long-hush-cut",
      ],
    },
  },
];

export function sanitizeRegion(value: FormDataEntryValue | string | null) {
  if (typeof value !== "string") {
    return defaultRegion;
  }

  return isMirilookRegion(value) ? value : defaultRegion;
}

export function getRegionProfile(region: MirilookRegionId) {
  return (
    MirilookRegions.find((item) => item.id === region) ??
    MirilookRegions.find((item) => item.id === defaultRegion)!
  );
}

export function getRegionPriorityStyleIds(
  region: MirilookRegionId,
  audience: MirilookAudience,
) {
  return getRegionProfile(region).priorityStyleIds[audience];
}

export function getRegionSeedStylesByAudience(
  region: MirilookRegionId,
  audience: MirilookAudience,
  limit = 9,
): MirilookStyle[] {
  const catalogMap = new Map(
    getStylesByAudience(audience).map((style) => [style.id, style]),
  );
  const fallbackStyles = getFallbackStylesByAudience(audience);
  const regionalStyles = getRegionPriorityStyleIds(region, audience)
    .map((styleId) => catalogMap.get(styleId))
    .filter((style): style is MirilookStyle => Boolean(style));
  const merged: MirilookStyle[] = [];
  const seen = new Set<string>();

  for (const style of [...regionalStyles, ...fallbackStyles]) {
    if (seen.has(style.id)) {
      continue;
    }

    seen.add(style.id);
    merged.push(style);

    if (merged.length === limit) {
      break;
    }
  }

  return merged.length ? merged : fallbackStyles.slice(0, limit);
}

export function isMirilookRegion(value: string): value is MirilookRegionId {
  return MirilookRegions.some((item) => item.id === value);
}
