import {
  HairMoneyCommunityPostReward,
  HairMoneyExtraConsultationCost,
  HairMoneyRecommendationCost,
  HairMoneyRecommendationPriceKrw,
  HairMoneyUnitPriceKrw,
  type MirilookPaymentProduct,
} from "@/lib/mirilook-payments";
import { getSupabaseAdminClient } from "@/lib/server/supabase-admin";

type HairMoneyRpcRow = {
  applied: boolean;
  balance: number;
  reason: string | null;
};

export type HairMoneyLedgerItem = {
  amount: number;
  balanceAfter: number;
  createdAt: string;
  direction: "credit" | "debit" | "refund" | "adjustment";
  id: string;
  metadata: unknown;
  reason: string | null;
  sourceId: string;
  sourceType: string;
};

type HairMoneyLedgerRow = {
  amount: number;
  balance_after: number;
  created_at: string;
  direction: "credit" | "debit" | "refund" | "adjustment";
  id: string;
  metadata: unknown;
  reason: string | null;
  source_id: string;
  source_type: string;
};

type HairMoneyRpcResult =
  | {
      applied: boolean;
      balance: number;
      reason?: string;
      synced: true;
    }
  | {
      applied: false;
      balance: number;
      reason: "supabase_not_configured" | "supabase_rpc_failed";
      synced: false;
    };

export type HairMoneyWallet =
  | {
      balance: number;
      ledger: HairMoneyLedgerItem[];
      recommendationCost: number;
      synced: true;
    }
  | {
      balance: 0;
      reason: "supabase_not_configured" | "supabase_wallet_lookup_failed";
      recommendationCost: number;
      synced: false;
    };

export async function getHairMoneyWallet(profileId: string): Promise<HairMoneyWallet> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return {
      balance: 0,
      reason: "supabase_not_configured",
      recommendationCost: HairMoneyRecommendationCost,
      synced: false,
    };
  }

  const result = await supabase
    .from("hair_money_accounts")
    .select("balance")
    .eq("profile_id", profileId)
    .maybeSingle();
  const ledgerResult = await supabase
    .from("hair_money_ledger")
    .select(
      "id, direction, amount, balance_after, source_type, source_id, reason, metadata, created_at",
    )
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(20)
    .returns<HairMoneyLedgerRow[]>();

  if (result.error || ledgerResult.error) {
    console.error("hair money wallet lookup failed", result.error);
    console.error("hair money ledger lookup failed", ledgerResult.error);

    return {
      balance: 0,
      reason: "supabase_wallet_lookup_failed",
      recommendationCost: HairMoneyRecommendationCost,
      synced: false,
    };
  }

  return {
    balance: Number(result.data?.balance ?? 0),
    ledger: (ledgerResult.data ?? []).map(mapLedgerRow),
    recommendationCost: HairMoneyRecommendationCost,
    synced: true,
  };
}

export async function creditHairMoneyForPayment({
  paymentId,
  product,
  profileId,
}: {
  paymentId: string;
  product: MirilookPaymentProduct;
  profileId: string | null | undefined;
}): Promise<HairMoneyRpcResult | null> {
  if (product.productKind !== "hair_money" || !product.hairMoneyAmount) {
    return null;
  }

  if (!profileId) {
    return {
      applied: false,
      balance: 0,
      reason: "supabase_rpc_failed",
      synced: false,
    };
  }

  return runHairMoneyRpc("credit_hair_money", {
    p_amount: product.hairMoneyAmount,
    p_metadata: {
      paymentId,
      productId: product.id,
      productName: product.name,
      pricingBasis: "hair_money_500_krw",
    },
    p_profile_id: profileId,
    p_reason: "hair_money_purchase",
    p_source_id: paymentId,
    p_source_type: "portone_payment",
  });
}

export async function rewardHairMoneyForCommunityPost({
  postId,
  profileId,
}: {
  postId: string;
  profileId: string;
}): Promise<HairMoneyRpcResult> {
  return runHairMoneyRpc("credit_hair_money", {
    p_amount: HairMoneyCommunityPostReward,
    p_metadata: {
      postId,
      rewardBasis: "community_post_share",
    },
    p_profile_id: profileId,
    p_reason: "community_post_reward",
    p_source_id: postId,
    p_source_type: "community_post_reward",
  });
}

export async function spendHairMoneyForRecommendation({
  audience,
  profileId,
  recommendationMode,
  requestId,
  region,
}: {
  audience: string;
  profileId: string;
  recommendationMode: string;
  requestId: string;
  region: string;
}): Promise<HairMoneyRpcResult> {
  return runHairMoneyRpc("spend_hair_money", {
    p_amount: HairMoneyRecommendationCost,
    p_metadata: {
      audience,
      costBasis: `recommendation_${HairMoneyRecommendationPriceKrw}_krw`,
      hairMoneyUnitPriceKrw: HairMoneyUnitPriceKrw,
      recommendationMode,
      region,
    },
    p_profile_id: profileId,
    p_reason: "style_recommendation",
    p_source_id: requestId,
    p_source_type: "style_recommendation",
  });
}

export async function spendHairMoneyForExtraConsultation({
  audience,
  profileId,
  region,
  requestId,
  styleId,
}: {
  audience: string;
  profileId: string;
  region: string;
  requestId: string;
  styleId: string;
}): Promise<HairMoneyRpcResult> {
  return runHairMoneyRpc("spend_hair_money", {
    p_amount: HairMoneyExtraConsultationCost,
    p_metadata: {
      audience,
      costBasis: `extra_consultation_${HairMoneyExtraConsultationCost * HairMoneyUnitPriceKrw}_krw`,
      hairMoneyUnitPriceKrw: HairMoneyUnitPriceKrw,
      region,
      styleId,
    },
    p_profile_id: profileId,
    p_reason: "extra_consultation_set",
    p_source_id: requestId,
    p_source_type: "consultation_set",
  });
}

export async function refundHairMoneyForRecommendation({
  amount = HairMoneyRecommendationCost,
  originalRequestId,
  profileId,
  reason = "style_recommendation_refund",
  supportCaseId,
}: {
  amount?: number;
  originalRequestId: string;
  profileId: string;
  reason?: string;
  supportCaseId: string;
}): Promise<HairMoneyRpcResult> {
  return runHairMoneyRpc("refund_hair_money", {
    p_amount: amount,
    p_metadata: {
      costBasis: `recommendation_${HairMoneyRecommendationPriceKrw}_krw`,
      hairMoneyUnitPriceKrw: HairMoneyUnitPriceKrw,
      originalRequestId,
      supportCaseId,
    },
    p_original_source_id: originalRequestId,
    p_original_source_type: "style_recommendation",
    p_profile_id: profileId,
    p_reason: reason,
    p_source_id: supportCaseId,
    p_source_type: "support_case_refund",
  });
}

async function runHairMoneyRpc(
  functionName: "credit_hair_money" | "refund_hair_money" | "spend_hair_money",
  payload: Record<string, unknown>,
): Promise<HairMoneyRpcResult> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return {
      applied: false,
      balance: 0,
      reason: "supabase_not_configured",
      synced: false,
    };
  }

  const result = await supabase.rpc(functionName, payload);

  if (result.error) {
    console.error(`${functionName} failed`, result.error);

    return {
      applied: false,
      balance: 0,
      reason: "supabase_rpc_failed",
      synced: false,
    };
  }

  const firstRow = Array.isArray(result.data)
    ? (result.data[0] as HairMoneyRpcRow | undefined)
    : (result.data as HairMoneyRpcRow | null);

  return {
    applied: Boolean(firstRow?.applied),
    balance: Number(firstRow?.balance ?? 0),
    reason: firstRow?.reason ?? undefined,
    synced: true,
  };
}

function mapLedgerRow(row: HairMoneyLedgerRow): HairMoneyLedgerItem {
  return {
    amount: Number(row.amount ?? 0),
    balanceAfter: Number(row.balance_after ?? 0),
    createdAt: row.created_at,
    direction: row.direction,
    id: row.id,
    metadata: row.metadata ?? null,
    reason: row.reason,
    sourceId: row.source_id,
    sourceType: row.source_type,
  };
}
