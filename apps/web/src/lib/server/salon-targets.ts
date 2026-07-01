import type { getSupabaseAdminClient } from "@/lib/server/supabase-admin";

type SupabaseAdminClient = NonNullable<ReturnType<typeof getSupabaseAdminClient>>;

type SalonTargetValidation = {
  ok: boolean;
  reason?: string;
  status: number;
};

const bookableSalonStatuses = new Set(["active", "approved", "pilot"]);
const bookableDesignerStatuses = new Set(["active", "approved", "pilot"]);

export async function validateSalonTarget({
  designerId,
  salonId,
  supabase,
}: {
  designerId?: string | null;
  salonId: string;
  supabase: SupabaseAdminClient;
}): Promise<SalonTargetValidation> {
  const salon = await supabase
    .from("salons")
    .select("id, profile_status")
    .eq("id", salonId)
    .maybeSingle();

  if (salon.error) {
    console.error("salon lookup failed", salon.error);

    return {
      ok: false,
      reason: "salon_lookup_failed",
      status: 500,
    };
  }

  if (!salon.data) {
    return {
      ok: false,
      reason: "salon_not_found",
      status: 404,
    };
  }

  const profileStatus =
    typeof salon.data.profile_status === "string"
      ? salon.data.profile_status
      : "pilot";

  if (!bookableSalonStatuses.has(profileStatus)) {
    return {
      ok: false,
      reason: "salon_not_bookable",
      status: 403,
    };
  }

  if (!designerId) {
    return {
      ok: true,
      status: 200,
    };
  }

  const designer = await supabase
    .from("designers")
    .select("id, salon_id, booking_status")
    .eq("id", designerId)
    .maybeSingle();

  if (designer.error) {
    console.error("designer lookup failed", designer.error);

    return {
      ok: false,
      reason: "designer_lookup_failed",
      status: 500,
    };
  }

  if (!designer.data) {
    return {
      ok: false,
      reason: "designer_not_found",
      status: 404,
    };
  }

  if (designer.data.salon_id !== salonId) {
    return {
      ok: false,
      reason: "designer_salon_mismatch",
      status: 400,
    };
  }

  const bookingStatus =
    typeof designer.data.booking_status === "string"
      ? designer.data.booking_status
      : "pilot";

  if (!bookableDesignerStatuses.has(bookingStatus)) {
    return {
      ok: false,
      reason: "designer_not_bookable",
      status: 403,
    };
  }

  return {
    ok: true,
    status: 200,
  };
}
