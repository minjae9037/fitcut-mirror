"use client";

import { FormEvent, useState } from "react";
import { ChevronDown, Loader2, MessageCircle, Send } from "lucide-react";

type SupportCaseResult = {
  accepted?: boolean;
  caseId?: string;
  emailReason?: string;
  emailSent?: boolean;
  error?: string;
  reason?: string;
};

type StatusTone = "error" | "success";

export function MirilookHomeContactButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [status, setStatus] = useState("");
  const [statusTone, setStatusTone] = useState<StatusTone>("success");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedMessage = message.trim();
    const trimmedContactEmail = contactEmail.trim();

    if (!trimmedMessage) {
      setStatusTone("error");
      setStatus("문의 내용을 입력해 주세요.");
      return;
    }

    if (!isValidEmail(trimmedContactEmail)) {
      setStatusTone("error");
      setStatus("회신 받을 이메일을 입력해 주세요.");
      return;
    }

    setIsSubmitting(true);
    setStatus("");

    const body = [
      trimmedMessage,
      `회신 이메일: ${trimmedContactEmail}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    try {
      const response = await fetch("/api/support/cases/", {
        body: JSON.stringify({
          body,
          caseType: "general_inquiry",
          contactEmail: trimmedContactEmail,
          priority: "normal",
          sourceId: "homepage-contact",
          sourceType: "home_contact",
          subject: "홈페이지 문의",
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const result = (await response.json()) as SupportCaseResult;

      if (!response.ok || !result.accepted) {
        setStatusTone("error");
        setStatus(
          result.reason === "supabase_not_configured"
            ? "문의 저장 시스템 연결을 확인해야 합니다. 잠시 후 다시 시도해 주세요."
            : result.error ?? `문의 발송에 실패했습니다. ${result.reason ?? response.status}`,
        );
        return;
      }

      setStatusTone("success");
      setStatus(
        `문의가 접수되었습니다. 접수번호: ${result.caseId?.slice(0, 8) ?? "확인 중"}`,
      );
      setMessage("");
      setContactEmail("");
    } catch (error) {
      console.error(error);
      setStatusTone("error");
      setStatus("네트워크 오류로 문의를 보내지 못했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full sm:w-80">
      <button
        aria-expanded={isOpen}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#f3d28a]/42 bg-[#171511]/82 px-4 py-3 text-center text-sm font-black text-[#f3d28a] shadow-lg shadow-black/20 transition hover:border-[#f3d28a] hover:bg-[#2a2116] hover:text-[#fff4d8]"
        onClick={() => setIsOpen((value) => !value)}
        type="button"
      >
        <MessageCircle aria-hidden="true" size={18} />
        <span className="grid leading-tight">
          <span>문의하기</span>
          <span className="text-xs text-[#d8cbb8]">Contact</span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`transition ${isOpen ? "rotate-180" : ""}`}
          size={16}
        />
      </button>

      {isOpen ? (
        <form
          className="mt-2 rounded-md border border-[#f3d28a]/22 bg-[#171511]/94 p-3 shadow-xl shadow-black/30"
          onSubmit={handleSubmit}
        >
          <label className="grid gap-2 text-xs font-bold text-[#fffaf1]">
            문의 내용
            <textarea
              className="min-h-28 resize-none rounded-md border border-white/10 bg-[#0f0e0c] px-3 py-2 text-sm leading-6 text-[#fffaf1] outline-none placeholder:text-[#8f826f] focus:border-[#f3d28a]/70"
              maxLength={2000}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="궁금한 점이나 오류 상황을 적어주세요."
              required
              value={message}
            />
          </label>

          <label className="mt-3 grid gap-2 text-xs font-bold text-[#fffaf1]">
            회신 이메일
            <input
              className="h-10 rounded-md border border-white/10 bg-[#0f0e0c] px-3 text-sm text-[#fffaf1] outline-none placeholder:text-[#8f826f] focus:border-[#f3d28a]/70"
              autoComplete="email"
              onChange={(event) => setContactEmail(event.target.value)}
              placeholder="account@example.com"
              required
              type="email"
              value={contactEmail}
            />
          </label>

          <p className="mt-3 rounded-md border border-white/10 bg-[#0f0e0c]/72 px-3 py-2 text-xs leading-5 text-[#d8cbb8]">
            답변은 입력한 이메일로만 보내드립니다.
          </p>

          <button
            className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#f3d28a] px-4 text-sm font-bold text-[#171511] transition hover:bg-[#ffe0a0] disabled:cursor-not-allowed disabled:opacity-55"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? (
              <Loader2 aria-hidden="true" className="animate-spin" size={16} />
            ) : (
              <Send aria-hidden="true" size={16} />
            )}
            발송하기
          </button>

          {status ? (
            <p
              className={`mt-3 rounded-md border px-3 py-2 text-xs leading-5 ${
                statusTone === "error"
                  ? "border-red-400/35 bg-red-950/28 text-red-100"
                  : "border-emerald-400/35 bg-emerald-950/28 text-emerald-100"
              }`}
              role="status"
            >
              {status}
            </p>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
