import Image from "next/image";
import { MirilookHairMoneyStore } from "@/components/mirilook-hair-money-store";
import { MirilookMainNav } from "@/components/mirilook-main-nav";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const asset = (path: string) => `${basePath}${path}`;

export const metadata = {
  title: "Hair Money Store | Miri Look",
};

export default function StorePage() {
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
          className="absolute inset-0 bg-[linear-gradient(90deg,rgba(17,16,14,0.96)_0%,rgba(17,16,14,0.84)_48%,rgba(17,16,14,0.48)_100%)]"
          data-mirilook-hero-scrim="side"
        />
        <div
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(17,16,14,0.08)_0%,rgba(17,16,14,0.28)_54%,#11100e_100%)]"
          data-mirilook-hero-scrim="base"
        />

        <div className="relative z-10 mx-auto max-w-7xl px-5 py-5">
          <MirilookMainNav subtitle="Hair Money Store" />

          <section className="mt-10 max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#f3d28a]">
              Hair Money
            </p>
            <h1 className="mt-3 text-3xl font-bold leading-tight text-[#fffaf1] sm:text-4xl md:text-5xl">
              Hair Money로 원하는 스타일을 더 정확하게 확인하세요
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[#d8cbb8]">
              Hair Money는 미리룩의 헤어 추천과 이미지 생성 기능을 사용하는
              유상 포인트입니다. PortOne 결제 검증이 완료되면 회원 계정에
              적립되고, 추천 요청 시 사용량이 자동 차감되어 내역으로 기록됩니다.
            </p>
          </section>

          <div className="mt-8 pb-12">
            <MirilookHairMoneyStore />
          </div>
        </div>
      </section>
    </main>
  );
}
