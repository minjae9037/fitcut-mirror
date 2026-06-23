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
  isGenerating?: boolean;
  error?: string;
};

type RenderedResult = {
  label: string;
  imageUrl?: string;
  className?: string;
  isGenerating?: boolean;
  error?: string;
};

const analysisLines = [
  "정면과 측면 사진을 함께 기준으로 보았어요.",
  "얼굴형, 옆 라인, 현재 모발 볼륨을 기준으로 어울릴 가능성이 높은 스타일을 먼저 추천합니다.",
  "마음에 드는 디자인을 누르면 크게 확인하고, 버튼을 눌러 상담용 9장을 생성할 수 있습니다.",
];

const liveAiEnabled = process.env.NEXT_PUBLIC_ENABLE_LIVE_AI === "true";
const apiBaseUrl = (process.env.NEXT_PUBLIC_GENERATION_API_URL ?? "").replace(
  /\/$/,
  "",
);
const uploadImageMaxSide = 1024;
const uploadImageQuality = 0.68;
const previewGenerationConcurrency = 3;
const angleGenerationConcurrency = 4;
const imageRequestRetryCount = 2;
const centerAngleLabel = "정면";

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
  const previewRunRef = useRef(0);
  const renderRunRef = useRef(0);

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
      analysisTimerRef.current = null;
    }

    setIsAnalyzing(false);
    setAnalysisReady(false);
    setSelectedStyleId(null);
    setRenderedResults([]);
    setIsRendering(false);
    setStatusMessage("사진을 업로드용으로 정리하는 중입니다.");
    previewRunRef.current += 1;
    renderRunRef.current += 1;

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
        setStatusMessage(
          "사진이 업로드되었습니다. 나머지 사진 1장을 더 올려주세요.",
        );
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
    const runId = ++previewRunRef.current;

    setIsAnalyzing(true);
    setAnalysisReady(false);
    setSelectedStyleId(null);
    setRenderedResults([]);
    setIsRendering(false);
    setRecommendations(fitcutStyles);
    setAnalysisNotes(analysisLines);
    setStatusMessage(
      liveAiEnabled
        ? "사진을 분석해 어울리는 9개 스타일을 고르는 중입니다."
        : "현재 공개 페이지는 API 키가 없어 mock 추천으로 표시합니다.",
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
        warning?: string;
      };
      const nextRecommendations = (
        payload.recommendations?.length ? payload.recommendations : fitcutStyles
      )
        .slice(0, 9)
        .map((style) => ({
          ...style,
          isGenerating: true,
          imageUrl: undefined,
          error: undefined,
        }));

      if (previewRunRef.current !== runId) {
        return;
      }

      setRecommendations(nextRecommendations);
      setAnalysisNotes(payload.notes?.length ? payload.notes : analysisLines);
      setAnalysisReady(true);
      setStatusMessage(
        payload.warning
          ? "추천 분석이 지연되어 안전한 후보로 먼저 이미지를 생성합니다."
          : "추천 스타일 9개를 찾았습니다. 각 스타일 이미지를 병렬 생성 중입니다.",
      );

      void generateStylePreviews(currentPhotos, nextRecommendations, runId);
    } catch (error) {
      console.error(error);
      setRecommendations(fitcutStyles);
      setAnalysisNotes(analysisLines);
      setStatusMessage(getGenerationFailureMessage(error));
    } finally {
      setIsAnalyzing(false);
      if (previewRunRef.current === runId) {
        setAnalysisReady(true);
      }
    }
  }

  async function generateStylePreviews(
    currentPhotos: Record<PhotoSlot, UploadedPhoto>,
    styles: DisplayRecommendation[],
    runId: number,
  ) {
    let successCount = 0;

    await runWithConcurrency(styles, previewGenerationConcurrency, async (style) => {
      if (previewRunRef.current !== runId) {
        return;
      }

      try {
        const formData = new FormData();
        formData.append("front", currentPhotos.front.file);
        formData.append("side", currentPhotos.side.file);
        appendStylePayload(formData, style);

        const payload = await postFormWithRetry<{ imageUrl?: string }>(
          `${apiBaseUrl}/api/hairstyles/preview/`,
          formData,
        );

        if (!payload.imageUrl) {
          throw new Error("OpenAI did not return an image.");
        }

        successCount += 1;
        updateRecommendation(style.id, {
          imageUrl: payload.imageUrl,
          isGenerating: false,
          error: undefined,
        });
      } catch (error) {
        console.error(error);
        updateRecommendation(style.id, {
          isGenerating: false,
          error:
            error instanceof Error
              ? error.message
              : "헤어 합성 이미지 생성 실패",
        });
      }
    });

    if (previewRunRef.current !== runId) {
      return;
    }

    setStatusMessage(
      successCount > 0
        ? `${successCount}개 추천 이미지가 준비되었습니다. 마음에 드는 카드를 눌러 크게 확인하세요.`
        : "실제 AI 생성에 실패했습니다. 서버 API 키와 배포 설정을 확인해 주세요.",
    );
  }

  function updateRecommendation(
    styleId: FitcutStyleId,
    patch: Partial<DisplayRecommendation>,
  ) {
    setRecommendations((current) =>
      current.map((style) =>
        style.id === styleId
          ? {
              ...style,
              ...patch,
            }
          : style,
      ),
    );
  }

  function previewStyle(style: DisplayRecommendation) {
    renderRunRef.current += 1;
    setSelectedStyleId(style.id);
    setRenderedResults([]);
    setIsRendering(false);
    setStatusMessage(
      style.isGenerating
        ? `${style.name} 이미지를 준비 중입니다.`
        : `${style.name}을 크게 확인 중입니다. 마음에 들면 상담용 9장을 생성하세요.`,
    );
  }

  async function generateConsultationSet(style: DisplayRecommendation) {
    if (!frontPhoto || !sidePhoto) {
      return;
    }

    if (liveAiEnabled && (!style.imageUrl || style.isGenerating || style.error)) {
      setStatusMessage("먼저 선택한 스타일 이미지가 정상 생성되어야 합니다.");
      return;
    }

    const runId = ++renderRunRef.current;

    setSelectedStyleId(style.id);
    setRenderedResults(
      resultAngles.map((angle) => ({
        label: angle.label,
        className: angle.className,
        isGenerating: liveAiEnabled,
      })),
    );
    setIsRendering(true);
    setStatusMessage(
      `${style.name} 선택 이미지를 정면 기준으로 고정하고 나머지 각도를 준비하는 중입니다.`,
    );

    if (!liveAiEnabled) {
      window.setTimeout(() => {
        if (renderRunRef.current !== runId) {
          return;
        }

        setRenderedResults(createMockResults(style, frontPhoto, sidePhoto));
        setIsRendering(false);
      }, 450);
      return;
    }

    try {
      let successCount = 0;
      const selectedPreviewUrl = style.imageUrl;
      const centerAngleIndex = resultAngles.findIndex(
        (angle) => angle.label === centerAngleLabel,
      );
      const centerAngle = resultAngles[centerAngleIndex];
      let baseReference: File | undefined;

      if (centerAngle && selectedPreviewUrl) {
        baseReference = await dataUrlToFile(
          selectedPreviewUrl,
          "fitcut-selected-preview.jpg",
        );

        if (renderRunRef.current !== runId) {
          return;
        }

        successCount = 1;
        updateRenderedResult(centerAngle.label, {
          imageUrl: selectedPreviewUrl,
          isGenerating: false,
          error: undefined,
        });
        setStatusMessage(
          `${style.name} 선택 이미지를 정면 기준으로 사용합니다. 나머지 8장을 병렬 생성 중입니다.`,
        );
      }

      const remainingAngles = Array.from(resultAngles)
        .map((angle, angleIndex) => ({ angle, angleIndex }))
        .filter(({ angle }) => angle.label !== centerAngleLabel);

      await runWithConcurrency(
        remainingAngles,
        angleGenerationConcurrency,
        async ({ angle, angleIndex }) => {
          try {
            if (renderRunRef.current !== runId) {
              return;
            }

            const imageUrl = await requestAngleImage({
              angleIndex,
              baseReference,
              frontPhoto,
              sidePhoto,
              style,
            });

            if (renderRunRef.current !== runId) {
              return;
            }

            successCount += 1;
            updateRenderedResult(angle.label, {
              imageUrl,
              isGenerating: false,
              error: undefined,
            });
          } catch (error) {
            console.error(error);
            updateRenderedResult(angle.label, {
              isGenerating: false,
              error:
                error instanceof Error
                  ? error.message
                  : "상담용 이미지 생성 실패",
            });
          }
        },
      );

      if (renderRunRef.current === runId) {
        setStatusMessage(`${successCount}개 상담용 이미지가 생성되었습니다.`);
      }
    } catch (error) {
      console.error(error);
      setStatusMessage(getGenerationFailureMessage(error, true));
    } finally {
      if (renderRunRef.current === runId) {
        setIsRendering(false);
      }
    }
  }

  async function requestAngleImage({
    angleIndex,
    baseReference,
    frontPhoto,
    sidePhoto,
    style,
  }: {
    angleIndex: number;
    baseReference?: File;
    frontPhoto: UploadedPhoto;
    sidePhoto: UploadedPhoto;
    style: DisplayRecommendation;
  }) {
    const formData = new FormData();
    formData.append("front", frontPhoto.file);
    formData.append("side", sidePhoto.file);
    appendStylePayload(formData, style);
    formData.append("angleIndex", String(angleIndex));

    if (baseReference) {
      formData.append("base", baseReference);
    }

    const payload = await postFormWithRetry<{
      imageUrl?: string;
    }>(`${apiBaseUrl}/api/hairstyles/angle/`, formData);

    if (!payload.imageUrl) {
      throw new Error("OpenAI did not return an image.");
    }

    return payload.imageUrl;
  }

  function updateRenderedResult(
    label: string,
    patch: Partial<RenderedResult>,
  ) {
    setRenderedResults((current) =>
      current.map((result) =>
        result.label === label
          ? {
              ...result,
              ...patch,
            }
          : result,
      ),
    );
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
    previewRunRef.current += 1;
    renderRunRef.current += 1;

    if (frontInputRef.current) {
      frontInputRef.current.value = "";
    }

    if (sideInputRef.current) {
      sideInputRef.current.value = "";
    }
  }

  return (
    <section className="w-full max-w-5xl rounded-lg border border-white/12 bg-[#171511]/88 p-4 shadow-2xl shadow-black/40 backdrop-blur md:p-5">
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

      <div className="grid gap-4 md:grid-cols-2">
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
        <LoadingPanel
          label={
            liveAiEnabled
              ? "사진을 분석하고 스타일 후보를 고르는 중..."
              : "사진 기준으로 어울리는 헤어 디자인을 고르는 중..."
          }
        />
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

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {recommendations.map((style) => (
              <StyleCard
                active={style.id === selectedStyleId}
                frontPhoto={frontPhoto}
                key={style.id}
                onSelect={() => previewStyle(style)}
                style={style}
              />
            ))}
          </div>
        </div>
      ) : null}

      {selectedStyle && frontPhoto && sidePhoto ? (
        <SelectedPreviewPanel
          frontPhoto={frontPhoto}
          isRendering={isRendering}
          onGenerate={() => void generateConsultationSet(selectedStyle)}
          style={selectedStyle}
        />
      ) : null}

      {selectedStyle && renderedResults.length ? (
        <div className="mt-5 grid gap-4 border-t border-white/10 pt-5">
          <div>
            <h3 className="text-xl font-semibold text-[#fffaf1]">
              {selectedStyle.name} 상담용 9장
            </h3>
            <p className="mt-1 text-sm text-[#b8aa95]">
              선택한 이미지를 정면 기준으로 고정하고, 얼굴과 옷 톤을 유지하며 나머지 각도를 생성합니다.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {renderedResults.map((result) => (
              <ResultCard
                key={result.label}
                result={result}
                selectedStyle={selectedStyle}
              />
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
      className={`min-h-64 overflow-hidden rounded-md border text-left transition ${
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
            className="aspect-[5/4] h-full w-full object-cover"
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
        <div className="flex h-full min-h-64 flex-col items-center justify-center gap-4 p-5 text-center">
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

function LoadingPanel({ label }: { label: string }) {
  return (
    <div className="mt-5 flex min-h-44 flex-col items-center justify-center gap-5 rounded-md border border-[#c9a96a]/35 bg-[#30271a]/80 p-6 text-center text-[#f3d28a]">
      <Loader2
        aria-hidden="true"
        className="animate-spin"
        size={64}
        strokeWidth={2.4}
      />
      <p className="text-xl font-bold text-[#fffaf1]">{label}</p>
    </div>
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
  style: DisplayRecommendation;
}) {
  const imageUrl = style.imageUrl ?? (!liveAiEnabled ? frontPhoto.url : "");

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
      <div className="relative aspect-square overflow-hidden">
        {imageUrl ? (
          <img
            alt={`${style.name} 디자인 미리보기`}
            className={`h-full w-full object-cover opacity-92 ${style.cropClass}`}
            src={imageUrl}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-[#15130f] px-4 text-center">
            {style.isGenerating ? (
              <Loader2
                aria-hidden="true"
                className="animate-spin text-[#f3d28a]"
                size={58}
                strokeWidth={2.4}
              />
            ) : null}
            <span className="text-xl font-bold text-[#fffaf1]">
              {style.error ? "생성 실패" : "AI 합성 중"}
            </span>
            <span className="text-sm font-semibold text-[#b8aa95]">
              {style.error ? "다시 업로드 후 재시도" : style.name}
            </span>
          </div>
        )}
        <div
          className={`absolute inset-0 bg-gradient-to-b ${style.accent} via-transparent to-[#0f0e0c]/86`}
        />
        {active && !style.isGenerating && !style.error ? (
          <span className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full bg-[#f3d28a] text-[#1a1712]">
            <Check aria-hidden="true" size={17} />
          </span>
        ) : null}
        {style.error ? (
          <span className="absolute right-3 top-3 rounded-md bg-[#11100e]/85 px-2 py-1 text-xs font-semibold text-[#f3d28a]">
            생성 실패
          </span>
        ) : null}
        <div className="absolute bottom-3 left-3 right-3">
          <p className="text-xl font-semibold text-[#fffaf1]">{style.name}</p>
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

function SelectedPreviewPanel({
  frontPhoto,
  isRendering,
  onGenerate,
  style,
}: {
  frontPhoto: UploadedPhoto;
  isRendering: boolean;
  onGenerate: () => void;
  style: DisplayRecommendation;
}) {
  const imageUrl = style.imageUrl ?? (!liveAiEnabled ? frontPhoto.url : "");
  const canGenerate =
    !isRendering &&
    (!liveAiEnabled || Boolean(imageUrl && !style.isGenerating && !style.error));

  return (
    <section className="mt-5 grid gap-5 border-t border-white/10 pt-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
      <div className="overflow-hidden rounded-md border border-[#c9a96a]/45 bg-[#0f0e0c]">
        <div className="relative aspect-square overflow-hidden">
          {imageUrl ? (
            <img
              alt={`${style.name} 확대 이미지`}
              className={`h-full w-full object-cover opacity-95 ${style.cropClass}`}
              src={imageUrl}
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-5 bg-[#15130f] text-center">
              {style.isGenerating ? (
                <Loader2
                  aria-hidden="true"
                  className="animate-spin text-[#f3d28a]"
                  size={70}
                  strokeWidth={2.4}
                />
              ) : null}
              <p className="text-2xl font-bold text-[#fffaf1]">
                {style.error ? "미리보기 생성 실패" : "이미지 준비 중"}
              </p>
            </div>
          )}
          <div
            className={`absolute inset-0 bg-gradient-to-b ${style.accent} via-transparent to-[#0f0e0c]/88`}
          />
          <div className="absolute bottom-5 left-5 right-5">
            <p className="text-3xl font-semibold text-[#fffaf1]">{style.name}</p>
          </div>
        </div>
      </div>

      <div className="rounded-md border border-[#2b281f] bg-[#0f0e0c]/82 p-5">
        <div className="flex items-center gap-2">
          <Sparkles aria-hidden="true" className="text-[#f3d28a]" size={18} />
          <h3 className="text-xl font-semibold text-[#fffaf1]">선택한 스타일</h3>
        </div>
        <p className="mt-4 text-sm leading-6 text-[#d8cbb8]">{style.reason}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {style.tags.map((tag) => (
            <span
              className="rounded-md bg-white/7 px-2 py-1 text-xs text-[#d8cbb8]"
              key={tag}
            >
              {tag}
            </span>
          ))}
        </div>
        <button
          className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#f3d28a] px-4 text-sm font-bold text-[#1a1712] transition hover:bg-[#ffdf98] disabled:cursor-not-allowed disabled:bg-[#4a412e] disabled:text-[#b8aa95]"
          disabled={!canGenerate}
          onClick={onGenerate}
          type="button"
        >
          {isRendering ? (
            <Loader2 aria-hidden="true" className="animate-spin" size={17} />
          ) : (
            <Sparkles aria-hidden="true" size={17} />
          )}
          {isRendering ? "상담용 9장 생성 중" : "이 스타일로 상담용 9장 생성"}
        </button>
        <p className="mt-3 text-xs leading-5 text-[#a99b87]">
          선택한 사진을 정면 기준으로 그대로 쓰고, 그 기준을 받아 나머지 8개 각도를 병렬로 생성합니다.
        </p>
      </div>
    </section>
  );
}

function ResultCard({
  result,
  selectedStyle,
}: {
  result: RenderedResult;
  selectedStyle: DisplayRecommendation;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-[#2b281f] bg-[#0f0e0c]">
      <div className="relative aspect-square overflow-hidden">
        {result.imageUrl ? (
          <img
            alt={`${selectedStyle.name} ${result.label} 결과`}
            className={`h-full w-full object-cover opacity-92 ${
              result.className ?? ""
            }`}
            src={result.imageUrl}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-[#15130f] px-3 text-center font-semibold text-[#b8aa95]">
            {result.isGenerating ? (
              <Loader2
                aria-hidden="true"
                className="animate-spin text-[#f3d28a]"
                size={58}
                strokeWidth={2.4}
              />
            ) : null}
            <span className="text-lg font-bold text-[#fffaf1]">
              {result.error ? "생성 실패" : "생성 중"}
            </span>
          </div>
        )}
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
      reject(
        new Error(
          "사진을 읽지 못했습니다. 다른 이미지로 다시 시도해 주세요.",
        ),
      );
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

async function dataUrlToFile(dataUrl: string, fileName: string) {
  const response = await fetch(dataUrl);
  const blob = await response.blob();

  return new File([blob], fileName, {
    type: blob.type || "image/jpeg",
  });
}

function appendStylePayload(formData: FormData, style: DisplayRecommendation) {
  formData.append("styleId", style.id);
  formData.append("styleName", style.name);
  formData.append("stylePrompt", style.prompt);
  formData.append("previewPrompt", style.previewPrompt);
}

async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  handler: (item: T) => Promise<void>,
) {
  const queue = [...items];
  const workers = Array.from(
    { length: Math.min(limit, queue.length) },
    async () => {
      while (queue.length) {
        const item = queue.shift();

        if (item !== undefined) {
          await handler(item);
        }
      }
    },
  );

  await Promise.all(workers);
}

async function postFormWithRetry<T>(url: string, formData: FormData) {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= imageRequestRetryCount; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        return (await response.json()) as T;
      }

      const message = await readApiError(response);
      const error = new Error(message);

      if (!isRetriableImageError(response.status, message)) {
        throw error;
      }

      lastError = error;
    } catch (error) {
      const nextError =
        error instanceof Error ? error : new Error(String(error));

      if (!isRetriableImageError(undefined, nextError.message)) {
        throw nextError;
      }

      lastError = nextError;
    }

    if (attempt < imageRequestRetryCount) {
      await wait(1800 + attempt * 2600);
    }
  }

  throw lastError ?? new Error("Image request failed.");
}

function isRetriableImageError(status: number | undefined, message: string) {
  return (
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    /rate limit|timeout|timed out|temporarily|overloaded|socket|network|failed to fetch/i.test(
      message,
    )
  );
}

function wait(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
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

  if (/timeout|timed out|504/i.test(message)) {
    return "이미지 생성 시간이 길어 일부 결과가 실패했습니다. 생성 단위를 나누어 다시 시도합니다.";
  }

  if (/quota|billing|credit|insufficient_quota|payment/i.test(message)) {
    return "OpenAI 크레딧 또는 결제 설정이 필요합니다. Platform에서 Add credits 후 다시 시도해 주세요.";
  }

  if (/model|access|permission|organization/i.test(message)) {
    return "OpenAI 모델 접근 권한 또는 프로젝트 설정을 확인해야 합니다. gpt-image-2 사용 가능 여부를 확인해 주세요.";
  }

  return isRender
    ? "9장 실제 생성에 실패했습니다. 서버 로그를 확인해 주세요."
    : "실제 AI 생성에 실패했습니다. 서버 API 키와 배포 설정을 확인해 주세요.";
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
