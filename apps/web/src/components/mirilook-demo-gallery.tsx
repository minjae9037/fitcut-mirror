"use client";

import Image from "next/image";
import { useState } from "react";
import {
  CheckCircle2,
  Images,
  LayoutGrid,
  ScanFace,
  Sparkles,
  Upload,
} from "lucide-react";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const asset = (path: string) => `${basePath}${path}`;

type DemoAudience = "men" | "women";

type DemoStep = {
  caption: string;
  image: string;
  imageFit?: "contain" | "cover";
  label: string;
  title: string;
};

const demoSets: Record<DemoAudience, DemoStep[]> = {
  men: [
    {
      caption:
        "좌측·정면·우측 사진을 올리면 얼굴형, 현재 기장, 분위기를 분석합니다.",
      image: "/mock/mirilook-result-front.png",
      label: "STEP 1",
      title: "본인 사진 올리기",
    },
    {
      caption:
        "얼굴형과 선택 기준을 바탕으로 어울리는 남성 헤어스타일 9개를 먼저 추천합니다.",
      image: "/mock/style-samples/men-haircut-catalog-3x3.png",
      imageFit: "contain",
      label: "STEP 2",
      title: "스타일 9개 추천 받기",
    },
    {
      caption:
        "추천 9개 중 우측 하단의 울프컷 후보를 선택해 정면 이미지를 크게 확인합니다.",
      image: "/mock/style-samples/men-wolf-cut-front.png",
      label: "STEP 3",
      title: "스타일 1개 고르기",
    },
    {
      caption:
        "선택한 울프컷 정면 이미지를 기준으로 각도가 다른 상담용 3x3 이미지 보드를 만듭니다.",
      image: "/mock/style-samples/men-wolf-consultation-board-3x3.png",
      imageFit: "contain",
      label: "STEP 4",
      title: "상담용 9개 이미지 받기",
    },
  ],
  women: [
    {
      caption:
        "좌측·정면·우측 사진을 올리면 얼굴형, 현재 기장, 분위기를 분석합니다.",
      image: "/mock/style-samples/women-upload-views-3panel-hq.png",
      label: "STEP 1",
      title: "본인 사진 올리기",
    },
    {
      caption:
        "얼굴형과 선택 기준을 바탕으로 어울리는 여성 헤어스타일 9개를 먼저 추천합니다.",
      image: "/mock/style-samples/women-length-mix-catalog-3x3.png",
      imageFit: "contain",
      label: "STEP 2",
      title: "스타일 9개 추천 받기",
    },
    {
      caption:
        "추천 9개 중 마음에 드는 긴 레이어드 스타일 후보를 선택해 정면 이미지를 크게 확인합니다.",
      image: "/mock/style-samples/women-layer-real.png",
      label: "STEP 3",
      title: "스타일 1개 고르기",
    },
    {
      caption:
        "선택한 긴 레이어드 정면 이미지를 기준으로 각도가 다른 상담용 3x3 이미지 보드를 만듭니다.",
      image: "/mock/style-samples/women-layer-consultation-board-3x3.png",
      imageFit: "contain",
      label: "STEP 4",
      title: "상담용 9개 이미지 받기",
    },
  ],
};

const stepIcons = [Upload, LayoutGrid, CheckCircle2, Images] as const;

export function MirilookDemoGallery({ className = "" }: { className?: string }) {
  const [audience, setAudience] = useState<DemoAudience>("men");
  const steps = demoSets[audience];

  return (
    <section
      className={`rounded-md border border-[#2b281f] bg-[#0f0e0c]/72 p-4 shadow-lg shadow-black/18 sm:p-5 ${className}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#f3d28a]">
            <Sparkles aria-hidden="true" size={14} />
            결과 미리보기
          </p>
          <h2 className="mt-2 text-xl font-bold text-[#fffaf1] sm:text-2xl">
            사진을 올리기 전에, 결과 흐름을 먼저 확인해 보세요.
          </h2>
          <p className="mt-1 text-sm leading-6 text-[#b8aa95]">
            내 사진 업로드부터 AI 추천 9개, 스타일 선택, 상담용 9각도
            이미지까지 실제 진행 순서대로 보여드립니다.
          </p>
        </div>

        <div
          aria-label="성별 예시 선택"
          className="inline-flex shrink-0 rounded-md border border-[#2b281f] bg-[#11100e] p-1"
          role="tablist"
        >
          {(["men", "women"] as const).map((value) => {
            const isActive = audience === value;

            return (
              <button
                aria-selected={isActive}
                className={`rounded-md px-3 py-1.5 text-sm font-bold transition ${
                  isActive
                    ? "bg-[#f3d28a] text-[#1a1712]"
                    : "text-[#d8cbb8] hover:text-[#f3d28a]"
                }`}
                key={value}
                onClick={() => setAudience(value)}
                role="tab"
                type="button"
              >
                {value === "men" ? "남성" : "여성"}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-4">
        {steps.map((step, index) => {
          const Icon = stepIcons[index] ?? ScanFace;

          return (
            <figure
              className="group overflow-hidden rounded-md border border-[#2b281f] bg-[#11100e]"
              key={`${audience}-${step.label}`}
            >
              <div className="relative aspect-[4/5] overflow-hidden bg-[#0f0e0c]">
                <Image
                  alt={`${step.title} 예시`}
                  className={`transition duration-300 group-hover:scale-[1.03] ${
                    step.imageFit === "contain" ? "object-contain" : "object-cover"
                  }`}
                  fill
                  quality={95}
                  sizes="(min-width: 768px) 23vw, 100vw"
                  src={asset(step.image)}
                />
                <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-md bg-[#11100e]/80 px-2 py-1 text-[11px] font-semibold text-[#f3d28a] ring-1 ring-[#f3d28a]/30">
                  <Icon aria-hidden="true" size={12} />
                  {step.label}
                </span>
                <span className="absolute right-2 top-2 inline-flex items-center rounded-md bg-[#11100e]/70 px-2 py-1 text-[10px] font-semibold text-[#d8cbb8]">
                  예시
                </span>
              </div>
              <figcaption className="p-3">
                <p className="text-sm font-bold text-[#fffaf1]">{step.title}</p>
                <p className="mt-1 text-xs leading-5 text-[#b8aa95]">
                  {step.caption}
                </p>
              </figcaption>
            </figure>
          );
        })}
      </div>

      <p className="mt-3 text-[11px] leading-5 text-[#6f6658]">
        이미지는 미리룩 AI가 생성한 예시 결과이며, 실제 결과는 업로드한
        사진과 선택한 옵션에 따라 달라집니다.
      </p>
    </section>
  );
}
