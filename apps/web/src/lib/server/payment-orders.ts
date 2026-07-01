import { getSupabaseAdminClient } from "@/lib/server/supabase-admin";

type PaymentOrderInput = {
  amount: number;
  buyerEmail?: string | null;
  buyerName?: string | null;
  currency?: string;
  paymentId: string;
  productId: string;
  profileId: string;
  rawPayload?: unknown;
  status?: string;
};

export type PaymentOrder = {
  amount: number;
  currency: string;
  paymentId: string;
  productId: string;
  profileId: string;
  status: string;
};

export async function recordPaymentOrder(input: PaymentOrderInput) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return {
      recorded: false,
      reason: "supabase_not_configured" as const,
    };
  }

  const result = await supabase.from("payment_orders").upsert(
    {
      amount: input.amount,
      buyer_email: input.buyerEmail ?? null,
      buyer_name: input.buyerName ?? null,
      currency: input.currency ?? "KRW",
      payment_id: input.paymentId,
      product_id: input.productId,
      profile_id: input.profileId,
      raw_payload: input.rawPayload ?? null,
      status: input.status ?? "ready",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "payment_id" },
  );

  if (result.error) {
    console.error("payment order upsert failed", result.error);

    return {
      recorded: false,
      reason: "supabase_upsert_failed" as const,
    };
  }

  return { recorded: true as const };
}

export async function getPaymentOrder(paymentId: string) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return null;
  }

  const result = await supabase
    .from("payment_orders")
    .select("amount, currency, payment_id, product_id, profile_id, status")
    .eq("payment_id", paymentId)
    .maybeSingle();

  if (result.error) {
    console.error("payment order lookup failed", result.error);
    return null;
  }

  const row = result.data as
    | {
        amount: number;
        currency: string;
        payment_id: string;
        product_id: string;
        profile_id: string;
        status: string;
      }
    | null;

  if (!row) {
    return null;
  }

  return {
    amount: row.amount,
    currency: row.currency,
    paymentId: row.payment_id,
    productId: row.product_id,
    profileId: row.profile_id,
    status: row.status,
  } satisfies PaymentOrder;
}

export async function updatePaymentOrderStatus(
  paymentId: string,
  status: string,
) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return;
  }

  const result = await supabase
    .from("payment_orders")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("payment_id", paymentId);

  if (result.error) {
    console.error("payment order status update failed", result.error);
  }
}
