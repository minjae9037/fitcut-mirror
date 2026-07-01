"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, EyeOff, Loader2, RotateCcw } from "lucide-react";

export type AdminStatusActionConfig = {
  statuses: Array<{
    label: string;
    status: string;
    tone: "approve" | "neutral" | "danger";
  }>;
  table: string;
};

export function AdminStatusActions({
  action,
  itemId,
}: {
  action: AdminStatusActionConfig;
  itemId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  async function updateStatus(status: string) {
    setMessage("");

    try {
      const response = await fetch("/api/admin/status/", {
        body: JSON.stringify({
          id: itemId,
          status,
          table: action.table,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      const result = (await response.json()) as {
        accepted?: boolean;
        reason?: string;
      };

      if (!response.ok) {
        setMessage("상태 변경 실패");
        return;
      }

      if (!result.accepted) {
        setMessage(
          result.reason === "supabase_not_configured"
            ? "Supabase 연결 대기"
            : "상태 변경 대기",
        );
        return;
      }

      setMessage("변경 완료");
      startTransition(() => router.refresh());
    } catch {
      setMessage("네트워크 오류");
    }
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {action.statuses.map((item) => (
        <button
          className={`inline-flex h-8 items-center justify-center gap-1 rounded-md border px-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
            item.tone === "approve"
              ? "border-[#6fc48d]/40 bg-[#173522] text-[#b7e3bb] hover:bg-[#21462d]"
              : item.tone === "danger"
                ? "border-[#ffad9d]/42 bg-[#391c17] text-[#ffb8aa] hover:bg-[#4a231d]"
                : "border-white/10 bg-white/5 text-[#b8aa95] hover:bg-white/10"
          }`}
          disabled={isPending}
          key={item.status}
          onClick={() => updateStatus(item.status)}
          type="button"
        >
          {isPending ? (
            <Loader2 aria-hidden="true" className="animate-spin" size={13} />
          ) : item.tone === "approve" ? (
            <Check aria-hidden="true" size={13} />
          ) : item.tone === "danger" ? (
            <EyeOff aria-hidden="true" size={13} />
          ) : (
            <RotateCcw aria-hidden="true" size={13} />
          )}
          {item.label}
        </button>
      ))}
      {message ? (
        <span className="text-xs font-semibold text-[#8f826f]">{message}</span>
      ) : null}
    </div>
  );
}
