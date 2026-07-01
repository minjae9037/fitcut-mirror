import { getSupabaseAdminClient } from "@/lib/server/supabase-admin";
import { queueNotificationEvent } from "@/lib/server/notifications";
import { validateSalonTarget } from "@/lib/server/salon-targets";
import { protectMutationRequest } from "@/lib/server/request-security";

export const runtime = "nodejs";
export const maxDuration = 30;

type BookingRequestPayload = {
  consultationBoardUrl?: string;
  contact?: string;
  designerId?: string;
  memo?: string;
  name?: string;
  preferredDate?: string;
  preferredSlotId?: string;
  salonId?: string;
  serviceType?: string;
};

type SupabaseAdminClient = NonNullable<ReturnType<typeof getSupabaseAdminClient>>;

export async function POST(request: Request) {
  const securityError = protectMutationRequest(request, {
    maxBodyBytes: 64 * 1024,
    rateLimit: {
      key: "salons:booking-requests",
      limit: 30,
      windowMs: 10 * 60 * 1000,
    },
  });

  if (securityError) {
    return securityError;
  }

  let payload: BookingRequestPayload;

  try {
    payload = (await request.json()) as BookingRequestPayload;
  } catch {
    return Response.json({ error: "Invalid booking payload." }, { status: 400 });
  }

  const name = sanitizeText(payload.name, 60);
  const contact = sanitizeText(payload.contact, 120);
  const salonId = sanitizeText(payload.salonId, 80);
  const preferredDate = sanitizeText(payload.preferredDate, 120);

  if (!name || !contact || !salonId) {
    return Response.json(
      { error: "Name, contact, and salon are required." },
      { status: 400 },
    );
  }

  if (!preferredDate) {
    return Response.json(
      { accepted: false, reason: "preferred_date_required" },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return Response.json({
      accepted: false,
      reason: "supabase_not_configured",
    });
  }

  const designerId = sanitizeText(payload.designerId, 80);
  const preferredSlotId = sanitizeText(payload.preferredSlotId, 120);
  const targetValidation = await validateSalonTarget({
    designerId,
    salonId,
    supabase,
  });

  if (!targetValidation.ok) {
    return Response.json(
      {
        accepted: false,
        reason: targetValidation.reason,
      },
      { status: targetValidation.status },
    );
  }

  if (designerId && preferredSlotId) {
    const slotValidation = await validateDesignerBookingSlot({
      designerId,
      preferredSlotId,
      supabase,
    });

    if (!slotValidation.ok) {
      return Response.json(
        {
          accepted: false,
          reason: slotValidation.reason,
        },
        { status: slotValidation.status },
      );
    }
  }

  const consultationBoardUrl = sanitizeConsultationBoardUrl(
    payload.consultationBoardUrl,
  );
  const serviceType = sanitizeText(payload.serviceType, 80);

  const insert = await supabase
    .from("booking_requests")
    .insert({
      consultation_board_url: consultationBoardUrl,
      contact,
      designer_id: designerId,
      memo: sanitizeText(payload.memo, 1000),
      name,
      preferred_date: preferredDate,
      preferred_slot_id: preferredSlotId,
      salon_id: salonId,
      service_type: serviceType,
      status: "new",
    })
    .select("id")
    .single();

  if (insert.error) {
    console.error("booking request insert failed", insert.error);

    return Response.json(
      {
        accepted: false,
        reason: "supabase_insert_failed",
      },
      { status: 500 },
    );
  }

  const notification = await queueNotificationEvent({
    body: `${name} 고객의 예약 문의가 접수되었습니다. 희망 일정과 연락처를 확인해 주세요.`,
    eventType: "salon_booking_request",
    payload: {
      bookingRequestId: insert.data?.id,
      consultationBoardUrl,
      contact,
      designerId,
      name,
      preferredDate,
      preferredSlotId,
      salonId,
      serviceType,
    },
    title: "새 예약 문의",
    url: "/admin",
  });

  return Response.json({
    accepted: true,
    notificationQueued: notification.queued,
    notificationReason: notification.queued ? undefined : notification.reason,
  });
}

async function validateDesignerBookingSlot({
  designerId,
  preferredSlotId,
  supabase,
}: {
  designerId: string;
  preferredSlotId: string;
  supabase: SupabaseAdminClient;
}) {
  const designer = await supabase
    .from("designers")
    .select("booking_windows")
    .eq("id", designerId)
    .maybeSingle();

  if (designer.error) {
    console.error("designer slot lookup failed", designer.error);

    return {
      ok: false,
      reason: "slot_lookup_failed",
      status: 500,
    };
  }

  const bookingWindows = designer.data?.booking_windows;

  if (!Array.isArray(bookingWindows)) {
    return {
      ok: true,
      status: 200,
    };
  }

  const slot = bookingWindows.find((item) => {
    if (!item || typeof item !== "object") {
      return false;
    }

    return (item as Record<string, unknown>).id === preferredSlotId;
  });

  if (!slot) {
    return {
      ok: false,
      reason: "slot_not_available",
      status: 400,
    };
  }

  if ((slot as Record<string, unknown>).status === "full") {
    return {
      ok: false,
      reason: "slot_full",
      status: 409,
    };
  }

  return {
    ok: true,
    status: 200,
  };
}

function sanitizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function sanitizeConsultationBoardUrl(value: unknown) {
  const text = sanitizeText(value, 500);

  if (!text) {
    return null;
  }

  if (text.startsWith("/share/")) {
    return text;
  }

  try {
    const url = new URL(text);

    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}
