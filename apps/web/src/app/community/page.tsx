import type { Metadata } from "next";
import { MirilookMainNav } from "@/components/mirilook-main-nav";
import { MirilookSocialCommunity } from "@/components/mirilook-social-community";
import { loadSocialCommunity } from "@/lib/server/mirilook-social";

export const metadata: Metadata = {
  title: "스타일 커뮤니티",
  description:
    "미리룩 사용자들의 헤어스타일 추천 결과와 후기를 둘러보고, 마음에 드는 스타일에 반응해 보세요.",
  alternates: { canonical: "https://mirilook.com/community" },
  openGraph: {
    title: "스타일 커뮤니티 | Miri Look",
    description: "미리룩 사용자들의 헤어스타일 추천 결과와 후기를 둘러보세요.",
    url: "https://mirilook.com/community",
  },
};

export const dynamic = "force-dynamic";

export default async function CommunityPage() {
  const social = await loadSocialCommunity();

  return (
    <main className="min-h-screen bg-[#11100e] text-[#f8f1e5]">
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-5 py-6">
        <MirilookMainNav subtitle="Community" />

        <header className="flex flex-col justify-between gap-4 border-b border-white/10 pb-5 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold text-[#f3d28a]">
              스타일 사진 커뮤니티
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-[#fffaf1]">
              나의 스타일 기록을 올리고, 다른 사람의 취향을 발견합니다.
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#b8aa95]">
              여러 장의 사진과 글을 올리고, 해시태그로 탐색하고, 회원 ID를 검색하고,
              마음에 드는 스타일에는 좋아요·싫어요·댓글·공유·DM으로 반응할 수
              있습니다.
            </p>
          </div>
        </header>

        <MirilookSocialCommunity
          connected={social.connected}
          posts={social.posts}
          profiles={social.profiles}
        />
      </div>
    </main>
  );
}
