"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Loader2,
  Mail,
  RefreshCw,
  Share2,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  getSupabaseAccessToken,
  getSupabaseHistoryOwnerId,
} from "@/lib/supabase-browser";
import {
  getPrintableReportStatus,
  openPrintableHtmlReport,
} from "@/lib/printable-report";

type HistoryImageItem = {
  assetType?:
    | "final_angle"
    | "makeup_image"
    | "outfit_image"
    | "recommendation_preview"
    | "source_photo";
  displayOrder?: number;
  imageUrl: string;
  label: string;
  reason?: string;
  slot?: string;
  styleName?: string;
  tags?: string[];
};

type ConsultationHistoryItem = {
  audienceName?: string;
  consultingFocusNames?: string[];
  createdAt: string;
  hairColorName: string;
  id: string;
  images: HistoryImageItem[];
  memo?: string;
  ownerId?: string;
  regionName?: string;
  makeupImages?: HistoryImageItem[];
  outfitImages?: HistoryImageItem[];
  recommendationImages?: HistoryImageItem[];
  sourcePhotos?: HistoryImageItem[];
  sourcePhotoCount: number;
  styleId: string;
  styleName: string;
  styleReason?: string;
  styleTags?: string[];
  salonProcess?: string;
  maintenanceAdvice?: string;
  outfitAdvice?: string;
  makeupAdvice?: string;
};

type ShareLinkResult = {
  created: boolean;
  expiresAt?: string;
  reason?: string;
  reused?: boolean;
  shareUrl?: string;
  token?: string;
};

type ShareLinkState = {
  token?: string;
  url: string;
};

type ShareRevokeResult = {
  reason?: string;
  revoked: boolean;
  revokedCount?: number;
};

type DeleteServerResult = {
  deleted: boolean;
  reason?: string;
};

type EmailSendResult = {
  reason?: string;
  sent: boolean;
  shareUrl?: string;
};

type SocialPostPublishResult = {
  accepted?: boolean;
  hairMoneyReward?: {
    alreadyRewarded?: boolean;
    amount?: number;
    applied?: boolean;
    balance?: number | null;
  };
  post?: {
    id?: string;
  };
  reason?: string;
};

function buildFeedShareSuccessMessage(
  base: string,
  reward?: SocialPostPublishResult["hairMoneyReward"],
) {
  if (reward?.applied && reward.amount) {
    return `${base} Hair Money ${reward.amount}개가 적립되었어요.`;
  }

  return base;
}

type ServerHistoryResult = {
  items?: ConsultationHistoryItem[];
  reason?: string;
  synced?: boolean;
};

type HistoryImagePreviewState = {
  images: ConsultationHistoryItem["images"];
  index: number;
  styleName: string;
};

type FeedImageSelectionItem = {
  groupTitle: string;
  id: string;
  image: HistoryImageItem;
  selected: boolean;
};

type FeedSelectionState = {
  images: FeedImageSelectionItem[];
  item: ConsultationHistoryItem;
};

const historyDbName = "mirilook-mirror-history";
const historyStoreName = "consultations";
const maxHistoryFeedImageUploadCount = 24;

export function MirilookHistoryManager() {
  const [items, setItems] = useState<ConsultationHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [emailBusyId, setEmailBusyId] = useState("");
  const [feedBusyId, setFeedBusyId] = useState("");
  const [feedSelection, setFeedSelection] =
    useState<FeedSelectionState | null>(null);
  const [imageBusyId, setImageBusyId] = useState("");
  const [imagePreview, setImagePreview] =
    useState<HistoryImagePreviewState | null>(null);
  const [detailItem, setDetailItem] = useState<ConsultationHistoryItem | null>(
    null,
  );
  const [emailRecipient, setEmailRecipient] = useState("");
  const [status, setStatus] = useState("");
  const [shareLinks, setShareLinks] = useState<Record<string, ShareLinkState>>(
    {},
  );

  useEffect(() => {
    void refreshHistory();
  }, []);

  useEffect(() => {
    if (!imagePreview && !detailItem && !feedSelection) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (imagePreview) {
          setImagePreview(null);
        } else if (feedSelection) {
          setFeedSelection(null);
        } else {
          setDetailItem(null);
        }
      }

      if (imagePreview && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
        event.preventDefault();
        const direction = event.key === "ArrowLeft" ? -1 : 1;

        setImagePreview((current) => {
          if (!current?.images.length) {
            return current;
          }

          return {
            ...current,
            index:
              (current.index + direction + current.images.length) %
              current.images.length,
          };
        });
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [detailItem, feedSelection, imagePreview]);

  async function refreshHistory() {
    setIsLoading(true);
    setStatus("");

    try {
      const [localItems, serverResult] = await Promise.all([
        loadConsultationHistory(),
        loadServerConsultationHistory(),
      ]);
      const serverItems = serverResult.items ?? [];
      const nextItems = mergeHistoryItems(serverItems, localItems);

      setItems(nextItems);
      setStatus(
        buildHistoryLoadStatus({
          itemCount: nextItems.length,
          localCount: localItems.length,
          serverResult,
        }),
      );
    } catch (error) {
      console.error(error);
      setStatus(
        error instanceof Error
          ? error.message
          : "히스토리를 불러오지 못했습니다.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function deleteItem(item: ConsultationHistoryItem) {
    const confirmed = window.confirm(
      `${item.styleName} 결과를 삭제할까요? Supabase가 연결된 경우 서버 히스토리와 저장 이미지도 함께 삭제합니다.`,
    );

    if (!confirmed) {
      return;
    }

    setBusyId(item.id);

    try {
      const serverResult = await deleteConsultationFromServer(item.id);
      await deleteConsultationHistoryItem(item.id);
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      setShareLinks((current) => {
        const next = { ...current };
        delete next[item.id];
        return next;
      });
      setStatus(buildDeleteStatus(serverResult));
    } catch (error) {
      console.error(error);
      setStatus("삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusyId("");
    }
  }

  async function clearHistory() {
    if (!items.length) {
      return;
    }

    const confirmed = window.confirm(
      "이 브라우저에 저장된 미리룩 히스토리를 모두 삭제할까요?",
    );

    if (!confirmed) {
      return;
    }

    setBusyId("clear");

    try {
      const serverResults = await Promise.all(
        items.map((item) => deleteConsultationFromServer(item.id)),
      );
      await clearConsultationHistory();
      setItems([]);
      setShareLinks({});
      setStatus(buildClearDeleteStatus(serverResults));
    } catch (error) {
      console.error(error);
      setStatus("히스토리를 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusyId("");
    }
  }

  async function createShare(item: ConsultationHistoryItem) {
    setBusyId(item.id);
    setStatus("공유 링크를 확인하는 중입니다.");

    try {
      const headers = await buildJsonHeadersWithAuth();
      const response = await fetch("/api/consultations/share/", {
        body: JSON.stringify({
          sessionId: item.id,
          ttlDays: 14,
        }),
        headers,
        method: "POST",
      });
      const result = (await response.json().catch(() => ({
        created: false,
        reason: `server_${response.status}`,
      }))) as ShareLinkResult;

      if (!response.ok || !result.created || !result.shareUrl) {
        setStatus(buildShareStatus(result.reason));
        return;
      }

      setShareLinks((current) => ({
        ...current,
        [item.id]: {
          token: result.token,
          url: result.shareUrl ?? "",
        },
      }));
      setStatus(
        result.reused
          ? "기존 공유 링크를 다시 사용할 수 있습니다. 만료일은 최신 요청 기준으로 갱신했습니다."
          : "공유 링크가 생성되었습니다. 링크를 복사해 전달할 수 있습니다.",
      );
    } catch (error) {
      console.error(error);
      setStatus("공유 링크를 만들지 못했습니다. PDF 저장을 이용해 주세요.");
    } finally {
      setBusyId("");
    }
  }

  async function revokeShare(item: ConsultationHistoryItem) {
    const link = shareLinks[item.id];

    if (!link) {
      return;
    }

    const confirmed = window.confirm(
      `${item.styleName} 공유 링크를 회수할까요? 회수 후 기존 링크로는 상담 보드를 열 수 없습니다.`,
    );

    if (!confirmed) {
      return;
    }

    setBusyId(`revoke-${item.id}`);
    setStatus("공유 링크를 회수하는 중입니다.");

    try {
      const result = await revokeConsultationShare({
        sessionId: item.id,
        token: link.token,
      });

      if (!result.revoked) {
        setStatus(buildShareRevokeStatus(result.reason));
        return;
      }

      setShareLinks((current) => {
        const next = { ...current };
        delete next[item.id];
        return next;
      });
      setStatus(
        result.revokedCount
          ? "공유 링크를 회수했습니다. 기존 링크는 더 이상 열리지 않습니다."
          : "이미 회수되었거나 만료된 공유 링크입니다.",
      );
    } catch (error) {
      console.error(error);
      setStatus("공유 링크를 회수하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusyId("");
    }
  }

  async function copyShareUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setStatus("공유 링크를 클립보드에 복사했습니다.");
    } catch {
      setStatus("클립보드 복사가 차단되었습니다. 링크를 직접 선택해 복사해 주세요.");
    }
  }

  async function nativeShareUrl(item: ConsultationHistoryItem, url: string) {
    try {
      const result = await shareConsultationUrl({
        text: "미리룩에서 만든 헤어 상담 보드입니다.",
        title: `${item.styleName} 상담 결과`,
        url,
      });

      if (result === "cancelled") {
        setStatus("공유를 취소했습니다.");
        return;
      }

      setStatus(
        result === "shared"
          ? "공유 앱으로 연결했습니다. 카카오톡이 보이면 선택해 전달할 수 있습니다."
          : "기기가 직접 공유를 지원하지 않아 링크를 복사했습니다.",
      );
    } catch {
      setStatus("공유가 차단되었습니다. 링크 복사를 이용해 주세요.");
    }
  }

  async function emailItem(item: ConsultationHistoryItem) {
    const recipient = emailRecipient.trim();

    if (!isValidEmailAddress(recipient)) {
      setStatus("이메일 주소를 정확히 입력해 주세요.");
      return;
    }

    setEmailBusyId(item.id);
    setStatus("상담 결과 이메일을 준비하는 중입니다.");

    try {
      const result = await sendConsultationEmail(item, recipient);

      const nextShareUrl = result.shareUrl;

      if (nextShareUrl) {
        setShareLinks((current) => ({
          ...current,
          [item.id]: {
            token: extractShareToken(nextShareUrl),
            url: nextShareUrl,
          },
        }));
      }
      setStatus(buildEmailStatus(result, recipient));
    } catch (error) {
      console.error(error);
      setStatus(
        error instanceof Error
          ? error.message
          : "이메일 전송에 실패했습니다. 잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setEmailBusyId("");
    }
  }

  function openFeedSelectionDialog(item: ConsultationHistoryItem) {
    const images = buildFeedSelectionItems(item);

    if (!images.length) {
      setStatus("피드에 올릴 상담 이미지가 없습니다.");
      return;
    }

    setFeedSelection({
      images,
      item,
    });
  }

  function toggleFeedSelection(imageId: string) {
    setFeedSelection((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        images: current.images.map((image) =>
          image.id === imageId
            ? {
                ...image,
                selected: !image.selected,
              }
            : image,
        ),
      };
    });
  }

  function setAllFeedSelection(selected: boolean) {
    setFeedSelection((current) =>
      current
        ? {
            ...current,
            images: current.images.map((image) => ({
              ...image,
              selected,
            })),
          }
        : current,
    );
  }

  async function publishItemToFeed(
    item: ConsultationHistoryItem,
    selectedImages: HistoryImageItem[],
  ) {
    if (!selectedImages.length) {
      setStatus("피드에 올릴 사진을 1장 이상 선택해 주세요.");
      return;
    }

    setFeedBusyId(item.id);
    setStatus("상담 히스토리를 커뮤니티 피드에 올리는 중입니다.");

    try {
      const token = await getSupabaseAccessToken();

      if (!token) {
        setStatus("로그인 후 상담 히스토리를 피드에 올릴 수 있습니다.");
        return;
      }

      const serverResult = await publishHistorySessionToFeed(
        item,
        token,
        selectedImages,
      );

      if (serverResult.accepted) {
        setStatus(
          buildFeedShareSuccessMessage(
            "상담 히스토리를 커뮤니티 스타일 피드에 올렸습니다.",
            serverResult.hairMoneyReward,
          ),
        );
        setFeedSelection(null);
        return;
      }

      if (!shouldFallbackToImageUpload(serverResult.reason)) {
        setStatus(buildFeedPublishStatus(serverResult.reason));
        return;
      }

      if (!selectedImages.length) {
        setStatus(buildFeedPublishStatus(serverResult.reason));
        return;
      }

      const formData = new FormData();
      formData.append("body", buildHistoryFeedBody(item));
      formData.append("dmPolicy", "allow");
      formData.append("hashtags", buildHistoryFeedHashtags(item));

      for (const [index, image] of selectedImages.entries()) {
        const file = await historyImageToFile(image, item, index);
        formData.append("images", file, file.name);
      }

      const response = await fetch("/api/community/social-posts/", {
        body: formData,
        headers: {
          Authorization: `Bearer ${token}`,
        },
        method: "POST",
      });
      const result = (await response.json().catch(() => ({}))) as SocialPostPublishResult;

      if (!response.ok || !result.accepted) {
        setStatus(buildFeedPublishStatus(result.reason));
        return;
      }

      setStatus(
        buildFeedShareSuccessMessage(
          "상담 히스토리를 커뮤니티 스타일 피드에 올렸습니다.",
          result.hairMoneyReward,
        ),
      );
      setFeedSelection(null);
    } catch (error) {
      console.error(error);
      setStatus("피드에 올리지 못했습니다. 이미지 링크가 만료됐다면 히스토리를 새로고침한 뒤 다시 시도해 주세요.");
    } finally {
      setFeedBusyId("");
    }
  }

  async function downloadImages(item: ConsultationHistoryItem) {
    if (!item.images.length) {
      setStatus("저장할 상담 이미지가 없습니다.");
      return;
    }

    setImageBusyId(item.id);
    setStatus("상담 이미지를 개별 파일로 저장하는 중입니다.");

    try {
      for (const [index, image] of item.images.slice(0, 9).entries()) {
        await downloadImageFile(
          image.imageUrl,
          buildImageFileBaseName(item, image.label, index),
        );
        await wait(120);
      }

      setStatus(
        `${Math.min(item.images.length, 9)}장의 상담 이미지를 저장했습니다. 브라우저가 여러 파일 다운로드를 확인할 수 있습니다.`,
      );
    } catch (error) {
      console.error(error);
      setStatus("이미지 저장 중 일부 파일을 내려받지 못했습니다. PDF 저장 또는 공유 링크를 이용해 주세요.");
    } finally {
      setImageBusyId("");
    }
  }

  function openImagePreview(
    images: HistoryImageItem[],
    index: number,
    styleName: string,
  ) {
    setImagePreview({
      images,
      index,
      styleName,
    });
  }

  function moveImagePreview(direction: -1 | 1) {
    setImagePreview((current) => {
      if (!current?.images.length) {
        return current;
      }

      return {
        ...current,
        index:
          (current.index + direction + current.images.length) %
          current.images.length,
      };
    });
  }

  return (
    <section className="rounded-lg border border-white/12 bg-[#171511]/90 p-4 shadow-2xl shadow-black/40 backdrop-blur md:p-5">
      <div className="flex flex-col gap-4 border-b border-white/10 pb-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles aria-hidden="true" className="text-[#f3d28a]" size={18} />
            <h2 className="text-xl font-semibold text-[#fffaf1]">
              내 상담 히스토리
            </h2>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#b8aa95]">
            이 브라우저에 저장된 상담 결과를 다시 열고, PDF로 저장하거나 공유 링크를 만들 수 있습니다.
            Supabase 전용 프로젝트가 연결되면 같은 화면에서 서버 히스토리와 동기화됩니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="sr-only" htmlFor="history-email">
            상담 결과를 받을 이메일
          </label>
          <input
            className="h-10 min-w-0 rounded-md border border-white/10 bg-[#11100e] px-3 text-sm text-[#fffaf1] outline-none transition placeholder:text-[#8f826f] focus:border-[#f3d28a]/70 sm:w-56"
            id="history-email"
            inputMode="email"
            onChange={(event) => setEmailRecipient(event.target.value)}
            placeholder="공유받을 이메일"
            type="email"
            value={emailRecipient}
          />
          <button
            className="inline-flex h-10 items-center gap-2 rounded-md border border-white/12 px-3 text-sm font-semibold text-[#e7dccb] transition hover:bg-white/8"
            onClick={() => void refreshHistory()}
            type="button"
          >
            <RefreshCw aria-hidden="true" size={15} />
            새로고침
          </button>
          <button
            className="inline-flex h-10 items-center gap-2 rounded-md border border-[#ffad9d]/35 px-3 text-sm font-semibold text-[#ffb8aa] transition hover:bg-[#391c17]"
            disabled={!items.length || busyId === "clear"}
            onClick={() => void clearHistory()}
            type="button"
          >
            {busyId === "clear" ? (
              <Loader2 aria-hidden="true" className="animate-spin" size={15} />
            ) : (
              <Trash2 aria-hidden="true" size={15} />
            )}
            전체 삭제
          </button>
        </div>
      </div>

      {status ? (
        <p className="mt-4 rounded-md border border-white/10 bg-[#0f0e0c]/72 px-3 py-2 text-sm leading-6 text-[#b8aa95]">
          {status}
        </p>
      ) : null}

      {isLoading ? (
        <div className="mt-5 flex min-h-52 items-center justify-center rounded-md border border-[#2b281f] bg-[#0f0e0c]/72 text-[#f3d28a]">
          <Loader2 aria-hidden="true" className="animate-spin" size={34} />
        </div>
      ) : items.length ? (
        <div className="mt-5 grid gap-4">
          {items.map((item) => (
            <article
              className="grid gap-4 rounded-md border border-[#2b281f] bg-[#0f0e0c]/72 p-3 lg:grid-cols-[220px_minmax(0,1fr)]"
              key={item.id}
            >
              <div className="grid grid-cols-3 gap-1 overflow-hidden rounded-md">
                {getHistoryPreviewImages(item, 9).map((image, index) => (
                  <button
                    aria-label={`${item.styleName} ${image.label} 크게 보기`}
                    className="group relative aspect-square overflow-hidden bg-[#11100e] outline-none focus-visible:ring-2 focus-visible:ring-[#f3d28a]"
                    key={`${item.id}-${image.label}`}
                    onClick={() =>
                      openImagePreview(
                        getHistoryPreviewImages(item, 9),
                        index,
                        item.styleName,
                      )
                    }
                    type="button"
                  >
                    <img
                      alt={`${item.styleName} ${image.label}`}
                      className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.04] group-focus-visible:scale-[1.04]"
                      src={image.imageUrl}
                    />
                    <span className="pointer-events-none absolute inset-0 border border-[#f3d28a]/0 transition group-hover:border-[#f3d28a]/70 group-focus-visible:border-[#f3d28a]" />
                  </button>
                ))}
              </div>
              <div className="min-w-0">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <button
                      className="block max-w-full rounded-sm text-left text-lg font-semibold text-[#fffaf1] underline-offset-4 transition hover:text-[#f3d28a] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f3d28a]"
                      onClick={() => setDetailItem(item)}
                      type="button"
                    >
                      {item.styleName}
                    </button>
                    <p className="mt-1 text-sm text-[#b8aa95]">
                      {item.hairColorName} · {formatHistoryDate(item.createdAt)}
                    </p>
                    <p className="mt-1 text-xs text-[#8f826f]">
                      {item.regionName || "한국"} · {item.audienceName || "헤어 상담"} · 원본{" "}
                      {item.sourcePhotos?.length || item.sourcePhotoCount}장 · 추천{" "}
                      {item.recommendationImages?.length ?? 0}장 · 결과 {item.images.length}장
                      {item.outfitImages?.length
                        ? ` · 코디 ${item.outfitImages.length}장`
                        : ""}
                      {item.makeupImages?.length
                        ? ` · 메이크업 ${item.makeupImages.length}장`
                        : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="inline-flex h-10 items-center gap-2 rounded-md bg-[#f3d28a] px-3 text-sm font-bold text-[#1a1712] transition hover:bg-[#ffdf98]"
                      onClick={() =>
                        setStatus(getPrintableReportStatus(openPrintableReport(item)))
                      }
                      type="button"
                    >
                      <Download aria-hidden="true" size={15} />
                      PDF
                    </button>
                    <button
                      className="inline-flex h-10 items-center gap-2 rounded-md border border-[#c9a96a]/50 px-3 text-sm font-semibold text-[#f3d28a] transition hover:bg-[#f3d28a]/10 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-[#8f826f]"
                      disabled={imageBusyId === item.id}
                      onClick={() => void downloadImages(item)}
                      type="button"
                    >
                      {imageBusyId === item.id ? (
                        <Loader2 aria-hidden="true" className="animate-spin" size={15} />
                      ) : (
                        <Download aria-hidden="true" size={15} />
                      )}
                      이미지
                    </button>
                    <button
                      className="inline-flex h-10 items-center gap-2 rounded-md border border-[#c9a96a]/50 px-3 text-sm font-semibold text-[#f3d28a] transition hover:bg-[#f3d28a]/10 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-[#8f826f]"
                      disabled={busyId === item.id}
                      onClick={() => void createShare(item)}
                      type="button"
                    >
                      {busyId === item.id ? (
                        <Loader2 aria-hidden="true" className="animate-spin" size={15} />
                      ) : (
                        <Share2 aria-hidden="true" size={15} />
                      )}
                      공유
                    </button>
                    <button
                      className="inline-flex h-10 items-center gap-2 rounded-md border border-[#c9a96a]/50 px-3 text-sm font-semibold text-[#f3d28a] transition hover:bg-[#f3d28a]/10 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-[#8f826f]"
                      disabled={emailBusyId === item.id}
                      onClick={() => void emailItem(item)}
                      type="button"
                    >
                      {emailBusyId === item.id ? (
                        <Loader2 aria-hidden="true" className="animate-spin" size={15} />
                      ) : (
                        <Mail aria-hidden="true" size={15} />
                      )}
                      이메일
                    </button>
                    <button
                      className="inline-flex h-10 items-center gap-2 rounded-md border border-[#c9a96a]/50 px-3 text-sm font-semibold text-[#f3d28a] transition hover:bg-[#f3d28a]/10 disabled:cursor-not-allowed disabled:border-white/10 disabled:text-[#8f826f]"
                      disabled={feedBusyId === item.id}
                      onClick={() => openFeedSelectionDialog(item)}
                      type="button"
                    >
                      {feedBusyId === item.id ? (
                        <Loader2 aria-hidden="true" className="animate-spin" size={15} />
                      ) : (
                        <Sparkles aria-hidden="true" size={15} />
                      )}
                      피드
                    </button>
                    <button
                      className="inline-flex h-10 items-center gap-2 rounded-md border border-white/12 px-3 text-sm font-semibold text-[#e7dccb] transition hover:bg-white/8"
                      disabled={busyId === item.id}
                      onClick={() => void deleteItem(item)}
                      type="button"
                    >
                      <Trash2 aria-hidden="true" size={15} />
                      삭제
                    </button>
                  </div>
                </div>

                {item.consultingFocusNames?.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.consultingFocusNames.map((name) => (
                      <span
                        className="rounded-md bg-white/7 px-2 py-1 text-xs font-semibold text-[#b8aa95]"
                        key={`${item.id}-${name}`}
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                ) : null}

                {item.memo ? (
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#d8cbb8]">
                    {item.memo}
                  </p>
                ) : null}
                <HistoryAdviceBlocks item={item} />

                {shareLinks[item.id] ? (
                  <div className="mt-3 grid gap-2 rounded-md border border-white/10 bg-[#11100e] p-3 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
                    <a
                      className="truncate text-sm font-semibold text-[#f3d28a] underline-offset-4 hover:underline"
                      href={shareLinks[item.id].url}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {shareLinks[item.id].url}
                    </a>
                    <button
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-[#c9a96a]/50 px-3 text-sm font-semibold text-[#f3d28a] transition hover:bg-[#f3d28a]/10"
                      onClick={() => void nativeShareUrl(item, shareLinks[item.id].url)}
                      type="button"
                    >
                      <Share2 aria-hidden="true" size={15} />
                      카톡/공유
                    </button>
                    <button
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-white/12 px-3 text-sm font-semibold text-[#e7dccb] transition hover:bg-white/8"
                      onClick={() => void copyShareUrl(shareLinks[item.id].url)}
                      type="button"
                    >
                      <Copy aria-hidden="true" size={15} />
                      복사
                    </button>
                    <button
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-[#ffad9d]/35 px-3 text-sm font-semibold text-[#ffb8aa] transition hover:bg-[#391c17] disabled:cursor-not-allowed disabled:border-white/10 disabled:text-[#8f826f]"
                      disabled={busyId === `revoke-${item.id}`}
                      onClick={() => void revokeShare(item)}
                      type="button"
                    >
                      {busyId === `revoke-${item.id}` ? (
                        <Loader2 aria-hidden="true" className="animate-spin" size={15} />
                      ) : (
                        <Trash2 aria-hidden="true" size={15} />
                      )}
                      회수
                    </button>
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-md border border-dashed border-[#c9a96a]/35 bg-[#0f0e0c]/72 p-6 text-center">
          <h3 className="text-lg font-semibold text-[#fffaf1]">
            저장된 결과가 없습니다
          </h3>
          <p className="mt-2 text-sm leading-6 text-[#b8aa95]">
            홈에서 사진을 업로드하고 상담용 9장을 생성한 뒤 “히스토리에 저장”을
            누르면 여기에 표시됩니다.
          </p>
          <Link
            className="mt-4 inline-flex h-10 items-center justify-center rounded-md bg-[#f3d28a] px-4 text-sm font-bold text-[#1a1712]"
            href="/"
          >
            홈에서 시작하기
          </Link>
        </div>
      )}
      {imagePreview ? (
        <HistoryImagePreviewDialog
          onClose={() => setImagePreview(null)}
          onMove={moveImagePreview}
          preview={imagePreview}
        />
      ) : null}
      {detailItem ? (
        <HistoryDetailDialog
          item={detailItem}
          onClose={() => setDetailItem(null)}
          onPreviewImages={(images, index, styleName) =>
            openImagePreview(images, index, styleName)
          }
        />
      ) : null}
      {feedSelection ? (
        <HistoryFeedSelectionDialog
          busy={feedBusyId === feedSelection.item.id}
          onClose={() => setFeedSelection(null)}
          onPublish={() =>
            void publishItemToFeed(
              feedSelection.item,
              feedSelection.images
                .filter((image) => image.selected)
                .map((image) => image.image),
            )
          }
          onSelectAll={() => setAllFeedSelection(true)}
          onToggle={toggleFeedSelection}
          onUnselectAll={() => setAllFeedSelection(false)}
          selection={feedSelection}
        />
      ) : null}
    </section>
  );
}

function HistoryFeedSelectionDialog({
  busy,
  onClose,
  onPublish,
  onSelectAll,
  onToggle,
  onUnselectAll,
  selection,
}: {
  busy: boolean;
  onClose: () => void;
  onPublish: () => void;
  onSelectAll: () => void;
  onToggle: (imageId: string) => void;
  onUnselectAll: () => void;
  selection: FeedSelectionState;
}) {
  const selectedCount = selection.images.filter((image) => image.selected).length;
  const groupedImages = groupFeedSelectionImages(selection.images);
  const portalRoot = typeof document === "undefined" ? null : document.body;

  if (!portalRoot) {
    return null;
  }

  return createPortal(
    <div
      aria-label={`${selection.item.styleName} 피드 사진 선택`}
      aria-modal="true"
      className="fixed left-0 top-0 z-[1000] grid h-[100dvh] w-[100dvw] place-items-center overflow-hidden bg-black/80 p-2 backdrop-blur-sm sm:p-3 md:p-6"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="flex max-h-[calc(100dvh-1rem)] min-h-0 w-full max-w-6xl flex-col overflow-hidden rounded-md border border-[#2b281f] bg-[#171511] shadow-2xl shadow-black/70 sm:max-h-[calc(100dvh-1.5rem)] md:max-h-[calc(100dvh-3rem)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="shrink-0 border-b border-white/10 px-3 py-2.5 sm:px-4 sm:py-3 md:px-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <p className="truncate text-lg font-bold text-[#fffaf1]">
                피드에 올릴 사진 선택
              </p>
              <p className="mt-1 text-sm text-[#b8aa95]">
                {selection.item.styleName} · 기본은 전체 업로드입니다. 제외할 사진을 누르면 체크가 해제됩니다.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <button
                className="inline-flex h-9 items-center rounded-md border border-white/12 px-3 text-xs font-bold text-[#d8cbb8] transition hover:bg-white/8"
                onClick={onSelectAll}
                type="button"
              >
                전체 선택
              </button>
              <button
                className="inline-flex h-9 items-center rounded-md border border-white/12 px-3 text-xs font-bold text-[#d8cbb8] transition hover:bg-white/8"
                onClick={onUnselectAll}
                type="button"
              >
                전체 해제
              </button>
              <button
                aria-label="닫기"
                className="inline-flex size-9 items-center justify-center rounded-md border border-white/12 bg-[#11100e] text-[#e7dccb] transition hover:bg-white/10"
                onClick={onClose}
                type="button"
              >
                <X aria-hidden="true" size={18} />
              </button>
            </div>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:px-4 sm:py-4 md:px-5">
          <div className="grid gap-6">
            {groupedImages.map(([groupTitle, images]) => (
              <section key={groupTitle}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-base font-bold text-[#fffaf1]">
                    {groupTitle}
                  </h3>
                  <span className="rounded-md bg-white/7 px-2 py-1 text-xs font-semibold text-[#b8aa95]">
                    {images.filter((image) => image.selected).length}/{images.length}장
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                  {images.map((image) => (
                    <button
                      aria-label={`${image.groupTitle} ${image.image.label} ${
                        image.selected ? "업로드 포함" : "업로드 제외"
                      }`}
                      aria-pressed={image.selected}
                      className={`group relative min-w-0 overflow-hidden rounded-md border bg-[#0f0e0c] text-left outline-none transition focus-visible:ring-2 focus-visible:ring-[#f3d28a] ${
                        image.selected
                          ? "border-[#f3d28a] shadow-[0_0_0_1px_rgba(243,210,138,0.24)]"
                          : "border-white/10 opacity-45 hover:opacity-80"
                      }`}
                      key={image.id}
                      onClick={() => onToggle(image.id)}
                      type="button"
                    >
                      <img
                        alt={`${image.groupTitle} ${image.image.label}`}
                        className="aspect-square w-full object-cover"
                        src={image.image.imageUrl}
                      />
                      <span
                        className={`absolute right-2 top-2 inline-flex size-7 items-center justify-center rounded-full border text-xs font-bold transition ${
                          image.selected
                            ? "border-[#f3d28a] bg-[#f3d28a] text-[#171511]"
                            : "border-white/35 bg-black/60 text-transparent"
                        }`}
                      >
                        {image.selected ? <Check aria-hidden="true" size={16} /> : null}
                      </span>
                      <span className="block truncate px-2 py-2 text-xs font-semibold text-[#d8cbb8]">
                        {image.image.styleName ?? image.image.label}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
        <div className="shrink-0 border-t border-white/10 px-3 py-2.5 sm:px-4 sm:py-3 md:px-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm font-semibold text-[#d8cbb8]">
              선택된 사진 {selectedCount}/{selection.images.length}장
            </p>
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#f3d28a] px-5 text-sm font-bold text-[#171511] transition hover:bg-[#f6dc9f] disabled:cursor-not-allowed disabled:opacity-55"
              disabled={busy || selectedCount === 0}
              onClick={onPublish}
              type="button"
            >
              {busy ? (
                <Loader2 aria-hidden="true" className="animate-spin" size={16} />
              ) : (
                <Sparkles aria-hidden="true" size={16} />
              )}
              피드에 올리기
            </button>
          </div>
        </div>
      </div>
    </div>,
    portalRoot,
  );
}

function HistoryDetailDialog({
  item,
  onClose,
  onPreviewImages,
}: {
  item: ConsultationHistoryItem;
  onClose: () => void;
  onPreviewImages: (
    images: HistoryImageItem[],
    index: number,
    styleName: string,
  ) => void;
}) {
  const sourcePhotos = item.sourcePhotos?.slice(0, 3) ?? [];
  const recommendationImages = item.recommendationImages?.slice(0, 9) ?? [];
  const resultImages = item.images.slice(0, 9);
  const outfitImages = item.outfitImages?.slice(0, 16) ?? [];
  const makeupImages = item.makeupImages?.slice(0, 4) ?? [];

  return (
    <div
      aria-label={`${item.styleName} 상담 히스토리 상세`}
      aria-modal="true"
      className="fixed left-0 top-0 z-[1000] grid h-[100dvh] w-[100dvw] place-items-center overflow-hidden bg-black/80 p-2 backdrop-blur-sm sm:p-3 md:p-6"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="flex max-h-[calc(100dvh-1rem)] w-full max-w-6xl flex-col overflow-hidden rounded-md border border-[#2b281f] bg-[#171511] shadow-2xl shadow-black/70 sm:max-h-[calc(100dvh-1.5rem)] md:max-h-[calc(100dvh-3rem)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3 md:px-5">
          <div className="min-w-0">
            <p className="truncate text-lg font-bold text-[#fffaf1]">
              {item.styleName}
            </p>
            <p className="mt-1 text-sm text-[#b8aa95]">
              {item.hairColorName} · {formatHistoryDate(item.createdAt)}
            </p>
          </div>
          <button
            aria-label="닫기"
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-md border border-white/12 bg-[#11100e] text-[#e7dccb] transition hover:bg-white/10"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-4 py-4 md:px-5">
          <div className="grid gap-6">
            <HistoryImageGridSection
              emptyText="저장된 원본 사진 이력이 없습니다."
              images={sourcePhotos}
              onPreviewImages={onPreviewImages}
              styleName={`${item.styleName} 원본 사진`}
              title="원본 사진"
            />
            <HistoryImageGridSection
              emptyText="저장된 추천 스타일 이미지가 없습니다."
              images={recommendationImages}
              onPreviewImages={onPreviewImages}
              styleName={`${item.styleName} 추천 스타일`}
              title="추천 스타일 9장"
            />
            <HistoryImageGridSection
              emptyText="저장된 상담 결과 이미지가 없습니다."
              images={resultImages}
              onPreviewImages={onPreviewImages}
              styleName={`${item.styleName} 상담 결과`}
              title="각도별 상담 이미지 9장"
            />
            {outfitImages.length ? (
              <HistoryImageGridSection
                emptyText="저장된 코디 추천 이미지가 없습니다."
                images={outfitImages}
                onPreviewImages={onPreviewImages}
                styleName={`${item.styleName} 코디 추천`}
                title="코디 추천"
              />
            ) : null}
            {makeupImages.length ? (
              <HistoryImageGridSection
                emptyText="저장된 메이크업 추천 이미지가 없습니다."
                images={makeupImages}
                onPreviewImages={onPreviewImages}
                styleName={`${item.styleName} 메이크업 추천`}
                title="메이크업 추천"
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function HistoryImageGridSection({
  emptyText,
  images,
  onPreviewImages,
  styleName,
  title,
}: {
  emptyText: string;
  images: HistoryImageItem[];
  onPreviewImages: (
    images: HistoryImageItem[],
    index: number,
    styleName: string,
  ) => void;
  styleName: string;
  title: string;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-base font-bold text-[#fffaf1]">{title}</h3>
        <span className="rounded-md bg-white/7 px-2 py-1 text-xs font-semibold text-[#b8aa95]">
          {images.length}장
        </span>
      </div>
      {images.length ? (
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {images.map((image, index) => (
            <button
              aria-label={`${styleName} ${image.label} 크게 보기`}
              className="group min-w-0 overflow-hidden rounded-md border border-white/10 bg-[#0f0e0c] text-left outline-none transition hover:border-[#f3d28a]/70 focus-visible:ring-2 focus-visible:ring-[#f3d28a]"
              key={`${styleName}-${image.label}-${index}`}
              onClick={() => onPreviewImages(images, index, styleName)}
              type="button"
            >
              <img
                alt={`${styleName} ${image.label}`}
                className="aspect-square w-full object-cover transition duration-200 group-hover:scale-[1.03] group-focus-visible:scale-[1.03]"
                src={image.imageUrl}
              />
              <span className="block truncate px-2 py-2 text-xs font-semibold text-[#d8cbb8]">
                {image.styleName ?? image.label}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="rounded-md border border-dashed border-white/12 bg-[#0f0e0c]/72 px-3 py-4 text-sm text-[#8f826f]">
          {emptyText}
        </p>
      )}
    </section>
  );
}

function HistoryImagePreviewDialog({
  onClose,
  onMove,
  preview,
}: {
  onClose: () => void;
  onMove: (direction: -1 | 1) => void;
  preview: HistoryImagePreviewState;
}) {
  const image = preview.images[preview.index];
  const hasMultiple = preview.images.length > 1;

  if (!image) {
    return null;
  }

  return (
    <div
      aria-label="히스토리 이미지 크게 보기"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/84 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="grid w-full max-w-5xl gap-3"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-[#fffaf1]">
              {preview.styleName}
            </p>
            <p className="mt-1 text-sm text-[#b8aa95]">
              {image.label} · {preview.index + 1}/{preview.images.length}
            </p>
          </div>
          <button
            aria-label="닫기"
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-md border border-white/12 bg-[#171511] text-[#e7dccb] transition hover:bg-white/10"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </div>
        <div className="relative overflow-hidden rounded-md border border-[#2b281f] bg-[#0f0e0c] shadow-2xl shadow-black/60">
          <img
            alt={`${preview.styleName} ${image.label}`}
            className="h-auto max-h-[78vh] w-full object-contain"
            src={image.imageUrl}
          />
          {hasMultiple ? (
            <>
              <button
                aria-label="이전 이미지"
                className="absolute left-3 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/55 text-[#fffaf1] transition hover:bg-black/75"
                onClick={() => onMove(-1)}
                type="button"
              >
                <ChevronLeft aria-hidden="true" size={24} />
              </button>
              <button
                aria-label="다음 이미지"
                className="absolute right-3 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/55 text-[#fffaf1] transition hover:bg-black/75"
                onClick={() => onMove(1)}
                type="button"
              >
                <ChevronRight aria-hidden="true" size={24} />
              </button>
            </>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs leading-5 text-[#8f826f]">
            AI 이미지는 상담 참고용 시안이며 실제 시술 결과를 보장하지 않습니다.
          </p>
          <a
            className="inline-flex h-9 items-center justify-center rounded-md border border-[#c9a96a]/50 px-3 text-sm font-semibold text-[#f3d28a] transition hover:bg-[#f3d28a]/10"
            href={image.imageUrl}
            rel="noreferrer"
            target="_blank"
          >
            원본 열기
          </a>
        </div>
      </div>
    </div>
  );
}

function HistoryAdviceBlocks({ item }: { item: ConsultationHistoryItem }) {
  const rows = [
    ["시술", item.salonProcess],
    ["관리", item.maintenanceAdvice],
    ["코디", item.outfitAdvice],
    ["메이크업", item.makeupAdvice],
  ].filter((row): row is [string, string] => Boolean(row[1]?.trim()));

  if (!rows.length) {
    return null;
  }

  return (
    <div className="mt-3 space-y-2">
      {rows.map(([label, value]) => (
        <p
          className="text-xs leading-5 text-[#cfc3b2]"
          key={`${item.id}-${label}`}
        >
          <span className="mr-2 inline-flex rounded-md bg-[#f3d28a]/12 px-2 py-0.5 font-semibold text-[#f3d28a]">
            {label}
          </span>
          {value}
        </p>
      ))}
    </div>
  );
}

async function deleteConsultationFromServer(
  sessionId: string,
): Promise<DeleteServerResult> {
  try {
    const headers = await buildJsonHeadersWithAuth();
    const response = await fetch("/api/consultations/", {
      body: JSON.stringify({ sessionId }),
      headers,
      method: "DELETE",
    });
    const result = (await response.json().catch(() => ({
      deleted: false,
      reason: `server_${response.status}`,
    }))) as DeleteServerResult;

    return response.ok
      ? result
      : {
          deleted: false,
          reason: result.reason ?? `server_${response.status}`,
        };
  } catch (error) {
    console.error(error);

    return {
      deleted: false,
      reason: "network_error",
    };
  }
}

async function revokeConsultationShare({
  sessionId,
  token,
}: {
  sessionId: string;
  token?: string;
}): Promise<ShareRevokeResult> {
  try {
    const headers = await buildJsonHeadersWithAuth();
    const response = await fetch("/api/consultations/share/", {
      body: JSON.stringify({
        sessionId,
        token,
      }),
      headers,
      method: "DELETE",
    });
    const result = (await response.json().catch(() => ({
      reason: `server_${response.status}`,
      revoked: false,
    }))) as ShareRevokeResult;

    return response.ok
      ? result
      : {
          reason: result.reason ?? `server_${response.status}`,
          revoked: false,
        };
  } catch (error) {
    console.error(error);

    return {
      reason: "network_error",
      revoked: false,
    };
  }
}

async function sendConsultationEmail(
  item: ConsultationHistoryItem,
  to: string,
): Promise<EmailSendResult> {
  const headers = await buildJsonHeadersWithAuth();
  const response = await fetch("/api/consultations/email/", {
    body: JSON.stringify({
      item,
      to,
    }),
    headers,
    method: "POST",
  });
  const result = (await response.json().catch(() => ({
    reason: `server_${response.status}`,
    sent: false,
  }))) as EmailSendResult;

  return response.ok
    ? result
    : {
        reason: result.reason ?? `server_${response.status}`,
        sent: false,
      };
}

function buildEmailStatus(result: EmailSendResult, recipient: string) {
  if (result.sent) {
    return result.shareUrl
      ? `상담 결과와 공유 링크를 ${recipient} 주소로 전송했습니다.`
      : `상담 결과를 ${recipient} 주소로 전송했습니다.`;
  }

  if (result.reason === "not_authenticated") {
    return "이메일 전송은 로그인 후 사용할 수 있습니다. 로그인한 뒤 다시 시도해 주세요.";
  }

  if (result.reason === "not_owner") {
    return "다른 계정에 저장된 상담 결과는 이메일로 보낼 수 없습니다.";
  }

  if (result.reason === "supabase_lookup_failed") {
    return "상담 결과 소유권 확인이 지연되었습니다. 잠시 후 다시 시도해 주세요.";
  }

  if (result.reason === "resend_not_configured") {
    return "이메일 발송 키가 아직 연결되지 않았습니다. PDF 저장 또는 공유 링크를 이용해 주세요.";
  }

  if (result.reason === "resend_sender_not_configured") {
    return "이메일 발신자 주소가 아직 설정되지 않았습니다. 관리자 설정 후 다시 시도해 주세요.";
  }

  if (result.reason === "resend_sender_rejected") {
    return "이메일 발신 도메인이 인증되지 않았거나 발신자 주소가 거절되었습니다. 관리자 설정 후 다시 시도해 주세요.";
  }

  if (result.reason === "resend_recipient_rejected") {
    return "이메일 제공자가 수신 주소를 거절했습니다. 수신 이메일 주소를 확인해 주세요.";
  }

  if (result.reason === "resend_send_failed") {
    return "이메일 제공자에서 전송을 거절했습니다. 발신 도메인 또는 수신 주소를 확인해 주세요.";
  }

  return "이메일 전송이 지연되었습니다. PDF 저장 또는 공유 링크를 이용해 주세요.";
}

function buildFeedSelectionItems(item: ConsultationHistoryItem) {
  const groups: Array<{
    assetType: NonNullable<HistoryImageItem["assetType"]>;
    groupTitle: string;
    images: HistoryImageItem[];
  }> = [
    {
      assetType: "source_photo",
      groupTitle: "내가 등록한 사진",
      images: item.sourcePhotos?.slice(0, 3) ?? [],
    },
    {
      assetType: "recommendation_preview",
      groupTitle: "추천 받은 9개 스타일",
      images: item.recommendationImages?.slice(0, 9) ?? [],
    },
    {
      assetType: "final_angle",
      groupTitle: "상담용 이미지 9개",
      images: item.images.slice(0, 9),
    },
  ];

  return groups.flatMap((group) =>
    group.images.map((image, index) => ({
      groupTitle: group.groupTitle,
      id: `${group.assetType}-${index + 1}-${image.label}`,
      image: {
        ...image,
        assetType: image.assetType ?? group.assetType,
        displayOrder: image.displayOrder ?? index + 1,
      },
      selected: true,
    })),
  );
}

function groupFeedSelectionImages(images: FeedImageSelectionItem[]) {
  const groups = new Map<string, FeedImageSelectionItem[]>();

  images.forEach((image) => {
    const current = groups.get(image.groupTitle) ?? [];

    current.push(image);
    groups.set(image.groupTitle, current);
  });

  return Array.from(groups.entries());
}

function getHistoryPreviewImages(item: ConsultationHistoryItem, limit: number) {
  if (item.images.length) {
    return item.images.slice(0, limit);
  }

  if (item.recommendationImages?.length) {
    return item.recommendationImages.slice(0, limit);
  }

  if (item.outfitImages?.length) {
    return item.outfitImages.slice(0, limit);
  }

  if (item.makeupImages?.length) {
    return item.makeupImages.slice(0, limit);
  }

  return (item.sourcePhotos ?? []).slice(0, limit);
}

async function publishHistorySessionToFeed(
  item: ConsultationHistoryItem,
  token: string,
  selectedImages: HistoryImageItem[],
) {
  const selectedAssets = buildSelectedFeedAssetPayload(selectedImages);

  if (selectedAssets.length !== selectedImages.length) {
    return {
      accepted: false,
      reason: "consultation_selection_unavailable",
    } satisfies SocialPostPublishResult;
  }

  const response = await fetch("/api/community/social-posts/", {
    body: JSON.stringify({
      body: buildHistoryFeedBody(item),
      dmPolicy: "allow",
      hashtags: buildHistoryFeedHashtags(item),
      selectedAssets,
      sessionId: item.id,
    }),
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  return (await response.json().catch(() => ({
    accepted: false,
    reason: `server_${response.status}`,
  }))) as SocialPostPublishResult;
}

function buildSelectedFeedAssetPayload(images: HistoryImageItem[]) {
  return images
    .map((image) => {
      if (!image.assetType || typeof image.displayOrder !== "number") {
        return null;
      }

      return {
        assetType: image.assetType,
        displayOrder: image.displayOrder,
      };
    })
    .filter(
      (
        item,
      ): item is {
        assetType: NonNullable<HistoryImageItem["assetType"]>;
        displayOrder: number;
      } => Boolean(item),
    );
}

function shouldFallbackToImageUpload(reason: string | undefined) {
  return [
    "consultation_not_found",
    "consultation_image_read_failed",
    "consultation_image_required",
    "consultation_required",
    "consultation_selection_unavailable",
  ].includes(reason ?? "");
}

function buildHistoryFeedBody(item: ConsultationHistoryItem) {
  const details = [
    item.hairColorName,
    item.regionName,
    item.audienceName,
    ...(item.consultingFocusNames ?? []),
  ].filter(Boolean);
  const advice = [
    item.styleReason,
    item.salonProcess,
    item.maintenanceAdvice,
    item.memo,
  ]
    .filter((value): value is string => Boolean(value?.trim()))
    .slice(0, 3);

  return [
    `${item.styleName} 상담 히스토리`,
    details.length ? details.join(" · ") : "",
    advice.join("\n"),
  ]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 1200);
}

function buildHistoryFeedHashtags(item: ConsultationHistoryItem) {
  const tags = [
    "미리룩",
    "상담후기",
    item.styleName,
    item.hairColorName,
    item.audienceName,
    ...(item.styleTags ?? []),
    ...(item.consultingFocusNames ?? []),
  ]
    .filter((value): value is string => Boolean(value?.trim()))
    .map((value) => `#${value.replace(/\s+/g, "")}`);

  return Array.from(new Set(tags)).slice(0, 8).join(" ");
}

async function historyImageToFile(
  image: HistoryImageItem,
  item: ConsultationHistoryItem,
  index: number,
) {
  const response = await fetch(image.imageUrl);

  if (!response.ok) {
    throw new Error("history_image_fetch_failed");
  }

  const blob = await response.blob();
  const contentType = normalizeHistoryImageContentType(blob.type, image.imageUrl);

  return new File(
    [blob],
    `${slugify(item.styleName) || "history"}-${index + 1}.${imageExtension(contentType)}`,
    {
      type: contentType,
    },
  );
}

function normalizeHistoryImageContentType(contentType: string, imageUrl: string) {
  if (/^image\/(jpeg|png|webp)$/.test(contentType)) {
    return contentType;
  }

  if (/\.png(\?|$)/i.test(imageUrl)) {
    return "image/png";
  }

  if (/\.webp(\?|$)/i.test(imageUrl)) {
    return "image/webp";
  }

  return "image/jpeg";
}

function buildFeedPublishStatus(reason: string | undefined) {
  if (reason === "auth_required") {
    return "로그인 후 피드에 올릴 수 있습니다.";
  }

  if (reason === "not_owner") {
    return "로그인한 계정의 상담 히스토리만 피드에 올릴 수 있습니다.";
  }

  if (reason === "image_required") {
    return "피드에 올릴 상담 이미지가 없습니다.";
  }

  if (reason === "consultation_required" || reason === "consultation_not_found") {
    return "서버 히스토리 저장본을 찾지 못했습니다. 히스토리를 새로고침한 뒤 다시 시도해 주세요.";
  }

  if (reason === "consultation_image_required") {
    return "피드에 올릴 상담 이미지 저장본이 없습니다.";
  }

  if (reason === "consultation_image_read_failed") {
    return "상담 이미지 저장본을 불러오지 못했습니다. 히스토리를 새로고침한 뒤 다시 시도해 주세요.";
  }

  if (reason === "too_many_images") {
    return `피드에는 상담 이미지 ${maxHistoryFeedImageUploadCount}장까지 올릴 수 있습니다.`;
  }

  if (reason === "unsupported_image_type") {
    return "jpg, png, webp 이미지만 피드에 올릴 수 있습니다.";
  }

  if (reason === "storage_upload_failed") {
    return "피드 이미지 업로드에 실패했습니다. 잠시 후 다시 시도해 주세요.";
  }

  if (reason === "supabase_insert_failed") {
    return "피드 게시글 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.";
  }

  return "피드에 올리지 못했습니다. 잠시 후 다시 시도해 주세요.";
}

function isValidEmailAddress(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function buildDeleteStatus(result: DeleteServerResult) {
  if (result.deleted) {
    return "브라우저 히스토리와 서버 저장 결과를 함께 삭제했습니다.";
  }

  if (result.reason === "supabase_not_configured") {
    return "브라우저 히스토리를 삭제했습니다. Supabase 전용 프로젝트 연결 후에는 서버 저장 결과도 함께 삭제됩니다.";
  }

  if (result.reason === "network_error") {
    return "브라우저 히스토리를 삭제했습니다. 네트워크 문제로 서버 삭제 확인은 완료하지 못했습니다.";
  }

  if (result.reason === "not_authenticated") {
    return "브라우저 히스토리를 삭제했습니다. 로그인한 뒤에는 계정 서버 히스토리도 함께 삭제할 수 있습니다.";
  }

  if (result.reason === "not_owner") {
    return "브라우저 히스토리를 삭제했습니다. 다른 계정의 서버 저장 결과는 삭제할 수 없습니다.";
  }

  return "브라우저 히스토리를 삭제했습니다. 서버 저장 결과 삭제는 다시 확인이 필요합니다.";
}

function buildClearDeleteStatus(results: DeleteServerResult[]) {
  if (!results.length) {
    return "브라우저 히스토리를 모두 삭제했습니다.";
  }

  if (results.every((result) => result.deleted)) {
    return "브라우저 히스토리와 서버 저장 결과를 모두 삭제했습니다.";
  }

  if (results.every((result) => result.reason === "supabase_not_configured")) {
    return "브라우저 히스토리를 모두 삭제했습니다. Supabase 전용 프로젝트 연결 후에는 서버 저장 결과도 함께 삭제됩니다.";
  }

  if (results.every((result) => result.reason === "not_authenticated")) {
    return "브라우저 히스토리를 모두 삭제했습니다. 로그인한 뒤에는 계정 서버 히스토리도 함께 삭제할 수 있습니다.";
  }

  const deletedCount = results.filter((result) => result.deleted).length;

  return `브라우저 히스토리를 모두 삭제했습니다. 서버 저장 결과는 ${deletedCount}/${results.length}건 삭제 확인되었습니다.`;
}

function buildShareStatus(reason: string | undefined) {
  if (reason === "supabase_not_configured") {
    return "공유 링크는 Supabase 전용 프로젝트 연결 후 사용할 수 있습니다. 지금은 PDF 저장을 이용해 주세요.";
  }

  if (reason === "not_authenticated" || /not_authenticated/.test(reason ?? "")) {
    return "공유 링크는 로그인한 계정의 서버 히스토리에서 만들 수 있습니다. 먼저 로그인한 뒤 결과를 저장해 주세요.";
  }

  if (reason === "not_owner") {
    return "다른 계정에 저장된 상담 결과는 공유할 수 없습니다.";
  }

  if (reason === "session_not_found") {
    return "서버에 저장된 상담 결과가 없습니다. 홈에서 해당 결과를 다시 저장한 뒤 공유해 주세요.";
  }

  return "공유 링크를 만들지 못했습니다. PDF 저장을 이용해 주세요.";
}

function buildShareRevokeStatus(reason: string | undefined) {
  if (reason === "supabase_not_configured") {
    return "공유 링크 회수는 Supabase 전용 프로젝트 연결 후 사용할 수 있습니다.";
  }

  if (reason === "not_authenticated" || /not_authenticated/.test(reason ?? "")) {
    return "공유 링크 회수는 로그인 후 사용할 수 있습니다.";
  }

  if (reason === "not_owner") {
    return "다른 계정의 공유 링크는 회수할 수 없습니다.";
  }

  if (reason === "network_error") {
    return "네트워크 문제로 공유 링크 회수를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.";
  }

  return "공유 링크를 회수하지 못했습니다. 잠시 후 다시 시도해 주세요.";
}

function buildHistoryLoadStatus({
  itemCount,
  localCount,
  serverResult,
}: {
  itemCount: number;
  localCount: number;
  serverResult: ServerHistoryResult;
}) {
  if (serverResult.synced) {
    return itemCount
      ? `${itemCount}개의 상담 결과를 불러왔습니다. 계정 서버 히스토리와 동기화되었습니다.`
      : "아직 저장된 상담 결과가 없습니다.";
  }

  if (serverResult.reason === "not_authenticated") {
    return localCount
      ? `${localCount}개의 브라우저 상담 결과를 불러왔습니다. 로그인하면 서버 히스토리도 함께 볼 수 있습니다.`
      : "아직 저장된 상담 결과가 없습니다. 로그인하면 이후 결과를 계정 히스토리로 관리할 수 있습니다.";
  }

  if (serverResult.reason === "supabase_not_configured") {
    return localCount
      ? `${localCount}개의 브라우저 상담 결과를 불러왔습니다. Supabase 연결 후 서버 히스토리가 활성화됩니다.`
      : "아직 저장된 상담 결과가 없습니다.";
  }

  if (serverResult.reason) {
    return localCount
      ? `${localCount}개의 브라우저 상담 결과를 불러왔습니다. 서버 히스토리는 잠시 후 다시 확인해 주세요.`
      : "서버 히스토리를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";
  }

  return itemCount
    ? `${itemCount}개의 상담 결과를 불러왔습니다.`
    : "아직 저장된 상담 결과가 없습니다.";
}

async function loadServerConsultationHistory(): Promise<ServerHistoryResult> {
  try {
    const headers = await buildJsonHeadersWithAuth();
    const response = await fetch("/api/consultations/", {
      headers,
      method: "GET",
    });

    const result = (await response.json().catch(() => ({
      items: [],
      reason: `server_${response.status}`,
      synced: false,
    }))) as ServerHistoryResult;

    if (!response.ok) {
      return {
        items: [],
        reason: result.reason ?? `server_${response.status}`,
        synced: false,
      };
    }

    return result;
  } catch (error) {
    console.error(error);

    return {
      items: [],
      reason: "network_error",
      synced: false,
    };
  }
}

function mergeHistoryItems(
  serverItems: ConsultationHistoryItem[],
  localItems: ConsultationHistoryItem[],
) {
  const byId = new Map<string, ConsultationHistoryItem>();

  [...localItems, ...serverItems].forEach((item) => {
    const previous = byId.get(item.id);

    byId.set(item.id, mergeHistoryItem(previous, item));
  });

  return Array.from(byId.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

function mergeHistoryItem(
  previous: ConsultationHistoryItem | undefined,
  next: ConsultationHistoryItem,
) {
  if (!previous) {
    return next;
  }

  return {
    ...previous,
    ...next,
    images: next.images?.length ? next.images : previous.images,
    recommendationImages: next.recommendationImages?.length
      ? next.recommendationImages
      : previous.recommendationImages,
    sourcePhotos: next.sourcePhotos?.length
      ? next.sourcePhotos
      : previous.sourcePhotos,
  };
}

async function loadConsultationHistory() {
  const ownerId = await getSupabaseHistoryOwnerId();
  const db = await openHistoryDb();

  try {
    return await new Promise<ConsultationHistoryItem[]>((resolve, reject) => {
      const transaction = db.transaction(historyStoreName, "readonly");
      const request = transaction.objectStore(historyStoreName).getAll();

      request.onsuccess = () => {
        const items = (request.result as ConsultationHistoryItem[])
          .filter((item) => belongsToHistoryOwner(item, ownerId))
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          );

        resolve(items);
      };
      request.onerror = () => reject(request.error);
      transaction.onerror = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}

function belongsToHistoryOwner(
  item: ConsultationHistoryItem,
  ownerId: string,
) {
  return (item.ownerId ?? "anonymous") === ownerId;
}

async function buildJsonHeadersWithAuth() {
  const token = await getSupabaseAccessToken();

  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    "Content-Type": "application/json",
  };
}

async function deleteConsultationHistoryItem(id: string) {
  const db = await openHistoryDb();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(historyStoreName, "readwrite");
      const request = transaction.objectStore(historyStoreName).delete(id);

      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}

async function clearConsultationHistory() {
  const ownerId = await getSupabaseHistoryOwnerId();
  const db = await openHistoryDb();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(historyStoreName, "readwrite");
      const store = transaction.objectStore(historyStoreName);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        (request.result as ConsultationHistoryItem[])
          .filter((item) => belongsToHistoryOwner(item, ownerId))
          .forEach((item) => store.delete(item.id));
      };
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}

function openHistoryDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error("이 브라우저에서는 상담 히스토리 저장을 지원하지 않습니다."));
      return;
    }

    const request = window.indexedDB.open(historyDbName, 1);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(historyStoreName)) {
        db.createObjectStore(historyStoreName, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function formatHistoryDate(createdAt: string) {
  const date = new Date(createdAt);

  if (Number.isNaN(date.getTime())) {
    return createdAt;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

async function shareConsultationUrl({
  text,
  title,
  url,
}: {
  text: string;
  title: string;
  url: string;
}) {
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({
        text,
        title,
        url,
      });

      return "shared" as const;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return "cancelled" as const;
      }

      throw error;
    }
  }

  await navigator.clipboard.writeText(url);

  return "copied" as const;
}

function openPrintableReport(item: ConsultationHistoryItem) {
  const imageMarkup = item.images
    .map(
      (image) => `
        <figure>
          <img alt="${escapeHtml(item.styleName)} ${escapeHtml(image.label)}" src="${image.imageUrl}" />
          <figcaption>${escapeHtml(image.label)}</figcaption>
        </figure>
      `,
    )
    .join("");
  const adviceMarkup = buildAdviceReportMarkup(item);

  return openPrintableHtmlReport(`
    <!doctype html>
    <html lang="ko">
      <head>
        <meta charset="utf-8" />
        <title>Miri Look ${escapeHtml(item.styleName)}</title>
        <style>
          body { margin: 0; padding: 32px; background: #f5f0e7; color: #171511; font-family: Arial, sans-serif; }
          header { margin-bottom: 24px; border-bottom: 1px solid #c9a96a; padding-bottom: 16px; }
          h1 { margin: 0; font-size: 28px; }
          p { margin: 8px 0 0; color: #5b5144; line-height: 1.6; }
          .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
          figure { margin: 0; overflow: hidden; border: 1px solid #d5c6aa; border-radius: 8px; background: white; }
          img { display: block; width: 100%; aspect-ratio: 1 / 1; object-fit: cover; }
          figcaption { padding: 8px 10px; font-weight: 700; color: #3b3328; }
          @media print { body { background: white; padding: 20px; } }
        </style>
      </head>
      <body>
        <header>
          <h1>미리룩 결과 기록</h1>
          <p>${escapeHtml(item.styleName)} · ${escapeHtml(item.hairColorName)} · ${escapeHtml(item.regionName || "한국")} · ${escapeHtml(formatHistoryDate(item.createdAt))}</p>
          <p>업로드 사진 ${item.sourcePhotoCount}장 기준 · 생성 결과 ${item.images.length}장</p>
          ${item.styleReason ? `<p>추천 이유: ${escapeHtml(item.styleReason)}</p>` : ""}
          ${item.memo ? `<p>요청 메모: ${escapeHtml(item.memo)}</p>` : ""}
        </header>
        ${adviceMarkup}
        <main class="grid">${imageMarkup}</main>
      </body>
    </html>
  `);
}

function buildAdviceReportMarkup(item: ConsultationHistoryItem) {
  const rows = [
    ["시술 과정", item.salonProcess],
    ["관리 포인트", item.maintenanceAdvice],
    ["코디 추천", item.outfitAdvice],
    ["메이크업 추천", item.makeupAdvice],
  ].filter((row): row is [string, string] => Boolean(row[1]?.trim()));

  if (!rows.length) {
    return "";
  }

  return `
    <section style="margin:0 0 24px;padding:16px;border:1px solid #d5c6aa;border-radius:8px;background:#fffaf1">
      <h2 style="margin:0 0 10px;font-size:18px">상담 조언</h2>
      ${rows
        .map(
          ([label, value]) =>
            `<p style="margin:8px 0;color:#5b5144;line-height:1.6"><strong style="color:#171511">${escapeHtml(label)}</strong> ${escapeHtml(value)}</p>`,
        )
        .join("")}
    </section>
  `;
}

async function downloadImageFile(imageUrl: string, fileBaseName: string) {
  const dataImage = parseDataImageMimeType(imageUrl);

  if (dataImage) {
    triggerImageDownload(imageUrl, `${fileBaseName}.${imageExtension(dataImage)}`);
    return;
  }

  try {
    const response = await fetch(imageUrl);

    if (!response.ok) {
      throw new Error(`image_fetch_${response.status}`);
    }

    const blob = await response.blob();

    if (!blob.type.startsWith("image/")) {
      throw new Error("not_image_blob");
    }

    const objectUrl = URL.createObjectURL(blob);

    try {
      triggerImageDownload(objectUrl, `${fileBaseName}.${imageExtension(blob.type)}`);
    } finally {
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 3000);
    }

    return;
  } catch (error) {
    console.warn("history image fetch download failed, falling back to href", error);
  }

  triggerImageDownload(imageUrl, `${fileBaseName}.jpg`);
}

function triggerImageDownload(imageUrl: string, fileName: string) {
  const link = document.createElement("a");

  link.href = imageUrl;
  link.download = fileName;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function buildImageFileBaseName(
  item: ConsultationHistoryItem,
  label: string,
  index: number,
) {
  return [
    "mirilook",
    slugify(item.styleName),
    String(index + 1).padStart(2, "0"),
    slugify(label),
  ]
    .filter(Boolean)
    .join("-");
}

function parseDataImageMimeType(value: string) {
  const match = value.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,/i);

  return match?.[1]?.toLowerCase() ?? "";
}

function imageExtension(mimeType: string) {
  if (mimeType === "image/png") {
    return "png";
  }

  if (mimeType === "image/webp") {
    return "webp";
  }

  return "jpg";
}

function extractShareToken(value: string) {
  try {
    const url = new URL(value);
    const parts = url.pathname.split("/").filter(Boolean);

    return parts[0] === "share" ? parts[1] : undefined;
  } catch {
    return undefined;
  }
}

function slugify(value: string) {
  return (
    value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9가-힣]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "image"
  );
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}
