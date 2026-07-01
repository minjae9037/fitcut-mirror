import { NextResponse } from "next/server";
import { HairMoneyExtraConsultationCost } from "@/lib/mirilook-payments";
import { sanitizeRegion } from "@/lib/mirilook-regions";
import { sanitizeAudience } from "@/lib/mirilook-styles";
import { spendHairMoneyForExtraConsultation } from "@/lib/server/hair-money";
import { protectMutationRequest } from "@/lib/server/request-security";
import { getVerifiedSupabaseUser } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";
export const maxDuration = 30;

// Charges Hair Money for an ADDITIONAL consultation set (9 angles) within the
// same recommendation cycle. The first set per cycle is free; each extra set
// for a different recommended style costs HairMoneyExtraConsultationCost and is
// confirmed by the customer in a popup before this endpoint is called.
export async function POST(request: Request) {
  const securityError = protectMutationRequest(request, {
    maxBodyBytes: 16 * 1024,
    rateLimit: {
      key: "hairstyles:consultation-charge",
      limit: 30,
      windowMs: 10 * 60 * 1000,
    },
  });

  if (securityError) {
    return securityError;
  }

  let body: {
    audience?: string;
    region?: string;
    requestId?: string;
    styleId?: string;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const requestId =
    typeof body.requestId === "string" ? body.requestId.trim().slice(0, 80) : "";

  if (!requestId) {
    return NextResponse.json(
      { error: "요청 식별자가 필요합니다.", reason: "missing_request_id" },
      { status: 400 },
    );
  }

  const user = await getVerifiedSupabaseUser(request);

  if (!user) {
    return NextResponse.json(
      {
        error:
          "추가 상담용 9장 생성은 Hair Money 차감을 위해 로그인 후 사용할 수 있습니다.",
        reason: "not_authenticated",
      },
      { status: 401 },
    );
  }

  const audience = sanitizeAudience(body.audience ?? null);
  const region = sanitizeRegion(body.region ?? null);
  const styleId =
    typeof body.styleId === "string" ? body.styleId.trim().slice(0, 80) : "";

  const hairMoney = await spendHairMoneyForExtraConsultation({
    audience,
    profileId: user.id,
    region,
    requestId,
    styleId,
  });

  if (!hairMoney.applied && hairMoney.reason !== "already_applied") {
    return NextResponse.json(
      {
        balance: hairMoney.balance,
        cost: HairMoneyExtraConsultationCost,
        error: getHairMoneyErrorMessage(hairMoney.reason),
        reason: hairMoney.reason,
      },
      { status: getHairMoneyStatusCode(hairMoney.reason) },
    );
  }

  return NextResponse.json({
    applied: true,
    balance: hairMoney.balance,
    cost: HairMoneyExtraConsultationCost,
    duplicate: hairMoney.reason === "already_applied",
  });
}

function getHairMoneyErrorMessage(reason: string | undefined) {
  switch (reason) {
    case "insufficient_hair_money":
      return "Hair Money가 부족합니다. 스토어에서 충전 후 다시 시도해 주세요.";
    case "supabase_not_configured":
      return "Hair Money 원장이 연결되지 않아 차감을 처리할 수 없습니다.";
    case "supabase_rpc_failed":
      return "Hair Money 차감 처리 중 오류가 발생했습니다.";
    default:
      return "Hair Money 차감이 완료되지 않아 추가 상담을 시작하지 않았습니다.";
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
