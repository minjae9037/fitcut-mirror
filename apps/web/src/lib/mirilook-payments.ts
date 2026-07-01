export type MirilookPaymentProduct = {
  amount: number;
  badge?: string;
  badgeTone?: "blue" | "gold";
  description: string;
  discountLabel?: string;
  entitlement?: "premium_addons" | "vote_boost" | "salon_pack";
  entitlementDays?: number;
  hairMoneyAmount?: number;
  id: string;
  name: string;
  perks: string[];
  productKind: "entitlement" | "hair_money";
};

export const HairMoneyUnitPriceKrw = 500;
export const HairMoneyRecommendationCost = 4;
export const HairMoneyRecommendationPriceKrw =
  HairMoneyRecommendationCost * HairMoneyUnitPriceKrw;

// One recommendation cycle includes the first consultation set (9 angles) for
// free. Generating an additional set for a different recommended style costs
// this many Hair Money units, charged with a confirmation prompt.
export const HairMoneyExtraConsultationCost = 2;
export const HairMoneyExtraConsultationPriceKrw =
  HairMoneyExtraConsultationCost * HairMoneyUnitPriceKrw;

// Community reward: sharing a photo/result to the public feed grants this many
// Hair Money units, once per published post (idempotent on the post id).
export const HairMoneyCommunityPostReward = 1;

export const MirilookEntitlementProducts: MirilookPaymentProduct[] = [
  {
    id: "premium-style-report",
    name: "프리미엄 스타일 리포트",
    amount: 1900,
    description:
      "헤어 추천에 코디와 메이크업 조언을 붙여 더 구체적인 상담 자료를 만듭니다.",
    entitlement: "premium_addons",
    entitlementDays: 30,
    productKind: "entitlement",
    perks: ["코디 추천", "메이크업 조언", "PDF/공유 상담 보드 반영"],
  },
  {
    id: "vote-boost-30",
    name: "스타일 투표 30명",
    amount: 3000,
    description:
      "추천받은 스타일을 파일럿 투표 대상에게 노출하고 결과를 모읍니다.",
    entitlement: "vote_boost",
    entitlementDays: 14,
    productKind: "entitlement",
    perks: ["이성 투표 요청", "댓글 피드백", "결과 요약"],
  },
  {
    id: "vote-boost-80",
    name: "스타일 투표 80명",
    amount: 7900,
    description:
      "더 많은 투표자에게 노출하고 DM 허용 여부를 선택할 수 있는 패키지입니다.",
    entitlement: "vote_boost",
    entitlementDays: 14,
    productKind: "entitlement",
    perks: ["투표 우선 노출", "DM 정책 선택", "목적별 결과 요약"],
  },
  {
    id: "salon-premium-pack",
    name: "미용실 상담 패키지",
    amount: 9900,
    description:
      "상담 보드 저장, 이메일 공유, 예약 문의를 묶은 프리미엄 파일럿 패키지입니다.",
    entitlement: "salon_pack",
    entitlementDays: 30,
    productKind: "entitlement",
    perks: ["상담 보드 저장", "미용실 이메일 공유", "예약 문의 연동"],
  },
];

export const MirilookHairMoneyProducts: MirilookPaymentProduct[] = [
  {
    id: "hair-money-2000",
    name: "Hair Money 4",
    amount: 2000,
    description:
      "헤어스타일 추천 1회를 바로 테스트할 수 있는 최소 충전 패키지입니다.",
    hairMoneyAmount: 4,
    productKind: "hair_money",
    perks: ["스타일 추천 1회 기준", "1 Hair Money = 500원"],
  },
  {
    id: "hair-money-10000",
    name: "Hair Money 20",
    amount: 10000,
    description:
      "여러 장의 사진과 다른 추천 기준을 반복 테스트하기 좋은 기본 패키지입니다.",
    hairMoneyAmount: 20,
    productKind: "hair_money",
    perks: ["스타일 추천 5회 기준", "1 Hair Money = 500원"],
  },
  {
    id: "hair-money-20000",
    name: "Hair Money 40",
    amount: 20000,
    description:
      "상담 전후 비교와 다른 컬러·기장 기준을 넉넉히 테스트할 수 있습니다.",
    hairMoneyAmount: 40,
    productKind: "hair_money",
    perks: ["스타일 추천 10회 기준", "1 Hair Money = 500원"],
  },
  {
    id: "hair-money-30000",
    name: "Hair Money 60",
    amount: 30000,
    description:
      "미용실 상담 테스트나 여러 고객 비교를 위한 운영형 충전 패키지입니다.",
    hairMoneyAmount: 60,
    productKind: "hair_money",
    perks: ["스타일 추천 15회 기준", "1 Hair Money = 500원"],
  },
  {
    id: "hair-money-40000",
    name: "Hair Money 80",
    amount: 40000,
    description:
      "반복 상담, 코디·메이크업 확장 기능 테스트까지 고려한 패키지입니다.",
    hairMoneyAmount: 80,
    productKind: "hair_money",
    perks: ["스타일 추천 20회 기준", "1 Hair Money = 500원"],
  },
  {
    id: "hair-money-50000",
    name: "Hair Money 100",
    amount: 50000,
    description:
      "팀 단위 테스트와 파일럿 운영에 맞춘 최대 충전 패키지입니다.",
    hairMoneyAmount: 100,
    productKind: "hair_money",
    perks: ["스타일 추천 25회 기준", "1 Hair Money = 500원"],
  },
];

export const MirilookPaymentProducts: MirilookPaymentProduct[] = [
  ...MirilookEntitlementProducts,
  ...MirilookHairMoneyProducts,
];

export function getPaymentProduct(productId: string | undefined) {
  return MirilookPaymentProducts.find((product) => product.id === productId);
}

export function getPaymentProductFromPaymentId(paymentId: string | undefined) {
  if (!paymentId) {
    return undefined;
  }

  return MirilookPaymentProducts.find((product) =>
    paymentId.startsWith(`mirilook-${product.id}-`),
  );
}

export function getEntitlementExpiresAt(product: MirilookPaymentProduct) {
  const days = product.entitlementDays ?? 30;

  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

export function formatHairMoney(value: number | null | undefined) {
  return (value ?? 0).toLocaleString("ko-KR");
}
