"use client";

/* eslint-disable @next/next/no-img-element */

import {
  ChangeEvent,
  ComponentPropsWithoutRef,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  Copy,
  Download,
  ExternalLink,
  ImagePlus,
  Info,
  Link,
  Loader2,
  Mail,
  RefreshCw,
  ScanFace,
  Search,
  Share2,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import {
  hairColorChartColumns,
  hairColorChartRows,
  hairColorChoices,
  type HairColorChoice,
} from "@/lib/mirilook-colors";
import {
  defaultRegion,
  getRegionPriorityStyleIds,
  getRegionProfile,
  getRegionSeedStylesByAudience,
  type MirilookRegionId,
} from "@/lib/mirilook-regions";
import {
  getMirilookRegionFromLocale,
  isMirilookLocale,
  mirilookLocaleStorageKey,
  type MirilookLocale,
} from "@/lib/mirilook-i18n";
import {
  defaultAudience,
  filterStylesByCurrentHairLength,
  getStylesByAudience,
  sanitizeHairLength,
  resultAngles,
  type MirilookAudience,
  type MirilookHairLength,
  type MirilookStyle,
  type MirilookStyleId,
} from "@/lib/mirilook-styles";
import {
  getSupabaseAccessToken,
  getSupabaseHistoryOwnerId,
} from "@/lib/supabase-browser";
import {
  HairMoneyExtraConsultationCost,
  HairMoneyRecommendationCost,
  HairMoneyRecommendationPriceKrw,
} from "@/lib/mirilook-payments";
import {
  getPrintableReportStatus,
  openPrintableHtmlReport,
} from "@/lib/printable-report";
import {
  enqueueBackgroundJob,
  fetchBackgroundStatus,
  isBackgroundGenerationEnabled,
  prepareBackgroundSession,
} from "@/lib/mirilook-background";
import { trackEvent } from "@/lib/mirilook-analytics";
import { MirilookGenerationRefundNotice } from "@/components/mirilook-generation-refund-notice";
import { MirilookHairMoneyStore } from "@/components/mirilook-hair-money-store";
import { MirilookPaymentPanel } from "@/components/mirilook-payment-panel";
import { assessFaceQuality, type FaceQualityResult } from "@/lib/face-quality";

type PhotoSlot = "left" | "front" | "right";
type ConsentPendingAction = PhotoSlot | "saved-profile";

type UploadedPhoto = {
  file: File;
  fileName: string;
  url: string;
};

type CelebrityReferencePhoto = UploadedPhoto & {
  id: string;
  sourceTitle?: string;
  sourceUrl?: string;
};

type CelebrityReferenceGroup = {
  id: string;
  label: string;
  photos: CelebrityReferencePhoto[];
};

type CelebrityImageSearchResult = {
  id: string;
  imageUrl: string;
  source?: string;
  thumbnailUrl?: string;
  title: string;
};

type DisplayRecommendation = MirilookStyle & {
  celebrityReferenceGroupId?: string;
  celebrityReferenceGroupLabel?: string;
  celebrityReferenceId?: string;
  celebrityReferenceIndex?: number;
  celebrityReferencePhotoCount?: number;
  celebrityReferenceTotal?: number;
  imageUrl?: string;
  isGenerating?: boolean;
  generationProgress?: number;
  error?: string;
  isCelebrityReference?: boolean;
  previewIndex?: number;
};

type RenderedResult = {
  label: string;
  imageUrl?: string;
  className?: string;
  isGenerating?: boolean;
  generationProgress?: number;
  error?: string;
};

type RenderedResultPreviewState = {
  index: number;
};

type HistoryImageItem = {
  imageUrl: string;
  label: string;
  reason?: string;
  slot?: PhotoSlot;
  styleName?: string;
  tags?: string[];
};

type ConsultationHistoryItem = {
  audienceName?: string;
  consultingFocusNames?: string[];
  createdAt: string;
  hairColorName: string;
  id: string;
  images: HistoryImageItem[];
  memo?: string;
  ownerId?: string;
  regionName?: string;
  makeupImages?: HistoryImageItem[];
  outfitImages?: HistoryImageItem[];
  recommendationImages?: HistoryImageItem[];
  sourcePhotos?: HistoryImageItem[];
  sourcePhotoCount: number;
  styleId: string;
  styleName: string;
  styleReason?: string;
  styleTags?: string[];
  salonProcess?: string;
  maintenanceAdvice?: string;
  outfitAdvice?: string;
  makeupAdvice?: string;
};

type ServerSaveResult = {
  reason?: string;
  saved: boolean;
  sessionId?: string;
};

type HistorySaveNoticeState = {
  id: number;
  message: string;
  status: "saving" | "complete" | "error";
};

type EmailSendResult = {
  reason?: string;
  sent: boolean;
  shareUrl?: string;
};

type ShareLinkResult = {
  created: boolean;
  expiresAt?: string;
  reason?: string;
  reused?: boolean;
  shareUrl?: string;
  token?: string;
};

type PaymentEntitlement = {
  active: boolean;
  expiresAt: string | null;
  productId: string | null;
};

type PaymentEntitlementResult = {
  entitlements?: Record<string, PaymentEntitlement>;
  reason?: string;
  synced?: boolean;
};

type CurrentConsultationIdentity = {
  createdAt: string;
  id: string;
};

type HistoryBuildOptions = {
  makeupImagesForHistory?: HistoryImageItem[];
  outfitImagesForHistory?: HistoryImageItem[];
  recommendationsForHistory?: DisplayRecommendation[];
  renderedResultsForHistory?: RenderedResult[];
  requireResultImages?: boolean;
  selectedStyleForHistory?: DisplayRecommendation | null;
};

type OutfitItemId =
  | "top"
  | "bottom"
  | "glasses"
  | "shoes"
  | "bag"
  | "watch"
  | "bracelet"
  | "necklace"
  | "earrings"
  | "hat"
  | "sunglasses"
  | "earphones"
  | "circle-lens";

type OutfitRecommendation = {
  description: string;
  href: string;
  id: OutfitItemId;
  imageUrl?: string;
  isGenerating?: boolean;
  error?: string;
  label: string;
  query: string;
  tags: string[];
};

type OutfitFullBodyState = {
  error?: string;
  imageUrl?: string;
  isGenerating: boolean;
};

type MakeupPreviewState = {
  baseImageUrl?: string;
  error?: string;
  imageUrl?: string;
  isGenerating: boolean;
  styleId?: string;
};

type ExpansionImagePreviewState = {
  description?: string;
  downloadFileName?: string;
  imageUrl: string;
  objectFit?: "contain" | "cover";
  objectPosition?: string;
  title: string;
  zoom?: number;
};

type MakeupZoneId =
  | "forehead"
  | "brow"
  | "eye"
  | "tzone"
  | "nose"
  | "butterfly"
  | "cheek"
  | "jawline"
  | "mouth";

type MakeupZoneGuide = {
  after: string;
  before: string;
  id: MakeupZoneId;
  label: string;
  objectPosition: string;
  why: string;
};

const analysisLines = [
  "내 사진을 바탕으로 어울리는 헤어스타일을 정교하게 추천합니다.",
  "Choose a look, preview it on your face, and bring a clearer reference to your stylist.",
  "마음에 드는 디자인을 누르면 크게 확인하고, 버튼을 눌러 상담용 9장을 생성할 수 있습니다.",
];

const premiumAddOnProductIds = ["premium-style-report"];
const showHaircutPreferencePanel = false;
const showPersonalConsultPanel = false;

const analysisLinesByAudience: Record<MirilookAudience, string[]> = {
  male: analysisLines,
  female: [
    "여성 헤어 전용 카탈로그를 기준으로 얼굴형, 길이감, 컬러 조화를 함께 봅니다.",
    "We recommend women's cuts, perms, layers, and color directions for salon consultation.",
    "마음에 드는 디자인을 크게 확인한 뒤, 같은 스타일의 상담용 9장 이미지를 생성할 수 있습니다.",
  ],
};

const audienceOptions: Array<{
  eyebrow: string;
  id: MirilookAudience;
  label: string;
}> = [
  {
    id: "male",
    label: "남성",
    eyebrow: "Men's grooming",
  },
  {
    id: "female",
    label: "여성",
    eyebrow: "Women's salon",
  },
];

type PreparedPhotos = {
  front: UploadedPhoto;
  frontSlot: PhotoSlot;
  side: UploadedPhoto;
  sideSlot: PhotoSlot;
  leftSide?: UploadedPhoto;
  rightSide?: UploadedPhoto;
  uploadedCount: number;
  uploadedSlots: PhotoSlot[];
};

type SavedProfilePhoto = {
  fileName: string;
  path: string;
  url: string;
} | null;

type SavedProfilePayload = {
  error?: string;
  profile?: {
    displayName: string;
    photos: Record<PhotoSlot, SavedProfilePhoto>;
  };
};

const photoSlotConfig: Array<{
  badge: string;
  hint: string;
  label: string;
  slot: PhotoSlot;
}> = [
  {
    badge: "추가 기준",
    hint: "왼쪽 얼굴선과 옆머리 볼륨을 봅니다.",
    label: "좌측면 사진",
    slot: "left",
  },
  {
    badge: "필수 권장",
    hint: "얼굴 비율과 앞머리 라인을 가장 정확히 봅니다.",
    label: "정면 사진",
    slot: "front",
  },
  {
    badge: "추가 기준",
    hint: "오른쪽 얼굴선과 두상 방향을 보완합니다.",
    label: "우측면 사진",
    slot: "right",
  },
];

type StyleLengthGroup = {
  label: string;
  styleIds: string[];
};

type ConsultingFocusId =
  | "personal-color"
  | "makeup-tone"
  | "outfit-mood"
  | "face-shape"
  | "salon-maintenance";

type RecommendationModeId = "current-length" | "face-fit";

type PremiumAddOnId = "outfit-coordination" | "makeup-style";

const consultingFocusOptions: Array<{
  id: ConsultingFocusId;
  label: string;
  prompt: string;
}> = [
  {
    id: "personal-color",
    label: "퍼스널 컬러",
    prompt:
      "Consider personal color harmony, skin undertone, hair color warmth/coolness, and whether the selected hair color brightens or dulls the complexion.",
  },
  {
    id: "makeup-tone",
    label: "메이크업 톤",
    prompt:
      "Consider makeup harmony: natural/no-makeup tone, lip and brow balance, and whether the hairstyle should look soft, clean, or defined around the face.",
  },
  {
    id: "outfit-mood",
    label: "의상 무드",
    prompt:
      "Consider clothing mood and styling purpose: casual, work, dating, profile photo, or salon consultation. Keep the recommendation wearable.",
  },
  {
    id: "face-shape",
    label: "얼굴형 보완",
    prompt:
      "Prioritize face-shape correction: face length, cheekbone width, jawline, forehead exposure, and face-framing pieces.",
  },
  {
    id: "salon-maintenance",
    label: "관리 난이도",
    prompt:
      "Explain salon maintenance: cut, perm, color, bleach, styling time, grow-out risk, and how often the style needs touch-ups.",
  },
];

const recommendationModeOptions: Array<{
  badge: string;
  description: string;
  id: RecommendationModeId;
  label: string;
  prompt: string;
}> = [
  {
    badge: "미용실용",
    description:
      "사진에 보이는 현재 머리 기장으로 오늘 상담 가능한 컷, 펌, 컬러를 우선 추천합니다.",
    id: "current-length",
    label: "현재 기장으로 가능한 스타일",
    prompt:
      "Recommendation mode: current-length salon consultation. This mode is mainly for salon use. Prioritize hairstyles that are realistically achievable from the customer's visible current hair length today or after a near-term trim, perm, down perm, or color. Do not recommend styles that require significant grow-out unless the user selected them and the reason clearly says that grow-out is needed.",
  },
  {
    badge: "개인용",
    description:
      "현재 기장에 묶이지 않고 얼굴형, 두상, 분위기에 가장 잘 맞는 스타일을 추천합니다.",
    id: "face-fit",
    label: "얼굴에 어울리는 스타일",
    prompt:
      "Recommendation mode: face-fit exploration. This mode is mainly for personal curiosity and future planning outside an immediate salon constraint. Prioritize hairstyles that best suit the customer's visible face shape, head shape, and personal impression even if the current hair length must grow out. When a style is not immediately achievable, explain the required grow-out, perm, color, or transition process honestly.",
  },
];

const premiumAddOnOptions: Array<{
  audience: "all" | MirilookAudience;
  description: string;
  id: PremiumAddOnId;
  label: string;
  prompt: string;
}> = [
  {
    audience: "all",
    description:
      "추천 헤어스타일에 맞춰 상의, 하의, 아우터, 액세서리, 컬러 무드까지 제안합니다.",
    id: "outfit-coordination",
    label: "코디 추천",
    prompt:
      "Premium add-on: outfit coordination. For every recommendation, include a concise clothing direction such as tops, bottoms, outerwear, accessories, color temperature, and styling occasion that harmonizes with the hairstyle. Keep it wearable and gender-mode appropriate.",
  },
];

const styleLengthGroupsByAudience: Record<MirilookAudience, StyleLengthGroup[]> = {
  male: [
    {
      label: "장발",
      styleIds: [
        "curtain-perm",
        "soft-wolf",
        "natural-wave",
        "slick-back-taper",
        "korean-mullet",
      ],
    },
    {
      label: "중발",
      styleIds: [
        "leaf-cut",
        "soft-parted",
        "shadow-perm",
        "comma-hair",
        "dandy-cut",
        "side-part-taper",
        "middle-part-layer",
        "wet-comma",
      ],
    },
    {
      label: "짧은 머리",
      styleIds: [
        "ivy-league",
        "crop-cut",
        "down-perm-two-block",
        "textured-fringe",
        "short-quiff",
        "french-crop",
        "buzz-taper",
        "semi-crop",
        "regent-cut",
        "short-mash",
        "two-block-cut",
        "low-fade-crop",
        "clean-upbang",
      ],
    },
  ],
  female: [
    {
      label: "장발",
      styleIds: [
        "long-layered-c-curl",
        "long-hush-cut",
        "build-perm",
        "loose-hippie-perm",
        "sleek-long-straight",
        "butterfly-layered",
        "elizabeth-perm",
        "hime-cut",
        "curtain-bang-long",
        "jelly-perm",
      ],
    },
    {
      label: "중단발",
      styleIds: [
        "side-bang-layered",
        "medium-layered-bob",
        "medium-c-curl",
        "medium-s-curl",
        "wolf-hush-women",
        "face-line-layer",
        "wavy-lob",
      ],
    },
    {
      label: "단발·숏컷",
      styleIds: [
        "tassel-bob",
        "cs-curl-bob",
        "short-bob",
        "soft-pixie",
        "rounded-short-cut",
        "layered-short-bob",
        "airy-bob-perm",
        "bob-with-bangs",
        "layered-cs-bob",
      ],
    },
  ],
};

const styleMemoExamplesByAudience: Record<MirilookAudience, string[]> = {
  male: [
    "옆머리가 많이 뜨는 편이라 슬림하게 눌러 보이게 해주세요.",
    "면접과 프로필 사진에 어울리게 단정하고 신뢰감 있게 해주세요.",
    "이마를 너무 많이 드러내지 않고 자연스럽게 보완해 주세요.",
    "관리 시간이 짧고 아침에 손질하기 쉬운 스타일이면 좋겠습니다.",
    "얼굴이 길어 보이지 않게 앞머리와 옆 볼륨을 조절해 주세요.",
    "너무 어려 보이지 않고 깔끔한 직장인 느낌으로 추천해 주세요.",
    "광대와 턱선이 부드러워 보이도록 헤어 라인을 잡아주세요.",
    "데이트나 소개팅에 어울리는 부드러운 인상으로 보고 싶습니다.",
  ],
  female: [
    "얼굴이 길어 보이지 않게 앞머리와 옆 라인을 부드럽게 잡아주세요.",
    "단발 기장은 유지하되 답답하지 않고 가벼운 분위기로 추천해 주세요.",
    "출근할 때 관리하기 쉽고 너무 튀지 않는 스타일이면 좋겠습니다.",
    "광대와 턱선이 부드럽게 보이도록 얼굴 주변 레이어를 반영해 주세요.",
    "여성스럽지만 과하지 않고 자연스러운 분위기로 보고 싶습니다.",
    "피부 톤이 맑아 보이는 컬러와 함께 추천해 주세요.",
    "사진 촬영이나 소개팅에 어울리는 세련된 느낌으로 추천해 주세요.",
    "머리숱이 많아 보여서 가볍고 차분하게 정리되는 스타일이 좋습니다.",
  ],
};

const makeupZoneGuides: MakeupZoneGuide[] = [
  {
    after:
      "헤어 앞머리와 연결되는 헤어라인을 매끈하게 정리하고, 이마 중앙은 얇게 밝혀 답답함을 줄입니다.",
    before:
      "이마 폭과 헤어라인이 먼저 보이는 영역입니다. 앞머리가 있는 스타일은 이마를 무겁게 덮지 않도록 베이스를 얇게 봅니다.",
    id: "forehead",
    label: "이마",
    objectPosition: "50% 20%",
    why: "앞머리 볼륨과 이마 밝기가 맞아야 얼굴 상단이 답답해 보이지 않습니다.",
  },
  {
    after:
      "눈썹 산은 강하게 꺾지 말고 헤어 컬러보다 살짝 밝은 브라운/그레이 톤으로 빈 곳만 채웁니다.",
    before:
      "눈썹은 첫인상을 좌우합니다. 헤어가 부드러우면 눈썹도 직선보다 완만한 결을 유지하는 편이 좋습니다.",
    id: "brow",
    label: "눈썹",
    objectPosition: "50% 34%",
    why: "헤어스타일이 바뀌면 눈썹 각도와 농도도 함께 맞춰야 얼굴이 따로 놀지 않습니다.",
  },
  {
    after:
      "아이라인은 속눈썹 사이만 채우고, 음영은 눈꼬리 바깥쪽에 얇게 쌓아 눈매가 또렷해 보이게 합니다.",
    before:
      "눈가가 진하면 헤어보다 메이크업이 먼저 보일 수 있습니다. 추천 헤어가 가진 분위기를 해치지 않는 농도가 중요합니다.",
    id: "eye",
    label: "눈가",
    objectPosition: "50% 39%",
    why: "눈가 음영은 얼굴 중심의 선명도를 올리되 사진에서는 과해 보이기 쉽습니다.",
  },
  {
    after:
      "T존은 얇은 하이라이트와 세미매트 파우더로 번들거림을 줄이고, 콧대 위쪽만 자연스럽게 살립니다.",
    before:
      "조명에 따라 T존은 실제보다 밝거나 번들거려 보일 수 있습니다. 광은 남기되 유분처럼 보이지 않게 조절합니다.",
    id: "tzone",
    label: "T존",
    objectPosition: "50% 45%",
    why: "헤어 볼륨이 있는 스타일일수록 얼굴 중앙의 정돈감이 전체 이미지를 고급스럽게 만듭니다.",
  },
  {
    after:
      "콧대 섀딩은 코 옆 전체를 진하게 칠하지 말고 눈앞머리와 콧망울 옆만 짧게 연결합니다.",
    before:
      "코 윤곽은 조금만 진해도 인상이 달라집니다. 사진 기반 추천에서는 얼굴 생김새가 바뀌지 않게 최소 보정이 안전합니다.",
    id: "nose",
    label: "코",
    objectPosition: "50% 48%",
    why: "얼굴 보존이 중요한 서비스라 코는 형태를 바꾸기보다 입체감만 정리해야 합니다.",
  },
  {
    after:
      "나비존은 모공 커버를 얇게 하고, 광대 앞쪽에만 은은한 생기를 더해 피부가 맑아 보이게 합니다.",
    before:
      "나비존은 홍조와 모공이 잘 보이는 영역입니다. 과한 커버보다 얇은 레이어링이 자연스럽습니다.",
    id: "butterfly",
    label: "나비존",
    objectPosition: "50% 53%",
    why: "헤어 컬러가 밝아질수록 나비존 피부 톤이 더 눈에 띄므로 균일도가 중요합니다.",
  },
  {
    after:
      "볼 끝은 헤어 톤과 맞는 블러셔를 낮게 넓게 펴서 얼굴이 길거나 납작해 보이지 않게 잡습니다.",
    before:
      "볼 끝 컬러가 없으면 사진에서 얼굴이 평평해 보일 수 있고, 너무 높으면 어려 보이는 느낌이 강해집니다.",
    id: "cheek",
    label: "볼 끝",
    objectPosition: "50% 58%",
    why: "볼 컬러 위치는 헤어 길이와 얼굴형 보정에 직접 영향을 줍니다.",
  },
  {
    after:
      "턱선은 진한 컨투어보다 목과 이어지는 경계만 정리하고, 헤어가 만드는 얼굴 폭과 균형을 맞춥니다.",
    before:
      "턱선을 과하게 줄이면 실제 얼굴과 달라 보일 수 있습니다. 미용실 상담용 이미지는 자연스러운 보존이 우선입니다.",
    id: "jawline",
    label: "턱선",
    objectPosition: "50% 68%",
    why: "헤어 실루엣이 얼굴 하관을 어떻게 감싸는지 볼 때 턱선 보정은 최소화해야 합니다.",
  },
  {
    after:
      "입 주변은 어둡게 죽지 않도록 얇게 정리하고, 립은 헤어 컬러와 충돌하지 않는 말린 장미/베이지 톤을 우선 봅니다.",
    before:
      "입 주변 그림자와 립 컬러는 전체 톤을 결정합니다. 헤어가 차분하면 립도 선명도보다 균형을 봅니다.",
    id: "mouth",
    label: "입 주변",
    objectPosition: "50% 64%",
    why: "립 컬러가 헤어 컬러와 맞으면 추천 이미지가 실제 스타일링처럼 설득력 있게 보입니다.",
  },
];

const liveAiEnabled = process.env.NEXT_PUBLIC_ENABLE_LIVE_AI === "true";
const apiBaseUrl = (process.env.NEXT_PUBLIC_GENERATION_API_URL ?? "").replace(
  /\/$/,
  "",
);

function resolveCountryButtonRegion(fallbackRegion: MirilookRegionId) {
  if (typeof window === "undefined") {
    return fallbackRegion;
  }

  const storedLocale = window.localStorage.getItem(mirilookLocaleStorageKey);

  return isMirilookLocale(storedLocale)
    ? getMirilookRegionFromLocale(storedLocale)
    : fallbackRegion;
}

const uploadImageMaxSide = 1024;
const uploadImageQuality = 0.68;
const priorityPreviewGenerationCount = 9;
const previewGenerationConcurrency = 9;
const angleGenerationConcurrency = 6;
const imageRequestRetryCount = 3;
const consultationAngleIndexes = {
  upperLeft: 0,
  top: 1,
  upperRight: 2,
  left: 3,
  front: 4,
  right: 5,
  lowerLeft: 6,
  rear: 7,
  lowerRight: 8,
} as const;
const historyLimit = 6;
const historyDbName = "mirilook-mirror-history";
const historyStoreName = "consultations";
const celebrityReferenceStyleId = "celebrity-reference";
const maxCelebrityReferenceCount = 9;
const maxCelebrityReferencePhotosPerGroup = 4;
const initialCelebrityReferenceGroup: CelebrityReferenceGroup = {
  id: "celebrity-group-1",
  label: "연예인 1",
  photos: [],
};

export function MirilookStudio() {
  const [photos, setPhotos] = useState<Record<PhotoSlot, UploadedPhoto | null>>({
    left: null,
    front: null,
    right: null,
  });
  // Browser-side (no token cost) face-quality readout per upload slot, shown as a
  // chip under each photo so the customer knows whether to keep or replace it.
  const [photoQuality, setPhotoQuality] = useState<
    Record<PhotoSlot, FaceQualityResult | "analyzing" | null>
  >({ left: null, front: null, right: null });
  const assessedPhotoFilesRef = useRef<Record<PhotoSlot, File | null>>({
    left: null,
    front: null,
    right: null,
  });

  useEffect(() => {
    let cancelled = false;
    const slots: PhotoSlot[] = ["left", "front", "right"];

    slots.forEach((slot) => {
      const file = photos[slot]?.file ?? null;

      // Only (re)assess when the actual file changed; covers upload + saved-load.
      if (file === assessedPhotoFilesRef.current[slot]) {
        return;
      }

      assessedPhotoFilesRef.current[slot] = file;

      if (!file) {
        setPhotoQuality((current) => ({ ...current, [slot]: null }));

        return;
      }

      setPhotoQuality((current) => ({ ...current, [slot]: "analyzing" }));

      void assessFaceQuality(file)
        .then((result) => {
          if (!cancelled) {
            setPhotoQuality((current) => ({ ...current, [slot]: result }));
          }
        })
        .catch(() => {
          if (!cancelled) {
            setPhotoQuality((current) => ({ ...current, [slot]: null }));
          }
        });
    });

    return () => {
      cancelled = true;
    };
  }, [photos]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingPreviews, setIsGeneratingPreviews] = useState(false);
  const [analysisReady, setAnalysisReady] = useState(false);
  const [selectedRegion, setSelectedRegion] =
    useState<MirilookRegionId>(defaultRegion);
  const [selectedAudience, setSelectedAudience] =
    useState<MirilookAudience>(defaultAudience);
  const [recommendations, setRecommendations] =
    useState<DisplayRecommendation[]>(
      getRegionSeedStylesByAudience(defaultRegion, defaultAudience),
    );
  const [analysisNotes, setAnalysisNotes] = useState(
    analysisLinesByAudience[defaultAudience],
  );
  const [preferredStyleIds, setPreferredStyleIds] = useState<string[]>([]);
  const [activeInfoStyleId, setActiveInfoStyleId] = useState<string | null>(
    getStylesByAudience(defaultAudience)[0]?.id ?? null,
  );
  const [selectedHairColorId, setSelectedHairColorId] =
    useState("natural-black");
  const [selectedStyleId, setSelectedStyleId] = useState<MirilookStyleId | null>(
    null,
  );
  const [isRendering, setIsRendering] = useState(false);
  const [renderedResults, setRenderedResults] = useState<RenderedResult[]>([]);
  // One recommendation cycle includes the first consultation set for free.
  // Generating an additional set for a different recommended style charges
  // Hair Money after a confirmation popup. Reset whenever new recommendations
  // are produced (a new cycle begins).
  const [consultationCycleUsed, setConsultationCycleUsed] = useState(false);
  const [extraConsultationStyle, setExtraConsultationStyle] =
    useState<DisplayRecommendation | null>(null);
  const [extraConsultationCharging, setExtraConsultationCharging] =
    useState(false);
  // When the extra-consultation charge fails for lack of Hair Money, we keep the
  // current recommendation screen and open the store as an in-page popup so the
  // customer can top up and resume generating the style they already picked.
  const [extraConsultationStore, setExtraConsultationStore] = useState<{
    style: DisplayRecommendation;
    cost: number;
    balance: number | null;
  } | null>(null);
  const [isDownloadingRenderedResults, setIsDownloadingRenderedResults] =
    useState(false);
  const [mirroredResultLabels, setMirroredResultLabels] = useState<Set<string>>(
    () => new Set(),
  );
  const [renderedResultPreview, setRenderedResultPreview] =
    useState<RenderedResultPreviewState | null>(null);
  const [outfitRecommendations, setOutfitRecommendations] = useState<
    OutfitRecommendation[]
  >([]);
  // Target wear-date for TPO/season-aware outfit recommendations (empty = today).
  const [outfitOccasionDate, setOutfitOccasionDate] = useState("");
  const [outfitFullBody, setOutfitFullBody] = useState<OutfitFullBodyState>({
    isGenerating: false,
  });
  const [makeupPreview, setMakeupPreview] = useState<MakeupPreviewState>({
    isGenerating: false,
  });
  const [statusMessage, setStatusMessage] = useState("");
  const [historySaveNotice, setHistorySaveNotice] =
    useState<HistorySaveNoticeState | null>(null);
  const [isLoadingSavedPhotos, setIsLoadingSavedPhotos] = useState(false);
  const [historyItems, setHistoryItems] = useState<ConsultationHistoryItem[]>(
    [],
  );
  const [historyStatus, setHistoryStatus] = useState("");
  const [emailRecipient, setEmailRecipient] = useState("");
  const [isEmailSending, setIsEmailSending] = useState(false);
  const [isShareCreating, setIsShareCreating] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [consentPopupAction, setConsentPopupAction] =
    useState<ConsentPendingAction | null>(null);
  const [styleMemo, setStyleMemo] = useState("");
  const [celebrityReferenceGroups, setCelebrityReferenceGroups] = useState<
    CelebrityReferenceGroup[]
  >([initialCelebrityReferenceGroup]);
  const [activeCelebrityReferenceGroupId, setActiveCelebrityReferenceGroupId] =
    useState(initialCelebrityReferenceGroup.id);
  const [recommendationMode, setRecommendationMode] =
    useState<RecommendationModeId>("current-length");
  const [premiumAddOnIds, setPremiumAddOnIds] = useState<PremiumAddOnId[]>([]);
  const [paymentEntitlements, setPaymentEntitlements] = useState<
    Record<string, PaymentEntitlement>
  >({});
  const [paymentEntitlementStatus, setPaymentEntitlementStatus] =
    useState("프리미엄 권한을 확인하는 중입니다.");
  const [consultingFocusIds, setConsultingFocusIds] = useState<
    ConsultingFocusId[]
  >([]);
  const leftInputRef = useRef<HTMLInputElement>(null);
  const frontInputRef = useRef<HTMLInputElement>(null);
  const rightInputRef = useRef<HTMLInputElement>(null);
  const celebrityInputRef = useRef<HTMLInputElement>(null);
  const createdUrlsRef = useRef<Set<string>>(new Set());
  const analysisTimerRef = useRef<number | null>(null);
  const previewRunRef = useRef(0);
  const renderRunRef = useRef(0);
  // Phase 1 background-generation groundwork: holds the pre-uploaded session so
  // a future server-side job (Phase 3) can render from it. Only populated when
  // the background flag is enabled; otherwise stays null and unused.
  const backgroundSessionRef = useRef<{
    sessionId: string;
    sourceAssetPaths: string[];
  } | null>(null);
  const currentConsultationRef =
    useRef<CurrentConsultationIdentity | null>(null);
  const styleExpansionPanelRef = useRef<HTMLDivElement | null>(null);

  const readyPhotos = getPreparedPhotos(photos);
  const frontPhoto = readyPhotos?.front ?? photos.front ?? photos.left ?? photos.right;
  const sidePhoto = readyPhotos?.side ?? photos.left ?? photos.right ?? photos.front;
  const hasAnyPhoto = Object.values(photos).some(Boolean);
  const uploadedPhotoCount = Object.values(photos).filter(Boolean).length;
  const missingPhotoCount = Math.max(0, 2 - uploadedPhotoCount);
  const isRecommendationBusy = isAnalyzing || isGeneratingPreviews;
  const shouldPulseRecommendationCta =
    Boolean(readyPhotos) && !isRecommendationBusy && !analysisReady;
  const recommendationCtaLabel = getRecommendationCtaLabel({
    isAnalyzing,
    isGeneratingPreviews,
    missingPhotoCount,
    privacyAccepted,
    ready: Boolean(readyPhotos),
    uploadedPhotoCount,
  });
  const selectedStyle = useMemo(
    () => recommendations.find((style) => style.id === selectedStyleId),
    [recommendations, selectedStyleId],
  );
  const renderedResultImageCount = renderedResults.filter((result) =>
    Boolean(result.imageUrl),
  ).length;
  const selectedHairColor =
    hairColorChoices.find((color) => color.id === selectedHairColorId) ??
    hairColorChoices[0];
  const audienceStyles = useMemo(
    () => getStylesByAudience(selectedAudience),
    [selectedAudience],
  );
  const audienceStyleGroups = styleLengthGroupsByAudience[selectedAudience];
  const audienceFallbackStyles = useMemo(
    () => getRegionSeedStylesByAudience(selectedRegion, selectedAudience),
    [selectedAudience, selectedRegion],
  );
  const selectedAudienceOption =
    audienceOptions.find((option) => option.id === selectedAudience) ??
    audienceOptions[0];
  const selectedRegionProfile = getRegionProfile(selectedRegion);
  const premiumAddOnsActive = Boolean(
    paymentEntitlements.premium_addons?.active,
  );
  const celebrityReferenceGroupsWithPhotos = useMemo(
    () => celebrityReferenceGroups.filter((group) => group.photos.length),
    [celebrityReferenceGroups],
  );
  const applyLocaleRegion = useCallback(
    (nextLocale: MirilookLocale, announce = false) => {
      const nextRegion = getMirilookRegionFromLocale(nextLocale);

      if (nextRegion === selectedRegion) {
        return;
      }

      if (analysisTimerRef.current) {
        window.clearTimeout(analysisTimerRef.current);
        analysisTimerRef.current = null;
      }

      const nextRegionProfile = getRegionProfile(nextRegion);
      const allowedPremiumAddOnIds = premiumAddOnsActive
        ? getAllowedPremiumAddOnIds(premiumAddOnIds, selectedAudience)
        : [];
      const nextFallbackStyles = applyCelebrityReferenceRecommendation(
        buildRecommendationSet(
          getRegionSeedStylesByAudience(nextRegion, selectedAudience),
          [],
          selectedHairColor,
          styleMemo,
          selectedAudience,
          consultingFocusIds,
          nextRegion,
          recommendationMode,
          allowedPremiumAddOnIds,
        ),
        celebrityReferenceGroupsWithPhotos,
        selectedHairColor,
        styleMemo,
        consultingFocusIds,
        selectedAudience,
        nextRegion,
        recommendationMode,
        allowedPremiumAddOnIds,
      );

      setSelectedRegion(nextRegion);
      setPreferredStyleIds([]);
      setActiveInfoStyleId(nextFallbackStyles[0]?.id ?? null);
      setRecommendations(nextFallbackStyles);
      setAnalysisNotes([
        ...analysisLinesByAudience[selectedAudience],
        `${nextRegionProfile.label} 국가 기준 월간 트렌드 캐시와 기본 seed를 추천 우선순위에 반영합니다.`,
      ]);
      setAnalysisReady(false);
      setSelectedStyleId(null);
      setRenderedResults([]);
      setShareUrl("");
      setIsRendering(false);
      setIsAnalyzing(false);
      setIsGeneratingPreviews(false);
      currentConsultationRef.current = null;
      previewRunRef.current += 1;
      renderRunRef.current += 1;

      if (announce) {
        setStatusMessage(
          `${nextRegionProfile.label} 트렌드 기준으로 전환했습니다. 추천 받기를 누르면 해당 국가의 월간 리서치 캐시와 seed를 반영합니다.`,
        );
      }
    },
    [
      celebrityReferenceGroupsWithPhotos,
      consultingFocusIds,
      premiumAddOnIds,
      premiumAddOnsActive,
      recommendationMode,
      selectedAudience,
      selectedHairColor,
      selectedRegion,
      styleMemo,
    ],
  );

  useEffect(() => {
    const createdUrls = createdUrlsRef.current;

    return () => {
      if (analysisTimerRef.current) {
        window.clearTimeout(analysisTimerRef.current);
      }

      createdUrls.forEach((url) => URL.revokeObjectURL(url));
      createdUrls.clear();
    };
  }, []);

  useEffect(() => {
    const storedLocale = window.localStorage.getItem(mirilookLocaleStorageKey);
    const syncTimer = isMirilookLocale(storedLocale)
      ? window.setTimeout(() => applyLocaleRegion(storedLocale), 0)
      : null;

    function handleLocaleChange(event: Event) {
      const nextLocale = (event as CustomEvent<MirilookLocale>).detail;

      if (isMirilookLocale(nextLocale)) {
        applyLocaleRegion(nextLocale, true);
      }
    }

    window.addEventListener("mirilook:locale-change", handleLocaleChange);

    return () => {
      if (syncTimer) {
        window.clearTimeout(syncTimer);
      }

      window.removeEventListener("mirilook:locale-change", handleLocaleChange);
    };
  }, [applyLocaleRegion]);

  useEffect(() => {
    let active = true;

    void loadConsultationHistory()
      .then((items) => {
        if (active) {
          setHistoryItems(items);
        }
      })
      .catch((error) => {
        console.error(error);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    void loadPaymentEntitlements()
      .then((result) => {
        if (!active) {
          return;
        }

        setPaymentEntitlements(result.entitlements ?? {});
        setPaymentEntitlementStatus(buildPaymentEntitlementStatus(result));
      })
      .catch((error) => {
        console.error(error);

        if (active) {
          setPaymentEntitlementStatus(
            "프리미엄 권한 확인이 지연되고 있습니다. 로그인과 결제 상태를 확인한 뒤 다시 시도해 주세요.",
          );
        }
      });

    return () => {
      active = false;
    };
  }, []);

  async function refreshPremiumEntitlementsAfterPayment() {
    setPaymentEntitlementStatus("프리미엄 권한을 다시 확인하는 중입니다.");

    try {
      const result = await loadPaymentEntitlements();

      setPaymentEntitlements(result.entitlements ?? {});
      setPaymentEntitlementStatus(buildPaymentEntitlementStatus(result));

      if (result.entitlements?.premium_addons?.active) {
        setStatusMessage(
          "프리미엄 스타일 리포트 권한이 활성화되었습니다. 코디와 메이크업 확장 상담을 선택할 수 있습니다.",
        );
      } else {
        setStatusMessage(
          "결제 확인 후 권한 동기화가 지연되고 있습니다. 잠시 후 다시 확인해 주세요.",
        );
      }
    } catch (error) {
      console.error(error);
      setPaymentEntitlementStatus(
        "프리미엄 권한 확인이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.",
      );
    }
  }

  async function handlePhotoChange(
    slot: PhotoSlot,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const originalFile = event.target.files?.[0];

    if (!privacyAccepted) {
      setStatusMessage("사진 업로드 전 개인정보 안내와 AI 참고용 고지에 동의해 주세요.");
      setConsentPopupAction(slot);
      event.target.value = "";
      return;
    }

    if (!originalFile) {
      return;
    }

    if (analysisTimerRef.current) {
      window.clearTimeout(analysisTimerRef.current);
      analysisTimerRef.current = null;
    }

    setIsAnalyzing(false);
    setIsGeneratingPreviews(false);
    setAnalysisReady(false);
    setSelectedStyleId(null);
    setRenderedResults([]);
    setMirroredResultLabels(new Set());
    setOutfitRecommendations([]);
    setOutfitFullBody({ isGenerating: false });
    setMakeupPreview({ isGenerating: false });
    resetCurrentConsultationIdentity();
    getCurrentConsultationIdentity();
    setIsRendering(false);
    setStatusMessage("사진을 업로드용으로 정리하는 중입니다.");
    previewRunRef.current += 1;
    renderRunRef.current += 1;

    try {
      const file = await prepareUploadImage(originalFile);
      const nextUrl = URL.createObjectURL(file);
      const nextPhoto = {
        file,
        fileName: originalFile.name,
        url: nextUrl,
      };
      const nextPhotos = {
        ...photos,
        [slot]: nextPhoto,
      };

      setPhotos((current) => {
        const previous = current[slot];

        if (previous?.url) {
          URL.revokeObjectURL(previous.url);
          createdUrlsRef.current.delete(previous.url);
        }

        createdUrlsRef.current.add(nextUrl);

        return {
          ...current,
          [slot]: nextPhoto,
        };
      });

      const nextReadyPhotos = getPreparedPhotos(nextPhotos);

      if (nextReadyPhotos) {
        setStatusMessage(
          "사진이 준비되었습니다. 원하는 컷과 컬러를 고른 뒤 추천 받기를 눌러주세요.",
        );
      } else {
        setStatusMessage(
          "사진이 업로드되었습니다. 좌측면, 정면, 우측면 중 1장을 더 올려주세요.",
        );
      }
    } catch (error) {
      console.error(error);
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "사진을 준비하지 못했습니다. 다른 이미지로 다시 시도해 주세요.",
      );
    } finally {
      event.target.value = "";
    }
  }

  async function handleCelebrityReferenceChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const selectedFiles = Array.from(event.target.files ?? []);

    if (!selectedFiles.length) {
      return;
    }

    try {
      await addCelebrityReferenceFiles(
        selectedFiles,
        {
          sourceTitle: "직접 업로드",
        },
        activeCelebrityReferenceGroupId,
      );
    } finally {
      event.target.value = "";
    }
  }

  async function handleCelebrityReferenceUrlAdd(
    groupId: string,
    imageUrl: string,
    sourceTitle?: string,
  ) {
    const trimmedUrl = imageUrl.trim();

    if (!trimmedUrl) {
      return;
    }

    const targetGroup = getCelebrityReferenceGroupById(
      celebrityReferenceGroups,
      groupId,
    );

    if (!targetGroup) {
      setStatusMessage("연예인 레퍼런스 그룹을 먼저 선택해 주세요.");
      return;
    }

    if (
      !targetGroup.photos.length &&
      celebrityReferenceGroupsWithPhotos.length >= maxCelebrityReferenceCount
    ) {
      setStatusMessage(
        `연예인 헤어 레퍼런스는 최대 ${maxCelebrityReferenceCount}명까지 사용할 수 있습니다.`,
      );
      return;
    }

    if (targetGroup.photos.length >= maxCelebrityReferencePhotosPerGroup) {
      setStatusMessage(
        `${targetGroup.label}에는 사진을 최대 ${maxCelebrityReferencePhotosPerGroup}장까지 넣을 수 있습니다.`,
      );
      return;
    }

    if (analysisTimerRef.current) {
      window.clearTimeout(analysisTimerRef.current);
      analysisTimerRef.current = null;
    }

    resetGeneratedStateForCelebrityReferenceChange();
    setStatusMessage("링크 이미지에서 연예인 헤어 레퍼런스를 불러오는 중입니다.");

    const response = await fetch(
      `${apiBaseUrl}/api/hairstyles/celebrity-reference/`,
      {
        body: JSON.stringify({
          title: sourceTitle,
          url: trimmedUrl,
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      },
    );

    if (!response.ok) {
      throw new Error(await readApiError(response));
    }

    const blob = await response.blob();
    const file = new File(
      [blob],
      toJpegName(buildCelebrityReferenceFileName(sourceTitle ?? trimmedUrl)),
      {
        type: blob.type || "image/jpeg",
      },
    );

    const added = await addCelebrityReferenceFiles(
      [file],
      {
        sourceTitle: sourceTitle || "링크 이미지",
        sourceUrl: trimmedUrl,
      },
      groupId,
    );

    if (!added) {
      throw new Error("이미지를 레퍼런스로 추가하지 못했습니다.");
    }
  }

  async function addCelebrityReferenceFiles(
    selectedFiles: File[],
    metadata: {
      sourceTitle?: string;
      sourceUrl?: string;
    } = {},
    groupId = activeCelebrityReferenceGroupId,
  ) {
    if (analysisTimerRef.current) {
      window.clearTimeout(analysisTimerRef.current);
      analysisTimerRef.current = null;
    }

    resetGeneratedStateForCelebrityReferenceChange();
    setStatusMessage("연예인 헤어 레퍼런스를 업로드용으로 정리하는 중입니다.");

    try {
      const targetGroup = getCelebrityReferenceGroupById(
        celebrityReferenceGroups,
        groupId,
      );

      if (!targetGroup) {
        setStatusMessage("연예인 레퍼런스 그룹을 먼저 선택해 주세요.");
        return false;
      }

      if (
        !targetGroup.photos.length &&
        celebrityReferenceGroupsWithPhotos.length >= maxCelebrityReferenceCount
      ) {
        setStatusMessage(
          `연예인 헤어 레퍼런스는 최대 ${maxCelebrityReferenceCount}명까지 사용할 수 있습니다.`,
        );
        return false;
      }

      const remainingSlots = Math.max(
        0,
        maxCelebrityReferencePhotosPerGroup - targetGroup.photos.length,
      );
      const filesToPrepare = selectedFiles.slice(0, remainingSlots);

      if (!filesToPrepare.length) {
        setStatusMessage(
          `${targetGroup.label}에는 사진을 최대 ${maxCelebrityReferencePhotosPerGroup}장까지 넣을 수 있습니다.`,
        );
        return false;
      }

      const preparedReferences = await Promise.all(
        filesToPrepare.map(async (originalFile) => {
          const file = await prepareUploadImage(originalFile);
          const url = URL.createObjectURL(file);
          const randomPart =
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

          createdUrlsRef.current.add(url);

          return {
            file,
            fileName: originalFile.name,
            id: `celebrity-${randomPart}`,
            sourceTitle: metadata.sourceTitle,
            sourceUrl: metadata.sourceUrl,
            url,
          } satisfies CelebrityReferencePhoto;
        }),
      );

      setCelebrityReferenceGroups((current) =>
        normalizeCelebrityReferenceGroupLabels(
          current.map((group) =>
            group.id === targetGroup.id
              ? {
                  ...group,
                  photos: [...group.photos, ...preparedReferences],
                }
              : group,
          ),
        ),
      );
      const nextReferenceGroupCount = Math.min(
        maxCelebrityReferenceCount,
        celebrityReferenceGroupsWithPhotos.length +
          (targetGroup.photos.length ? 0 : 1),
      );
      const regularCount = Math.max(0, 9 - nextReferenceGroupCount);

      setStatusMessage(
        `${targetGroup.label}에 사진 ${preparedReferences.length}장을 추가했습니다. 추천 9장은 일반 추천 ${regularCount}장과 연예인 레퍼런스 추천 ${nextReferenceGroupCount}장으로 구성됩니다.`,
      );
      return true;
    } catch (error) {
      console.error(error);
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "연예인 헤어 레퍼런스를 준비하지 못했습니다. 다른 이미지로 다시 시도해 주세요.",
      );
      return false;
    }
  }

  function resetGeneratedStateForCelebrityReferenceChange() {
    setIsAnalyzing(false);
    setIsGeneratingPreviews(false);
    setAnalysisReady(false);
    setSelectedStyleId(null);
    setRenderedResults([]);
    setOutfitRecommendations([]);
    setOutfitFullBody({ isGenerating: false });
    setMakeupPreview({ isGenerating: false });
    setIsRendering(false);
    setShareUrl("");
    previewRunRef.current += 1;
    renderRunRef.current += 1;
  }

  function addCelebrityReferenceGroup() {
    const hasEmptyGroup = celebrityReferenceGroups.some(
      (group) => !group.photos.length,
    );

    if (hasEmptyGroup) {
      const emptyGroup = celebrityReferenceGroups.find(
        (group) => !group.photos.length,
      );

      if (emptyGroup) {
        setActiveCelebrityReferenceGroupId(emptyGroup.id);
      }

      setStatusMessage("비어 있는 연예인 레퍼런스 그룹에 사진을 추가해 주세요.");
      return;
    }

    if (celebrityReferenceGroupsWithPhotos.length >= maxCelebrityReferenceCount) {
      setStatusMessage(
        `연예인 헤어 레퍼런스는 최대 ${maxCelebrityReferenceCount}명까지 사용할 수 있습니다.`,
      );
      return;
    }

    const nextGroup = createCelebrityReferenceGroup(celebrityReferenceGroups.length);

    setCelebrityReferenceGroups((current) =>
      normalizeCelebrityReferenceGroupLabels([...current, nextGroup]),
    );
    setActiveCelebrityReferenceGroupId(nextGroup.id);
    setStatusMessage(`${nextGroup.label} 그룹을 추가했습니다. 사진을 넣어주세요.`);
  }

  function removeCelebrityReferencePhoto(groupId: string, referenceId: string) {
    setCelebrityReferenceGroups((current) => {
      const targetGroup = current.find((group) => group.id === groupId);
      const reference = targetGroup?.photos.find((item) => item.id === referenceId);

      if (reference?.url) {
        URL.revokeObjectURL(reference.url);
        createdUrlsRef.current.delete(reference.url);
      }

      return normalizeCelebrityReferenceGroupLabels(
        current.map((group) =>
          group.id === groupId
            ? {
                ...group,
                photos: group.photos.filter((item) => item.id !== referenceId),
              }
            : group,
        ),
      );
    });
    resetGeneratedStateForCelebrityReferenceChange();
    setStatusMessage("연예인 헤어 레퍼런스가 변경되었습니다. 추천 받기를 눌러주세요.");
  }

  function removeCelebrityReferenceGroup(groupId: string) {
    setCelebrityReferenceGroups((current) => {
      const targetGroup = current.find((group) => group.id === groupId);

      targetGroup?.photos.forEach((reference) => {
        if (reference.url) {
          URL.revokeObjectURL(reference.url);
          createdUrlsRef.current.delete(reference.url);
        }
      });

      const remainingGroups = current.filter((group) => group.id !== groupId);
      const nextGroups = normalizeCelebrityReferenceGroupLabels(
        remainingGroups.length
          ? remainingGroups
          : [{ ...initialCelebrityReferenceGroup, photos: [] }],
      );

      setActiveCelebrityReferenceGroupId((activeId) =>
        nextGroups.some((group) => group.id === activeId)
          ? activeId
          : nextGroups[0].id,
      );

      return nextGroups;
    });
    resetGeneratedStateForCelebrityReferenceChange();
    setStatusMessage("연예인 레퍼런스 그룹을 삭제했습니다. 추천 받기를 눌러주세요.");
  }

  function clearCelebrityReferences() {
    celebrityReferenceGroups.forEach((group) => {
      group.photos.forEach((reference) => {
        if (reference.url) {
          URL.revokeObjectURL(reference.url);
          createdUrlsRef.current.delete(reference.url);
        }
      });
    });
    setCelebrityReferenceGroups([{ ...initialCelebrityReferenceGroup, photos: [] }]);
    setActiveCelebrityReferenceGroupId(initialCelebrityReferenceGroup.id);
    setIsGeneratingPreviews(false);
    setAnalysisReady(false);
    setSelectedStyleId(null);
    setRenderedResults([]);
    setOutfitRecommendations([]);
    setOutfitFullBody({ isGenerating: false });
    setMakeupPreview({ isGenerating: false });
    resetCurrentConsultationIdentity();
    setShareUrl("");
    setStatusMessage("연예인 헤어 레퍼런스를 모두 삭제했습니다. 기존 추천 방식으로 진행합니다.");
    previewRunRef.current += 1;
    renderRunRef.current += 1;
  }

  async function loadSavedProfilePhotos(skipConsentCheck = false) {
    if (!privacyAccepted && !skipConsentCheck) {
      setStatusMessage("사진 업로드 전 개인정보 안내와 AI 참고용 고지에 동의해 주세요.");
      setConsentPopupAction("saved-profile");
      return;
    }

    setIsLoadingSavedPhotos(true);
    setStatusMessage("마이페이지에 저장된 내 사진을 불러오는 중입니다.");

    try {
      const token = await getSupabaseAccessToken();

      if (!token) {
        setStatusMessage("내 사진을 불러오려면 먼저 로그인해 주세요.");
        return;
      }

      const response = await fetch(`${apiBaseUrl}/api/profile/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const payload = (await response.json().catch(() => null)) as
        | SavedProfilePayload
        | null;

      if (!response.ok || !payload?.profile) {
        setStatusMessage(
          payload?.error ?? "저장된 내 사진을 불러오지 못했습니다.",
        );
        return;
      }

      const nextEntries = await Promise.all(
        photoSlotConfig.map(async ({ slot }) => {
          const savedPhoto = payload.profile?.photos[slot];

          if (!savedPhoto?.path && !savedPhoto?.url) {
            return [slot, null] as const;
          }

          const photoResponse = await fetchSavedProfilePhoto(
            slot,
            savedPhoto,
            token,
          );

          if (!photoResponse.ok) {
            throw new Error(`${getSlotLabel(slot)}을 불러오지 못했습니다.`);
          }

          const blob = await photoResponse.blob();
          const rawFile = new File(
            [blob],
            savedPhoto.fileName || `mirilook-${slot}.jpg`,
            {
              type: blob.type || "image/jpeg",
            },
          );
          const file = await prepareUploadImage(rawFile);
          const url = URL.createObjectURL(file);

          return [
            slot,
            {
              file,
              fileName: savedPhoto.fileName || rawFile.name,
              url,
            },
          ] as const;
        }),
      );
      const nextPhotos = Object.fromEntries(nextEntries) as Record<
        PhotoSlot,
        UploadedPhoto | null
      >;
      const loadedCount = Object.values(nextPhotos).filter(Boolean).length;

      if (!loadedCount) {
        setStatusMessage(
          "마이페이지에 저장된 추천용 사진이 없습니다. 마이페이지에서 먼저 좌측면/정면/우측면 사진을 저장해 주세요.",
        );
        return;
      }

      Object.values(photos).forEach((photo) => {
        if (photo?.url) {
          URL.revokeObjectURL(photo.url);
          createdUrlsRef.current.delete(photo.url);
        }
      });
      Object.values(nextPhotos).forEach((photo) => {
        if (photo?.url) {
          createdUrlsRef.current.add(photo.url);
        }
      });

      if (analysisTimerRef.current) {
        window.clearTimeout(analysisTimerRef.current);
        analysisTimerRef.current = null;
      }

      setPhotos(nextPhotos);
      setPrivacyAccepted(true);
      setIsAnalyzing(false);
      setIsGeneratingPreviews(false);
      setAnalysisReady(false);
      setSelectedStyleId(null);
      setRenderedResults([]);
      resetCurrentConsultationIdentity();
      setIsRendering(false);
      setShareUrl("");
      previewRunRef.current += 1;
      renderRunRef.current += 1;

      setStatusMessage(
        getPreparedPhotos(nextPhotos)
          ? `${payload.profile.displayName}님의 저장 사진 ${loadedCount}장을 불러왔습니다. 바로 추천 받기를 누를 수 있습니다.`
          : `저장 사진 ${loadedCount}장을 불러왔습니다. 추천을 위해 사진을 1장 더 추가해 주세요.`,
      );
    } catch (error) {
      console.error(error);
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "저장된 내 사진을 불러오지 못했습니다.",
      );
    } finally {
      setIsLoadingSavedPhotos(false);
    }
  }

  async function generateRecommendations(
    currentPhotos: PreparedPhotos,
  ) {
    const runId = ++previewRunRef.current;
    const currentAudience = selectedAudience;
    const currentRecommendationMode = recommendationMode;
    const currentPremiumAddOnIds = premiumAddOnsActive
      ? getAllowedPremiumAddOnIds(premiumAddOnIds, currentAudience)
      : [];
    const currentCelebrityReferenceGroups = celebrityReferenceGroupsWithPhotos.map(
      (group) => ({
        ...group,
        photos: [...group.photos],
      }),
    );
    const currentRegion = resolveCountryButtonRegion(selectedRegion);
    const currentRegionProfile = getRegionProfile(currentRegion);
    const fallbackNotes = analysisLinesByAudience[currentAudience];
    const fallbackStyles = getRegionSeedStylesByAudience(
      currentRegion,
      currentAudience,
    );
    const audienceLabel =
      currentAudience === "female" ? "여성 헤어" : "남성 헤어";
    let canShowRecommendationResults = false;

    if (currentRegion !== selectedRegion) {
      setSelectedRegion(currentRegion);
    }

    setIsAnalyzing(true);
    setIsGeneratingPreviews(false);
    setAnalysisReady(false);
    setSelectedStyleId(null);
    setRenderedResults([]);
    setOutfitRecommendations([]);
    setOutfitFullBody({ isGenerating: false });
    setMakeupPreview({ isGenerating: false });
    resetCurrentConsultationIdentity();
    setIsRendering(false);
    setRecommendations(
      applyCelebrityReferenceRecommendation(
        buildRecommendationSet(
          fallbackStyles,
          preferredStyleIds,
          selectedHairColor,
          styleMemo,
          currentAudience,
          consultingFocusIds,
          currentRegion,
          currentRecommendationMode,
          currentPremiumAddOnIds,
        ),
        currentCelebrityReferenceGroups,
        selectedHairColor,
        styleMemo,
        consultingFocusIds,
        currentAudience,
        currentRegion,
        currentRecommendationMode,
        currentPremiumAddOnIds,
      ),
    );
    setAnalysisNotes(fallbackNotes);
    setStatusMessage(
      liveAiEnabled
        ? `${currentRegionProfile.label} 기준으로 사진상 인상과 월간 트렌드를 비교해 ${audienceLabel} 안정 추천 7개와 도전형 2개를 고르는 중입니다.`
        : "현재 공개 페이지는 API 키가 없어 mock 추천으로 표시합니다.",
    );

    if (!liveAiEnabled) {
      analysisTimerRef.current = window.setTimeout(() => {
        setIsAnalyzing(false);
        setAnalysisReady(true);
        setConsultationCycleUsed(false);
      }, 850);
      return;
    }

    try {
      const recommendationRequestId = createRecommendationRequestId();
      const formData = new FormData();
      appendPhotoPayload(
        formData,
        currentPhotos,
        currentAudience,
        currentRegion,
      );
      appendStyleMemoPayload(
        formData,
        styleMemo,
        consultingFocusIds,
        currentRecommendationMode,
        currentPremiumAddOnIds,
        currentAudience,
        currentRegion,
      );
      formData.append("requestId", recommendationRequestId);
      const headers = await buildAuthHeaders();

      const response = await fetch(
        `${apiBaseUrl}/api/hairstyles/recommend/`,
        {
          method: "POST",
          body: formData,
          headers,
        },
      );

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      const payload = (await response.json()) as {
        currentHairLength?: MirilookHairLength;
        hairMoney?: {
          balance: number;
          charged: number;
        };
        notes?: string[];
        recommendations?: DisplayRecommendation[];
        warning?: string;
      };
      const currentHairLength = sanitizeHairLength(payload.currentHairLength);
      const recommendationSet = applyCelebrityReferenceRecommendation(
        buildRecommendationSet(
          payload.recommendations?.length ? payload.recommendations : fallbackStyles,
          preferredStyleIds,
          selectedHairColor,
          styleMemo,
          currentAudience,
          consultingFocusIds,
          currentRegion,
          currentRecommendationMode,
          currentPremiumAddOnIds,
          currentHairLength,
        ),
        currentCelebrityReferenceGroups,
        selectedHairColor,
        styleMemo,
        consultingFocusIds,
        currentAudience,
        currentRegion,
        currentRecommendationMode,
        currentPremiumAddOnIds,
      );
      const nextRecommendations = recommendationSet.map((style, previewIndex) => ({
          ...style,
          previewIndex,
          isGenerating: true,
          generationProgress: 0,
          imageUrl: undefined,
          error: undefined,
        }));

      if (previewRunRef.current !== runId) {
        return;
      }

      setRecommendations(nextRecommendations);
      canShowRecommendationResults = true;
      setAnalysisNotes(
        addCelebrityReferenceNote(
          payload.notes?.length ? payload.notes : fallbackNotes,
          currentCelebrityReferenceGroups.length,
        ),
      );
      setAnalysisReady(true);
      setConsultationCycleUsed(false);
      const hairMoneyMessage = payload.hairMoney
        ? ` Hair Money ${payload.hairMoney.charged} 차감, 잔액 ${payload.hairMoney.balance}.`
        : "";
      setStatusMessage(
        payload.warning
          ? `${currentRegionProfile.label} 기준 추천 분석이 지연되어 안전한 후보 3장부터 먼저 생성합니다.${hairMoneyMessage}`
          : `${currentRegionProfile.label} · ${audienceLabel} 기준으로 ${buildRecommendationCompositionLabel(currentCelebrityReferenceGroups.length)} 이미지 3장을 먼저 생성합니다.${hairMoneyMessage}`,
      );

      void generateStylePreviews(
        currentPhotos,
        nextRecommendations,
        runId,
        currentRegion,
        currentAudience,
        currentRecommendationMode,
        currentPremiumAddOnIds,
        currentCelebrityReferenceGroups,
      );
    } catch (error) {
      console.error(error);
      canShowRecommendationResults = false;
      setIsGeneratingPreviews(false);
      setRecommendations(
        applyCelebrityReferenceRecommendation(
          buildRecommendationSet(
            fallbackStyles,
            preferredStyleIds,
            selectedHairColor,
            styleMemo,
            currentAudience,
            consultingFocusIds,
            currentRegion,
            currentRecommendationMode,
            currentPremiumAddOnIds,
          ),
          currentCelebrityReferenceGroups,
          selectedHairColor,
          styleMemo,
          consultingFocusIds,
          currentAudience,
          currentRegion,
          currentRecommendationMode,
          currentPremiumAddOnIds,
        ),
      );
      setAnalysisNotes(addCelebrityReferenceNote(fallbackNotes, currentCelebrityReferenceGroups.length));
      setStatusMessage(getGenerationFailureMessage(error));
    } finally {
      setIsAnalyzing(false);
      if (previewRunRef.current === runId) {
        setAnalysisReady(canShowRecommendationResults);
      }
    }
  }

  async function generateStylePreviews(
    currentPhotos: PreparedPhotos,
    styles: DisplayRecommendation[],
    runId: number,
    region: MirilookRegionId,
    audience: MirilookAudience,
    mode: RecommendationModeId,
    addOnIds: PremiumAddOnId[],
    currentCelebrityReferenceGroups: CelebrityReferenceGroup[],
  ) {
    let successCount = 0;
    let firstFailureMessage = "";
    const previewImageUrls = new Map<string, string>();

    const previewJobs = styles.map((style, previewIndex) => ({
      previewIndex,
      style,
    }));
    const priorityPreviewJobs = previewJobs.slice(
      0,
      priorityPreviewGenerationCount,
    );
    const backgroundPreviewJobs = previewJobs.slice(
      priorityPreviewGenerationCount,
    );
    const failedPreviewJobs: Array<
      (typeof previewJobs)[number] & { error: unknown }
    > = [];

    setIsGeneratingPreviews(true);
    setStatusMessage(
      `추천 후보를 바탕으로 AI 헤어 합성 이미지 ${priorityPreviewJobs.length}장을 먼저 생성하는 중입니다.`,
    );

    try {
      const headers = await buildAuthHeaders();
      const requestPreviewImage = async ({
        previewIndex,
        style,
      }: (typeof previewJobs)[number]) => {
        const formData = new FormData();
        appendPhotoPayload(
          formData,
          currentPhotos,
          audience,
          region,
        );
        appendStylePayload(
          formData,
          style,
          selectedHairColor.id,
          styleMemo,
          consultingFocusIds,
          mode,
          addOnIds,
          audience,
          region,
          style.isCelebrityReference ? currentCelebrityReferenceGroups : [],
        );
        formData.append("previewIndex", String(previewIndex));

        const payload = await postFormWithRetry<{ imageUrl?: string }>(
          `${apiBaseUrl}/api/hairstyles/preview/`,
          formData,
          headers,
        );

        if (!payload.imageUrl) {
          throw new Error("AI provider did not return an image.");
        }

        return payload.imageUrl;
      };

      const runPreviewJob = async (
        { previewIndex, style }: (typeof previewJobs)[number],
        {
          canRetry,
          retrying,
        }: {
          canRetry: boolean;
          retrying?: boolean;
        },
      ) => {
          if (previewRunRef.current !== runId) {
            return;
          }

          if (retrying) {
            updateRecommendation(style.id, {
              generationProgress: 0,
              isGenerating: true,
              error: undefined,
            });
          }

          const stopProgress = startProgressTicker({
            expectedMs: 30000,
            getActive: () => previewRunRef.current === runId,
            onProgress: (generationProgress) =>
              updateRecommendation(style.id, { generationProgress }),
          });

          try {
            const imageUrl = await requestPreviewImage({ previewIndex, style });

            successCount += 1;
            previewImageUrls.set(style.id, imageUrl);
            stopProgress(100);
            await wait(220);

            if (previewRunRef.current !== runId) {
              return;
            }

            updateRecommendation(style.id, {
              generationProgress: 100,
              imageUrl,
              isGenerating: false,
              error: undefined,
            });
          } catch (error) {
            console.error(error);
            stopProgress();

            if (!firstFailureMessage) {
              firstFailureMessage = getGenerationFailureMessage(error);
            }

            if (canRetry && shouldAutoRetryGeneration(error)) {
              failedPreviewJobs.push({ previewIndex, style, error });
            }

            updateRecommendation(style.id, {
              generationProgress: undefined,
              isGenerating: false,
              error:
                error instanceof Error
                  ? error.message
                  : "헤어 합성 이미지 생성 실패",
            });
          }
        };

      await runWithConcurrency(
        priorityPreviewJobs,
        Math.min(priorityPreviewGenerationCount, previewGenerationConcurrency),
        (job) => runPreviewJob(job, { canRetry: true }),
      );

      if (previewRunRef.current !== runId) {
        return;
      }

      if (backgroundPreviewJobs.length) {
        setStatusMessage(
          successCount > 0
            ? `${successCount}개 추천 이미지를 먼저 준비했습니다. 나머지 ${backgroundPreviewJobs.length}개 이미지는 뒤에서 계속 생성합니다.`
            : `첫 추천 이미지가 지연되어도 나머지 ${backgroundPreviewJobs.length}개 이미지를 이어서 생성합니다.`,
        );

        await runWithConcurrency(
          backgroundPreviewJobs,
          Math.max(
            1,
            Math.min(previewGenerationConcurrency, backgroundPreviewJobs.length),
          ),
          (job) => runPreviewJob(job, { canRetry: true }),
        );
      }

      if (previewRunRef.current !== runId) {
        return;
      }

      const retryPreviewJobs = Array.from(
        new Map(
          failedPreviewJobs.map((item) => [item.style.id, item]),
        ).values(),
      );

      if (retryPreviewJobs.length) {
        setStatusMessage(
          `${retryPreviewJobs.length}개 추천 이미지가 지연되어 해당 이미지만 자동 재시도합니다.`,
        );

        await runWithConcurrency(
          retryPreviewJobs,
          Math.min(2, previewGenerationConcurrency),
          async (job) => {
            if (previewRunRef.current !== runId) {
              return;
            }

            await runPreviewJob(job, {
              canRetry: false,
              retrying: true,
            });
          },
        );
      }

      if (previewRunRef.current !== runId) {
        return;
      }

      setStatusMessage(
        successCount > 0
          ? `${successCount}개 추천 이미지가 준비되었습니다. 마음에 드는 카드를 눌러 크게 확인하세요.`
          : firstFailureMessage ||
              "실제 AI 생성에 실패했습니다. 서버 API 키와 배포 설정을 확인해 주세요.",
      );

      if (successCount > 0) {
        setIsGeneratingPreviews(false);
        const historyRecommendations = styles.map((style) => ({
          ...style,
          error: previewImageUrls.has(style.id) ? undefined : style.error,
          generationProgress: previewImageUrls.has(style.id)
            ? 100
            : style.generationProgress,
          imageUrl: previewImageUrls.get(style.id) ?? style.imageUrl,
          isGenerating: false,
        }));

        await autoSaveRecommendationHistory(historyRecommendations);
      }
    } finally {
      if (previewRunRef.current === runId) {
        setIsGeneratingPreviews(false);
      }
    }
  }

  function updateRecommendation(
    styleId: MirilookStyleId,
    patch: Partial<DisplayRecommendation>,
  ) {
    setRecommendations((current) =>
      current.map((style) =>
        style.id === styleId
          ? {
              ...style,
              ...patch,
            }
          : style,
      ),
    );
  }

  function previewStyle(style: DisplayRecommendation) {
    renderRunRef.current += 1;
    setShareUrl("");
    setSelectedStyleId(style.id);
    setRenderedResults([]);
    setOutfitRecommendations([]);
    setOutfitFullBody({ isGenerating: false });
    setMakeupPreview({ isGenerating: false });
    resetCurrentConsultationIdentity();
    setIsRendering(false);
    setStatusMessage(
      style.isGenerating
        ? `${style.name} 이미지를 준비 중입니다.`
        : `${style.name}을 크게 확인 중입니다. 마음에 들면 상담용 9장을 생성하세요.`,
    );
  }

  function togglePreferredStyle(styleId: string) {
    setPreferredStyleIds((current) =>
      current.includes(styleId)
        ? current.filter((id) => id !== styleId)
        : [...current, styleId],
    );
    setAnalysisReady(false);
    setSelectedStyleId(null);
    setRenderedResults([]);
    resetCurrentConsultationIdentity();
    setShareUrl("");
    setStatusMessage("선호 스타일이 반영되었습니다. 추천 받기를 눌러주세요.");
  }

  function selectHairColor(colorId: string) {
    setSelectedHairColorId(colorId);
    setAnalysisReady(false);
    setSelectedStyleId(null);
    setRenderedResults([]);
    resetCurrentConsultationIdentity();
    setShareUrl("");
    setStatusMessage("헤어 컬러가 반영되었습니다. 추천 받기를 눌러주세요.");
  }

  function updateStyleMemo(value: string) {
    setStyleMemo(value);
    setAnalysisReady(false);
    setSelectedStyleId(null);
    setRenderedResults([]);
    resetCurrentConsultationIdentity();
    setShareUrl("");
    setStatusMessage("요청사항 메모가 반영되었습니다. 추천 받기를 눌러주세요.");
  }

  function toggleConsultingFocus(focusId: ConsultingFocusId) {
    setConsultingFocusIds((current) =>
      current.includes(focusId)
        ? current.filter((id) => id !== focusId)
        : [...current, focusId],
    );
    setAnalysisReady(false);
    setSelectedStyleId(null);
    setRenderedResults([]);
    resetCurrentConsultationIdentity();
    setShareUrl("");
    setStatusMessage(
      "퍼스널 컨설팅 항목이 반영되었습니다. 추천 받기를 눌러주세요.",
    );
  }

  function selectRecommendationMode(mode: RecommendationModeId) {
    setRecommendationMode(mode);
    setAnalysisReady(false);
    setSelectedStyleId(null);
    setRenderedResults([]);
    resetCurrentConsultationIdentity();
    setShareUrl("");
    setStatusMessage("추천 기준이 반영되었습니다. 추천 받기를 눌러주세요.");
  }

  function startRecommendation() {
    if (isRecommendationBusy) {
      return;
    }

    const currentReadyPhotos = getPreparedPhotos(photos);

    if (!currentReadyPhotos) {
      setStatusMessage("좌측면, 정면, 우측면 중 최소 2장을 업로드해 주세요.");
      return;
    }

    trackEvent("recommend_requested", {
      audience: selectedAudience,
      photoCount: currentReadyPhotos.uploadedCount,
    });

    void generateRecommendations(currentReadyPhotos);
  }

  function generateSelectedConsultationSet() {
    if (!selectedStyle) {
      setStatusMessage("먼저 추천 이미지 9장 중 마음에 드는 스타일을 선택해 주세요.");
      return;
    }

    // First consultation set per recommendation cycle is free. Any additional
    // set (e.g. picking another recommended style) requires confirming a Hair
    // Money charge first.
    if (consultationCycleUsed) {
      setExtraConsultationStyle(selectedStyle);
      return;
    }

    void generateConsultationSet(selectedStyle);
  }

  function confirmExtraConsultation() {
    if (!extraConsultationStyle) {
      return;
    }

    void runExtraConsultationCharge(extraConsultationStyle);
  }

  // Charges Hair Money for an additional consultation set and, on success,
  // starts generating it. If the balance is short, it keeps the recommendation
  // screen intact and opens the store popup so the customer can top up — calling
  // this again (from the popup) then resumes the same style.
  async function runExtraConsultationCharge(style: DisplayRecommendation) {
    if (extraConsultationCharging) {
      return;
    }

    setExtraConsultationCharging(true);

    try {
      const headers = await buildJsonHeadersWithAuth();
      const requestId =
        globalThis.crypto?.randomUUID?.() ?? `${style.id}-${Date.now()}`;
      const response = await fetch(
        `${apiBaseUrl}/api/hairstyles/consultation-charge/`,
        {
          body: JSON.stringify({
            audience: selectedAudience,
            region: selectedRegion,
            requestId,
            styleId: style.id,
          }),
          headers,
          method: "POST",
        },
      );
      const data = (await response.json().catch(() => null)) as {
        applied?: boolean;
        balance?: number;
        cost?: number;
        error?: string;
        reason?: string;
      } | null;

      // Not enough Hair Money — keep the remaining-style screen and open the
      // store popup, remembering the picked style so we can resume after top-up.
      if (response.status === 402 || data?.reason === "insufficient_hair_money") {
        setExtraConsultationStyle(null);
        setExtraConsultationStore({
          balance: typeof data?.balance === "number" ? data.balance : null,
          cost:
            typeof data?.cost === "number"
              ? data.cost
              : HairMoneyExtraConsultationCost,
          style,
        });
        setStatusMessage(
          `Hair Money가 부족합니다. 스토어에서 충전한 뒤 ${style.name} 상담용 9장을 이어서 생성할 수 있어요.`,
        );
        return;
      }

      if (!response.ok || !data?.applied) {
        setStatusMessage(
          (data && typeof data.error === "string" && data.error) ||
            "Hair Money 차감에 실패해 추가 상담을 시작하지 못했습니다.",
        );
        return;
      }

      setExtraConsultationStyle(null);
      setExtraConsultationStore(null);
      setStatusMessage(
        `Hair Money ${data.cost ?? HairMoneyExtraConsultationCost}개를 차감했습니다. (잔액 ${data.balance ?? "-"}) ${style.name} 상담용 9장을 추가로 생성합니다.`,
      );
      void generateConsultationSet(style);
    } catch {
      setStatusMessage(
        "Hair Money 차감 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setExtraConsultationCharging(false);
    }
  }

  function scrollStyleExpansionPanelToCenter() {
    window.setTimeout(() => {
      styleExpansionPanelRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 80);
  }

  async function fetchPersonalizedOutfitRecommendations(): Promise<
    OutfitRecommendation[] | null
  > {
    if (!liveAiEnabled || !selectedStyle) {
      return null;
    }

    try {
      const headers = await buildJsonHeadersWithAuth();
      const response = await fetch(
        `${apiBaseUrl}/api/style/outfit-recommendations/`,
        {
          body: JSON.stringify({
            audience: selectedAudience,
            date: outfitOccasionDate || undefined,
            hairColorName: selectedHairColor.name,
            memo: styleMemo.trim() || undefined,
            region: selectedRegion,
            styleName: selectedStyle.name,
          }),
          headers,
          method: "POST",
        },
      );

      if (!response.ok) {
        return null;
      }

      const data = (await response.json().catch(() => null)) as {
        items?: Array<{
          description?: string;
          id: OutfitItemId;
          label?: string;
          query?: string;
          tags?: string[];
        }>;
      } | null;

      if (!data?.items?.length) {
        return null;
      }

      return data.items
        .filter((item) => item.id && item.query)
        .map((item) => ({
          description: item.description ?? "",
          href: buildNaverShoppingUrl(item.query ?? ""),
          id: item.id,
          label: item.label ?? item.id,
          query: item.query ?? "",
          tags: Array.isArray(item.tags) ? item.tags : [],
        }));
    } catch {
      return null;
    }
  }

  async function showOutfitRecommendations() {
    const currentReadyPhotos = getPreparedPhotos(photos);

    if (!selectedStyle) {
      setStatusMessage("먼저 추천 이미지 9장 중 마음에 드는 스타일을 선택해 주세요.");
      return;
    }

    if (!currentReadyPhotos) {
      setStatusMessage("좌측면, 정면, 우측면 중 최소 2장을 업로드해 주세요.");
      return;
    }

    if (liveAiEnabled && (!selectedStyle.imageUrl || selectedStyle.error)) {
      setStatusMessage("먼저 선택한 스타일 이미지가 정상 생성되어야 합니다.");
      return;
    }

    setPremiumAddOnIds((current) =>
      current.includes("outfit-coordination")
        ? current
        : [...current, "outfit-coordination"],
    );

    // Personalized + season-aware list from the LLM; falls back to the static
    // catalog if the call is unavailable or fails.
    const personalized = await fetchPersonalizedOutfitRecommendations();
    const baseRecommendations = (
      personalized ??
      buildOutfitRecommendations({
        audience: selectedAudience,
        hairColor: selectedHairColor.name,
      })
    ).slice(0, 8);
    const nextRecommendations = baseRecommendations.map((item) => ({
      ...item,
      isGenerating: liveAiEnabled,
    }));

    setOutfitRecommendations(nextRecommendations);
    setOutfitFullBody({ isGenerating: liveAiEnabled });
    setStatusMessage(
      `${selectedStyle.name} 이미지 기준으로 전신 코디와 아이템 이미지를 생성합니다.`,
    );
    scrollStyleExpansionPanelToCenter();

    if (!liveAiEnabled) {
      const mockFullBody = {
        imageUrl: selectedStyle.imageUrl ?? currentReadyPhotos.front.url,
        isGenerating: false,
      };
      const mockRecommendations = nextRecommendations.map((item) => ({
        ...item,
        imageUrl: selectedStyle.imageUrl ?? currentReadyPhotos.front.url,
        isGenerating: false,
      }));

      setOutfitFullBody(mockFullBody);
      setOutfitRecommendations(mockRecommendations);
      scrollStyleExpansionPanelToCenter();
      void autoSaveStyleExpansionHistory(selectedStyle, {
        outfitImagesForHistory: buildOutfitHistoryImages(
          mockFullBody,
          mockRecommendations,
        ),
        statusLabel: "코디 추천 이미지",
      });
      return;
    }

    try {
      const baseImage = await dataUrlToFile(
        selectedStyle.imageUrl ?? currentReadyPhotos.front.url,
        "mirilook-selected-outfit-base.jpg",
      );

      const fullBodyImagePromise = generateOutfitImage({
          baseImage,
          currentPhotos: currentReadyPhotos,
          outfitPart: "full",
          query: buildFullOutfitQuery(nextRecommendations, selectedStyle),
          selectedStyle,
        }).then((imageUrl) => {
          setOutfitFullBody({
            imageUrl,
            isGenerating: false,
          });

          return imageUrl;
        }).catch((error) => {
          // Degrade a single full-body failure to a tile-level error instead of
          // letting Promise.all reject and wipe the whole (often successful) board.
          console.error(error);
          setOutfitFullBody({
            error: getGenerationFailureMessage(error),
            isGenerating: false,
          });

          return undefined;
        });
      const itemImagePromises = nextRecommendations.map((item) =>
        generateOutfitImage({
            baseImage,
            currentPhotos: currentReadyPhotos,
            outfitPart: item.id,
            query: item.query,
            selectedStyle,
          })
            .then((imageUrl) => {
              updateOutfitRecommendation(item.id, {
                imageUrl,
                isGenerating: false,
              });

              return {
                ...item,
                imageUrl,
                isGenerating: false,
              };
            })
            .catch((error) => {
              console.error(error);
              const errorMessage = getGenerationFailureMessage(error);

              updateOutfitRecommendation(item.id, {
                error: errorMessage,
                isGenerating: false,
              });

              return {
                ...item,
                error: errorMessage,
                isGenerating: false,
              };
            }),
      );
      const [fullBodyImageUrl, generatedRecommendations] = await Promise.all([
        fullBodyImagePromise,
        Promise.all(itemImagePromises),
      ]);

      setStatusMessage(`${selectedStyle.name} 전신 코디 보드가 준비되었습니다.`);
      scrollStyleExpansionPanelToCenter();
      void autoSaveStyleExpansionHistory(selectedStyle, {
        outfitImagesForHistory: buildOutfitHistoryImages(
          {
            imageUrl: fullBodyImageUrl,
            isGenerating: false,
          },
          generatedRecommendations,
        ),
        statusLabel: "코디 추천 이미지",
      });
    } catch (error) {
      console.error(error);
      setOutfitFullBody({
        error: getGenerationFailureMessage(error),
        isGenerating: false,
      });
      setOutfitRecommendations((current) =>
        current.map((item) => ({
          ...item,
          isGenerating: false,
        })),
      );
      setStatusMessage(getGenerationFailureMessage(error));
    }
  }

  function updateOutfitRecommendation(
    itemId: OutfitRecommendation["id"],
    patch: Partial<OutfitRecommendation>,
  ) {
    setOutfitRecommendations((current) =>
      current.map((item) =>
        item.id === itemId
          ? {
              ...item,
              ...patch,
            }
          : item,
      ),
    );
  }

  async function generateOutfitImage({
    baseImage,
    currentPhotos,
    outfitPart,
    query,
    selectedStyle,
  }: {
    baseImage: File;
    currentPhotos: PreparedPhotos;
    outfitPart: OutfitRecommendation["id"] | "full";
    query: string;
    selectedStyle: DisplayRecommendation;
  }) {
    const formData = new FormData();

    formData.append("base", baseImage);
    formData.append("front", currentPhotos.front.file);
    formData.append("side", currentPhotos.side.file);

    if (currentPhotos.leftSide) {
      formData.append("leftSide", currentPhotos.leftSide.file);
    }

    if (currentPhotos.rightSide) {
      formData.append("rightSide", currentPhotos.rightSide.file);
    }

    formData.append("audience", selectedAudience);
    formData.append("hairColorId", selectedHairColor.id);
    formData.append("outfitPart", outfitPart);
    formData.append("query", query);
    formData.append("region", selectedRegion);
    formData.append("styleId", selectedStyle.id);
    formData.append("styleName", selectedStyle.name);

    const payload = await postFormWithRetry<{ imageUrl?: string }>(
      `${apiBaseUrl}/api/style/outfit/`,
      formData,
    );

    if (!payload.imageUrl) {
      throw new Error("코디 이미지가 반환되지 않았습니다.");
    }

    return payload.imageUrl;
  }

  // Background path: pre-upload sources + selected preview, enqueue a server
  // job, then poll until the 9 angles are ready. Returns true when it has taken
  // over the run (success OR a clean "still working" handoff), false to let the
  // existing client-side flow handle generation as a fallback.
  async function runBackgroundConsultation(
    style: DisplayRecommendation,
    runId: number,
  ): Promise<boolean> {
    let progressTimer: number | undefined;
    // Once the server job is accepted it OWNS the render. After this point any
    // transient error (e.g. a status poll blip) must NOT fall back to the
    // client-side flow, which would wipe the already-rendered angles and
    // restart from the front. We keep the server job running instead.
    let jobAccepted = false;

    try {
      const sourcePhotos = await buildSourceHistoryPhotos(photos);

      if (sourcePhotos.length < 2) {
        return false;
      }

      setSelectedStyleId(style.id);
      setMirroredResultLabels(new Set());
      setRenderedResults(
        resultAngles.map((angle) => ({
          className: angle.className,
          generationProgress: 0,
          isGenerating: true,
          label: angle.label,
        })),
      );
      setIsRendering(true);
      setStatusMessage(
        `${style.name} 상담용 9장을 서버에서 생성하고 있습니다. 잠시만 기다려 주세요.`,
      );

      const headers = await buildJsonHeadersWithAuth();
      const prep = await prepareBackgroundSession({
        apiBaseUrl,
        audience: selectedAudience,
        hairColorId: selectedHairColor.id,
        hairColorName: selectedHairColor.name,
        headers,
        regionName: selectedRegion,
        selectedPreview: style.imageUrl
          ? { imageUrl: style.imageUrl, label: "selected" }
          : undefined,
        sessionId: crypto.randomUUID(),
        sourcePhotos: sourcePhotos.map((photo) => ({
          imageUrl: photo.imageUrl,
          label: photo.label,
        })),
        styleId: style.id,
        styleName: style.name,
      });

      if (renderRunRef.current !== runId) {
        return true;
      }

      if (!prep.prepared || !prep.sessionId) {
        return false;
      }

      backgroundSessionRef.current = {
        sessionId: prep.sessionId,
        sourceAssetPaths: prep.sourceAssetPaths ?? [],
      };

      const enqueued = await enqueueBackgroundJob({
        apiBaseUrl,
        audience: selectedAudience,
        hairColorId: selectedHairColor.id,
        hairColorName: selectedHairColor.name,
        headers,
        imageAssetIds: prep.sourceAssetPaths ?? [],
        region: selectedRegion,
        requestedAngles: resultAngles.map((angle) => angle.label),
        selectedPreviewPath: prep.selectedPreviewPath,
        selectedStyleId: style.id,
        selectedStyleName: style.name,
        sessionId: prep.sessionId,
        styleMemo: styleMemo.trim() || undefined,
      });

      if (renderRunRef.current !== runId) {
        return true;
      }

      if (!enqueued.accepted) {
        return false;
      }

      jobAccepted = true;

      setStatusMessage(
        `${style.name} 상담용 9장을 서버에서 생성 중입니다. 이 화면을 벗어나도 결과는 저장되며, 완료되면 히스토리에서 다시 볼 수 있어요. (생성 중 새로고침은 피해 주세요)`,
      );

      // The server job only reports n/9 every few seconds, so animate each still
      // -generating card's progress smoothly between polls. A card snaps to 100%
      // the moment its image lands (handled in the poll loop below).
      const boardStartedAt = Date.now();
      progressTimer = window.setInterval(() => {
        if (renderRunRef.current !== runId) {
          return;
        }

        // Pace against the measured ~110s board render time so every still
        // -generating card keeps creeping toward 99% (never frozen at a cap). A
        // card snaps to 100% the instant the poll below sees its image land.
        const eased = Math.round(
          easedTimedProgress(Date.now() - boardStartedAt, 110000),
        );

        setRenderedResults((current) =>
          current.map((result) =>
            result.imageUrl || !result.isGenerating
              ? result
              : {
                  ...result,
                  generationProgress: Math.max(
                    result.generationProgress ?? 0,
                    eased,
                  ),
                },
          ),
        );
      }, 400);

      const sessionId = prep.sessionId;
      const maxPolls = 90; // ~6 minutes at 4s interval

      for (let attempt = 0; attempt < maxPolls; attempt += 1) {
        await wait(4000);

        if (renderRunRef.current !== runId) {
          return true;
        }

        let status: Awaited<ReturnType<typeof fetchBackgroundStatus>>;
        try {
          status = await fetchBackgroundStatus({ apiBaseUrl, headers, sessionId });
        } catch (statusError) {
          // A transient status-poll failure must not abort the render and trigger
          // a client-side restart. Skip this tick and poll again next interval.
          console.warn(
            "background status poll failed; retrying next tick",
            statusError,
          );
          continue;
        }

        if (renderRunRef.current !== runId) {
          return true;
        }

        if (status.ready && status.images.length) {
          setRenderedResults(
            resultAngles.map((angle, index) => {
              const match = status.images.find(
                (image) => image.displayOrder === index + 1,
              );

              return {
                className: angle.className,
                error: match ? undefined : "생성 실패",
                imageUrl: match?.imageUrl,
                isGenerating: false,
                label: angle.label,
              };
            }),
          );
          setIsRendering(false);
          setConsultationCycleUsed(true);
          setStatusMessage(
            `${style.name} 상담용 9장이 완성되었습니다. 저장·공유·이메일로 미용사에게 전달하세요.`,
          );
          return true;
        }

        if (status.done && status.status === "failed") {
          setRenderedResults(
            resultAngles.map((angle) => ({
              className: angle.className,
              error: "생성 실패",
              isGenerating: false,
              label: angle.label,
            })),
          );
          setIsRendering(false);
          setStatusMessage(
            "서버 생성에 실패했습니다. '다시 생성'을 누르거나 잠시 후 다시 시도해 주세요.",
          );
          return true;
        }

        // Still processing: show progress (n/9) and render angles as they land.
        // Completed angles snap to 100%; the rest keep the climbing value the
        // ticker is animating so the bars never sit frozen at 0%.
        const completed = status.completedCount ?? status.images.length;

        if (status.images.length) {
          setRenderedResults((current) =>
            resultAngles.map((angle, index) => {
              const match = status.images.find(
                (image) => image.displayOrder === index + 1,
              );

              if (match) {
                return {
                  className: angle.className,
                  generationProgress: 100,
                  imageUrl: match.imageUrl,
                  isGenerating: false,
                  label: angle.label,
                };
              }

              return {
                className: angle.className,
                generationProgress: current[index]?.generationProgress ?? 0,
                imageUrl: undefined,
                isGenerating: true,
                label: angle.label,
              };
            }),
          );
        }

        setStatusMessage(
          `${style.name} 상담용 이미지를 서버에서 생성 중입니다. (${completed}/9) 화면을 벗어나도 완료되면 히스토리에 저장돼요.`,
        );
      }

      // Timed out while still processing: keep the job running server-side.
      setIsRendering(false);
      setStatusMessage(
        "서버에서 계속 생성 중입니다. 완료되면 히스토리에 저장되니, 잠시 후 히스토리에서 확인해 주세요.",
      );
      return true;
    } catch (error) {
      // Pre-enqueue failures legitimately fall back to client generation (nothing
      // has rendered yet). Once the job is accepted, the already-rendered angles
      // must be preserved: keep the server job running instead of restarting.
      if (jobAccepted) {
        if (renderRunRef.current === runId) {
          setIsRendering(false);
          setStatusMessage(
            "서버에서 계속 생성 중입니다. 완료되면 히스토리에 저장되니, 잠시 후 히스토리에서 확인해 주세요.",
          );
        }

        return true;
      }

      console.warn("background consultation fell back to client generation", error);
      return false;
    } finally {
      if (progressTimer !== undefined) {
        window.clearInterval(progressTimer);
      }
    }
  }

  async function generateConsultationSet(style: DisplayRecommendation) {
    const currentReadyPhotos = getPreparedPhotos(photos);

    if (!currentReadyPhotos) {
      setStatusMessage("좌측면, 정면, 우측면 중 최소 2장을 업로드해 주세요.");
      return;
    }

    if (liveAiEnabled && (!style.imageUrl || style.isGenerating || style.error)) {
      setStatusMessage("먼저 선택한 스타일 이미지가 정상 생성되어야 합니다.");
      return;
    }

    const runId = ++renderRunRef.current;
    const renderRegion = selectedRegion;

    trackEvent("consultation_requested", {
      audience: selectedAudience,
      background: isBackgroundGenerationEnabled(),
      styleId: style.id,
    });

    // Background path (flag-gated): hand the 9-angle render to a server-side job
    // so it survives the user leaving. Falls back to the client-side flow below
    // on any miss (not prepared, not enqueued, or error).
    backgroundSessionRef.current = null;
    if (liveAiEnabled && isBackgroundGenerationEnabled()) {
      const handled = await runBackgroundConsultation(style, runId);

      if (handled) {
        return;
      }
    }

    setShareUrl("");
    setSelectedStyleId(style.id);
    setMirroredResultLabels(new Set());
    setRenderedResults(
      resultAngles.map((angle) => ({
        label: angle.label,
        className: angle.className,
        isGenerating: liveAiEnabled,
        generationProgress: liveAiEnabled ? 0 : 100,
      })),
    );
    setIsRendering(true);
    setStatusMessage(
      `${style.name} 선택 이미지의 방향을 확인하고 상담용 9장 구성을 준비하는 중입니다.`,
    );

    if (!liveAiEnabled) {
      window.setTimeout(() => {
        if (renderRunRef.current !== runId) {
          return;
        }

        const mockResults = createMockResults(
          style,
          currentReadyPhotos.front,
          currentReadyPhotos.side,
        );

        setRenderedResults(mockResults);
        setIsRendering(false);
        setConsultationCycleUsed(true);
        void autoSaveConsultationHistory(style, mockResults);
      }, 450);
      return;
    }

    try {
      const selectedPreviewUrl = style.imageUrl;
      const centerAngleIndex = consultationAngleIndexes.front;
      const generatedReferences = new Map<number, File>();
      const generatedAngleImageUrls = new Map<number, string>();
      const completedAngleIndexes = new Set<number>();
      const failedAngles: Array<{
        angleIndex: number;
        errorMessage: string;
        referenceFiles: File[];
        referenceRole: string;
      }> = [];
      const primaryAngleIndexes = [
        consultationAngleIndexes.left,
        consultationAngleIndexes.front,
        consultationAngleIndexes.right,
      ];
      let selectedReference: File | undefined;
      let frontReference: File | undefined;
      const actualFrontReference =
        currentReadyPhotos.frontSlot === "front"
          ? currentReadyPhotos.front.file
          : undefined;

      const getAvailableReferences = (angleIndexes: number[]) =>
        uniqueFiles(angleIndexes.map((angleIndex) => generatedReferences.get(angleIndex)));

      const getPrimaryReferences = () =>
        uniqueFiles([
          ...getAvailableReferences(primaryAngleIndexes),
          frontReference,
          actualFrontReference,
          selectedReference,
        ]);

      const generateAngle = async ({
        angleIndex,
        referenceFiles,
        referenceRole,
      }: {
        angleIndex: number;
        referenceFiles: File[];
        referenceRole: string;
      }) => {
        const angle = resultAngles[angleIndex];

        if (!angle) {
          throw new Error("지원하지 않는 상담 각도입니다.");
        }

        updateRenderedResult(angle.label, {
          generationProgress: 0,
          isGenerating: true,
          error: undefined,
        });
        const stopProgress = startProgressTicker({
          expectedMs: 40000,
          getActive: () => renderRunRef.current === runId,
          onProgress: (generationProgress) =>
            updateRenderedResult(angle.label, { generationProgress }),
        });

        let imageUrl: string;

        try {
          imageUrl = await requestAngleImage({
            angleIndex,
            photos: currentReadyPhotos,
            referenceFiles,
            referenceRole,
            region: renderRegion,
            style,
          });
        } catch (error) {
          stopProgress();
          throw error;
        }

        if (renderRunRef.current !== runId) {
          stopProgress();
          return undefined;
        }

        completedAngleIndexes.add(angleIndex);
        generatedAngleImageUrls.set(angleIndex, imageUrl);
        stopProgress(100);
        await wait(220);

        if (renderRunRef.current !== runId) {
          return undefined;
        }

        updateRenderedResult(angle.label, {
          generationProgress: 100,
          imageUrl,
          isGenerating: false,
          error: undefined,
        });

        const reference = await dataUrlToFile(
          imageUrl,
          createReferenceFileName(angle.label),
        );
        generatedReferences.set(angleIndex, reference);

        return reference;
      };

      const runDependentAnglePipeline = async ({
        anchorAngleIndex,
        anchorErrorMessage,
        anchorReferenceRole,
        anchorRetryRole,
        cornerAngleIndexes,
        cornerErrorMessage,
        cornerReferenceRole,
        cornerRetryRole,
        cornerStatusMessage,
      }: {
        anchorAngleIndex: number;
        anchorErrorMessage: string;
        anchorReferenceRole: string;
        anchorRetryRole: string;
        cornerAngleIndexes: number[];
        cornerErrorMessage: string;
        cornerReferenceRole: string;
        cornerRetryRole: string;
        cornerStatusMessage: string;
      }) => {
        let anchorReference = generatedReferences.get(anchorAngleIndex);

        if (!completedAngleIndexes.has(anchorAngleIndex)) {
          try {
            anchorReference = await generateAngle({
              angleIndex: anchorAngleIndex,
              referenceFiles: getPrimaryReferences(),
              referenceRole: anchorReferenceRole,
            });
          } catch (error) {
            console.error(error);
            const errorMessage =
              error instanceof Error ? error.message : anchorErrorMessage;
            updateRenderedResult(resultAngles[anchorAngleIndex].label, {
              isGenerating: false,
              error: errorMessage,
            });
            failedAngles.push({
              angleIndex: anchorAngleIndex,
              errorMessage,
              referenceFiles: getPrimaryReferences(),
              referenceRole: anchorRetryRole,
            });
          }
        } else {
          anchorReference = generatedReferences.get(anchorAngleIndex);
        }

        if (renderRunRef.current !== runId) {
          return;
        }

        const cornerReferences = uniqueFiles([
          ...getPrimaryReferences(),
          anchorReference,
        ]);
        const cornerJobs = cornerAngleIndexes.filter(
          (angleIndex) => !completedAngleIndexes.has(angleIndex),
        );

        if (cornerJobs.length) {
          setStatusMessage(cornerStatusMessage);
        }

        await runWithConcurrency(cornerJobs, 2, async (angleIndex) => {
          try {
            if (renderRunRef.current !== runId) {
              return;
            }

            await generateAngle({
              angleIndex,
              referenceFiles: cornerReferences,
              referenceRole: cornerReferenceRole,
            });
          } catch (error) {
            console.error(error);
            const errorMessage =
              error instanceof Error ? error.message : cornerErrorMessage;
            updateRenderedResult(resultAngles[angleIndex].label, {
              isGenerating: false,
              error: errorMessage,
            });
            failedAngles.push({
              angleIndex,
              errorMessage,
              referenceFiles: cornerReferences,
              referenceRole: cornerRetryRole,
            });
          }
        });
      };

      if (selectedPreviewUrl) {
        selectedReference = await dataUrlToFile(
          selectedPreviewUrl,
          "mirilook-selected-preview.jpg",
        );

        if (renderRunRef.current !== runId) {
          return;
        }

        setStatusMessage(
          `${style.name} 선택 이미지를 스타일 레퍼런스로 등록했습니다. 상담용 9장은 각 슬롯 각도에 맞춰 모두 다시 생성합니다.`,
        );
      }

      if (selectedPreviewUrl) {
        try {
          frontReference = await generateAngle({
            angleIndex: centerAngleIndex,
            referenceFiles: uniqueFiles([
              actualFrontReference,
              selectedReference,
            ]),
            referenceRole: "selected-preview-style-to-canonical-front",
          });
          setStatusMessage(
            `${style.name} 원본 정면과 선택 이미지를 함께 반영해 정면 기준 이미지를 다시 만들었습니다. 좌측·우측 기준 이미지를 이어서 생성합니다.`,
          );
        } catch (error) {
          console.error(error);
          const errorMessage =
            error instanceof Error
              ? error.message
              : "정면 기준 이미지 생성 실패";
          updateRenderedResult(resultAngles[centerAngleIndex].label, {
            isGenerating: false,
            error: errorMessage,
          });
          failedAngles.push({
            angleIndex: centerAngleIndex,
            errorMessage,
            referenceFiles: uniqueFiles([
              actualFrontReference,
              selectedReference,
            ]),
            referenceRole: "selected-preview-style-to-canonical-front-retry",
          });
          setStatusMessage(
            `${style.name} 정면 기준 이미지가 지연되어, 선택 이미지와 원본 3장을 기준으로 좌·우 기준을 먼저 생성합니다.`,
          );
        }
      }

      const primaryJobs = primaryAngleIndexes.filter(
        (angleIndex) => !completedAngleIndexes.has(angleIndex),
      );

      await runWithConcurrency(
        primaryJobs,
        Math.min(3, angleGenerationConcurrency),
        async (angleIndex) => {
          try {
            if (renderRunRef.current !== runId) {
              return;
            }

            const referenceFiles = uniqueFiles([
              frontReference,
              actualFrontReference,
              selectedReference,
              ...getAvailableReferences(primaryAngleIndexes),
            ]);

            const reference = await generateAngle({
              angleIndex,
              referenceFiles,
              referenceRole: "primary-left-front-right",
            });

            if (angleIndex === centerAngleIndex && reference) {
              frontReference = reference;
            }
          } catch (error) {
            console.error(error);
            const errorMessage =
              error instanceof Error
                ? error.message
                : "상담용 이미지 생성 실패";
            updateRenderedResult(resultAngles[angleIndex].label, {
              isGenerating: false,
              error: errorMessage,
            });
            failedAngles.push({
              angleIndex,
              errorMessage,
              referenceFiles: uniqueFiles([
                frontReference,
                actualFrontReference,
                selectedReference,
                ...getAvailableReferences(primaryAngleIndexes),
              ]),
              referenceRole: "primary-left-front-right-retry",
            });
          }
        },
      );

      if (renderRunRef.current !== runId) {
        return;
      }

      setStatusMessage(
        `${style.name} 좌측·정면·우측 기준을 잡았습니다. 상단과 후면 이미지를 동시에 생성합니다.`,
      );

      await Promise.all([
        runDependentAnglePipeline({
          anchorAngleIndex: consultationAngleIndexes.top,
          anchorErrorMessage: "상단 이미지 생성 실패",
          anchorReferenceRole: "top-from-primary-triple",
          anchorRetryRole: "top-from-primary-triple-retry",
          cornerAngleIndexes: [
            consultationAngleIndexes.upperLeft,
            consultationAngleIndexes.upperRight,
          ],
          cornerErrorMessage: "상단 대각선 이미지 생성 실패",
          cornerReferenceRole: "upper-corners-from-primary-top",
          cornerRetryRole: "upper-corners-from-primary-top-retry",
          cornerStatusMessage: `${style.name} 상단 완료. 좌상단·우상단을 병렬 생성합니다.`,
        }),
        runDependentAnglePipeline({
          anchorAngleIndex: consultationAngleIndexes.rear,
          anchorErrorMessage: "후면 이미지 생성 실패",
          anchorReferenceRole: "rear-from-primary-triple",
          anchorRetryRole: "rear-from-primary-triple-retry",
          cornerAngleIndexes: [
            consultationAngleIndexes.lowerLeft,
            consultationAngleIndexes.lowerRight,
          ],
          cornerErrorMessage: "후면 대각선 이미지 생성 실패",
          cornerReferenceRole: "rear-corners-from-primary-rear",
          cornerRetryRole: "rear-corners-from-primary-rear-retry",
          cornerStatusMessage: `${style.name} 후면 완료. 좌후면·우후면을 병렬 생성합니다.`,
        }),
      ]);

      if (failedAngles.length && renderRunRef.current === runId) {
        const retryJobs = Array.from(
          new Map(failedAngles.map((item) => [item.angleIndex, item])).values(),
        ).filter(({ angleIndex }) => !completedAngleIndexes.has(angleIndex));
        const retryableJobs = retryJobs.filter(({ errorMessage }) =>
          shouldAutoRetryGeneration(errorMessage),
        );
        const skippedRetryCount = retryJobs.length - retryableJobs.length;

        if (retryableJobs.length) {
          setStatusMessage(
            `${retryableJobs.length}개 이미지가 지연되어 해당 이미지만 자동 재생성합니다.`,
          );
        } else if (skippedRetryCount) {
          setStatusMessage(
            `${skippedRetryCount}개 이미지는 계정, 모델 또는 크레딧 설정 확인이 필요해 자동 재시도하지 않았습니다.`,
          );
        }

        const fallbackReferences = uniqueFiles([
          ...getPrimaryReferences(),
          generatedReferences.get(consultationAngleIndexes.top),
          generatedReferences.get(consultationAngleIndexes.rear),
          selectedReference,
        ]);

        await runWithConcurrency(
          retryableJobs,
          1,
          async ({ angleIndex, referenceFiles, referenceRole }) => {
            try {
              if (renderRunRef.current !== runId) {
                return;
              }

              await generateAngle({
                angleIndex,
                referenceFiles: fallbackReferences.length
                  ? fallbackReferences
                  : referenceFiles,
                referenceRole,
              });
            } catch (error) {
              console.error(error);
              updateRenderedResult(resultAngles[angleIndex].label, {
                isGenerating: false,
                error:
                  error instanceof Error
                    ? error.message
                    : "상담용 이미지 재생성 실패",
              });
            }
          },
        );

        if (
          skippedRetryCount &&
          retryableJobs.length &&
          renderRunRef.current === runId
        ) {
          setStatusMessage(
            `${retryableJobs.length}개 이미지는 자동 재생성을 시도했고, ${skippedRetryCount}개 이미지는 계정, 모델 또는 크레딧 설정 확인이 필요합니다.`,
          );
        }
      }

      if (renderRunRef.current === runId) {
        const completedCount = completedAngleIndexes.size;
        const remainingFailureCount = resultAngles.length - completedCount;

        setStatusMessage(
          remainingFailureCount > 0
            ? `${completedCount}개 상담용 이미지가 생성되었습니다. ${remainingFailureCount}개는 재시도 불가 오류이거나 자동 재생성 후에도 실패했습니다.`
            : `${completedCount}개 상담용 이미지가 생성되었습니다.`,
        );

        if (completedCount > 0) {
          const historyResults = resultAngles.map((angle, angleIndex) => ({
            className: angle.className,
            imageUrl: generatedAngleImageUrls.get(angleIndex),
            isGenerating: false,
            label: angle.label,
          }));

          setIsRendering(false);
          setConsultationCycleUsed(true);
          await autoSaveConsultationHistory(style, historyResults);
        }
      }
    } catch (error) {
      console.error(error);
      setStatusMessage(getGenerationFailureMessage(error, true));
    } finally {
      if (renderRunRef.current === runId) {
        setIsRendering(false);
      }
    }
  }

  async function requestAngleImage({
    angleIndex,
    photos,
    referenceFiles = [],
    referenceRole,
    region,
    style,
  }: {
    angleIndex: number;
    photos: PreparedPhotos;
    referenceFiles?: File[];
    referenceRole?: string;
    region: MirilookRegionId;
    style: DisplayRecommendation;
  }) {
    const formData = new FormData();
    appendPhotoPayload(
      formData,
      photos,
      selectedAudience,
      region,
    );
    appendStylePayload(
      formData,
      style,
      selectedHairColor.id,
      styleMemo,
      consultingFocusIds,
      recommendationMode,
      premiumAddOnsActive
        ? getAllowedPremiumAddOnIds(premiumAddOnIds, selectedAudience)
        : [],
      selectedAudience,
      region,
      style.isCelebrityReference ? celebrityReferenceGroupsWithPhotos : [],
    );
    formData.append("angleIndex", String(angleIndex));

    referenceFiles.forEach((reference, index) => {
      formData.append(index === 0 ? "base" : "baseReferences", reference);
    });

    if (referenceRole) {
      formData.append("referenceRole", referenceRole);
    }

    const payload = await postFormWithRetry<{
      imageUrl?: string;
    }>(`${apiBaseUrl}/api/hairstyles/angle/`, formData);

    if (!payload.imageUrl) {
      throw new Error("AI provider did not return an image.");
    }

    return payload.imageUrl;
  }

  function resetCurrentConsultationIdentity() {
    currentConsultationRef.current = null;
  }

  function getCurrentConsultationIdentity() {
    if (!currentConsultationRef.current) {
      currentConsultationRef.current = {
        createdAt: new Date().toISOString(),
        id: createLocalConsultationId(),
      };
    }

    return currentConsultationRef.current;
  }

  async function buildCurrentHistoryItem({
    makeupImagesForHistory,
    outfitImagesForHistory,
    recommendationsForHistory = recommendations,
    renderedResultsForHistory = renderedResults,
    requireResultImages = true,
    selectedStyleForHistory = selectedStyle,
  }: HistoryBuildOptions = {}) {
    const historyStyle =
      selectedStyleForHistory ??
      recommendationsForHistory.find((style) => style.imageUrl && !style.error) ??
      recommendationsForHistory[0];

    if (!historyStyle) {
      return null;
    }

    const images = renderedResultsForHistory
      .filter((result): result is RenderedResult & { imageUrl: string } =>
        Boolean(result.imageUrl),
      )
      .map((result) => ({
        imageUrl: result.imageUrl,
        label: result.label,
      }));

    const consultationIdentity = getCurrentConsultationIdentity();
    const [sourcePhotos, recommendationImages] = await Promise.all([
      buildSourceHistoryPhotos(photos),
      buildRecommendationHistoryImages(recommendationsForHistory, photos),
    ]);
    const outfitImages =
      outfitImagesForHistory ??
      buildOutfitHistoryImages(outfitFullBody, outfitRecommendations);
    const makeupImages =
      makeupImagesForHistory ?? buildMakeupHistoryImages(makeupPreview);
    const isRecommendationOnly = !selectedStyleForHistory && !images.length;

    if (requireResultImages && !images.length) {
      return null;
    }

    if (
      !images.length &&
      !recommendationImages.length &&
      !sourcePhotos.length &&
      !outfitImages.length &&
      !makeupImages.length
    ) {
      return null;
    }

    return {
      audienceName: selectedAudienceOption.label,
      consultingFocusNames: getConsultingFocusLabels(
        consultingFocusIds,
        recommendationMode,
        premiumAddOnsActive ? premiumAddOnIds : [],
        selectedAudience,
      ),
      createdAt: consultationIdentity.createdAt,
      hairColorName: selectedHairColor.name,
      id: consultationIdentity.id,
      images,
      makeupImages,
      memo: styleMemo.trim() || undefined,
      outfitImages,
      regionName: selectedRegionProfile.label,
      recommendationImages,
      sourcePhotos,
      sourcePhotoCount: sourcePhotos.length || uploadedPhotoCount,
      styleId: historyStyle.id,
      styleName: isRecommendationOnly
        ? "미리룩 스타일 추천 9장"
        : historyStyle.name,
      styleReason: isRecommendationOnly
        ? "업로드 사진과 선택 기준을 바탕으로 생성한 추천 스타일 후보입니다."
        : historyStyle.reason,
      styleTags: isRecommendationOnly
        ? collectRecommendationTags(recommendationsForHistory)
        : historyStyle.tags,
      salonProcess: isRecommendationOnly ? undefined : historyStyle.salonProcess,
      maintenanceAdvice: isRecommendationOnly
        ? undefined
        : historyStyle.maintenanceAdvice,
      outfitAdvice: isRecommendationOnly ? undefined : historyStyle.outfitAdvice,
      makeupAdvice: isRecommendationOnly ? undefined : historyStyle.makeupAdvice,
    } satisfies ConsultationHistoryItem;
  }

  async function persistConsultationHistoryItem(item: ConsultationHistoryItem) {
    const existingItems = await loadConsultationHistory().catch(() => []);
    const mergedItem = mergeHistoryItemForSave(
      existingItems.find((entry) => entry.id === item.id),
      item,
    );

    await saveConsultationHistoryItem(mergedItem);
    const [items, serverResult] = await Promise.all([
      loadConsultationHistory(),
      saveConsultationHistoryToServer(mergedItem),
    ]);

    setHistoryItems(items);

    return {
      item: mergedItem,
      serverResult,
    };
  }

  async function autoSaveRecommendationHistory(
    recommendationsForHistory: DisplayRecommendation[],
  ) {
    const item = await buildCurrentHistoryItem({
      recommendationsForHistory,
      requireResultImages: false,
      selectedStyleForHistory: null,
    });

    if (!item) {
      return;
    }

    try {
      const result = await persistConsultationHistoryItem(item);
      setHistoryStatus(
        buildRecommendationHistorySaveMessage(result.serverResult),
      );
    } catch (error) {
      console.error(error);
      setHistoryStatus(
        error instanceof Error
          ? error.message
          : "추천 스타일을 히스토리에 자동 저장하지 못했습니다.",
      );
    }
  }

  async function autoSaveConsultationHistory(
    style: DisplayRecommendation,
    renderedResultsForHistory: RenderedResult[],
  ) {
    const item = await buildCurrentHistoryItem({
      renderedResultsForHistory,
      selectedStyleForHistory: style,
    });

    if (!item) {
      return;
    }

    try {
      const result = await persistConsultationHistoryItem(item);
      setHistoryStatus(
        buildConsultationHistorySaveMessage(
          result.item.styleName,
          result.serverResult,
        ),
      );
    } catch (error) {
      console.error(error);
      setHistoryStatus(
        error instanceof Error
          ? error.message
          : "상담용 이미지를 히스토리에 자동 저장하지 못했습니다.",
      );
    }
  }

  async function autoSaveStyleExpansionHistory(
    style: DisplayRecommendation,
    {
      makeupImagesForHistory,
      outfitImagesForHistory,
      statusLabel,
    }: {
      makeupImagesForHistory?: HistoryImageItem[];
      outfitImagesForHistory?: HistoryImageItem[];
      statusLabel: string;
    },
  ) {
    const item = await buildCurrentHistoryItem({
      makeupImagesForHistory,
      outfitImagesForHistory,
      requireResultImages: false,
      selectedStyleForHistory: style,
    });

    if (!item) {
      return;
    }

    try {
      const result = await persistConsultationHistoryItem(item);
      setHistoryStatus(
        buildStyleExpansionHistorySaveMessage(
          result.item.styleName,
          result.serverResult,
          statusLabel,
        ),
      );
    } catch (error) {
      console.error(error);
      setHistoryStatus(
        error instanceof Error
          ? error.message
          : `${statusLabel}를 히스토리에 자동 저장하지 못했습니다.`,
      );
    }
  }

  async function saveCurrentConsultation() {
    const noticeId = Date.now();
    const item = await buildCurrentHistoryItem();

    if (!item) {
      setHistoryStatus("");
      setHistorySaveNotice({
        id: noticeId,
        message: "저장할 상담 이미지가 아직 없습니다.",
        status: "error",
      });
      return;
    }

    setHistoryStatus("");
    setHistorySaveNotice({
      id: noticeId,
      message: `${item.styleName} 결과를 히스토리에 저장하고 있습니다.`,
      status: "saving",
    });

    try {
      const result = await persistConsultationHistoryItem(item);
      const message = buildHistorySaveMessage(
        result.item.styleName,
        result.serverResult,
      );

      setHistorySaveNotice({
        id: noticeId,
        message,
        status: "complete",
      });
    } catch (error) {
      console.error(error);
      setHistoryStatus("");
      setHistorySaveNotice({
        id: noticeId,
        message:
          error instanceof Error
            ? error.message
            : "브라우저 저장소에 결과를 저장하지 못했습니다.",
        status: "error",
      });
    }
  }

  function requestPhotoUpload(slot: PhotoSlot) {
    if (!privacyAccepted) {
      setStatusMessage("사진 업로드 전 개인정보 안내와 AI 참고용 고지에 동의해 주세요.");
      setConsentPopupAction(slot);
      return;
    }

    getInputRef(slot).current?.click();
  }

  function acceptConsentAndContinueUpload() {
    const targetAction = consentPopupAction;

    setPrivacyAccepted(true);
    setConsentPopupAction(null);

    if (!targetAction) {
      return;
    }

    window.setTimeout(() => {
      if (targetAction === "saved-profile") {
        void loadSavedProfilePhotos(true);
        return;
      }

      getInputRef(targetAction).current?.click();
    }, 0);
  }

  function openRenderedResultPreview(index: number) {
    if (!renderedResults[index]?.imageUrl) {
      return;
    }

    setRenderedResultPreview({ index });
  }

  function toggleRenderedResultMirror(label: string) {
    setMirroredResultLabels((current) => {
      const next = new Set(current);

      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }

      return next;
    });
  }

  async function downloadAllRenderedResults() {
    if (!selectedStyle) {
      return;
    }

    const downloadableResults = renderedResults
      .map((result, index) => ({ index, result }))
      .filter(
        (
          item,
        ): item is {
          index: number;
          result: RenderedResult & { imageUrl: string };
        } => Boolean(item.result.imageUrl),
      );

    if (!downloadableResults.length) {
      setStatusMessage("저장할 상담용 이미지가 아직 없습니다.");
      return;
    }

    setIsDownloadingRenderedResults(true);
    setStatusMessage(`상담용 이미지 ${downloadableResults.length}장을 저장합니다.`);

    try {
      for (const { index, result } of downloadableResults) {
        await downloadResultImage(
          result.imageUrl,
          `mirilook-${selectedStyle.id}-${index + 1}-${result.label}.jpg`,
          { mirrored: mirroredResultLabels.has(result.label) },
        );
        await waitForDownloadStep();
      }

      setStatusMessage(
        `상담용 이미지 ${downloadableResults.length}장을 모두 저장했습니다.`,
      );
    } finally {
      setIsDownloadingRenderedResults(false);
    }
  }

  function moveRenderedResultPreview(direction: -1 | 1) {
    setRenderedResultPreview((current) => {
      if (!current || !renderedResults.length) {
        return current;
      }

      for (let step = 1; step <= renderedResults.length; step += 1) {
        const nextIndex =
          (current.index + direction * step + renderedResults.length) %
          renderedResults.length;

        if (renderedResults[nextIndex]?.imageUrl) {
          return { index: nextIndex };
        }
      }

      return current;
    });
  }

  async function emailCurrentConsultation() {
    const item = await buildCurrentHistoryItem();
    const recipient = emailRecipient.trim();

    if (!item) {
      setHistoryStatus("이메일로 보낼 상담 이미지가 아직 없습니다.");
      return;
    }

    if (!isValidEmailAddress(recipient)) {
      setHistoryStatus("이메일 주소를 정확히 입력해 주세요.");
      return;
    }

    setIsEmailSending(true);
    setHistoryStatus("상담 결과를 저장하고 이메일을 준비하는 중입니다.");

    try {
      const saveResult = await persistConsultationHistoryItem(item);

      if (!saveResult.serverResult.saved) {
        setHistoryStatus(buildEmailPreflightMessage(saveResult.serverResult));
        return;
      }

      const result = await sendConsultationEmail(saveResult.item, recipient);

      if (result.shareUrl) {
        setShareUrl(result.shareUrl);
      }
      setHistoryStatus(buildEmailSendMessage(result, recipient));
    } catch (error) {
      console.error(error);
      setHistoryStatus(
        error instanceof Error
          ? error.message
          : "이메일 전송에 실패했습니다. 잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setIsEmailSending(false);
    }
  }

  async function shareCurrentConsultation() {
    const item = await buildCurrentHistoryItem();

    if (!item) {
      setHistoryStatus("공유할 상담 이미지가 아직 없습니다.");
      return;
    }

    setIsShareCreating(true);
    setHistoryStatus("공유 링크를 만들기 위해 상담 결과를 서버에 저장하는 중입니다.");

    try {
      const saveResult = await persistConsultationHistoryItem(item);

      if (!saveResult.serverResult.saved || !saveResult.serverResult.sessionId) {
        setHistoryStatus(buildShareCreateMessage(saveResult.serverResult));
        return;
      }

      const result = await createConsultationShareLink(saveResult.serverResult.sessionId);

      if (!result.created || !result.shareUrl) {
        setHistoryStatus(buildShareCreateMessage(result));
        return;
      }

      setShareUrl(result.shareUrl);
      setHistoryStatus(
        result.reused
          ? "기존 공유 링크를 다시 사용할 수 있습니다. 만료일은 최신 요청 기준으로 갱신했습니다."
          : "공유 링크가 생성되었습니다. 링크를 복사해 미용사나 지인에게 전달할 수 있습니다.",
      );
    } catch (error) {
      console.error(error);
      setHistoryStatus(
        error instanceof Error
          ? error.message
          : "공유 링크를 만들지 못했습니다. PDF 저장 또는 이메일 전송을 이용해 주세요.",
      );
    } finally {
      setIsShareCreating(false);
    }
  }

  async function copyShareUrl() {
    if (!shareUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setHistoryStatus("공유 링크를 클립보드에 복사했습니다.");
    } catch {
      setHistoryStatus("클립보드 복사가 차단되었습니다. 링크를 직접 선택해 복사해 주세요.");
    }
  }

  async function nativeShareCurrentUrl() {
    if (!shareUrl) {
      return;
    }

    try {
      const result = await shareConsultationUrl({
        text: "미리룩에서 만든 헤어 상담 보드입니다.",
        title: `${selectedStyle?.name ?? "Miri Look"} 상담 결과`,
        url: shareUrl,
      });

      if (result === "cancelled") {
        setHistoryStatus("공유를 취소했습니다.");
        return;
      }

      setHistoryStatus(
        result === "shared"
          ? "공유 앱으로 연결했습니다. 카카오톡이 보이면 선택해 전달할 수 있습니다."
          : "기기가 직접 공유를 지원하지 않아 링크를 복사했습니다.",
      );
    } catch {
      setHistoryStatus("공유가 차단되었습니다. 링크 복사를 이용해 주세요.");
    }
  }

  async function printCurrentConsultation() {
    const item = await buildCurrentHistoryItem();

    if (!item) {
      setHistoryStatus("PDF로 저장할 상담 이미지가 아직 없습니다.");
      return;
    }

    setHistoryStatus(getPrintableReportStatus(openPrintableReport(item)));
  }

  function updateRenderedResult(
    label: string,
    patch: Partial<RenderedResult>,
  ) {
    setRenderedResults((current) =>
      current.map((result) =>
        result.label === label
          ? {
              ...result,
              ...patch,
            }
          : result,
      ),
    );
  }

  function resetAll() {
    Object.values(photos).forEach((photo) => {
      if (photo?.url) {
        URL.revokeObjectURL(photo.url);
        createdUrlsRef.current.delete(photo.url);
      }
    });
    celebrityReferenceGroups.forEach((group) => {
      group.photos.forEach((reference) => {
        if (reference.url) {
          URL.revokeObjectURL(reference.url);
          createdUrlsRef.current.delete(reference.url);
        }
      });
    });

    if (analysisTimerRef.current) {
      window.clearTimeout(analysisTimerRef.current);
      analysisTimerRef.current = null;
    }

    setPhotos({ left: null, front: null, right: null });
    setCelebrityReferenceGroups([{ ...initialCelebrityReferenceGroup, photos: [] }]);
    setActiveCelebrityReferenceGroupId(initialCelebrityReferenceGroup.id);
    setIsAnalyzing(false);
    setIsGeneratingPreviews(false);
    setAnalysisReady(false);
    setSelectedStyleId(null);
    setRecommendations(audienceFallbackStyles);
    setAnalysisNotes(analysisLinesByAudience[selectedAudience]);
    setRenderedResults([]);
    resetCurrentConsultationIdentity();
    setIsRendering(false);
    setStatusMessage("");
    setShareUrl("");
    setStyleMemo("");
    setConsultingFocusIds([]);
    previewRunRef.current += 1;
    renderRunRef.current += 1;

    if (leftInputRef.current) {
      leftInputRef.current.value = "";
    }

    if (frontInputRef.current) {
      frontInputRef.current.value = "";
    }

    if (rightInputRef.current) {
      rightInputRef.current.value = "";
    }
  }

  function getInputRef(slot: PhotoSlot) {
    if (slot === "left") {
      return leftInputRef;
    }

    if (slot === "right") {
      return rightInputRef;
    }

    return frontInputRef;
  }

  function selectAudience(audience: MirilookAudience) {
    if (audience === selectedAudience) {
      return;
    }

    if (analysisTimerRef.current) {
      window.clearTimeout(analysisTimerRef.current);
      analysisTimerRef.current = null;
    }

    const nextFallbackStyles = applyCelebrityReferenceRecommendation(
      buildRecommendationSet(
        getRegionSeedStylesByAudience(selectedRegion, audience),
        [],
        selectedHairColor,
        styleMemo,
        audience,
        consultingFocusIds,
        selectedRegion,
        recommendationMode,
        premiumAddOnsActive
          ? getAllowedPremiumAddOnIds(premiumAddOnIds, audience)
          : [],
      ),
      celebrityReferenceGroupsWithPhotos,
      selectedHairColor,
      styleMemo,
      consultingFocusIds,
      audience,
      selectedRegion,
      recommendationMode,
      premiumAddOnsActive
        ? getAllowedPremiumAddOnIds(premiumAddOnIds, audience)
        : [],
    );
    const nextOption = audienceOptions.find((option) => option.id === audience);

    setSelectedAudience(audience);
    setPremiumAddOnIds((current) =>
      premiumAddOnsActive ? getAllowedPremiumAddOnIds(current, audience) : [],
    );
    setPreferredStyleIds([]);
    setActiveInfoStyleId(nextFallbackStyles[0]?.id ?? null);
    setRecommendations(nextFallbackStyles);
    setAnalysisNotes(analysisLinesByAudience[audience]);
    setAnalysisReady(false);
    setSelectedStyleId(null);
    setRenderedResults([]);
    resetCurrentConsultationIdentity();
    setShareUrl("");
    setIsRendering(false);
    setIsAnalyzing(false);
    setIsGeneratingPreviews(false);
    setStatusMessage(
      `${nextOption?.label ?? "선택한"} 모드로 전환했습니다. 사진은 유지되며, 추천 받기를 누르면 해당 모드 전용 카탈로그로 다시 분석합니다.`,
    );
    previewRunRef.current += 1;
    renderRunRef.current += 1;
  }

  return (
    <section className="w-full max-w-6xl overflow-x-clip rounded-lg border border-white/12 bg-[#171511]/88 p-4 shadow-2xl shadow-black/40 backdrop-blur md:p-5">
      <input
        accept="image/*"
        className="sr-only"
        onChange={(event) => void handlePhotoChange("left", event)}
        ref={leftInputRef}
        type="file"
      />
      <input
        accept="image/*"
        className="sr-only"
        onChange={(event) => void handlePhotoChange("front", event)}
        ref={frontInputRef}
        type="file"
      />
      <input
        accept="image/*"
        className="sr-only"
        onChange={(event) => void handlePhotoChange("right", event)}
        ref={rightInputRef}
        type="file"
      />
      <input
        accept="image/*"
        className="sr-only"
        multiple
        onChange={(event) => void handleCelebrityReferenceChange(event)}
        ref={celebrityInputRef}
        type="file"
      />

      <AudienceSelector
        selectedAudience={selectedAudience}
        onChange={selectAudience}
      />
      <FlowStepper
        activeStep={
          renderedResults.some((result) => result.imageUrl)
            ? 4
            : selectedStyle
              ? 3
              : analysisReady
                ? 2
                : hasAnyPhoto
                  ? 1
                  : 0
        }
      />
      <ConsentNotice
        accepted={privacyAccepted}
        onChange={setPrivacyAccepted}
      />
      {consentPopupAction ? (
        <ConsentRequiredDialog
          actionLabel={
            consentPopupAction === "saved-profile"
              ? "마이페이지 저장 사진"
              : getSlotLabel(consentPopupAction)
          }
          onAccept={acceptConsentAndContinueUpload}
          onClose={() => setConsentPopupAction(null)}
        />
      ) : null}
      {historySaveNotice ? (
        <HistorySaveNotice
          key={historySaveNotice.id}
          message={historySaveNotice.message}
          onClose={() => setHistorySaveNotice(null)}
          status={historySaveNotice.status}
        />
      ) : null}
      {extraConsultationStyle ? (
        <ExtraConsultationChargeDialog
          charging={extraConsultationCharging}
          onCancel={() => setExtraConsultationStyle(null)}
          onConfirm={() => void confirmExtraConsultation()}
          styleName={extraConsultationStyle.name}
        />
      ) : null}
      {extraConsultationStore ? (
        <ExtraConsultationStorePopup
          balance={extraConsultationStore.balance}
          charging={extraConsultationCharging}
          cost={extraConsultationStore.cost}
          onClose={() => setExtraConsultationStore(null)}
          onResume={() =>
            void runExtraConsultationCharge(extraConsultationStore.style)
          }
          styleName={extraConsultationStore.style.name}
        />
      ) : null}

      <div className="grid grid-cols-3 items-stretch gap-2 sm:gap-3 lg:gap-4">
        {photoSlotConfig.map((item) => (
          <UploadBox
            badge={item.badge}
            hint={item.hint}
            key={item.slot}
            label={item.label}
            photo={photos[item.slot]}
            quality={photoQuality[item.slot]}
            slot={item.slot}
            onClick={() => requestPhotoUpload(item.slot)}
          />
        ))}
      </div>

      <div className="mt-4 flex flex-col justify-between gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold text-[#fffaf1]">
            {readyPhotos
              ? `${uploadedPhotoCount}장 준비 완료: 이제 추천을 받을 수 있어요.`
              : missingPhotoCount === 1
                ? "사진 1장만 더 올리면 추천을 받을 수 있어요."
                : "사진 2장을 올리면 바로 추천받을 수 있어요."}
          </p>
          <p className="mt-1 text-sm text-[#b8aa95]">
            정면 사진을 포함하면 더 좋고, 3장을 모두 올리면 얼굴 방향과 두상 정보를 더 정확하게 반영합니다.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-md bg-[#30271a] px-2 py-1 text-[#f3d28a]">
              {Math.min(uploadedPhotoCount, 2)}/2장 완료
            </span>
            <span
              className={`rounded-md px-2 py-1 ${
                photos.front
                  ? "bg-[#203424] text-[#b7e3bb]"
                  : "bg-white/7 text-[#b8aa95]"
              }`}
            >
              정면 {photos.front ? "업로드됨" : "권장"}
            </span>
            <span
              className={`rounded-md px-2 py-1 ${
                uploadedPhotoCount === 3
                  ? "bg-[#203424] text-[#b7e3bb]"
                  : "bg-white/7 text-[#b8aa95]"
              }`}
            >
              3장 업로드 시 정확도 향상
            </span>
          </div>
        </div>
        {hasAnyPhoto ? (
          <div className="flex flex-wrap gap-2">
            <button
              className="inline-flex h-11 w-fit items-center gap-2 rounded-md bg-[#f3d28a] px-5 text-sm font-bold text-[#1a1712] shadow-md shadow-black/25 transition hover:bg-[#ffdf98] disabled:cursor-not-allowed disabled:bg-[#6b5b36] disabled:text-[#d8cbb8]"
              disabled={isLoadingSavedPhotos}
              onClick={() => void loadSavedProfilePhotos()}
              type="button"
            >
              {isLoadingSavedPhotos ? (
                <Loader2 aria-hidden="true" className="animate-spin" size={15} />
              ) : (
                <Download aria-hidden="true" size={15} />
              )}
              내 사진 불러오기
            </button>
            <button
              className="inline-flex h-11 w-fit items-center gap-2 rounded-md border border-white/12 px-4 text-sm font-semibold text-[#e7dccb] transition hover:bg-white/8"
              onClick={resetAll}
              type="button"
            >
              <RefreshCw aria-hidden="true" size={15} />
              다시 업로드
            </button>
          </div>
        ) : (
          <button
            className="inline-flex h-10 w-fit items-center gap-2 rounded-md border border-white/12 px-3 text-sm font-semibold text-[#e7dccb] transition hover:bg-white/8 disabled:cursor-not-allowed disabled:text-[#8f826f]"
            disabled={isLoadingSavedPhotos}
            onClick={() => void loadSavedProfilePhotos()}
            type="button"
          >
            {isLoadingSavedPhotos ? (
              <Loader2 aria-hidden="true" className="animate-spin" size={15} />
            ) : (
              <Download aria-hidden="true" size={15} />
            )}
            내 사진 불러오기
          </button>
        )}
      </div>

      {hasAnyPhoto ? (
        <div className="mt-5 grid gap-5 border-t border-white/10 pt-5">
          <div className="rounded-md border border-[#2b281f] bg-[#0f0e0c]/72 p-4">
            <div>
              <p className="text-sm font-semibold text-[#fffaf1]">
                {readyPhotos
                  ? "사진 준비 완료"
                  : `추천까지 사진 ${missingPhotoCount}장 남음`}
              </p>
              <p className="mt-1 text-sm text-[#b8aa95]">
                추천 목적과 헤어 컬러는 선택 사항입니다. 건너뛰어도 미리룩이 자동으로 추천합니다.
              </p>
            </div>
          </div>
          <RecommendationModePanel
            mode={recommendationMode}
            onSelect={selectRecommendationMode}
          />
          {showHaircutPreferencePanel ? (
            <StylePreferencePanel
              activeInfoStyleId={activeInfoStyleId}
              audience={selectedAudience}
              styleGroups={audienceStyleGroups}
              styles={audienceStyles}
              onInfoChange={setActiveInfoStyleId}
              onToggleStyle={togglePreferredStyle}
              selectedHairColor={selectedHairColor}
              selectedStyleIds={preferredStyleIds}
            />
          ) : null}
          <HairColorPanel
            onSelect={selectHairColor}
            selectedColorId={selectedHairColorId}
          />
          {showPersonalConsultPanel ? (
            <PersonalConsultPanel
              selectedFocusIds={consultingFocusIds}
              onToggle={toggleConsultingFocus}
            />
          ) : null}
          <StyleMemoPanel
            audience={selectedAudience}
            onChange={updateStyleMemo}
            value={styleMemo}
          />
          <CelebrityReferencePanel
            activeGroupId={activeCelebrityReferenceGroupId}
            groups={celebrityReferenceGroups}
            remainingSlots={Math.max(
              0,
              maxCelebrityReferenceCount - celebrityReferenceGroupsWithPhotos.length,
            )}
            onAddGroup={addCelebrityReferenceGroup}
            onAddFromUrl={handleCelebrityReferenceUrlAdd}
            onClear={clearCelebrityReferences}
            onRemoveGroup={removeCelebrityReferenceGroup}
            onRemovePhoto={removeCelebrityReferencePhoto}
            onSelectGroup={setActiveCelebrityReferenceGroupId}
            onUploadClick={() => celebrityInputRef.current?.click()}
          />
          <div className="grid gap-4 rounded-md border border-[#c9a96a]/35 bg-[#30271a]/45 p-4">
            <div>
              <p className="text-sm font-semibold text-[#fffaf1]">
                추천 기준을 모두 확인한 뒤 시작하세요.
              </p>
              <p className="mt-1 text-sm leading-6 text-[#d8cbb8]">
                추천 목적과 헤어 컬러, 필요한 메모를 먼저 확인하면 더 정확한 9개 이미지를 만들 수 있습니다. 실제 추천 1회당 {HairMoneyRecommendationCost} Hair Money({HairMoneyRecommendationPriceKrw.toLocaleString("ko-KR")}원 기준)가 차감됩니다.
              </p>
              <MirilookGenerationRefundNotice className="mt-3" />
            </div>
            <div className="flex justify-center">
              <button
                className={`inline-flex min-h-16 w-full max-w-sm items-center justify-center gap-3 rounded-md bg-[#f3d28a] px-7 py-3 text-base font-black leading-6 text-[#1a1712] transition hover:bg-[#ffdf98] disabled:cursor-not-allowed disabled:bg-[#4a412e] disabled:text-[#b8aa95] sm:w-80 ${
                  shouldPulseRecommendationCta ? "mirilook-neon-recommend-cta" : ""
                }`}
                data-mirilook-cta="style-recommendation"
                disabled={!readyPhotos || isRecommendationBusy}
                onClick={startRecommendation}
                type="button"
              >
                {isRecommendationBusy ? (
                  <Loader2 aria-hidden="true" className="animate-spin" size={20} />
                ) : (
                  <Sparkles aria-hidden="true" size={20} />
                )}
                {recommendationCtaLabel === "스타일 추천 받기" ? (
                  <span className="text-center leading-6">
                    <span className="block">스타일</span>
                    <span className="block">추천 받기</span>
                  </span>
                ) : (
                  recommendationCtaLabel
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isRecommendationBusy ? (
        <LoadingPanel
          label={
            isGeneratingPreviews
              ? "AI가 추천 후보 이미지를 합성하는 중..."
              : liveAiEnabled
              ? "사진을 분석하고 스타일 후보를 고르는 중..."
              : "사진 기준으로 어울리는 헤어 디자인을 고르는 중..."
          }
        />
      ) : null}

      {statusMessage ? (
        <p className="mt-4 rounded-md border border-white/10 bg-[#0f0e0c]/72 px-3 py-2 text-sm text-[#b8aa95]">
          {statusMessage}
        </p>
      ) : null}

      {analysisReady && frontPhoto && sidePhoto ? (
        <div className="mt-5 grid gap-5 border-t border-white/10 pt-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {recommendations.map((style) => (
              <StyleCard
                active={style.id === selectedStyleId}
                frontPhoto={frontPhoto}
                key={style.id}
                onSelect={() => previewStyle(style)}
                style={style}
              />
            ))}
          </div>

          <section className="rounded-md border border-[#2b281f] bg-[#0f0e0c]/82 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles aria-hidden="true" className="text-[#f3d28a]" size={18} />
              <h2 className="text-lg font-semibold text-[#fffaf1]">
                추천 결과
              </h2>
            </div>
            <div className="grid gap-2 text-sm leading-6 text-[#d8cbb8]">
              {analysisNotes.map((line) => (
                <p
                  className={
                    isConsultationGuideLine(line)
                      ? "font-bold text-[#f3d28a] underline decoration-[#f3d28a]/80 decoration-2 underline-offset-4"
                      : undefined
                  }
                  key={line}
                >
                  {line}
                </p>
              ))}
            </div>
            <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border border-[#2b281f] bg-[#11100e]/70 px-3 py-2">
              <label
                className="text-xs font-semibold text-[#b8aa95]"
                htmlFor="outfit-occasion-date"
              >
                코디 착용 예정일
              </label>
              <input
                className="h-9 rounded-md border border-white/12 bg-[#08130f] px-2 text-sm text-[#fffaf1] outline-none transition focus:border-[#f3d28a]"
                id="outfit-occasion-date"
                onChange={(event) => setOutfitOccasionDate(event.target.value)}
                type="date"
                value={outfitOccasionDate}
              />
            </div>
            <RecommendationControlStack
              audience={selectedAudience}
              canUseActions={Boolean(selectedStyle)}
              consultationCycleUsed={consultationCycleUsed}
              entitlementActive={premiumAddOnsActive}
              entitlementStatus={paymentEntitlementStatus}
              hasConsultationResults={renderedResults.length > 0}
              hasOutfitRequest={Boolean(
                outfitRecommendations.length ||
                  outfitFullBody.isGenerating ||
                  outfitFullBody.imageUrl ||
                  outfitFullBody.error,
              )}
              isOutfitGenerating={outfitFullBody.isGenerating}
              isRendering={isRendering}
              onGenerateConsultation={generateSelectedConsultationSet}
              onPaymentRecorded={() => void refreshPremiumEntitlementsAfterPayment()}
              onShowOutfit={showOutfitRecommendations}
              selectedStyle={selectedStyle}
            />
          </section>
        </div>
      ) : null}

      {analysisReady &&
      selectedStyle &&
      (outfitRecommendations.length ||
        outfitFullBody.isGenerating ||
        outfitFullBody.imageUrl ||
        outfitFullBody.error ||
        makeupPreview.isGenerating ||
        makeupPreview.imageUrl ||
        makeupPreview.error) ? (
        <div ref={styleExpansionPanelRef}>
          <StyleExpansionResultPanel
            outfitFullBody={outfitFullBody}
            makeupPreview={makeupPreview}
            outfitRecommendations={outfitRecommendations}
            selectedStyle={selectedStyle}
          />
        </div>
      ) : null}

      {selectedStyle && frontPhoto && sidePhoto ? (
        <SelectedPreviewPanel
          frontPhoto={frontPhoto}
          style={selectedStyle}
        />
      ) : null}

      {selectedStyle && renderedResults.length ? (
        <div className="mt-5 grid gap-4 border-t border-white/10 pt-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-xl font-semibold text-[#fffaf1]">
                {selectedStyle.name} 상담용 9장
              </h3>
              <p className="mt-1 text-sm text-[#b8aa95]">
                선택한 추천 이미지의 방향을 먼저 배치하고, 얼굴과 옷 톤을 유지하며 나머지 각도를 생성합니다.
              </p>
            </div>
            <button
              aria-label={`${selectedStyle.name} 상담용 이미지 모두 저장하기`}
              className="inline-flex h-10 w-fit shrink-0 items-center justify-center gap-2 rounded-md border border-[#c9a96a]/55 bg-[#171511] px-3 text-sm font-bold text-[#f3d28a] transition hover:bg-[#f3d28a]/10 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-[#8f826f]"
              disabled={
                isDownloadingRenderedResults || renderedResultImageCount === 0
              }
              onClick={() => void downloadAllRenderedResults()}
              title="사진 9장을 한 번에 저장"
              type="button"
            >
              {isDownloadingRenderedResults ? (
                <Loader2 aria-hidden="true" className="animate-spin" size={16} />
              ) : (
                <Download aria-hidden="true" size={16} />
              )}
              {isDownloadingRenderedResults ? "저장 중" : "모두 저장하기"}
            </button>
          </div>
          {!isRendering &&
          renderedResults.some((result) => result.error && !result.imageUrl) ? (
            <div className="flex flex-col gap-3 rounded-md border border-[#f48aa5]/40 bg-[#30151c]/82 p-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-start gap-2 text-sm font-semibold leading-6 text-[#ffd5dd]">
                <Info
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 text-[#ff8fa8]"
                  size={16}
                />
                9장 중{" "}
                {
                  renderedResults.filter((result) => !result.imageUrl).length
                }장이 생성되지 않았습니다. 다시 생성해도 추가 비용은 없습니다.
              </p>
              <button
                className="inline-flex h-10 w-fit shrink-0 items-center justify-center gap-2 rounded-md bg-[#f3d28a] px-3 text-sm font-bold text-[#1a1712] transition hover:bg-[#ffdf98]"
                onClick={() => void generateConsultationSet(selectedStyle)}
                type="button"
              >
                <RefreshCw aria-hidden="true" size={16} />
                다시 생성
              </button>
            </div>
          ) : null}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {renderedResults.map((result, index) => (
              <ResultCard
                isMirrored={mirroredResultLabels.has(result.label)}
                key={result.label}
                onPreview={() => openRenderedResultPreview(index)}
                onToggleMirror={() => toggleRenderedResultMirror(result.label)}
                result={result}
                selectedStyle={selectedStyle}
              />
            ))}
          </div>
          {renderedResultPreview ? (
            <RenderedResultPreviewDialog
              isMirrored={mirroredResultLabels.has(
                renderedResults[renderedResultPreview.index]?.label ?? "",
              )}
              onClose={() => setRenderedResultPreview(null)}
              onMove={moveRenderedResultPreview}
              onToggleMirror={() => {
                const result = renderedResults[renderedResultPreview.index];

                if (result) {
                  toggleRenderedResultMirror(result.label);
                }
              }}
              preview={renderedResultPreview}
              results={renderedResults}
              selectedStyle={selectedStyle}
            />
          ) : null}
          <div className="grid gap-4 rounded-md border border-[#2b281f] bg-[#0f0e0c]/72 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
            <div>
              <p className="text-sm font-semibold text-[#fffaf1]">
                결과 저장
              </p>
              <p className="mt-1 text-sm text-[#b8aa95]">
                현재 브라우저에 상담 기록을 남기고, PDF 저장 또는 이메일 전송으로 미용사에게 공유할 수 있습니다.
              </p>
            </div>
            <div className="grid gap-3">
              <div className="flex flex-wrap gap-2">
                <button
                  className="inline-flex h-10 items-center gap-2 rounded-md bg-[#f3d28a] px-3 text-sm font-bold text-[#1a1712] transition hover:bg-[#ffdf98] disabled:cursor-not-allowed disabled:bg-[#6b5b36] disabled:text-[#d8cbb8]"
                  disabled={historySaveNotice?.status === "saving"}
                  onClick={() => void saveCurrentConsultation()}
                  type="button"
                >
                  {historySaveNotice?.status === "saving" ? (
                    <Loader2 aria-hidden="true" className="animate-spin" size={16} />
                  ) : (
                    <Check aria-hidden="true" size={16} />
                  )}
                  {historySaveNotice?.status === "saving"
                    ? "저장 중"
                    : "히스토리에 저장"}
                </button>
                <button
                  className="inline-flex h-10 items-center gap-2 rounded-md bg-[#f3d28a] px-4 text-sm font-bold text-[#1a1712] shadow-md shadow-black/25 transition hover:bg-[#ffdf98]"
                  onClick={() => void printCurrentConsultation()}
                  type="button"
                >
                  <Download aria-hidden="true" size={16} />
                  PDF로 저장
                </button>
                <button
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-[#c9a96a]/50 px-3 text-sm font-semibold text-[#f3d28a] transition hover:bg-[#f3d28a]/10 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-[#8f826f]"
                  disabled={isShareCreating}
                  onClick={() => void shareCurrentConsultation()}
                  type="button"
                >
                  {isShareCreating ? (
                    <Loader2 aria-hidden="true" className="animate-spin" size={16} />
                  ) : (
                    <Share2 aria-hidden="true" size={16} />
                  )}
                  공유 링크 만들기
                </button>
              </div>
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                <label className="sr-only" htmlFor="consultation-email">
                  상담 결과를 받을 이메일
                </label>
                <input
                  className="h-10 rounded-md border border-white/10 bg-[#11100e] px-3 text-sm text-[#fffaf1] outline-none transition placeholder:text-[#8f826f] focus:border-[#f3d28a]/70"
                  id="consultation-email"
                  inputMode="email"
                  onChange={(event) => setEmailRecipient(event.target.value)}
                  placeholder="미용사 또는 내 이메일"
                  type="email"
                  value={emailRecipient}
                />
                <button
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#c9a96a]/50 px-3 text-sm font-semibold text-[#f3d28a] transition hover:bg-[#f3d28a]/10 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-[#8f826f]"
                  disabled={isEmailSending}
                  onClick={() => void emailCurrentConsultation()}
                  type="button"
                >
                  {isEmailSending ? (
                    <Loader2 aria-hidden="true" className="animate-spin" size={16} />
                  ) : (
                    <Mail aria-hidden="true" size={16} />
                  )}
                  이메일 전송
                </button>
              </div>
              {shareUrl ? (
                <div className="grid gap-2 rounded-md border border-white/10 bg-[#11100e] p-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
                  <a
                    className="truncate text-sm font-semibold text-[#f3d28a] underline-offset-4 hover:underline"
                    href={shareUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {shareUrl}
                  </a>
                  <button
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-[#c9a96a]/50 px-3 text-sm font-semibold text-[#f3d28a] transition hover:bg-[#f3d28a]/10"
                    onClick={() => void nativeShareCurrentUrl()}
                    type="button"
                  >
                    <Share2 aria-hidden="true" size={15} />
                    카톡/공유
                  </button>
                  <button
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-white/12 px-3 text-sm font-semibold text-[#e7dccb] transition hover:bg-white/8"
                    onClick={() => void copyShareUrl()}
                    type="button"
                  >
                    <Copy aria-hidden="true" size={15} />
                    복사
                  </button>
                </div>
              ) : null}
            </div>
          </div>
          {historyStatus ? (
            <p className="rounded-md border border-white/10 bg-[#0f0e0c]/72 px-3 py-2 text-sm text-[#b8aa95]">
              {historyStatus}
            </p>
          ) : null}
        </div>
      ) : null}

      {historyItems.length ? (
        <HistoryPanel
          items={historyItems}
          onPrint={openPrintableReport}
        />
      ) : null}
    </section>
  );
}

function AudienceSelector({
  selectedAudience,
  onChange,
}: {
  selectedAudience: MirilookAudience;
  onChange: (audience: MirilookAudience) => void;
}) {
  return (
    <section className="mb-4 rounded-md border border-[#c9a96a]/35 bg-[#201a12]/88 p-4">
      <p className="text-center text-sm font-semibold text-[#f3d28a] sm:text-left">
        먼저 추천 서비스를 선택해 주세요.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-3">
        {audienceOptions.map((option) => {
          const selected = option.id === selectedAudience;
          const toneClass =
            option.id === "female"
              ? selected
                ? "border-[#ff9ec8] bg-[#d9367e] text-white shadow-lg shadow-[#000]/30"
                : "border-[#d95b8d]/70 bg-[#4a1830] text-[#fff1f7] hover:border-[#ff9ec8] hover:bg-[#5b1d39]"
              : selected
                ? "border-[#f8dfa0] bg-[#f3d28a] text-[#1a1712] shadow-lg shadow-[#000]/30"
                : "border-[#c9a96a]/75 bg-[#3a2c17] text-[#fff7e6] hover:border-[#f3d28a] hover:bg-[#4a381f]";
          const checkClass =
            option.id === "female"
              ? "border-white/70 bg-white/20 text-white"
              : "border-[#1a1712]/35 bg-[#1a1712]/10 text-[#1a1712]";

          return (
            <button
              className={`relative flex min-h-20 items-center justify-center rounded-md border px-2 py-4 text-center transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f3d28a] sm:px-4 sm:py-5 ${toneClass}`}
              key={option.id}
              onClick={() => onChange(option.id)}
              type="button"
            >
              <span className="flex flex-col items-center justify-center text-center leading-tight">
                <span className="break-keep text-xl font-extrabold sm:text-2xl md:text-3xl">
                  {option.label}
                </span>
                <span className="mt-1 text-xs font-semibold sm:text-sm">
                  {option.eyebrow}
                </span>
              </span>
              {selected ? (
                <span
                  className={`absolute right-3 top-3 flex size-7 items-center justify-center rounded-full border ${checkClass}`}
                >
                  <Check aria-hidden="true" size={15} />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function FlowStepper({ activeStep }: { activeStep: number }) {
  const steps = ["사진", "선호", "추천", "선택", "상담 보드"];

  return (
    <div className="mb-4 grid gap-2 rounded-md border border-[#2b281f] bg-[#0f0e0c]/72 p-3 sm:grid-cols-3 lg:grid-cols-5">
      {steps.map((step, index) => (
        <div
          className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold ${
            index <= activeStep
              ? "bg-[#30271a] text-[#fffaf1]"
              : "bg-white/5 text-[#8f826f]"
          }`}
          key={step}
        >
          <span
            className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs ${
              index <= activeStep
                ? "bg-[#f3d28a] text-[#1a1712]"
                : "bg-[#211d17] text-[#8f826f]"
            }`}
          >
            {index + 1}
          </span>
          {step}
        </div>
      ))}
    </div>
  );
}

function ConsentNotice({
  accepted,
  onChange,
}: {
  accepted: boolean;
  onChange: (accepted: boolean) => void;
}) {
  return (
    <section className="mb-5 rounded-md border border-[#c9a96a]/35 bg-[#30271a]/60 p-5">
      <label className="grid cursor-pointer gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <span>
          <span className="block text-base font-bold leading-7 text-[#fffaf1] md:text-lg">
            얼굴 사진을 AI 헤어스타일 추천과 상담 이미지 생성에 사용하는 것에 동의합니다.
          </span>
          <span className="mt-3 block text-sm leading-6 text-[#d8cbb8]">
            사진은 OpenAI/Gemini 등 연결된 AI 생성 요청에 사용되며, 결과는 실제 시술을 보장하지 않는 참고 시안입니다.
            미용사에게 공유할 때는 고객 동의가 필요하고, 정식 저장/삭제/공유 링크는 다음 단계에서 서버 저장소로 분리합니다.
          </span>
        </span>
        <span className="flex items-center justify-end gap-3">
          <span className="text-sm font-semibold text-[#f3d28a]">
            동의
          </span>
          <input
            checked={accepted}
            className="size-7 rounded-md accent-[#f3d28a] md:size-8"
            onChange={(event) => onChange(event.target.checked)}
            type="checkbox"
          />
        </span>
      </label>
      <div className="mt-4 grid gap-2 text-sm leading-6 text-[#b8aa95] sm:grid-cols-2">
        <p>좋은 사진: 얼굴과 머리 전체가 선명하고 조명이 밝은 사진</p>
        <p>피할 사진: 모자, 선글라스, 마스크, 강한 필터, 심한 흔들림</p>
      </div>
    </section>
  );
}

// Renders overlay content centered in the viewport through a body portal, so a
// transformed ancestor can never offset the popup (matches the mypage feed
// modal). Every studio popup uses this so it always opens dead-center.
function ViewportCenteredOverlay({
  children,
  className = "",
  ...rest
}: ComponentPropsWithoutRef<"div">) {
  const portalRoot = typeof document === "undefined" ? null : document.body;

  if (!portalRoot) {
    return null;
  }

  return createPortal(
    <div
      className={`fixed left-0 top-0 z-[1000] grid h-[100dvh] w-[100dvw] place-items-center overflow-hidden p-4 backdrop-blur-sm ${className}`}
      {...rest}
    >
      {children}
    </div>,
    portalRoot,
  );
}

// Single-shot image generations (outfit, makeup) have no real percentage, so
// animate a smooth 0 -> ~95% bar while active and reset when it finishes. Gives
// the customer a moving progress readout instead of a bare spinner.
function useSimulatedProgress(active: boolean, expectedMs = 32000) {
  const [progress, setProgress] = useState(0);
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) {
      startedAtRef.current = null;
      // Defer to a timer so we never call setState synchronously inside an effect.
      const reset = window.setTimeout(() => setProgress(0), 0);

      return () => window.clearTimeout(reset);
    }

    startedAtRef.current = Date.now();
    const start = window.setTimeout(() => setProgress(8), 0);
    // Pace against the measured average render time so the bar climbs smoothly
    // toward 99% instead of stalling at a fixed cap.
    const timer = window.setInterval(() => {
      const startedAt = startedAtRef.current ?? Date.now();
      const eased = Math.round(easedTimedProgress(Date.now() - startedAt, expectedMs));

      setProgress((current) => Math.max(current, eased));
    }, 300);

    return () => {
      window.clearTimeout(start);
      window.clearInterval(timer);
    };
  }, [active, expectedMs]);

  return progress;
}

function ConsentRequiredDialog({
  actionLabel,
  onAccept,
  onClose,
}: {
  actionLabel: string;
  onAccept: () => void;
  onClose: () => void;
}) {
  return (
    <ViewportCenteredOverlay
      aria-modal="true"
      className="bg-black/70"
      role="dialog"
    >
      <section className="w-full max-w-md rounded-lg border border-[#c9a96a]/45 bg-[#171511] p-5 shadow-2xl">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-[#f3d28a]/50 bg-[#30271a] text-[#f3d28a]">
            <Info aria-hidden="true" size={22} />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-[#fffaf1]">
              사진 사용 동의가 필요합니다.
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#d8cbb8]">
              {actionLabel}을 사용하려면 얼굴 사진을 AI 헤어스타일 추천과
              상담 이미지 생성에 사용하는 것에 먼저 동의해 주세요.
            </p>
            <p className="mt-2 text-xs leading-5 text-[#b8aa95]">
              사진은 스타일 추천과 상담용 이미지 생성 요청에만 사용되며, 실제
              시술 결과를 보장하지 않는 참고 시안입니다.
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto]">
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#f3d28a] px-4 text-sm font-bold text-[#171511] transition hover:bg-[#ffdf98]"
            onClick={onAccept}
            type="button"
          >
            <Check aria-hidden="true" size={16} />
            동의하고 계속하기
          </button>
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-white/12 px-4 text-sm font-semibold text-[#d8cbb8] transition hover:border-[#f3d28a]/60 hover:text-[#f3d28a]"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={16} />
            닫기
          </button>
        </div>
      </section>
    </ViewportCenteredOverlay>
  );
}

function ExtraConsultationChargeDialog({
  charging,
  onCancel,
  onConfirm,
  styleName,
}: {
  charging: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  styleName: string;
}) {
  return (
    <ViewportCenteredOverlay
      aria-modal="true"
      className="bg-black/70"
      role="dialog"
    >
      <section className="w-full max-w-md rounded-lg border border-[#c9a96a]/45 bg-[#171511] p-5 shadow-2xl">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-[#f3d28a]/50 bg-[#30271a] text-[#f3d28a]">
            <Sparkles aria-hidden="true" size={22} />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-[#fffaf1]">
              Hair Money 2개가 소진됩니다.
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#d8cbb8]">
              이번 추천 사이클의 첫 상담용 9장은 이미 생성했습니다.
              <span className="font-semibold text-[#f3d28a]"> {styleName}</span>
              으로 상담용 9장을 추가로 생성하면 Hair Money 2개가 차감됩니다.
            </p>
            <p className="mt-2 text-xs leading-5 text-[#b8aa95]">
              진행하면 즉시 2개가 차감되고 새 9장 생성이 시작됩니다.
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto]">
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#f3d28a] px-4 text-sm font-bold text-[#171511] transition hover:bg-[#ffdf98] disabled:cursor-not-allowed disabled:opacity-70"
            disabled={charging}
            onClick={onConfirm}
            type="button"
          >
            {charging ? (
              <Loader2 aria-hidden="true" className="animate-spin" size={16} />
            ) : (
              <Check aria-hidden="true" size={16} />
            )}
            {charging ? "차감 중" : "2개 차감하고 생성"}
          </button>
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-white/12 px-4 text-sm font-semibold text-[#d8cbb8] transition hover:border-[#f3d28a]/60 hover:text-[#f3d28a] disabled:cursor-not-allowed disabled:opacity-70"
            disabled={charging}
            onClick={onCancel}
            type="button"
          >
            <X aria-hidden="true" size={16} />
            취소
          </button>
        </div>
      </section>
    </ViewportCenteredOverlay>
  );
}

// In-page store popup shown when the extra consultation can't be charged for
// lack of Hair Money. The recommendation screen behind it is preserved; after
// topping up, "이어서 상담 생성" re-runs the charge and starts the 9-angle set.
function ExtraConsultationStorePopup({
  balance,
  charging,
  cost,
  onClose,
  onResume,
  styleName,
}: {
  balance: number | null;
  charging: boolean;
  cost: number;
  onClose: () => void;
  onResume: () => void;
  styleName: string;
}) {
  return (
    <ViewportCenteredOverlay
      aria-modal="true"
      className="bg-black/75"
      role="dialog"
    >
      <section className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-[#c9a96a]/45 bg-[#11100e] shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-white/10 bg-[#171511] px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-[#f3d28a]/50 bg-[#30271a] text-[#f3d28a]">
              <Sparkles aria-hidden="true" size={22} />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-[#fffaf1]">
                Hair Money 충전 후 이어서 생성
              </h2>
              <p className="mt-1 text-sm leading-6 text-[#d8cbb8]">
                <span className="font-semibold text-[#f3d28a]">{styleName}</span>{" "}
                상담용 9장 생성에는 Hair Money {cost}개가 필요합니다.
                {typeof balance === "number"
                  ? ` 현재 잔액은 ${balance}개입니다.`
                  : ""}{" "}
                아래에서 충전하면 추천 화면을 그대로 둔 채 이어서 생성됩니다.
              </p>
            </div>
          </div>
          <button
            aria-label="닫기"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-white/12 text-[#d8cbb8] transition hover:border-[#f3d28a]/60 hover:text-[#f3d28a]"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <MirilookHairMoneyStore />
        </div>
        <footer className="flex flex-col gap-2 border-t border-white/10 bg-[#171511] px-5 py-4 sm:flex-row sm:items-center sm:justify-end">
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-white/12 px-4 text-sm font-semibold text-[#d8cbb8] transition hover:border-[#f3d28a]/60 hover:text-[#f3d28a] disabled:cursor-not-allowed disabled:opacity-70"
            disabled={charging}
            onClick={onClose}
            type="button"
          >
            나중에 하기
          </button>
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#f3d28a] px-5 text-sm font-bold text-[#171511] transition hover:bg-[#ffdf98] disabled:cursor-not-allowed disabled:opacity-70"
            disabled={charging}
            onClick={onResume}
            type="button"
          >
            {charging ? (
              <Loader2 aria-hidden="true" className="animate-spin" size={16} />
            ) : (
              <Check aria-hidden="true" size={16} />
            )}
            {charging ? "확인 중" : "충전 완료 — 이어서 상담 생성"}
          </button>
        </footer>
      </section>
    </ViewportCenteredOverlay>
  );
}

function HistorySaveNotice({
  message,
  onClose,
  status,
}: {
  message: string;
  onClose: () => void;
  status: HistorySaveNoticeState["status"];
}) {
  const [progress, setProgress] = useState(() => (status === "error" ? 100 : 0));
  const roundedProgress = Math.round(progress);
  const isComplete = status === "complete" && roundedProgress >= 100;
  const isError = status === "error";
  const title = isError
    ? "히스토리 저장에 실패했습니다."
    : isComplete
      ? "히스토리에 저장이 완료되었습니다."
      : "히스토리에 저장 중입니다.";
  const description = isComplete
    ? "저장 완료 내역은 마이페이지 상담 히스토리에서 확인할 수 있습니다."
    : message;

  useEffect(() => {
    if (status === "saving") {
      const timer = window.setInterval(() => {
        setProgress((current) => {
          if (current >= 90) {
            return 90;
          }

          const step = current < 55 ? 8 : current < 78 ? 4 : 2;

          return Math.min(current + step, 90);
        });
      }, 160);

      return () => window.clearInterval(timer);
    }

    if (status === "complete") {
      const timer = window.setInterval(() => {
        setProgress((current) => Math.min(current + 10, 100));
      }, 70);

      return () => window.clearInterval(timer);
    }

    const timer = window.setTimeout(() => setProgress(100), 0);

    return () => window.clearTimeout(timer);
  }, [status]);

  useEffect(() => {
    if (!isComplete) {
      return;
    }

    const timer = window.setTimeout(onClose, 3000);

    return () => window.clearTimeout(timer);
  }, [isComplete, onClose]);

  return (
    <ViewportCenteredOverlay aria-live="polite" className="bg-black/72">
      <section
        className="w-full max-w-md rounded-lg border border-[#f3d28a]/55 bg-[#171511] p-5 shadow-2xl shadow-black/50"
        role="status"
      >
        <div className="flex items-start gap-3">
          <span
            className={`flex size-10 shrink-0 items-center justify-center rounded-full border ${
              isError
                ? "border-[#ff8a9a]/55 bg-[#3a161d] text-[#ff9cab]"
                : "border-[#f3d28a]/55 bg-[#30271a] text-[#f3d28a]"
            }`}
          >
            {isError ? (
              <X aria-hidden="true" size={20} />
            ) : isComplete ? (
              <Check aria-hidden="true" size={20} />
            ) : (
              <Loader2 aria-hidden="true" className="animate-spin" size={20} />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold text-[#fffaf1]">
              {title}
            </p>
            <p className="mt-1 text-sm leading-6 text-[#d8cbb8]">
              {description}
            </p>
          </div>
          <button
            aria-label="히스토리 저장 팝업 닫기"
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-white/12 text-[#d8cbb8] transition hover:border-[#f3d28a]/60 hover:text-[#f3d28a]"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={16} />
          </button>
        </div>
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between gap-3 text-xs font-bold">
            <span className={isError ? "text-[#ff9cab]" : "text-[#f3d28a]"}>
              {isError ? "저장 실패" : isComplete ? "저장 완료" : "저장 진행률"}
            </span>
            <span className="text-[#fffaf1]">{roundedProgress}%</span>
          </div>
          <div
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={roundedProgress}
            className="h-3 overflow-hidden rounded-full border border-white/10 bg-[#0f0e0c]"
            role="progressbar"
          >
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isError
                  ? "bg-[#ff8a9a]"
                  : "bg-gradient-to-r from-[#9f7b32] via-[#f3d28a] to-[#fff1bd]"
              }`}
              style={{ width: `${roundedProgress}%` }}
            />
          </div>
          {isComplete ? (
            <p className="mt-3 text-xs font-semibold text-[#f3d28a]">
              3초 후 자동으로 닫힙니다.
            </p>
          ) : null}
        </div>
      </section>
    </ViewportCenteredOverlay>
  );
}

const slotCaptureGuide: Record<
  PhotoSlot,
  { caption: string; icon: typeof ScanFace }
> = {
  left: { caption: "고개를 왼쪽으로 약 45° 돌려 주세요.", icon: ChevronLeft },
  front: { caption: "정면을 똑바로 바라봐 주세요.", icon: ScanFace },
  right: { caption: "고개를 오른쪽으로 약 45° 돌려 주세요.", icon: ChevronRight },
};

function FaceQualityChip({
  quality,
}: {
  quality?: FaceQualityResult | "analyzing" | null;
}) {
  if (!quality) {
    return null;
  }

  if (quality === "analyzing") {
    return (
      <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-[#241f17] px-1.5 py-0.5 text-[10px] font-semibold text-[#b8aa95] sm:text-[11px]">
        <Loader2 aria-hidden="true" className="size-3 animate-spin" />
        사진 적합도 확인 중…
      </span>
    );
  }

  const palette =
    quality.level === "good"
      ? "border-[#8bcf9f]/55 bg-[#173321]/70 text-[#bce8c7]"
      : quality.level === "fair"
        ? "border-[#e8c879]/55 bg-[#332a16]/70 text-[#f3d28a]"
        : "border-[#e88f8f]/55 bg-[#33181a]/70 text-[#f3b4b4]";
  const dotColor =
    quality.level === "good"
      ? "bg-[#8bcf9f]"
      : quality.level === "fair"
        ? "bg-[#e8c879]"
        : "bg-[#e88f8f]";

  return (
    <span
      className={`mt-1 flex flex-col gap-0.5 rounded-md border px-1.5 py-1 text-[10px] leading-tight sm:text-[11px] ${palette}`}
    >
      <span className="flex items-center gap-1 font-bold">
        <span
          aria-hidden="true"
          className={`size-2 shrink-0 rounded-full ${dotColor}`}
        />
        사진 적합도 · {quality.label}
      </span>
      <span className="hidden font-medium opacity-90 sm:block">
        {quality.detail}
      </span>
    </span>
  );
}

function UploadBox({
  badge,
  hint,
  label,
  photo,
  quality,
  slot,
  onClick,
}: {
  badge: string;
  hint: string;
  label: string;
  photo: UploadedPhoto | null;
  quality?: FaceQualityResult | "analyzing" | null;
  slot: PhotoSlot;
  onClick: () => void;
}) {
  const guide = slotCaptureGuide[slot];
  const GuideIcon = guide.icon;

  return (
    <button
      className={`aspect-[3/4] min-h-0 overflow-hidden rounded-md border text-left transition sm:aspect-[4/5] lg:aspect-[5/4] ${
        photo
          ? "border-[#c9a96a]/65 bg-[#0f0e0c]"
          : "border-dashed border-[#c9a96a]/55 bg-[#0f0e0c]/72 hover:border-[#f3d28a] hover:bg-[#1d1912]/86"
      }`}
      onClick={onClick}
      type="button"
    >
      {photo ? (
        <div className="grid h-full grid-rows-[minmax(0,1fr)_auto]">
          <img
            alt={`${label} 미리보기`}
            className="h-full min-h-0 w-full object-cover"
            src={photo.url}
          />
          <div className="p-1.5 sm:p-2 lg:p-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
              <p className="text-[11px] font-semibold leading-tight text-[#f3d28a] sm:text-xs lg:text-sm">
                {label}
              </p>
              <span className="w-fit rounded-md bg-[#30271a] px-1.5 py-0.5 text-[9px] font-semibold leading-tight text-[#fff4d7] sm:px-2 sm:py-1 sm:text-[11px]">
                {badge}
              </span>
            </div>
            <p className="mt-1 hidden truncate text-xs text-[#b8aa95] sm:block">
              {photo.fileName} · {formatFileSize(photo.file.size)}
            </p>
            <FaceQualityChip quality={quality} />
          </div>
        </div>
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-1.5 p-1.5 text-center sm:gap-2 sm:p-3 lg:gap-4 lg:p-5">
          <span className="relative flex size-9 items-center justify-center rounded-full border border-[#c9a96a]/60 bg-[#c9a96a]/14 text-[#f3d28a] sm:size-12 lg:size-16">
            <ScanFace aria-hidden="true" className="size-5 sm:size-6 lg:size-7" />
            {slot !== "front" ? (
              <span className="absolute -bottom-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full border border-[#c9a96a]/60 bg-[#11100e] text-[#f3d28a] sm:size-5 lg:-bottom-1 lg:-right-1 lg:size-6">
                <GuideIcon aria-hidden="true" className="size-2.5 sm:size-3 lg:size-3.5" />
              </span>
            ) : null}
          </span>
          <span>
            <span className="block text-[11px] font-semibold leading-tight text-[#fffaf1] sm:text-sm lg:text-xl">
              {label}
            </span>
            <span className="mt-1 inline-flex rounded-md bg-[#30271a] px-1.5 py-0.5 text-[9px] font-semibold leading-tight text-[#f3d28a] sm:mt-2 sm:px-2 sm:py-1 sm:text-xs">
              {badge}
            </span>
            <span className="mt-2 hidden text-sm text-[#b8aa95] lg:block">
              {hint}
            </span>
            <span className="mt-1 hidden text-xs font-semibold text-[#c9a96a] md:block">
              {guide.caption}
            </span>
          </span>
          <span className="mirilook-neon-upload-cta inline-flex min-h-7 items-center gap-1 rounded-md bg-[#f3d28a] px-2 py-1 text-[10px] font-black leading-tight text-[#1a1712] sm:min-h-9 sm:gap-1.5 sm:px-3 sm:text-xs lg:min-h-11 lg:gap-2 lg:px-4 lg:text-sm">
            <Upload aria-hidden="true" className="size-3 shrink-0 sm:size-3.5 lg:size-4" />
            <span className="break-keep text-center">파일 선택</span>
          </span>
        </div>
      )}
    </button>
  );
}

function PersonalConsultPanel({
  selectedFocusIds,
  onToggle,
}: {
  selectedFocusIds: ConsultingFocusId[];
  onToggle: (focusId: ConsultingFocusId) => void;
}) {
  return (
    <section className="rounded-md border border-[#2b281f] bg-[#0f0e0c]/72 p-4">
      <div className="flex items-center gap-2">
        <Sparkles aria-hidden="true" className="text-[#f3d28a]" size={18} />
        <h2 className="text-lg font-semibold text-[#fffaf1]">
          퍼스널 컨설팅 반영
        </h2>
      </div>
      <p className="mt-2 text-sm leading-6 text-[#b8aa95]">
        선택한 항목은 헤어 추천, 컬러 조화, 상담용 이미지 프롬프트에 함께 반영됩니다.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {consultingFocusOptions.map((option) => {
          const selected = selectedFocusIds.includes(option.id);

          return (
            <button
              className={`inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-semibold transition ${
                selected
                  ? "border-[#f3d28a] bg-[#3a2d17] text-[#fff4d7]"
                  : "border-white/12 bg-[#171511] text-[#d8cbb8] hover:border-[#f3d28a]/70"
              }`}
              key={option.id}
              onClick={() => onToggle(option.id)}
              type="button"
            >
              {selected ? <Check aria-hidden="true" size={15} /> : null}
              {option.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function RecommendationActionPanel({
  canUseActions,
  consultationCycleUsed,
  hasConsultationResults,
  hasOutfitRequest,
  isOutfitGenerating,
  isRendering,
  onGenerateConsultation,
  onShowOutfit,
  selectedStyle,
}: {
  canUseActions: boolean;
  consultationCycleUsed: boolean;
  hasConsultationResults: boolean;
  hasOutfitRequest: boolean;
  isOutfitGenerating: boolean;
  isRendering: boolean;
  onGenerateConsultation: () => void;
  onShowOutfit: () => void;
  selectedStyle?: DisplayRecommendation;
}) {
  const outfitProgress = useSimulatedProgress(isOutfitGenerating);

  // After the cycle's first (free) consultation set, the button generates an
  // additional set for a Hair Money charge, confirmed via popup.
  const consultationLabel = isRendering
    ? "상담용 9장 생성 중"
    : consultationCycleUsed
      ? "추가 상담용 9장 (Hair Money 2)"
      : "상담용 9장 생성하기";

  const actions = [
    {
      disabled: !canUseActions || isRendering,
      id: "consultation-set",
      label: consultationLabel,
      loading: isRendering,
      onClick: onGenerateConsultation,
      progress: undefined as number | undefined,
      pulse:
        canUseActions &&
        !isRendering &&
        !hasConsultationResults &&
        !consultationCycleUsed,
    },
    {
      disabled: !canUseActions || isOutfitGenerating,
      id: "outfit",
      label: isOutfitGenerating ? "코디 생성 중" : "코디 추천",
      loading: isOutfitGenerating,
      onClick: onShowOutfit,
      progress: isOutfitGenerating ? outfitProgress : undefined,
      pulse: canUseActions && !isOutfitGenerating && !hasOutfitRequest,
    },
  ];

  return (
    <div className="mt-4 rounded-md border border-[#2b281f] bg-[#11100e]/78 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#b8aa95]">
        {selectedStyle
          ? `선택된 스타일 · ${selectedStyle.name}`
          : "추천 이미지 1장을 먼저 선택해 주세요"}
      </p>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {actions.map((action) => (
          <button
            className={`relative overflow-hidden inline-flex h-11 items-center justify-center gap-2 rounded-md px-3 text-sm font-bold transition ${
              action.disabled
                ? "cursor-not-allowed border border-white/10 bg-[#24211c] text-[#8f826f]"
                : "bg-[#f3d28a] text-[#1a1712] hover:bg-[#ffdf98]"
            } ${action.pulse ? "mirilook-neon-recommend-cta" : ""}`}
            data-mirilook-cta={action.id}
            disabled={action.disabled}
            key={action.id}
            onClick={action.onClick}
            type="button"
          >
            {action.loading ? (
              <Loader2 aria-hidden="true" className="animate-spin" size={16} />
            ) : (
              <Sparkles aria-hidden="true" size={16} />
            )}
            <span>{action.label}</span>
            {typeof action.progress === "number" ? (
              <span className="tabular-nums text-[#3a2f16]">
                {action.progress}%
              </span>
            ) : null}
            {typeof action.progress === "number" ? (
              <span
                aria-hidden="true"
                className="absolute bottom-0 left-0 h-1 rounded-full bg-[#1a1712]/45 transition-all duration-300"
                style={{ width: `${action.progress}%` }}
              />
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}

function RecommendationControlStack({
  audience,
  canUseActions,
  consultationCycleUsed,
  entitlementActive,
  entitlementStatus,
  hasConsultationResults,
  hasOutfitRequest,
  isOutfitGenerating,
  isRendering,
  onGenerateConsultation,
  onPaymentRecorded,
  onShowOutfit,
  selectedStyle,
}: {
  audience: MirilookAudience;
  canUseActions: boolean;
  consultationCycleUsed: boolean;
  entitlementActive: boolean;
  entitlementStatus: string;
  hasConsultationResults: boolean;
  hasOutfitRequest: boolean;
  isOutfitGenerating: boolean;
  isRendering: boolean;
  onGenerateConsultation: () => void;
  onPaymentRecorded: () => void;
  onShowOutfit: () => void;
  selectedStyle?: DisplayRecommendation;
}) {
  return (
    <>
      <RecommendationActionPanel
        canUseActions={canUseActions}
        consultationCycleUsed={consultationCycleUsed}
        hasConsultationResults={hasConsultationResults}
        hasOutfitRequest={hasOutfitRequest}
        isOutfitGenerating={isOutfitGenerating}
        isRendering={isRendering}
        onGenerateConsultation={onGenerateConsultation}
        onShowOutfit={onShowOutfit}
        selectedStyle={selectedStyle}
      />
      <PremiumAddOnPanel
        audience={audience}
        entitlementActive={entitlementActive}
        entitlementStatus={entitlementStatus}
        onPaymentRecorded={onPaymentRecorded}
      />
    </>
  );
}

function PremiumAddOnPanel({
  audience,
  entitlementActive,
  entitlementStatus,
  onPaymentRecorded,
}: {
  audience: MirilookAudience;
  entitlementActive: boolean;
  entitlementStatus: string;
  onPaymentRecorded: () => void;
}) {
  const availableAddOns = premiumAddOnOptions.filter(
    (option) => option.audience === "all" || option.audience === audience,
  );

  return (
    <section className="mt-4 rounded-md border border-[#2b281f] bg-[#0f0e0c]/72 p-4">
      <div className="flex items-center gap-2">
        <Sparkles aria-hidden="true" className="text-[#f3d28a]" size={18} />
        <h2 className="text-lg font-semibold text-[#fffaf1]">
          프리미엄 확장 상담
        </h2>
      </div>
      <p className="mt-2 text-sm leading-6 text-[#b8aa95]">
        추천 이미지 1장을 고른 뒤 코디 추천을 별도 확장 상담으로 실행합니다. 현재는 파일럿 구조이며, 정식 서비스에서는 프리미엄 멤버십 또는 1회 결제로 묶을 수 있습니다.
      </p>
      <div
        className={`mt-3 rounded-md border px-3 py-2 text-sm leading-6 ${
          entitlementActive
            ? "border-[#8bcf9f]/35 bg-[#173321]/55 text-[#bce8c7]"
            : "border-[#c9a96a]/35 bg-[#30271a]/70 text-[#f3d28a]"
        }`}
      >
        {entitlementStatus}
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {availableAddOns.map((option) => {
          return (
            <div
              className="rounded-md border border-white/10 bg-white/[0.04] p-4 text-left text-[#d8cbb8]"
              key={option.id}
            >
              <span className="flex items-center gap-2 text-sm font-bold">
                {option.label}
              </span>
              <span className="mt-2 block text-sm leading-6 text-[#cfc3b2]">
                {option.description}
              </span>
            </div>
          );
        })}
      </div>
      {!entitlementActive ? (
        <div className="mt-4">
          <MirilookPaymentPanel
            description="코디 추천을 헤어 추천 결과에 함께 붙이는 30일 프리미엄 권한입니다."
            initialProductId="premium-style-report"
            onPaymentRecorded={onPaymentRecorded}
            productIds={premiumAddOnProductIds}
            title="프리미엄 스타일 리포트 결제"
          />
        </div>
      ) : null}
    </section>
  );
}

function StyleExpansionResultPanel({
  outfitFullBody,
  makeupPreview,
  outfitRecommendations,
  selectedStyle,
}: {
  outfitFullBody: OutfitFullBodyState;
  makeupPreview: MakeupPreviewState;
  outfitRecommendations: OutfitRecommendation[];
  selectedStyle: DisplayRecommendation;
}) {
  const [activeMakeupZoneId, setActiveMakeupZoneId] =
    useState<MakeupZoneId>("forehead");
  const activeMakeupZone =
    makeupZoneGuides.find((zone) => zone.id === activeMakeupZoneId) ??
    makeupZoneGuides[0];
  const makeupBeforeImageUrl = makeupPreview.baseImageUrl ?? selectedStyle.imageUrl;
  const makeupAfterImageUrl = makeupPreview.imageUrl;
  const [imagePreview, setImagePreview] =
    useState<ExpansionImagePreviewState | null>(null);
  // 3x3 board: full-body shot in the center, 3 items on top, 1 left, 1 right,
  // and 3 items on the bottom (8 accessory items surrounding the center).
  const topOutfitItems = outfitRecommendations.slice(0, 3);
  const midLeftOutfitItem = outfitRecommendations[3];
  const midRightOutfitItem = outfitRecommendations[4];
  const bottomOutfitItems = outfitRecommendations.slice(5, 8);

  return (
    <section className="mt-5 grid gap-4 border-t border-white/10 pt-5">
      {outfitRecommendations.length ? (
        <div className="rounded-md border border-[#2b281f] bg-[#0f0e0c]/82 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-[#fffaf1]">
                {selectedStyle.name} 전신 코디 추천
              </h3>
              <p className="mt-1 text-sm leading-6 text-[#b8aa95]">
                선택한 헤어 이미지를 기준으로 전신 코디를 가운데에 배치하고, 주변에 상의/하의/소품별 이미지와 추천 이유를 나눠 보여줍니다.
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 items-start gap-3 lg:gap-4">
            {topOutfitItems.map((item) => (
              <OutfitRecommendationCard
                item={item}
                key={item.id}
                onPreview={(preview) => setImagePreview(preview)}
                selectedStyle={selectedStyle}
              />
            ))}

            <div className="flex flex-col">
              {midLeftOutfitItem ? (
                <OutfitRecommendationCard
                  item={midLeftOutfitItem}
                  onPreview={(preview) => setImagePreview(preview)}
                  selectedStyle={selectedStyle}
                />
              ) : null}
            </div>

            <div className="overflow-hidden rounded-md border border-[#c9a96a]/35 bg-[#11100e] shadow-xl shadow-black/30">
              <div className="relative aspect-[3/4]">
                {outfitFullBody.imageUrl ? (
                  <>
                    <button
                      aria-label={`${selectedStyle.name} 전신 코디 크게 보기`}
                      className="h-full w-full"
                      onClick={() =>
                        setImagePreview({
                          downloadFileName: `mirilook-${selectedStyle.id}-full-outfit.jpg`,
                          imageUrl: outfitFullBody.imageUrl ?? "",
                          objectFit: "contain",
                          title: `${selectedStyle.name} 전신 코디`,
                        })
                      }
                      type="button"
                    >
                      <img
                        alt={`${selectedStyle.name} 전신 코디`}
                        className="h-full w-full object-cover"
                        src={outfitFullBody.imageUrl}
                      />
                    </button>
                    <button
                      aria-label={`${selectedStyle.name} 전신 코디 이미지 저장`}
                      className="absolute right-3 top-3 z-20 flex size-9 items-center justify-center rounded-md border border-white/12 bg-[#11100e]/78 text-[#fffaf1] backdrop-blur-sm transition hover:border-[#f3d28a]/60 hover:text-[#f3d28a]"
                      onClick={() =>
                        void downloadResultImage(
                          outfitFullBody.imageUrl ?? "",
                          `mirilook-${selectedStyle.id}-full-outfit.jpg`,
                        )
                      }
                      title="이미지 저장"
                      type="button"
                    >
                      <Download aria-hidden="true" size={16} />
                    </button>
                  </>
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-6 text-center">
                    {outfitFullBody.isGenerating ? (
                      <NeonSpinner size={64} />
                    ) : null}
                    <p className="text-lg font-bold text-[#fffaf1]">
                      {outfitFullBody.error ?? "전신 코디 생성 중"}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col">
              {midRightOutfitItem ? (
                <OutfitRecommendationCard
                  item={midRightOutfitItem}
                  onPreview={(preview) => setImagePreview(preview)}
                  selectedStyle={selectedStyle}
                />
              ) : null}
            </div>

            {bottomOutfitItems.map((item) => (
              <OutfitRecommendationCard
                item={item}
                key={item.id}
                onPreview={(preview) => setImagePreview(preview)}
                selectedStyle={selectedStyle}
              />
            ))}
          </div>
        </div>
      ) : null}

      {makeupPreview.isGenerating || makeupPreview.imageUrl || makeupPreview.error ? (
        <div className="rounded-md border border-[#2b281f] bg-[#0f0e0c]/82 p-4">
          <h3 className="text-lg font-semibold text-[#fffaf1]">
            {selectedStyle.name} 메이크업 스타일
          </h3>
          <p className="mt-1 text-sm leading-6 text-[#b8aa95]">
            선택한 헤어 이미지를 기준으로 얼굴 비율과 분위기를 유지하며 메이크업 톤만 자연스럽게 얹습니다.
            피부 밝기와 웜/쿨톤은 조명 영향을 받으므로 참고용으로 보고, 실제 제품 선택은 미용실 조명에서 다시 확인하세요.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {makeupZoneGuides.map((zone) => {
              const active = zone.id === activeMakeupZone.id;

              return (
                <button
                  className={`rounded-md border px-3 py-2 text-sm font-bold transition ${
                    active
                      ? "border-[#f3d28a] bg-[#3a2d17] text-[#fff4d7]"
                      : "border-white/12 bg-[#171511] text-[#d8cbb8] hover:border-[#f3d28a]/70"
                  }`}
                  key={zone.id}
                  onClick={() => setActiveMakeupZoneId(zone.id)}
                  type="button"
                >
                  {zone.label}
                </button>
              );
            })}
          </div>
          <div className="mt-4 grid gap-4">
            <div className="grid gap-3 md:grid-cols-2">
              <MakeupCompareImage
                imageUrl={makeupBeforeImageUrl}
                label="화장 전"
                objectPosition={activeMakeupZone.objectPosition}
                onPreview={(preview) => setImagePreview(preview)}
                placeholder="기준 이미지 없음"
                selectedStyle={selectedStyle}
              />
              <MakeupCompareImage
                imageUrl={makeupAfterImageUrl}
                isGenerating={makeupPreview.isGenerating}
                label="화장 후"
                objectPosition={activeMakeupZone.objectPosition}
                onPreview={(preview) => setImagePreview(preview)}
                placeholder={makeupPreview.error ?? "메이크업 이미지 생성 중"}
                selectedStyle={selectedStyle}
              />
            </div>
            <div className="rounded-md border border-white/10 bg-white/[0.04] p-4">
              <p className="text-sm font-bold text-[#f3d28a]">
                {activeMakeupZone.label} 가이드
              </p>
              <div className="mt-3 grid gap-3 text-sm leading-6 text-[#cfc3b2] md:grid-cols-2">
                <p>
                  <span className="font-bold text-[#fffaf1]">Before </span>
                  {activeMakeupZone.before}
                </p>
                <p>
                  <span className="font-bold text-[#fffaf1]">After </span>
                  {activeMakeupZone.after}
                </p>
                <p className="rounded-md border border-[#c9a96a]/22 bg-[#2d2416]/45 p-3 text-[#f1dfbd] md:col-span-2">
                  {activeMakeupZone.why}
                </p>
              </div>
              <p className="mt-4 text-xs leading-5 text-[#8f826f]">
                {selectedStyle.makeupAdvice ??
                  `${selectedStyle.name} 스타일은 헤어 실루엣이 먼저 보이도록 피부 표현과 색조를 과하게 올리지 않는 방향이 좋습니다.`}
              </p>
            </div>
          </div>
        </div>
      ) : null}
      {imagePreview ? (
        <ExpansionImagePreviewDialog
          preview={imagePreview}
          onClose={() => setImagePreview(null)}
        />
      ) : null}
    </section>
  );
}

function OutfitRecommendationCard({
  item,
  onPreview,
  selectedStyle,
}: {
  item: OutfitRecommendation;
  onPreview: (preview: ExpansionImagePreviewState) => void;
  selectedStyle: DisplayRecommendation;
}) {
  const previewDescription = `${item.description}\n\n검색어: ${item.query}`;

  return (
    <article className="overflow-hidden rounded-md border border-white/10 bg-white/[0.04] p-2">
      <div className="relative aspect-square overflow-hidden rounded-md border border-white/10 bg-[#11100e]">
        {item.imageUrl ? (
          <button
            aria-label={`${selectedStyle.name} ${item.label} 설명 보기`}
            className="h-full w-full"
            onClick={() =>
              onPreview({
                description: previewDescription,
                downloadFileName: `mirilook-${selectedStyle.id}-${item.id}.jpg`,
                imageUrl: item.imageUrl ?? "",
                objectFit: "contain",
                title: `${selectedStyle.name} ${item.label}`,
              })
            }
            type="button"
          >
            <img
              alt={`${selectedStyle.name} ${item.label}`}
              className="h-full w-full object-cover transition duration-300 hover:scale-[1.03]"
              src={item.imageUrl}
            />
          </button>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-3 text-center">
            {item.isGenerating ? <NeonSpinner size={34} /> : null}
            <span className="text-xs font-semibold text-[#b8aa95]">
              {item.error ?? "이미지 생성 중"}
            </span>
          </div>
        )}
        <span className="absolute left-2 top-2 rounded-md bg-[#1d170d]/86 px-2 py-1 text-xs font-bold text-[#f3d28a]">
          {item.label}
        </span>
      </div>
    </article>
  );
}

function MakeupCompareImage({
  imageUrl,
  isGenerating = false,
  label,
  objectPosition,
  onPreview,
  placeholder,
  selectedStyle,
}: {
  imageUrl?: string;
  isGenerating?: boolean;
  label: string;
  objectPosition: string;
  onPreview: (preview: ExpansionImagePreviewState) => void;
  placeholder: string;
  selectedStyle: DisplayRecommendation;
}) {
  const fileSuffix = label.includes("전") ? "makeup-before" : "makeup-after";
  const downloadFileName = `mirilook-${selectedStyle.id}-${fileSuffix}.jpg`;

  return (
    <div className="overflow-hidden rounded-md border border-white/10 bg-[#11100e]">
      <div className="relative aspect-[4/3]">
        {imageUrl ? (
          <>
            <img
              alt={`${selectedStyle.name} ${label}`}
              className="h-full w-full object-cover"
              src={imageUrl}
              style={{ objectPosition }}
            />
            <div className="absolute right-3 top-3 z-20 grid gap-2">
              <button
                aria-label={`${selectedStyle.name} ${label} 이미지 저장`}
                className="flex size-9 items-center justify-center rounded-md border border-white/12 bg-[#11100e]/78 text-[#fffaf1] backdrop-blur-sm transition hover:border-[#f3d28a]/60 hover:text-[#f3d28a]"
                onClick={() => void downloadResultImage(imageUrl, downloadFileName)}
                title="이미지 저장"
                type="button"
              >
                <Download aria-hidden="true" size={16} />
              </button>
              <button
                aria-label={`${selectedStyle.name} ${label} 크게 보기`}
                className="flex size-9 items-center justify-center rounded-md border border-white/12 bg-[#11100e]/78 text-[#fffaf1] backdrop-blur-sm transition hover:border-[#f3d28a]/60 hover:text-[#f3d28a]"
                onClick={() =>
                  onPreview({
                    downloadFileName,
                    imageUrl,
                    objectFit: "contain",
                    title: `${selectedStyle.name} ${label}`,
                  })
                }
                title="크게 보기"
                type="button"
              >
                <Search aria-hidden="true" size={16} />
              </button>
            </div>
          </>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-6 text-center">
            {isGenerating ? (
              <NeonSpinner size={54} />
            ) : null}
            <p className="text-base font-bold text-[#fffaf1]">{placeholder}</p>
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-md bg-[#1d170d]/86 px-2 py-1 text-xs font-bold text-[#f3d28a]">
          {label}
        </span>
      </div>
    </div>
  );
}

function ExpansionImagePreviewDialog({
  onClose,
  preview,
}: {
  onClose: () => void;
  preview: ExpansionImagePreviewState;
}) {
  const zoom = preview.zoom ?? 1;
  const objectFit = preview.objectFit ?? "contain";
  const isZoomed = zoom > 1 || objectFit === "cover";
  const [lensBusy, setLensBusy] = useState(false);

  const portalRoot = typeof document === "undefined" ? null : document.body;

  async function handleLensSearch() {
    if (lensBusy) {
      return;
    }

    try {
      setLensBusy(true);
      let searchUrl = preview.imageUrl;

      // Google Lens can only search images it can fetch over http(s). Generated
      // outfit/makeup images are in-memory data URLs, so upload one first to get
      // a short-lived signed URL Lens can read.
      if (!/^https?:/i.test(searchUrl)) {
        const response = await fetch("/api/tools/lens-image/", {
          body: JSON.stringify({ dataUrl: preview.imageUrl }),
          headers: { "content-type": "application/json" },
          method: "POST",
        });
        const data = (await response.json().catch(() => null)) as
          | { url?: string }
          | null;

        if (!data?.url) {
          throw new Error("lens upload failed");
        }

        searchUrl = data.url;
      }

      window.open(
        `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(searchUrl)}`,
        "_blank",
        "noopener,noreferrer",
      );
    } catch {
      // Best-effort fallback: open Google Lens so the user can drop the image in.
      window.open("https://lens.google.com/", "_blank", "noopener,noreferrer");
    } finally {
      setLensBusy(false);
    }
  }

  if (!portalRoot) {
    return null;
  }

  return createPortal(
    <div
      aria-label={`${preview.title} 크게 보기`}
      aria-modal="true"
      className="fixed left-0 top-0 z-[1000] grid h-[100dvh] w-[100dvw] place-items-center overflow-hidden bg-black/84 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="grid w-full max-w-5xl gap-3"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-[#fffaf1]">
              {preview.title}
            </p>
            {preview.description ? (
              <p className="mt-1 whitespace-pre-line text-sm leading-6 text-[#b8aa95]">
                {preview.description}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              aria-label={`${preview.title} 구글 렌즈로 검색`}
              className="inline-flex size-10 items-center justify-center rounded-md border border-[#c9a96a]/50 bg-[#171511] text-[#f3d28a] transition hover:bg-[#f3d28a]/10 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={lensBusy}
              onClick={() => void handleLensSearch()}
              title="구글 렌즈로 검색"
              type="button"
            >
              {lensBusy ? (
                <Loader2 aria-hidden="true" className="animate-spin" size={18} />
              ) : (
                <Search aria-hidden="true" size={18} />
              )}
            </button>
            {preview.downloadFileName ? (
              <button
                aria-label={`${preview.title} 이미지 저장`}
                className="inline-flex size-10 items-center justify-center rounded-md border border-[#c9a96a]/50 bg-[#171511] text-[#f3d28a] transition hover:bg-[#f3d28a]/10"
                onClick={() =>
                  void downloadResultImage(
                    preview.imageUrl,
                    preview.downloadFileName ?? "mirilook-image.jpg",
                  )
                }
                title="이미지 저장"
                type="button"
              >
                <Download aria-hidden="true" size={18} />
              </button>
            ) : null}
            <button
              aria-label="닫기"
              className="inline-flex size-10 items-center justify-center rounded-md border border-white/12 bg-[#171511] text-[#e7dccb] transition hover:bg-white/10"
              onClick={onClose}
              type="button"
            >
              <X aria-hidden="true" size={20} />
            </button>
          </div>
        </div>
        <div
          className={`overflow-hidden rounded-md border border-white/10 bg-[#11100e] ${
            isZoomed ? "mx-auto aspect-square w-full max-w-[78vh]" : ""
          }`}
        >
          <img
            alt={preview.title}
            className={
              isZoomed
                ? "h-full w-full object-cover"
                : "max-h-[78vh] w-full object-contain"
            }
            src={preview.imageUrl}
            style={{
              objectPosition: preview.objectPosition,
              transform: zoom > 1 ? `scale(${zoom})` : undefined,
            }}
          />
        </div>
      </div>
    </div>,
    portalRoot,
  );
}

function StyleMemoPanel({
  audience,
  onChange,
  value,
}: {
  audience: MirilookAudience;
  onChange: (value: string) => void;
  value: string;
}) {
  const examples = styleMemoExamplesByAudience[audience];
  const [examplesOpen, setExamplesOpen] = useState(false);

  return (
    <section className="rounded-md border border-[#8bcf9f]/30 bg-[#0d1f18]/78 p-4 shadow-[0_0_0_1px_rgba(139,207,159,0.04)]">
      <div className="flex items-center gap-2">
        <Sparkles aria-hidden="true" className="text-[#8bcf9f]" size={18} />
        <h2 className="text-lg font-semibold text-[#fffaf1]">
          원하는 느낌 메모
        </h2>
      </div>
      <p className="mt-2 text-sm leading-6 text-[#b8aa95]">
        원하는 분위기, 목적, 평소 고민을 적으면 추천과 생성 프롬프트에 함께 반영합니다.
        아래 예시를 누르면 바로 입력됩니다.
      </p>
      <textarea
        className="mt-4 min-h-28 w-full resize-y rounded-md border border-[#8bcf9f]/28 bg-[#08130f] p-3 text-sm leading-6 text-[#fffaf1] outline-none transition placeholder:text-[#7fa58c] focus:border-[#8bcf9f]"
        maxLength={240}
        onChange={(event) => onChange(event.target.value)}
        placeholder="예: 옆머리가 뜨는 편이라 슬림하게, 면접용으로 단정하게, 이마는 너무 많이 보이지 않게 해주세요."
        value={value}
      />
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <button
          aria-expanded={examplesOpen}
          className="inline-flex min-h-10 w-fit items-center justify-center gap-2 rounded-md border border-[#8bcf9f]/60 bg-[#2a6b46] px-4 text-sm font-bold text-white shadow-sm shadow-[#8bcf9f]/25 transition hover:bg-[#317a52]"
          onClick={() => setExamplesOpen((current) => !current)}
          type="button"
        >
          <ChevronDown
            aria-hidden="true"
            className={`transition ${examplesOpen ? "rotate-180" : ""}`}
            size={16}
          />
          {examplesOpen ? "예시 닫기" : "예시 보기"}
        </button>
        <p className="text-right text-xs text-[#8f826f]">{value.length}/240</p>
      </div>
      {examplesOpen ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {examples.map((example) => (
            <button
              className="min-h-12 rounded-md border border-[#8bcf9f]/26 bg-[#14271d] px-3 py-2 text-left text-xs font-semibold leading-5 text-[#d9f2df] transition hover:border-[#8bcf9f]/70 hover:bg-[#1b3326]"
              key={example}
              onClick={() => onChange(example)}
              type="button"
            >
              {example}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function CelebrityReferencePanel({
  activeGroupId,
  groups,
  remainingSlots,
  onAddGroup,
  onAddFromUrl,
  onClear,
  onRemoveGroup,
  onRemovePhoto,
  onSelectGroup,
  onUploadClick,
}: {
  activeGroupId: string;
  groups: CelebrityReferenceGroup[];
  remainingSlots: number;
  onAddGroup: () => void;
  onAddFromUrl: (
    groupId: string,
    imageUrl: string,
    sourceTitle?: string,
  ) => Promise<void>;
  onClear: () => void;
  onRemoveGroup: (groupId: string) => void;
  onRemovePhoto: (groupId: string, referenceId: string) => void;
  onSelectGroup: (groupId: string) => void;
  onUploadClick: () => void;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [isAddingUrl, setIsAddingUrl] = useState(false);
  const [addingResultId, setAddingResultId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CelebrityImageSearchResult[]>(
    [],
  );
  const [searchMessage, setSearchMessage] = useState("");
  const [externalSearchUrl, setExternalSearchUrl] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const activeGroup = groups.find((group) => group.id === activeGroupId) ?? groups[0];
  const selectedGroupCount = groups.filter((group) => group.photos.length).length;
  const hasReferences = selectedGroupCount > 0;
  const activeGroupIsFull =
    (activeGroup?.photos.length ?? 0) >= maxCelebrityReferencePhotosPerGroup;
  const cannotAddToActiveGroup =
    !activeGroup ||
    activeGroupIsFull ||
    (!activeGroup.photos.length && remainingSlots <= 0);

  async function handleUrlAdd() {
    if (!activeGroup || !imageUrlInput.trim() || cannotAddToActiveGroup) {
      return;
    }

    setIsAddingUrl(true);
    setSearchMessage("");

    try {
      await onAddFromUrl(activeGroup.id, imageUrlInput, activeGroup.label);
      setImageUrlInput("");
      setSearchMessage(`${activeGroup.label}에 이미지 링크를 추가했습니다.`);
    } catch (error) {
      console.error(error);
      setSearchMessage(
        error instanceof Error
          ? error.message
          : "이미지 링크를 불러오지 못했습니다.",
      );
    } finally {
      setIsAddingUrl(false);
    }
  }

  async function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!searchQuery.trim()) {
      return;
    }

    setIsSearching(true);
    setSearchMessage("");
    setExternalSearchUrl("");

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/hairstyles/celebrity-search/?q=${encodeURIComponent(
          searchQuery,
        )}`,
      );
      const payload = (await response.json()) as {
        configured?: boolean;
        googleSearchUrl?: string;
        items?: CelebrityImageSearchResult[];
        reason?: string;
      };

      if (!response.ok) {
        throw new Error(payload.reason ?? "Google 이미지 검색에 실패했습니다.");
      }

      setSearchResults(payload.items ?? []);
      setExternalSearchUrl(payload.googleSearchUrl ?? "");
      setSearchMessage(
        payload.items?.length
          ? "검색 결과에서 원하는 헤어 사진을 선택해 레퍼런스로 추가하세요."
          : payload.reason ??
              "검색 결과가 없습니다. Google 이미지 검색을 열어 이미지 주소를 복사해 주세요.",
      );
    } catch (error) {
      console.error(error);
      setSearchResults([]);
      setSearchMessage(
        error instanceof Error
          ? error.message
          : "Google 이미지 검색에 실패했습니다.",
      );
    } finally {
      setIsSearching(false);
    }
  }

  async function addSearchResult(result: CelebrityImageSearchResult) {
    if (!activeGroup || cannotAddToActiveGroup) {
      return;
    }

    setAddingResultId(result.id);
    setSearchMessage("");

    try {
      await onAddFromUrl(activeGroup.id, result.imageUrl, result.title);
      setSearchMessage(`${activeGroup.label}에 ${result.title} 이미지를 추가했습니다.`);
    } catch (error) {
      console.error(error);
      setSearchMessage(
        error instanceof Error
          ? error.message
          : "검색 이미지를 레퍼런스로 추가하지 못했습니다.",
      );
    } finally {
      setAddingResultId(null);
    }
  }

  return (
    <section className="rounded-md border border-[#6fa8dc]/28 bg-[#0c1824]/78 p-4 shadow-[0_0_0_1px_rgba(111,168,220,0.04)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <ImagePlus aria-hidden="true" className="text-[#9cc8ff]" size={18} />
            <h2 className="text-lg font-semibold text-[#fffaf1]">
              연예인 헤어 레퍼런스
            </h2>
            <span className="rounded-md border border-[#9cc8ff]/25 bg-[#13283c] px-2 py-1 text-xs font-bold text-[#9cc8ff]">
              선택
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-[#b8aa95]">
            연예인별로 사진을 묶어 올리면 한 사람당 추천 9장 중 1칸만 차지합니다.
            같은 연예인의 여러 사진은 헤어 방향을 더 정확히 읽는 보조 자료로만 사용합니다.
          </p>
        </div>
        <button
          aria-expanded={detailsOpen}
          className="inline-flex h-10 w-fit shrink-0 items-center justify-center gap-2 rounded-md border border-[#9cc8ff]/60 bg-[#2b5b8f] px-4 text-sm font-bold text-white shadow-sm shadow-[#9cc8ff]/25 transition hover:bg-[#326aa3]"
          onClick={() => setDetailsOpen((current) => !current)}
          type="button"
        >
          <ChevronDown
            aria-hidden="true"
            className={`transition ${detailsOpen ? "rotate-180" : ""}`}
            size={15}
          />
          {detailsOpen ? "레퍼런스 닫기" : "레퍼런스 보기"}
        </button>
      </div>

      {detailsOpen ? (
        <div className="mt-4 border-t border-[#9cc8ff]/14 pt-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-semibold text-[#9cc8ff]">
              현재 {selectedGroupCount}명 선택 · 추가 가능 {remainingSlots}명
            </p>
            <div className="flex shrink-0 flex-wrap gap-2">
              {hasReferences ? (
                <button
                  className="inline-flex h-10 items-center justify-center rounded-md border border-white/12 px-3 text-xs font-bold text-[#d8cbb8] transition hover:bg-white/10"
                  onClick={onClear}
                  type="button"
                >
                  전체 삭제
                </button>
              ) : null}
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#9cc8ff]/35 px-3 text-xs font-bold text-[#dcecff] transition hover:bg-[#122337] disabled:cursor-not-allowed disabled:border-white/10 disabled:text-[#6f665c]"
                disabled={groups.length >= maxCelebrityReferenceCount && !remainingSlots}
                onClick={onAddGroup}
                type="button"
              >
                <ImagePlus aria-hidden="true" size={15} />
                연예인 추가
              </button>
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#9cc8ff] px-3 text-xs font-bold text-[#07111c] transition hover:bg-[#b7d8ff] disabled:cursor-not-allowed disabled:bg-[#253447] disabled:text-[#7f95ac]"
                disabled={cannotAddToActiveGroup}
                onClick={onUploadClick}
                type="button"
              >
                <Upload aria-hidden="true" size={15} />
                사진 추가
              </button>
            </div>
          </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {groups.map((group) => {
          const active = group.id === activeGroup?.id;

          return (
            <button
              className={`inline-flex h-10 items-center gap-2 rounded-md border px-3 text-xs font-bold transition ${
                active
                  ? "border-[#9cc8ff] bg-[#9cc8ff] text-[#07111c]"
                  : "border-[#9cc8ff]/20 bg-[#07111c]/72 text-[#dcecff] hover:border-[#9cc8ff]/55"
              }`}
              key={group.id}
              onClick={() => onSelectGroup(group.id)}
              type="button"
            >
              <span>{group.label}</span>
              <span
                className={`rounded px-1.5 py-0.5 text-[11px] ${
                  active
                    ? "bg-[#07111c]/18 text-[#07111c]"
                    : "bg-[#122337] text-[#9cc8ff]"
                }`}
              >
                {group.photos.length}장
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="rounded-md border border-[#9cc8ff]/16 bg-[#07111c]/72 p-3">
          <div className="flex items-center gap-2 text-sm font-bold text-[#fffaf1]">
            <Link aria-hidden="true" className="text-[#9cc8ff]" size={16} />
            {activeGroup?.label ?? "연예인"}에 이미지 링크 추가
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              className="min-h-11 flex-1 rounded-md border border-white/12 bg-[#0f0e0c] px-3 text-sm text-[#fffaf1] outline-none transition placeholder:text-[#6f665c] focus:border-[#9cc8ff]/70"
              onChange={(event) => setImageUrlInput(event.target.value)}
              placeholder="이미지 주소를 붙여넣으세요"
              type="url"
              value={imageUrlInput}
            />
            <button
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[#9cc8ff]/35 px-4 text-sm font-bold text-[#dcecff] transition hover:bg-[#122337] disabled:cursor-not-allowed disabled:border-white/10 disabled:text-[#6f665c]"
              disabled={!imageUrlInput.trim() || isAddingUrl || cannotAddToActiveGroup}
              onClick={() => void handleUrlAdd()}
              type="button"
            >
              {isAddingUrl ? (
                <Loader2 aria-hidden="true" className="animate-spin" size={16} />
              ) : (
                <ImagePlus aria-hidden="true" size={16} />
              )}
              추가
            </button>
          </div>
          <p className="mt-2 text-xs leading-5 text-[#9fb4c8]">
            같은 연예인의 다른 각도 사진은 현재 선택된 그룹 안에 함께 들어갑니다.
          </p>
        </div>

        <form
          className="rounded-md border border-[#9cc8ff]/16 bg-[#07111c]/72 p-3"
          onSubmit={(event) => void handleSearchSubmit(event)}
        >
          <div className="flex items-center gap-2 text-sm font-bold text-[#fffaf1]">
            <Search aria-hidden="true" className="text-[#9cc8ff]" size={16} />
            Google에서 헤어 사진 검색
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              className="min-h-11 flex-1 rounded-md border border-white/12 bg-[#0f0e0c] px-3 text-sm text-[#fffaf1] outline-none transition placeholder:text-[#6f665c] focus:border-[#9cc8ff]/70"
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="예: 뉴진스 하니 단발, 공유 가르마펌"
              type="search"
              value={searchQuery}
            />
            <button
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#9cc8ff] px-4 text-sm font-bold text-[#07111c] transition hover:bg-[#b7d8ff] disabled:cursor-not-allowed disabled:bg-[#253447] disabled:text-[#7f95ac]"
              disabled={!searchQuery.trim() || isSearching || cannotAddToActiveGroup}
              type="submit"
            >
              {isSearching ? (
                <Loader2 aria-hidden="true" className="animate-spin" size={16} />
              ) : (
                <Search aria-hidden="true" size={16} />
              )}
              검색
            </button>
          </div>
          <p className="mt-2 text-xs leading-5 text-[#9fb4c8]">
            검색 결과를 추가하면 현재 선택된 {activeGroup?.label ?? "연예인"} 그룹에 들어갑니다.
          </p>
        </form>
      </div>

      {searchMessage ? (
        <div className="mt-3 flex flex-col gap-2 rounded-md border border-[#9cc8ff]/16 bg-[#07111c]/62 px-3 py-2 text-xs leading-5 text-[#bcd5ef] sm:flex-row sm:items-center sm:justify-between">
          <span>{searchMessage}</span>
          {externalSearchUrl ? (
            <a
              className="inline-flex items-center gap-1 font-bold text-[#9cc8ff] underline underline-offset-4"
              href={externalSearchUrl}
              rel="noreferrer"
              target="_blank"
            >
              Google 이미지 검색 열기
              <ExternalLink aria-hidden="true" size={13} />
            </a>
          ) : null}
        </div>
      ) : null}

      {searchResults.length ? (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {searchResults.map((result) => (
            <div
              className="overflow-hidden rounded-md border border-[#9cc8ff]/20 bg-[#07111c]"
              key={result.id}
            >
              <div className="relative aspect-square">
                <img
                  alt={result.title}
                  className="h-full w-full object-cover"
                  src={result.thumbnailUrl ?? result.imageUrl}
                />
                {result.source ? (
                  <span className="absolute left-2 top-2 max-w-[80%] truncate rounded-md bg-black/65 px-2 py-1 text-[11px] font-bold text-[#dcecff]">
                    {result.source}
                  </span>
                ) : null}
              </div>
              <div className="grid gap-2 p-2">
                <p className="line-clamp-2 min-h-9 text-xs font-semibold leading-4 text-[#dcecff]">
                  {result.title}
                </p>
                <button
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-[#9cc8ff] px-2 text-xs font-bold text-[#07111c] transition hover:bg-[#b7d8ff] disabled:cursor-not-allowed disabled:bg-[#253447] disabled:text-[#7f95ac]"
                  disabled={addingResultId === result.id || cannotAddToActiveGroup}
                  onClick={() => void addSearchResult(result)}
                  type="button"
                >
                  {addingResultId === result.id ? (
                    <Loader2
                      aria-hidden="true"
                      className="animate-spin"
                      size={14}
                    />
                  ) : (
                    <ImagePlus aria-hidden="true" size={14} />
                  )}
                  레퍼런스 추가
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {hasReferences ? (
        <div className="mt-4 grid gap-3">
          {groups
            .filter((group) => group.photos.length)
            .map((group) => (
              <div
                className={`rounded-md border bg-[#07111c]/82 p-3 ${
                  group.id === activeGroup?.id
                    ? "border-[#9cc8ff]/55"
                    : "border-[#9cc8ff]/18"
                }`}
                key={group.id}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-bold text-[#fffaf1]">
                      {group.label}
                    </p>
                    <p className="text-xs font-semibold text-[#9fb4c8]">
                      사진 {group.photos.length}장 · 추천 결과 1칸 사용
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="inline-flex h-9 items-center justify-center rounded-md border border-[#9cc8ff]/24 px-3 text-xs font-bold text-[#dcecff] transition hover:bg-[#122337]"
                      onClick={() => onSelectGroup(group.id)}
                      type="button"
                    >
                      선택
                    </button>
                    <button
                      className="inline-flex h-9 items-center justify-center gap-1 rounded-md border border-white/12 px-3 text-xs font-bold text-[#d8cbb8] transition hover:bg-white/10"
                      onClick={() => onRemoveGroup(group.id)}
                      type="button"
                    >
                      <X aria-hidden="true" size={13} />
                      그룹 삭제
                    </button>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                  {group.photos.map((reference, index) => (
                    <div
                      className="overflow-hidden rounded-md border border-[#9cc8ff]/20 bg-[#07111c]"
                      key={reference.id}
                    >
                      <div className="relative aspect-square">
                        <img
                          alt={`${group.label} 헤어 레퍼런스 ${index + 1}`}
                          className="h-full w-full object-cover"
                          src={reference.url}
                        />
                        <span className="absolute left-2 top-2 rounded-md bg-black/65 px-2 py-1 text-[11px] font-bold text-[#dcecff]">
                          {group.label}-{index + 1}
                        </span>
                      </div>
                      {reference.sourceTitle ? (
                        <p className="truncate border-t border-[#9cc8ff]/14 px-2 py-2 text-xs font-semibold text-[#9fb4c8]">
                          {reference.sourceTitle}
                        </p>
                      ) : null}
                      <button
                        className="inline-flex h-9 w-full items-center justify-center gap-1 border-t border-[#9cc8ff]/14 text-xs font-bold text-[#dcecff] transition hover:bg-[#122337]"
                        onClick={() => onRemovePhoto(group.id, reference.id)}
                        type="button"
                      >
                        <X aria-hidden="true" size={13} />
                        삭제
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      ) : (
        <button
          className="mt-4 flex min-h-28 w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-[#9cc8ff]/35 bg-[#07111c]/72 px-4 text-center transition hover:border-[#9cc8ff]/70 hover:bg-[#102136]"
          disabled={cannotAddToActiveGroup}
          onClick={onUploadClick}
          type="button"
        >
          <ImagePlus aria-hidden="true" className="text-[#9cc8ff]" size={28} />
          <span className="text-sm font-bold text-[#fffaf1]">
            참고하고 싶은 연예인 헤어 사진을 현재 선택된 그룹에 올려보세요.
          </span>
          <span className="text-xs text-[#9fb4c8]">
            올리지 않으면 기존 미리룩 추천 9장으로 진행합니다.
          </span>
        </button>
      )}
        </div>
      ) : null}
    </section>
  );
}

function LoadingPanel({ label }: { label: string }) {
  return (
    <div className="mt-5 flex min-h-44 flex-col items-center justify-center gap-5 rounded-md border border-[#c9a96a]/35 bg-[#30271a]/80 p-6 text-center text-[#f3d28a]">
      <NeonSpinner size={64} />
      <p className="text-xl font-bold text-[#fffaf1]">{label}</p>
    </div>
  );
}

function NeonSpinner({ size = 58 }: { size?: number }) {
  const innerInset = Math.max(4, Math.round(size * 0.11));
  const coreInset = Math.max(8, Math.round(size * 0.2));
  const dotSize = Math.max(7, Math.round(size * 0.16));

  return (
    <span
      aria-hidden="true"
      className="relative inline-flex shrink-0 items-center justify-center rounded-full"
      style={{
        height: size,
        width: size,
      }}
    >
      <span
        className="absolute inset-0 animate-spin rounded-full"
        style={{
          background:
            "conic-gradient(from 20deg, #f3d28a 0deg, #ff7ad9 105deg, #7dd3fc 210deg, #8bf7c2 300deg, #f3d28a 360deg)",
          boxShadow:
            "0 0 34px rgba(243, 210, 138, 0.58), 0 0 22px rgba(125, 211, 252, 0.34)",
        }}
      >
        <span
          className="absolute left-1/2 top-0 -translate-x-1/2 rounded-full bg-[#fff4c2]"
          style={{
            boxShadow:
              "0 0 16px rgba(255, 244, 194, 0.98), 0 0 26px rgba(255, 122, 217, 0.5)",
            height: dotSize,
            width: dotSize,
          }}
        />
      </span>
      <span
        className="absolute rounded-full bg-[#15130f]"
        style={{ inset: innerInset }}
      />
      <span
        className="absolute rounded-full border border-white/12"
        style={{
          background:
            "radial-gradient(circle at 32% 28%, rgba(255, 255, 255, 0.18), rgba(17, 16, 14, 0.92) 58%)",
          inset: coreInset,
        }}
      />
    </span>
  );
}

function GenerationProgressBar({ progress }: { progress: number }) {
  const safeProgress = clampGenerationProgress(progress);

  return (
    <div className="grid w-full max-w-48 gap-2">
      <div className="flex items-center justify-between text-xs font-bold text-[#f3d28a]">
        <span>작업 진도</span>
        <span>{safeProgress}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/12 shadow-inner shadow-black/40">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,#f3d28a,#ff7ad9,#7dd3fc)] shadow-[0_0_16px_rgba(243,210,138,0.68)] transition-[width] duration-500 ease-out"
          style={{ width: `${safeProgress}%` }}
        />
      </div>
    </div>
  );
}

function HistoryPanel({
  items,
  onPrint,
}: {
  items: ConsultationHistoryItem[];
  onPrint: (item: ConsultationHistoryItem) => void;
}) {
  return (
    <section className="mt-5 rounded-md border border-[#2b281f] bg-[#0f0e0c]/72 p-4">
      <div className="flex items-center gap-2">
        <Sparkles aria-hidden="true" className="text-[#f3d28a]" size={18} />
        <h2 className="text-lg font-semibold text-[#fffaf1]">
          내 최근 히스토리
        </h2>
      </div>
      <p className="mt-2 text-sm leading-6 text-[#b8aa95]">
        이 브라우저에 저장된 최근 상담 결과입니다. Supabase 전용 프로젝트가 연결되면 서버 히스토리에도 함께 저장됩니다.
      </p>
      <div className="mt-4 grid gap-3">
        {items.map((item) => (
          <article
            className="grid gap-3 rounded-md border border-white/10 bg-[#15130f] p-3 md:grid-cols-[180px_minmax(0,1fr)_auto]"
            key={item.id}
          >
            <div className="grid grid-cols-3 gap-1 overflow-hidden rounded-md">
              {getHistoryPreviewImages(item, 3).map((image) => (
                <img
                  alt={`${item.styleName} ${image.label}`}
                  className="aspect-square h-full w-full object-cover"
                  key={`${item.id}-${image.label}`}
                  src={image.imageUrl}
                />
              ))}
            </div>
            <div>
              <p className="text-sm font-semibold text-[#fffaf1]">
                {item.styleName} · {item.hairColorName}
              </p>
              <p className="mt-1 text-sm text-[#b8aa95]">
                {formatHistoryDate(item.createdAt)} · {item.regionName ?? "한국"} · 사진 {item.sourcePhotoCount}장 기준 · 결과 {item.images.length}장
              </p>
              <p className="mt-1 text-xs text-[#8f826f]">
                {[item.regionName, item.audienceName, ...(item.consultingFocusNames ?? [])]
                  .filter(Boolean)
                  .join(" · ") || "기본 헤어 상담"}
              </p>
              {item.memo ? (
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#d8cbb8]">
                  {item.memo}
                </p>
              ) : null}
              <StyleAdviceBlocks maxItems={3} source={item} />
            </div>
            <button
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-white/12 px-3 text-sm font-semibold text-[#e7dccb] transition hover:bg-white/8"
              onClick={() => onPrint(item)}
              type="button"
            >
              <Download aria-hidden="true" size={16} />
              PDF
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function getHistoryPreviewImages(item: ConsultationHistoryItem, limit: number) {
  if (item.images.length) {
    return item.images.slice(0, limit);
  }

  if (item.recommendationImages?.length) {
    return item.recommendationImages.slice(0, limit);
  }

  if (item.outfitImages?.length) {
    return item.outfitImages.slice(0, limit);
  }

  if (item.makeupImages?.length) {
    return item.makeupImages.slice(0, limit);
  }

  return (item.sourcePhotos ?? []).slice(0, limit);
}

function getRecommendationCtaLabel({
  isAnalyzing,
  isGeneratingPreviews,
  missingPhotoCount,
  privacyAccepted,
  ready,
  uploadedPhotoCount,
}: {
  isAnalyzing: boolean;
  isGeneratingPreviews: boolean;
  missingPhotoCount: number;
  privacyAccepted: boolean;
  ready: boolean;
  uploadedPhotoCount: number;
}) {
  if (isGeneratingPreviews) {
    return "AI 합성 중...";
  }

  if (isAnalyzing) {
    return "분석 중...";
  }

  if (!privacyAccepted) {
    return "스타일 추천 받기";
  }

  if (!uploadedPhotoCount) {
    return "사진 업로드 먼저";
  }

  if (!ready) {
    return `사진 ${missingPhotoCount}장 더 올리기`;
  }

  return "스타일 추천 받기";
}

function getSlotLabel(slot: PhotoSlot) {
  return photoSlotConfig.find((item) => item.slot === slot)?.label ?? "사진";
}

function RecommendationModePanel({
  mode,
  onSelect,
}: {
  mode: RecommendationModeId;
  onSelect: (mode: RecommendationModeId) => void;
}) {
  return (
    <section className="rounded-md border border-[#2b281f] bg-[#0f0e0c]/72 p-4">
      <div className="flex items-center gap-2">
        <Sparkles aria-hidden="true" className="text-[#f3d28a]" size={18} />
        <h2 className="text-lg font-semibold text-[#fffaf1]">
          추천 목적
        </h2>
      </div>
      <p className="mt-2 text-sm leading-6 text-[#b8aa95]">
        미용실 상담에서는 현재 기장 기준을, 개인적으로 어울리는 방향이 궁금할 때는 얼굴 적합 기준을 선택하세요.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {recommendationModeOptions.map((option) => {
          const selected = option.id === mode;

          return (
            <button
              className={`min-h-28 rounded-md border p-4 text-left transition ${
                selected
                  ? "border-[#f3d28a] bg-[#30271a] text-[#fffaf1]"
                  : "border-white/12 bg-white/5 text-[#d8cbb8] hover:border-[#c9a96a]/55"
              }`}
              key={option.id}
              onClick={() => onSelect(option.id)}
              type="button"
            >
              <span className="flex items-center justify-between gap-3">
                <span className="text-base font-bold">{option.label}</span>
                <span className="rounded-md bg-white/8 px-2 py-1 text-xs font-semibold text-[#f3d28a]">
                  {option.badge}
                </span>
              </span>
              <span className="mt-3 block text-sm leading-6 text-[#cfc3b2]">
                {option.description}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function StylePreferencePanel({
  activeInfoStyleId,
  audience,
  styleGroups,
  styles,
  onInfoChange,
  onToggleStyle,
  selectedHairColor,
  selectedStyleIds,
}: {
  activeInfoStyleId: string | null;
  audience: MirilookAudience;
  styleGroups: StyleLengthGroup[];
  styles: MirilookStyle[];
  onInfoChange: (styleId: string) => void;
  onToggleStyle: (styleId: string) => void;
  selectedHairColor: HairColorChoice;
  selectedStyleIds: string[];
}) {
  const activeStyle =
    styles.find((style) => style.id === activeInfoStyleId) ?? styles[0];
  const styleMap = new Map(styles.map((style) => [style.id, style]));

  return (
    <section className="rounded-md border border-[#2b281f] bg-[#0f0e0c]/72 p-4">
      <div className="flex items-center gap-2">
        <Sparkles aria-hidden="true" className="text-[#f3d28a]" size={18} />
        <h2 className="text-lg font-semibold text-[#fffaf1]">
          원하는 헤어컷
        </h2>
      </div>
      <p className="mt-2 text-sm leading-6 text-[#b8aa95]">
        원하는 컷을 여러 개 선택할 수 있습니다. 선택하지 않으면{" "}
        {audience === "female" ? "여성" : "남성"} 전용 후보 안에서 자동 추천합니다.
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="grid gap-4">
          {styleGroups.map((group) => (
            <div key={group.label}>
              <p className="mb-2 text-sm font-semibold text-[#f3d28a]">
                {group.label}
              </p>
              <div className="flex flex-wrap gap-2">
                {group.styleIds.map((styleId) => {
                  const style = styleMap.get(styleId);

                  if (!style) {
                    return null;
                  }

                  const selected = selectedStyleIds.includes(style.id);

                  return (
                    <span
                      className={`inline-flex items-center rounded-md border transition ${
                        selected
                          ? "border-[#f3d28a] bg-[#30271a] text-[#fffaf1]"
                          : "border-white/12 bg-white/5 text-[#d8cbb8]"
                      }`}
                      key={style.id}
                    >
                      <button
                        className="h-9 px-3 text-sm font-semibold"
                        onClick={() => {
                          onInfoChange(style.id);
                          onToggleStyle(style.id);
                        }}
                        onFocus={() => onInfoChange(style.id)}
                        onMouseEnter={() => onInfoChange(style.id)}
                        type="button"
                      >
                        {style.name}
                      </button>
                      <button
                        aria-label={`${style.name} 설명 보기`}
                        className="mr-1 flex size-7 items-center justify-center rounded-md text-[#f3d28a] hover:bg-white/8"
                        onClick={() => onInfoChange(style.id)}
                        onFocus={() => onInfoChange(style.id)}
                        onMouseEnter={() => onInfoChange(style.id)}
                        title={style.reason}
                        type="button"
                      >
                        <Info aria-hidden="true" size={14} />
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {activeStyle ? (
          <div className="overflow-hidden rounded-md border border-white/10 bg-[#15130f]">
            <div className="relative aspect-square overflow-hidden">
              <StyleSamplePreview
                audience={audience}
                hairColor={selectedHairColor}
                style={activeStyle}
              />
              <div
                className={`absolute inset-0 bg-gradient-to-b ${activeStyle.accent} via-transparent to-[#0f0e0c]/88`}
              />
              <p className="absolute bottom-3 left-3 right-3 text-lg font-semibold text-[#fffaf1]">
                {activeStyle.name}
              </p>
            </div>
            <div className="p-3">
              <p className="text-sm leading-6 text-[#d8cbb8]">
                {activeStyle.reason}
              </p>
              <StyleAdviceBlocks maxItems={2} source={activeStyle} />
              <div className="mt-3 flex flex-wrap gap-2">
                {activeStyle.tags.map((tag) => (
                  <span
                    className="rounded-md bg-white/7 px-2 py-1 text-xs text-[#d8cbb8]"
                    key={tag}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function StyleSamplePreview({
  audience,
  hairColor,
  style,
}: {
  audience: MirilookAudience;
  hairColor: HairColorChoice;
  style: MirilookStyle;
}) {
  const sampleCell = getStyleSampleCell(style.id, audience);
  const colorOverlay = getHairSampleOverlay(hairColor.id);
  const sampleImage =
    audience === "female"
      ? "/mock/style-samples/women-haircut-catalog-3x3.png"
      : "/mock/style-samples/men-haircut-catalog-3x3.png";

  return (
    <div
      aria-label={`${style.name} ${hairColor.name} 실사 샘플`}
      className="relative h-full w-full overflow-hidden bg-[#d8d5ce]"
      role="img"
    >
      <div
        className="absolute inset-0 scale-[1.025] bg-no-repeat"
        style={{
          backgroundImage: `url('${sampleImage}')`,
          backgroundPosition: sampleCell.backgroundPosition,
          backgroundSize: "300% 300%",
        }}
      />
      {colorOverlay ? (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[58%] opacity-55"
          style={{
            background:
              `linear-gradient(180deg, ${colorOverlay} 0%, ${colorOverlay} 48%, transparent 100%)`,
            mixBlendMode: "color",
          }}
        />
      ) : null}
      <div className="absolute left-3 top-3 flex items-center gap-2 rounded-md bg-[#0f0e0c]/78 px-2 py-1 text-[11px] font-semibold text-[#fff4d7] backdrop-blur-sm">
        <span
          aria-hidden="true"
          className="size-2.5 rounded-full ring-1 ring-white/30"
          style={{ backgroundColor: hairColor.swatch }}
        />
        {hairColor.name}
      </div>
      <div className="absolute inset-0 ring-1 ring-inset ring-white/10" />
    </div>
  );
}

function StyleAdviceBlocks({
  maxItems,
  source,
}: {
  maxItems?: number;
  source: {
    salonProcess?: string;
    maintenanceAdvice?: string;
    outfitAdvice?: string;
    makeupAdvice?: string;
  };
}) {
  const items = [
    { label: "시술", value: source.salonProcess },
    { label: "관리", value: source.maintenanceAdvice },
    { label: "코디", value: source.outfitAdvice },
    { label: "메이크업", value: source.makeupAdvice },
  ].filter(
    (item): item is { label: string; value: string } =>
      Boolean(item.value?.trim()),
  );
  const visibleItems =
    typeof maxItems === "number" ? items.slice(0, maxItems) : items;

  if (!visibleItems.length) {
    return null;
  }

  return (
    <div className="mt-3 space-y-2">
      {visibleItems.map((item) => (
        <p
          className="text-xs leading-5 text-[#cfc3b2]"
          key={`${item.label}-${item.value}`}
        >
          <span className="mr-2 inline-flex rounded-md bg-[#f3d28a]/12 px-2 py-0.5 font-semibold text-[#f3d28a]">
            {item.label}
          </span>
          {item.value}
        </p>
      ))}
    </div>
  );
}

function getStyleSampleCell(styleId: string, audience: MirilookAudience) {
  const maleCellIndexByStyle: Record<string, number> = {
    "leaf-cut": 0,
    "ivy-league": 1,
    "soft-parted": 2,
    "side-part-taper": 2,
    "comma-hair": 2,
    "crop-cut": 3,
    "french-crop": 3,
    "textured-fringe": 3,
    "semi-crop": 3,
    "short-mash": 3,
    "buzz-taper": 3,
    "two-block-cut": 3,
    "low-fade-crop": 3,
    "clean-upbang": 7,
    "dandy-cut": 4,
    "shadow-perm": 5,
    "down-perm-two-block": 5,
    "curtain-perm": 6,
    "natural-wave": 6,
    "middle-part-layer": 2,
    "wet-comma": 2,
    "long-layered-c-curl": 6,
    "long-hush-cut": 6,
    "build-perm": 6,
    "loose-hippie-perm": 6,
    "sleek-long-straight": 6,
    "medium-layered-bob": 6,
    "slick-back-taper": 7,
    "short-quiff": 7,
    "regent-cut": 7,
    "soft-wolf": 8,
    "tassel-bob": 8,
    "cs-curl-bob": 8,
    "short-bob": 8,
    "soft-pixie": 8,
    "layered-short-bob": 7,
    "airy-bob-perm": 7,
  };
  const femaleCellIndexByStyle: Record<string, number> = {
    "long-layered-c-curl": 0,
    "butterfly-layered": 0,
    "side-bang-layered": 0,
    "long-hush-cut": 1,
    "wolf-hush-women": 1,
    "face-line-layer": 1,
    "wavy-lob": 5,
    "build-perm": 2,
    "elizabeth-perm": 2,
    "curtain-bang-long": 0,
    "jelly-perm": 2,
    "loose-hippie-perm": 3,
    "hime-cut": 4,
    "sleek-long-straight": 4,
    "medium-layered-bob": 5,
    "medium-c-curl": 5,
    "medium-s-curl": 6,
    "tassel-bob": 7,
    "cs-curl-bob": 7,
    "short-bob": 7,
    "soft-pixie": 8,
    "rounded-short-cut": 8,
    "layered-short-bob": 7,
    "airy-bob-perm": 7,
    "bob-with-bangs": 7,
    "layered-cs-bob": 7,
  };
  const cellIndex =
    audience === "female"
      ? (femaleCellIndexByStyle[styleId] ?? 0)
      : (maleCellIndexByStyle[styleId] ?? 0);
  const row = Math.floor(cellIndex / 3);
  const col = cellIndex % 3;

  return {
    backgroundPosition: `${col * 50}% ${row * 50}%`,
  };
}

function getHairSampleOverlay(hairColorId: string) {
  const overlays: Record<string, string | undefined> = {
    "natural-black": undefined,
    "dark-brown": "#5b392c",
    "choco-brown": "#7a4b34",
    "ash-brown": "#9b927d",
    "ash-gray": "#b8bbb4",
    "smoky-ash": "#85877f",
    "khaki-brown": "#777750",
    "olive-brown": "#747050",
    "blue-black": "#182b45",
    "lavender-ash": "#a69ab0",
    "milk-tea": "#b88f65",
    "beige-brown": "#b4926b",
    "rose-brown": "#9a5b58",
    "copper-brown": "#a45b3c",
    "wine-brown": "#6c2d38",
    "honey-blond": "#d0a15f",
    "platinum-blond": "#d9cda4",
  };

  if (hairColorId === "natural-black") {
    return undefined;
  }

  return (
    overlays[hairColorId] ??
    hairColorChoices.find((color) => color.id === hairColorId)?.swatch
  );
}

function getHairColorButtonStyle(color: HairColorChoice, selected: boolean) {
  const swatchRgb = parseHexColor(color.swatch) ?? { b: 40, g: 40, r: 40 };
  const swatchLuminance = getRelativeLuminance(swatchRgb);
  const blendTarget =
    swatchLuminance > 0.5
      ? { b: 241, g: 250, r: 255 }
      : { b: 12, g: 14, r: 15 };
  let backgroundRgb = mixRgb(
    swatchRgb,
    blendTarget,
    swatchLuminance > 0.5 ? 0.32 : 0.22,
  );
  let backgroundColor = rgbToHex(backgroundRgb);
  const lightText = "#fffaf1";
  const darkText = "#17130e";
  let textColor =
    getContrastRatio(backgroundRgb, parseHexColor(darkText) ?? { b: 14, g: 19, r: 23 }) >
    getContrastRatio(backgroundRgb, parseHexColor(lightText) ?? { b: 241, g: 250, r: 255 })
      ? darkText
      : lightText;

  if (
    getContrastRatio(
      backgroundRgb,
      parseHexColor(textColor) ?? { b: 241, g: 250, r: 255 },
    ) < 4.5
  ) {
    backgroundRgb = mixRgb(
      backgroundRgb,
      textColor === darkText
        ? { b: 241, g: 250, r: 255 }
        : { b: 12, g: 14, r: 15 },
      0.12,
    );
    backgroundColor = rgbToHex(backgroundRgb);
    textColor =
      getContrastRatio(backgroundRgb, parseHexColor(darkText) ?? { b: 14, g: 19, r: 23 }) >
      getContrastRatio(backgroundRgb, parseHexColor(lightText) ?? { b: 241, g: 250, r: 255 })
        ? darkText
        : lightText;
  }

  return {
    backgroundColor,
    borderColor: selected
      ? "#f3d28a"
      : mixHex(backgroundColor, textColor, 0.34),
    boxShadow: selected
      ? "0 0 0 2px rgba(243,210,138,0.34), 0 10px 24px rgba(0,0,0,0.24)"
      : "inset 0 1px 0 rgba(255,255,255,0.12)",
    swatchBorderColor: textColor,
    swatchShadow:
      textColor === "#17130e"
        ? "0 0 0 2px rgba(255,255,255,0.45)"
        : "0 0 0 2px rgba(0,0,0,0.28)",
    textColor,
  };
}

function parseHexColor(hex: string) {
  const match = hex.trim().match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);

  if (!match) {
    return null;
  }

  return {
    r: Number.parseInt(match[1], 16),
    g: Number.parseInt(match[2], 16),
    b: Number.parseInt(match[3], 16),
  };
}

function mixHex(hex: string, targetHex: string, targetWeight: number) {
  const base = parseHexColor(hex) ?? { b: 0, g: 0, r: 0 };
  const target = parseHexColor(targetHex) ?? { b: 255, g: 255, r: 255 };

  return rgbToHex(mixRgb(base, target, targetWeight));
}

function mixRgb(
  base: { b: number; g: number; r: number },
  target: { b: number; g: number; r: number },
  targetWeight: number,
) {
  const baseWeight = 1 - targetWeight;

  return {
    r: Math.round(base.r * baseWeight + target.r * targetWeight),
    g: Math.round(base.g * baseWeight + target.g * targetWeight),
    b: Math.round(base.b * baseWeight + target.b * targetWeight),
  };
}

function rgbToHex({ b, g, r }: { b: number; g: number; r: number }) {
  return `#${[r, g, b]
    .map((channel) =>
      Math.max(0, Math.min(255, channel)).toString(16).padStart(2, "0"),
    )
    .join("")}`;
}

function getRelativeLuminance({ b, g, r }: { b: number; g: number; r: number }) {
  const [red, green, blue] = [r, g, b].map((channel) => {
    const value = channel / 255;

    return value <= 0.03928
      ? value / 12.92
      : Math.pow((value + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function getContrastRatio(
  foreground: { b: number; g: number; r: number },
  background: { b: number; g: number; r: number },
) {
  const foregroundLuminance = getRelativeLuminance(foreground);
  const backgroundLuminance = getRelativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

function HairColorPanel({
  onSelect,
  selectedColorId,
}: {
  onSelect: (colorId: string) => void;
  selectedColorId: string;
}) {
  const chartColors = hairColorChoices
    .filter(
      (color) =>
        typeof color.chartColumn === "number" &&
        typeof color.chartRow === "number",
    )
    .sort(
      (a, b) =>
        (a.chartRow ?? 0) - (b.chartRow ?? 0) ||
        (a.chartColumn ?? 0) - (b.chartColumn ?? 0),
    );

  return (
    <section className="rounded-md border border-[#2b281f] bg-[#0f0e0c]/72 p-4">
      <div className="flex items-center gap-2">
        <Sparkles aria-hidden="true" className="text-[#f3d28a]" size={18} />
        <h2 className="text-lg font-semibold text-[#fffaf1]">
          원하는 헤어 컬러
        </h2>
      </div>
      <p className="mt-2 text-sm leading-6 text-[#b8aa95]">
        염색을 원하면 컬러를 선택하세요. 선택한 컬러가 추천 이미지 전체에 반영됩니다.
      </p>
      <div className="mt-4 min-w-0 pb-1">
        <div
          className="grid w-full min-w-0 gap-1 rounded-md border border-white/10 bg-[#080705] p-2 sm:gap-1.5"
          style={{
            gridTemplateColumns: `clamp(34px, 8vw, 44px) repeat(${hairColorChartColumns.length}, minmax(0, 1fr))`,
          }}
        >
          <div
            aria-hidden="true"
            className="rounded-sm border border-white/8 bg-[#15130f]"
            style={{ gridColumn: 1, gridRow: 1 }}
          />
          {hairColorChartColumns.map((column, index) => (
            <div
              className="flex min-h-10 items-center justify-center overflow-hidden rounded-sm border border-white/10 px-0.5 text-center text-[8px] font-black leading-3 text-[#fffaf1] sm:px-1 sm:text-[11px] sm:leading-4"
              key={column.id}
              style={{
                backgroundColor: column.tone,
                gridColumn: index + 2,
                gridRow: 1,
              }}
            >
              {column.label}
            </div>
          ))}
          {hairColorChartRows.map((row, rowIndex) => (
            <div
              className="flex min-h-16 flex-col items-center justify-center overflow-hidden rounded-sm border border-white/10 bg-[#171511] px-0.5 text-center sm:px-1"
              key={row.level}
              style={{ gridColumn: 1, gridRow: rowIndex + 2 }}
            >
              <span className="text-xs font-black text-[#f3d28a] sm:text-sm">
                {row.label}
              </span>
              <span className="mt-1 hidden text-[8px] font-bold leading-3 text-[#9d917f] sm:block sm:text-[9px]">
                {row.tone}
              </span>
            </div>
          ))}
          {hairColorChartRows.flatMap((row, rowIndex) =>
            hairColorChartColumns.map((column, columnIndex) => (
              <div
                aria-hidden="true"
                className="min-h-16 rounded-sm border border-white/6 bg-[#100f0d]/72"
                key={`${row.level}-${column.id}`}
                style={{
                  gridColumn: columnIndex + 2,
                  gridRow: rowIndex + 2,
                }}
              />
            )),
          )}
          {chartColors.map((color) => {
          const selected = color.id === selectedColorId;
          const buttonStyle = getHairColorButtonStyle(color, selected);

          return (
            <button
              className="relative z-10 min-h-16 overflow-hidden rounded-sm border bg-[#171511] p-1 text-center text-[9px] font-black leading-3 text-[#fffaf1] transition hover:-translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f3d28a]"
              key={color.id}
              onClick={() => onSelect(color.id)}
              style={{
                backgroundColor: color.swatch,
                borderColor: selected ? "#f3d28a" : "rgba(255,255,255,0.16)",
                boxShadow: buttonStyle.boxShadow,
                gridColumn: (color.chartColumn ?? 1) + 1,
                gridRow: (color.chartRow ?? 1) + 1,
              }}
              type="button"
            >
              <span className="absolute inset-1 rounded-[3px] border border-white/24 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]" />
              <span
                className="absolute bottom-1 left-1 right-1 rounded-[3px] border border-white/28 bg-black/48 px-1 py-0.5 text-center [word-break:keep-all]"
                style={{
                  fontSize: 9,
                  lineHeight: "12px",
                  textShadow:
                    "0 0 4px rgba(255,255,255,0.72), 0 0 9px rgba(255,255,255,0.32)",
                }}
              >
                {color.name}
              </span>
            </button>
          );
        })}
        </div>
      </div>
    </section>
  );
}

function StyleCard({
  active,
  frontPhoto,
  onSelect,
  style,
}: {
  active: boolean;
  frontPhoto: UploadedPhoto;
  onSelect: () => void;
  style: DisplayRecommendation;
}) {
  const imageUrl = style.imageUrl ?? (!liveAiEnabled ? frontPhoto.url : "");
  const progress = getVisibleGenerationProgress({
    hasImage: Boolean(imageUrl),
    isGenerating: style.isGenerating,
    progress: style.generationProgress,
  });

  return (
    <article
      aria-label={`${style.name} 추천 스타일 선택`}
      aria-pressed={active}
      className={`overflow-hidden rounded-md border text-left transition ${
        active
          ? "border-[#f3d28a] bg-[#30271a] text-[#fffaf1]"
          : "border-white/12 bg-[#0f0e0c]/72 text-[#e7dccb] hover:border-[#c9a96a]/55"
      }`}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) {
          return;
        }

        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="relative aspect-square overflow-hidden">
        {imageUrl ? (
          <img
            alt={`${style.name} 디자인 미리보기`}
            className={`h-full w-full object-cover opacity-92 ${style.cropClass}`}
            src={imageUrl}
          />
        ) : (
          <div className="relative z-10 flex h-full w-full flex-col items-center justify-center gap-4 bg-[#15130f] px-4 text-center">
            {style.isGenerating ? (
              <NeonSpinner size={58} />
            ) : null}
            <span className="text-xl font-bold text-[#fffaf1]">
              {style.error ? "생성 실패" : "AI 합성 중"}
            </span>
            {progress !== undefined && !style.error ? (
              <GenerationProgressBar progress={progress} />
            ) : null}
            <span className="text-sm font-semibold text-[#b8aa95]">
              {style.error ? "자동 재시도 후 확인 필요" : style.name}
            </span>
            {style.error ? (
              <span className="max-w-52 text-xs leading-5 text-[#d8cbb8]">
                {getShortGenerationError(style.error)}
              </span>
            ) : null}
          </div>
        )}
        <div
          className={`absolute inset-0 bg-gradient-to-b ${style.accent} via-transparent to-[#0f0e0c]/86`}
        />
        <div className="absolute right-3 top-3 z-30 flex flex-col items-end gap-2">
          {active && !style.isGenerating && !style.error ? (
            <span className="flex size-8 items-center justify-center rounded-full bg-[#f3d28a] text-[#1a1712]">
              <Check aria-hidden="true" size={17} />
            </span>
          ) : null}
          {style.error ? (
            <span className="rounded-md bg-[#11100e]/85 px-2 py-1 text-xs font-semibold text-[#f3d28a]">
              생성 실패
            </span>
          ) : null}
          {imageUrl && !style.error ? (
            <button
              aria-label={`${style.name} 추천 이미지 저장`}
              className="flex size-8 items-center justify-center rounded-md border border-white/12 bg-[#11100e]/78 text-[#fffaf1] backdrop-blur-sm transition hover:border-[#f3d28a]/60 hover:text-[#f3d28a]"
              onClick={(event) => {
                event.stopPropagation();
                void downloadResultImage(
                  imageUrl,
                  `mirilook-${style.id}-recommendation.jpg`,
                );
              }}
              title="이미지 저장"
              type="button"
            >
              <Download aria-hidden="true" size={15} />
            </button>
          ) : null}
        </div>
        <div className="absolute bottom-3 left-3 right-3">
          <p className="text-xl font-semibold text-[#fffaf1]">{style.name}</p>
        </div>
      </div>
      <div className="p-4">
        <p className="text-sm leading-6 text-[#b8aa95]">{style.reason}</p>
        <StyleAdviceBlocks maxItems={2} source={style} />
        <div className="mt-3 flex flex-wrap gap-2">
          {style.tags.map((tag) => (
            <span
              className="rounded-md bg-white/7 px-2 py-1 text-xs text-[#d8cbb8]"
              key={tag}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}

function SelectedPreviewPanel({
  frontPhoto,
  style,
}: {
  frontPhoto: UploadedPhoto;
  style: DisplayRecommendation;
}) {
  const imageUrl = style.imageUrl ?? (!liveAiEnabled ? frontPhoto.url : "");

  return (
    <section className="mt-5 grid gap-5 border-t border-white/10 pt-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
      <div className="overflow-hidden rounded-md border border-[#c9a96a]/45 bg-[#0f0e0c]">
        <div className="relative aspect-square overflow-hidden">
          {imageUrl ? (
            <img
              alt={`${style.name} 확대 이미지`}
              className={`h-full w-full object-cover opacity-95 ${style.cropClass}`}
              src={imageUrl}
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-5 bg-[#15130f] text-center">
              {style.isGenerating ? (
                <NeonSpinner size={70} />
              ) : null}
              <p className="text-2xl font-bold text-[#fffaf1]">
                {style.error ? "미리보기 생성 실패" : "이미지 준비 중"}
              </p>
            </div>
          )}
          <div
            className={`absolute inset-0 bg-gradient-to-b ${style.accent} via-transparent to-[#0f0e0c]/88`}
          />
          <div className="absolute bottom-5 left-5 right-5">
            <p className="text-3xl font-semibold text-[#fffaf1]">{style.name}</p>
          </div>
        </div>
      </div>

      <div className="rounded-md border border-[#2b281f] bg-[#0f0e0c]/82 p-5">
        <div className="flex items-center gap-2">
          <Sparkles aria-hidden="true" className="text-[#f3d28a]" size={18} />
          <h3 className="text-xl font-semibold text-[#fffaf1]">선택한 스타일</h3>
        </div>
        <p className="mt-4 text-sm leading-6 text-[#d8cbb8]">{style.reason}</p>
        <StyleAdviceBlocks source={style} />
        <div className="mt-4 flex flex-wrap gap-2">
          {style.tags.map((tag) => (
            <span
              className="rounded-md bg-white/7 px-2 py-1 text-xs text-[#d8cbb8]"
              key={tag}
            >
              {tag}
            </span>
          ))}
        </div>
        <p className="mt-3 text-xs leading-5 text-[#a99b87]">
          위 추천 결과 영역의 버튼으로 상담용 9장과 코디 추천을 선택할 수 있습니다.
        </p>
      </div>
    </section>
  );
}

function RenderedResultPreviewDialog({
  isMirrored,
  onClose,
  onMove,
  onToggleMirror,
  preview,
  results,
  selectedStyle,
}: {
  isMirrored: boolean;
  onClose: () => void;
  onMove: (direction: -1 | 1) => void;
  onToggleMirror: () => void;
  preview: RenderedResultPreviewState;
  results: RenderedResult[];
  selectedStyle: DisplayRecommendation;
}) {
  const result = results[preview.index];
  const hasMultiple = results.filter((item) => item.imageUrl).length > 1;
  const imageUrl = result?.imageUrl;

  if (!result || !imageUrl) {
    return null;
  }

  return (
    <ViewportCenteredOverlay
      aria-label={`${selectedStyle.name} 상담 이미지 크게 보기`}
      aria-modal="true"
      className="bg-black/84"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="grid w-full max-w-5xl gap-3"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-[#fffaf1]">
              {selectedStyle.name} 상담용 이미지
            </p>
            <p className="mt-1 text-sm text-[#b8aa95]">
              {result.label} · {preview.index + 1}/{results.length}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              aria-label="이미지 저장"
              className="inline-flex size-10 items-center justify-center rounded-md border border-[#c9a96a]/50 bg-[#171511] text-[#f3d28a] transition hover:bg-[#f3d28a]/10"
              onClick={() =>
                void downloadResultImage(
                  imageUrl,
                  `mirilook-${selectedStyle.id}-${result.label}.jpg`,
                  { mirrored: isMirrored },
                )
              }
              type="button"
            >
              <Download aria-hidden="true" size={18} />
            </button>
            <button
              aria-label={
                isMirrored
                  ? `${result.label} 원본 방향 보기`
                  : `${result.label} 좌우 반전하기`
              }
              aria-pressed={isMirrored}
              className={`inline-flex size-10 items-center justify-center rounded-md border transition ${
                isMirrored
                  ? "border-[#f3d28a] bg-[#f3d28a] text-[#171511]"
                  : "border-[#c9a96a]/50 bg-[#171511] text-[#f3d28a] hover:bg-[#f3d28a]/10"
              }`}
              onClick={onToggleMirror}
              title={isMirrored ? "원본 방향 보기" : "좌우 반전하기"}
              type="button"
            >
              <Mirror180Icon size={30} />
            </button>
            <button
              aria-label="닫기"
              className="inline-flex size-10 items-center justify-center rounded-md border border-white/12 bg-[#171511] text-[#e7dccb] transition hover:bg-white/10"
              onClick={onClose}
              type="button"
            >
              <X aria-hidden="true" size={18} />
            </button>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-md border border-[#2b281f] bg-[#0f0e0c] shadow-2xl shadow-black/60">
          <img
            alt={`${selectedStyle.name} ${result.label} 상담 이미지`}
            className={`h-auto max-h-[78vh] w-full object-contain ${
              result.className ?? ""
            }`}
            src={imageUrl}
            style={getMirrorImageStyle(isMirrored)}
          />
          {hasMultiple ? (
            <>
              <button
                aria-label="이전 이미지"
                className="absolute left-3 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/55 text-[#fffaf1] transition hover:bg-black/75"
                onClick={() => onMove(-1)}
                type="button"
              >
                <ChevronLeft aria-hidden="true" size={24} />
              </button>
              <button
                aria-label="다음 이미지"
                className="absolute right-3 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/55 text-[#fffaf1] transition hover:bg-black/75"
                onClick={() => onMove(1)}
                type="button"
              >
                <ChevronRight aria-hidden="true" size={24} />
              </button>
            </>
          ) : null}
        </div>
        <p className="text-xs leading-5 text-[#8f826f]">
          AI 이미지는 상담 참고용 시안이며 실제 시술 결과를 보장하지 않습니다.
        </p>
      </div>
    </ViewportCenteredOverlay>
  );
}

function ResultCard({
  isMirrored,
  onPreview,
  onToggleMirror,
  result,
  selectedStyle,
}: {
  isMirrored: boolean;
  onPreview: () => void;
  onToggleMirror: () => void;
  result: RenderedResult;
  selectedStyle: DisplayRecommendation;
}) {
  const progress = getVisibleGenerationProgress({
    hasImage: Boolean(result.imageUrl),
    isGenerating: result.isGenerating,
    progress: result.generationProgress,
  });

  return (
    <div className="overflow-hidden rounded-md border border-[#2b281f] bg-[#0f0e0c]">
      <div className="relative aspect-square overflow-hidden">
        {result.imageUrl ? (
          <>
            <img
              alt={`${selectedStyle.name} ${result.label} 결과`}
              className={`h-full w-full object-cover opacity-92 ${
                result.className ?? ""
              }`}
              src={result.imageUrl}
              style={getMirrorImageStyle(isMirrored)}
            />
            <button
              aria-label={`${selectedStyle.name} ${result.label} 크게 보기`}
              className="absolute inset-0 z-20 cursor-zoom-in"
              onClick={onPreview}
              type="button"
            />
          </>
        ) : (
          <div className="relative z-10 flex h-full w-full flex-col items-center justify-center gap-4 bg-[#15130f] px-3 text-center font-semibold text-[#b8aa95]">
            {result.isGenerating ? (
              <NeonSpinner size={58} />
            ) : null}
            <span className="text-lg font-bold text-[#fffaf1]">
              {result.error ? "생성 실패" : "생성 중"}
            </span>
            {progress !== undefined && !result.error ? (
              <GenerationProgressBar progress={progress} />
            ) : null}
            {result.error ? (
              <span className="max-w-52 text-xs leading-5 text-[#d8cbb8]">
                자동 재시도 후 실패 · {getShortGenerationError(result.error)}
              </span>
            ) : null}
          </div>
        )}
        <div
          className={`pointer-events-none absolute inset-0 z-10 bg-gradient-to-b ${selectedStyle.accent} via-transparent to-[#0f0e0c]/80`}
        />
        <div className="pointer-events-none absolute left-2 top-2 z-30 rounded-md bg-[#11100e]/78 px-2 py-1 text-[11px] font-semibold text-[#f3d28a] sm:left-3 sm:top-3 sm:text-xs">
          {result.label}
        </div>
        {result.imageUrl ? (
          <div className="absolute right-2 top-2 z-40 flex flex-col gap-2 sm:right-3 sm:top-3">
            <button
              aria-label={`${selectedStyle.name} ${result.label} 이미지 저장`}
              className="flex size-8 items-center justify-center rounded-md border border-white/12 bg-[#11100e]/78 text-[#fffaf1] backdrop-blur-sm transition hover:border-[#f3d28a]/60 hover:text-[#f3d28a] sm:size-9"
              onClick={() => {
                if (!result.imageUrl) {
                  return;
                }

                void downloadResultImage(
                  result.imageUrl,
                  `mirilook-${selectedStyle.id}-${result.label}.jpg`,
                  { mirrored: isMirrored },
                );
              }}
              title="이미지 저장"
              type="button"
            >
              <Download aria-hidden="true" size={15} />
            </button>
            <button
              aria-label={
                isMirrored
                  ? `${selectedStyle.name} ${result.label} 원본 방향 보기`
                  : `${selectedStyle.name} ${result.label} 좌우 반전하기`
              }
              aria-pressed={isMirrored}
              className={`flex size-8 items-center justify-center rounded-md border backdrop-blur-sm transition sm:size-9 ${
                isMirrored
                  ? "border-[#f3d28a] bg-[#f3d28a] text-[#171511]"
                  : "border-white/12 bg-[#11100e]/78 text-[#fffaf1] hover:border-[#f3d28a]/60 hover:text-[#f3d28a]"
              }`}
              onClick={onToggleMirror}
              title={isMirrored ? "원본 방향 보기" : "좌우 반전하기"}
              type="button"
            >
              <Mirror180Icon size={26} />
            </button>
          </div>
        ) : null}
        <div className="pointer-events-none absolute bottom-2 left-2 right-2 z-30 text-xs font-semibold text-[#fffaf1] sm:bottom-3 sm:left-3 sm:right-3 sm:text-sm">
          {selectedStyle.name}
        </div>
      </div>
    </div>
  );
}

function Mirror180Icon({ size }: { size: number }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      height={Math.round(size * 0.72)}
      viewBox="0 0 72 52"
      width={size}
    >
      <text
        dominantBaseline="middle"
        fill="currentColor"
        fontSize="24"
        fontWeight="900"
        textAnchor="middle"
        x="36"
        y="20"
      >
        180°
      </text>
      <path
        d="M13 31c5.8 8.7 23.7 10.6 41.6 4.4"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="5"
      />
      <path d="M49.5 29.3 63 31.4 53.8 41.5Z" fill="currentColor" />
      <path
        d="M59 27.5c-4.7-8.3-22.1-11.1-39.5-6.2"
        fill="none"
        opacity="0.7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="4"
      />
    </svg>
  );
}

function getMirrorImageStyle(isMirrored: boolean) {
  return isMirrored
    ? {
        transform: "scaleX(-1)",
        transformOrigin: "center",
      }
    : undefined;
}

async function prepareUploadImage(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("이미지 파일만 업로드할 수 있습니다.");
  }

  const sourceUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(sourceUrl);
    const maxSourceSide = Math.max(image.naturalWidth, image.naturalHeight);
    const scale = Math.min(1, uploadImageMaxSide / maxSourceSide);
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("브라우저에서 사진을 처리하지 못했습니다.");
    }

    canvas.width = width;
    canvas.height = height;
    context.drawImage(image, 0, 0, width, height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (value) => {
          if (value) {
            resolve(value);
          } else {
            reject(new Error("사진 압축에 실패했습니다."));
          }
        },
        "image/jpeg",
        uploadImageQuality,
      );
    });

    return new File([blob], toJpegName(file.name), {
      lastModified: file.lastModified,
      type: "image/jpeg",
    });
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(
        new Error(
          "사진을 읽지 못했습니다. 다른 이미지로 다시 시도해 주세요.",
        ),
      );
    image.src = src;
  });
}

async function fetchSavedProfilePhoto(
  slot: PhotoSlot,
  savedPhoto: NonNullable<SavedProfilePhoto>,
  token: string,
) {
  const response = await fetch(`${apiBaseUrl}/api/profile/photos/${slot}/`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.ok || !savedPhoto.url) {
    return response;
  }

  return fetch(savedPhoto.url);
}

function toJpegName(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "") + ".jpg";
}

function buildCelebrityReferenceFileName(source: string) {
  const normalized = source
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/[^a-zA-Z0-9가-힣_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return `celebrity-reference-${normalized || "image"}`;
}

function createCelebrityReferenceGroup(index: number): CelebrityReferenceGroup {
  const nextNumber = index + 1;

  return {
    id: `celebrity-group-${Date.now()}-${nextNumber}`,
    label: `연예인 ${nextNumber}`,
    photos: [],
  };
}

function getCelebrityReferenceGroupById(
  groups: CelebrityReferenceGroup[],
  groupId: string,
) {
  return groups.find((group) => group.id === groupId) ?? null;
}

function normalizeCelebrityReferenceGroupLabels(
  groups: CelebrityReferenceGroup[],
) {
  return groups.map((group, index) => ({
    ...group,
    label: `연예인 ${index + 1}`,
  }));
}

function createLocalConsultationId() {
  const randomPart =
    globalThis.crypto?.randomUUID?.().replace(/-/g, "").slice(0, 10) ??
    Math.random().toString(36).slice(2, 12);

  return `mirilook-${Date.now()}-${randomPart}`;
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))}KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)}MB`;
}

async function dataUrlToFile(dataUrl: string, fileName: string) {
  const response = await fetch(dataUrl);
  const blob = await response.blob();

  return new File([blob], fileName, {
    type: blob.type || "image/jpeg",
  });
}

function uniqueFiles(files: Array<File | undefined>) {
  const unique: File[] = [];
  const seen = new Set<File>();

  files.forEach((file) => {
    if (!file || seen.has(file)) {
      return;
    }

    seen.add(file);
    unique.push(file);
  });

  return unique;
}

function createReferenceFileName(label: string) {
  return `mirilook-reference-${label.replace(/[^\w가-힣-]+/g, "-")}.jpg`;
}

function isConsultationGuideLine(line: string) {
  return (
    line.includes("마음에 드는 디자인") &&
    line.includes("상담용 9장")
  );
}

function buildOutfitRecommendations({
  audience,
  hairColor,
}: {
  audience: MirilookAudience;
  hairColor: string;
}): OutfitRecommendation[] {
  const tone =
    hairColor.includes("애쉬") || hairColor.includes("블랙")
      ? "모노톤"
      : hairColor.includes("브라운") || hairColor.includes("카키")
        ? "웜톤"
        : "뉴트럴";
  const items =
    audience === "female"
      ? [
          {
            id: "top" as const,
            label: "상의",
            description:
              "헤어 볼륨과 얼굴 주변 라인이 살아 보이도록 니트, 블라우스, 셔츠 계열을 먼저 봅니다.",
            query: `여성 ${tone} 니트 블라우스`,
            tags: ["상의", tone, "데일리"],
          },
          {
            id: "bottom" as const,
            label: "하의",
            description:
              "헤어가 부드러운 인상을 만들면 슬랙스, 롱스커트, 데님으로 전체 실루엣을 정리합니다.",
            query: "여성 슬랙스 롱스커트 데님",
            tags: ["하의", "실루엣", "밸런스"],
          },
          {
            id: "glasses" as const,
            label: "안경",
            description:
              "앞머리와 눈매를 가리지 않는 얇은 프레임으로 얼굴 중심을 또렷하게 잡습니다.",
            query: "여성 얇은 프레임 안경",
            tags: ["안경", "얼굴 중심", "프레임"],
          },
          {
            id: "shoes" as const,
            label: "신발",
            description:
              "전체 코디가 가벼워 보이도록 로퍼, 플랫, 미니멀 스니커즈를 우선 비교합니다.",
            query: "여성 로퍼 플랫 스니커즈",
            tags: ["신발", "데일리", "밸런스"],
          },
          {
            id: "bag" as const,
            label: "가방",
            description:
              "헤어와 상체 실루엣을 방해하지 않는 미니멀 숄더백이나 토트백이 무난합니다.",
            query: "여성 미니멀 숄더백 토트백",
            tags: ["가방", "미니멀", "데일리"],
          },
          {
            id: "watch" as const,
            label: "시계",
            description:
              "손목 포인트는 얇고 깔끔하게 잡아 헤어와 메이크업을 먼저 보이게 합니다.",
            query: "여성 메탈 가죽 시계",
            tags: ["시계", "손목", "포인트"],
          },
          {
            id: "bracelet" as const,
            label: "팔찌",
            description:
              "은은한 체인이나 뱅글로 손목에 작은 반짝임만 더합니다.",
            query: "여성 얇은 팔찌 뱅글",
            tags: ["팔찌", "레이어드", "은은함"],
          },
          {
            id: "necklace" as const,
            label: "목걸이",
            description:
              "목선과 얼굴 주변을 정돈하도록 짧은 체인이나 작은 펜던트를 추천합니다.",
            query: "여성 데일리 목걸이 펜던트",
            tags: ["목걸이", "목선", "펜던트"],
          },
          {
            id: "earrings" as const,
            label: "귀걸이",
            description:
              "옆머리 사이로 작게 보이는 이어링이 얼굴 주변 포인트를 만듭니다.",
            query: "여성 미니 이어링 귀걸이",
            tags: ["귀걸이", "얼굴 주변", "포인트"],
          },
          {
            id: "hat" as const,
            label: "모자",
            description:
              "헤어 볼륨을 누르지 않는 볼캡이나 버킷햇을 보조 아이템으로 봅니다.",
            query: "여성 볼캡 버킷햇",
            tags: ["모자", "캐주얼", "보조"],
          },
          {
            id: "sunglasses" as const,
            label: "선글라스",
            description:
              "광대와 눈매 라인을 부드럽게 보완하는 얇은 프레임을 우선합니다.",
            query: "여성 얇은 프레임 선글라스",
            tags: ["선글라스", "프레임", "휴일"],
          },
          {
            id: "earphones" as const,
            label: "이어폰",
            description:
              "옆머리와 귀 라인을 크게 가리지 않는 작은 이어버드가 깔끔합니다.",
            query: "무선 이어폰 이어버드",
            tags: ["이어폰", "미니멀", "일상"],
          },
          {
            id: "circle-lens" as const,
            label: "서클렌즈",
            description:
              "여성 메이크업 톤과 맞출 때만 자연 직경, 브라운·그레이 계열로 가볍게 봅니다.",
            query: "자연스러운 브라운 그레이 서클렌즈",
            tags: ["서클렌즈", "메이크업", "선택"],
          },
        ]
      : [
          {
            id: "top" as const,
            label: "상의",
            description:
              "헤어스타일의 정돈감에 맞춰 니트, 셔츠, 미니멀 티셔츠부터 검색합니다.",
            query: `남성 ${tone} 니트 셔츠`,
            tags: ["상의", tone, "데일리"],
          },
          {
            id: "bottom" as const,
            label: "하의",
            description:
              "상체 인상과 균형이 맞도록 슬랙스, 데님, 와이드 팬츠를 우선 비교합니다.",
            query: "남성 슬랙스 데님 팬츠",
            tags: ["하의", "실루엣", "밸런스"],
          },
          {
            id: "glasses" as const,
            label: "안경",
            description:
              "숏 퀴프나 리프처럼 이마가 보이는 스타일에는 선이 얇은 프레임이 잘 맞습니다.",
            query: "남성 얇은 프레임 안경",
            tags: ["안경", "프레임", "인상"],
          },
          {
            id: "shoes" as const,
            label: "신발",
            description:
              "깔끔한 헤어 인상에 맞춰 로퍼, 더비슈즈, 미니멀 스니커즈를 비교합니다.",
            query: "남성 로퍼 더비슈즈 스니커즈",
            tags: ["신발", "데일리", "균형"],
          },
          {
            id: "bag" as const,
            label: "가방",
            description:
              "미니멀 크로스백이나 토트백처럼 상체 라인을 복잡하게 만들지 않는 가방이 좋습니다.",
            query: "남성 미니멀 크로스백 토트백",
            tags: ["가방", "미니멀", "실용"],
          },
          {
            id: "watch" as const,
            label: "시계",
            description:
              "손목은 메탈·가죽 시계 하나로 정리하면 헤어의 단정함과 잘 맞습니다.",
            query: "남성 메탈 가죽 시계",
            tags: ["시계", "손목", "단정"],
          },
          {
            id: "bracelet" as const,
            label: "팔찌",
            description:
              "과한 장식보다 얇은 체인이나 가죽 팔찌로 작은 포인트만 더합니다.",
            query: "남성 얇은 팔찌 가죽",
            tags: ["팔찌", "포인트", "절제"],
          },
          {
            id: "hat" as const,
            label: "모자",
            description:
              "헤어 연출을 살릴 날에는 보조 아이템으로만 두고, 볼캡이나 비니를 가볍게 봅니다.",
            query: "남성 볼캡 비니",
            tags: ["모자", "캐주얼", "보조"],
          },
          {
            id: "sunglasses" as const,
            label: "선글라스",
            description:
              "눈썹과 이마 노출을 살리는 얇은 프레임 선글라스를 우선합니다.",
            query: "남성 얇은 프레임 선글라스",
            tags: ["선글라스", "휴일", "프레임"],
          },
          {
            id: "earphones" as const,
            label: "이어폰",
            description:
              "옆머리 라인을 가리지 않는 작은 무선 이어버드가 깔끔합니다.",
            query: "무선 이어폰 이어버드",
            tags: ["이어폰", "미니멀", "일상"],
          },
        ];

  return items.map((item) => ({
    ...item,
    href: buildNaverShoppingUrl(item.query),
  }));
}

function buildFullOutfitQuery(
  items: OutfitRecommendation[],
  style: DisplayRecommendation,
) {
  return [
    `${style.name}에 어울리는 전신 코디`,
    ...items.slice(0, 8).map((item) => `${item.label} ${item.query}`),
  ].join(" / ");
}

function buildNaverShoppingUrl(query: string) {
  return `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(query)}`;
}

function appendStylePayload(
  formData: FormData,
  style: DisplayRecommendation,
  hairColorId: string,
  styleMemo: string,
  consultingFocusIds: ConsultingFocusId[],
  recommendationMode: RecommendationModeId,
  premiumAddOnIds: PremiumAddOnId[],
  audience: MirilookAudience,
  region: MirilookRegionId = defaultRegion,
  celebrityReferenceGroups: CelebrityReferenceGroup[] = [],
) {
  formData.append("styleId", style.id);
  formData.append("hairColorId", hairColorId);

  if (style.isCelebrityReference || isCelebrityReferenceStyleId(style.id)) {
    formData.append("customStyleName", style.name);
    formData.append("customStylePrompt", style.prompt);
    formData.append("customStylePreviewPrompt", style.previewPrompt);
    formData.append("customStyleReason", style.reason);
    getCelebrityReferencePhotosForStyle(style, celebrityReferenceGroups)
      .forEach((reference) => {
        formData.append("celebrityReferences", reference.file);
      });
  }

  appendStyleMemoPayload(
    formData,
    styleMemo,
    consultingFocusIds,
    recommendationMode,
    premiumAddOnIds,
    audience,
    region,
  );
}

function getOrderedCelebrityReferencesForStyle(
  style: DisplayRecommendation,
  references: CelebrityReferencePhoto[],
) {
  const cappedReferences = references.slice(0, maxCelebrityReferenceCount);
  const primaryReference =
    cappedReferences.find((reference) => reference.id === style.celebrityReferenceId) ??
    cappedReferences[style.celebrityReferenceIndex ?? 0] ??
    cappedReferences[0];

  if (!primaryReference) {
    return [];
  }

  return [
    primaryReference,
    ...cappedReferences.filter((reference) => reference.id !== primaryReference.id),
  ];
}

function getCelebrityReferencePhotosForStyle(
  style: DisplayRecommendation,
  groups: CelebrityReferenceGroup[],
) {
  const cappedGroups = groups
    .filter((group) => group.photos.length)
    .slice(0, maxCelebrityReferenceCount);
  const targetGroup =
    cappedGroups.find((group) => group.id === style.celebrityReferenceGroupId) ??
    cappedGroups[style.celebrityReferenceIndex ?? 0] ??
    cappedGroups[0];

  if (!targetGroup) {
    return [];
  }

  return getOrderedCelebrityReferencesForStyle(
    style,
    targetGroup.photos.slice(0, maxCelebrityReferencePhotosPerGroup),
  );
}

function appendStyleMemoPayload(
  formData: FormData,
  styleMemo: string,
  consultingFocusIds: ConsultingFocusId[] = [],
  recommendationMode: RecommendationModeId = "current-length",
  premiumAddOnIds: PremiumAddOnId[] = [],
  audience: MirilookAudience = defaultAudience,
  region: MirilookRegionId = defaultRegion,
) {
  const allowedAddOnIds = getAllowedPremiumAddOnIds(premiumAddOnIds, audience);
  const memo = buildConsultingMemo(
    styleMemo,
    consultingFocusIds,
    recommendationMode,
    allowedAddOnIds,
    audience,
    region,
  );

  formData.append("recommendationMode", recommendationMode);

  if (allowedAddOnIds.length) {
    formData.append("premiumAddOns", JSON.stringify(allowedAddOnIds));
  }

  if (memo) {
    formData.append("styleMemo", memo);
  }
}

function createRecommendationRequestId() {
  const randomPart =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return `rec_${randomPart.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80)}`;
}

function buildRecommendationSet(
  autoRecommendations: MirilookStyle[],
  preferredStyleIds: string[],
  hairColor: HairColorChoice,
  styleMemo = "",
  audience: MirilookAudience,
  consultingFocusIds: ConsultingFocusId[] = [],
  region: MirilookRegionId = defaultRegion,
  recommendationMode: RecommendationModeId = "current-length",
  premiumAddOnIds: PremiumAddOnId[] = [],
  currentHairLength: MirilookHairLength = "unknown",
) {
  const fullCandidateCatalog = getStylesByAudience(audience);
  const filteredCandidateCatalog = filterStylesByCurrentHairLength(
    fullCandidateCatalog,
    currentHairLength,
    recommendationMode === "current-length",
  );
  const candidateCatalog = filteredCandidateCatalog.length
    ? filteredCandidateCatalog
    : fullCandidateCatalog;
  const candidateMap = new Map(
    candidateCatalog.map((style) => [style.id, style]),
  );
  const selectedStyles = preferredStyleIds
    .map((styleId) => candidateMap.get(styleId))
    .filter((style): style is MirilookStyle => Boolean(style));
  const filteredAutoRecommendations = autoRecommendations.filter((style) =>
    candidateMap.has(style.id),
  );
  const regionalStyles = getRegionPriorityStyleIds(region, audience)
    .map((styleId) => candidateMap.get(styleId))
    .filter((style): style is MirilookStyle => Boolean(style));
  const merged: MirilookStyle[] = [];
  const seen = new Set<string>();

  for (const style of [
    ...selectedStyles,
    ...filteredAutoRecommendations,
    ...regionalStyles,
    ...candidateCatalog,
  ]) {
    if (seen.has(style.id)) {
      continue;
    }

    seen.add(style.id);
    merged.push(style);

    if (merged.length === 9) {
      break;
    }
  }

  return merged.map((style) =>
    applyHairColor(
      style,
      hairColor,
      styleMemo,
      consultingFocusIds,
      audience,
      region,
      recommendationMode,
      premiumAddOnIds,
    ),
  );
}

function applyCelebrityReferenceRecommendation(
  recommendations: DisplayRecommendation[],
  groups: CelebrityReferenceGroup[],
  hairColor: HairColorChoice,
  styleMemo = "",
  consultingFocusIds: ConsultingFocusId[] = [],
  audience: MirilookAudience = defaultAudience,
  region: MirilookRegionId = defaultRegion,
  recommendationMode: RecommendationModeId = "current-length",
  premiumAddOnIds: PremiumAddOnId[] = [],
) {
  if (!groups.length) {
    return recommendations.slice(0, 9);
  }

  const cappedGroups = groups
    .filter((group) => group.photos.length)
    .slice(0, maxCelebrityReferenceCount);

  if (!cappedGroups.length) {
    return recommendations.slice(0, 9);
  }

  const regularRecommendationCount = Math.max(0, 9 - cappedGroups.length);
  const regularRecommendations = recommendations
    .filter((style) => !isCelebrityReferenceStyleId(style.id))
    .slice(0, regularRecommendationCount);
  const celebrityRecommendations = cappedGroups.map((group, index) => {
    const reference = group.photos[0];
    const celebrityStyle = applyHairColor(
      buildCelebrityReferenceStyle(audience, group, index, cappedGroups.length),
      hairColor,
      styleMemo,
      consultingFocusIds,
      audience,
      region,
      recommendationMode,
      premiumAddOnIds,
    );

    return {
      ...celebrityStyle,
      celebrityReferenceGroupId: group.id,
      celebrityReferenceGroupLabel: group.label,
      celebrityReferenceId: reference.id,
      celebrityReferenceIndex: index,
      celebrityReferencePhotoCount: group.photos.length,
      celebrityReferenceTotal: cappedGroups.length,
      id: getCelebrityReferenceStyleId(index),
      isCelebrityReference: true,
    } satisfies DisplayRecommendation;
  });

  return [...regularRecommendations, ...celebrityRecommendations].slice(0, 9);
}

function getCelebrityReferenceStyleId(index: number) {
  return `${celebrityReferenceStyleId}-${index + 1}`;
}

function isCelebrityReferenceStyleId(styleId: string) {
  return (
    styleId === celebrityReferenceStyleId ||
    styleId.startsWith(`${celebrityReferenceStyleId}-`)
  );
}

function buildCelebrityReferenceStyle(
  audience: MirilookAudience,
  group: CelebrityReferenceGroup,
  referenceIndex: number,
  groupCount: number,
): MirilookStyle {
  const genderLabel = audience === "female" ? "여성" : "남성";
  const reference = group.photos[0];
  const photoCount = group.photos.length;
  const referenceTitle = reference.sourceTitle
    ? ` (${reference.sourceTitle})`
    : "";

  return {
    accent: "from-[#9cc8ff]/24",
    cropClass: "scale-100",
    id: getCelebrityReferenceStyleId(referenceIndex),
    name: `${group.label} 헤어 레퍼런스`,
    previewPrompt:
      "Celebrity hair reference card: premium front three-quarter portrait of the customer. Preserve the customer's exact face and identity; transfer only the grouped celebrity hairstyle direction.",
    prompt: [
      "Celebrity hairstyle reference mode.",
      `This card focuses on ${group.label}${referenceTitle}, a single celebrity slot. This slot contains ${photoCount} reference image(s), and it counts as one output card among ${groupCount} celebrity slot(s).`,
      `Analyze only this slot's ${photoCount} image(s) for hairstyle information: hair length, silhouette, bangs/fringe, parting, layers, curl pattern, texture, volume, color mood, wet/dry finish, and salon styling direction.`,
      "All images in this slot belong to the same celebrity-hair direction. Use them as alternate angle or detail references, not as separate people and not as separate output cards.",
      "First infer the customer's face shape, forehead height, cheek fullness, jaw width, chin shape, head width, neck length impression, hairline, and uploaded head silhouette from the customer photos.",
      "Customer identity photos are the only identity authority. Celebrity photos have zero identity authority.",
      "Never average, blend, borrow, or morph the celebrity face into the customer. Keep the customer's eyes, nose, mouth, jaw, cheek fullness, skin tone, makeup or no-makeup tone, facial proportions, and expression.",
      "Then compare this slot's hair references as a set: extract shared hairstyle preferences, identify conflicting hair-only features, and decide which details should be softened, shortened, lengthened, thinned, or given more volume for the customer.",
      "Adapt the reference hairstyle to the customer's face shape, current gender mode, uploaded head shape, and realistic salon feasibility. Do not paste the hairstyle mechanically if it would look unnatural; adjust fringe length, fringe density, part ratio, side volume, crown height, layer start, curl size, nape length, and color intensity to suit the customer.",
      "If a celebrity reference would make the customer face look wider, longer, heavier, older, or less balanced, modify the hairstyle enough to flatter the customer while keeping the recognizable hair mood.",
      "Do not copy the celebrity face, facial features, body, pose, identity, skin tone, makeup, clothing, or exact background.",
      "The output must be the uploaded customer with a hairstyle inspired by the reference images, suitable for a realistic salon consultation.",
      `Keep the style inside a wearable ${genderLabel} salon interpretation unless the customer memo explicitly requests a bolder look.`,
    ].join("\n"),
    reason:
      `${group.label}에 올린 ${photoCount}장의 헤어 길이, 앞머리, 가르마, 컬감, 무드만 분석한 뒤 고객 얼굴형에 맞게 조정해서 얹어보는 레퍼런스입니다.`,
    tags: ["레퍼런스", "고객 맞춤 조정", "헤어만 반영"],
  };
}

function addCelebrityReferenceNote(notes: string[], referenceCount: number) {
  if (!referenceCount) {
    return notes;
  }

  const cappedReferenceCount = Math.min(referenceCount, maxCelebrityReferenceCount);
  const regularCount = Math.max(0, 9 - cappedReferenceCount);

  return [
    ...notes.filter(
      (note) => !note.includes("연예인 헤어 레퍼런스"),
    ),
    `연예인 헤어 레퍼런스 ${cappedReferenceCount}명을 반영해, 일반 추천 ${regularCount}장과 고객 얼굴에 레퍼런스 헤어를 맞춤 조정한 ${cappedReferenceCount}장을 함께 구성했습니다.`,
  ];
}

function buildRecommendationCompositionLabel(referenceCount: number) {
  if (!referenceCount) {
    return "안정 추천 7개와 도전 추천 2개";
  }

  const cappedReferenceCount = Math.min(referenceCount, maxCelebrityReferenceCount);
  const regularCount = Math.max(0, 9 - cappedReferenceCount);

  return `일반 추천 ${regularCount}개와 연예인 레퍼런스 추천 ${cappedReferenceCount}개`;
}

function applyHairColor(
  style: MirilookStyle,
  hairColor: HairColorChoice,
  styleMemo = "",
  consultingFocusIds: ConsultingFocusId[] = [],
  audience: MirilookAudience = defaultAudience,
  region: MirilookRegionId = defaultRegion,
  recommendationMode: RecommendationModeId = "current-length",
  premiumAddOnIds: PremiumAddOnId[] = [],
) {
  const consultingMemo = buildConsultingMemo(
    styleMemo,
    consultingFocusIds,
    recommendationMode,
    premiumAddOnIds,
    audience,
    region,
  );
  const allowedAddOnIds = getAllowedPremiumAddOnIds(premiumAddOnIds, audience);

  return {
    ...style,
    salonProcess:
      style.salonProcess ??
      buildDefaultSalonProcess(style, hairColor, recommendationMode),
    maintenanceAdvice:
      style.maintenanceAdvice ??
      buildDefaultMaintenanceAdvice(style, hairColor, recommendationMode),
    outfitAdvice: allowedAddOnIds.includes("outfit-coordination")
      ? style.outfitAdvice ?? buildDefaultOutfitAdvice(style, hairColor, audience)
      : undefined,
    makeupAdvice:
      allowedAddOnIds.includes("makeup-style") && audience === "female"
        ? style.makeupAdvice ?? buildDefaultMakeupAdvice(style, hairColor)
        : undefined,
    prompt: consultingMemo
      ? `${style.prompt}\nHair color instruction: ${hairColor.prompt}\nCustomer request memo: ${consultingMemo}`
      : `${style.prompt}\nHair color instruction: ${hairColor.prompt}`,
    tags: [...style.tags.slice(0, 2), hairColor.name],
  };
}

function buildDefaultSalonProcess(
  style: MirilookStyle,
  hairColor: HairColorChoice,
  recommendationMode: RecommendationModeId,
) {
  const colorStep =
    hairColor.id === "natural-black"
      ? ""
      : ` ${hairColor.name} 톤은 염색 전 모발 손상도와 기존 컬러를 확인해 진행합니다.`;
  const modeStep =
    recommendationMode === "face-fit"
      ? "현재 기장과 다르면 기장 성장 또는 전환 컷이 필요할 수 있습니다."
      : "현재 기장에서 가능한 범위의 컷, 질감 정리, 볼륨 조절을 우선합니다.";

  return `${style.name}은 상담 시 앞머리, 옆 라인, 뒷머리 실루엣을 먼저 맞추고 필요한 경우 펌이나 다운펌을 더합니다. ${modeStep}${colorStep}`.slice(
    0,
    180,
  );
}

function buildDefaultMaintenanceAdvice(
  style: MirilookStyle,
  hairColor: HairColorChoice,
  recommendationMode: RecommendationModeId,
) {
  const colorNote =
    hairColor.id === "natural-black"
      ? ""
      : " 컬러 유지용 샴푸와 열 손상 관리가 필요합니다.";
  const modeNote =
    recommendationMode === "face-fit"
      ? "길이를 바꾸는 과정에서는 중간 단계 스타일을 함께 상담하세요."
      : "첫 시술 후 3~6주 단위로 라인과 볼륨을 점검하면 좋습니다.";

  return `${style.tags.slice(0, 2).join(", ")} 포인트가 무너지지 않도록 말릴 때 뿌리 방향과 옆 볼륨을 관리해 주세요. ${modeNote}${colorNote}`.slice(
    0,
    180,
  );
}

function buildDefaultOutfitAdvice(
  style: MirilookStyle,
  hairColor: HairColorChoice,
  audience: MirilookAudience,
) {
  const base =
    audience === "female"
      ? "상체 가까운 컬러와 소재를 헤어 무드에 맞추면 얼굴 주변 인상이 더 정돈됩니다."
      : "아우터와 상의 핏을 헤어 실루엣에 맞추면 전체 인상이 더 깔끔해집니다.";

  return `${style.name}에는 ${hairColor.name} 톤과 어울리는 뉴트럴 컬러, 단정한 상의, 과하지 않은 액세서리를 추천합니다. ${base}`.slice(
    0,
    180,
  );
}

function buildDefaultMakeupAdvice(
  style: MirilookStyle,
  hairColor: HairColorChoice,
) {
  return `${style.name}에는 ${hairColor.name} 헤어 톤과 맞는 깨끗한 베이스, 자연스러운 브로우, 과하지 않은 립 포인트를 맞추면 헤어 라인이 더 부드럽게 보입니다.`.slice(
    0,
    180,
  );
}

function buildConsultingMemo(
  styleMemo: string,
  consultingFocusIds: ConsultingFocusId[],
  recommendationMode: RecommendationModeId,
  premiumAddOnIds: PremiumAddOnId[],
  audience: MirilookAudience,
  region: MirilookRegionId = defaultRegion,
) {
  const trimmedMemo = styleMemo.trim();
  const focusOptions = consultingFocusOptions.filter((option) =>
    consultingFocusIds.includes(option.id),
  );
  const recommendationModeOption =
    recommendationModeOptions.find((option) => option.id === recommendationMode) ??
    recommendationModeOptions[0];
  const addOnOptions = getAllowedPremiumAddOns(premiumAddOnIds, audience);
  const regionProfile = getRegionProfile(region);
  const audienceNote =
    audience === "female"
      ? "Women-specific consulting: consider face-framing, hair length feasibility, curl size, bangs, makeup harmony, outfit mood, personal color, and salon maintenance."
      : "Men-specific consulting: consider forehead exposure, side volume, parting, down-perm need, grooming maintenance, outfit mood, and personal color.";
  const lines = [
    `Market region: ${regionProfile.englishLabel}. ${regionProfile.prompt}`,
    recommendationModeOption.prompt,
    trimmedMemo ? `Customer memo: ${trimmedMemo}` : "",
    focusOptions.length
      ? `Consulting focus: ${focusOptions
          .map((option) => option.label)
          .join(", ")}.`
      : "",
    focusOptions.length ? audienceNote : "",
    ...focusOptions.map((option) => option.prompt),
    addOnOptions.length
      ? `Premium add-ons: ${addOnOptions.map((option) => option.label).join(", ")}. Apply them as consultation copy and recommendation criteria. Preserve the uploaded person's face, body impression, clothing identity, and makeup/no-makeup baseline in generated images unless the user explicitly asks for a visual makeover.`
      : "",
    ...addOnOptions.map((option) => option.prompt),
  ].filter(Boolean);

  return lines.join("\n").slice(0, 1400);
}

function getConsultingFocusLabels(
  consultingFocusIds: ConsultingFocusId[],
  recommendationMode: RecommendationModeId,
  premiumAddOnIds: PremiumAddOnId[],
  audience: MirilookAudience,
) {
  const baseLabels = consultingFocusOptions
    .filter((option) => consultingFocusIds.includes(option.id))
    .map((option) => option.label);
  const modeLabel = getRecommendationModeLabel(recommendationMode);
  const addOnLabels = getAllowedPremiumAddOns(premiumAddOnIds, audience).map(
    (option) => option.label,
  );

  return [modeLabel, ...baseLabels, ...addOnLabels];
}

function getRecommendationModeLabel(mode: RecommendationModeId) {
  return (
    recommendationModeOptions.find((option) => option.id === mode)?.label ??
    recommendationModeOptions[0].label
  );
}

function getAllowedPremiumAddOns(
  addOnIds: PremiumAddOnId[],
  audience: MirilookAudience,
) {
  return premiumAddOnOptions.filter(
    (option) =>
      addOnIds.includes(option.id) &&
      (option.audience === "all" || option.audience === audience),
  );
}

function getAllowedPremiumAddOnIds(
  addOnIds: PremiumAddOnId[],
  audience: MirilookAudience,
) {
  return getAllowedPremiumAddOns(addOnIds, audience).map((option) => option.id);
}

function appendPhotoPayload(
  formData: FormData,
  photos: PreparedPhotos,
  audience: MirilookAudience,
  region: MirilookRegionId = defaultRegion,
) {
  formData.append("front", photos.front.file);
  formData.append("side", photos.side.file);
  formData.append("audience", audience);
  formData.append("region", region);
  formData.append(
    "photoContext",
    JSON.stringify({
      hasActualFront: photos.frontSlot === "front",
      primaryReferenceSlot: photos.frontSlot,
      secondaryReferenceSlot: photos.sideSlot,
      uploadedSlots: photos.uploadedSlots,
    }),
  );

  if (photos.leftSide) {
    formData.append("leftSide", photos.leftSide.file);
  }

  if (photos.rightSide) {
    formData.append("rightSide", photos.rightSide.file);
  }

  formData.append("uploadedCount", String(photos.uploadedCount));
}

function getPreparedPhotos(
  photos: Record<PhotoSlot, UploadedPhoto | null>,
): PreparedPhotos | null {
  const uploadedEntries = photoSlotConfig
    .map(({ slot }) => ({ photo: photos[slot], slot }))
    .filter(
      (entry): entry is { photo: UploadedPhoto; slot: PhotoSlot } =>
        Boolean(entry.photo),
    );

  if (uploadedEntries.length < 2) {
    return null;
  }

  const frontEntry =
    uploadedEntries.find((entry) => entry.slot === "front") ?? uploadedEntries[0];
  const sideEntry =
    uploadedEntries.find(
      (entry) => entry.slot === "left" && entry.photo !== frontEntry.photo,
    ) ??
    uploadedEntries.find(
      (entry) => entry.slot === "right" && entry.photo !== frontEntry.photo,
    ) ??
    uploadedEntries.find((entry) => entry.photo !== frontEntry.photo);

  if (!sideEntry) {
    return null;
  }

  return {
    front: frontEntry.photo,
    frontSlot: frontEntry.slot,
    side: sideEntry.photo,
    sideSlot: sideEntry.slot,
    leftSide: photos.left ?? undefined,
    rightSide: photos.right ?? undefined,
    uploadedCount: uploadedEntries.length,
    uploadedSlots: uploadedEntries.map((entry) => entry.slot),
  };
}

async function buildSourceHistoryPhotos(
  photos: Record<PhotoSlot, UploadedPhoto | null>,
): Promise<HistoryImageItem[]> {
  const images: HistoryImageItem[] = [];

  for (const { label, slot } of photoSlotConfig) {
    const photo = photos[slot];

    if (photo) {
      images.push({
        imageUrl: await fileToDataUrl(photo.file),
        label: `${label} 원본`,
        slot,
      });
    }
  }

  return images;
}

async function buildRecommendationHistoryImages(
  recommendations: DisplayRecommendation[],
  photos: Record<PhotoSlot, UploadedPhoto | null>,
): Promise<HistoryImageItem[]> {
  const images: HistoryImageItem[] = [];

  for (const [index, style] of recommendations.slice(0, 9).entries()) {
    const imageUrl = await resolvePersistentHistoryImageUrl(style.imageUrl, photos);

    if (!imageUrl) {
      continue;
    }

    const historyImage: HistoryImageItem = {
      imageUrl,
      label: `${index + 1}. ${style.name}`,
      styleName: style.name,
    };

    if (style.reason) {
      historyImage.reason = style.reason;
    }

    if (style.tags?.length) {
      historyImage.tags = style.tags;
    }

    images.push(historyImage);
  }

  return images;
}

function buildOutfitHistoryImages(
  fullBody: OutfitFullBodyState,
  recommendations: OutfitRecommendation[],
): HistoryImageItem[] {
  const images: HistoryImageItem[] = [];

  if (fullBody.imageUrl) {
    images.push({
      imageUrl: fullBody.imageUrl,
      label: "전신 코디",
      styleName: "전신 코디 추천",
    });
  }

  recommendations.forEach((item) => {
    if (!item.imageUrl) {
      return;
    }

    images.push({
      imageUrl: item.imageUrl,
      label: item.label,
      reason: item.description,
      styleName: item.label,
      tags: item.tags,
    });
  });

  return images;
}

function buildMakeupHistoryImages(
  preview: MakeupPreviewState,
): HistoryImageItem[] {
  if (!preview.imageUrl) {
    return [];
  }

  return [
    {
      imageUrl: preview.imageUrl,
      label: "메이크업 스타일",
      styleName: "메이크업 추천",
    },
  ];
}

async function resolvePersistentHistoryImageUrl(
  imageUrl: string | undefined,
  photos: Record<PhotoSlot, UploadedPhoto | null>,
): Promise<string> {
  if (!imageUrl) {
    return "";
  }

  if (!imageUrl.startsWith("blob:")) {
    return imageUrl;
  }

  const sourcePhoto = Object.values(photos).find((photo) => photo?.url === imageUrl);

  return sourcePhoto ? fileToDataUrl(sourcePhoto.file) : "";
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(typeof reader.result === "string" ? reader.result : "");
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  handler: (item: T) => Promise<void>,
) {
  const queue = [...items];
  const workers = Array.from(
    { length: Math.min(limit, queue.length) },
    async () => {
      while (queue.length) {
        const item = queue.shift();

        if (item !== undefined) {
          await handler(item);
        }
      }
    },
  );

  await Promise.all(workers);
}

async function postFormWithRetry<T>(
  url: string,
  formData: FormData,
  headers?: HeadersInit,
) {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= imageRequestRetryCount; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: "POST",
        body: formData,
        headers,
      });

      if (response.ok) {
        return (await response.json()) as T;
      }

      const message = await readApiError(response);
      const error = new Error(message);

      if (!isRetriableImageError(response.status, message)) {
        throw error;
      }

      lastError = error;
    } catch (error) {
      const nextError =
        error instanceof Error ? error : new Error(String(error));

      if (!isRetriableImageError(undefined, nextError.message)) {
        throw nextError;
      }

      lastError = nextError;
    }

    if (attempt < imageRequestRetryCount) {
      await wait(900 + attempt * 1400);
    }
  }

  throw lastError ?? new Error("Image request failed.");
}

function isRetriableImageError(status: number | undefined, message: string) {
  return (
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    /rate limit|timeout|timed out|temporarily|overloaded|socket|network|failed to fetch/i.test(
      message,
    )
  );
}

function shouldAutoRetryGeneration(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  return !isNonRetryableGenerationError(message);
}

function isNonRetryableGenerationError(message: string) {
  return /\b400\b|401|403|413|payload too large|request entity too large|not_authenticated|로그인|hair money|402|insufficient_hair_money|부족|quota|billing|credit|insufficient_quota|payment|model|access|permission|organization|api key|configured|invalid|required|unsupported/i.test(
    message,
  );
}

function wait(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

// Time-based progress that paces against the MEASURED average render time so the
// bar climbs smoothly the whole way instead of stalling at a fixed cap. It eases
// asymptotically: ~86% at expectedMs, then keeps creeping toward 99% (never
// frozen). The caller snaps to 100% the moment the image actually lands.
function easedTimedProgress(elapsedMs: number, expectedMs: number) {
  const tau = Math.max(expectedMs, 1000) / 2; // at t=expectedMs → 1 - e^-2 ≈ 0.865
  const eased = 1 - Math.exp(-Math.max(elapsedMs, 0) / tau);

  return Math.min(99, eased * 100);
}

function startProgressTicker({
  expectedMs = 35000,
  getActive,
  onProgress,
}: {
  expectedMs?: number;
  getActive: () => boolean;
  onProgress: (progress: number) => void;
}) {
  const startedAt = Date.now();
  let lastProgress = 0;

  onProgress(0);

  const timer = window.setInterval(() => {
    if (!getActive()) {
      window.clearInterval(timer);
      return;
    }

    const nextProgress = Math.max(
      lastProgress,
      Math.round(easedTimedProgress(Date.now() - startedAt, expectedMs)),
    );

    if (nextProgress !== lastProgress) {
      lastProgress = nextProgress;
      onProgress(nextProgress);
    }
  }, 400);

  return (finalProgress?: number) => {
    window.clearInterval(timer);

    if (typeof finalProgress === "number") {
      onProgress(clampGenerationProgress(finalProgress));
    }
  };
}

function clampGenerationProgress(progress: number) {
  return Math.max(0, Math.min(100, Math.round(progress)));
}

function getVisibleGenerationProgress({
  hasImage,
  isGenerating,
  progress,
}: {
  hasImage: boolean;
  isGenerating?: boolean;
  progress?: number;
}) {
  if (hasImage) {
    return 100;
  }

  if (typeof progress === "number") {
    return clampGenerationProgress(progress);
  }

  return isGenerating ? 0 : undefined;
}

async function readApiError(response: Response) {
  const text = await response.text();

  try {
    const payload = JSON.parse(text) as {
      balance?: number;
      cost?: number;
      error?: string;
      reason?: string;
    };
    const details = [
      payload.reason ? `reason=${payload.reason}` : "",
      typeof payload.balance === "number" ? `balance=${payload.balance}` : "",
      typeof payload.cost === "number" ? `cost=${payload.cost}` : "",
    ]
      .filter(Boolean)
      .join(" ");

    return `${response.status}: ${payload.error ?? text}${details ? ` (${details})` : ""}`;
  } catch {
    return `${response.status}: ${text || response.statusText}`;
  }
}

function getGenerationFailureMessage(error: unknown, isRender = false) {
  const message = error instanceof Error ? error.message : String(error);

  if (/429|rate limit|too many requests|요청이 너무/i.test(message)) {
    return "짧은 시간에 요청이 많아 일부 이미지가 생성되지 못했습니다. 잠시 후 다시 시도해 주세요.";
  }

  if (/413|payload too large|request entity too large/i.test(message)) {
    return "사진 용량이 커서 서버가 요청을 받지 못했습니다. 사진을 다시 업로드하면 자동 압축 후 재시도합니다.";
  }

  if (/timeout|timed out|504/i.test(message)) {
    return "이미지 생성 시간이 길어 일부 결과가 실패했습니다. 생성 단위를 나누어 다시 시도합니다.";
  }

  if (/quota|billing|credit|insufficient_quota|payment/i.test(message)) {
    return "AI 생성 크레딧 또는 결제 설정이 필요합니다. 연결한 provider의 결제/쿼터를 확인해 주세요.";
  }

  if (/401|not_authenticated|로그인/i.test(message)) {
    return "로그인 세션이 만료되어 추천을 시작하지 못했습니다. 다시 로그인한 뒤 내 사진 불러오기를 눌러 진행해 주세요.";
  }

  if (/hair money|402|insufficient_hair_money|부족|스토어/i.test(message)) {
    return "Hair Money가 부족하거나 로그인 결제 연결이 필요합니다. 스토어에서 충전한 뒤 다시 추천을 요청해 주세요.";
  }

  if (/model|access|permission|organization|api key|configured/i.test(message)) {
    return "AI 모델 접근 권한, API 키 또는 프로젝트 설정을 확인해야 합니다. 연결한 provider의 이미지 모델 사용 가능 여부를 확인해 주세요.";
  }

  return isRender
    ? "9장 실제 생성에 실패했습니다. 서버 로그를 확인해 주세요."
    : "실제 AI 생성에 실패했습니다. 서버 API 키와 배포 설정을 확인해 주세요.";
}

function getShortGenerationError(message: string) {
  if (/413|payload too large|request entity too large/i.test(message)) {
    return "요청 이미지 용량 초과";
  }

  if (/401|not_authenticated|로그인/i.test(message)) {
    return "로그인 세션 확인 필요";
  }

  if (/hair money|402|insufficient_hair_money|부족/i.test(message)) {
    return "Hair Money 확인 필요";
  }

  if (/quota|billing|credit|insufficient_quota|payment/i.test(message)) {
    return "AI 크레딧 확인 필요";
  }

  if (/model|access|permission|organization|api key|configured/i.test(message)) {
    return "AI 모델 설정 확인 필요";
  }

  if (/timeout|timed out|504/i.test(message)) {
    return "생성 시간 초과";
  }

  return "레퍼런스 합성 요청 실패";
}

function createMockResults(
  style: DisplayRecommendation,
  frontPhoto: UploadedPhoto,
  sidePhoto: UploadedPhoto,
) {
  return resultAngles.map((angle) => {
    const sourcePhoto = angle.source === "front" ? frontPhoto : sidePhoto;

    return {
      label: angle.label,
      imageUrl: sourcePhoto.url,
      className: `${angle.className} ${style.cropClass}`,
    };
  });
}

async function loadConsultationHistory() {
  const ownerId = await getSupabaseHistoryOwnerId();
  const db = await openHistoryDb();

  try {
    return await new Promise<ConsultationHistoryItem[]>((resolve, reject) => {
      const transaction = db.transaction(historyStoreName, "readonly");
      const request = transaction.objectStore(historyStoreName).getAll();

      request.onsuccess = () => {
        const items = (request.result as ConsultationHistoryItem[])
          .filter((item) => belongsToHistoryOwner(item, ownerId))
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          );

        resolve(items.slice(0, historyLimit));
      };
      request.onerror = () => reject(request.error);
      transaction.onerror = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}

async function saveConsultationHistoryItem(item: ConsultationHistoryItem) {
  const ownerId = await getSupabaseHistoryOwnerId();
  const itemWithOwner = {
    ...item,
    ownerId,
  };
  const db = await openHistoryDb();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(historyStoreName, "readwrite");
      const store = transaction.objectStore(historyStoreName);

      const putRequest = store.put(itemWithOwner);

      putRequest.onerror = () => reject(putRequest.error);
      putRequest.onsuccess = () => {
        const getAllRequest = store.getAll();

        getAllRequest.onerror = () => reject(getAllRequest.error);
        getAllRequest.onsuccess = () => {
          const items = (getAllRequest.result as ConsultationHistoryItem[])
            .filter((entry) => belongsToHistoryOwner(entry, ownerId))
            .sort(
              (a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
            );
          const excessItems = items.slice(historyLimit);

          excessItems.forEach((oldItem) => store.delete(oldItem.id));
        };
      };
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}

async function saveConsultationHistoryToServer(
  item: ConsultationHistoryItem,
): Promise<ServerSaveResult> {
  try {
    const headers = await buildJsonHeadersWithAuth();
    const response = await fetch(`${apiBaseUrl}/api/consultations/`, {
      body: JSON.stringify(item),
      headers,
      method: "POST",
    });

    if (!response.ok) {
      return {
        reason: `server_${response.status}`,
        saved: false,
      };
    }

    return (await response.json()) as ServerSaveResult;
  } catch (error) {
    console.error(error);

    return {
      reason: "network_error",
      saved: false,
    };
  }
}

function belongsToHistoryOwner(
  item: ConsultationHistoryItem,
  ownerId: string,
) {
  return (item.ownerId ?? "anonymous") === ownerId;
}

async function sendConsultationEmail(
  item: ConsultationHistoryItem,
  to: string,
): Promise<EmailSendResult> {
  const headers = await buildJsonHeadersWithAuth();
  const response = await fetch(`${apiBaseUrl}/api/consultations/email/`, {
    body: JSON.stringify({
      item,
      to,
    }),
    headers,
    method: "POST",
  });
  const result = (await response.json().catch(() => ({
    reason: `server_${response.status}`,
    sent: false,
  }))) as EmailSendResult & { error?: string };

  if (!response.ok) {
    const message = result.error ?? result.reason ?? `server_${response.status}`;

    if (response.status === 413 || /413/.test(message)) {
      throw new Error(
        "상담 이미지 용량이 커서 이메일로 보내지 못했습니다. PDF 저장 또는 개별 이미지 저장을 이용해 주세요.",
      );
    }

    if (response.status === 400 || /400/.test(message)) {
      throw new Error("이메일 주소 또는 상담 결과 데이터를 다시 확인해 주세요.");
    }

    return {
      reason: result.reason ?? `server_${response.status}`,
      sent: false,
    };
  }

  return result;
}

async function createConsultationShareLink(
  sessionId: string,
): Promise<ShareLinkResult> {
  const headers = await buildJsonHeadersWithAuth();
  const response = await fetch(`${apiBaseUrl}/api/consultations/share/`, {
    body: JSON.stringify({
      sessionId,
      ttlDays: 14,
    }),
    headers,
    method: "POST",
  });

  if (!response.ok) {
    const message = await readApiError(response);

    return {
      created: false,
      reason: message || `server_${response.status}`,
    };
  }

  return (await response.json()) as ShareLinkResult;
}

function buildHistorySaveMessage(
  styleName: string,
  serverResult: ServerSaveResult,
) {
  if (serverResult.saved) {
    return `${styleName} 결과가 브라우저와 서버 히스토리에 저장되었습니다.`;
  }

  if (serverResult.reason === "supabase_not_configured") {
    return `${styleName} 결과가 브라우저 히스토리에 저장되었습니다. Supabase 전용 프로젝트 연결 후 서버 저장이 활성화됩니다.`;
  }

  if (serverResult.reason === "not_authenticated") {
    return `${styleName} 결과가 이 브라우저에 저장되었습니다. 로그인하면 계정 히스토리와 서버 공유 링크를 사용할 수 있습니다.`;
  }

  return `${styleName} 결과가 브라우저 히스토리에 저장되었습니다. 서버 저장은 지연되어 다음 저장 때 다시 시도합니다.`;
}

function buildRecommendationHistorySaveMessage(serverResult: ServerSaveResult) {
  if (serverResult.saved) {
    return "추천 스타일 9장이 브라우저와 서버 히스토리에 자동 저장되었습니다.";
  }

  if (serverResult.reason === "supabase_not_configured") {
    return "추천 스타일 9장이 브라우저 히스토리에 자동 저장되었습니다. Supabase 전용 프로젝트 연결 후 서버 저장이 활성화됩니다.";
  }

  if (serverResult.reason === "not_authenticated") {
    return "추천 스타일 9장이 이 브라우저에 자동 저장되었습니다. 로그인하면 계정 히스토리와 서버 공유 링크를 사용할 수 있습니다.";
  }

  return "추천 스타일 9장이 브라우저 히스토리에 자동 저장되었습니다. 서버 저장은 지연되어 다음 저장 때 다시 시도합니다.";
}

function buildConsultationHistorySaveMessage(
  styleName: string,
  serverResult: ServerSaveResult,
) {
  if (serverResult.saved) {
    return `${styleName} 추천과 상담용 이미지가 브라우저와 서버 히스토리에 자동 저장되었습니다.`;
  }

  if (serverResult.reason === "supabase_not_configured") {
    return `${styleName} 추천과 상담용 이미지가 브라우저 히스토리에 자동 저장되었습니다. Supabase 전용 프로젝트 연결 후 서버 저장이 활성화됩니다.`;
  }

  if (serverResult.reason === "not_authenticated") {
    return `${styleName} 추천과 상담용 이미지가 이 브라우저에 자동 저장되었습니다. 로그인하면 계정 히스토리와 서버 공유 링크를 사용할 수 있습니다.`;
  }

  return `${styleName} 추천과 상담용 이미지가 브라우저 히스토리에 자동 저장되었습니다. 서버 저장은 지연되어 다음 저장 때 다시 시도합니다.`;
}

function buildStyleExpansionHistorySaveMessage(
  styleName: string,
  serverResult: ServerSaveResult,
  statusLabel: string,
) {
  if (serverResult.saved) {
    return `${styleName} ${statusLabel}가 브라우저와 서버 히스토리에 자동 저장되었습니다.`;
  }

  if (serverResult.reason === "supabase_not_configured") {
    return `${styleName} ${statusLabel}가 브라우저 히스토리에 자동 저장되었습니다. Supabase 전용 프로젝트 연결 후 서버 저장이 활성화됩니다.`;
  }

  if (serverResult.reason === "not_authenticated") {
    return `${styleName} ${statusLabel}가 이 브라우저에 자동 저장되었습니다. 로그인하면 계정 히스토리와 서버 공유 링크를 사용할 수 있습니다.`;
  }

  return `${styleName} ${statusLabel}가 브라우저 히스토리에 자동 저장되었습니다. 서버 저장은 지연되어 다음 저장 때 다시 시도합니다.`;
}

function collectRecommendationTags(recommendations: DisplayRecommendation[]) {
  return Array.from(
    new Set(recommendations.flatMap((style) => style.tags ?? [])),
  ).slice(0, 6);
}

function mergeHistoryItemForSave(
  previous: ConsultationHistoryItem | undefined,
  next: ConsultationHistoryItem,
): ConsultationHistoryItem {
  if (!previous) {
    return next;
  }

  const keepPreviousSelectedStyle = previous.images.length > 0 && !next.images.length;
  const merged: ConsultationHistoryItem = {
    ...previous,
    ...next,
    createdAt: previous.createdAt || next.createdAt,
    images: chooseRicherHistoryImages(previous.images, next.images),
    recommendationImages: chooseRicherHistoryImages(
      previous.recommendationImages ?? [],
      next.recommendationImages ?? [],
    ),
    makeupImages: chooseRicherHistoryImages(
      previous.makeupImages ?? [],
      next.makeupImages ?? [],
    ),
    outfitImages: chooseRicherHistoryImages(
      previous.outfitImages ?? [],
      next.outfitImages ?? [],
    ),
    sourcePhotoCount: Math.max(
      previous.sourcePhotoCount ?? 0,
      next.sourcePhotoCount ?? 0,
    ),
    sourcePhotos: chooseRicherHistoryImages(
      previous.sourcePhotos ?? [],
      next.sourcePhotos ?? [],
    ),
  };

  if (keepPreviousSelectedStyle) {
    merged.makeupAdvice = previous.makeupAdvice;
    merged.maintenanceAdvice = previous.maintenanceAdvice;
    merged.outfitAdvice = previous.outfitAdvice;
    merged.salonProcess = previous.salonProcess;
    merged.styleId = previous.styleId;
    merged.styleName = previous.styleName;
    merged.styleReason = previous.styleReason;
    merged.styleTags = previous.styleTags;
  }

  return merged;
}

function chooseRicherHistoryImages(
  previous: HistoryImageItem[],
  next: HistoryImageItem[],
) {
  return next.length >= previous.length ? next : previous;
}

function buildShareCreateMessage(result: ServerSaveResult | ShareLinkResult) {
  if (result.reason === "supabase_not_configured") {
    return "공유 링크는 Supabase 전용 프로젝트 연결 후 사용할 수 있습니다. 지금은 PDF 저장 또는 이메일 전송을 이용해 주세요.";
  }

  if (result.reason === "not_authenticated" || /not_authenticated/.test(result.reason ?? "")) {
    return "공유 링크는 로그인 후 사용할 수 있습니다. 지금은 PDF 저장 또는 이메일 전송을 이용해 주세요.";
  }

  if (result.reason === "session_not_found") {
    return "서버에 저장된 상담 결과를 찾지 못했습니다. 히스토리에 다시 저장한 뒤 공유 링크를 만들어 주세요.";
  }

  if (result.reason?.startsWith("server_")) {
    return "공유 링크 서버가 일시적으로 응답하지 않습니다. PDF 저장 또는 이메일 전송을 이용해 주세요.";
  }

  return "공유 링크를 만들지 못했습니다. PDF 저장 또는 이메일 전송을 이용해 주세요.";
}

function buildEmailSendMessage(result: EmailSendResult, recipient: string) {
  if (result.sent) {
    return result.shareUrl
      ? `상담 결과와 공유 링크를 ${recipient} 주소로 전송했습니다.`
      : `상담 결과를 ${recipient} 주소로 전송했습니다.`;
  }

  if (result.reason === "supabase_not_configured") {
    return "서버 저장소가 아직 연결되지 않아 이메일 공유 링크를 만들지 못했습니다. PDF 저장으로 먼저 공유해 주세요.";
  }

  if (result.reason === "resend_not_configured") {
    return "이메일 발송 키가 아직 연결되지 않았습니다. PDF 저장으로 먼저 공유해 주세요.";
  }

  if (result.reason === "resend_sender_not_configured") {
    return "이메일 발신자 주소가 아직 설정되지 않았습니다. 관리자 설정 후 다시 시도해 주세요.";
  }

  if (result.reason === "resend_sender_rejected") {
    return "이메일 발신 도메인이 인증되지 않았거나 발신자 주소가 거절되었습니다. 관리자 설정 후 다시 시도해 주세요.";
  }

  if (result.reason === "resend_recipient_rejected") {
    return "이메일 제공자가 수신 주소를 거절했습니다. 수신 이메일 주소를 확인해 주세요.";
  }

  if (result.reason === "not_authenticated") {
    return "이메일 전송은 로그인 후 사용할 수 있습니다. 로그인한 뒤 다시 시도해 주세요.";
  }

  if (result.reason === "not_owner") {
    return "다른 계정에 저장된 상담 결과는 이메일로 보낼 수 없습니다.";
  }

  if (result.reason === "supabase_lookup_failed") {
    return "상담 결과 소유권 확인이 지연되었습니다. 잠시 후 다시 시도해 주세요.";
  }

  if (result.reason === "resend_send_failed") {
    return "이메일 제공자에서 전송을 거절했습니다. 발신 도메인 또는 수신 주소를 확인해 주세요.";
  }

  return "이메일 전송이 지연되었습니다. PDF 저장 또는 개별 이미지 저장을 이용해 주세요.";
}

function buildEmailPreflightMessage(result: ServerSaveResult) {
  if (result.reason === "supabase_not_configured") {
    return "서버 저장소가 아직 연결되지 않아 이메일 공유 링크를 만들지 못했습니다. PDF 저장으로 먼저 공유해 주세요.";
  }

  if (result.reason === "not_authenticated") {
    return "이메일 전송은 로그인 후 사용할 수 있습니다. 로그인한 뒤 다시 시도해 주세요.";
  }

  return "상담 결과를 서버에 저장하지 못해 이메일 공유를 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.";
}

function isValidEmailAddress(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

async function buildJsonHeadersWithAuth() {
  const token = await getSupabaseAccessToken();

  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    "Content-Type": "application/json",
  };
}

async function buildAuthHeaders(): Promise<Record<string, string> | undefined> {
  const token = await getSupabaseAccessToken();

  return token ? { Authorization: `Bearer ${token}` } : undefined;
}

async function loadPaymentEntitlements(): Promise<PaymentEntitlementResult> {
  const headers = await buildJsonHeadersWithAuth();
  const response = await fetch(`${apiBaseUrl}/api/payments/entitlements/`, {
    headers,
    method: "GET",
  });
  const result = (await response.json().catch(() => ({
    entitlements: {},
    reason: `server_${response.status}`,
    synced: false,
  }))) as PaymentEntitlementResult;

  if (!response.ok) {
    return {
      entitlements: result.entitlements ?? {},
      reason: result.reason ?? `server_${response.status}`,
      synced: false,
    };
  }

  return result;
}

function buildPaymentEntitlementStatus(result: PaymentEntitlementResult) {
  const premium = result.entitlements?.premium_addons;

  if (premium?.active) {
    if (result.reason === "admin_test_account") {
      return "관리자 테스트 계정으로 프리미엄 확장 상담이 활성화되었습니다. 결제 없이 코디/메이크업 조언을 테스트할 수 있습니다.";
    }

    return premium.expiresAt
      ? `프리미엄 확장 상담이 활성화되었습니다. ${formatHistoryDate(premium.expiresAt)}까지 코디/메이크업 조언을 정식 권한으로 사용할 수 있습니다.`
      : "프리미엄 확장 상담이 활성화되었습니다. 코디/메이크업 조언을 정식 권한으로 사용할 수 있습니다.";
  }

  if (result.reason === "not_authenticated") {
    return "로그인 후 프리미엄 스타일 리포트를 결제하면 코디/메이크업 확장 상담 권한이 계정에 연결됩니다.";
  }

  if (result.reason === "supabase_not_configured") {
    return "Supabase 권한 저장소가 연결되면 결제한 프리미엄 확장 상담 권한을 자동으로 확인합니다.";
  }

  if (result.reason) {
    return "프리미엄 권한 확인이 지연되고 있습니다. 로그인과 결제 상태를 확인한 뒤 다시 시도해 주세요.";
  }

  return "프리미엄 스타일 리포트 결제 후 코디/메이크업 확장 상담이 계정에 연결됩니다.";
}

async function shareConsultationUrl({
  text,
  title,
  url,
}: {
  text: string;
  title: string;
  url: string;
}) {
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({
        text,
        title,
        url,
      });

      return "shared" as const;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return "cancelled" as const;
      }

      throw error;
    }
  }

  await navigator.clipboard.writeText(url);

  return "copied" as const;
}

function openHistoryDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error("이 브라우저에서는 상담 히스토리 저장을 지원하지 않습니다."));
      return;
    }

    const request = window.indexedDB.open(historyDbName, 1);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(historyStoreName)) {
        db.createObjectStore(historyStoreName, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function formatHistoryDate(createdAt: string) {
  const date = new Date(createdAt);

  if (Number.isNaN(date.getTime())) {
    return createdAt;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function openPrintableReport(item: ConsultationHistoryItem) {
  const imageMarkup = item.images
    .map(
      (image) => `
        <figure>
          <img alt="${escapeHtml(item.styleName)} ${escapeHtml(image.label)}" src="${image.imageUrl}" />
          <figcaption>${escapeHtml(image.label)}</figcaption>
        </figure>
      `,
    )
    .join("");
  const adviceMarkup = buildAdviceReportMarkup(item);

  return openPrintableHtmlReport(`
    <!doctype html>
    <html lang="ko">
      <head>
        <meta charset="utf-8" />
        <title>Miri Look ${escapeHtml(item.styleName)}</title>
        <style>
          body { margin: 0; padding: 32px; background: #f5f0e7; color: #171511; font-family: Arial, sans-serif; }
          header { margin-bottom: 24px; border-bottom: 1px solid #c9a96a; padding-bottom: 16px; }
          h1 { margin: 0; font-size: 28px; }
          p { margin: 8px 0 0; color: #5b5144; line-height: 1.6; }
          .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
          figure { margin: 0; overflow: hidden; border: 1px solid #d5c6aa; border-radius: 8px; background: white; }
          img { display: block; width: 100%; aspect-ratio: 1 / 1; object-fit: cover; }
          figcaption { padding: 8px 10px; font-weight: 700; color: #3b3328; }
          @media print { body { background: white; padding: 20px; } }
        </style>
      </head>
      <body>
        <header>
          <h1>미리룩 결과 기록</h1>
          <p>${escapeHtml(item.styleName)} · ${escapeHtml(item.hairColorName)} · ${escapeHtml(formatHistoryDate(item.createdAt))}</p>
          <p>업로드 사진 ${item.sourcePhotoCount}장 기준 · 생성 결과 ${item.images.length}장</p>
          ${item.styleReason ? `<p>추천 이유: ${escapeHtml(item.styleReason)}</p>` : ""}
          ${item.memo ? `<p>요청 메모: ${escapeHtml(item.memo)}</p>` : ""}
        </header>
        ${adviceMarkup}
        <main class="grid">${imageMarkup}</main>
      </body>
    </html>
  `);
}

function buildAdviceReportMarkup(item: ConsultationHistoryItem) {
  const rows = [
    ["시술 과정", item.salonProcess],
    ["관리 포인트", item.maintenanceAdvice],
    ["코디 추천", item.outfitAdvice],
    ["메이크업 추천", item.makeupAdvice],
  ].filter((row): row is [string, string] => Boolean(row[1]?.trim()));

  if (!rows.length) {
    return "";
  }

  return `
    <section style="margin:0 0 24px;padding:16px;border:1px solid #d5c6aa;border-radius:8px;background:#fffaf1">
      <h2 style="margin:0 0 10px;font-size:18px">상담 조언</h2>
      ${rows
        .map(
          ([label, value]) =>
            `<p style="margin:8px 0;color:#5b5144;line-height:1.6"><strong style="color:#171511">${escapeHtml(label)}</strong> ${escapeHtml(value)}</p>`,
        )
        .join("")}
    </section>
  `;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

async function downloadResultImage(
  imageUrl: string,
  fileName: string,
  options: { mirrored?: boolean } = {},
) {
  let downloadUrl = imageUrl;
  let shouldRevokeDownloadUrl = false;

  if (options.mirrored) {
    try {
      downloadUrl = await createMirroredImageObjectUrl(imageUrl);
      shouldRevokeDownloadUrl = true;
      fileName = appendFileNameSuffix(fileName, "-mirrored");
    } catch (error) {
      console.warn("mirrored image download failed, falling back to original", error);
    }
  }

  const link = document.createElement("a");

  link.href = downloadUrl;
  link.download = fileName;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();

  if (shouldRevokeDownloadUrl) {
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
  }
}

function waitForDownloadStep() {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, 120);
  });
}

function createMirroredImageObjectUrl(imageUrl: string) {
  return new Promise<string>((resolve, reject) => {
    const image = new Image();

    if (!imageUrl.startsWith("data:") && !imageUrl.startsWith("blob:")) {
      image.crossOrigin = "anonymous";
    }

    image.onload = () => {
      const width = image.naturalWidth || image.width;
      const height = image.naturalHeight || image.height;
      const canvas = document.createElement("canvas");

      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d");

      if (!context) {
        reject(new Error("canvas_context_unavailable"));
        return;
      }

      context.translate(width, 0);
      context.scale(-1, 1);
      context.drawImage(image, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("canvas_blob_unavailable"));
            return;
          }

          resolve(URL.createObjectURL(blob));
        },
        "image/jpeg",
        0.95,
      );
    };
    image.onerror = () => reject(new Error("image_load_failed"));
    image.src = imageUrl;
  });
}

function appendFileNameSuffix(fileName: string, suffix: string) {
  const extensionMatch = fileName.match(/(\.[^./\\]+)$/);

  if (extensionMatch?.index === undefined) {
    return `${fileName}${suffix}`;
  }

  return `${fileName.slice(0, extensionMatch.index)}${suffix}${extensionMatch[1]}`;
}
