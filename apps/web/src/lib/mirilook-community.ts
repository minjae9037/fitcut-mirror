export type MirilookCommunityPost = {
  anonymousName: string;
  body: string;
  commentCount: number;
  createdAt: string;
  dmPolicy: "allow" | "deny";
  id: string;
  purpose: string;
  requesterGender: "male" | "female" | "other" | null;
  status: string;
  targetGender: "male" | "female" | "other" | null;
  title: string;
  topTags: string[];
  voteCount: number;
};

export const communityVoteTags = [
  "잘 어울림",
  "깔끔함",
  "소개팅용",
  "프로필용",
  "변화 큼",
  "관리 쉬움",
];

export const pilotCommunityPosts: MirilookCommunityPost[] = [
  {
    anonymousName: "익명",
    body: "추천받은 6:4 가르마와 쉐도우펌 중 소개팅 전에 어느 쪽이 더 자연스러운지 보고 싶어요.",
    commentCount: 8,
    createdAt: new Date("2026-06-20T09:00:00+09:00").toISOString(),
    dmPolicy: "deny",
    id: "pilot-soft-parted-shadow",
    purpose: "소개팅",
    requesterGender: "male",
    status: "published",
    targetGender: "female",
    title: "소개팅 전 6:4 가르마 vs 쉐도우펌",
    topTags: ["자연스러움", "소개팅용", "부드러운 인상"],
    voteCount: 42,
  },
  {
    anonymousName: "익명",
    body: "중단발 C컬과 태슬컷 중 면접에서 더 단정해 보이는 쪽을 투표받고 싶어요.",
    commentCount: 5,
    createdAt: new Date("2026-06-21T14:30:00+09:00").toISOString(),
    dmPolicy: "deny",
    id: "pilot-medium-c-tassel",
    purpose: "면접",
    requesterGender: "female",
    status: "published",
    targetGender: "male",
    title: "중단발 C컬과 태슬컷 중 면접용은?",
    topTags: ["단정함", "면접", "관리 쉬움"],
    voteCount: 35,
  },
  {
    anonymousName: "익명",
    body: "프로필 촬영 전에 리프컷이 너무 과한지, 지금 얼굴형에 괜찮은지 의견 부탁드립니다.",
    commentCount: 14,
    createdAt: new Date("2026-06-22T18:10:00+09:00").toISOString(),
    dmPolicy: "allow",
    id: "pilot-leaf-profile",
    purpose: "프로필",
    requesterGender: "male",
    status: "published",
    targetGender: "female",
    title: "프로필 촬영 전 리프컷 괜찮을까요?",
    topTags: ["프로필용", "볼륨", "이미지 변화"],
    voteCount: 57,
  },
];

export function getGenderLabel(gender: MirilookCommunityPost["requesterGender"]) {
  switch (gender) {
    case "male":
      return "남성";
    case "female":
      return "여성";
    case "other":
      return "기타/비공개";
    default:
      return "비공개";
  }
}
