export type HairColorChoice = {
  chartColumn?: number;
  chartFamily?: string;
  chartLevel?: number;
  chartRow?: number;
  id: string;
  name: string;
  prompt: string;
  swatch: string;
};

export type HairColorChartColumn = {
  familyName: string;
  id: string;
  label: string;
  swatches: Record<number, string>;
  tone: string;
};

export type HairColorChartRow = {
  label: string;
  level: number;
  tone: string;
};

export const hairColorChartRows: HairColorChartRow[] = [
  { label: "13", level: 13, tone: "가장 밝음" },
  { label: "12", level: 12, tone: "밝음+" },
  { label: "11", level: 11, tone: "밝음" },
  { label: "10", level: 10, tone: "중간 밝음+" },
  { label: "9", level: 9, tone: "중간 밝음" },
  { label: "8", level: 8, tone: "중간+" },
  { label: "7", level: 7, tone: "중간" },
  { label: "6", level: 6, tone: "어두움+" },
  { label: "5", level: 5, tone: "어두움" },
  { label: "4", level: 4, tone: "매우 어두움" },
  { label: "3", level: 3, tone: "가장 어두움" },
];

export const hairColorChartColumns: HairColorChartColumn[] = [
  {
    familyName: "black hair color",
    id: "black",
    label: "블랙",
    swatches: {
      13: "#d5c7b0",
      12: "#bfad93",
      11: "#a1907a",
      10: "#877560",
      9: "#6f5c47",
      8: "#554033",
      7: "#3e2c22",
      6: "#2b221e",
      5: "#111827",
      4: "#16120f",
      3: "#161412",
    },
    tone: "#17120f",
  },
  {
    familyName: "neutral brown hair color",
    id: "brown",
    label: "브라운",
    swatches: {
      13: "#d7b78f",
      12: "#c8a177",
      11: "#b78961",
      10: "#a6764d",
      9: "#8e5f3c",
      8: "#73472d",
      7: "#5e3825",
      6: "#4a2b1d",
      5: "#3a241a",
      4: "#2b1a13",
      3: "#1d120d",
    },
    tone: "#5a3828",
  },
  {
    familyName: "dark chocolate brown hair color",
    id: "dark-choco",
    label: "다크/초코",
    swatches: {
      13: "#c99d7a",
      12: "#b98763",
      11: "#a46f4d",
      10: "#8f5939",
      9: "#76432a",
      8: "#663927",
      7: "#5a3828",
      6: "#4a2d21",
      5: "#3a241a",
      4: "#281710",
      3: "#190d09",
    },
    tone: "#3a241a",
  },
  {
    familyName: "ash gray hair color",
    id: "ash-gray",
    label: "애쉬/그레이",
    swatches: {
      13: "#d5d1c5",
      12: "#bab8ad",
      11: "#9b9a90",
      10: "#8c897d",
      9: "#7b776b",
      8: "#6f6d63",
      7: "#786f60",
      6: "#6f716b",
      5: "#6f716b",
      4: "#4a4b46",
      3: "#272923",
    },
    tone: "#7f7f77",
  },
  {
    familyName: "matte olive brown hair color",
    id: "matte-olive",
    label: "매트/올리브",
    swatches: {
      13: "#c8c49d",
      12: "#b1af81",
      11: "#999b67",
      10: "#858650",
      9: "#777750",
      8: "#706c46",
      7: "#6f6a43",
      6: "#6c6648",
      5: "#6c6648",
      4: "#4b482f",
      3: "#2a2a1a",
    },
    tone: "#6f6a43",
  },
  {
    familyName: "beige milk tea brown hair color",
    id: "beige-milk",
    label: "베이지/밀크티",
    swatches: {
      13: "#d8c9a2",
      12: "#cbb48a",
      11: "#b08b62",
      10: "#ad8864",
      9: "#9f7d5c",
      8: "#8d6847",
      7: "#74513a",
      6: "#61412d",
      5: "#4b3121",
      4: "#332116",
      3: "#1f140d",
    },
    tone: "#b08b62",
  },
  {
    familyName: "gold orange copper hair color",
    id: "gold-orange",
    label: "골드/오렌지",
    swatches: {
      13: "#c99a55",
      12: "#d48f4d",
      11: "#d17d42",
      10: "#c56d38",
      9: "#9d4f32",
      8: "#9f4b28",
      7: "#8b3b1f",
      6: "#6e2c17",
      5: "#552011",
      4: "#3a150b",
      3: "#220c06",
    },
    tone: "#c99a55",
  },
  {
    familyName: "red pink rose wine brown hair color",
    id: "red-pink",
    label: "레드/핑크",
    swatches: {
      13: "#d18b8f",
      12: "#c97580",
      11: "#b95c6e",
      10: "#a74d5c",
      9: "#8e504b",
      8: "#823f45",
      7: "#76323e",
      6: "#682b36",
      5: "#5b2630",
      4: "#421a23",
      3: "#260e14",
    },
    tone: "#9a4654",
  },
  {
    familyName: "violet lavender ash hair color",
    id: "violet",
    label: "바이올렛",
    swatches: {
      13: "#d5c9dc",
      12: "#bbaac8",
      11: "#8d8197",
      10: "#877494",
      9: "#776183",
      8: "#684e75",
      7: "#563b63",
      6: "#4b3058",
      5: "#3e284a",
      4: "#2d1d36",
      3: "#1c1122",
    },
    tone: "#8d8197",
  },
];

const namedHairColorChoices: Record<string, Omit<HairColorChoice, "chartColumn" | "chartFamily" | "chartLevel" | "chartRow">> = {
  "ash-gray-11": {
    id: "ash-gray",
    name: "애쉬 그레이",
    prompt:
      "Use an ash gray hair color, cool smoky gray-brown, realistic and not silver-white.",
    swatch: "#9b9a90",
  },
  "ash-gray-7": {
    id: "ash-brown",
    name: "애쉬 브라운",
    prompt: "Use a muted ash brown hair color with cool salon tones.",
    swatch: "#786f60",
  },
  "ash-gray-5": {
    id: "smoky-ash",
    name: "스모키 애쉬",
    prompt:
      "Use a smoky ash hair color with a muted gray-brown salon tone, cool and refined.",
    swatch: "#6f716b",
  },
  "beige-milk-13": {
    id: "platinum-blond",
    name: "플래티넘 블론드",
    prompt:
      "Use a refined platinum blond hair color, salon-bleached but realistic.",
    swatch: "#d8c9a2",
  },
  "beige-milk-11": {
    id: "milk-tea",
    name: "밀크티 브라운",
    prompt: "Use a soft milk-tea beige brown hair color, warm and premium.",
    swatch: "#b08b62",
  },
  "beige-milk-9": {
    id: "beige-brown",
    name: "베이지 브라운",
    prompt:
      "Use a beige brown hair color with a soft neutral salon tone and natural shine.",
    swatch: "#9f7d5c",
  },
  "black-5": {
    id: "blue-black",
    name: "블루 블랙",
    prompt: "Use a blue-black hair color with a restrained cool blue sheen.",
    swatch: "#111827",
  },
  "black-3": {
    id: "natural-black",
    name: "자연 흑발",
    prompt:
      "Keep a natural Korean black hair color with subtle realistic highlights.",
    swatch: "#161412",
  },
  "dark-choco-7": {
    id: "choco-brown",
    name: "초코 브라운",
    prompt: "Use a warm chocolate brown hair color with soft shine.",
    swatch: "#5a3828",
  },
  "dark-choco-5": {
    id: "dark-brown",
    name: "다크 브라운",
    prompt: "Use a deep dark brown hair color, natural and salon-polished.",
    swatch: "#3a241a",
  },
  "gold-orange-13": {
    id: "honey-blond",
    name: "허니 블론드",
    prompt:
      "Use a honey blond hair color with warm golden beige shine, salon-bleached but natural.",
    swatch: "#c99a55",
  },
  "gold-orange-9": {
    id: "copper-brown",
    name: "카퍼 브라운",
    prompt: "Use a tasteful copper brown hair color with warm red-brown notes.",
    swatch: "#9d4f32",
  },
  "matte-olive-7": {
    id: "khaki-brown",
    name: "카키 브라운",
    prompt: "Use a subtle khaki brown hair color with olive undertones.",
    swatch: "#6f6a43",
  },
  "matte-olive-5": {
    id: "olive-brown",
    name: "올리브 브라운",
    prompt:
      "Use an olive brown hair color with muted green-beige undertones, natural and stylish.",
    swatch: "#6c6648",
  },
  "red-pink-9": {
    id: "rose-brown",
    name: "로즈 브라운",
    prompt:
      "Use a rose brown hair color with subtle pink-brown warmth, tasteful and wearable.",
    swatch: "#8e504b",
  },
  "red-pink-5": {
    id: "wine-brown",
    name: "와인 브라운",
    prompt:
      "Use a deep wine brown hair color with restrained burgundy tones, elegant and realistic.",
    swatch: "#5b2630",
  },
  "violet-11": {
    id: "lavender-ash",
    name: "라벤더 애쉬",
    prompt:
      "Use a soft lavender ash hair color, cool muted violet-gray, salon-realistic and not fantasy bright.",
    swatch: "#8d8197",
  },
};

export const hairColorChoices: HairColorChoice[] = hairColorChartRows.flatMap(
  (row, rowIndex) =>
    hairColorChartColumns.map((column, columnIndex) => {
      const named = namedHairColorChoices[`${column.id}-${row.level}`];
      const base = named ?? {
        id: `${column.id}-${row.level}`,
        name: column.label,
        prompt: `Use a level ${row.level} ${column.familyName}, realistic salon color, wearable and natural on Korean hair.`,
        swatch: column.swatches[row.level],
      };

      return {
        ...base,
        chartColumn: columnIndex + 1,
        chartFamily: column.id,
        chartLevel: row.level,
        chartRow: rowIndex + 1,
      };
    }),
);

export function getHairColorById(id: string) {
  return hairColorChoices.find((color) => color.id === id);
}
