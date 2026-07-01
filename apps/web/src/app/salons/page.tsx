import type { Metadata } from "next";
import { MirilookMainNav } from "@/components/mirilook-main-nav";
import { MirilookSalonDirectory } from "@/components/mirilook-salon-directory";
import { loadPilotSalons } from "@/lib/server/mirilook-marketplace";

export const metadata: Metadata = {
  title: "파트너 미용실",
  description:
    "미리룩 상담 보드와 잘 맞는 파트너 미용실·디자이너 포트폴리오를 한 화면에서 비교해 보세요.",
  alternates: { canonical: "https://mirilook.com/salons" },
  openGraph: {
    title: "파트너 미용실 | Miri Look",
    description:
      "미리룩 상담 보드와 잘 맞는 파트너 미용실·디자이너 포트폴리오를 비교해 보세요.",
    url: "https://mirilook.com/salons",
  },
};

export default async function SalonsPage() {
  const salons = await loadPilotSalons();

  return (
    <main className="min-h-screen bg-[#11100e] text-[#f8f1e5]">
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-5 py-6">
        <MirilookMainNav subtitle="Partner Salon" />

        <header className="border-b border-white/10 pb-5">
          <div className="mb-4 rounded-md border border-[#f3d28a]/40 bg-[#201c14] px-4 py-3 text-sm leading-6 text-[#f8f1e5]">
            <p className="font-semibold">협업 미용실 섭외 중입니다.</p>
            <p className="mt-1 text-[#d8c8ad]">
              관심 있으신 미용실에서는{" "}
              <a className="font-semibold text-[#f3d28a]" href="tel:01027045672">
                010-2704-5672
              </a>{" "}
              또는{" "}
              <a
                className="font-semibold text-[#f3d28a]"
                href="mailto:minjae9037@gmail.com"
              >
                minjae9037@gmail.com
              </a>
              으로 연락 부탁드립니다.
            </p>
          </div>
          <p className="text-sm font-semibold text-[#f3d28a]">
            파트너 미용실 미리보기 (예시)
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-[#fffaf1]">
            상담 보드와 잘 맞는 미용실을 고르세요.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#b8aa95]">
            아래 카드는 입점 시 고객에게 보이는 화면을 보여주는 예시 구성입니다.
            미용실별 분위기, 디자이너 프로필, 남녀 시술 포트폴리오, 리뷰를 한
            화면에서 비교할 수 있으며, 실제 예약 가능한 제휴 미용실은 순차적으로
            공개됩니다.
          </p>
        </header>

        {salons.length ? (
          <MirilookSalonDirectory salons={salons} />
        ) : (
          <section className="rounded-md border border-[#2b281f] bg-[#171511]/92 p-5">
            <h2 className="text-lg font-semibold text-[#fffaf1]">
              공개 가능한 입점 파트너가 아직 없습니다.
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#b8aa95]">
              관리자 승인이 완료된 미용실과 디자이너만 고객 화면에 노출됩니다.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
