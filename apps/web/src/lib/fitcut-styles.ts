export type FitcutStyleId = string;

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

export const styleCatalog: FitcutStyle[] = [
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
    cropClass: "scale-100",
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
    cropClass: "scale-100",
  },
  {
    id: "soft-parted",
    name: "6:4 가르마",
    reason:
      "볼륨을 살리면서도 과하지 않아 일상과 미용실 상담 모두에 쓰기 좋습니다.",
    tags: ["6:4", "볼륨", "데일리"],
    prompt:
      "Korean 6:4 parted hairstyle: clear 6-to-4 side part, lifted front volume, smooth side flow, softly styled fringe away from the forehead, clean side shape, everyday premium salon styling.",
    previewPrompt:
      "Portrait variation C: front-right three-quarter portrait, relaxed expression, slight head turn, eye-level camera, polished salon consultation mood.",
    accent: "from-[#d6b38a]/24",
    cropClass: "scale-100",
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
    cropClass: "scale-100",
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
    cropClass: "scale-100",
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
    cropClass: "scale-100",
  },
  {
    id: "comma-hair",
    name: "콤마 헤어",
    reason:
      "앞머리 곡선이 얼굴 중심을 잡아주어 부드럽고 세련된 이미지를 만듭니다.",
    tags: ["C컬", "가르마", "세련됨"],
    prompt:
      "Korean comma hair for men: C-shaped curved fringe near the forehead, soft side part, controlled root volume, neat sides, polished romantic salon finish.",
    previewPrompt:
      "Portrait variation G: relaxed front three-quarter portrait, subtle smile, fringe curve clearly visible, warm indoor lighting.",
    accent: "from-[#efd9a3]/22",
    cropClass: "scale-100",
  },
  {
    id: "down-perm-two-block",
    name: "다운펌 투블럭",
    reason:
      "옆머리가 뜨는 얼굴형에 좋고, 전체 폭을 정리해 깔끔한 인상을 줍니다.",
    tags: ["다운펌", "투블럭", "슬림"],
    prompt:
      "Korean two-block haircut with down perm: sides pressed naturally close to the head, clean ear line, moderate top length with soft texture, slim silhouette, premium salon finish.",
    previewPrompt:
      "Portrait variation H: clean side-aware three-quarter portrait, calm expression, ear line and side silhouette visible.",
    accent: "from-[#b9d6d0]/20",
    cropClass: "scale-100",
  },
  {
    id: "textured-fringe",
    name: "텍스처 프린지",
    reason:
      "앞머리에 질감을 주어 어려 보이면서도 가볍고 자연스러운 분위기를 냅니다.",
    tags: ["질감", "앞머리", "캐주얼"],
    prompt:
      "Textured fringe haircut for Korean men: light choppy fringe over the forehead, airy texture, low-volume sides, natural matte styling, youthful but refined finish.",
    previewPrompt:
      "Portrait variation I: casual close portrait, slightly downward gaze, textured fringe emphasized without hiding the eyes.",
    accent: "from-[#c7d3ad]/20",
    cropClass: "scale-100",
  },
  {
    id: "short-quiff",
    name: "숏 퀴프",
    reason:
      "전면 볼륨을 세워 이마와 윤곽을 또렷하게 보이고 활기 있는 인상을 줍니다.",
    tags: ["볼륨", "짧은 기장", "활동적"],
    prompt:
      "Short quiff hairstyle: tapered sides, front hair lifted upward and slightly back, textured top, crisp yet natural hairline, energetic premium men's grooming look.",
    previewPrompt:
      "Portrait variation J: eye-level confident portrait, chin slightly raised, front volume clearly visible.",
    accent: "from-[#dabf8c]/22",
    cropClass: "scale-100",
  },
  {
    id: "french-crop",
    name: "프렌치 크롭",
    reason:
      "이마 라인을 안정적으로 덮으면서도 짧고 정돈된 실루엣을 유지합니다.",
    tags: ["크롭", "짧음", "정돈"],
    prompt:
      "French crop for men: short textured top, neat forward fringe, clean low taper, compact masculine silhouette, matte natural texture.",
    previewPrompt:
      "Portrait variation K: sharp three-quarter portrait, compact fringe and taper visible, composed expression.",
    accent: "from-[#d8d0bf]/20",
    cropClass: "scale-100",
  },
  {
    id: "curtain-perm",
    name: "커튼펌",
    reason:
      "가르마와 웨이브가 얼굴 옆선을 부드럽게 감싸 분위기를 더해줍니다.",
    tags: ["펌", "중간 기장", "무드"],
    prompt:
      "Korean curtain perm: medium-length parted fringe opening from the center, soft waves framing both sides of the face, natural root volume, elegant salon texture.",
    previewPrompt:
      "Portrait variation L: moody front-left portrait, soft wave flow visible around both temples, premium interior light.",
    accent: "from-[#c3b29a]/22",
    cropClass: "scale-100",
  },
  {
    id: "side-part-taper",
    name: "사이드파트 테이퍼",
    reason:
      "옆 라인을 정리하면서도 포멀하고 성숙한 분위기를 만들기 좋습니다.",
    tags: ["포멀", "테이퍼", "성숙함"],
    prompt:
      "Classic modern side-part taper: defined side part, tapered sides, controlled shine, tidy top swept to one side, mature premium barbershop finish.",
    previewPrompt:
      "Portrait variation M: clean formal portrait, face turned slightly right, side part line clearly visible.",
    accent: "from-[#9fb7a8]/20",
    cropClass: "scale-100",
  },
  {
    id: "buzz-taper",
    name: "버즈 테이퍼",
    reason:
      "두상과 이목구비를 선명하게 보여주며 관리가 가장 쉬운 짧은 스타일입니다.",
    tags: ["초단발", "관리 쉬움", "선명함"],
    prompt:
      "Refined buzz cut with taper: very short even top, soft tapered fade on sides, clean hairline, premium masculine grooming, natural head shape preserved.",
    previewPrompt:
      "Portrait variation N: direct front portrait, clean confident expression, hairline and head shape clearly visible.",
    accent: "from-[#e2cfa8]/18",
    cropClass: "scale-100",
  },
  {
    id: "semi-crop",
    name: "세미 크롭",
    reason:
      "크롭컷보다 부담이 적고, 짧게 정리하면서도 부드러운 앞머리를 남깁니다.",
    tags: ["짧은 기장", "부담 적음", "데일리"],
    prompt:
      "Semi crop haircut: short but not severe textured top, soft short fringe, clean tapered sides, approachable modern Korean men's salon finish.",
    previewPrompt:
      "Portrait variation O: natural lifestyle portrait, slight smile, soft short fringe and clean sides visible.",
    accent: "from-[#f0d08b]/20",
    cropClass: "scale-100",
  },
  {
    id: "natural-wave",
    name: "내추럴 웨이브",
    reason:
      "강한 펌 느낌보다 자연스러운 움직임을 주어 얼굴 주변을 편안하게 보완합니다.",
    tags: ["웨이브", "자연스러움", "볼륨"],
    prompt:
      "Natural wave hairstyle for men: subtle loose wave through the top and fringe, soft volume, clean side control, realistic everyday salon styling.",
    previewPrompt:
      "Portrait variation P: soft front-right portrait, relaxed expression, natural wave texture visible in the fringe and crown.",
    accent: "from-[#aebf9d]/20",
    cropClass: "scale-100",
  },
  {
    id: "soft-wolf",
    name: "소프트 울프컷",
    reason:
      "옆과 뒤 라인에 레이어를 주어 개성은 살리되 과하지 않게 분위기를 냅니다.",
    tags: ["레이어", "개성", "중간 기장"],
    prompt:
      "Soft men's wolf cut: layered medium top and back, subtle nape length, light texture around temples, fashionable but wearable Korean salon silhouette.",
    previewPrompt:
      "Portrait variation Q: stylish three-quarter portrait, layered side and nape shape suggested, calm fashion-forward expression.",
    accent: "from-[#b9aaa0]/22",
    cropClass: "scale-100",
  },
  {
    id: "slick-back-taper",
    name: "슬릭백 테이퍼",
    reason:
      "이마를 드러내고 뒤로 넘겨 성숙하고 고급스러운 이미지를 강조합니다.",
    tags: ["포멀", "이마 노출", "고급"],
    prompt:
      "Modern slick back taper: hair brushed back with natural volume, tapered sides, controlled clean finish, refined premium salon look without excessive wet shine.",
    previewPrompt:
      "Portrait variation R: composed premium portrait, hair swept back clearly, mature confident expression.",
    accent: "from-[#c0b08a]/22",
    cropClass: "scale-100",
  },
  {
    id: "regent-cut",
    name: "리젠트컷",
    reason:
      "앞머리를 세워 얼굴이 길고 또렷해 보이게 하며 단정한 남성미를 줍니다.",
    tags: ["볼륨", "단정함", "남성적"],
    prompt:
      "Korean regent cut: front hair lifted and swept up, tidy short sides, controlled top volume, clear forehead, clean masculine salon finish.",
    previewPrompt:
      "Portrait variation S: low-to-eye-level confident portrait, upward front styling visible, shoulders square.",
    accent: "from-[#d1bd90]/22",
    cropClass: "scale-100",
  },
  {
    id: "short-mash",
    name: "숏 마쉬",
    reason:
      "둥근 앞머리 실루엣을 짧게 정리해 귀엽고 부드러운 인상을 줍니다.",
    tags: ["소프트", "짧은 기장", "동안"],
    prompt:
      "Short Korean mash hairstyle: rounded soft fringe, compact top, lightly tapered sides, gentle youthful silhouette, tidy premium salon finish.",
    previewPrompt:
      "Portrait variation T: gentle close portrait, soft rounded fringe visible, natural relaxed expression.",
    accent: "from-[#d8c3a4]/20",
    cropClass: "scale-100",
  },
];

export const fitcutStyles: FitcutStyle[] = styleCatalog.slice(0, 9);

export const resultAngles = [
  {
    label: "좌상단",
    source: "front",
    prompt:
      "VIEW GROUP: RIGHT FACE. Camera is high above the subject's RIGHT side, looking down at the right cheek and right temple. The subject's right side of face must be visible, and the nose points slightly toward viewer left. This replaces the previous opposite corner composition.",
    className: "scale-100",
  },
  {
    label: "상단",
    source: "front",
    prompt:
      "VIEW GROUP: FRONT. Camera is slightly above the subject but still from the front. Both eyes and both cheeks remain visible. Show the crown and top texture without turning into a side profile.",
    className: "scale-100",
  },
  {
    label: "우상단",
    source: "front",
    prompt:
      "VIEW GROUP: LEFT FACE. Camera is high above the subject's LEFT side, looking down at the left cheek and left temple. The subject's left side of face must be visible, and the nose points slightly toward viewer right. This replaces the previous opposite corner composition.",
    className: "scale-100",
  },
  {
    label: "좌측",
    source: "side",
    prompt:
      "VIEW GROUP: LEFT FACE. Camera is on the subject's LEFT side at eye level. Show the left cheek, left ear, left temple, sideburn, side line, and nape. The subject looks toward viewer right. Do not show the right cheek as the dominant side.",
    className: "scale-100",
  },
  {
    label: "정면",
    source: "front",
    prompt:
      "CAMERA POSITION: exact straight-on front reference, eye-level camera, both eyes equally visible, clear hairline, balanced shoulders, calm neutral expression. This is the canonical center reference for the hairstyle.",
    className: "scale-100",
  },
  {
    label: "우측",
    source: "side",
    prompt:
      "VIEW GROUP: RIGHT FACE. Camera is on the subject's RIGHT side at eye level. Show the right cheek, right ear, right temple, sideburn, side line, and nape. The subject looks toward viewer left. Do not show the left cheek as the dominant side.",
    className: "scale-100",
  },
  {
    label: "좌하단",
    source: "side",
    prompt:
      "VIEW GROUP: RIGHT FACE. Camera is low and on the subject's RIGHT side, looking upward at the right cheek and right jawline. Chin slightly lifted. The nose points toward viewer left. This replaces the previous opposite lower-corner composition.",
    className: "scale-100",
  },
  {
    label: "하단",
    source: "front",
    prompt:
      "VIEW GROUP: FRONT. Camera is low and from the front, looking slightly upward. Both eyes, both cheeks, and the front hairline remain visible. Chin is slightly lifted, but the face must still read as the same person from the front.",
    className: "scale-100",
  },
  {
    label: "우하단",
    source: "side",
    prompt:
      "VIEW GROUP: LEFT FACE. Camera is low and on the subject's LEFT side, looking upward at the left cheek and left jawline. Chin slightly lifted. The nose points toward viewer right. This replaces the previous opposite lower-corner composition.",
    className: "scale-100",
  },
] as const;

export function getStyleById(id: string) {
  return styleCatalog.find((style) => style.id === id);
}
