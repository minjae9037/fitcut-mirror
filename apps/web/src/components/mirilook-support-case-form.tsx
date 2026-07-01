"use client";

import { FormEvent, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { HairMoneyRecommendationCost } from "@/lib/mirilook-payments";

type SupportCaseResult = {
  accepted?: boolean;
  caseId?: string;
  error?: string;
  reason?: string;
};

const caseTypeOptions = [
  { label: "생성 실패", value: "generation_failure" },
  { label: "환불 요청", value: "refund_request" },
  { label: "결제 문제", value: "payment_issue" },
  { label: "계정 문제", value: "account_issue" },
  { label: "내 사진·데이터 삭제 요청", value: "data_deletion" },
  { label: "일반 문의", value: "general_inquiry" },
];

export function MirilookSupportCaseForm() {
  const [caseType, setCaseType] = useState("refund_request");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [paymentId, setPaymentId] = useState("");
  const [requestId, setRequestId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [refundAmountHm, setRefundAmountHm] = useState(
    String(HairMoneyRecommendationCost),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    try {
      const response = await fetch("/api/support/cases/", {
        body: JSON.stringify({
          body,
          caseType,
          contactEmail,
          contactPhone,
          paymentId,
          refundAmountHm:
            caseType === "refund_request" || caseType === "generation_failure"
              ? refundAmountHm
              : undefined,
          requestId,
          subject,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const result = (await response.json()) as SupportCaseResult;

      if (!response.ok || !result.accepted) {
        setMessage(
          result.reason === "supabase_not_configured"
            ? "고객지원 접수 시스템 연결 후 문의를 접수할 수 있습니다."
            : result.error ?? `문의 접수에 실패했습니다. ${result.reason ?? response.status}`,
        );
        return;
      }

      setMessage(
        `문의가 접수되었습니다. 접수번호: ${result.caseId?.slice(0, 8) ?? "확인 중"}`,
      );
      setPaymentId("");
      setRequestId("");
      setSubject("");
      setBody("");
    } catch (error) {
      console.error(error);
      setMessage("문의 접수 요청에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      className="rounded-md border border-[#f3d28a]/24 bg-[#171511]/92 p-4"
      onSubmit={handleSubmit}
    >
      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold text-[#fffaf1]">
          문의 유형
          <select
            className="rounded-md border border-white/10 bg-[#0f0e0c] px-3 py-2 text-[#fffaf1] outline-none focus:border-[#f3d28a]"
            onChange={(event) => setCaseType(event.target.value)}
            value={caseType}
          >
            {caseTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold text-[#fffaf1]">
          연락 이메일
          <input
            className="rounded-md border border-white/10 bg-[#0f0e0c] px-3 py-2 text-[#fffaf1] outline-none placeholder:text-[#6f6658] focus:border-[#f3d28a]"
            onChange={(event) => setContactEmail(event.target.value)}
            placeholder="account@example.com"
            type="email"
            value={contactEmail}
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-[#fffaf1]">
          연락처
          <input
            className="rounded-md border border-white/10 bg-[#0f0e0c] px-3 py-2 text-[#fffaf1] outline-none placeholder:text-[#6f6658] focus:border-[#f3d28a]"
            onChange={(event) => setContactPhone(event.target.value)}
            placeholder="010-0000-0000"
            value={contactPhone}
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-[#fffaf1]">
          결제 ID
          <input
            className="rounded-md border border-white/10 bg-[#0f0e0c] px-3 py-2 text-[#fffaf1] outline-none placeholder:text-[#6f6658] focus:border-[#f3d28a]"
            onChange={(event) => setPaymentId(event.target.value)}
            placeholder="mirilook-..."
            value={paymentId}
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-[#fffaf1]">
          추천 요청 ID
          <input
            className="rounded-md border border-white/10 bg-[#0f0e0c] px-3 py-2 text-[#fffaf1] outline-none placeholder:text-[#6f6658] focus:border-[#f3d28a]"
            onChange={(event) => setRequestId(event.target.value)}
            placeholder="생성 실패 화면 또는 상담 기록의 요청 ID"
            value={requestId}
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-[#fffaf1]">
          환불 H머니
          <input
            className="rounded-md border border-white/10 bg-[#0f0e0c] px-3 py-2 text-[#fffaf1] outline-none placeholder:text-[#6f6658] focus:border-[#f3d28a]"
            min="1"
            onChange={(event) => setRefundAmountHm(event.target.value)}
            type="number"
            value={refundAmountHm}
          />
        </label>
      </div>

      <label className="mt-3 grid gap-2 text-sm font-semibold text-[#fffaf1]">
        제목
        <input
          className="rounded-md border border-white/10 bg-[#0f0e0c] px-3 py-2 text-[#fffaf1] outline-none placeholder:text-[#6f6658] focus:border-[#f3d28a]"
          onChange={(event) => setSubject(event.target.value)}
          placeholder="예: 추천 생성 실패 환불 요청"
          required
          value={subject}
        />
      </label>

      <label className="mt-3 grid gap-2 text-sm font-semibold text-[#fffaf1]">
        문의 내용
        <textarea
          className="min-h-28 rounded-md border border-white/10 bg-[#0f0e0c] px-3 py-2 text-[#fffaf1] outline-none placeholder:text-[#6f6658] focus:border-[#f3d28a]"
          onChange={(event) => setBody(event.target.value)}
          placeholder="문제가 발생한 시간, 화면 상태, 결제/추천 요청 정보를 적어 주세요."
          required
          value={body}
        />
      </label>

      <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-xs leading-5 text-[#8f826f]">
          접수된 문의는 운영자가 결제 이력과 H머니 원장을 확인한 뒤 처리합니다.
        </p>
        <button
          className="inline-flex items-center justify-center gap-2 rounded-md bg-[#f3d28a] px-4 py-3 text-sm font-bold text-[#171511] transition hover:bg-[#ffe0a0] disabled:cursor-not-allowed disabled:opacity-55"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? (
            <Loader2 aria-hidden="true" className="animate-spin" size={16} />
          ) : (
            <Send aria-hidden="true" size={16} />
          )}
          문의 접수
        </button>
      </div>

      {message ? (
        <p className="mt-3 rounded-md border border-[#f3d28a]/22 bg-[#2b2112] px-3 py-2 text-sm leading-6 text-[#f3d28a]">
          {message}
        </p>
      ) : null}
    </form>
  );
}
