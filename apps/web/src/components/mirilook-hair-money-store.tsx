"use client";

import * as PortOne from "@portone/browser-sdk/v2";
import {
  Check,
  ChevronRight,
  Coins,
  CreditCard,
  Gift,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { MirilookGenerationRefundNotice } from "@/components/mirilook-generation-refund-notice";
import {
  formatHairMoney,
  HairMoneyRecommendationCost,
  HairMoneyRecommendationPriceKrw,
  HairMoneyUnitPriceKrw,
  MirilookHairMoneyProducts,
} from "@/lib/mirilook-payments";
import { getSupabaseAccessToken } from "@/lib/supabase-browser";
import { trackEvent } from "@/lib/mirilook-analytics";

type HairMoneyLedgerItem = {
  amount: number;
  balanceAfter: number;
  createdAt: string;
  direction: "credit" | "debit" | "refund" | "adjustment";
  id: string;
  reason: string | null;
  sourceId: string;
  sourceType: string;
};

type HairMoneyWalletResponse = {
  balance?: number;
  ledger?: HairMoneyLedgerItem[];
  reason?: string;
  recommendationCost?: number;
  synced?: boolean;
};

type CheckoutResponse = {
  amount?: number;
  buyer?: {
    email?: string | null;
    name?: string | null;
  };
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
  hairMoney?: {
    amount: number;
    applied: boolean;
    balance: number;
    reason?: string;
    synced: boolean;
  } | null;
  reason?: string;
  verified?: boolean;
};

export function MirilookHairMoneyStore() {
  const products = useMemo(() => [...MirilookHairMoneyProducts].reverse(), []);
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id ?? "");
  const [wallet, setWallet] = useState<HairMoneyWalletResponse>({
    balance: 0,
    ledger: [],
    recommendationCost: HairMoneyRecommendationCost,
    synced: false,
  });
  const [status, setStatus] = useState("Hair Money 잔액을 확인하는 중입니다.");
  const [needsLogin, setNeedsLogin] = useState(false);
  const [isLoadingWallet, setIsLoadingWallet] = useState(true);
  const [isPaying, setIsPaying] = useState(false);

  const selectedProduct =
    products.find((product) => product.id === selectedProductId) ?? products[0];

  useEffect(() => {
    void refreshWallet();
  }, []);

  async function refreshWallet() {
    setIsLoadingWallet(true);
    setNeedsLogin(false);

    try {
      const token = await getSupabaseAccessToken();

      if (!token) {
        setNeedsLogin(true);
        setWallet({
          balance: 0,
          ledger: [],
          recommendationCost: HairMoneyRecommendationCost,
          synced: false,
        });
        setStatus(
          "로그인하면 보유 Hair Money와 결제/사용 내역이 계정에 연결됩니다.",
        );
        return;
      }

      const response = await fetch("/api/payments/hair-money/", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const result = (await response.json().catch(() => ({
        balance: 0,
        ledger: [],
        reason: `server_${response.status}`,
        synced: false,
      }))) as HairMoneyWalletResponse;

      setWallet({
        ...result,
        ledger: result.ledger ?? [],
      });
      setNeedsLogin(result.reason === "not_authenticated");
      setStatus(buildWalletStatus(result));
    } catch (error) {
      console.error(error);
      setStatus("Hair Money 잔액 확인이 지연되고 있습니다.");
    } finally {
      setIsLoadingWallet(false);
    }
  }

  async function startPayment() {
    if (!selectedProduct) {
      return;
    }

    setIsPaying(true);
    setNeedsLogin(false);
    setStatus(`${selectedProduct.name} 결제 정보를 준비하는 중입니다.`);
    trackEvent("checkout_started", {
      amount: selectedProduct.amount,
      productId: selectedProduct.id,
    });

    try {
      const token = await getSupabaseAccessToken();

      if (!token) {
        setNeedsLogin(true);
        setStatus("Hair Money 충전은 로그인된 계정에 적립됩니다.");
        return;
      }

      const response = await fetch("/api/payments/checkout/", {
        body: JSON.stringify({
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

      if (!response.ok || !checkout.configured) {
        setStatus(getCheckoutErrorMessage(checkout.reason));
        setNeedsLogin(checkout.reason === "not_authenticated");
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
        customer: buildPortOneCustomer(checkout),
        customData: {
          productId: checkout.productId,
          productKind: selectedProduct.productKind,
          source: "mirilook_hair_money_store",
        },
        orderName: checkout.orderName,
        payMethod: "CARD",
        paymentId: checkout.paymentId,
        productType: "DIGITAL",
        products: [
          {
            amount: checkout.amount,
            code: selectedProduct.id,
            id: selectedProduct.id,
            name: selectedProduct.name,
            quantity: 1,
            tag: "hair_money",
          },
        ],
        redirectUrl: `${window.location.origin}/store`,
        storeId: checkout.storeId,
        totalAmount: checkout.amount,
      });

      if (!payment) {
        setStatus("결제창이 닫혔습니다.");
        return;
      }

      if (typeof payment.code === "string" && payment.code) {
        setStatus(payment.message || "결제가 완료되지 않았습니다.");
        return;
      }

      const completeResponse = await fetch("/api/payments/complete/", {
        body: JSON.stringify({
          amount: checkout.amount,
          paymentId: checkout.paymentId,
          productId: checkout.productId,
          status:
            "transactionType" in payment &&
            typeof payment.transactionType === "string"
              ? payment.transactionType
              : "paid",
        }),
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const complete = (await completeResponse.json().catch(() => ({
        reason: `server_${completeResponse.status}`,
        verified: false,
      }))) as PaymentCompleteResponse;

      if (!completeResponse.ok || !complete.verified) {
        setStatus(getPaymentCompleteMessage(complete.reason));
        return;
      }

      if (complete.hairMoney?.synced) {
        setWallet((current) => ({
          ...current,
          balance: complete.hairMoney?.balance ?? current.balance,
          recommendationCost: HairMoneyRecommendationCost,
          synced: true,
        }));
        setStatus(
          `${formatHairMoney(complete.hairMoney.amount)} Hair Money 충전이 완료되었습니다. 현재 잔액은 ${formatHairMoney(complete.hairMoney.balance)} HM입니다.`,
        );
        void refreshWallet();
        return;
      }

      setStatus(
        "결제는 확인되었습니다. Hair Money 적립 상태는 서버 저장소를 다시 확인합니다.",
      );
      void refreshWallet();
    } catch (error) {
      console.error(error);
      setStatus(getPaymentClientErrorMessage(error));
    } finally {
      setIsPaying(false);
    }
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="grid gap-5">
        <section className="rounded-md border border-[#2b281f] bg-[#171511]/92 p-4 shadow-2xl shadow-black/35 backdrop-blur md:p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2">
                <Wallet aria-hidden="true" className="text-[#f3d28a]" size={19} />
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#f3d28a]">
                  Store Balance
                </p>
              </div>
              <h2 className="mt-3 text-xl font-semibold text-[#fffaf1] md:text-2xl">
                Hair Money를 충전하세요
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#b8aa95]">
                PortOne 결제가 확인되면 로그인한 계정 지갑에 즉시 적립됩니다.
                헤어스타일 추천을 요청할 때마다 {HairMoneyRecommendationCost} HM
                ({HairMoneyRecommendationPriceKrw.toLocaleString("ko-KR")}원 기준)이
                차감되고, 생성 결과와 사용 내역으로 기록됩니다.
              </p>
              <MirilookGenerationRefundNotice className="mt-3" />
            </div>

            <button
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md border border-[#c9a96a]/45 bg-[#201a12]/78 px-4 text-sm font-bold text-[#f3d28a] transition hover:bg-[#2b2216] md:w-fit"
              onClick={() => void refreshWallet()}
              type="button"
            >
              {isLoadingWallet ? (
                <Loader2 aria-hidden="true" className="animate-spin" size={17} />
              ) : (
                <RefreshCw aria-hidden="true" size={17} />
              )}
              잔액 새로고침
            </button>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <SummaryTile
              icon={<CoinMark />}
              label="보유 Hair Money"
              value={isLoadingWallet ? "확인 중" : `${formatHairMoney(wallet.balance)} HM`}
            />
            <SummaryTile
              label="추천 1회 차감"
              value={`${HairMoneyRecommendationCost} HM`}
              helper={`${HairMoneyRecommendationPriceKrw.toLocaleString("ko-KR")}원 기준`}
            />
            <SummaryTile
              label="선택 상품"
              value={`${formatHairMoney(selectedProduct?.hairMoneyAmount)} HM`}
              helper={`${(selectedProduct?.amount ?? 0).toLocaleString("ko-KR")}원`}
            />
          </div>
        </section>

        <section className="rounded-md border border-[#2b281f] bg-[#171511]/92 p-4 shadow-2xl shadow-black/35 backdrop-blur md:p-5">
          <div className="flex flex-col gap-3 border-b border-white/10 pb-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Coins aria-hidden="true" className="text-[#f3d28a]" size={18} />
                <h2 className="text-lg font-semibold text-[#fffaf1]">
                  충전 패키지
                </h2>
              </div>
              <p className="mt-2 text-sm leading-6 text-[#b8aa95]">
                할인 없이 1 Hair Money를 {HairMoneyUnitPriceKrw.toLocaleString("ko-KR")}원으로
                환산합니다. 충전한 Hair Money는 회원 계정에 적립되고 추천 사용 시 차감됩니다.
              </p>
            </div>
            <span className="w-fit rounded-md border border-[#f3d28a]/30 bg-[#30271a]/60 px-3 py-2 text-xs font-bold text-[#f3d28a]">
              PortOne PG
            </span>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {products.map((product) => {
              const selected = product.id === selectedProduct?.id;

              return (
                <button
                  aria-pressed={selected}
                  className={`min-h-44 rounded-md border p-4 text-left transition ${
                    selected
                      ? "border-[#f3d28a] bg-[#30271a]/82 shadow-lg shadow-[#f3d28a]/5"
                      : "border-white/10 bg-[#0f0e0c]/72 hover:border-[#f3d28a]/45 hover:bg-[#15130f]"
                  }`}
                  key={product.id}
                  onClick={() => setSelectedProductId(product.id)}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <CoinMark />
                        <p className="truncate text-sm font-semibold text-[#fffaf1]">
                          Hair Money
                        </p>
                      </div>
                      <p className="mt-3 text-3xl font-black text-[#fffaf1]">
                        {formatHairMoney(product.hairMoneyAmount)}
                        {product.discountLabel ? (
                          <span className="ml-2 align-middle text-sm font-semibold text-[#f3d28a]">
                            {product.discountLabel}
                          </span>
                        ) : null}
                      </p>
                    </div>
                    {product.badge ? (
                      <span className="shrink-0 rounded-md border border-[#25c7f2]/35 bg-[#123544] px-2 py-1 text-xs font-bold text-[#9ae8ff]">
                        {product.badge}
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-3 text-sm leading-6 text-[#b8aa95]">
                    {product.description}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {product.perks.map((perk) => (
                      <span
                        className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-xs font-semibold text-[#d8cbb8]"
                        key={perk}
                      >
                        {perk}
                      </span>
                    ))}
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <span className="text-xl font-bold text-[#f3d28a]">
                      {product.amount.toLocaleString("ko-KR")}원
                    </span>
                    <span
                      className={`inline-flex size-7 items-center justify-center rounded-md border ${
                        selected
                          ? "border-[#f3d28a] bg-[#f3d28a] text-[#1a1712]"
                          : "border-white/10 text-[#8f826f]"
                      }`}
                    >
                      <Check aria-hidden="true" size={15} />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <LedgerSection ledger={wallet.ledger ?? []} />

        <section className="rounded-md border border-[#c9a96a]/40 bg-[#0f0e0c]/72 p-4">
          <a
            className="flex w-full items-center justify-between gap-3 text-left transition hover:opacity-90"
            href="/community"
          >
            <span className="inline-flex min-w-0 items-center gap-3">
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-[#241d14] text-[#f3d28a]">
                <Gift aria-hidden="true" size={20} />
              </span>
              <span>
                <span className="block text-sm font-bold text-[#fffaf1]">
                  무료 Hair Money 미션 — 피드 공유
                </span>
                <span className="mt-1 block text-sm text-[#8f826f]">
                  커뮤니티 피드에 사진·상담 결과를 공유하면 게시글마다 Hair Money
                  1개를 드립니다.
                </span>
              </span>
            </span>
            <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[#f3d28a]">
              +1 적립
              <ChevronRight aria-hidden="true" size={16} />
            </span>
          </a>
        </section>
      </div>

      <aside className="grid h-fit gap-4 rounded-md border border-[#2b281f] bg-[#171511]/92 p-4 shadow-2xl shadow-black/35 backdrop-blur md:p-5 xl:sticky xl:top-5">
        <div className="flex items-center gap-2">
          <CreditCard aria-hidden="true" className="text-[#f3d28a]" size={18} />
          <h2 className="text-lg font-semibold text-[#fffaf1]">결제 확인</h2>
        </div>

        <div className="rounded-md border border-[#f3d28a]/30 bg-[#30271a]/55 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#b8aa95]">
            Selected
          </p>
          <p className="mt-2 text-lg font-bold text-[#fffaf1]">
            {selectedProduct?.name}
          </p>
          <p className="mt-1 text-sm text-[#f3d28a]">
            {(selectedProduct?.amount ?? 0).toLocaleString("ko-KR")}원 ·{" "}
            {formatHairMoney(selectedProduct?.hairMoneyAmount)} Hair Money
          </p>
        </div>

        <button
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#f3d28a] px-4 text-sm font-bold text-[#1a1712] transition hover:bg-[#ffdf98] disabled:cursor-not-allowed disabled:bg-[#4a412e] disabled:text-[#b8aa95]"
          disabled={isPaying}
          onClick={() => void startPayment()}
          type="button"
        >
          {isPaying ? (
            <Loader2 aria-hidden="true" className="animate-spin" size={17} />
          ) : (
            <CreditCard aria-hidden="true" size={17} />
          )}
          Hair Money 충전하기
        </button>

        {needsLogin ? (
          <Link
            className="inline-flex h-11 items-center justify-center rounded-md border border-[#c9a96a]/50 px-3 text-sm font-bold text-[#f3d28a] transition hover:bg-[#f3d28a]/10"
            href="/login"
          >
            로그인하고 충전하기
          </Link>
        ) : null}

        <p className="rounded-md border border-white/10 bg-[#0f0e0c]/72 px-3 py-2 text-sm leading-6 text-[#b8aa95]">
          {status}
        </p>

        <div className="rounded-md border border-white/10 bg-[#0f0e0c]/72 p-3">
          <div className="flex items-center gap-2">
            <ShieldCheck aria-hidden="true" className="text-[#b7e3bb]" size={17} />
            <p className="text-sm font-bold text-[#fffaf1]">사용 규칙</p>
          </div>
          <div className="mt-3 grid gap-2 text-sm leading-6 text-[#b8aa95]">
            <p className="flex gap-2">
              <Check aria-hidden="true" className="mt-1 shrink-0 text-[#b7e3bb]" size={15} />
              추천 요청 시 {HairMoneyRecommendationCost} Hair Money가 차감됩니다.
            </p>
            <p className="flex gap-2">
              <Check aria-hidden="true" className="mt-1 shrink-0 text-[#b7e3bb]" size={15} />
              1 Hair Money는 {HairMoneyUnitPriceKrw.toLocaleString("ko-KR")}원이며,
              추천 1회는 {HairMoneyRecommendationPriceKrw.toLocaleString("ko-KR")}원 기준입니다.
            </p>
            <p className="flex gap-2">
              <Check aria-hidden="true" className="mt-1 shrink-0 text-[#b7e3bb]" size={15} />
              PortOne 결제 상태, 금액, 통화가 모두 맞을 때만 계정 지갑에 적립됩니다.
            </p>
          </div>
        </div>

        <RefundPolicy />
      </aside>
    </section>
  );
}

function LedgerSection({ ledger }: { ledger: HairMoneyLedgerItem[] }) {
  return (
    <section className="rounded-md border border-[#2b281f] bg-[#171511]/92 p-4 shadow-2xl shadow-black/35 backdrop-blur md:p-5">
      <div className="flex items-center gap-2">
        <Wallet aria-hidden="true" className="text-[#f3d28a]" size={18} />
        <h2 className="text-lg font-semibold text-[#fffaf1]">최근 적립/차감 내역</h2>
      </div>

      {ledger.length ? (
        <div className="mt-4 grid gap-2">
          {ledger.map((item) => (
            <div
              className="grid gap-2 rounded-md border border-white/10 bg-[#0f0e0c]/72 p-3 md:grid-cols-[120px_minmax(0,1fr)_auto]"
              key={item.id}
            >
              <span
                className={`w-fit rounded-md px-2 py-1 text-xs font-bold ${
                  item.direction === "debit"
                    ? "bg-[#3a1c1c] text-[#ffb3a6]"
                    : "bg-[#17351f] text-[#b7e3bb]"
                }`}
              >
                {getLedgerDirectionLabel(item.direction)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#fffaf1]">
                  {getLedgerReasonLabel(item)}
                </p>
                <p className="mt-1 text-xs text-[#8f826f]">
                  {formatLedgerDate(item.createdAt)} · 잔액 {formatHairMoney(item.balanceAfter)} HM
                </p>
              </div>
              <p
                className={`text-right text-sm font-bold ${
                  item.direction === "debit" ? "text-[#ffb3a6]" : "text-[#b7e3bb]"
                }`}
              >
                {item.direction === "debit" ? "-" : "+"}
                {formatHairMoney(item.amount)} HM
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-md border border-white/10 bg-[#0f0e0c]/72 p-3 text-sm leading-6 text-[#8f826f]">
          아직 Hair Money 적립/차감 내역이 없습니다. 충전 후 추천을 요청하면 이곳에 기록됩니다.
        </p>
      )}
    </section>
  );
}

function SummaryTile({
  helper,
  icon,
  label,
  value,
}: {
  helper?: string;
  icon?: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-white/10 bg-[#0f0e0c]/72 p-3">
      <div className="flex items-center gap-2">
        {icon}
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8f826f]">
          {label}
        </p>
      </div>
      <p className="mt-3 truncate text-2xl font-bold text-[#fffaf1]">{value}</p>
      {helper ? <p className="mt-1 text-xs font-semibold text-[#8f826f]">{helper}</p> : null}
    </div>
  );
}

function CoinMark() {
  return (
    <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-[#f3d28a]/40 bg-[#30271a] text-[#f3d28a]">
      <Coins aria-hidden="true" size={17} />
    </span>
  );
}

function RefundPolicy() {
  return (
    <section className="rounded-md border border-white/10 bg-[#0f0e0c]/72 p-3">
      <div className="flex items-center gap-2">
        <Sparkles aria-hidden="true" className="text-[#f3d28a]" size={17} />
        <h2 className="text-sm font-bold text-[#fffaf1]">환불 정책 요약</h2>
      </div>
      <ul className="mt-3 grid gap-2 text-xs leading-5 text-[#8f826f]">
        <li>· Hair Money는 유상 충전 사이버머니이며 현재 충전 기준은 1 Hair Money당 {HairMoneyUnitPriceKrw.toLocaleString("ko-KR")}원입니다.</li>
        <li>· 구매 후 사용하지 않은 유상 Hair Money는 관련 법령과 환불정책에 따라 환불 요청할 수 있습니다.</li>
        <li>· 헤어 추천, 이미지 생성, 투표/상담 등 서비스 이용으로 이미 차감된 Hair Money는 원칙적으로 환불 대상에서 제외됩니다.</li>
        <li>· AI 생성 오류 환불은 자동 처리되지 않으며, 회사 귀책 또는 법령상 환불 사유가 확인되는 경우 접수 후 검토합니다.</li>
        <li>· 부정 결제, 중복 결제, 미성년자 결제 등은 PortOne 결제 내역과 운영 정책에 따라 별도로 확인합니다.</li>
      </ul>
      <MirilookGenerationRefundNotice className="mt-3" />
    </section>
  );
}

function buildWalletStatus(result: HairMoneyWalletResponse) {
  if (result.synced) {
    return `현재 사용 가능한 Hair Money는 ${formatHairMoney(result.balance)} HM입니다.`;
  }

  if (result.reason === "not_authenticated") {
    return "로그인하면 보유 Hair Money와 결제 내역이 계정에 연결됩니다.";
  }

  if (result.reason === "supabase_not_configured") {
    return "Hair Money 저장소 연결이 필요합니다.";
  }

  return "Hair Money 잔액 확인이 지연되고 있습니다.";
}

function getCheckoutErrorMessage(reason: string | undefined) {
  switch (reason) {
    case "not_authenticated":
      return "Hair Money 충전은 로그인된 계정에 적립됩니다.";
    case "portone_not_configured":
      return "PortOne 상점 ID와 채널 키가 연결되면 실제 결제를 시작할 수 있습니다.";
    case "supabase_not_configured":
      return "Hair Money 저장을 위한 Supabase 연결이 필요합니다.";
    case "supabase_upsert_failed":
      return "결제 주문 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.";
    default:
      return "결제 정보를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.";
  }
}

function buildPortOneCustomer(checkout: CheckoutResponse) {
  const email = checkout.buyer?.email?.trim();
  const name = checkout.buyer?.name?.trim();

  if (!email && !name) {
    return undefined;
  }

  return {
    email: email || undefined,
    fullName: name || email || "Miri Look customer",
  };
}

function getPaymentClientErrorMessage(error: unknown) {
  const details = readClientPaymentError(error);

  if (!details) {
    return "결제 처리 중 오류가 발생했습니다. 팝업 차단 여부를 확인한 뒤 다시 시도해 주세요.";
  }

  if (details.code === "CANCELED" || details.code === "Cancelled") {
    return "결제가 취소되었습니다. 다시 충전하려면 결제 버튼을 눌러 주세요.";
  }

  return `결제창 호출 중 오류가 발생했습니다. ${details.code ? `[${details.code}] ` : ""}${details.message}`;
}

function readClientPaymentError(error: unknown) {
  if (!error || typeof error !== "object") {
    return null;
  }

  const record = error as Record<string, unknown>;
  const message =
    typeof record.pgMessage === "string"
      ? record.pgMessage
      : typeof record.message === "string"
        ? record.message
        : error instanceof Error
          ? error.message
          : "";

  if (!message) {
    return null;
  }

  return {
    code: typeof record.code === "string" ? record.code : undefined,
    message: message.slice(0, 180),
  };
}

function getPaymentCompleteMessage(reason: string | undefined) {
  switch (reason) {
    case "not_authenticated":
      return "결제 결과를 계정에 연결하려면 먼저 로그인해 주세요.";
    case "payment_order_not_found":
      return "결제 주문을 찾지 못했습니다. 처음부터 다시 결제를 시도해 주세요.";
    case "payment_owner_mismatch":
      return "현재 로그인 계정과 결제 주문 계정이 달라 충전하지 않았습니다.";
    case "payment_product_mismatch":
      return "결제 상품 정보가 주문과 달라 충전하지 않았습니다.";
    case "payment_amount_mismatch":
    case "portone_amount_mismatch":
      return "결제 금액이 상품 금액과 달라 Hair Money를 충전하지 않았습니다.";
    case "payment_currency_mismatch":
    case "portone_currency_mismatch":
      return "결제 통화가 KRW가 아니라 Hair Money를 충전하지 않았습니다.";
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

function getLedgerDirectionLabel(direction: HairMoneyLedgerItem["direction"]) {
  switch (direction) {
    case "credit":
      return "적립";
    case "debit":
      return "차감";
    case "refund":
      return "환불";
    default:
      return "조정";
  }
}

function getLedgerReasonLabel(item: HairMoneyLedgerItem) {
  if (item.reason === "hair_money_purchase") {
    return "PortOne 결제 충전";
  }

  if (item.reason === "style_recommendation") {
    return "헤어스타일 추천 사용";
  }

  if (item.reason === "style_recommendation_failed_refund") {
    return "추천 실패 환불";
  }

  return item.reason || item.sourceType;
}

function formatLedgerDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
