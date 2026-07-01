import { getPaymentProduct } from "@/lib/mirilook-payments";
import { readServerEnv } from "@/lib/server/env";
import { recordPaymentOrder } from "@/lib/server/payment-orders";
import { protectMutationRequest } from "@/lib/server/request-security";
import { getVerifiedSupabaseUser } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";
export const maxDuration = 30;

type CheckoutPayload = {
  buyerEmail?: string;
  buyerName?: string;
  productId?: string;
};

export async function POST(request: Request) {
  const securityError = protectMutationRequest(request, {
    maxBodyBytes: 16 * 1024,
    rateLimit: {
      key: "payments:checkout",
      limit: 30,
      windowMs: 10 * 60 * 1000,
    },
  });

  if (securityError) {
    return securityError;
  }

  let payload: CheckoutPayload;

  try {
    payload = (await request.json()) as CheckoutPayload;
  } catch {
    return Response.json({ error: "Invalid checkout payload." }, { status: 400 });
  }

  const product = getPaymentProduct(payload.productId);

  if (!product) {
    return Response.json({ error: "Unknown payment product." }, { status: 400 });
  }

  const user = await getVerifiedSupabaseUser(request);

  if (!user) {
    return Response.json(
      {
        configured: false,
        reason: "not_authenticated",
      },
      { status: 401 },
    );
  }

  const storeId = readServerEnv("NEXT_PUBLIC_PORTONE_STORE_ID");
  const channelKey = readServerEnv("NEXT_PUBLIC_PORTONE_CHANNEL_KEY");

  if (!storeId || !channelKey) {
    return Response.json({
      configured: false,
      reason: "portone_not_configured",
    });
  }

  const paymentId = buildPaymentId(product.id);
  const buyerEmail = sanitizeText(payload.buyerEmail, 120);
  const buyerName = sanitizeText(payload.buyerName, 60);
  const order = await recordPaymentOrder({
    amount: product.amount,
    buyerEmail,
    buyerName,
    currency: "KRW",
    paymentId,
    productId: product.id,
    profileId: user.id,
    rawPayload: {
      hairMoneyAmount: product.hairMoneyAmount ?? null,
      productKind: product.productKind,
    },
  });

  if (!order.recorded) {
    return Response.json(
      {
        configured: false,
        reason: order.reason,
      },
      { status: order.reason === "supabase_not_configured" ? 503 : 500 },
    );
  }

  return Response.json({
    amount: product.amount,
    buyer: {
      email: buyerEmail,
      name: buyerName,
    },
    channelKey,
    configured: true,
    currency: "KRW",
    orderName: product.name,
    paymentId,
    productId: product.id,
    storeId,
  });
}

function buildPaymentId(productId: string) {
  const nonce = crypto.randomUUID().replace(/-/g, "").slice(0, 18);

  return `mirilook-${productId}-${Date.now()}-${nonce}`;
}

function sanitizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed ? trimmed.slice(0, maxLength) : null;
}
