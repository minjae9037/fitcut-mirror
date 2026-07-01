import { NextResponse } from "next/server";
import { sanitizeAgeGroup } from "@/lib/mirilook-demographics";
import { HairMoneyRecommendationCost } from "@/lib/mirilook-payments";
import {
  getRegionSeedStylesByAudience,
  isMirilookRegion,
  type MirilookRegionId,
} from "@/lib/mirilook-regions";
import {
  sanitizeAudience,
} from "@/lib/mirilook-styles";
import { spendHairMoneyForRecommendation } from "@/lib/server/hair-money";
import {
  recommendHairStyles,
  type PremiumAddOnId,
  type RecommendationPhotoSlot,
  type RecommendationModeId,
} from "@/lib/server/openai-recommendations";
import { verifyActivePaymentEntitlement } from "@/lib/server/payment-entitlements";
import { protectMutationRequest } from "@/lib/server/request-security";
import { getVerifiedSupabaseUser } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";
export const maxDuration = 60;

const fallbackNotes = [
  "내 사진을 바탕으로 어울리는 헤어스타일을 정교하게 추천합니다.",
  "Choose a look, preview it on your face, and bring a clearer reference to your stylist.",
  "마음에 드는 디자인을 누르면 크게 확인하고, 버튼을 눌러 상담용 9장을 생성할 수 있습니다.",
];

const fallbackNotesByAudience = {
  male: fallbackNotes,
  female: [
    "여성 헤어 전용 카탈로그를 기준으로 얼굴형, 기장, 컬, 컬러 조화를 함께 봅니다.",
    "Choose a women's salon style, preview it on your face, and bring a clearer reference to your stylist.",
    "마음에 드는 디자인을 누르면 크게 확인하고, 같은 스타일의 상담용 9장을 생성할 수 있습니다.",
  ],
} as const;

type RecommendationPhotoContext = {
  hasActualFront: boolean;
  primaryReferenceSlot: RecommendationPhotoSlot;
  secondaryReferenceSlot: RecommendationPhotoSlot;
  uploadedSlots: RecommendationPhotoSlot[];
};

export async function POST(request: Request) {
  const startedAt = Date.now();
  let durationContext: Record<string, unknown> = {};
  const securityError = protectMutationRequest(request, {
    maxBodyBytes: 32 * 1024 * 1024,
    rateLimit: {
      key: "hairstyles:recommend",
      limit: 18,
      windowMs: 10 * 60 * 1000,
    },
  });

  if (securityError) {
    return securityError;
  }

  try {
    if (!hasFormContentType(request)) {
      return NextResponse.json(
        { error: "좌측면, 정면, 우측면 중 최소 2장이 필요합니다." },
        { status: 400 },
      );
    }

    const formData = await request.formData();
    const front = formData.get("front");
    const side = formData.get("side");
    const leftSide = formData.get("leftSide");
    const rightSide = formData.get("rightSide");
    const photoContext = sanitizePhotoContext(formData.get("photoContext"));
    const ageGroup = sanitizeAgeGroup(formData.get("ageGroup"));
    const audience = sanitizeAudience(formData.get("audience"));
    const region = parseRequiredRegion(formData.get("region"));
    const styleMemo = sanitizeStyleMemo(formData.get("styleMemo"));
    const requestId = sanitizeRequestId(formData.get("requestId"));
    const recommendationMode = sanitizeRecommendationMode(
      formData.get("recommendationMode"),
    );
    const premiumAddOns = sanitizePremiumAddOns(
      formData.get("premiumAddOns"),
      audience,
    );
    durationContext = {
      audience,
      premiumAddOnCount: premiumAddOns.length,
      recommendationMode,
      region,
      requestId,
    };

    if (!region) {
      return NextResponse.json(
        {
          error:
            "Country 버튼에서 선택한 국가 정보가 필요합니다. 국가를 다시 선택한 뒤 추천을 요청해 주세요.",
          reason: "invalid_region",
        },
        { status: 400 },
      );
    }

    if (premiumAddOns.length) {
      const entitlement = await verifyActivePaymentEntitlement(
        request,
        "premium_addons",
      );

      if (!entitlement.active) {
        return NextResponse.json(
          {
            error:
              "코디/메이크업 확장 상담은 프리미엄 스타일 리포트 결제 후 사용할 수 있습니다.",
            reason: entitlement.reason,
          },
          { status: entitlement.status },
        );
      }
    }

    const photoPayload = resolveRecommendationPhotoPayload({
      front,
      leftSide,
      photoContext,
      rightSide,
      side,
    });

    if (!photoPayload) {
      return NextResponse.json(
        { error: "좌측면, 정면, 우측면 중 최소 2장이 필요합니다." },
        { status: 400 },
      );
    }

    const user = await getVerifiedSupabaseUser(request);

    if (!user) {
      return NextResponse.json(
        {
          error:
            "스타일 추천은 Hair Money 차감을 위해 로그인 후 사용할 수 있습니다.",
          reason: "not_authenticated",
        },
        { status: 401 },
      );
    }

    const hairMoney = await spendHairMoneyForRecommendation({
      audience,
      profileId: user.id,
      recommendationMode,
      requestId,
      region,
    });

    if (!hairMoney.applied && hairMoney.reason !== "already_applied") {
      return NextResponse.json(
        {
          balance: hairMoney.balance,
          cost: HairMoneyRecommendationCost,
          error: getHairMoneyErrorMessage(hairMoney.reason),
          reason: hairMoney.reason,
        },
        { status: getHairMoneyStatusCode(hairMoney.reason) },
      );
    }

    try {
      const recommendationStartedAt = Date.now();
      const recommendation = await recommendHairStyles({
        ageGroup,
        audience,
        front: photoPayload.front,
        leftSide: photoPayload.leftSide,
        photoContext: photoPayload.photoContext,
        region,
        rightSide: photoPayload.rightSide,
        side: photoPayload.side,
        premiumAddOns,
        recommendationMode,
        styleMemo,
      });
      logApiDuration("hairstyles/recommend", startedAt, {
        ...durationContext,
        recommendationElapsedMs: Date.now() - recommendationStartedAt,
        status: "ok",
      });

      return NextResponse.json({
        hairMoney: {
          balance: hairMoney.balance,
          charged: HairMoneyRecommendationCost,
          duplicate: hairMoney.reason === "already_applied",
        },
        mode: "live",
        ...recommendation,
      });
    } catch (error) {
      console.error("OpenAI recommendation failed", error);
      logApiDuration("hairstyles/recommend", startedAt, {
        ...durationContext,
        error: getErrorMessage(error),
        status: "fallback",
      });

      return NextResponse.json({
        hairMoney: {
          balance: hairMoney.balance,
          charged: HairMoneyRecommendationCost,
          duplicate: hairMoney.reason === "already_applied",
        },
        mode: "fallback",
        notes: fallbackNotesByAudience[audience],
        recommendations: getRegionSeedStylesByAudience(region, audience),
        warning:
          error instanceof Error
            ? `${error.message} 환불 검토가 필요한 경우 고객지원으로 문의해 주세요.`
            : "헤어스타일 추천 분석에 실패했습니다. 환불 검토가 필요한 경우 고객지원으로 문의해 주세요.",
      });
    }
  } catch (error) {
    console.error(error);
    logApiDuration("hairstyles/recommend", startedAt, {
      ...durationContext,
      error: getErrorMessage(error),
      status: "error",
    });

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "헤어스타일 추천 생성에 실패했습니다.",
      },
      { status: 500 },
    );
  }
}

function logApiDuration(
  route: string,
  startedAt: number,
  context: Record<string, unknown>,
) {
  console.info("mirilook api duration", {
    route,
    elapsedMs: Date.now() - startedAt,
    ...context,
  });
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function hasFormContentType(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  return (
    contentType.includes("multipart/form-data") ||
    contentType.includes("application/x-www-form-urlencoded")
  );
}

function sanitizeStyleMemo(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/[<>]/g, "").trim().slice(0, 1400);
}

function parseRequiredRegion(value: FormDataEntryValue | null): MirilookRegionId | null {
  if (typeof value !== "string") {
    return null;
  }

  return isMirilookRegion(value) ? value : null;
}

function resolveRecommendationPhotoPayload({
  front,
  leftSide,
  photoContext,
  rightSide,
  side,
}: {
  front: FormDataEntryValue | null;
  leftSide: FormDataEntryValue | null;
  photoContext: RecommendationPhotoContext;
  rightSide: FormDataEntryValue | null;
  side: FormDataEntryValue | null;
}) {
  const files = {
    front: toImageFile(front),
    left: toImageFile(leftSide),
    right: toImageFile(rightSide),
    side: toImageFile(side),
  };
  const orderedSlots = uniqueSlots([
    photoContext.primaryReferenceSlot,
    photoContext.secondaryReferenceSlot,
    ...photoContext.uploadedSlots,
    "front",
    "left",
    "right",
    "side",
  ]);
  const primarySlot = orderedSlots.find((slot) => files[slot]);
  const secondarySlot = orderedSlots.find(
    (slot) => slot !== primarySlot && files[slot],
  );

  if (!primarySlot || !secondarySlot) {
    return null;
  }

  const primaryFile = files[primarySlot];
  const secondaryFile = files[secondarySlot];

  if (!primaryFile || !secondaryFile) {
    return null;
  }

  const usedReferenceSlots = new Set<RecommendationPhotoSlot>([
    primarySlot,
    secondarySlot,
  ]);
  const normalizedContext: RecommendationPhotoContext = {
    hasActualFront: Boolean(files.front) && primarySlot === "front",
    primaryReferenceSlot: primarySlot,
    secondaryReferenceSlot: secondarySlot,
    uploadedSlots: uniqueSlots([
      ...photoContext.uploadedSlots,
      ...(["front", "left", "right"] as RecommendationPhotoSlot[]).filter(
        (slot) => files[slot],
      ),
    ]).filter((slot) => slot !== "side"),
  };

  return {
    front: primaryFile,
    leftSide:
      files.left && !usedReferenceSlots.has("left") ? files.left : undefined,
    photoContext: normalizedContext,
    rightSide:
      files.right && !usedReferenceSlots.has("right") ? files.right : undefined,
    side: secondaryFile,
  };
}

function toImageFile(value: FormDataEntryValue | null) {
  return value instanceof File && value.size > 0 ? value : null;
}

function sanitizePhotoContext(
  value: FormDataEntryValue | null,
): RecommendationPhotoContext {
  if (typeof value !== "string" || !value.trim()) {
    return defaultPhotoContext();
  }

  try {
    const parsed = JSON.parse(value) as Partial<RecommendationPhotoContext>;
    const uploadedSlots = Array.isArray(parsed.uploadedSlots)
      ? uniqueSlots(parsed.uploadedSlots)
      : [];
    const primaryReferenceSlot = sanitizePhotoSlot(parsed.primaryReferenceSlot);
    const secondaryReferenceSlot = sanitizePhotoSlot(parsed.secondaryReferenceSlot);

    return {
      hasActualFront: Boolean(parsed.hasActualFront),
      primaryReferenceSlot: primaryReferenceSlot ?? "front",
      secondaryReferenceSlot: secondaryReferenceSlot ?? "side",
      uploadedSlots,
    };
  } catch {
    return defaultPhotoContext();
  }
}

function defaultPhotoContext(): RecommendationPhotoContext {
  return {
    hasActualFront: true,
    primaryReferenceSlot: "front",
    secondaryReferenceSlot: "side",
    uploadedSlots: ["front", "side"],
  };
}

function sanitizePhotoSlot(value: unknown): RecommendationPhotoSlot | null {
  return value === "left" || value === "front" || value === "right" || value === "side"
    ? value
    : null;
}

function uniqueSlots(values: unknown[]) {
  const slots: RecommendationPhotoSlot[] = [];

  values.forEach((value) => {
    const slot = sanitizePhotoSlot(value);

    if (slot && !slots.includes(slot)) {
      slots.push(slot);
    }
  });

  return slots;
}

function sanitizeRequestId(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return crypto.randomUUID();
  }

  const trimmed = value.trim();

  return /^rec_[a-zA-Z0-9_-]{8,96}$/.test(trimmed)
    ? trimmed
    : crypto.randomUUID();
}

function sanitizeRecommendationMode(
  value: FormDataEntryValue | null,
): RecommendationModeId {
  return value === "face-fit" ? "face-fit" : "current-length";
}

function sanitizePremiumAddOns(
  value: FormDataEntryValue | null,
  audience: "male" | "female",
): PremiumAddOnId[] {
  if (typeof value !== "string" || !value.trim()) {
    return [];
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(value);
  } catch {
    parsed = value.split(",");
  }

  if (!Array.isArray(parsed)) {
    return [];
  }

  const allowed = new Set<PremiumAddOnId>(["outfit-coordination"]);

  if (audience === "female") {
    allowed.add("makeup-style");
  }

  return parsed
    .filter((item): item is PremiumAddOnId => typeof item === "string")
    .filter((item) => allowed.has(item))
    .slice(0, 2);
}

function getHairMoneyErrorMessage(reason: string | undefined) {
  switch (reason) {
    case "insufficient_hair_money":
      return `Hair Money가 부족합니다. 스토어에서 충전 후 다시 추천을 요청해 주세요.`;
    case "supabase_not_configured":
      return "Hair Money 원장이 연결되지 않아 추천 차감을 처리할 수 없습니다.";
    case "supabase_rpc_failed":
      return "Hair Money 차감 처리 중 오류가 발생했습니다.";
    default:
      return "Hair Money 차감이 완료되지 않아 추천을 시작하지 않았습니다.";
  }
}

function getHairMoneyStatusCode(reason: string | undefined) {
  if (reason === "insufficient_hair_money") {
    return 402;
  }

  if (reason === "supabase_not_configured") {
    return 503;
  }

  return 500;
}
