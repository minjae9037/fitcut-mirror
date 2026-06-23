export type FitcutStyleId =
  | "leaf-cut"
  | "ivy-league"
  | "parted"
  | "crop-cut"
  | "dandy-cut"
  | "shadow-perm";

export type FitcutStyle = {
  id: FitcutStyleId;
  name: string;
  reason: string;
  tags: string[];
  prompt: string;
  accent: string;
  cropClass: string;
};

export const fitcutStyles: FitcutStyle[] = [
  {
    id: "leaf-cut",
    name: "리프컷",
    reason:
      "앞머리와 옆 라인이 자연스럽게 이어져 얼굴형을 부드럽게 보여주는 스타일입니다.",
    tags: ["중간 기장", "가르마", "부드러운 인상"],
    prompt:
      "Apply a modern Korean men's leaf cut. Medium length, soft natural fringe, subtle side volume, refined salon finish.",
    accent: "from-[#f3d28a]/26",
    cropClass: "scale-110 -translate-y-2",
  },
  {
    id: "ivy-league",
    name: "아이비리그컷",
    reason:
      "짧고 단정해서 면접, 프로필 촬영, 직장인 이미지에 안정적으로 어울립니다.",
    tags: ["짧은 기장", "깔끔함", "관리 쉬움"],
    prompt:
      "Apply a neat modern Ivy League haircut for men. Short clean sides, tidy top, professional and polished.",
    accent: "from-[#a7dcc5]/24",
    cropClass: "scale-125 -translate-y-5",
  },
  {
    id: "parted",
    name: "가르마 스타일",
    reason:
      "볼륨을 살리면서도 과하지 않아 일상과 미용실 상담 모두에 쓰기 좋습니다.",
    tags: ["6:4", "볼륨", "데일리"],
    prompt:
      "Apply a Korean 6:4 parted hairstyle. Natural volume at the front, clean side shape, everyday salon styling.",
    accent: "from-[#d6b38a]/24",
    cropClass: "scale-115 translate-x-2 -translate-y-3",
  },
  {
    id: "crop-cut",
    name: "크롭컷",
    reason:
      "이마와 라인을 또렷하게 정리해 선명하고 세련된 인상을 만듭니다.",
    tags: ["짧은 기장", "선명함", "남성적"],
    prompt:
      "Apply a clean men's crop cut. Short textured top, controlled fringe, crisp outline, sharp modern look.",
    accent: "from-[#d9d2c4]/20",
    cropClass: "scale-130 -translate-y-7",
  },
  {
    id: "dandy-cut",
    name: "댄디컷",
    reason:
      "과한 변화 없이 단정하고 부드러운 느낌을 주는 안전한 첫 선택지입니다.",
    tags: ["단정함", "소프트", "첫 시도"],
    prompt:
      "Apply a Korean dandy cut. Clean and soft silhouette, natural fringe, conservative but stylish salon result.",
    accent: "from-[#f3d28a]/18",
    cropClass: "scale-108 -translate-y-1",
  },
  {
    id: "shadow-perm",
    name: "쉐도우펌",
    reason:
      "머리 숱과 볼륨감을 살려 전체 실루엣을 풍성하게 보완할 수 있습니다.",
    tags: ["펌", "볼륨", "입체감"],
    prompt:
      "Apply a Korean shadow perm. Soft waves, natural volume, textured movement while keeping the face visible.",
    accent: "from-[#8fb6a6]/20",
    cropClass: "scale-112 -translate-x-2 -translate-y-2",
  },
];

export const resultAngles = [
  {
    label: "좌상단",
    source: "front",
    prompt:
      "left upper three-quarter salon reference angle, showing top and left hair volume",
    className: "-rotate-2 scale-110",
  },
  {
    label: "상단",
    source: "front",
    prompt: "top-down salon reference angle, showing hair crown and top texture",
    className: "scale-125 -translate-y-5",
  },
  {
    label: "우상단",
    source: "front",
    prompt:
      "right upper three-quarter salon reference angle, showing top and right hair volume",
    className: "rotate-2 scale-110",
  },
  {
    label: "좌측",
    source: "side",
    prompt: "left side salon reference angle, showing side line and ear area",
    className: "scale-112 -translate-x-3",
  },
  {
    label: "정면",
    source: "front",
    prompt: "front-facing salon reference angle, clear face and hairline",
    className: "scale-105",
  },
  {
    label: "우측",
    source: "side",
    prompt: "right side salon reference angle, showing side line and ear area",
    className: "scale-112 translate-x-3",
  },
  {
    label: "좌하단",
    source: "side",
    prompt:
      "lower left three-quarter salon reference angle, showing neckline and side silhouette",
    className: "-rotate-1 scale-115 translate-y-3",
  },
  {
    label: "후면",
    source: "side",
    prompt:
      "back salon reference angle, showing rear neckline and back hair shape",
    className: "scale-125 blur-[0.35px]",
  },
  {
    label: "우하단",
    source: "side",
    prompt:
      "lower right three-quarter salon reference angle, showing neckline and side silhouette",
    className: "rotate-1 scale-115 translate-y-3",
  },
] as const;

export function getStyleById(id: string) {
  return fitcutStyles.find((style) => style.id === id);
}
