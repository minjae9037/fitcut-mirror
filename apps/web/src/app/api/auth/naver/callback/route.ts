import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

function isAllowedRedirect(target: string) {
  return (
    /^https:\/\/(www\.)?mirilook\.com\//.test(target) ||
    /^http:\/\/localhost(:\d+)?\//.test(target)
  );
}

// 네이버 → 백엔드 콜백. code로 토큰·프로필(이메일)을 받아 Supabase 유저를 보장하고,
// 매직링크 token_hash를 발급해 로그인 페이지로 돌려보낸다. 페이지는 verifyOtp로 세션 생성.
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const code = sp.get("code");
  const stateRaw = sp.get("state");
  const naverErr = sp.get("error");

  // state에서 복귀 주소 복원 (mirilook.com / localhost 만 허용)
  let appRedirect = "https://mirilook.com/login";

  try {
    if (stateRaw) {
      const decoded = JSON.parse(
        Buffer.from(stateRaw, "base64url").toString("utf8"),
      ) as { r?: unknown };

      if (typeof decoded.r === "string" && isAllowedRedirect(decoded.r)) {
        appRedirect = decoded.r;
      }
    }
  } catch {
    /* 기본값 사용 */
  }

  const sep = appRedirect.includes("?") ? "&" : "?";
  const fail = (msg: string) =>
    NextResponse.redirect(`${appRedirect}${sep}error=${encodeURIComponent(msg)}`);

  if (naverErr) {
    return fail(sp.get("error_description") || naverErr);
  }

  if (!code) {
    return fail("네이버 인증 코드가 없습니다.");
  }

  const clientId = process.env.NAVER_LOGIN_CLIENT_ID;
  const clientSecret = process.env.NAVER_LOGIN_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return fail("서버 네이버 로그인 설정이 누락됐어요.");
  }

  const admin = getSupabaseAdminClient();

  if (!admin) {
    return fail("로그인 서버 저장소가 연결되지 않았어요.");
  }

  try {
    // 1) code → access_token
    const tokenUrl = new URL("https://nid.naver.com/oauth2.0/token");
    tokenUrl.searchParams.set("grant_type", "authorization_code");
    tokenUrl.searchParams.set("client_id", clientId);
    tokenUrl.searchParams.set("client_secret", clientSecret);
    tokenUrl.searchParams.set("code", code);

    if (stateRaw) {
      tokenUrl.searchParams.set("state", stateRaw);
    }

    const tokenRes = await fetch(tokenUrl.toString(), { cache: "no-store" });
    const tokenJson = (await tokenRes.json()) as {
      access_token?: string;
      error_description?: string;
    };
    const accessToken = tokenJson.access_token;

    if (!accessToken) {
      return fail(tokenJson.error_description || "네이버 토큰 발급에 실패했어요.");
    }

    // 2) 프로필 조회 (이메일)
    const meRes = await fetch("https://openapi.naver.com/v1/nid/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    const meJson = (await meRes.json()) as {
      response?: { email?: string; name?: string; nickname?: string; id?: string };
    };
    const profile = meJson.response;
    const email = profile?.email;

    if (!email) {
      return fail("네이버 이메일 제공에 동의해야 로그인할 수 있어요.");
    }

    const name = profile?.name || profile?.nickname || "";

    // 3) Supabase 유저 보장 (이메일 기준). 이미 있으면(웹/카카오/구글 가입자) 그 계정에 연결.
    const { error: createErr } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { name, naver_id: profile?.id, provider: "naver" },
    });

    if (createErr && !/registered|already|exists/i.test(createErr.message)) {
      return fail("계정 생성 실패: " + createErr.message);
    }

    // 4) 매직링크 token_hash 발급(메일 발송 아님 — 토큰만 생성)
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      email,
      type: "magiclink",
    });
    const tokenHash = linkData?.properties?.hashed_token;

    if (linkErr || !tokenHash) {
      return fail("로그인 토큰 발급에 실패했어요.");
    }

    // 5) 로그인 페이지로 복귀 — token_hash 전달 → 페이지가 verifyOtp로 세션 생성
    return NextResponse.redirect(
      `${appRedirect}${sep}token_hash=${encodeURIComponent(tokenHash)}&type=magiclink&provider=naver`,
    );
  } catch (e) {
    return fail(
      "네이버 로그인 처리 중 오류: " + (e instanceof Error ? e.message : "unknown"),
    );
  }
}
