import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";

// 네이버 로그인 콜백(백엔드). 네이버 개발자센터 > 내 애플리케이션 > API 설정의
// "Callback URL"에 이 주소를 그대로 등록해야 한다.
const CALLBACK = "https://mirilook.com/api/auth/naver/callback";

// 미리룩은 웹 서비스이므로 로그인 후 돌아갈 곳은 항상 https(mirilook.com / www / localhost)다.
function isAllowedRedirect(target: string) {
  return (
    /^https:\/\/(www\.)?mirilook\.com\//.test(target) ||
    /^http:\/\/localhost(:\d+)?\//.test(target)
  );
}

// 브라우저가 호출: /api/auth/naver/start?redirect=https://mirilook.com/login
// → 네이버 OAuth 인증 페이지로 302. 복귀 주소는 state에 실어 콜백에서 복원.
export async function GET(req: NextRequest) {
  const clientId = process.env.NAVER_LOGIN_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json(
      { error: "NAVER_LOGIN_CLIENT_ID 미설정" },
      { status: 500 },
    );
  }

  const requested = req.nextUrl.searchParams.get("redirect") ?? "";
  const appRedirect = isAllowedRedirect(requested)
    ? requested
    : "https://mirilook.com/login";

  // CSRF 방지 겸 복귀 주소 운반 (서버 저장소 없이 state에 인코딩)
  const state = Buffer.from(
    JSON.stringify({ r: appRedirect, n: randomUUID() }),
  ).toString("base64url");

  const url = new URL("https://nid.naver.com/oauth2.0/authorize");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", CALLBACK);
  url.searchParams.set("state", state);

  return NextResponse.redirect(url.toString());
}
