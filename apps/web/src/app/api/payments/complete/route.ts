import {
  HairMoneyRecommendationCost,
  HairMoneyRecommendationPriceKrw,
  getEntitlementExpiresAt,
  getPaymentProduct,
} from "@/lib/mirilook-payments";
import { creditHairMoneyForPayment } from "@/lib/server/hair-money";
import { queueNotificationEvent } from "@/lib/server/notifications";
import { recordPaymentEvent } from "@/lib/server/payment-events";
import {
  getPaymentOrder,
  updatePaymentOrderStatus,
  type PaymentOrder,
} from "@/lib/server/payment-orders";
import { verifyPortOnePayment } from "@/lib/server/portone";
import { protectMutationRequest } from "@/lib/server/request-security";
import { getVerifiedSupabaseUser } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";
export const maxDuration = 30;

type PaymentCompletePayload = {
  amount?: number;
  paymentId?: string;
  productId?: string;
  status?: string;
};

type PaymentOrderCheck =
  | {
      ok: true;
      order: PaymentOrder;
      product: NonNullable<ReturnType<typeof getPaymentProduct>>;
    }
  | {
      ok: false;
      reason:
        | "payment_amount_mismatch"
        | "payment_currency_mismatch"
        | "payment_order_not_found"
        | "payment_owner_mismatch"
        | "payment_product_mismatch";
      status: number;
    };

export async function POST(request: Request) {
  const securityError = protectMutationRequest(request, {
    maxBodyBytes: 16 * 1024,
    rateLimit: {
      key: "payments:complete",
      limit: 60,
      windowMs: 10 * 60 * 1000,
    },
  });

  if (securityError) {
    return securityError;
  }

  let payload: PaymentCompletePayload;

  try {
    payload = (await request.json()) as PaymentCompletePayload;
  } catch {
    return Response.json({ error: "Invalid payment payload." }, { status: 400 });
  }

  const user = await getVerifiedSupabaseUser(request);

  if (!user) {
    return Response.json(
      {
        reason: "not_authenticated",
        verified: false,
      },
      { status: 401 },
    );
  }

  const paymentId = sanitizeText(payload.paymentId, 140);
  const requestedProduct = getPaymentProduct(payload.productId);

  if (!paymentId || !requestedProduct) {
    return Response.json(
      { error: "Payment id and product are required." },
      { status: 400 },
    );
  }

  const orderCheck = await validatePaymentOrder({
    paymentId,
    requestedProductId: requestedProduct.id,
    userId: user.id,
  });

  if (!orderCheck.ok) {
    return Response.json(
      {
        reason: orderCheck.reason,
        verified: false,
      },
      { status: orderCheck.status },
    );
  }

  const { order, product } = orderCheck;
  const verification = await verifyPortOnePayment({ paymentId, product });
  const entitlementExpiresAt =
    verification.ok && product.entitlement
      ? getEntitlementExpiresAt(product)
      : null;
  const record = await recordPaymentEvent({
    actualAmount: verification.actualAmount,
    buyerEmail: user.email ?? null,
    buyerName: null,
    currency: verification.currency,
    entitlement: product.entitlement ?? null,
    entitlementExpiresAt,
    eventType: "client_complete",
    expectedAmount: product.amount,
    failureReason: verification.ok ? null : verification.reason,
    paymentId,
    profileId: user.id,
    productId: product.id,
    rawPayload: {
      client: {
        amount: Number(payload.amount) || null,
        status: sanitizeText(payload.status, 80),
      },
      order,
      portone: verification.rawPayment,
      verification: sanitizeVerificationForLog(verification),
    },
    status: verification.ok
      ? "paid_verified"
      : verification.status || `verification_failed:${verification.reason}`,
    verified: verification.ok,
  });

  await updatePaymentOrderStatus(
    paymentId,
    verification.ok
      ? "paid_verified"
      : verification.status || `verification_failed:${verification.reason}`,
  );

  if (!verification.configured) {
    return Response.json(
      {
        recorded: record.recorded,
        recordReason: "reason" in record ? record.reason : undefined,
        reason: verification.reason,
        verified: false,
      },
      { status: 503 },
    );
  }

  if (!verification.ok) {
    return Response.json(
      {
        actualAmount: verification.actualAmount,
        currency: verification.currency,
        recorded: record.recorded,
        recordReason: "reason" in record ? record.reason : undefined,
        reason: verification.reason,
        verified: false,
      },
      { status: getVerificationStatusCode(verification.reason) },
    );
  }

  const hairMoney = await creditHairMoneyForPayment({
    paymentId,
    product,
    profileId: user.id,
  });
  const notification = await queueNotificationEvent({
    body:
      product.productKind === "hair_money"
        ? `${product.hairMoneyAmount ?? 0} Hair Money 충전이 확인되었습니다. 스타일 추천 1회당 ${HairMoneyRecommendationCost} Hair Money(${HairMoneyRecommendationPriceKrw.toLocaleString("ko-KR")}원 기준)가 차감됩니다.`
        : `${product.name} 결제가 확인되었습니다. 투표 노출과 알림 작업을 진행할 수 있습니다.`,
    eventType: "payment_verified",
    payload: {
      actualAmount: verification.actualAmount,
      currency: verification.currency,
      hairMoneyAmount: product.hairMoneyAmount ?? null,
      hairMoneyBalance: hairMoney?.balance ?? null,
      paymentId,
      productId: product.id,
    },
    title:
      product.productKind === "hair_money"
        ? "미리룩 Hair Money 충전"
        : "미리룩 결제 확인",
    targetProfileId: user.id,
    url:
      product.productKind === "hair_money"
        ? "/store"
        : product.entitlement === "vote_boost"
          ? "/community"
          : product.entitlement === "salon_pack"
            ? "/salons"
            : "/mypage",
  });

  return Response.json({
    actualAmount: verification.actualAmount,
    currency: verification.currency,
    entitlement: product.entitlement,
    entitlementExpiresAt,
    hairMoney: hairMoney
      ? {
          amount: product.hairMoneyAmount ?? 0,
          applied: hairMoney.applied,
          balance: hairMoney.balance,
          reason: hairMoney.reason,
          synced: hairMoney.synced,
        }
      : null,
    notificationQueued: notification.queued,
    notificationReason: notification.queued ? undefined : notification.reason,
    paymentId,
    recorded: record.recorded,
    recordReason: "reason" in record ? record.reason : undefined,
    verified: true,
  });
}

async function validatePaymentOrder({
  paymentId,
  requestedProductId,
  userId,
}: {
  paymentId: string;
  requestedProductId: string;
  userId: string;
}): Promise<PaymentOrderCheck> {
  const order = await getPaymentOrder(paymentId);

  if (!order) {
    return {
      ok: false,
      reason: "payment_order_not_found",
      status: 404,
    };
  }

  if (order.profileId !== userId) {
    return {
      ok: false,
      reason: "payment_owner_mismatch",
      status: 403,
    };
  }

  if (order.productId !== requestedProductId) {
    return {
      ok: false,
      reason: "payment_product_mismatch",
      status: 409,
    };
  }

  const product = getPaymentProduct(order.productId);

  if (!product) {
    return {
      ok: false,
      reason: "payment_product_mismatch",
      status: 409,
    };
  }

  if (order.amount !== product.amount) {
    return {
      ok: false,
      reason: "payment_amount_mismatch",
      status: 409,
    };
  }

  if (order.currency !== "KRW") {
    return {
      ok: false,
      reason: "payment_currency_mismatch",
      status: 409,
    };
  }

  return {
    ok: true,
    order,
    product,
  };
}

function getVerificationStatusCode(reason: string) {
  if (reason === "portone_lookup_failed") {
    return 502;
  }

  if (reason === "portone_secret_not_configured") {
    return 503;
  }

  return 409;
}

function sanitizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function sanitizeVerificationForLog(
  verification: Awaited<ReturnType<typeof verifyPortOnePayment>>,
) {
  return {
    actualAmount: verification.actualAmount,
    configured: verification.configured,
    currency: verification.currency,
    ok: verification.ok,
    reason: verification.ok ? null : verification.reason,
    status: verification.status,
  };
}
