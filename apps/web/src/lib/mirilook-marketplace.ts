export type SalonBookingSlotStatus = "available" | "few-left" | "full";

export type SalonBookingSlot = {
  capacityLabel: string;
  dateLabel: string;
  id: string;
  serviceTypes: string[];
  status: SalonBookingSlotStatus;
  timeLabel: string;
};

export type SalonDesignerPortfolioItem = {
  imageUrl: string;
  note: string;
  title: string;
};

export type SalonDesigner = {
  bio: string;
  bookingSlots: SalonBookingSlot[];
  id: string;
  imageUrl: string;
  name: string;
  portfolio: SalonDesignerPortfolioItem[];
  rating: string;
  reviewCount: number;
  reviews: string[];
  serviceMenu: string[];
  specialties: string[];
};

export type PilotSalon = {
  address: string;
  description: string;
  designers: SalonDesigner[];
  hours: string;
  id: string;
  imageUrl: string;
  latitude: number;
  longitude: number;
  name: string;
  phone: string;
  priceRange: string;
  rating: string;
  reviewCount: number;
  reviewHighlights: string[];
  tags: string[];
  visitTip: string;
};

export type SalonMapProvider = "google" | "kakao" | "openstreetmap";

export type SalonMapEmbedConfig = {
  iframeUrl?: string;
  provider: SalonMapProvider;
  providerLabel: string;
};

export const pilotSalons: PilotSalon[] = [
  {
    id: "atelier-cheongdam",
    name: "청담 아뜰리에",
    address: "서울 강남구 청담동",
    latitude: 37.525,
    longitude: 127.041,
    hours: "11:00 - 20:00",
    phone: "02-0000-1101",
    priceRange: "컷 55,000원부터",
    rating: "4.8",
    reviewCount: 128,
    imageUrl: "/salons/salon-cheongdam.png",
    description:
      "가르마, 리프, 다운펌과 여성 레이어드 상담에 강한 프리미엄 상담형 살롱입니다.",
    tags: ["프리미엄", "남성펌", "레이어드"],
    reviewHighlights: [
      "상담 보드 기준으로 디자이너와 원하는 이미지를 맞추기 좋았어요.",
      "다운펌과 앞머리 방향 설명이 구체적이라 실패 리스크가 낮았습니다.",
    ],
    visitTip:
      "포트폴리오 촬영, 소개팅, 직장 이미지 개선처럼 결과물이 중요한 고객에게 맞습니다.",
    designers: [
      {
        id: "jay",
        name: "준 디자이너",
        imageUrl: "/salons/designer-jun.png",
        bio: "남성 두상 보완과 가르마·리프 라인을 안정적으로 잡는 상담형 디자이너입니다. 사진 속 정면과 측면을 함께 보고 이마 노출, 옆머리 볼륨, 다운펌 범위를 세밀하게 조정합니다.",
        rating: "4.9",
        reviewCount: 62,
        reviews: [
          "리프컷을 하고 싶었는데 두상 때문에 고민이 많았어요. 설명이 구체적이라 결과가 안정적이었습니다.",
          "가르마 방향과 앞머리 길이를 사진으로 비교해 줘서 미용실에서 말이 바로 통했습니다.",
        ],
        specialties: ["가르마펌", "리프컷", "두상 보완"],
        serviceMenu: ["가르마펌 상담", "리프컷 정리", "다운펌 리스크 체크"],
        bookingSlots: [
          {
            id: "jay-weekday-1500",
            dateLabel: "평일",
            timeLabel: "15:00",
            capacityLabel: "잔여 2",
            status: "available",
            serviceTypes: ["AI 상담 보드 기반 컷 상담", "다운펌 상담"],
          },
          {
            id: "jay-sat-1130",
            dateLabel: "토요일",
            timeLabel: "11:30",
            capacityLabel: "잔여 1",
            status: "few-left",
            serviceTypes: ["리프컷 상담", "포트폴리오 촬영 전 상담"],
          },
        ],
        portfolio: [
          {
            title: "남성 가르마·여성 레이어드 상담",
            imageUrl: "/salons/portfolio-jun.png",
            note: "남성은 가르마 흐름과 옆머리 밀도를 정리하고, 여성은 긴 레이어와 얼굴선 보완을 함께 제안합니다.",
          },
        ],
      },
      {
        id: "yuna",
        name: "유나 디자이너",
        imageUrl: "/salons/designer-yuna.png",
        bio: "여성 레이어드와 톤 상담을 결합해 얼굴선, 모발량, 퍼스널 톤을 함께 봅니다. 과한 변신보다 실제 손질 가능한 라인과 컬 크기를 우선합니다.",
        rating: "4.8",
        reviewCount: 54,
        reviews: [
          "레이어가 과하지 않게 들어가서 매일 말리기 편했어요.",
          "염색 톤과 얼굴 주변 레이어를 같이 봐줘서 사진보다 실제가 더 자연스러웠습니다.",
        ],
        specialties: ["레이어드", "빌드펌", "톤 상담"],
        serviceMenu: ["레이어드 컷", "빌드펌 상담", "퍼스널 톤 상담"],
        bookingSlots: [
          {
            id: "yuna-weekday-1330",
            dateLabel: "평일",
            timeLabel: "13:30",
            capacityLabel: "잔여 2",
            status: "available",
            serviceTypes: ["여성 레이어드 상담", "톤 상담"],
          },
          {
            id: "yuna-fri-1900",
            dateLabel: "금요일",
            timeLabel: "19:00",
            capacityLabel: "잔여 1",
            status: "few-left",
            serviceTypes: ["빌드펌 상담"],
          },
        ],
        portfolio: [
          {
            title: "남성 댄디·여성 빌드펌 상담",
            imageUrl: "/salons/portfolio-yuna.png",
            note: "남성은 깔끔한 볼륨, 여성은 레이어와 브라운 톤을 맞춰 상담합니다.",
          },
        ],
      },
    ],
  },
  {
    id: "mirror-lab-seongsu",
    name: "미러랩 성수",
    address: "서울 성동구 성수동",
    latitude: 37.544,
    longitude: 127.055,
    hours: "10:30 - 19:30",
    phone: "02-0000-2202",
    priceRange: "컷 45,000원부터",
    rating: "4.7",
    reviewCount: 96,
    imageUrl: "/salons/salon-seongsu.png",
    description:
      "촬영, 프로필, 면접, 소개팅 전 스타일 상담에 맞춘 실용적인 성수형 살롱입니다.",
    tags: ["프로필", "촬영", "상담 친화"],
    reviewHighlights: [
      "사진 용도에 맞춰 과하지 않은 스타일을 골라줘서 좋았습니다.",
      "프로필 촬영 전에 정면·측면 참고 이미지를 들고 가기 편했어요.",
    ],
    visitTip:
      "프로필 사진, 면접, 소개팅처럼 특정 목적이 있는 고객에게 적합한 실용형 매장입니다.",
    designers: [
      {
        id: "min",
        name: "민재 디자이너",
        imageUrl: "/salons/designer-minjae.png",
        bio: "짧은 남성 스타일과 깔끔한 실루엣을 빠르게 잡는 디자이너입니다. 면접, 프로필, 직장 이미지처럼 단정함이 필요한 목적형 상담에 강합니다.",
        rating: "4.7",
        reviewCount: 41,
        reviews: [
          "짧게 자르면 얼굴이 커 보일까 걱정했는데 옆 라인을 잘 잡아줬습니다.",
          "면접 사진 전에 정리했는데 과하지 않고 단정해서 만족했습니다.",
        ],
        specialties: ["아이비리그", "크롭", "쉐도우펌"],
        serviceMenu: ["아이비리그 컷", "크롭컷 상담", "쉐도우펌 상담"],
        bookingSlots: [
          {
            id: "min-tue-1600",
            dateLabel: "화요일",
            timeLabel: "16:00",
            capacityLabel: "잔여 3",
            status: "available",
            serviceTypes: ["프로필 전 컷 상담", "짧은 머리 상담"],
          },
          {
            id: "min-sat-1400",
            dateLabel: "토요일",
            timeLabel: "14:00",
            capacityLabel: "잔여 1",
            status: "few-left",
            serviceTypes: ["면접 전 이미지 상담"],
          },
        ],
        portfolio: [
          {
            title: "남성 아이비리그·여성 C컬 상담",
            imageUrl: "/salons/portfolio-minjae.png",
            note: "남성은 이마 노출과 옆 라인, 여성은 중단발 C컬과 얼굴형 보완을 기준으로 잡습니다.",
          },
        ],
      },
      {
        id: "sora",
        name: "소라 디자이너",
        imageUrl: "/salons/designer-sora.png",
        bio: "중단발, C컬, 얼굴형 보완 상담을 차분하게 정리합니다. 기장을 크게 바꾸지 않으면서 얼굴 주변 라인을 다듬고 싶은 고객에게 맞습니다.",
        rating: "4.8",
        reviewCount: 37,
        reviews: [
          "중단발이 애매해서 고민했는데 C컬 방향을 잡아주니 손질이 쉬워졌어요.",
          "얼굴형 보완을 설명해 줘서 왜 이 길이가 맞는지 이해됐습니다.",
        ],
        specialties: ["중단발", "C컬", "얼굴형 보완"],
        serviceMenu: ["중단발 컷", "C컬 상담", "얼굴형 보완 상담"],
        bookingSlots: [
          {
            id: "sora-wed-1200",
            dateLabel: "수요일",
            timeLabel: "12:00",
            capacityLabel: "잔여 2",
            status: "available",
            serviceTypes: ["중단발 C컬 상담"],
          },
          {
            id: "sora-sun-1500",
            dateLabel: "일요일",
            timeLabel: "15:00",
            capacityLabel: "잔여 1",
            status: "few-left",
            serviceTypes: ["여성 얼굴형 보완 상담"],
          },
        ],
        portfolio: [
          {
            title: "남성 크롭·여성 숏보브 상담",
            imageUrl: "/salons/portfolio-sora.png",
            note: "남성은 짧은 텍스처, 여성은 턱선과 C컬 끝처리를 중심으로 제안합니다.",
          },
        ],
      },
    ],
  },
  {
    // Internal id matches the live `salons` row so designer/portfolio image
    // fallbacks resolve. Customer-facing name "미리룩 파일럿 홍대" is DB-stored.
    id: "fitcut-pilot-hongdae",
    name: "미리룩 파일럿 홍대",
    address: "서울 마포구 서교동",
    latitude: 37.555,
    longitude: 126.923,
    hours: "12:00 - 21:00",
    phone: "02-0000-3303",
    priceRange: "컷 38,000원부터",
    rating: "4.6",
    reviewCount: 73,
    imageUrl: "/salons/salon-hongdae.png",
    description:
      "첫 시도 비용과 실패 리스크를 낮추는 파일럿 테스트형 제휴 살롱입니다.",
    tags: ["파일럿", "가성비", "스타일 변화"],
    reviewHighlights: [
      "큰 변화 전에 부담 없이 테스트하기 좋은 가격대였습니다.",
      "처음 해보는 스타일을 상담 보드로 설명하니 말이 빨리 통했어요.",
    ],
    visitTip:
      "첫 스타일 변화, 학생·사회초년생, 저비용 테스트 수요에 맞춘 파일럿 후보입니다.",
    designers: [
      {
        id: "leo",
        name: "레오 디자이너",
        imageUrl: "/salons/designer-leo.png",
        bio: "첫 스타일 변화와 남성 다운펌 상담을 부담 없는 방향으로 제안합니다. 유지비, 손질 난이도, 실패 리스크를 먼저 계산해 줍니다.",
        rating: "4.6",
        reviewCount: 33,
        reviews: [
          "처음 다운펌을 했는데 과하지 않게 잡아줘서 자연스러웠습니다.",
          "가격 부담이 크지 않아서 스타일 변화를 시도하기 좋았어요.",
        ],
        specialties: ["댄디컷", "다운펌", "첫 스타일 변화"],
        serviceMenu: ["댄디컷", "다운펌 상담", "첫 스타일 변화 상담"],
        bookingSlots: [
          {
            id: "leo-weekday-1800",
            dateLabel: "평일",
            timeLabel: "18:00",
            capacityLabel: "잔여 3",
            status: "available",
            serviceTypes: ["가성비 컷 상담", "다운펌 상담"],
          },
          {
            id: "leo-sat-1630",
            dateLabel: "토요일",
            timeLabel: "16:30",
            capacityLabel: "잔여 1",
            status: "few-left",
            serviceTypes: ["첫 스타일 변화 상담"],
          },
        ],
        portfolio: [
          {
            title: "남성 댄디·여성 단발 상담",
            imageUrl: "/salons/portfolio-leo.png",
            note: "남성은 자연스러운 다운펌, 여성은 부드러운 단발 라인으로 부담을 낮춥니다.",
          },
        ],
      },
      {
        id: "arin",
        name: "아린 디자이너",
        imageUrl: "/salons/designer-arin.png",
        bio: "여성 단발, 태슬컷, 숏보브 상담을 깔끔한 기준으로 정리합니다. 얼굴선, 턱선, 손질 루틴을 함께 보고 길이 변화를 제안합니다.",
        rating: "4.7",
        reviewCount: 29,
        reviews: [
          "단발로 자르기 전 걱정이 많았는데 턱선 기준으로 설명해 줘서 결정하기 쉬웠습니다.",
          "태슬컷이 깔끔하게 나와서 매일 고데기 시간이 줄었습니다.",
        ],
        specialties: ["태슬컷", "숏보브", "펌 상담"],
        serviceMenu: ["태슬컷", "숏보브 상담", "단발 펌 상담"],
        bookingSlots: [
          {
            id: "arin-thu-1430",
            dateLabel: "목요일",
            timeLabel: "14:30",
            capacityLabel: "잔여 2",
            status: "available",
            serviceTypes: ["단발 상담", "숏보브 상담"],
          },
          {
            id: "arin-sun-1300",
            dateLabel: "일요일",
            timeLabel: "13:00",
            capacityLabel: "마감",
            status: "full",
            serviceTypes: ["태슬컷 상담"],
          },
        ],
        portfolio: [
          {
            title: "남성 콤마·여성 태슬컷 상담",
            imageUrl: "/salons/portfolio-arin.png",
            note: "남성은 낮은 유지 난이도, 여성은 선명한 태슬 라인과 안쪽 C컬을 중심으로 잡습니다.",
          },
        ],
      },
    ],
  },
];

export const communityVotePurposes = [
  "소개팅",
  "데이트",
  "면접",
  "프로필",
  "일상",
  "결혼식",
];

export function getSalonMapUrl(salon: Pick<PilotSalon, "address" | "name">) {
  return `https://map.naver.com/p/search/${encodeURIComponent(
    `${salon.name} ${salon.address}`,
  )}`;
}

export function getKakaoSalonMapUrl(
  salon: Pick<PilotSalon, "address" | "name">,
) {
  return `https://map.kakao.com/link/search/${encodeURIComponent(
    `${salon.name} ${salon.address}`,
  )}`;
}

export function getGoogleSalonMapUrl(
  salon: Pick<PilotSalon, "address" | "latitude" | "longitude" | "name">,
) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${salon.name} ${salon.address} ${salon.latitude},${salon.longitude}`,
  )}`;
}

export function getPreferredSalonMapProvider({
  googleApiKey,
  kakaoAppKey,
}: {
  googleApiKey?: string;
  kakaoAppKey?: string;
}): SalonMapProvider {
  if (kakaoAppKey) {
    return "kakao";
  }

  if (googleApiKey) {
    return "google";
  }

  return "openstreetmap";
}

export function getSalonEmbedMapConfig(
  salon: Pick<PilotSalon, "address" | "latitude" | "longitude" | "name">,
  provider: SalonMapProvider = "openstreetmap",
  googleApiKey?: string,
): SalonMapEmbedConfig {
  if (provider === "google" && googleApiKey) {
    return {
      iframeUrl: getGoogleSalonEmbedMapUrl(salon, googleApiKey),
      provider: "google",
      providerLabel: "Google Maps",
    };
  }

  if (provider === "kakao") {
    return {
      provider: "kakao",
      providerLabel: "Kakao Maps",
    };
  }

  return {
    iframeUrl: getOpenStreetMapEmbedUrl(salon),
    provider: "openstreetmap",
    providerLabel: "좌표 기반 지도",
  };
}

export function getSalonEmbedMapUrl(
  salon: Pick<PilotSalon, "latitude" | "longitude" | "name">,
) {
  return getOpenStreetMapEmbedUrl(salon);
}

export function getBookableSlots(designer: Pick<SalonDesigner, "bookingSlots">) {
  return designer.bookingSlots.filter((slot) => slot.status !== "full");
}

export function getPilotSalonFallback(salonId: string) {
  return pilotSalons.find((salon) => salon.id === salonId);
}

function getGoogleSalonEmbedMapUrl(
  salon: Pick<PilotSalon, "address" | "latitude" | "longitude" | "name">,
  apiKey: string,
) {
  const latitude = normalizeLatitude(salon.latitude);
  const longitude = normalizeLongitude(salon.longitude);

  return `https://www.google.com/maps/embed/v1/search?key=${encodeURIComponent(
    apiKey,
  )}&q=${encodeURIComponent(`${salon.name} ${salon.address}`)}&center=${latitude},${longitude}&zoom=15`;
}

function getOpenStreetMapEmbedUrl(
  salon: Pick<PilotSalon, "latitude" | "longitude" | "name">,
) {
  const latitude = normalizeLatitude(salon.latitude);
  const longitude = normalizeLongitude(salon.longitude);
  const delta = 0.006;
  const bbox = [
    longitude - delta,
    latitude - delta,
    longitude + delta,
    latitude + delta,
  ].join(",");

  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(
    bbox,
  )}&layer=mapnik&marker=${encodeURIComponent(`${latitude},${longitude}`)}`;
}

function normalizeLatitude(value: number) {
  return Number.isFinite(value) ? value : 37.5665;
}

function normalizeLongitude(value: number) {
  return Number.isFinite(value) ? value : 126.978;
}
