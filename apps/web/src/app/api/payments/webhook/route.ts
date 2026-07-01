import { Webhook } from "@portone/server-sdk";
import {
  getEntitlementExpiresAt,
  getPaymentProduct,
  getPaymentProductFromPaymentId,
} from "@/lib/mirilook-payments";
import { readServerEnv } from "@/lib/server/env";
import { creditHairMoneyForPayment } from "@/lib/server/hair-money";
import { recordPaymentEvent } from "@/lib/server/payment-events";
import {
  getPaymentOrder,
  updatePaymentOrderStatus,
} from "@/lib/server/payment-orders";
import {
  describePortOneError,
  verifyPortOnePayment,
} from "@/lib/server/portone";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  const webhookSecret = readServerEnv("PORTONE_WEBHOOK_SECRET");
  const rawBody = await request.text();

  if (!webhookSecret) {
    return Response.json(
      {
        accepted: false,
        reason: "portone_webhook_secret_not_configured",
      },
      { status: 503 },
    );
  }

  let webhook: unknown;

  try {
    webhook = await Webhook.verify(webhookSecret, rawBody, {
      "webhook-id": request.headers.get("webhook-id") ?? undefined,
      "webhook-signature": request.headers.get("webhook-signature") ?? undefined,
      "webhook-timestamp": request.headers.get("webhook-timestamp") ?? undefined,
    });
  } catch (error) {
    console.error("PortOne webhook verification failed", error);

    return Response.json(
      {
        accepted: false,
        error: describePortOneError(error),
        reason: "portone_webhook_verification_failed",
      },
      { status: 400 },
    );
  }

  const eventType = readWebhookType(webhook);
  const paymentId = readWebhookPaymentId(webhook);

  if (!paymentId) {
    return Response.json({
      accepted: true,
      reason: "webhook_without_payment_id",
      type: eventType,
    });
  }

  const order = await getPaymentOrder(paymentId);
  const product = order
    ? getPaymentProduct(order.productId)
    : getPaymentProductFromPaymentId(paymentId);
  const verification = product
    ? await verifyPortOnePayment({ paymentId, product })
    : null;
  const profileId = order?.profileId ?? null;
  const recordStatus = getWebhookRecordStatus(eventType, verification);
  const record = await recordPaymentEvent({
    actualAmount: verification?.actualAmount ?? null,
    currency: verification?.currency ?? null,
    entitlement: product?.entitlement ?? null,
    entitlementExpiresAt:
      product?.entitlement && verification?.ok
        ? getEntitlementExpiresAt(product)
        : null,
    eventType,
    expectedAmount: product?.amount ?? null,
    failureReason: getWebhookFailureReason(product, verification),
    paymentId,
    productId: product?.id ?? "unknown",
    profileId,
    rawPayload: {
      order,
      verification: verification
        ? {
            actualAmount: verification.actualAmount,
            configured: verification.configured,
            currency: verification.currency,
            ok: verification.ok,
            reason: verification.ok ? null : verification.reason,
            status: verification.ok ? verification.status : verification.status,
          }
        : null,
      webhook,
    },
    status: recordStatus,
    verified: Boolean(verification?.ok),
  });

  await updatePaymentOrderStatus(paymentId, recordStatus);

  const hairMoney =
    product && verification?.ok
      ? await creditHairMoneyForPayment({
          paymentId,
          product,
          profileId,
        })
      : null;

  if (!record.recorded && record.reason === "supabase_upsert_failed") {
    return Response.json(
      {
        accepted: false,
        hairMoney,
        reason: record.reason,
        verified: Boolean(verification?.ok),
      },
      { status: 500 },
    );
  }

  return Response.json({
    accepted: true,
    hairMoney,
    paymentId,
    reason: !record.recorded ? record.reason : undefined,
    recorded: record.recorded,
    type: eventType,
    verified: Boolean(verification?.ok),
  });
}

function getWebhookFailureReason(
  product: ReturnType<typeof getPaymentProductFromPaymentId>,
  verification: Awaited<ReturnType<typeof verifyPortOnePayment>> | null,
) {
  if (!product) {
    return "unknown_payment_product";
  }

  if (!verification) {
    return "missing_payment_verification";
  }

  return verification.ok ? null : verification.reason;
}

function getWebhookRecordStatus(
  eventType: string | null,
  verification: Awaited<ReturnType<typeof verifyPortOnePayment>> | null,
) {
  if (verification?.ok) {
    return "paid_verified";
  }

  if (verification && !verification.ok) {
    return verification.status || `verification_failed:${verification.reason}`;
  }

  return eventType ? `webhook:${eventType}` : "webhook_received";
}

function readWebhookPaymentId(webhook: unknown) {
  if (!webhook || typeof webhook !== "object" || !("data" in webhook)) {
    return null;
  }

  const data = webhook.data;

  if (!data || typeof data !== "object" || !("paymentId" in data)) {
    return null;
  }

  return typeof data.paymentId === "string" ? data.paymentId : null;
}

function readWebhookType(webhook: unknown) {
  if (!webhook || typeof webhook !== "object" || !("type" in webhook)) {
    return null;
  }

  return typeof webhook.type === "string" ? webhook.type : null;
}
