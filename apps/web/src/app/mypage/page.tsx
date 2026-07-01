import Image from "next/image";
import { MirilookHistoryManager } from "@/components/mirilook-history-manager";
import { MirilookMainNav } from "@/components/mirilook-main-nav";
import { MirilookProfilePanel } from "@/components/mirilook-profile-panel";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const asset = (path: string) => `${basePath}${path}`;

export const metadata = {
  title: "마이페이지",
};

export default function MyPage() {
  return (
    <main className="min-h-screen bg-[#11100e] text-[#f8f1e5]">
      <section className="relative min-h-screen overflow-hidden">
        <Image
          alt="Premium salon consultation suite"
          className="object-cover"
          fill
          priority
          sizes="100vw"
          src={asset("/mock/premium-salon-suite.png")}
        />
        <div
          className="absolute inset-0 bg-[linear-gradient(90deg,rgba(17,16,14,0.96)_0%,rgba(17,16,14,0.84)_48%,rgba(17,16,14,0.56)_100%)]"
          data-mirilook-hero-scrim="side"
        />
        <div
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(17,16,14,0.08)_0%,rgba(17,16,14,0.24)_56%,#11100e_100%)]"
          data-mirilook-hero-scrim="base"
        />

        <div className="relative z-10 mx-auto max-w-7xl px-5 py-5">
          <MirilookMainNav subtitle="My Page" />

          <section className="mt-10 max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#f3d28a]">
              Account Profile
            </p>
            <h1 className="mt-3 text-4xl font-bold leading-tight text-[#fffaf1] md:text-5xl">
              내 프로필과 기준 사진을 관리하세요.
            </h1>
            <p className="mt-4 text-base leading-7 text-[#d8cbb8]">
              닉네임, 자기소개, 추천용 얼굴 사진을 저장해두면 다음 상담부터 더 빠르게
              스타일 추천을 시작할 수 있습니다.
            </p>
          </section>

          <div className="mt-8 grid gap-6 pb-12">
            <MirilookProfilePanel />
            <MirilookHistoryManager />
          </div>
        </div>
      </section>
    </main>
  );
}
