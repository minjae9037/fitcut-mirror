import Image from "next/image";
import { MirilookAuthPanel } from "@/components/mirilook-auth-panel";
import { MirilookMainNav } from "@/components/mirilook-main-nav";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const asset = (path: string) => `${basePath}${path}`;

export const metadata = {
  title: "로그인",
};

export default function LoginPage() {
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

        <div className="relative z-10 mx-auto max-w-6xl px-5 py-5">
          <MirilookMainNav subtitle="Member Account" />

          <section className="mt-10 max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#f3d28a]">
              mirilook Membership
            </p>
            <h1 className="mt-3 text-4xl font-bold leading-tight text-[#fffaf1] md:text-5xl">
              추천받은 스타일과 상담 기록을 계정으로 관리하세요.
            </h1>
            <p className="mt-4 text-base leading-7 text-[#d8cbb8]">
              한국 서비스는 기본값으로 고정되어 있으며, 로그인 후에는 히스토리, 공유, 예약,
              커뮤니티 기능을 계정 중심으로 확장할 수 있습니다.
            </p>
          </section>

          <div className="mt-8 pb-12">
            <MirilookAuthPanel />
          </div>
        </div>
      </section>
    </main>
  );
}
