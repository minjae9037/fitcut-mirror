import { getSupabaseAdminClient } from "@/lib/server/supabase-admin";
import { queueNotificationEvent } from "@/lib/server/notifications";
import { validateSalonTarget } from "@/lib/server/salon-targets";
import { protectMutationRequest } from "@/lib/server/request-security";

export const runtime = "nodejs";
export const maxDuration = 30;

type SalonReviewPayload = {
  body?: string;
  contact?: string;
  designerId?: string;
  rating?: number | string;
  salonId?: string;
  visitorName?: string;
};

export async function POST(request: Request) {
  const securityError = protectMutationRequest(request, {
    maxBodyBytes: 32 * 1024,
    rateLimit: {
      key: "salons:reviews",
      limit: 30,
      windowMs: 10 * 60 * 1000,
    },
  });

  if (securityError) {
    return securityError;
  }

  let payload: SalonReviewPayload;

  try {
    payload = (await request.json()) as SalonReviewPayload;
  } catch {
    return Response.json({ error: "Invalid review payload." }, { status: 400 });
  }

  const salonId = sanitizeText(payload.salonId, 80);
  const body = sanitizeText(payload.body, 1500);
  const rating = Number(payload.rating);

  if (!salonId || !body || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return Response.json(
      { error: "Salon, rating, and review body are required." },
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

  const contact = sanitizeText(payload.contact, 120);
  const visitorName = sanitizeText(payload.visitorName, 60);

  const insert = await supabase
    .from("reviews")
    .insert({
      body,
      contact,
      designer_id: designerId,
      rating,
      salon_id: salonId,
      status: "pending",
      visitor_name: visitorName,
    })
    .select("id")
    .single();

  if (insert.error) {
    console.error("salon review insert failed", insert.error);

    return Response.json(
      {
        accepted: false,
        reason: "supabase_insert_failed",
      },
      { status: 500 },
    );
  }

  const notification = await queueNotificationEvent({
    body: `${rating}점 리뷰가 접수되었습니다. 공개 전 관리자 검수를 진행해 주세요.`,
    eventType: "salon_review",
    payload: {
      contact,
      designerId,
      rating,
      reviewId: insert.data?.id,
      salonId,
      visitorName,
    },
    title: "새 살롱 리뷰",
    url: "/admin",
  });

  return Response.json({
    accepted: true,
    notificationQueued: notification.queued,
    notificationReason: notification.queued ? undefined : notification.reason,
  });
}

function sanitizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed ? trimmed.slice(0, maxLength) : null;
}
