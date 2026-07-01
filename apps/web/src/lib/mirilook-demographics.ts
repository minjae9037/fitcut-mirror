export type MirilookAgeGroup =
  | "all"
  | "teen"
  | "20s"
  | "30s"
  | "40s"
  | "50s"
  | "60s"
  | "70plus";

export type MirilookAgeGroupProfile = {
  id: MirilookAgeGroup;
  label: string;
  englishLabel: string;
  prompt: string;
};

export const defaultAgeGroup: MirilookAgeGroup = "all";

export const MirilookAgeGroups: MirilookAgeGroupProfile[] = [
  {
    id: "all",
    label: "전체 연령",
    englishLabel: "All cohorts",
    prompt:
      "Internal all-cohort trend reference. Do not ask the customer for age. Calibrate recommendations from visible impression, face/head fit, desired styling direction, and age-cohort trend evidence only when it clearly improves fit.",
  },
  {
    id: "teen",
    label: "10대",
    englishLabel: "Teens",
    prompt:
      "Teen customer group. Favor school/workable, natural, low-damage styling, avoid overly mature or high-maintenance looks unless requested.",
  },
  {
    id: "20s",
    label: "20대",
    englishLabel: "20s",
    prompt:
      "20s trend reference group. Balance trend sensitivity, photogenic styling, dating/profile appeal, and realistic daily maintenance. Do not force this cohort if the customer's visible impression looks more mature or more youthful.",
  },
  {
    id: "30s",
    label: "30대",
    englishLabel: "30s",
    prompt:
      "30s trend reference group. Balance trend fit, professional polish, face-shape correction, and manageable salon upkeep. Do not force this cohort if the customer's visible impression looks more youthful or more mature.",
  },
  {
    id: "40s",
    label: "40대",
    englishLabel: "40s",
    prompt:
      "40s trend reference group. Prioritize refined impression, volume correction, clean silhouette, and styles that do not look forced or dated. If the photo impression is youthful, borrow lighter styling cues from younger cohorts without misrepresenting the customer's identity.",
  },
  {
    id: "50s",
    label: "50대",
    englishLabel: "50s",
    prompt:
      "50s trend reference group. Prioritize volume, hair-density realism, face-line softening, professional dignity, and maintenance practicality. If the photo impression is younger, keep the style refined but avoid unnecessarily aging the customer.",
  },
  {
    id: "60s",
    label: "60대",
    englishLabel: "60s",
    prompt:
      "60s trend reference group. Prioritize natural elegance, gray or color-management realism, volume support, comfort, and salon practicality. Let the visible impression and desired presentation override rigid age assumptions.",
  },
  {
    id: "70plus",
    label: "70대 이상",
    englishLabel: "70+",
    prompt:
      "70+ trend reference group. Prioritize comfort, dignity, easy care, realistic hair density, face-line softness, and low-risk salon execution. Let the visible impression and desired presentation override rigid age assumptions.",
  },
];

export function sanitizeAgeGroup(value: FormDataEntryValue | string | null) {
  if (typeof value !== "string") {
    return defaultAgeGroup;
  }

  return isMirilookAgeGroup(value) ? value : defaultAgeGroup;
}

export function getAgeGroupProfile(ageGroup: MirilookAgeGroup) {
  return (
    MirilookAgeGroups.find((item) => item.id === ageGroup) ??
    MirilookAgeGroups.find((item) => item.id === defaultAgeGroup)!
  );
}

export function isMirilookAgeGroup(value: string): value is MirilookAgeGroup {
  return MirilookAgeGroups.some((item) => item.id === value);
}

export const researchScoringCriteria = [
  "Search demand proxy: repeated appearance in search results, query suggestions, and article/video titles.",
  "Instagram signal: salon post frequency, reel reuse, saves/comments when visible, and stylist portfolio repetition.",
  "YouTube signal: recent views, comments, creator repetition, tutorial volume, and salon/barber education content.",
  "Shareability signal: Pinterest/blog/short-form reuse, before-after visibility, and screenshot-friendly reference quality.",
  "Algorithmic exposure proxy: repeated cross-platform appearance within the same month, not a single viral source.",
  "Salon feasibility: whether a local stylist can execute the cut, perm, color, or maintenance instructions realistically.",
  "Demographic fit: whether the style is commonly worn or requested by the selected age group without forcing a mismatch.",
];
