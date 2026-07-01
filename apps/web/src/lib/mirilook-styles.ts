export type MirilookStyleId = string;
export type MirilookAudience = "male" | "female";

export type MirilookStyle = {
  id: MirilookStyleId;
  name: string;
  reason: string;
  tags: string[];
  prompt: string;
  previewPrompt: string;
  accent: string;
  cropClass: string;
  recommendationBucket?: "core" | "challenge";
  salonProcess?: string;
  maintenanceAdvice?: string;
  outfitAdvice?: string;
  makeupAdvice?: string;
};

export const styleCatalog: MirilookStyle[] = [
  {
    id: "leaf-cut",
    name: "리프컷",
    reason:
      "앞머리와 옆 라인이 자연스럽게 이어져 얼굴형을 부드럽게 보여주는 스타일입니다.",
    tags: ["중간 기장", "가르마", "부드러운 인상"],
    prompt:
      "Modern Korean leaf cut: medium-length layered top, soft curtain-like fringe flowing to both sides, natural C-shaped movement around the temples, gentle side volume, clean neckline, refined salon finish.",
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
      "Modern Ivy League haircut: short clean tapered sides, neatly trimmed sideburns, tidy top combed slightly upward and to one side, crisp hairline, professional polished finish.",
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
    tags: ["짧은 기장", "선명함", "또렷함"],
    prompt:
      "Clean crop cut: short textured top, controlled blunt fringe above the forehead, tight tapered sides, crisp outline around the temples, sharp modern salon look.",
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
      "Korean comma hair: C-shaped curved fringe near the forehead, soft side part, controlled root volume, neat sides, polished romantic salon finish.",
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
      "Textured fringe haircut for Korean salon clients: light choppy fringe over the forehead, airy texture, low-volume sides, natural matte styling, youthful but refined finish.",
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
      "Short quiff hairstyle: tapered sides, front hair lifted upward and slightly back, textured top, crisp yet natural hairline, energetic premium grooming look.",
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
      "French crop: short textured top, neat forward fringe, clean low taper, compact neat silhouette, matte natural texture.",
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
      "Refined buzz cut with taper: very short even top, soft tapered fade on sides, clean hairline, premium grooming, natural head shape preserved.",
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
      "Semi crop haircut: short but not severe textured top, soft short fringe, clean tapered sides, approachable modern Korean salon finish.",
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
      "Natural wave hairstyle: subtle loose wave through the top and fringe, soft volume, clean side control, realistic everyday salon styling.",
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
      "Soft wolf cut: layered medium top and back, subtle nape length, light texture around temples, fashionable but wearable Korean salon silhouette.",
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
      "앞머리를 세워 얼굴이 길고 또렷해 보이게 하며 단정한 인상을 줍니다.",
    tags: ["볼륨", "단정함", "또렷함"],
    prompt:
      "Korean regent cut: front hair lifted and swept up, tidy short sides, controlled top volume, clear forehead, clean salon finish.",
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
  {
    id: "long-layered-c-curl",
    name: "롱 레이어드 C컬",
    reason:
      "긴 기장을 유지하면서 얼굴선을 따라 층을 내 부드럽고 정돈된 분위기를 줍니다.",
    tags: ["장발", "레이어드", "C컬"],
    prompt:
      "Long layered C-curl hairstyle: long length preserved, face-framing layers, soft inward C-curl ends, airy crown volume, clean glossy salon finish, elegant natural movement.",
    previewPrompt:
      "Portrait variation U: soft front three-quarter beauty portrait, long layers framing the face, calm refined expression.",
    accent: "from-[#d9c3ad]/22",
    cropClass: "scale-100",
  },
  {
    id: "long-hush-cut",
    name: "롱 허쉬컷",
    reason:
      "무거운 긴 머리에 가벼운 레이어와 질감을 더해 얼굴 주변을 자연스럽게 정리합니다.",
    tags: ["장발", "허쉬", "질감"],
    prompt:
      "Long hush cut: long layered silhouette with light shag-inspired texture, face-framing wispy layers, natural movement around cheekbones and jaw, soft salon finish.",
    previewPrompt:
      "Portrait variation V: stylish lifestyle portrait, light layered ends and face-framing texture visible, relaxed expression.",
    accent: "from-[#b8c2a4]/22",
    cropClass: "scale-100",
  },
  {
    id: "build-perm",
    name: "빌드펌",
    reason:
      "볼륨과 굵은 웨이브를 더해 밋밋한 실루엣을 풍성하고 세련되게 보완합니다.",
    tags: ["장발", "웨이브", "볼륨"],
    prompt:
      "Build perm hairstyle: medium-to-long hair with large soft waves, lifted root volume, elegant S-curl movement around the face, full but controlled salon texture.",
    previewPrompt:
      "Portrait variation W: elegant portrait with visible wave volume around both sides of the face, premium indoor lighting.",
    accent: "from-[#c9b08f]/24",
    cropClass: "scale-100",
  },
  {
    id: "loose-hippie-perm",
    name: "히피펌",
    reason:
      "잔잔한 컬로 개성을 주되, 얼굴선을 가리지 않게 조절하면 분위기 전환에 좋습니다.",
    tags: ["장발", "컬", "무드"],
    prompt:
      "Loose hippie perm: long or medium hair with relaxed small-to-medium curls, natural airy texture, controlled volume around the face, modern wearable salon finish.",
    previewPrompt:
      "Portrait variation X: expressive portrait with curl texture clearly visible, warm and natural mood.",
    accent: "from-[#a8b59d]/22",
    cropClass: "scale-100",
  },
  {
    id: "sleek-long-straight",
    name: "슬릭 스트레이트",
    reason:
      "깔끔한 윤기와 정돈된 라인으로 얼굴형을 또렷하게 보여주는 고급스러운 선택입니다.",
    tags: ["장발", "윤기", "정돈"],
    prompt:
      "Sleek long straight hairstyle: smooth long hair, clean center or soft side part, glossy controlled surface, tidy face line, premium minimal salon finish.",
    previewPrompt:
      "Portrait variation Y: clean front portrait with sleek straight hair framing the face, composed expression.",
    accent: "from-[#d5d0c3]/20",
    cropClass: "scale-100",
  },
  {
    id: "medium-layered-bob",
    name: "중단발 레이어드",
    reason:
      "어깨 근처 기장에서 층을 넣어 답답함을 줄이고 얼굴 주변 볼륨을 자연스럽게 만듭니다.",
    tags: ["중단발", "레이어드", "볼륨"],
    prompt:
      "Medium layered bob: shoulder-grazing length, soft layers around the face, light inward movement at the ends, natural volume, refined Korean salon finish.",
    previewPrompt:
      "Portrait variation Z: front-right portrait, shoulder-length layers visible, gentle polished expression.",
    accent: "from-[#c7b99a]/22",
    cropClass: "scale-100",
  },
  {
    id: "tassel-bob",
    name: "태슬컷",
    reason:
      "일자로 떨어지는 단정한 라인이 목선과 턱선을 깔끔하게 보여줍니다.",
    tags: ["단발", "태슬", "깔끔함"],
    prompt:
      "Tassel bob haircut: clean blunt bob line around jaw or neck length, smooth ends, minimal layering, tidy face-framing shape, polished salon finish.",
    previewPrompt:
      "Portrait variation AA: exact front portrait with bob line clearly visible around the jaw and neck.",
    accent: "from-[#ddcaa9]/22",
    cropClass: "scale-100",
  },
  {
    id: "cs-curl-bob",
    name: "CS컬 보브",
    reason:
      "C컬과 S컬을 섞어 단발의 무게감은 줄이고 얼굴 주변을 부드럽게 보완합니다.",
    tags: ["단발", "CS컬", "부드러움"],
    prompt:
      "CS-curl bob hairstyle: bob length with mixed C-curl and S-curl movement, soft face-framing curve, gentle side volume, elegant salon texture.",
    previewPrompt:
      "Portrait variation AB: soft three-quarter portrait with curved bob movement visible around cheeks and jaw.",
    accent: "from-[#c6b08e]/22",
    cropClass: "scale-100",
  },
  {
    id: "short-bob",
    name: "숏 보브",
    reason:
      "짧고 정돈된 보브 라인으로 목선과 두상을 깔끔하게 보여주는 스타일입니다.",
    tags: ["짧은 머리", "보브", "정돈"],
    prompt:
      "Short bob hairstyle: short neat bob silhouette, clean nape line, soft volume at crown, face-framing side shape, refined salon finish.",
    previewPrompt:
      "Portrait variation AC: clean side-aware portrait with short bob silhouette and nape line visible.",
    accent: "from-[#d8c2a1]/20",
    cropClass: "scale-100",
  },
  {
    id: "soft-pixie",
    name: "소프트 픽시",
    reason:
      "짧은 기장에서도 앞머리와 옆선을 부드럽게 남겨 얼굴 특징을 또렷하게 살립니다.",
    tags: ["짧은 머리", "픽시", "가벼움"],
    prompt:
      "Soft pixie haircut: short cropped length with gentle fringe, soft side line around ears, light crown texture, clean nape, refined wearable salon finish.",
    previewPrompt:
      "Portrait variation AD: confident close portrait with soft pixie fringe and clean side line visible.",
    accent: "from-[#bfc8b8]/20",
    cropClass: "scale-100",
  },
  {
    id: "butterfly-layered",
    name: "버터플라이 레이어드",
    reason:
      "얼굴 옆으로 흐르는 큰 레이어가 광대와 턱선을 부드럽게 감싸면서 화사한 볼륨감을 줍니다.",
    tags: ["장발", "레이어드", "얼굴 보정"],
    prompt:
      "Butterfly layered hairstyle for a Korean women's salon client: long hair with large face-framing layers, lifted crown volume, airy curtain-like front pieces, soft movement away from the cheekbones, polished glossy salon finish.",
    previewPrompt:
      "Portrait variation AE: elegant front three-quarter beauty portrait, long butterfly layers framing both sides of the face, soft confident expression.",
    accent: "from-[#dec0b2]/24",
    cropClass: "scale-100",
  },
  {
    id: "elizabeth-perm",
    name: "엘리자벳펌",
    reason:
      "굵은 S컬과 풍성한 윤곽이 긴 얼굴형을 부드럽게 보완하고 여성스러운 분위기를 강화합니다.",
    tags: ["장발", "굵은 S컬", "볼륨"],
    prompt:
      "Elizabeth perm hairstyle: long or medium-long hair with large elegant S-curls, full but controlled side volume, soft glossy waves around the face, premium feminine salon styling, not frizzy.",
    previewPrompt:
      "Portrait variation AF: premium salon beauty portrait with large soft S-curl volume visible around shoulders, graceful expression.",
    accent: "from-[#d7b59f]/24",
    cropClass: "scale-100",
  },
  {
    id: "side-bang-layered",
    name: "사이드뱅 레이어드",
    reason:
      "사이드뱅이 이마와 광대 라인을 자연스럽게 연결해 얼굴이 작고 부드러워 보이게 합니다.",
    tags: ["중단발", "사이드뱅", "자연스러움"],
    prompt:
      "Side-bang layered hairstyle: medium to long Korean women's cut with soft side bangs, face-framing layers around cheekbones and jaw, natural inward movement, light crown volume, wearable salon finish.",
    previewPrompt:
      "Portrait variation AG: natural front-left portrait, side bangs and face-framing layers clearly visible, calm soft smile.",
    accent: "from-[#c9b497]/22",
    cropClass: "scale-100",
  },
  {
    id: "medium-c-curl",
    name: "중단발 C컬",
    reason:
      "어깨 근처 길이의 C컬이 목선과 턱선을 정돈해 깔끔하면서도 관리하기 쉬운 인상을 줍니다.",
    tags: ["중단발", "C컬", "관리 쉬움"],
    prompt:
      "Medium C-curl hairstyle: shoulder-length women's hair with smooth inward C-curl ends, clean face-framing line, gentle root volume, tidy polished Korean salon finish.",
    previewPrompt:
      "Portrait variation AH: straight-on salon portrait, shoulder-length C-curl ends visible near neck and jaw, neat refined expression.",
    accent: "from-[#d8c7aa]/22",
    cropClass: "scale-100",
  },
  {
    id: "medium-s-curl",
    name: "중단발 S컬펌",
    reason:
      "중단발에 부드러운 S컬을 더해 밋밋함을 줄이고 얼굴 주변에 생기 있는 움직임을 만듭니다.",
    tags: ["중단발", "S컬", "생기"],
    prompt:
      "Medium S-curl perm: shoulder-length Korean women's hairstyle with soft S-shaped waves, balanced side volume, airy ends, natural movement around cheeks and collarbone, salon-polished texture.",
    previewPrompt:
      "Portrait variation AI: warm three-quarter portrait with medium S-curl movement visible around both sides of the face.",
    accent: "from-[#cbb08f]/24",
    cropClass: "scale-100",
  },
  {
    id: "hime-cut",
    name: "히메컷",
    reason:
      "얼굴 옆 라인을 선명하게 잡아 개성을 주면서도 긴 기장을 유지할 수 있는 변화감 있는 스타일입니다.",
    tags: ["장발", "페이스라인", "개성"],
    prompt:
      "Modern soft hime cut: long straight or lightly layered women's hair with distinct cheek-length side panels, clean face line, smooth glossy surface, wearable Korean salon interpretation, not costume-like.",
    previewPrompt:
      "Portrait variation AJ: direct beauty portrait with cheek-length hime side panels visible, minimal clean styling, composed expression.",
    accent: "from-[#d2c6bb]/22",
    cropClass: "scale-100",
  },
  {
    id: "wolf-hush-women",
    name: "허쉬 울프컷",
    reason:
      "가벼운 층과 목선 레이어가 답답함을 줄여주고 트렌디하면서도 자연스러운 분위기를 만듭니다.",
    tags: ["중단발", "허쉬", "트렌디"],
    prompt:
      "Women's hush wolf cut: medium-length layered hair with light shag texture, airy crown, soft nape layers, face-framing wisps around cheekbones and jaw, stylish but wearable Korean salon finish.",
    previewPrompt:
      "Portrait variation AK: fashion-forward three-quarter portrait, hush wolf layers and nape texture clearly visible, relaxed expression.",
    accent: "from-[#bfc0a9]/22",
    cropClass: "scale-100",
  },
  {
    id: "rounded-short-cut",
    name: "라운드 숏컷",
    reason:
      "짧지만 둥근 실루엣을 유지해 얼굴선을 부드럽게 보완하고 세련된 이미지를 줍니다.",
    tags: ["숏컷", "라운드", "세련됨"],
    prompt:
      "Rounded short cut for a Korean women's salon client: short hair with soft rounded silhouette, light side volume around ears, clean nape, gentle fringe, feminine refined finish, not masculine.",
    previewPrompt:
      "Portrait variation AL: confident close beauty portrait with rounded short silhouette and clean nape implied, soft expression.",
    accent: "from-[#c8c4b8]/22",
    cropClass: "scale-100",
  },
  {
    id: "layered-short-bob",
    name: "레이어드 쇼트 보브",
    reason:
      "턱선부터 목선까지의 단발 기장을 유지하면서 가벼운 층을 넣어 답답함을 줄이고 얼굴 주변을 부드럽게 정리합니다.",
    tags: ["단발", "레이어", "기장 유지"],
    prompt:
      "Layered short bob for a Korean women's salon client: jaw-to-neck length bob maintained, light face-framing layers, soft rounded ends, clean nape, airy but not long silhouette, polished salon finish.",
    previewPrompt:
      "Portrait variation AM: soft front three-quarter beauty portrait with a neck-length layered short bob, clean nape implied, calm refined expression.",
    accent: "from-[#d9c0a8]/22",
    cropClass: "scale-100",
  },
  {
    id: "airy-bob-perm",
    name: "에어리 보브펌",
    reason:
      "현재 단발 길이 안에서 C컬과 약한 S컬을 섞어 볼륨을 만들기 때문에 붙임머리 없이도 분위기 변화를 줄 수 있습니다.",
    tags: ["단발펌", "볼륨", "기장 유지"],
    prompt:
      "Airy bob perm for a Korean women's salon client: neck-length bob maintained, soft C-curl and subtle S-curl movement, light root volume, face-framing bounce, no extension, no long hair, premium salon texture.",
    previewPrompt:
      "Portrait variation AN: warm salon portrait with a bob-length airy perm, visible soft curl at the jaw and neck line, natural smile.",
    accent: "from-[#ceb08f]/24",
    cropClass: "scale-100",
  },
  {
    id: "two-block-cut",
    name: "투블럭 컷",
    reason:
      "옆머리를 깔끔하게 정리하고 윗머리 볼륨을 살려 단정하면서도 관리하기 쉬운 인상을 줍니다.",
    tags: ["짧은 기장", "투블럭", "관리 쉬움"],
    prompt:
      "Modern Korean two-block haircut: clean short sides, moderate top length, natural fringe texture, tidy ear line, slim side silhouette, polished everyday grooming finish.",
    previewPrompt:
      "Portrait variation AO: clean front-right three-quarter portrait, ear line and top texture visible, calm confident expression.",
    accent: "from-[#b9d6d0]/22",
    cropClass: "scale-100",
  },
  {
    id: "low-fade-crop",
    name: "로우 페이드 크롭",
    reason:
      "낮은 페이드와 짧은 앞머리로 얼굴 윤곽을 또렷하게 보이게 하면서 과하지 않은 남성적인 인상을 만듭니다.",
    tags: ["짧은 기장", "페이드", "선명함"],
    prompt:
      "Low fade crop haircut: low natural fade around the ears and nape, short textured top, clean blunt fringe, sharp but wearable Korean salon finish.",
    previewPrompt:
      "Portrait variation AP: sharp side-aware portrait with low fade and crop texture clearly visible, composed expression.",
    accent: "from-[#d0d0c6]/20",
    cropClass: "scale-100",
  },
  {
    id: "middle-part-layer",
    name: "미들파트 레이어",
    reason:
      "가르마 라인과 가벼운 레이어로 이마 노출을 조절해 부드럽고 세련된 이미지를 만들 수 있습니다.",
    tags: ["중간 기장", "가르마", "레이어"],
    prompt:
      "Korean middle part layered hairstyle: medium top length, soft center-to-slight part, airy layered fringe, controlled side volume, natural salon movement.",
    previewPrompt:
      "Portrait variation AQ: front-facing portrait with soft middle part and layered fringe visible, warm premium indoor light.",
    accent: "from-[#d6b38a]/24",
    cropClass: "scale-100",
  },
  {
    id: "korean-mullet",
    name: "소프트 멀릿",
    reason:
      "목선 뒤쪽에 가벼운 길이감을 남겨 개성을 주되, 앞머리와 옆라인은 정돈해 부담을 줄인 스타일입니다.",
    tags: ["중간 기장", "개성", "목선"],
    prompt:
      "Soft Korean mullet: medium layered top, controlled sides, subtle nape length, textured back flow, fashionable but refined salon silhouette.",
    previewPrompt:
      "Portrait variation AR: stylish three-quarter portrait with nape length and side layers suggested, fashion-forward but wearable.",
    accent: "from-[#b9aaa0]/22",
    cropClass: "scale-100",
  },
  {
    id: "wet-comma",
    name: "웨트 콤마",
    reason:
      "콤마 앞머리에 은은한 윤기와 결감을 더해 프로필 촬영이나 저녁 약속에 어울리는 분위기를 줍니다.",
    tags: ["콤마", "윤기", "프로필"],
    prompt:
      "Wet comma hairstyle: C-shaped comma fringe with restrained glossy texture, soft side part, clean side silhouette, premium evening salon finish without excessive wet shine.",
    previewPrompt:
      "Portrait variation AS: polished profile-photo portrait with glossy comma fringe visible, relaxed confident expression.",
    accent: "from-[#8fb6a6]/22",
    cropClass: "scale-100",
  },
  {
    id: "clean-upbang",
    name: "클린 업뱅",
    reason:
      "앞머리를 자연스럽게 올려 이마와 눈썹 라인을 드러내고, 밝고 시원한 첫인상을 만들어 줍니다.",
    tags: ["짧은 기장", "업뱅", "시원함"],
    prompt:
      "Clean upbang hairstyle: short-to-medium top lifted naturally upward, forehead visible, tidy sides, light crown volume, fresh Korean grooming finish.",
    previewPrompt:
      "Portrait variation AT: eye-level confident portrait with lifted front hair and open forehead, clean shoulders.",
    accent: "from-[#dabf8c]/22",
    cropClass: "scale-100",
  },
  {
    id: "bob-with-bangs",
    name: "뱅 단발",
    reason:
      "단발 기장을 유지하면서 앞머리로 이마 비율을 조절해 귀엽고 단정한 인상을 만들 수 있습니다.",
    tags: ["단발", "앞머리", "동안"],
    prompt:
      "Korean bob with bangs: jaw-to-neck length bob, soft full or see-through bangs, smooth rounded ends, clean face line, feminine salon finish.",
    previewPrompt:
      "Portrait variation AU: direct beauty portrait with bob line and soft bangs clearly visible, gentle expression.",
    accent: "from-[#ddcaa9]/22",
    cropClass: "scale-100",
  },
  {
    id: "layered-cs-bob",
    name: "레이어드 CS 보브",
    reason:
      "보브 길이 안에서 C컬과 S컬을 섞어 얼굴 주변 볼륨을 만들고 단발의 답답함을 줄입니다.",
    tags: ["단발", "CS컬", "볼륨"],
    prompt:
      "Layered CS bob: neck-length bob with soft C and S curl mix, light face-framing layers, airy side volume, refined Korean salon texture.",
    previewPrompt:
      "Portrait variation AV: warm three-quarter portrait with bob-length CS curls visible around jaw and neck line.",
    accent: "from-[#c6b08e]/24",
    cropClass: "scale-100",
  },
  {
    id: "face-line-layer",
    name: "페이스라인 레이어",
    reason:
      "얼굴 옆선을 따라 짧은 레이어를 넣어 광대와 턱선을 부드럽게 감싸고 자연스럽게 보완합니다.",
    tags: ["중단발", "얼굴선", "레이어"],
    prompt:
      "Face-line layered women's hairstyle: medium to long length with shorter face-framing pieces around cheekbones and jaw, soft inward movement, natural salon polish.",
    previewPrompt:
      "Portrait variation AW: soft front-left beauty portrait emphasizing face-framing layers and natural movement.",
    accent: "from-[#c9b497]/22",
    cropClass: "scale-100",
  },
  {
    id: "wavy-lob",
    name: "웨이비 롭",
    reason:
      "어깨 근처 기장에 잔잔한 웨이브를 더해 성숙하면서도 부드러운 분위기를 만들 수 있습니다.",
    tags: ["중단발", "웨이브", "성숙함"],
    prompt:
      "Wavy lob hairstyle: shoulder-grazing long bob with soft loose waves, balanced side volume, polished ends, elegant wearable salon finish.",
    previewPrompt:
      "Portrait variation AX: elegant portrait with shoulder-length wave movement visible, calm refined mood.",
    accent: "from-[#cbb08f]/24",
    cropClass: "scale-100",
  },
  {
    id: "curtain-bang-long",
    name: "커튼뱅 롱레이어",
    reason:
      "긴 기장에 커튼뱅을 더해 이마와 광대 라인을 부드럽게 연결하고 여성스러운 움직임을 줍니다.",
    tags: ["장발", "커튼뱅", "레이어"],
    prompt:
      "Long layered hairstyle with curtain bangs: long length preserved, soft curtain fringe, face-framing layers, glossy salon movement, elegant Korean beauty finish.",
    previewPrompt:
      "Portrait variation AY: premium front three-quarter beauty portrait with curtain bangs and long layers visible.",
    accent: "from-[#dec0b2]/24",
    cropClass: "scale-100",
  },
  {
    id: "jelly-perm",
    name: "젤리펌",
    reason:
      "탄력 있는 컬감으로 얼굴 주변에 생기를 주고, 부드럽고 사랑스러운 분위기를 강조할 수 있습니다.",
    tags: ["펌", "컬", "생기"],
    prompt:
      "Jelly perm hairstyle: medium-to-long women's hair with bouncy soft curls, lively but controlled volume, glossy defined curl texture, modern Korean salon finish.",
    previewPrompt:
      "Portrait variation AZ: lively beauty portrait with bouncy curl texture around shoulders, fresh expression.",
    accent: "from-[#d7b59f]/24",
    cropClass: "scale-100",
  },
];

export const maleStyleIds = [
  "leaf-cut",
  "ivy-league",
  "soft-parted",
  "crop-cut",
  "dandy-cut",
  "shadow-perm",
  "comma-hair",
  "down-perm-two-block",
  "textured-fringe",
  "short-quiff",
  "french-crop",
  "curtain-perm",
  "side-part-taper",
  "buzz-taper",
  "semi-crop",
  "natural-wave",
  "soft-wolf",
  "slick-back-taper",
  "regent-cut",
  "short-mash",
  "two-block-cut",
  "low-fade-crop",
  "middle-part-layer",
  "korean-mullet",
  "wet-comma",
  "clean-upbang",
] as const;

export const femaleStyleIds = [
  "long-layered-c-curl",
  "long-hush-cut",
  "build-perm",
  "loose-hippie-perm",
  "sleek-long-straight",
  "butterfly-layered",
  "elizabeth-perm",
  "hime-cut",
  "side-bang-layered",
  "medium-layered-bob",
  "medium-c-curl",
  "medium-s-curl",
  "wolf-hush-women",
  "tassel-bob",
  "cs-curl-bob",
  "short-bob",
  "soft-pixie",
  "rounded-short-cut",
  "layered-short-bob",
  "airy-bob-perm",
  "bob-with-bangs",
  "layered-cs-bob",
  "face-line-layer",
  "wavy-lob",
  "curtain-bang-long",
  "jelly-perm",
] as const;

export const defaultAudience: MirilookAudience = "male";

export type MirilookHairLength =
  | "very_short"
  | "short"
  | "bob"
  | "medium"
  | "long"
  | "unknown";

const hairLengthRank: Record<MirilookHairLength, number> = {
  very_short: 0,
  short: 1,
  bob: 2,
  medium: 3,
  long: 4,
  unknown: 99,
};

const styleLengthById: Record<string, MirilookHairLength> = {
  "buzz-taper": "very_short",
  "crop-cut": "short",
  "french-crop": "short",
  "ivy-league": "short",
  "semi-crop": "short",
  "short-quiff": "short",
  "regent-cut": "short",
  "short-mash": "short",
  "two-block-cut": "short",
  "low-fade-crop": "short",
  "clean-upbang": "short",
  "down-perm-two-block": "short",
  "dandy-cut": "short",
  "textured-fringe": "short",
  "leaf-cut": "medium",
  "soft-parted": "medium",
  "shadow-perm": "medium",
  "comma-hair": "medium",
  "natural-wave": "medium",
  "side-part-taper": "medium",
  "middle-part-layer": "medium",
  "korean-mullet": "medium",
  "wet-comma": "medium",
  "curtain-perm": "medium",
  "soft-wolf": "medium",
  "slick-back-taper": "medium",
  "tassel-bob": "bob",
  "cs-curl-bob": "bob",
  "short-bob": "bob",
  "medium-layered-bob": "bob",
  "medium-c-curl": "bob",
  "medium-s-curl": "bob",
  "layered-short-bob": "bob",
  "airy-bob-perm": "bob",
  "bob-with-bangs": "bob",
  "layered-cs-bob": "bob",
  "soft-pixie": "short",
  "rounded-short-cut": "short",
  "side-bang-layered": "medium",
  "wolf-hush-women": "medium",
  "face-line-layer": "medium",
  "wavy-lob": "medium",
  "long-layered-c-curl": "long",
  "long-hush-cut": "long",
  "build-perm": "long",
  "loose-hippie-perm": "long",
  "sleek-long-straight": "long",
  "butterfly-layered": "long",
  "elizabeth-perm": "long",
  "hime-cut": "long",
  "curtain-bang-long": "long",
  "jelly-perm": "long",
};

export function sanitizeHairLength(value: unknown): MirilookHairLength {
  return value === "very_short" ||
    value === "short" ||
    value === "bob" ||
    value === "medium" ||
    value === "long"
    ? value
    : "unknown";
}

export function getHairLengthLabel(length: MirilookHairLength) {
  const labels: Record<MirilookHairLength, string> = {
    very_short: "초단발/매우 짧은 기장",
    short: "짧은 기장",
    bob: "단발·보브 기장",
    medium: "중단발·미디엄 기장",
    long: "긴 기장",
    unknown: "기장 판단 보류",
  };

  return labels[length];
}

export function getStyleHairLength(styleId: string): MirilookHairLength {
  return styleLengthById[styleId] ?? "unknown";
}

export function filterStylesByCurrentHairLength<T extends { id: string }>(
  styles: T[],
  currentHairLength: MirilookHairLength,
  constrainToCurrentLength: boolean,
) {
  if (!constrainToCurrentLength || currentHairLength === "unknown") {
    return styles;
  }

  const currentRank = hairLengthRank[currentHairLength];

  return styles.filter((style) => {
    const styleLength = getStyleHairLength(style.id);

    if (styleLength === "unknown") {
      return false;
    }

    return hairLengthRank[styleLength] <= currentRank;
  });
}

export function getStylesByAudience(audience: MirilookAudience) {
  const ids = audience === "female" ? femaleStyleIds : maleStyleIds;
  const catalogMap = new Map(styleCatalog.map((style) => [style.id, style]));

  return ids
    .map((id) => catalogMap.get(id))
    .filter((style): style is MirilookStyle => Boolean(style));
}

export function getFallbackStylesByAudience(audience: MirilookAudience) {
  return getStylesByAudience(audience).slice(0, 9);
}

export function sanitizeAudience(value: unknown): MirilookAudience {
  return value === "female" ? "female" : "male";
}

export const MirilookStyles: MirilookStyle[] =
  getFallbackStylesByAudience(defaultAudience);

export const resultAngles = [
  {
    label: "좌상단",
    source: "side",
    prompt:
      "GRID SLOT: UPPER LEFT DIAGONAL. Camera is high and front-diagonal; this image sits in the upper-left of the board and the subject turns toward the grid center. Show a high three-quarter temple/crown view with one cheek and jaw edge visible. It must not be exact front, strict side, rear, or top-only overhead. Single portrait only, no collage.",
    className: "scale-100",
  },
  {
    label: "상단",
    source: "both",
    prompt:
      "GRID SLOT: TOP CENTER OVERHEAD. Camera is directly above the customer's head, like a ceiling camera or drone looking down at the crown. Crown, part line, hair whorl, top volume, fringe direction, and hair texture dominate. Face should be barely visible or not visible. Never make this a front portrait, side profile, or rear view. Single photo only, no collage.",
    className: "scale-100",
  },
  {
    label: "우상단",
    source: "side",
    prompt:
      "GRID SLOT: UPPER RIGHT DIAGONAL. Camera is high and front-diagonal from the opposite side of UPPER LEFT; this image sits in the upper-right of the board and the subject turns toward the grid center. Show the opposite high three-quarter temple/crown direction from upper-left. It must not be exact front, strict side, rear, or top-only overhead. Single portrait only, no collage.",
    className: "scale-100",
  },
  {
    label: "좌측",
    source: "side",
    prompt:
      "GRID SLOT: MIDDLE LEFT STRICT PROFILE. Camera is on the customer's own LEFT side at eye level, 90-degree profile. Show the left ear, left temple, left sideburn, side hairline, side volume, and nape line clearly. Nose points toward viewer right. Not a diagonal three-quarter portrait, not front, not rear, not mirrored right profile. Single photo only, no collage.",
    className: "scale-100",
  },
  {
    label: "정면",
    source: "front",
    prompt:
      "GRID SLOT: CENTER EXACT FRONT. Eye-level exact front-facing reference with both eyes, both cheeks, both eyebrows, and shoulders balanced. This is the canonical center reference for the hairstyle. No side gaze, no profile, no high/low angle, no mirrored orientation. Single portrait only, no collage.",
    className: "scale-100",
  },
  {
    label: "우측",
    source: "side",
    prompt:
      "GRID SLOT: MIDDLE RIGHT STRICT PROFILE. Camera is on the customer's own RIGHT side at eye level, 90-degree profile. Show the right ear, right temple, right sideburn, side hairline, side volume, and nape line clearly. Nose points toward viewer left. Not a diagonal three-quarter portrait, not front, not rear, not mirrored left profile. Single photo only, no collage.",
    className: "scale-100",
  },
  {
    label: "좌후면",
    source: "side",
    prompt:
      "GRID SLOT: LOWER LEFT REAR THREE-QUARTER. Camera is behind and slightly to the customer's own RIGHT side, looking at the back of the head. Show back-right crown, right rear head shape, right nape, neckline, and rear layer structure. Head is turned away from camera toward the customer's right; at most a small edge of right cheek or ear may appear. Not front portrait, not strict side profile, not exact rear center, not the opposite left-rear. Single photo only, no collage.",
    className: "scale-100",
  },
  {
    label: "후면",
    source: "side",
    prompt:
      "GRID SLOT: REAR CENTER EXACT BACK. Camera is directly behind the customer at eye level. Show back silhouette, crown volume, back layers, nape, neckline, and upper shoulders. No face, eyes, nose, or mouth visible. Not front, not side profile, not rear three-quarter. Single photo only, no collage.",
    className: "scale-100",
  },
  {
    label: "우후면",
    source: "side",
    prompt:
      "GRID SLOT: LOWER RIGHT REAR THREE-QUARTER. Camera is behind and slightly to the customer's own LEFT side, looking at the back of the head. Show back-left crown, left rear head shape, left nape, neckline, and rear layer structure. Head is turned away from camera toward the customer's left; at most a small edge of left cheek or ear may appear. Not front portrait, not strict side profile, not exact rear center, not the opposite right-rear. Single photo only, no collage.",
    className: "scale-100",
  },
] as const;

export function getStyleById(id: string) {
  return styleCatalog.find((style) => style.id === id);
}
