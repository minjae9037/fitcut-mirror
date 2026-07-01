import Link from "next/link";
import { MirilookCommunityBoard } from "@/components/mirilook-community-board";
import { VoteRequestForm } from "@/components/mirilook-growth-forms";
import { MirilookMainNav } from "@/components/mirilook-main-nav";
import { MirilookNotificationSettings } from "@/components/mirilook-notification-settings";
import { MirilookPaymentPanel } from "@/components/mirilook-payment-panel";
import { communityVotePurposes } from "@/lib/mirilook-marketplace";
import { loadCommunityPosts } from "@/lib/server/mirilook-community";
import { MessageCircle, ShieldCheck, Vote } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "스타일 투표",
  description:
    "추천받은 헤어스타일 중 어떤 게 더 어울리는지 익명으로 의견을 받아보세요.",
  alternates: { canonical: "https://mirilook.com/votes" },
  openGraph: {
    title: "스타일 투표 | Miri Look",
    description: "추천받은 헤어스타일에 대한 익명 투표 의견을 받아보세요.",
    url: "https://mirilook.com/votes",
  },
};

export const dynamic = "force-dynamic";

export default async function VotesPage() {
  const community = await loadCommunityPosts();

  return (
    <main className="min-h-screen bg-[#11100e] text-[#f8f1e5]">
      <div className="mx-auto grid w-full max-w-6xl gap-6 px-5 py-6">
        <MirilookMainNav subtitle="Style Votes" />

        <header className="flex flex-col justify-between gap-4 border-b border-white/10 pb-5 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold text-[#f3d28a]">
              익명 스타일 투표
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-[#fffaf1]">
              추천받은 스타일을 익명으로 검증합니다.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#b8aa95]">
              남성은 여성에게, 여성은 남성에게 스타일 투표를 요청하고 DM 허용
              여부를 직접 선택할 수 있는 파일럿 투표 공간입니다.
            </p>
          </div>
          <Link
            className="inline-flex h-10 items-center justify-center rounded-md border border-white/12 px-3 text-sm font-semibold text-[#e7dccb] transition hover:bg-white/8"
            href="/salons"
          >
            제휴 미용실 보기
          </Link>
        </header>

        <section className="grid gap-4 lg:grid-cols-3">
          {[
            {
              icon: Vote,
              title: "이성 투표",
              body: "추천받은 스타일 후보를 목적별로 올리고 반대 성별에게 투표를 요청합니다.",
            },
            {
              icon: MessageCircle,
              title: "DM 허용 정책",
              body: "요청자가 허용하면 투표자가 메시지를 남길 수 있고, 비허용이면 투표와 댓글만 가능합니다.",
            },
            {
              icon: ShieldCheck,
              title: "익명 운영",
              body: "댓글과 DM 요청은 운영 확인 후 공개 또는 전달하는 방식으로 안전하게 시작합니다.",
            },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <article
                className="rounded-md border border-[#2b281f] bg-[#171511]/92 p-4"
                key={item.title}
              >
                <Icon aria-hidden="true" className="text-[#f3d28a]" size={20} />
                <h2 className="mt-3 text-lg font-semibold text-[#fffaf1]">
                  {item.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#b8aa95]">
                  {item.body}
                </p>
              </article>
            );
          })}
        </section>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="grid gap-4">
            <MirilookCommunityBoard
              connected={community.connected}
              posts={community.posts}
            />

            <section className="rounded-md border border-[#2b281f] bg-[#171511]/92 p-4">
              <h2 className="text-lg font-semibold text-[#fffaf1]">
                투표 목적
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {communityVotePurposes.map((purpose) => (
                  <span
                    className="rounded-md border border-white/10 bg-[#0f0e0c]/72 px-3 py-2 text-sm font-semibold text-[#d8cbb8]"
                    key={purpose}
                  >
                    {purpose}
                  </span>
                ))}
              </div>
            </section>
          </div>

          <div className="grid gap-5">
            <VoteRequestForm />
            <MirilookNotificationSettings />
            <MirilookPaymentPanel
              description="스타일 투표를 더 많은 사람에게 노출하고, 투표 결과와 DM 허용 정책을 파일럿 운영에 연결합니다."
              initialProductId="vote-boost-30"
              productIds={["vote-boost-30", "vote-boost-80"]}
              title="스타일 투표 부스트"
            />
          </div>
        </section>
      </div>
    </main>
  );
}
