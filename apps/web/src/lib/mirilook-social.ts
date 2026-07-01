export type MirilookSocialPost = {
  avatarUrl?: string;
  body: string;
  commentCount: number;
  comments: MirilookSocialComment[];
  createdAt: string;
  displayName: string;
  dislikeCount: number;
  dmPolicy: "allow" | "deny";
  handle: string;
  hashtags: string[];
  id: string;
  imageUrl: string;
  imageUrls: string[];
  likeCount: number;
  profileId?: string | null;
  recommendationScore: number;
  shareCount: number;
};

export type MirilookSocialComment = {
  body: string;
  createdAt: string;
  displayName: string;
  handle?: string;
  id: string;
};

export type MirilookSocialProfile = {
  avatarUrl: string;
  bio: string;
  displayName: string;
  handle: string;
  id: string;
};

export const pilotSocialPosts: MirilookSocialPost[] = [
  {
    body: "퇴근 후 미용실 상담 전에 받은 커튼펌 추천입니다. 정면 결과가 괜찮아서 상담 보드랑 후보 컷을 같이 올려요. 앞머리 볼륨은 살리고 옆머리는 너무 부풀지 않게 정리하는 방향으로 가보려고 합니다.",
    commentCount: 4,
    comments: [
      {
        body: "앞머리 볼륨이 자연스러워서 출근룩에도 잘 맞아 보여요.",
        createdAt: new Date("2026-06-23T20:05:00+09:00").toISOString(),
        displayName: "수빈",
        handle: "subin_style",
        id: "pilot-comment-curtain-1",
      },
      {
        body: "옆라인 다운펌만 살짝 같이 하면 더 깔끔할 것 같습니다.",
        createdAt: new Date("2026-06-23T20:31:00+09:00").toISOString(),
        displayName: "태오",
        handle: "taeo_hair",
        id: "pilot-comment-curtain-2",
      },
      {
        body: "이마가 살짝 보이는 길이가 답답하지 않아서 좋아 보여요.",
        createdAt: new Date("2026-06-23T21:04:00+09:00").toISOString(),
        displayName: "건우",
        handle: "geonwoo_perm",
        id: "pilot-comment-curtain-3",
      },
      {
        body: "상담 갈 때 이 사진이랑 9컷 보드 같이 보여주면 설명 편할 듯해요.",
        createdAt: new Date("2026-06-23T21:37:00+09:00").toISOString(),
        displayName: "라온",
        handle: "raon_review",
        id: "pilot-comment-curtain-4",
      },
    ],
    createdAt: new Date("2026-06-23T19:20:00+09:00").toISOString(),
    displayName: "민재",
    dislikeCount: 2,
    dmPolicy: "allow",
    handle: "mirilook_mj",
    hashtags: ["커튼펌", "남자헤어", "상담전참고"],
    id: "pilot-social-curtain",
    imageUrl: "/mock/mirilook-result-front.png",
    imageUrls: [
      "/mock/mirilook-result-front.png",
      "/mock/style-samples/men-angle-detail-front.png",
      "/mock/style-samples/men-haircut-catalog-3x3.png",
    ],
    likeCount: 128,
    recommendationScore: 96,
    shareCount: 18,
  },
  {
    body: "중단발에서 단정한 느낌으로 바꾸고 싶어서 C컬, 태슬컷, 부드러운 레이어드 후보를 비교 중입니다. 면접 사진에도 어울리고 평소에는 너무 꾸민 느낌이 나지 않는 쪽이면 좋겠어요.",
    commentCount: 4,
    comments: [
      {
        body: "면접이면 C컬 쪽이 조금 더 차분해 보여요.",
        createdAt: new Date("2026-06-24T12:10:00+09:00").toISOString(),
        displayName: "다현",
        handle: "dahyun_daily",
        id: "pilot-comment-women-medium-1",
      },
      {
        body: "태슬컷도 좋지만 앞머리 없이 넘기는 버전이 더 세련돼 보여요.",
        createdAt: new Date("2026-06-24T12:33:00+09:00").toISOString(),
        displayName: "린",
        handle: "rin_salon",
        id: "pilot-comment-women-medium-2",
      },
      {
        body: "첫인상은 2번째 후보가 제일 차분하고 얼굴이 환해 보여요.",
        createdAt: new Date("2026-06-24T13:04:00+09:00").toISOString(),
        displayName: "윤서",
        handle: "yoonseo_fit",
        id: "pilot-comment-women-medium-3",
      },
      {
        body: "컬이 너무 강하지 않은 C컬이면 관리도 편할 것 같아요.",
        createdAt: new Date("2026-06-24T13:28:00+09:00").toISOString(),
        displayName: "미나",
        handle: "mina_hair",
        id: "pilot-comment-women-medium-4",
      },
    ],
    createdAt: new Date("2026-06-24T11:05:00+09:00").toISOString(),
    displayName: "서윤",
    dislikeCount: 1,
    dmPolicy: "deny",
    handle: "seoyun_style",
    hashtags: ["여자헤어", "중단발", "C컬", "태슬컷"],
    id: "pilot-social-women-medium",
    imageUrl: "/mock/style-samples/women-bob-real.png",
    imageUrls: [
      "/mock/style-samples/women-bob-real.png",
      "/mock/style-samples/women-haircut-catalog-3x3.png",
      "/mock/style-samples/women-angle-detail-front.png",
      "/mock/style-samples/women-angle-detail-side.png",
    ],
    likeCount: 211,
    recommendationScore: 91,
    shareCount: 34,
  },
  {
    body: "짧은 머리 후보들 중 어떤 스타일이 제일 깔끔한지 피드백 받고 싶습니다. 회사에서는 단정해야 하고 주말에는 너무 평범하지 않았으면 해서 아이비리그컷, 크롭컷, 짧은 리프 느낌을 같이 비교했습니다.",
    commentCount: 4,
    comments: [
      {
        body: "아이비리그컷이 제일 깔끔하고 인상이 또렷해 보여요.",
        createdAt: new Date("2026-06-24T23:02:00+09:00").toISOString(),
        displayName: "현우",
        handle: "hyunwoo_cut",
        id: "pilot-comment-short-1",
      },
      {
        body: "크롭컷은 관리가 편해 보이는데 지금 얼굴형에는 앞머리 질감이 중요해 보여요.",
        createdAt: new Date("2026-06-24T23:18:00+09:00").toISOString(),
        displayName: "민서",
        handle: "minseo_look",
        id: "pilot-comment-short-2",
      },
      {
        body: "첫 번째는 부드럽고, 네 번째는 확실히 깔끔한 인상입니다.",
        createdAt: new Date("2026-06-24T23:46:00+09:00").toISOString(),
        displayName: "도겸",
        handle: "dokyeom_cut",
        id: "pilot-comment-short-3",
      },
      {
        body: "옆머리만 뜨지 않게 다운펌하면 아이비리그 쪽 추천해요.",
        createdAt: new Date("2026-06-25T00:12:00+09:00").toISOString(),
        displayName: "아린",
        handle: "arin_style",
        id: "pilot-comment-short-4",
      },
    ],
    createdAt: new Date("2026-06-24T22:40:00+09:00").toISOString(),
    displayName: "준호",
    dislikeCount: 4,
    dmPolicy: "allow",
    handle: "juno_cut",
    hashtags: ["숏컷", "아이비리그컷", "크롭컷"],
    id: "pilot-social-short",
    imageUrl: "/mock/style-samples/men-short-ivy-real.png",
    imageUrls: [
      "/mock/style-samples/men-short-ivy-real.png",
      "/mock/style-samples/men-haircut-catalog-3x3.png",
      "/mock/style-samples/men-angle-detail-front.png",
      "/mock/style-samples/men-angle-detail-side.png",
    ],
    likeCount: 174,
    recommendationScore: 88,
    shareCount: 22,
  },
  {
    body: "AI가 추천한 9개 스타일 중 허쉬 레이어드 하나를 골라 9개 각도로 상담 보드를 뽑아봤어요. 전체 후보 보드, 정면 디테일, 옆라인 디테일 순서로 올립니다. 실제 미용실에 보여주기 좋게 앞·측면·후면 느낌을 한 번에 비교하려고 합니다.",
    commentCount: 5,
    comments: [
      {
        body: "레이어드 무게감이 얼굴선을 잘 잡아줘서 제일 자연스러워 보여요.",
        createdAt: new Date("2026-06-25T10:12:00+09:00").toISOString(),
        displayName: "예린",
        handle: "yerin_layer",
        id: "pilot-comment-women-angle-1",
      },
      {
        body: "미용실 상담용이면 후면 길이 기준도 같이 보여주는 게 좋아요.",
        createdAt: new Date("2026-06-25T10:26:00+09:00").toISOString(),
        displayName: "소희",
        handle: "sohee_salon",
        id: "pilot-comment-women-angle-2",
      },
      {
        body: "앞머리는 시스루보다 긴 커튼 쪽이 더 잘 맞아 보여요.",
        createdAt: new Date("2026-06-25T10:49:00+09:00").toISOString(),
        displayName: "나은",
        handle: "naeun_fit",
        id: "pilot-comment-women-angle-3",
      },
      {
        body: "두 번째 사진 기준으로 층을 시작하면 얼굴 옆이 훨씬 가벼워 보여요.",
        createdAt: new Date("2026-06-25T11:06:00+09:00").toISOString(),
        displayName: "서아",
        handle: "seoa_layer",
        id: "pilot-comment-women-angle-4",
      },
      {
        body: "상담 보드는 1번, 최종 선택은 2번을 크게 보여주는 순서가 좋겠어요.",
        createdAt: new Date("2026-06-25T11:34:00+09:00").toISOString(),
        displayName: "유림",
        handle: "yurim_pick",
        id: "pilot-comment-women-angle-5",
      },
    ],
    createdAt: new Date("2026-06-25T09:40:00+09:00").toISOString(),
    displayName: "하린",
    dislikeCount: 3,
    dmPolicy: "allow",
    handle: "harin_layers",
    hashtags: ["여자헤어", "허쉬레이어드", "9각도", "상담보드"],
    id: "pilot-social-women-angle-board",
    imageUrl: "/mock/style-samples/women-layer-real.png",
    imageUrls: [
      "/mock/style-samples/women-layer-real.png",
      "/mock/style-samples/women-haircut-catalog-3x3.png",
      "/mock/style-samples/women-angle-detail-front.png",
      "/mock/style-samples/women-angle-detail-side.png",
      "/mock/style-samples/women-story-soft-layer.png",
    ],
    likeCount: 238,
    recommendationScore: 97,
    shareCount: 41,
  },
  {
    body: "추천 9개 중 리프컷 후보를 선택해서 9개 각도 상담 이미지로 정리했습니다. 전체 후보, 정면 디테일, 측면 기장 순서입니다. 옆머리 볼륨과 뒷머리 길이를 미용사님께 설명하기 쉬운지 봐주세요.",
    commentCount: 4,
    comments: [
      {
        body: "리프컷은 옆볼륨 정리만 잘하면 지금 분위기랑 잘 맞을 듯합니다.",
        createdAt: new Date("2026-06-25T18:11:00+09:00").toISOString(),
        displayName: "지훈",
        handle: "jihoon_leaf",
        id: "pilot-comment-men-angle-1",
      },
      {
        body: "정면보다 측면 기준으로 기장 잡는 게 중요해 보여요.",
        createdAt: new Date("2026-06-25T18:38:00+09:00").toISOString(),
        displayName: "유진",
        handle: "yujin_grooming",
        id: "pilot-comment-men-angle-2",
      },
      {
        body: "3번째 사진처럼 앞머리가 한쪽으로 흐르는 게 가장 자연스럽네요.",
        createdAt: new Date("2026-06-25T19:04:00+09:00").toISOString(),
        displayName: "민규",
        handle: "mingyu_hair",
        id: "pilot-comment-men-angle-3",
      },
      {
        body: "뒷머리는 너무 길게 빼지 않고 목선 살짝 덮는 정도가 좋을 듯해요.",
        createdAt: new Date("2026-06-25T19:22:00+09:00").toISOString(),
        displayName: "채린",
        handle: "chaerin_view",
        id: "pilot-comment-men-angle-4",
      },
    ],
    createdAt: new Date("2026-06-25T17:32:00+09:00").toISOString(),
    displayName: "도윤",
    dislikeCount: 5,
    dmPolicy: "allow",
    handle: "doyun_leaf",
    hashtags: ["남자헤어", "리프컷", "9각도", "다운펌"],
    id: "pilot-social-men-angle-board",
    imageUrl: "/mock/style-samples/men-leaf-real.png",
    imageUrls: [
      "/mock/style-samples/men-leaf-real.png",
      "/mock/style-samples/men-haircut-catalog-3x3.png",
      "/mock/style-samples/men-angle-detail-front.png",
      "/mock/style-samples/men-angle-detail-side.png",
    ],
    likeCount: 193,
    recommendationScore: 94,
    shareCount: 29,
  },
  {
    body: "오늘 머리 마음에 들어서 그냥 스토리에 올린 사진처럼 남겨봅니다. 추천받은 레이어드 방향으로 살짝 손질했는데 너무 과하지 않아서 좋네요. 정면 컷, 부드러운 레이어 컷, 전체 후보도 같이 올려요.",
    commentCount: 4,
    comments: [
      {
        body: "자연광 느낌이라 데일리 사진으로도 예뻐요.",
        createdAt: new Date("2026-06-26T08:22:00+09:00").toISOString(),
        displayName: "채원",
        handle: "chaewon_daily",
        id: "pilot-comment-story-1",
      },
      {
        body: "레이어가 과하지 않아서 인스타 스토리 분위기랑 잘 맞아요.",
        createdAt: new Date("2026-06-26T08:40:00+09:00").toISOString(),
        displayName: "지아",
        handle: "jia_mood",
        id: "pilot-comment-story-2",
      },
      {
        body: "첫 장은 진짜 스토리 캡처처럼 자연스럽고, 두 번째는 저장용으로 좋아 보여요.",
        createdAt: new Date("2026-06-26T09:02:00+09:00").toISOString(),
        displayName: "소민",
        handle: "somin_mood",
        id: "pilot-comment-story-3",
      },
      {
        body: "머리끝 레이어가 과하지 않아서 데일리로 딱 좋아요.",
        createdAt: new Date("2026-06-26T09:27:00+09:00").toISOString(),
        displayName: "하은",
        handle: "haeun_daily",
        id: "pilot-comment-story-4",
      },
    ],
    createdAt: new Date("2026-06-26T08:05:00+09:00").toISOString(),
    displayName: "유나",
    dislikeCount: 1,
    dmPolicy: "deny",
    handle: "yuna_story",
    hashtags: ["데일리헤어", "인스타스토리", "레이어드컷", "자연스러움"],
    id: "pilot-social-women-story",
    imageUrl: "/mock/style-samples/women-natural-story.png",
    imageUrls: [
      "/mock/style-samples/women-natural-story.png",
      "/mock/style-samples/women-story-soft-layer.png",
      "/mock/style-samples/women-haircut-catalog-3x3.png",
    ],
    likeCount: 256,
    recommendationScore: 89,
    shareCount: 37,
  },
];

export const pilotSocialProfiles: MirilookSocialProfile[] = [
  {
    avatarUrl: "/brand/mirilook-icon-192.png",
    bio: "헤어스타일 추천과 상담 이미지를 공유합니다.",
    displayName: "민재",
    handle: "mirilook_mj",
    id: "pilot-profile-mj",
  },
  {
    avatarUrl: "/brand/mirilook-icon-192.png",
    bio: "중단발, C컬, 태슬컷 관심.",
    displayName: "서윤",
    handle: "seoyun_style",
    id: "pilot-profile-seoyun",
  },
  {
    avatarUrl: "/brand/mirilook-icon-192.png",
    bio: "남자 짧은 머리 스타일 테스트 중.",
    displayName: "준호",
    handle: "juno_cut",
    id: "pilot-profile-juno",
  },
  {
    avatarUrl: "/brand/mirilook-icon-192.png",
    bio: "레이어드와 허쉬컷 상담 이미지를 모읍니다.",
    displayName: "하린",
    handle: "harin_layers",
    id: "pilot-profile-harin",
  },
  {
    avatarUrl: "/brand/mirilook-icon-192.png",
    bio: "남자 리프컷, 다운펌, 측면 라인 관심.",
    displayName: "도윤",
    handle: "doyun_leaf",
    id: "pilot-profile-doyun",
  },
  {
    avatarUrl: "/brand/mirilook-icon-192.png",
    bio: "자연스러운 데일리 헤어 기록.",
    displayName: "유나",
    handle: "yuna_story",
    id: "pilot-profile-yuna",
  },
];

export function normalizeHashtags(input: string) {
  return Array.from(
    new Set(
      input
        .split(/[,\s#]+/g)
        .map((item) => item.replace(/[<>]/g, "").trim())
        .filter(Boolean)
        .slice(0, 10),
    ),
  );
}
