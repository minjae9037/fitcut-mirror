import {
  getSupabaseAdminClient,
  getVerifiedSupabaseUser,
} from "@/lib/server/supabase-admin";
import { isMirilookAdminUser } from "@/lib/server/mirilook-admins";

export const runtime = "nodejs";
export const maxDuration = 30;

type PaymentEntitlementRow = {
  entitlement: string | null;
  entitlement_expires_at: string | null;
  product_id: string | null;
};

export async function GET(request: Request) {
  const user = await getVerifiedSupabaseUser(request);

  if (!user) {
    // Logged-out visitors simply have no entitlements. Return 200 (not 401) so
    // the browser console stays clean for anonymous home/store visits.
    return Response.json({
      entitlements: {},
      reason: "not_authenticated",
      synced: false,
    });
  }

  if (isMirilookAdminUser(user)) {
    return Response.json({
      entitlements: {
        premium_addons: {
          active: true,
          expiresAt: null,
          productId: "admin-test-premium",
        },
      },
      reason: "admin_test_account",
      synced: true,
    });
  }

  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return Response.json({
      entitlements: {},
      reason: "supabase_not_configured",
      synced: false,
    });
  }

  const now = new Date().toISOString();
  const result = await supabase
    .from("payment_events")
    .select("entitlement, entitlement_expires_at, product_id")
    .eq("profile_id", user.id)
    .eq("verified", true)
    .not("entitlement", "is", null)
    .or(`entitlement_expires_at.is.null,entitlement_expires_at.gt.${now}`)
    .order("entitlement_expires_at", { ascending: false })
    .returns<PaymentEntitlementRow[]>();

  if (result.error) {
    console.error("payment entitlement lookup failed", result.error);

    return Response.json(
      {
        entitlements: {},
        reason: "supabase_entitlement_lookup_failed",
        synced: false,
      },
      { status: 500 },
    );
  }

  return Response.json({
    entitlements: buildEntitlementMap(result.data ?? []),
    synced: true,
  });
}

function buildEntitlementMap(rows: PaymentEntitlementRow[]) {
  const map: Record<
    string,
    {
      active: boolean;
      expiresAt: string | null;
      productId: string | null;
    }
  > = {};

  rows.forEach((row) => {
    if (!row.entitlement || map[row.entitlement]?.active) {
      return;
    }

    map[row.entitlement] = {
      active: true,
      expiresAt: row.entitlement_expires_at,
      productId: row.product_id,
    };
  });

  return map;
}
