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
import {
  fitcutStyles,
  resultAngles,
  type FitcutStyle,
  type FitcutStyleId,
} from "@/lib/fitcut-styles";

type PhotoSlot = "front" | "side";

type UploadedPhoto = {
  file: File;
  fileName: string;
  url: string;
};

type DisplayRecommendation = FitcutStyle & {
  imageUrl?: string;
};

type RenderedResult = {
  label: string;
  imageUrl: string;
  className?: string;
};

const analysisLines = [
  "정면과 측면 사진을 함께 기준으로 봤어요.",
  "첫 테스트에서는 실패 리스크가 낮은 남성 스타일 위주로 추천합니다.",
  "마음에 드는 디자인을 누르면 미용사 상담용 9장 구성이 바로 생성됩니다.",
];

const liveAiEnabled = process.env.NEXT_PUBLIC_ENABLE_LIVE_AI === "true";
const apiBaseUrl = (process.env.NEXT_PUBLIC_GENERATION_API_URL ?? "").replace(
  /\/$/,
  "",
);
const uploadImageMaxSide = 1280;
const uploadImageQuality = 0.78;

export function FitcutStudio() {
  const [photos, setPhotos] = useState<Record<PhotoSlot, UploadedPhoto | null>>({
    front: null,
    side: null,
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisReady, setAnalysisReady] = useState(false);
  const [recommendations, setRecommendations] =
    useState<DisplayRecommendation[]>(fitcutStyles);
  const [analysisNotes, setAnalysisNotes] = useState(analysisLines);
  const [selectedStyleId, setSelectedStyleId] = useState<FitcutStyleId | null>(
    null,
  );
  const [isRendering, setIsRendering] = useState(false);
  const [renderedResults, setRenderedResults] = useState<RenderedResult[]>([]);
  const [statusMessage, setStatusMessage] = useState("");
  const frontInputRef = useRef<HTMLInputElement>(null);
  const sideInputRef = useRef<HTMLInputElement>(null);
  const createdUrlsRef = useRef<Set<string>>(new Set());
  const analysisTimerRef = useRef<number | null>(null);

  const frontPhoto = photos.front;
  const sidePhoto = photos.side;
  const selectedStyle = useMemo(
    () => recommendations.find((style) => style.id === selectedStyleId),
    [recommendations, selectedStyleId],
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

  async function handlePhotoChange(
    slot: PhotoSlot,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const originalFile = event.target.files?.[0];

    if (!originalFile) {
      return;
    }

    if (analysisTimerRef.current) {
      window.clearTimeout(analysisTimerRef.current);
    }

    setIsAnalyzing(false);
    setAnalysisReady(false);
    setSelectedStyleId(null);
    setRenderedResults([]);
    setStatusMessage("사진을 업로드용으로 압축하는 중입니다.");

    const otherPhoto = slot === "front" ? photos.side : photos.front;

    try {
      const file = await prepareUploadImage(originalFile);
      const nextUrl = URL.createObjectURL(file);
      const nextPhoto = {
        file,
        fileName: originalFile.name,
        url: nextUrl,
      };

      setPhotos((current) => {
        const previous = current[slot];

        if (previous?.url) {
          URL.revokeObjectURL(previous.url);
          createdUrlsRef.current.delete(previous.url);
        }

        createdUrlsRef.current.add(nextUrl);

        return {
          ...current,
          [slot]: nextPhoto,
        };
      });

      if (otherPhoto) {
        const nextPhotos = {
          ...photos,
          [slot]: nextPhoto,
        } as Record<PhotoSlot, UploadedPhoto>;

        void generateRecommendations(nextPhotos);
      } else {
        setStatusMessage("사진이 업로드되었습니다. 나머지 사진도 올려주세요.");
      }
    } catch (error) {
      console.error(error);
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "사진을 준비하지 못했습니다. 다른 이미지로 다시 시도해 주세요.",
      );
    } finally {
      event.target.value = "";
    }
  }

  async function generateRecommendations(
    currentPhotos: Record<PhotoSlot, UploadedPhoto>,
  ) {
    setIsAnalyzing(true);
    setAnalysisReady(false);
    setRecommendations(fitcutStyles);
    setAnalysisNotes(analysisLines);
    setStatusMessage(
      liveAiEnabled
        ? "실제 AI 이미지 추천을 생성하고 있습니다. 비용과 시간이 발생할 수 있습니다."
        : "현재 공개 페이지는 API 키가 없어 mock 추천으로 표시됩니다.",
    );

    if (!liveAiEnabled) {
      analysisTimerRef.current = window.setTimeout(() => {
        setIsAnalyzing(false);
        setAnalysisReady(true);
      }, 850);
      return;
    }

    try {
      const formData = new FormData();
      formData.append("front", currentPhotos.front.file);
      formData.append("side", currentPhotos.side.file);

      const response = await fetch(
        `${apiBaseUrl}/api/hairstyles/recommend/`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      const payload = (await response.json()) as {
        notes?: string[];
        recommendations?: DisplayRecommendation[];
      };

      setRecommendations(
        payload.recommendations?.length
          ? payload.recommendations
          : fitcutStyles,
      );
      setAnalysisNotes(payload.notes?.length ? payload.notes : analysisLines);
      setStatusMessage("실제 AI 추천 이미지가 생성되었습니다.");
    } catch (error) {
      console.error(error);
      setRecommendations(fitcutStyles);
      setAnalysisNotes(analysisLines);
      setStatusMessage(getGenerationFailureMessage(error));
    } finally {
      setIsAnalyzing(false);
      setAnalysisReady(true);
    }
  }

  async function selectStyle(style: DisplayRecommendation) {
    if (!frontPhoto || !sidePhoto) {
      return;
    }

    setSelectedStyleId(style.id);
    setRenderedResults([]);
    setIsRendering(true);

    if (!liveAiEnabled) {
      window.setTimeout(() => {
        setRenderedResults(createMockResults(style, frontPhoto, sidePhoto));
        setIsRendering(false);
      }, 450);
      return;
    }

    try {
      const formData = new FormData();
      formData.append("front", frontPhoto.file);
      formData.append("side", sidePhoto.file);
      formData.append("styleId", style.id);

      const response = await fetch(`${apiBaseUrl}/api/hairstyles/render/`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      const payload = (await response.json()) as {
        results?: { label: string; imageUrl: string }[];
      };

      setRenderedResults(
        payload.results?.length
          ? payload.results
          : createMockResults(style, frontPhoto, sidePhoto),
      );
    } catch (error) {
      console.error(error);
      setStatusMessage(getGenerationFailureMessage(error, true));
      setRenderedResults(createMockResults(style, frontPhoto, sidePhoto));
    } finally {
      setIsRendering(false);
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
    setRecommendations(fitcutStyles);
    setAnalysisNotes(analysisLines);
    setRenderedResults([]);
    setIsRendering(false);
    setStatusMessage("");

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
        onChange={(event) => void handlePhotoChange("front", event)}
        ref={frontInputRef}
        type="file"
      />
      <input
        accept="image/*"
        className="sr-only"
        onChange={(event) => void handlePhotoChange("side", event)}
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
          {liveAiEnabled
            ? "업로드한 얼굴에 실제 헤어스타일을 합성하는 중..."
            : "두 장의 사진을 기준으로 어울리는 헤어 디자인을 추천하는 중..."}
        </div>
      ) : null}

      {statusMessage ? (
        <p className="mt-4 rounded-md border border-white/10 bg-[#0f0e0c]/72 px-3 py-2 text-sm text-[#b8aa95]">
          {statusMessage}
        </p>
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
              {analysisNotes.map((line) => (
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
                onSelect={() => selectStyle(style)}
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
              {liveAiEnabled
                ? "실제 이미지 API로 생성한 상담용 결과입니다."
                : "현재 공개 페이지는 API 키가 없어 mock 결과로 표시됩니다."}
            </p>
          </div>
          {isRendering ? (
            <div className="flex items-center gap-3 rounded-md border border-[#c9a96a]/35 bg-[#30271a]/80 p-4 text-sm font-semibold text-[#f3d28a]">
              <Loader2 aria-hidden="true" className="animate-spin" size={18} />
              {selectedStyle.name} 9장 결과를 생성하는 중...
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {renderedResults.map((result) => (
              <div
                className="overflow-hidden rounded-md border border-[#2b281f] bg-[#0f0e0c]"
                key={result.label}
              >
                <div className="relative aspect-square overflow-hidden">
                  <img
                    alt={`${selectedStyle.name} ${result.label} 결과`}
                    className={`h-full w-full object-cover opacity-92 ${result.className ?? ""}`}
                    src={result.imageUrl}
                  />
                  <div
                    className={`absolute inset-0 bg-gradient-to-b ${selectedStyle.accent} via-transparent to-[#0f0e0c]/80`}
                  />
                  <div className="absolute left-3 top-3 rounded-md bg-[#11100e]/78 px-2 py-1 text-xs font-semibold text-[#f3d28a]">
                    {result.label}
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
              {photo.fileName} · {formatFileSize(photo.file.size)}
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

async function prepareUploadImage(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("이미지 파일만 업로드할 수 있습니다.");
  }

  const sourceUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(sourceUrl);
    const maxSourceSide = Math.max(image.naturalWidth, image.naturalHeight);
    const scale = Math.min(1, uploadImageMaxSide / maxSourceSide);
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("브라우저에서 사진을 처리하지 못했습니다.");
    }

    canvas.width = width;
    canvas.height = height;
    context.drawImage(image, 0, 0, width, height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (value) => {
          if (value) {
            resolve(value);
          } else {
            reject(new Error("사진 압축에 실패했습니다."));
          }
        },
        "image/jpeg",
        uploadImageQuality,
      );
    });

    return new File([blob], toJpegName(file.name), {
      lastModified: file.lastModified,
      type: "image/jpeg",
    });
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error("사진을 읽지 못했습니다. 다른 이미지로 다시 시도해 주세요."));
    image.src = src;
  });
}

function toJpegName(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "") + ".jpg";
}

function formatFileSize(size: number) {
  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))}KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)}MB`;
}

async function readApiError(response: Response) {
  const text = await response.text();

  try {
    const payload = JSON.parse(text) as { error?: string };

    return `${response.status}: ${payload.error ?? text}`;
  } catch {
    return `${response.status}: ${text || response.statusText}`;
  }
}

function getGenerationFailureMessage(error: unknown, isRender = false) {
  const message = error instanceof Error ? error.message : String(error);

  if (/413|payload too large|request entity too large/i.test(message)) {
    return "사진 용량이 커서 서버가 요청을 받지 못했습니다. 사진을 다시 업로드하면 자동 압축 후 재시도합니다.";
  }

  if (/quota|billing|credit|insufficient_quota|payment/i.test(message)) {
    return "OpenAI 크레딧 또는 결제 설정이 필요합니다. Platform에서 Add credits 후 다시 시도해 주세요.";
  }

  if (/model|access|permission|organization/i.test(message)) {
    return "OpenAI 모델 접근 권한 또는 프로젝트 설정을 확인해야 합니다. gpt-image-2 사용 가능 여부를 확인해 주세요.";
  }

  return isRender
    ? "9장 실제 생성에 실패해 mock 결과로 표시합니다. 서버 로그를 확인하세요."
    : "실제 AI 생성에 실패해 mock 추천으로 표시합니다. 서버 API 키와 배포 설정을 확인하세요.";
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
  style: DisplayRecommendation;
}) {
  const imageUrl = style.imageUrl ?? frontPhoto.url;

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
          src={imageUrl}
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

function createMockResults(
  style: DisplayRecommendation,
  frontPhoto: UploadedPhoto,
  sidePhoto: UploadedPhoto,
) {
  return resultAngles.map((angle) => {
    const sourcePhoto = angle.source === "front" ? frontPhoto : sidePhoto;

    return {
      label: angle.label,
      imageUrl: sourcePhoto.url,
      className: `${angle.className} ${style.cropClass}`,
    };
  });
}
