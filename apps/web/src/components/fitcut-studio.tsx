"use client";

/* eslint-disable @next/next/no-img-element */

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronRight,
  ImagePlus,
  RefreshCw,
  Sparkles,
  Upload,
} from "lucide-react";

type StyleRecommendation = {
  id: string;
  name: string;
  reason: string;
  tags: string[];
};

const recommendations: StyleRecommendation[] = [
  {
    id: "leaf-cut",
    name: "리프컷",
    reason: "자연스러운 앞머리와 옆 볼륨으로 얼굴형을 부드럽게 보여줘요.",
    tags: ["중간 기장", "가르마", "부드러운 인상"],
  },
  {
    id: "ivy-league",
    name: "아이비리그컷",
    reason: "깔끔하고 단정해서 면접, 프로필 촬영, 직장인 스타일에 좋아요.",
    tags: ["짧은 기장", "깔끔함", "관리 쉬움"],
  },
  {
    id: "parted-perm",
    name: "6:4 가르마펌",
    reason: "볼륨을 살리면서도 과하지 않아 미용실 상담용으로 안정적이에요.",
    tags: ["펌", "볼륨", "데일리"],
  },
  {
    id: "crop-cut",
    name: "크롭컷",
    reason: "이마 노출과 라인이 또렷해서 선명하고 세련된 느낌을 줘요.",
    tags: ["짧은 기장", "선명함", "남성적"],
  },
];

const angles = [
  { label: "좌상단", className: "origin-center -rotate-2 scale-110" },
  { label: "상단", className: "origin-top scale-125 -translate-y-4" },
  { label: "우상단", className: "origin-center rotate-2 scale-110" },
  { label: "좌측", className: "origin-left scale-110 -translate-x-4" },
  { label: "정면", className: "origin-center scale-105" },
  { label: "우측", className: "origin-right scale-110 translate-x-4" },
  { label: "좌하단", className: "origin-bottom -rotate-1 scale-115 translate-y-3" },
  { label: "후면", className: "origin-center scale-125 blur-[0.4px]" },
  { label: "우하단", className: "origin-bottom rotate-1 scale-115 translate-y-3" },
];

export function FitcutStudio() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [selectedStyleId, setSelectedStyleId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedStyle = useMemo(
    () => recommendations.find((style) => style.id === selectedStyleId),
    [selectedStyleId],
  );

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setPreviewUrl(URL.createObjectURL(file));
    setFileName(file.name);
    setSelectedStyleId(null);
    setHasGenerated(false);
    setIsGenerating(false);
  }

  function handleGenerate() {
    if (!previewUrl || !selectedStyle) {
      return;
    }

    setIsGenerating(true);
    setHasGenerated(false);

    window.setTimeout(() => {
      setIsGenerating(false);
      setHasGenerated(true);
    }, 900);
  }

  function handleReset() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setPreviewUrl(null);
    setFileName("");
    setSelectedStyleId(null);
    setIsGenerating(false);
    setHasGenerated(false);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  return (
    <section className="w-full max-w-3xl rounded-lg border border-white/12 bg-[#171511]/88 p-4 shadow-2xl shadow-black/40 backdrop-blur md:p-5">
      <input
        accept="image/*"
        className="sr-only"
        onChange={handleFileChange}
        ref={inputRef}
        type="file"
      />

      {!previewUrl ? (
        <button
          className="flex min-h-[300px] w-full flex-col items-center justify-center gap-5 rounded-md border border-dashed border-[#c9a96a]/55 bg-[#0f0e0c]/72 p-6 text-center transition hover:border-[#f3d28a] hover:bg-[#1d1912]/86"
          onClick={() => inputRef.current?.click()}
          type="button"
        >
          <span className="flex size-20 items-center justify-center rounded-full border border-[#c9a96a]/60 bg-[#c9a96a]/14 text-[#f3d28a]">
            <ImagePlus aria-hidden="true" size={34} />
          </span>
          <span>
            <span className="block text-2xl font-semibold text-[#fffaf1]">
              사진 업로드
            </span>
            <span className="mt-2 block text-sm text-[#b8aa95]">
              정면 얼굴 사진으로 먼저 테스트하세요.
            </span>
          </span>
          <span className="inline-flex h-11 items-center gap-2 rounded-md bg-[#f3d28a] px-4 text-sm font-bold text-[#1a1712]">
            <Upload aria-hidden="true" size={17} />
            파일 선택
          </span>
        </button>
      ) : (
        <div className="grid gap-5">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="overflow-hidden rounded-md border border-[#2b281f] bg-[#0f0e0c] sm:w-44">
              <img
                alt="업로드한 사진 미리보기"
                className="aspect-square h-full w-full object-cover"
                src={previewUrl}
              />
            </div>
            <div className="flex flex-1 flex-col justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#c9a96a]">
                  Uploaded
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[#fffaf1]">
                  헤어스타일 추천
                </h2>
                <p className="mt-2 text-sm text-[#b8aa95]">{fileName}</p>
              </div>
              <button
                className="inline-flex h-10 w-fit items-center gap-2 rounded-md border border-white/12 px-3 text-sm font-semibold text-[#e7dccb] transition hover:bg-white/8"
                onClick={handleReset}
                type="button"
              >
                <RefreshCw aria-hidden="true" size={15} />
                다시 업로드
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {recommendations.map((style) => {
              const active = style.id === selectedStyleId;

              return (
                <button
                  className={`rounded-md border p-4 text-left transition ${
                    active
                      ? "border-[#f3d28a] bg-[#30271a] text-[#fffaf1]"
                      : "border-white/12 bg-[#0f0e0c]/72 text-[#e7dccb] hover:border-[#c9a96a]/55"
                  }`}
                  key={style.id}
                  onClick={() => {
                    setSelectedStyleId(style.id);
                    setHasGenerated(false);
                  }}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold">{style.name}</p>
                      <p className="mt-2 text-sm leading-6 text-[#b8aa95]">
                        {style.reason}
                      </p>
                    </div>
                    {active ? (
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#f3d28a] text-[#1a1712]">
                        <Check aria-hidden="true" size={16} />
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {style.tags.map((tag) => (
                      <span
                        className="rounded-md bg-white/7 px-2 py-1 text-xs text-[#d8cbb8]"
                        key={tag}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>

          <button
            className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[#f3d28a] px-5 text-sm font-bold text-[#1a1712] transition disabled:cursor-not-allowed disabled:opacity-45"
            disabled={!selectedStyle || isGenerating}
            onClick={handleGenerate}
            type="button"
          >
            <Sparkles aria-hidden="true" size={18} />
            {isGenerating
              ? "9장 생성 중..."
              : selectedStyle
                ? `${selectedStyle.name} 9장 생성`
                : "헤어스타일을 선택하세요"}
            <ChevronRight aria-hidden="true" size={18} />
          </button>

          {hasGenerated && selectedStyle ? (
            <div className="grid gap-4 border-t border-white/10 pt-5">
              <div>
                <h3 className="text-xl font-semibold text-[#fffaf1]">
                  {selectedStyle.name} 결과 9장
                </h3>
                <p className="mt-1 text-sm text-[#b8aa95]">
                  현재는 GitHub Pages 테스트용 mock 생성입니다. 실제 AI 변환은
                  이미지 API 연결 단계에서 붙입니다.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {angles.map((angle) => (
                  <div
                    className="overflow-hidden rounded-md border border-[#2b281f] bg-[#0f0e0c]"
                    key={angle.label}
                  >
                    <div className="relative aspect-square overflow-hidden">
                      <img
                        alt={`${selectedStyle.name} ${angle.label} 결과`}
                        className={`h-full w-full object-cover opacity-92 ${angle.className}`}
                        src={previewUrl}
                      />
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(243,210,138,0.18),transparent_32%),linear-gradient(180deg,transparent_45%,rgba(15,14,12,0.78)_100%)]" />
                      <div className="absolute left-3 top-3 rounded-md bg-[#11100e]/78 px-2 py-1 text-xs font-semibold text-[#f3d28a]">
                        {angle.label}
                      </div>
                      <div className="absolute bottom-3 left-3 right-3 text-sm font-semibold text-[#fffaf1]">
                        {selectedStyle.name}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
