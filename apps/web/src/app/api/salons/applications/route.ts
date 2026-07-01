import { getSupabaseAdminClient } from "@/lib/server/supabase-admin";
import { queueNotificationEvent } from "@/lib/server/notifications";
import { protectMutationRequest } from "@/lib/server/request-security";

export const runtime = "nodejs";
export const maxDuration = 30;

type SalonApplicationPayload = {
  address?: string;
  applicantType?: string;
  contact?: string;
  contactName?: string;
  designerName?: string;
  memo?: string;
  profileUrl?: string;
  salonName?: string;
  specialties?: string[] | string;
};

export async function POST(request: Request) {
  const securityError = protectMutationRequest(request, {
    maxBodyBytes: 64 * 1024,
    rateLimit: {
      key: "salons:applications",
      limit: 20,
      windowMs: 10 * 60 * 1000,
    },
  });

  if (securityError) {
    return securityError;
  }

  let payload: SalonApplicationPayload;

  try {
    payload = (await request.json()) as SalonApplicationPayload;
  } catch {
    return Response.json(
      { error: "Invalid salon application payload." },
      { status: 400 },
    );
  }

  const salonName = sanitizeText(payload.salonName, 120);
  const contactName = sanitizeText(payload.contactName, 60);
  const contact = sanitizeText(payload.contact, 120);

  if (!salonName || !contactName || !contact) {
    return Response.json(
      { error: "Salon name, contact name, and contact are required." },
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

  const applicantType = normalizeApplicantType(payload.applicantType);
  const designerName = sanitizeText(payload.designerName, 80);
  const specialties = sanitizeSpecialties(payload.specialties);

  const insert = await supabase
    .from("salon_applications")
    .insert({
      address: sanitizeText(payload.address, 220),
      applicant_type: applicantType,
      contact,
      contact_name: contactName,
      designer_name: designerName,
      memo: sanitizeText(payload.memo, 1200),
      profile_url: sanitizeUrl(payload.profileUrl),
      salon_name: salonName,
      specialties,
      status: "new",
    })
    .select("id")
    .single();

  if (insert.error) {
    console.error("salon application insert failed", insert.error);

    return Response.json(
      {
        accepted: false,
        reason: "supabase_insert_failed",
      },
      { status: 500 },
    );
  }

  const notification = await queueNotificationEvent({
    body: `${salonName} 입점 신청이 접수되었습니다. 담당자 ${contactName} 연락처를 확인해 주세요.`,
    eventType: "salon_application",
    payload: {
      applicantType,
      applicationId: insert.data?.id,
      contact,
      contactName,
      designerName,
      salonName,
      specialties,
    },
    title: "새 입점 신청",
    url: "/admin",
  });

  return Response.json({
    accepted: true,
    notificationQueued: notification.queued,
    notificationReason: notification.queued ? undefined : notification.reason,
  });
}

function normalizeApplicantType(value: unknown) {
  return value === "designer" || value === "both" ? value : "salon";
}

function sanitizeSpecialties(value: SalonApplicationPayload["specialties"]) {
  const raw = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];

  return raw
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.replace(/[<>]/g, "").trim().slice(0, 40))
    .filter(Boolean)
    .slice(0, 12);
}

function sanitizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.replace(/[<>]/g, "").trim();

  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function sanitizeUrl(value: unknown) {
  const text = sanitizeText(value, 500);

  if (!text) {
    return null;
  }

  try {
    const url = new URL(text);

    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}
