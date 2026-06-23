"use client";

/* eslint-disable @next/next/no-img-element */

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ImagePlus,
  Loader2,
  RefreshCw,
  Sparkles,
  Upload,
} from "lucide-react";

type PhotoSlot = "front" | "side";

type UploadedPhoto = {
  fileName: string;
  url: string;
};

type StyleRecommendation = {
  id: string;
  name: string;
  reason: string;
  tags: string[];
  accent: string;
  cropClass: string;
};

const recommendations: StyleRecommendation[] = [
  {
    id: "leaf-cut",
    name: "리프컷",
    reason:
      "앞머리와 옆 라인이 자연스럽게 이어져 얼굴형을 부드럽게 보여주는 스타일입니다.",
    tags: ["중간 기장", "가르마", "부드러운 인상"],
    accent: "from-[#f3d28a]/26",
    cropClass: "scale-110 -translate-y-2",
  },
  {
    id: "ivy-league",
    name: "아이비리그컷",
    reason:
      "짧고 단정해서 면접, 프로필 촬영, 직장인 이미지에 안정적으로 어울립니다.",
    tags: ["짧은 기장", "깔끔함", "관리 쉬움"],
    accent: "from-[#a7dcc5]/24",
    cropClass: "scale-125 -translate-y-5",
  },
  {
    id: "parted",
    name: "가르마 스타일",
    reason:
      "볼륨을 살리면서도 과하지 않아 일상과 미용실 상담 모두에 쓰기 좋습니다.",
    tags: ["6:4", "볼륨", "데일리"],
    accent: "from-[#d6b38a]/24",
    cropClass: "scale-115 translate-x-2 -translate-y-3",
  },
  {
    id: "crop-cut",
    name: "크롭컷",
    reason:
      "이마와 라인을 또렷하게 정리해 선명하고 세련된 인상을 만듭니다.",
    tags: ["짧은 기장", "선명함", "남성적"],
    accent: "from-[#d9d2c4]/20",
    cropClass: "scale-130 -translate-y-7",
  },
  {
    id: "dandy-cut",
    name: "댄디컷",
    reason:
      "과한 변화 없이 단정하고 부드러운 느낌을 주는 안전한 첫 선택지입니다.",
    tags: ["단정함", "소프트", "첫 시도"],
    accent: "from-[#f3d28a]/18",
    cropClass: "scale-108 -translate-y-1",
  },
  {
    id: "shadow-perm",
    name: "쉐도우펌",
    reason:
      "머리 숱과 볼륨감을 살려 전체 실루엣을 풍성하게 보완할 수 있습니다.",
    tags: ["펌", "볼륨", "입체감"],
    accent: "from-[#8fb6a6]/20",
    cropClass: "scale-112 -translate-x-2 -translate-y-2",
  },
];

const resultAngles = [
  { label: "좌상단", source: "front" as const, className: "-rotate-2 scale-110" },
  { label: "상단", source: "front" as const, className: "scale-125 -translate-y-5" },
  { label: "우상단", source: "front" as const, className: "rotate-2 scale-110" },
  { label: "좌측", source: "side" as const, className: "scale-112 -translate-x-3" },
  { label: "정면", source: "front" as const, className: "scale-105" },
  { label: "우측", source: "side" as const, className: "scale-112 translate-x-3" },
  { label: "좌하단", source: "side" as const, className: "-rotate-1 scale-115 translate-y-3" },
  { label: "후면", source: "side" as const, className: "scale-125 blur-[0.35px]" },
  { label: "우하단", source: "side" as const, className: "rotate-1 scale-115 translate-y-3" },
];

const analysisLines = [
  "정면과 측면 사진을 함께 기준으로 봤어요.",
  "첫 테스트에서는 실패 리스크가 낮은 남성 스타일 위주로 추천합니다.",
  "마음에 드는 디자인을 누르면 미용사 상담용 9장 구성이 바로 생성됩니다.",
];

export function FitcutStudio() {
  const [photos, setPhotos] = useState<Record<PhotoSlot, UploadedPhoto | null>>({
    front: null,
    side: null,
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisReady, setAnalysisReady] = useState(false);
  const [selectedStyleId, setSelectedStyleId] = useState<string | null>(null);
  const frontInputRef = useRef<HTMLInputElement>(null);
  const sideInputRef = useRef<HTMLInputElement>(null);
  const createdUrlsRef = useRef<Set<string>>(new Set());
  const analysisTimerRef = useRef<number | null>(null);

  const frontPhoto = photos.front;
  const sidePhoto = photos.side;
  const selectedStyle = useMemo(
    () => recommendations.find((style) => style.id === selectedStyleId),
    [selectedStyleId],
  );

  useEffect(() => {
    const createdUrls = createdUrlsRef.current;

    return () => {
      if (analysisTimerRef.current) {
        window.clearTimeout(analysisTimerRef.current);
      }

      createdUrls.forEach((url) => URL.revokeObjectURL(url));
      createdUrls.clear();
    };
  }, []);

  function handlePhotoChange(
    slot: PhotoSlot,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (analysisTimerRef.current) {
      window.clearTimeout(analysisTimerRef.current);
    }

    setIsAnalyzing(false);
    setAnalysisReady(false);
    setSelectedStyleId(null);

    const otherPhoto = slot === "front" ? photos.side : photos.front;

    setPhotos((current) => {
      const previous = current[slot];
      const nextUrl = URL.createObjectURL(file);

      if (previous?.url) {
        URL.revokeObjectURL(previous.url);
        createdUrlsRef.current.delete(previous.url);
      }

      createdUrlsRef.current.add(nextUrl);

      return {
        ...current,
        [slot]: {
          fileName: file.name,
          url: nextUrl,
        },
      };
    });

    if (otherPhoto) {
      setIsAnalyzing(true);

      analysisTimerRef.current = window.setTimeout(() => {
        setIsAnalyzing(false);
        setAnalysisReady(true);
      }, 850);
    }
  }

  function resetAll() {
    Object.values(photos).forEach((photo) => {
      if (photo?.url) {
        URL.revokeObjectURL(photo.url);
        createdUrlsRef.current.delete(photo.url);
      }
    });

    if (analysisTimerRef.current) {
      window.clearTimeout(analysisTimerRef.current);
      analysisTimerRef.current = null;
    }

    setPhotos({ front: null, side: null });
    setIsAnalyzing(false);
    setAnalysisReady(false);
    setSelectedStyleId(null);

    if (frontInputRef.current) {
      frontInputRef.current.value = "";
    }

    if (sideInputRef.current) {
      sideInputRef.current.value = "";
    }
  }

  return (
    <section className="w-full max-w-4xl rounded-lg border border-white/12 bg-[#171511]/88 p-4 shadow-2xl shadow-black/40 backdrop-blur md:p-5">
      <input
        accept="image/*"
        className="sr-only"
        onChange={(event) => handlePhotoChange("front", event)}
        ref={frontInputRef}
        type="file"
      />
      <input
        accept="image/*"
        className="sr-only"
        onChange={(event) => handlePhotoChange("side", event)}
        ref={sideInputRef}
        type="file"
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <UploadBox
          label="정면 사진"
          photo={photos.front}
          onClick={() => frontInputRef.current?.click()}
        />
        <UploadBox
          label="측면 사진"
          photo={photos.side}
          onClick={() => sideInputRef.current?.click()}
        />
      </div>

      <div className="mt-4 flex flex-col justify-between gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold text-[#fffaf1]">
            최소 2장 필요: 정면 1장, 측면 1장
          </p>
          <p className="mt-1 text-sm text-[#b8aa95]">
            두 사진이 모두 올라가면 추천 결과가 자동으로 나옵니다.
          </p>
        </div>
        {photos.front || photos.side ? (
          <button
            className="inline-flex h-10 w-fit items-center gap-2 rounded-md border border-white/12 px-3 text-sm font-semibold text-[#e7dccb] transition hover:bg-white/8"
            onClick={resetAll}
            type="button"
          >
            <RefreshCw aria-hidden="true" size={15} />
            다시 업로드
          </button>
        ) : null}
      </div>

      {isAnalyzing ? (
        <div className="mt-5 flex items-center gap-3 rounded-md border border-[#c9a96a]/35 bg-[#30271a]/80 p-4 text-sm font-semibold text-[#f3d28a]">
          <Loader2 aria-hidden="true" className="animate-spin" size={18} />
          두 장의 사진을 기준으로 어울리는 헤어 디자인을 추천하는 중...
        </div>
      ) : null}

      {analysisReady && frontPhoto && sidePhoto ? (
        <div className="mt-5 grid gap-5 border-t border-white/10 pt-5">
          <section className="rounded-md border border-[#2b281f] bg-[#0f0e0c]/82 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles aria-hidden="true" className="text-[#f3d28a]" size={18} />
              <h2 className="text-lg font-semibold text-[#fffaf1]">
                추천 결과
              </h2>
            </div>
            <div className="grid gap-2 text-sm leading-6 text-[#d8cbb8]">
              {analysisLines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </section>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recommendations.map((style) => (
              <StyleCard
                active={style.id === selectedStyleId}
                frontPhoto={frontPhoto}
                key={style.id}
                onSelect={() => setSelectedStyleId(style.id)}
                style={style}
              />
            ))}
          </div>
        </div>
      ) : null}

      {selectedStyle && frontPhoto && sidePhoto ? (
        <div className="mt-5 grid gap-4 border-t border-white/10 pt-5">
          <div>
            <h3 className="text-xl font-semibold text-[#fffaf1]">
              {selectedStyle.name} 상담용 9장
            </h3>
            <p className="mt-1 text-sm text-[#b8aa95]">
              현재는 GitHub Pages 테스트용 mock 결과입니다. 실제 헤어 합성은
              이미지 생성 API 연결 단계에서 같은 위치에 붙입니다.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {resultAngles.map((angle) => {
              const sourcePhoto =
                angle.source === "front" ? frontPhoto : sidePhoto;

              return (
                <div
                  className="overflow-hidden rounded-md border border-[#2b281f] bg-[#0f0e0c]"
                  key={angle.label}
                >
                  <div className="relative aspect-square overflow-hidden">
                    <img
                      alt={`${selectedStyle.name} ${angle.label} 결과`}
                      className={`h-full w-full object-cover opacity-92 ${angle.className} ${selectedStyle.cropClass}`}
                      src={sourcePhoto.url}
                    />
                    <div
                      className={`absolute inset-0 bg-gradient-to-b ${selectedStyle.accent} via-transparent to-[#0f0e0c]/80`}
                    />
                    <div className="absolute left-3 top-3 rounded-md bg-[#11100e]/78 px-2 py-1 text-xs font-semibold text-[#f3d28a]">
                      {angle.label}
                    </div>
                    <div className="absolute bottom-3 left-3 right-3 text-sm font-semibold text-[#fffaf1]">
                      {selectedStyle.name}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function UploadBox({
  label,
  photo,
  onClick,
}: {
  label: string;
  photo: UploadedPhoto | null;
  onClick: () => void;
}) {
  return (
    <button
      className={`min-h-56 overflow-hidden rounded-md border text-left transition ${
        photo
          ? "border-[#c9a96a]/65 bg-[#0f0e0c]"
          : "border-dashed border-[#c9a96a]/55 bg-[#0f0e0c]/72 hover:border-[#f3d28a] hover:bg-[#1d1912]/86"
      }`}
      onClick={onClick}
      type="button"
    >
      {photo ? (
        <div className="grid h-full grid-rows-[1fr_auto]">
          <img
            alt={`${label} 미리보기`}
            className="aspect-[4/3] h-full w-full object-cover"
            src={photo.url}
          />
          <div className="p-3">
            <p className="text-sm font-semibold text-[#f3d28a]">{label}</p>
            <p className="mt-1 truncate text-xs text-[#b8aa95]">
              {photo.fileName}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex h-full min-h-56 flex-col items-center justify-center gap-4 p-5 text-center">
          <span className="flex size-16 items-center justify-center rounded-full border border-[#c9a96a]/60 bg-[#c9a96a]/14 text-[#f3d28a]">
            <ImagePlus aria-hidden="true" size={28} />
          </span>
          <span>
            <span className="block text-xl font-semibold text-[#fffaf1]">
              {label}
            </span>
            <span className="mt-2 block text-sm text-[#b8aa95]">
              눌러서 업로드
            </span>
          </span>
          <span className="inline-flex h-10 items-center gap-2 rounded-md bg-[#f3d28a] px-3 text-sm font-bold text-[#1a1712]">
            <Upload aria-hidden="true" size={16} />
            파일 선택
          </span>
        </div>
      )}
    </button>
  );
}

function StyleCard({
  active,
  frontPhoto,
  onSelect,
  style,
}: {
  active: boolean;
  frontPhoto: UploadedPhoto;
  onSelect: () => void;
  style: StyleRecommendation;
}) {
  return (
    <button
      className={`overflow-hidden rounded-md border text-left transition ${
        active
          ? "border-[#f3d28a] bg-[#30271a] text-[#fffaf1]"
          : "border-white/12 bg-[#0f0e0c]/72 text-[#e7dccb] hover:border-[#c9a96a]/55"
      }`}
      onClick={onSelect}
      type="button"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          alt={`${style.name} 디자인 미리보기`}
          className={`h-full w-full object-cover opacity-92 ${style.cropClass}`}
          src={frontPhoto.url}
        />
        <div
          className={`absolute inset-0 bg-gradient-to-b ${style.accent} via-transparent to-[#0f0e0c]/86`}
        />
        {active ? (
          <span className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full bg-[#f3d28a] text-[#1a1712]">
            <Check aria-hidden="true" size={17} />
          </span>
        ) : null}
        <div className="absolute bottom-3 left-3 right-3">
          <p className="text-lg font-semibold text-[#fffaf1]">{style.name}</p>
        </div>
      </div>
      <div className="p-4">
        <p className="text-sm leading-6 text-[#b8aa95]">{style.reason}</p>
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
      </div>
    </button>
  );
}
