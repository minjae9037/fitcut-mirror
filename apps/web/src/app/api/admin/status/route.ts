import { getSupabaseAdminClient } from "@/lib/server/supabase-admin";
import { requireAdminRequest } from "@/lib/server/admin-auth";
import { HairMoneyRecommendationCost } from "@/lib/mirilook-payments";
import { refundHairMoneyForRecommendation } from "@/lib/server/hair-money";

export const runtime = "nodejs";
export const maxDuration = 30;

type AdminStatusPayload = {
  id?: string;
  status?: string;
  table?: string;
};

type SupabaseAdminClient = NonNullable<ReturnType<typeof getSupabaseAdminClient>>;

type SalonApplicationRow = {
  address: string | null;
  applicant_type: string;
  contact: string;
  contact_name: string;
  designer_name: string | null;
  id: string;
  memo: string | null;
  salon_name: string;
  specialties: string[] | null;
};

type ReviewRow = {
  designer_id: string | null;
  salon_id: string | null;
};

type ApprovedReviewRow = {
  rating: number | null;
};

type ModerationEventRow = {
  target_id: string;
  target_type: string;
};

type SupportCaseRow = {
  id: string;
  profile_id: string | null;
  refund_amount_hm: number | null;
  request_id: string | null;
  source_id: string | null;
  status: string;
};

type ModerationStatusResult =
  | {
      action: string | null;
      ok: true;
    }
  | {
      ok: false;
      reason: string;
    };

const allowedTables = {
  booking_requests: {
    idColumn: "id",
    statuses: new Set(["new", "contacted", "done", "cancelled"]),
  },
  community_posts: {
    idColumn: "id",
    statuses: new Set(["pending", "published", "hidden"]),
  },
  community_comments: {
    idColumn: "id",
    statuses: new Set(["pending", "published", "hidden"]),
  },
  community_messages: {
    idColumn: "id",
    statuses: new Set(["pending", "delivered", "hidden"]),
  },
  notification_events: {
    idColumn: "id",
    statuses: new Set(["queued", "sent", "failed", "cancelled"]),
  },
  moderation_events: {
    idColumn: "id",
    statuses: new Set(["new", "reviewing", "resolved", "dismissed"]),
  },
  consultation_shares: {
    idColumn: "token",
    statuses: new Set(["active", "revoked"]),
  },
  push_subscriptions: {
    idColumn: "id",
    statuses: new Set(["active", "revoked", "disabled"]),
  },
  reviews: {
    idColumn: "id",
    statuses: new Set(["pending", "approved", "hidden"]),
  },
  salon_applications: {
    idColumn: "id",
    statuses: new Set(["new", "contacted", "approved", "rejected"]),
  },
  social_messages: {
    idColumn: "id",
    statuses: new Set(["pending", "delivered", "hidden"]),
  },
  social_posts: {
    idColumn: "id",
    statuses: new Set(["pending", "published", "hidden"]),
  },
  style_votes: {
    idColumn: "id",
    statuses: new Set(["published", "hidden"]),
  },
  support_cases: {
    idColumn: "id",
    statuses: new Set([
      "new",
      "reviewing",
      "waiting_customer",
      "resolved",
      "dismissed",
      "refunded",
    ]),
  },
} as const;

export async function POST(request: Request) {
  const adminError = requireAdminRequest(request);

  if (adminError) {
    return adminError;
  }

  let payload: AdminStatusPayload;

  try {
    payload = (await request.json()) as AdminStatusPayload;
  } catch {
    return Response.json({ error: "Invalid admin status payload." }, { status: 400 });
  }

  const table = sanitizeText(payload.table, 80);
  const id = sanitizeText(payload.id, 120);
  const status = sanitizeText(payload.status, 40);

  if (!table || !id || !status || !isAllowedTable(table)) {
    return Response.json({ error: "Unsupported admin status action." }, { status: 400 });
  }

  const config = allowedTables[table];

  if (!config.statuses.has(status)) {
    return Response.json({ error: "Unsupported target status." }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return Response.json({
      accepted: false,
      reason: "supabase_not_configured",
    });
  }

  if (table === "support_cases" && status === "refunded") {
    const refundResult = await applySupportCaseRefund(supabase, id);

    if (!refundResult.ok) {
      return Response.json(
        {
          accepted: false,
          reason: refundResult.reason,
        },
        { status: 500 },
      );
    }

    return Response.json({
      accepted: true,
      refund: refundResult,
    });
  }

  const update =
    table === "consultation_shares"
      ? {
          revoked_at: status === "revoked" ? new Date().toISOString() : null,
        }
      : table === "notification_events"
        ? {
            error_message:
              status === "queued" || status === "sent" || status === "cancelled"
                ? null
                : undefined,
            sent_at: status === "sent" ? new Date().toISOString() : null,
            status,
          }
      : table === "moderation_events"
        ? {
            action: status === "resolved" || status === "dismissed" ? status : null,
            status,
            updated_at: new Date().toISOString(),
          }
      : table === "salon_applications"
        ? {
            status,
            updated_at: new Date().toISOString(),
          }
      : table === "social_posts"
        ? {
            status,
            updated_at: new Date().toISOString(),
          }
      : table === "support_cases"
        ? {
            resolved_at:
              status === "resolved" || status === "dismissed"
                ? new Date().toISOString()
                : null,
            status,
            updated_at: new Date().toISOString(),
          }
      : { status };

  const result = await supabase
    .from(table)
    .update(update)
    .eq(config.idColumn, id);

  if (result.error) {
    console.error("admin status update failed", result.error);

    return Response.json(
      {
        accepted: false,
        reason: "supabase_update_failed",
      },
      { status: 500 },
    );
  }

  if (table === "salon_applications" && status === "approved") {
    const publishResult = await publishApprovedSalonApplication(supabase, id);

    if (!publishResult.ok) {
      return Response.json(
        {
          accepted: false,
          reason: publishResult.reason,
        },
        { status: 500 },
      );
    }
  }

  if (table === "reviews") {
    const syncResult = await syncReviewTargetsAfterStatusChange(supabase, id);

    if (!syncResult.ok) {
      return Response.json(
        {
          accepted: false,
          reason: syncResult.reason,
        },
        { status: 500 },
      );
    }
  }

  if (table === "moderation_events") {
    const moderationResult = await applyModerationStatusChange(supabase, id, status);

    if (!moderationResult.ok) {
      return Response.json(
        {
          accepted: false,
          reason: moderationResult.reason,
        },
        { status: 500 },
      );
    }

    return Response.json({
      accepted: true,
      moderationAction: moderationResult.action,
    });
  }

  return Response.json({ accepted: true });
}

async function applySupportCaseRefund(
  supabase: SupabaseAdminClient,
  supportCaseId: string,
) {
  const caseResult = await supabase
    .from("support_cases")
    .select("id, profile_id, request_id, source_id, refund_amount_hm, status")
    .eq("id", supportCaseId)
    .maybeSingle<SupportCaseRow>();

  if (caseResult.error) {
    console.error("support case lookup failed", caseResult.error);
    return { ok: false as const, reason: "support_case_lookup_failed" };
  }

  const supportCase = caseResult.data;

  if (!supportCase) {
    return { ok: false as const, reason: "support_case_not_found" };
  }

  if (supportCase.status === "refunded") {
    return {
      applied: false,
      balance: 0,
      ok: true as const,
      reason: "already_refunded",
    };
  }

  if (!supportCase.profile_id) {
    return { ok: false as const, reason: "support_case_missing_profile" };
  }

  const originalRequestId = supportCase.request_id || supportCase.source_id;

  if (!originalRequestId) {
    return { ok: false as const, reason: "support_case_missing_request_id" };
  }

  const refundAmount = Number(
    supportCase.refund_amount_hm ?? HairMoneyRecommendationCost,
  );

  if (!Number.isFinite(refundAmount) || refundAmount <= 0) {
    return { ok: false as const, reason: "support_case_invalid_refund_amount" };
  }

  const refund = await refundHairMoneyForRecommendation({
    amount: Math.round(refundAmount),
    originalRequestId,
    profileId: supportCase.profile_id,
    supportCaseId,
  });

  if (!refund.synced) {
    return { ok: false as const, reason: refund.reason };
  }

  if (!refund.applied && refund.reason !== "already_applied") {
    return {
      ok: false as const,
      reason: refund.reason ?? "hair_money_refund_not_applied",
    };
  }

  const update = await supabase
    .from("support_cases")
    .update({
      refunded_at: new Date().toISOString(),
      resolution_note: `H머니 ${Math.round(refundAmount)} 환급 처리`,
      resolved_at: new Date().toISOString(),
      status: "refunded",
      updated_at: new Date().toISOString(),
    })
    .eq("id", supportCaseId);

  if (update.error) {
    console.error("support case refund status update failed", update.error);
    return { ok: false as const, reason: "support_case_refund_update_failed" };
  }

  return {
    applied: refund.applied,
    balance: refund.balance,
    ok: true as const,
    reason: refund.reason,
  };
}

async function applyModerationStatusChange(
  supabase: SupabaseAdminClient,
  moderationEventId: string,
  status: string,
): Promise<ModerationStatusResult> {
  if (status === "reviewing") {
    return updateModerationAction(supabase, moderationEventId, "reviewing");
  }

  if (status === "dismissed") {
    return updateModerationAction(supabase, moderationEventId, "dismissed_no_action");
  }

  if (status !== "resolved") {
    return { action: null, ok: true };
  }

  const eventResult = await supabase
    .from("moderation_events")
    .select("target_type, target_id")
    .eq("id", moderationEventId)
    .maybeSingle<ModerationEventRow>();

  if (eventResult.error) {
    console.error("moderation event lookup failed", eventResult.error);
    return { ok: false, reason: "moderation_event_lookup_failed" };
  }

  const event = eventResult.data;

  if (!event) {
    return { ok: false, reason: "moderation_event_not_found" };
  }

  const targetResult = await hideModerationTarget(supabase, event);

  if (!targetResult.ok) {
    return targetResult;
  }

  const action = targetResult.action ?? "resolved_no_target_action";
  const actionResult = await updateModerationAction(supabase, moderationEventId, action);

  if (!actionResult.ok) {
    return actionResult;
  }

  return { action, ok: true };
}

async function hideModerationTarget(
  supabase: SupabaseAdminClient,
  event: ModerationEventRow,
): Promise<ModerationStatusResult> {
  const now = new Date().toISOString();

  if (event.target_type === "social_post") {
    const result = await supabase
      .from("social_posts")
      .update({ status: "hidden", updated_at: now })
      .eq("id", event.target_id);

    return moderationTargetUpdateResult(result.error, "target_hidden");
  }

  if (event.target_type === "community_post") {
    const result = await supabase
      .from("community_posts")
      .update({ status: "hidden" })
      .eq("id", event.target_id);

    return moderationTargetUpdateResult(result.error, "target_hidden");
  }

  if (event.target_type === "community_comment") {
    const result = await supabase
      .from("community_comments")
      .update({ status: "hidden" })
      .eq("id", event.target_id);

    return moderationTargetUpdateResult(result.error, "target_hidden");
  }

  if (event.target_type === "community_message") {
    const result = await supabase
      .from("community_messages")
      .update({ status: "hidden" })
      .eq("id", event.target_id);

    return moderationTargetUpdateResult(result.error, "target_hidden");
  }

  if (event.target_type === "style_vote") {
    const result = await supabase
      .from("style_votes")
      .update({ status: "hidden" })
      .eq("id", event.target_id);

    return moderationTargetUpdateResult(result.error, "target_hidden");
  }

  if (event.target_type === "review") {
    const result = await supabase
      .from("reviews")
      .update({ status: "hidden" })
      .eq("id", event.target_id);

    if (result.error) {
      console.error("moderation review hide failed", result.error);
      return { ok: false, reason: "moderation_target_update_failed" };
    }

    const syncResult = await syncReviewTargetsAfterStatusChange(supabase, event.target_id);

    if (!syncResult.ok) {
      return {
        ok: false,
        reason: syncResult.reason ?? "review_target_sync_failed",
      };
    }

    return { action: "target_hidden", ok: true };
  }

  if (event.target_type === "share") {
    const result = await supabase
      .from("consultation_shares")
      .update({ revoked_at: now })
      .eq("token", event.target_id);

    return moderationTargetUpdateResult(result.error, "target_revoked");
  }

  return { action: "resolved_no_target_action", ok: true };
}

function moderationTargetUpdateResult(
  error: unknown,
  action: string,
): ModerationStatusResult {
  if (error) {
    console.error("moderation target update failed", error);
    return { ok: false, reason: "moderation_target_update_failed" };
  }

  return { action, ok: true };
}

async function updateModerationAction(
  supabase: SupabaseAdminClient,
  moderationEventId: string,
  action: string,
): Promise<ModerationStatusResult> {
  const result = await supabase
    .from("moderation_events")
    .update({
      action,
      updated_at: new Date().toISOString(),
    })
    .eq("id", moderationEventId);

  if (result.error) {
    console.error("moderation action update failed", result.error);
    return { ok: false, reason: "moderation_action_update_failed" };
  }

  return { action, ok: true };
}

async function publishApprovedSalonApplication(
  supabase: SupabaseAdminClient,
  applicationId: string,
) {
  const applicationResult = await supabase
    .from("salon_applications")
    .select(
      "id, applicant_type, salon_name, designer_name, contact_name, contact, address, specialties, memo",
    )
    .eq("id", applicationId)
    .maybeSingle<SalonApplicationRow>();

  if (applicationResult.error) {
    console.error("approved salon application lookup failed", applicationResult.error);
    return { ok: false, reason: "salon_application_lookup_failed" };
  }

  const application = applicationResult.data;

  if (!application) {
    return { ok: false, reason: "salon_application_not_found" };
  }

  const salonId = buildPartnerId("salon", application.salon_name, application.id);
  const designerId = buildPartnerId(
    "designer",
    application.designer_name || application.contact_name,
    application.id,
  );
  const specialties = normalizeSpecialties(application.specialties);
  const now = new Date().toISOString();

  const salonUpsert = await supabase.from("salons").upsert(
    {
      address: application.address || "주소 확인 필요",
      created_at: now,
      description:
        application.memo ||
        "미리룩 상담 보드 기반 예약과 스타일 상담을 받을 수 있는 승인 파트너입니다.",
      id: salonId,
      name: application.salon_name,
      phone: application.contact,
      profile_status: "approved",
      rating: "0.0",
      review_count: 0,
      tags: specialties.length ? specialties : ["미리룩 파트너"],
      visit_tip:
        "예약 문의 시 미리룩 상담 보드 링크나 저장 이미지를 함께 전달해 주세요.",
    },
    { onConflict: "id" },
  );

  if (salonUpsert.error) {
    console.error("approved salon upsert failed", salonUpsert.error);
    return { ok: false, reason: "salon_publish_failed" };
  }

  if (application.applicant_type === "designer" || application.applicant_type === "both") {
    const designerUpsert = await supabase.from("designers").upsert(
      {
        bio:
          application.memo ||
          "미리룩 상담 보드 기반 스타일 상담을 받을 수 있는 승인 디자이너입니다.",
        booking_status: "approved",
        created_at: now,
        id: designerId,
        name: application.designer_name || `${application.contact_name} 디자이너`,
        rating: "0.0",
        review_count: 0,
        salon_id: salonId,
        specialties: specialties.length ? specialties : ["AI 상담"],
      },
      { onConflict: "id" },
    );

    if (designerUpsert.error) {
      console.error("approved designer upsert failed", designerUpsert.error);
      return { ok: false, reason: "designer_publish_failed" };
    }
  }

  return { ok: true };
}

async function syncReviewTargetsAfterStatusChange(
  supabase: SupabaseAdminClient,
  reviewId: string,
) {
  const reviewResult = await supabase
    .from("reviews")
    .select("salon_id, designer_id")
    .eq("id", reviewId)
    .maybeSingle<ReviewRow>();

  if (reviewResult.error) {
    console.error("review target lookup failed", reviewResult.error);
    return { ok: false, reason: "review_target_lookup_failed" };
  }

  const review = reviewResult.data;

  if (!review) {
    return { ok: true };
  }

  const targetSyncs = [syncSalonReviewStats(supabase, review.salon_id)];

  if (review.designer_id) {
    targetSyncs.push(syncDesignerReviewStats(supabase, review.designer_id));
  }

  const results = await Promise.all(targetSyncs);
  const failed = results.find((result) => !result.ok);

  return failed ?? { ok: true };
}

async function syncSalonReviewStats(
  supabase: SupabaseAdminClient,
  salonId: string | null,
) {
  if (!salonId) {
    return { ok: true };
  }

  const stats = await loadApprovedReviewStats(supabase, "salon_id", salonId);

  if (!stats.ok) {
    return stats;
  }

  const update = await supabase
    .from("salons")
    .update({
      rating: stats.rating,
      review_count: stats.count,
    })
    .eq("id", salonId);

  if (update.error) {
    console.error("salon review stat sync failed", update.error);
    return { ok: false, reason: "salon_review_stat_sync_failed" };
  }

  return { ok: true };
}

async function syncDesignerReviewStats(
  supabase: SupabaseAdminClient,
  designerId: string,
) {
  const stats = await loadApprovedReviewStats(supabase, "designer_id", designerId);

  if (!stats.ok) {
    return stats;
  }

  const update = await supabase
    .from("designers")
    .update({
      rating: stats.rating,
      review_count: stats.count,
    })
    .eq("id", designerId);

  if (update.error) {
    console.error("designer review stat sync failed", update.error);
    return { ok: false, reason: "designer_review_stat_sync_failed" };
  }

  return { ok: true };
}

async function loadApprovedReviewStats(
  supabase: SupabaseAdminClient,
  column: "designer_id" | "salon_id",
  id: string,
) {
  const reviews = await supabase
    .from("reviews")
    .select("rating")
    .eq(column, id)
    .eq("status", "approved")
    .not("rating", "is", null)
    .returns<ApprovedReviewRow[]>();

  if (reviews.error) {
    console.error("approved review stat load failed", reviews.error);
    return { ok: false, reason: "approved_review_stat_load_failed" };
  }

  const ratings = (reviews.data ?? [])
    .map((review) => Number(review.rating))
    .filter((rating) => Number.isFinite(rating));
  const average = ratings.length
    ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
    : 0;

  return {
    count: ratings.length,
    ok: true,
    rating: average ? average.toFixed(1) : "0.0",
  };
}

function buildPartnerId(prefix: "designer" | "salon", name: string, id: string) {
  const slug = slugify(name) || "partner";
  const suffix = id.replace(/-/g, "").slice(0, 10) || crypto.randomUUID().slice(0, 10);

  return `${prefix}-${slug}-${suffix}`.slice(0, 80);
}

function normalizeSpecialties(value: string[] | null) {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim().slice(0, 40))
        .filter(Boolean)
        .slice(0, 12)
    : [];
}

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 36);
}

function isAllowedTable(table: string): table is keyof typeof allowedTables {
  return table in allowedTables;
}

function sanitizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed ? trimmed.slice(0, maxLength) : null;
}
