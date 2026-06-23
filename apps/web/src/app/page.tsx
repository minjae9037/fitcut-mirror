import Image from "next/image";
import { Scissors } from "lucide-react";
import { FitcutStudio } from "@/components/fitcut-studio";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const asset = (path: string) => `${basePath}${path}`;
const homeHref = basePath || "/";

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
            <a
              className="flex items-center gap-3 transition hover:opacity-85"
              href={homeHref}
            >
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
            </a>
          </div>
        </header>

        <div className="relative z-10 mx-auto flex max-w-6xl flex-col px-5 pb-10 pt-4 md:pb-14 md:pt-8">
          <div className="mb-6 max-w-3xl">
            <h1 className="font-korean-calligraphy text-4xl leading-tight tracking-normal text-[#fffaf1] sm:text-5xl">
              내 얼굴에 어울리는 헤어스타일을 추천받아보세요.
            </h1>
            <p className="mt-3 text-base leading-7 text-[#d8cbb8]">
              Get personalized hairstyle recommendations for your face.
            </p>
            <div className="mt-5 max-w-2xl text-base leading-7 text-[#d8cbb8]">
              <p>
                내 사진을 올리고, 헤어스타일을 추천받고, 미용사에게 더
                고품질의 서비스를 받아보세요.
              </p>
              <p className="mt-1 text-[#b8aa95]">
                Upload your photos, preview your style, and give your stylist a
                clearer reference.
              </p>
            </div>
          </div>

          <FitcutStudio />
        </div>
      </section>
    </main>
  );
}
