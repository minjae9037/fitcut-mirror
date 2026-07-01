import {
  getSupabaseAdminClient,
  getVerifiedSupabaseUser,
} from "@/lib/server/supabase-admin";
import { isMirilookAdminUser } from "@/lib/server/mirilook-admins";

type EntitlementCheckResult = {
  active: boolean;
  reason?: string;
  status: number;
};

export async function verifyActivePaymentEntitlement(
  request: Request,
  entitlement: string,
): Promise<EntitlementCheckResult> {
  const user = await getVerifiedSupabaseUser(request);

  if (!user) {
    return {
      active: false,
      reason: "not_authenticated",
      status: 401,
    };
  }

  if (entitlement === "premium_addons" && isMirilookAdminUser(user)) {
    return {
      active: true,
      reason: "admin_test_account",
      status: 200,
    };
  }

  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return {
      active: false,
      reason: "supabase_not_configured",
      status: 503,
    };
  }

  const now = new Date().toISOString();
  const result = await supabase
    .from("payment_events")
    .select("id")
    .eq("profile_id", user.id)
    .eq("verified", true)
    .eq("entitlement", entitlement)
    .or(`entitlement_expires_at.is.null,entitlement_expires_at.gt.${now}`)
    .limit(1)
    .maybeSingle();

  if (result.error) {
    console.error("payment entitlement verification failed", result.error);

    return {
      active: false,
      reason: "supabase_entitlement_lookup_failed",
      status: 500,
    };
  }

  if (!result.data) {
    return {
      active: false,
      reason: "entitlement_inactive",
      status: 402,
    };
  }

  return {
    active: true,
    status: 200,
  };
}
