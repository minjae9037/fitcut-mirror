"use client";

import * as PortOne from "@portone/browser-sdk/v2";
import { CreditCard, Loader2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { MirilookPaymentProducts } from "@/lib/mirilook-payments";
import { getSupabaseAccessToken } from "@/lib/supabase-browser";

type CheckoutResponse = {
  amount?: number;
  channelKey?: string;
  configured?: boolean;
  currency?: "KRW";
  orderName?: string;
  paymentId?: string;
  productId?: string;
  reason?: string;
  storeId?: string;
};

type PaymentCompleteResponse = {
  actualAmount?: number | null;
  recorded?: boolean;
  entitlement?: string;
  entitlementExpiresAt?: string;
  reason?: string;
  recordReason?: string;
  verified?: boolean;
};

type MirilookPaymentPanelProps = {
  description?: string;
  initialProductId?: string;
  onPaymentRecorded?: (result: PaymentCompleteResponse) => void;
  productIds?: string[];
  title?: string;
};

export function MirilookPaymentPanel({
  description = "결제 후 스타일 투표 노출, DM 정책, 상담 공유를 연결하기 위한 PortOne 파일럿 결제 영역입니다.",
  initialProductId,
  onPaymentRecorded,
  productIds,
  title = "유료 투표 / 상담 패키지",
}: MirilookPaymentPanelProps = {}) {
  const availableProducts = useMemo(() => {
    if (!productIds?.length) {
      return MirilookPaymentProducts;
    }

    const allowedProductIds = new Set(productIds);

    return MirilookPaymentProducts.filter((product) =>
      allowedProductIds.has(product.id),
    );
  }, [productIds]);

  const fallbackProductId =
    initialProductId &&
    availableProducts.some((product) => product.id === initialProductId)
      ? initialProductId
      : availableProducts[0]?.id ?? "";

  const [selectedProductId, setSelectedProductId] = useState(
    fallbackProductId,
  );
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [status, setStatus] = useState("");
  const [needsLogin, setNeedsLogin] = useState(false);
  const [isPaying, setIsPaying] = useState(false);

  const effectiveSelectedProductId = availableProducts.some(
    (product) => product.id === selectedProductId,
  )
    ? selectedProductId
    : fallbackProductId;
  const selectedProduct =
    availableProducts.find(
      (product) => product.id === effectiveSelectedProductId,
    ) ??
    availableProducts[0];

  async function startPayment() {
    if (!selectedProduct) {
      return;
    }

    setIsPaying(true);
    setNeedsLogin(false);
    setStatus("결제 정보를 준비하는 중입니다.");

    try {
      const token = await getSupabaseAccessToken();

      if (!token) {
        setNeedsLogin(true);
        setStatus("결제 권한을 계정에 연결하려면 먼저 로그인해 주세요.");
        return;
      }

      const response = await fetch("/api/payments/checkout/", {
        body: JSON.stringify({
          buyerEmail,
          buyerName,
          productId: selectedProduct.id,
        }),
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      const checkout = (await response.json().catch(() => ({
        reason: `server_${response.status}`,
      }))) as CheckoutResponse;

      if (!response.ok) {
        if (checkout.reason === "not_authenticated") {
          setNeedsLogin(true);
          setStatus("결제 권한을 계정에 연결하려면 먼저 로그인해 주세요.");
          return;
        }

        setStatus("결제 정보를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }

      if (!checkout.configured) {
        setStatus(
          "PortOne 전용 상점과 채널 키가 연결되면 실제 결제를 시작할 수 있습니다.",
        );
        return;
      }

      if (
        !checkout.storeId ||
        !checkout.channelKey ||
        !checkout.paymentId ||
        !checkout.orderName ||
        !checkout.amount
      ) {
        setStatus("결제 요청 정보가 완전하지 않습니다.");
        return;
      }

      const payment = await PortOne.requestPayment({
        channelKey: checkout.channelKey,
        currency: checkout.currency ?? "KRW",
        orderName: checkout.orderName,
        payMethod: "CARD",
        paymentId: checkout.paymentId,
        storeId: checkout.storeId,
        totalAmount: checkout.amount,
      });

      if (!payment) {
        setStatus("결제창이 닫혔습니다.");
        return;
      }

      if ("code" in payment) {
        setStatus(payment.message || "결제가 완료되지 않았습니다.");
        return;
      }

      const completeResponse = await fetch("/api/payments/complete/", {
        body: JSON.stringify({
          amount: checkout.amount,
          paymentId: checkout.paymentId,
          productId: checkout.productId,
          status: payment.transactionType ?? "paid",
        }),
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      const completeResult =
        (await completeResponse.json().catch(() => null)) as
          | PaymentCompleteResponse
          | null;

      if (!completeResponse.ok || !completeResult?.verified) {
        if (completeResult?.reason === "not_authenticated") {
          setNeedsLogin(true);
        }

        setStatus(getPaymentCompleteMessage(completeResult?.reason));
        return;
      }

      if (!completeResult.recorded) {
        setStatus(
          "결제는 확인되었습니다. 다만 서버 저장소 연결 전이라 운영자가 PortOne 결제 내역으로 확인합니다.",
        );
        return;
      }

      setStatus(getPaymentSuccessMessage(completeResult, selectedProduct.name));
      onPaymentRecorded?.(completeResult);
    } catch (error) {
      console.error(error);
      setStatus("결제 처리 중 오류가 발생했습니다.");
    } finally {
      setIsPaying(false);
    }
  }

  return (
    <section className="rounded-md border border-[#2b281f] bg-[#171511]/92 p-4">
      <div className="flex items-center gap-2">
        <CreditCard aria-hidden="true" className="text-[#f3d28a]" size={18} />
        <h2 className="text-lg font-semibold text-[#fffaf1]">{title}</h2>
      </div>
      <p className="mt-2 text-sm leading-6 text-[#b8aa95]">
        {description}
      </p>

      <div className="mt-4 grid gap-3">
        {availableProducts.map((product) => {
          const selected = product.id === effectiveSelectedProductId;

          return (
            <button
              className={`rounded-md border p-3 text-left transition ${
                selected
                  ? "border-[#f3d28a] bg-[#30271a] text-[#fffaf1]"
                  : "border-white/10 bg-[#0f0e0c]/72 text-[#d8cbb8] hover:border-[#f3d28a]/50"
              }`}
              key={product.id}
              onClick={() => setSelectedProductId(product.id)}
              type="button"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">{product.name}</p>
                <p className="text-sm font-bold text-[#f3d28a]">
                  {product.amount.toLocaleString("ko-KR")}원
                </p>
              </div>
              <p className="mt-2 text-sm leading-6 text-[#b8aa95]">
                {product.description}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {product.perks.map((perk) => (
                  <span
                    className="rounded-md bg-white/7 px-2 py-1 text-xs font-semibold text-[#b8aa95]"
                    key={perk}
                  >
                    {perk}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-semibold text-[#d8cbb8]">
          이름
          <input
            className="h-11 rounded-md border border-white/10 bg-[#0f0e0c] px-3 text-[#fffaf1] outline-none placeholder:text-[#8f826f] focus:border-[#f3d28a]/70"
            onChange={(event) => setBuyerName(event.target.value)}
            placeholder="결제자 이름"
            value={buyerName}
          />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-[#d8cbb8]">
          이메일
          <input
            className="h-11 rounded-md border border-white/10 bg-[#0f0e0c] px-3 text-[#fffaf1] outline-none placeholder:text-[#8f826f] focus:border-[#f3d28a]/70"
            inputMode="email"
            onChange={(event) => setBuyerEmail(event.target.value)}
            placeholder="영수증/운영 확인용"
            value={buyerEmail}
          />
        </label>
      </div>

      <button
        className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[#f3d28a] px-4 text-sm font-bold text-[#1a1712] transition hover:bg-[#ffdf98] disabled:cursor-not-allowed disabled:bg-[#4a412e] disabled:text-[#b8aa95]"
        disabled={isPaying}
        onClick={() => void startPayment()}
        type="button"
      >
        {isPaying ? (
          <Loader2 aria-hidden="true" className="animate-spin" size={16} />
        ) : (
          <CreditCard aria-hidden="true" size={16} />
        )}
        PortOne 결제 테스트
      </button>

      {status ? (
        <p className="mt-3 rounded-md border border-white/10 bg-[#0f0e0c]/72 px-3 py-2 text-sm leading-6 text-[#b8aa95]">
          {status}
        </p>
      ) : null}
      {needsLogin ? (
        <Link
          className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-md border border-[#c9a96a]/50 px-3 text-sm font-bold text-[#f3d28a] transition hover:bg-[#f3d28a]/10"
          href="/login"
        >
          로그인하고 결제하기
        </Link>
      ) : null}
    </section>
  );
}

function getPaymentSuccessMessage(
  result: PaymentCompleteResponse,
  productName: string,
) {
  if (result.entitlement === "premium_addons") {
    return result.entitlementExpiresAt
      ? `${productName} 결제가 확인되었습니다. ${formatDate(result.entitlementExpiresAt)}까지 코디/메이크업 확장 상담 권한이 활성화됩니다.`
      : `${productName} 결제가 확인되었습니다. 코디/메이크업 확장 상담 권한이 활성화됩니다.`;
  }

  if (result.entitlement === "vote_boost") {
    return "결제가 확인되었습니다. 투표 노출과 알림 준비가 시작됩니다.";
  }

  if (result.entitlement === "salon_pack") {
    return "결제가 확인되었습니다. 상담 보드 저장, 공유, 예약 문의 패키지 권한이 활성화됩니다.";
  }

  return "결제가 확인되었습니다.";
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
  }).format(date);
}

function getPaymentCompleteMessage(reason: string | undefined) {
  switch (reason) {
    case "not_authenticated":
      return "결제 권한을 계정에 연결하려면 먼저 로그인해 주세요.";
    case "portone_amount_mismatch":
      return "결제 금액이 상품 금액과 달라 완료 처리하지 않았습니다.";
    case "portone_currency_mismatch":
      return "결제 통화가 KRW가 아니라 완료 처리하지 않았습니다.";
    case "portone_payment_not_paid":
      return "PortOne에서 아직 결제 완료 상태가 확인되지 않았습니다.";
    case "portone_secret_not_configured":
      return "PortOne 서버 검증 키가 설정되지 않아 결제를 완료 처리할 수 없습니다.";
    case "portone_lookup_failed":
      return "PortOne 결제 조회에 실패했습니다. 잠시 후 다시 확인해 주세요.";
    default:
      return "결제 서버 검증에 실패했습니다. 운영자가 결제 내역을 확인해야 합니다.";
  }
}
