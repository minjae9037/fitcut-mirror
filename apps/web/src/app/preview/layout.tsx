import type { Metadata } from "next";

// 리디자인 미리보기는 검색 비노출 + 별도 타이틀. (page.tsx는 클라이언트 컴포넌트라
// metadata를 여기 레이아웃에서 지정한다.)
export const metadata: Metadata = {
  title: "미리룩 리디자인 미리보기",
  robots: { index: false, follow: false },
};

export default function PreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
