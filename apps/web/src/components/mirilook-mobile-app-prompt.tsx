"use client";

import { Download, Smartphone, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

const dismissStorageKey = "mirilook-mobile-install-dismissed-at";
const dismissDurationMs = 7 * 24 * 60 * 60 * 1000;

export function MirilookMobileAppPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isDismissed, setIsDismissed] = useState(() =>
    typeof window === "undefined" ? true : wasRecentlyDismissed(),
  );
  const [isStandalone, setIsStandalone] = useState(() =>
    typeof window === "undefined" ? false : isAppStandalone(),
  );
  const [isIosSafari] = useState(() =>
    typeof window === "undefined" ? false : isIosSafariBrowser(),
  );
  const [status, setStatus] = useState("");

  useEffect(() => {
    registerServiceWorker();

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setIsDismissed(wasRecentlyDismissed());
    }

    function handleAppInstalled() {
      setDeferredPrompt(null);
      setIsStandalone(true);
      setStatus("설치가 완료되었습니다.");
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const canInstall = useMemo(
    () => Boolean(deferredPrompt) || isIosSafari,
    [deferredPrompt, isIosSafari],
  );

  if (isDismissed || isStandalone || !canInstall) {
    return null;
  }

  async function installApp() {
    if (!deferredPrompt) {
      setStatus("Safari 공유 메뉴에서 홈 화면에 추가를 선택해 주세요.");
      return;
    }

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;

    setDeferredPrompt(null);

    if (choice.outcome === "accepted") {
      setStatus("설치가 시작되었습니다.");
      return;
    }

    dismissPrompt();
  }

  function dismissPrompt() {
    window.localStorage.setItem(dismissStorageKey, String(Date.now()));
    setIsDismissed(true);
  }

  return (
    <aside className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md rounded-md border border-[#c9a96a]/35 bg-[#171511]/95 p-3 text-[#f8f1e5] shadow-2xl shadow-black/50 backdrop-blur md:bottom-5">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-md border border-[#f3d28a]/40 bg-[#30271a] text-[#f3d28a]">
          <Smartphone aria-hidden="true" size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-[#fffaf1]">
            미리룩 앱으로 열기
          </p>
          <p className="mt-1 text-xs leading-5 text-[#b8aa95]">
            홈 화면에 추가하면 상담 보드와 커뮤니티 화면을 더 빠르게 열 수 있습니다.
          </p>
          {status ? (
            <p className="mt-2 text-xs font-semibold text-[#f3d28a]">
              {status}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-[#f3d28a] px-3 text-xs font-bold text-[#1a1712] transition hover:bg-[#ffdf98]"
              onClick={() => void installApp()}
              type="button"
            >
              <Download aria-hidden="true" size={14} />
              설치
            </button>
            <button
              className="inline-flex h-9 items-center justify-center rounded-md border border-white/12 px-3 text-xs font-semibold text-[#e7dccb] transition hover:bg-white/8"
              onClick={dismissPrompt}
              type="button"
            >
              나중에
            </button>
          </div>
        </div>
        <button
          aria-label="설치 안내 닫기"
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-white/10 text-[#b8aa95] transition hover:bg-white/8 hover:text-[#fffaf1]"
          onClick={dismissPrompt}
          type="button"
        >
          <X aria-hidden="true" size={15} />
        </button>
      </div>
    </aside>
  );
}

function registerServiceWorker() {
  if (
    typeof navigator === "undefined" ||
    !("serviceWorker" in navigator) ||
    (window.location.protocol !== "https:" &&
      window.location.hostname !== "localhost")
  ) {
    return;
  }

  navigator.serviceWorker.register("/sw.js").catch((error) => {
    console.warn("mirilook service worker registration failed", error);
  });
}

function wasRecentlyDismissed() {
  const dismissedAt = Number(window.localStorage.getItem(dismissStorageKey));

  return (
    Number.isFinite(dismissedAt) &&
    Date.now() - dismissedAt < dismissDurationMs
  );
}

function isAppStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
  );
}

function isIosSafariBrowser() {
  const userAgent = window.navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(userAgent);
  const isSafari = /Safari/.test(userAgent) && !/CriOS|FxiOS|EdgiOS/.test(userAgent);

  return isIos && isSafari;
}
