import Image from "next/image";
import { Scissors } from "lucide-react";
import { FitcutStudio } from "@/components/fitcut-studio";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const asset = (path: string) => `${basePath}${path}`;

export default function Home() {
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
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(17,16,14,0.94)_0%,rgba(17,16,14,0.78)_46%,rgba(17,16,14,0.38)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(17,16,14,0.12)_0%,rgba(17,16,14,0.2)_54%,#11100e_100%)]" />

        <header className="relative z-10">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-md border border-[#c9a96a]/50 bg-[#c9a96a]/14 text-[#f3d28a]">
                <Scissors aria-hidden="true" size={21} />
              </div>
              <div>
                <p className="text-lg font-semibold tracking-[0.08em]">
                  FITCUT MIRROR
                </p>
                <p className="text-xs uppercase tracking-[0.24em] text-[#b8aa95]">
                  AI Salon Consultation
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="relative z-10 mx-auto flex max-w-6xl flex-col px-5 pb-10 pt-4 md:pb-14 md:pt-8">
          <div className="mb-6 max-w-2xl">
            <h1 className="text-4xl font-semibold leading-tight tracking-normal text-[#fffaf1] sm:text-5xl">
              사진 두 장으로
              <br />
              어울리는 헤어를 먼저 봅니다.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-[#d8cbb8]">
              정면과 측면 사진을 올리면 스타일을 추천하고, 선택한 스타일 기준으로
              미용사와 공유할 9개 각도 이미지를 준비합니다.
            </p>
          </div>

          <FitcutStudio />
        </div>
      </section>
    </main>
  );
}
