"use client";

import { PlayCircle, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const asset = (path: string) => `${basePath}${path}`;

const guidelineVideoSources = [
  { src: asset("/guideline/mirilook-guideline.mp4"), type: "video/mp4" },
  { src: asset("/guideline/mirilook-guideline.webm"), type: "video/webm" },
];

const guidelineGifSrc = asset("/guideline/mirilook-guideline.gif");

export function MirilookGuidelineVideoDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [showGifFallback, setShowGifFallback] = useState(false);
  const [isMediaUnavailable, setIsMediaUnavailable] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || showGifFallback || isMediaUnavailable) {
      return;
    }

    const video = videoRef.current;

    if (!video) {
      return;
    }

    video.defaultMuted = false;
    video.muted = false;
    video.volume = 1;
    video.currentTime = 0;
    void video.play().catch(() => undefined);
  }, [isMediaUnavailable, isOpen, showGifFallback]);

  function closeDialog() {
    const video = videoRef.current;

    if (video) {
      video.pause();
      video.currentTime = 0;
    }

    setIsOpen(false);
  }

  function openDialog() {
    setShowGifFallback(false);
    setIsMediaUnavailable(false);
    setIsOpen(true);
  }

  return (
    <>
      <button
        className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-lg border border-[#f3d28a]/45 bg-[#171511]/82 px-4 py-3 text-center text-sm font-black text-[#f3d28a] shadow-lg shadow-black/20 transition hover:border-[#f3d28a] hover:bg-[#2a2116] hover:text-[#fff4d8]"
        onClick={openDialog}
        type="button"
      >
        <PlayCircle aria-hidden="true" size={18} />
        <span className="grid leading-tight">
          <span>가이드라인</span>
          <span className="text-xs text-[#d8cbb8]">(Guideline)</span>
        </span>
      </button>

      {isOpen ? (
        <div
          aria-labelledby="guideline-video-title"
          aria-modal="true"
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/72 px-4 py-6 backdrop-blur-sm"
          role="dialog"
        >
          <button
            aria-label="닫기"
            className="absolute inset-0 cursor-default"
            onClick={closeDialog}
            type="button"
          />
          <section className="relative z-10 w-full max-w-4xl overflow-hidden rounded-lg border border-white/12 bg-[#11100e] shadow-2xl shadow-black/60">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
              <h2
                className="text-base font-bold text-[#fffaf1]"
                id="guideline-video-title"
              >
                미리룩 이용 가이드라인
              </h2>
              <button
                aria-label="닫기"
                className="inline-flex size-9 items-center justify-center rounded-md border border-white/10 text-[#d8cbb8] transition hover:border-[#f3d28a]/60 hover:text-[#f3d28a]"
                onClick={closeDialog}
                type="button"
              >
                <X aria-hidden="true" size={18} />
              </button>
            </div>

            <div className="bg-black">
              {isMediaUnavailable ? (
                <div className="flex aspect-[32/21] items-center justify-center px-6 text-center text-sm font-semibold leading-6 text-[#d8cbb8]">
                  가이드라인 영상이 준비되면 이 창에서 재생됩니다.
                </div>
              ) : showGifFallback ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt="미리룩 이용 가이드라인"
                  className="aspect-[32/21] w-full object-contain"
                  onError={() => setIsMediaUnavailable(true)}
                  src={guidelineGifSrc}
                />
              ) : (
                <video
                  className="aspect-[32/21] w-full bg-black object-contain"
                  autoPlay
                  controls
                  onError={() => setShowGifFallback(true)}
                  playsInline
                  poster={asset("/mock/premium-salon-suite.png")}
                  preload="metadata"
                  ref={videoRef}
                >
                  {guidelineVideoSources.map((source) => (
                    <source key={source.src} src={source.src} type={source.type} />
                  ))}
                </video>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
