import { getSupabaseAdminClient } from "@/lib/server/supabase-admin";

type PaymentEventInput = {
  actualAmount?: number | null;
  buyerEmail?: string | null;
  buyerName?: string | null;
  currency?: string | null;
  entitlement?: string | null;
  entitlementExpiresAt?: string | null;
  eventType?: string | null;
  expectedAmount?: number | null;
  failureReason?: string | null;
  paymentId: string;
  profileId?: string | null;
  productId: string;
  rawPayload?: unknown;
  status: string;
  verified: boolean;
};

export async function recordPaymentEvent(input: PaymentEventInput) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return {
      recorded: false,
      reason: "supabase_not_configured" as const,
    };
  }

  const amount = input.actualAmount ?? input.expectedAmount ?? 0;
  const timestamp = new Date().toISOString();
  const upsert = await supabase.from("payment_events").upsert(
    {
      actual_amount: input.actualAmount ?? null,
      amount,
      buyer_email: input.buyerEmail ?? null,
      buyer_name: input.buyerName ?? null,
      currency: input.currency ?? "KRW",
      entitlement: input.entitlement ?? null,
      entitlement_expires_at: input.entitlementExpiresAt ?? null,
      event_type: input.eventType ?? "server_verification",
      expected_amount: input.expectedAmount ?? null,
      failure_reason: input.failureReason ?? null,
      payment_id: input.paymentId,
      profile_id: input.profileId ?? null,
      product_id: input.productId,
      provider: "portone",
      raw_payload: input.rawPayload ?? null,
      status: input.status,
      updated_at: timestamp,
      verified: input.verified,
    },
    { onConflict: "payment_id" },
  );

  if (upsert.error) {
    console.error("payment event upsert failed", upsert.error);

    return {
      recorded: false,
      reason: "supabase_upsert_failed" as const,
    };
  }

  return { recorded: true as const };
}
