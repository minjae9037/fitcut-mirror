"use client";

import { Copy, Download, Share2 } from "lucide-react";
import { useState } from "react";

type MirilookShareActionsProps = {
  text: string;
  title: string;
};

export function MirilookShareActions({ text, title }: MirilookShareActionsProps) {
  const [status, setStatus] = useState("");

  function printReport() {
    window.print();
    setStatus("브라우저 인쇄 창에서 PDF 저장을 선택할 수 있습니다.");
  }

  async function shareReport() {
    const url = window.location.href;

    try {
      if (typeof navigator.share === "function") {
        await navigator.share({
          text,
          title,
          url,
        });
        setStatus("공유 앱으로 연결했습니다.");
        return;
      }

      await navigator.clipboard.writeText(url);
      setStatus("공유 링크를 클립보드에 복사했습니다.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setStatus("공유를 취소했습니다.");
        return;
      }

      setStatus("공유가 차단되었습니다. 주소창의 링크를 직접 복사해 주세요.");
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setStatus("공유 링크를 클립보드에 복사했습니다.");
    } catch {
      setStatus("클립보드 복사가 차단되었습니다. 주소창의 링크를 직접 복사해 주세요.");
    }
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#f3d28a] px-3 text-sm font-bold text-[#1a1712] transition hover:bg-[#ffdf98]"
          onClick={printReport}
          type="button"
        >
          <Download aria-hidden="true" size={15} />
          PDF 저장
        </button>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#c9a96a]/50 px-3 text-sm font-semibold text-[#f3d28a] transition hover:bg-[#f3d28a]/10"
          onClick={() => void shareReport()}
          type="button"
        >
          <Share2 aria-hidden="true" size={15} />
          카톡/공유
        </button>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-white/12 px-3 text-sm font-semibold text-[#e7dccb] transition hover:bg-white/8"
          onClick={() => void copyLink()}
          type="button"
        >
          <Copy aria-hidden="true" size={15} />
          링크 복사
        </button>
      </div>
      {status ? (
        <p className="text-xs leading-5 text-[#b8aa95]">{status}</p>
      ) : null}
    </div>
  );
}
