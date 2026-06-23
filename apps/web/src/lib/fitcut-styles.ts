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
  previewPrompt: string;
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
      "Modern Korean men's leaf cut: medium-length layered top, soft curtain-like fringe flowing to both sides, natural C-shaped movement around the temples, gentle side volume, clean neckline, refined salon finish.",
    previewPrompt:
      "Portrait variation A: front-left three-quarter close portrait, calm soft smile, eyes near the camera, shoulders slightly angled, premium cafe lighting. Do not copy the original selfie angle.",
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
      "Modern Ivy League haircut for men: short clean tapered sides, neatly trimmed sideburns, tidy top combed slightly upward and to one side, crisp hairline, professional polished finish.",
    previewPrompt:
      "Portrait variation B: straight-on professional headshot, neutral confident expression, chin level, clean profile-photo framing, no hand touching the head.",
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
      "Korean 6:4 parted hairstyle: clear 6-to-4 side part, lifted front volume, smooth side flow, softly styled fringe away from the forehead, clean side shape, everyday premium salon styling.",
    previewPrompt:
      "Portrait variation C: front-right three-quarter portrait, relaxed expression, slight head turn, eye-level camera, polished salon consultation mood.",
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
      "Clean men's crop cut: short textured top, controlled blunt fringe above the forehead, tight tapered sides, crisp outline around the temples, sharp modern masculine look.",
    previewPrompt:
      "Portrait variation D: slightly lower camera angle, face turned a little left, composed serious expression, sharper jawline emphasis, no hand near hair.",
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
      "Korean dandy cut: neat soft silhouette, natural rounded fringe, moderate top volume, tidy side line around the ears, conservative but stylish first-try salon result.",
    previewPrompt:
      "Portrait variation E: medium shot from chest up, seated cafe pose, gentle closed-mouth smile, head tilted subtly right, natural lifestyle composition.",
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
      "Korean shadow perm: soft loose waves, airy top volume, textured movement through the fringe and crown, fuller silhouette without covering the eyes, natural salon perm finish.",
    previewPrompt:
      "Portrait variation F: closer beauty portrait, front-left angle, subtle thoughtful expression, fuller hair silhouette visible, soft premium indoor lighting.",
    accent: "from-[#8fb6a6]/20",
    cropClass: "scale-112 -translate-x-2 -translate-y-2",
  },
];

export const resultAngles = [
  {
    label: "좌상단",
    source: "front",
    prompt:
      "CAMERA POSITION: high above and to the viewer's left, looking down diagonally at the subject's front-left side. The top/crown and left temple must be visible. The face should NOT be straight-on.",
    className: "-rotate-2 scale-110",
  },
  {
    label: "상단",
    source: "front",
    prompt:
      "CAMERA POSITION: strict overhead top-down salon reference. Camera is above the crown looking downward. The crown, top texture, and hair parting are the focus. This must not look like a normal front portrait.",
    className: "scale-125 -translate-y-5",
  },
  {
    label: "우상단",
    source: "front",
    prompt:
      "CAMERA POSITION: high above and to the viewer's right, looking down diagonally at the subject's front-right side. The top/crown and right temple must be visible. The face should NOT be straight-on.",
    className: "rotate-2 scale-110",
  },
  {
    label: "좌측",
    source: "side",
    prompt:
      "CAMERA POSITION: true left-side profile, 90 degrees from the front. Show left ear, left temple, sideburn, side line, and nape. The subject looks toward frame right. Do not make this a front-facing image.",
    className: "scale-112 -translate-x-3",
  },
  {
    label: "정면",
    source: "front",
    prompt:
      "CAMERA POSITION: exact straight-on front reference, eye-level camera, both eyes equally visible, clear hairline, balanced shoulders, calm neutral expression. This is the canonical center reference for the hairstyle.",
    className: "scale-105",
  },
  {
    label: "우측",
    source: "side",
    prompt:
      "CAMERA POSITION: true right-side profile, 90 degrees from the front. Show right ear, right temple, sideburn, side line, and nape. The subject looks toward frame left. Do not make this a front-facing image.",
    className: "scale-112 translate-x-3",
  },
  {
    label: "좌하단",
    source: "side",
    prompt:
      "CAMERA POSITION: low camera below and to the viewer's left, looking upward at the subject's lower-left three-quarter angle. Chin slightly lifted, jawline and left neckline visible. Do not use the same angle as left profile or front.",
    className: "-rotate-1 scale-115 translate-y-3",
  },
  {
    label: "후면",
    source: "side",
    prompt:
      "CAMERA POSITION: true back view of the head and upper shoulders. The face is not visible. Show the rear crown, back hair shape, nape line, and leather jacket shoulders. This must be a rear salon reference, not a side view.",
    className: "scale-125 blur-[0.35px]",
  },
  {
    label: "우하단",
    source: "side",
    prompt:
      "CAMERA POSITION: low camera below and to the viewer's right, looking upward at the subject's lower-right three-quarter angle. Chin slightly lifted, jawline and right neckline visible. Do not use the same angle as right profile or front.",
    className: "rotate-1 scale-115 translate-y-3",
  },
] as const;

export function getStyleById(id: string) {
  return fitcutStyles.find((style) => style.id === id);
}
