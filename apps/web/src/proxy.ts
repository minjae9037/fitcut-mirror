import { NextRequest, NextResponse } from "next/server";
import {
  MirilookAdminSessionCookieName,
  verifyMirilookAdminSessionToken,
} from "@/lib/mirilook-admin-session";

export async function proxy(request: NextRequest) {
  if (isHistoryPath(request.nextUrl.pathname)) {
    return withSecurityHeaders(
      request,
      NextResponse.redirect(new URL("/mypage/", request.url), 307),
    );
  }

  if (!isAdminPath(request.nextUrl.pathname)) {
    return withSecurityHeaders(request, NextResponse.next());
  }

  const adminSession = await verifyMirilookAdminSessionToken(
    request.cookies.get(MirilookAdminSessionCookieName)?.value,
  );

  if (adminSession) {
    return withSecurityHeaders(request, NextResponse.next());
  }

  const adminPassword = cleanEnvValue(
    process.env.MIRILOOK_ADMIN_PASSWORD ?? process.env.FITCUT_ADMIN_PASSWORD,
  );
  const adminPasswordHash = normalizeSha256Hash(
    cleanEnvValue(
      process.env.MIRILOOK_ADMIN_PASSWORD_SHA256 ??
        process.env.FITCUT_ADMIN_PASSWORD_SHA256,
    ),
  );

  if (!adminPassword && !adminPasswordHash) {
    if (process.env.VERCEL_ENV === "production") {
      return withSecurityHeaders(
        request,
        new NextResponse("Admin password is not configured.", {
          status: 503,
        }),
      );
    }

    return withSecurityHeaders(request, NextResponse.next());
  }

  const adminUser =
    cleanEnvValue(process.env.MIRILOOK_ADMIN_USER ?? process.env.FITCUT_ADMIN_USER) ||
    "mirilook";
  const authorization = request.headers.get("authorization");

  if (authorization?.startsWith("Basic ")) {
    const [user, password] = decodeBasicAuth(
      authorization.slice("Basic ".length),
    );

    if (
      user === adminUser &&
      (await passwordMatches(password, adminPassword, adminPasswordHash))
    ) {
      return withSecurityHeaders(request, NextResponse.next());
    }
  }

  return withSecurityHeaders(
    request,
    new NextResponse("Authentication required.", {
      headers: {
        "WWW-Authenticate": 'Basic realm="Miri Look Admin"',
      },
      status: 401,
    }),
  );
}

function withSecurityHeaders(request: NextRequest, response: NextResponse) {
  const isSecure =
    request.nextUrl.protocol === "https:" ||
    request.headers.get("x-forwarded-proto") === "https";
  const csp = ["frame-ancestors 'none'", "base-uri 'self'", "object-src 'none'"];

  if (isSecure) {
    csp.push("upgrade-insecure-requests");
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload",
    );
  }

  response.headers.set("Content-Security-Policy", csp.join("; "));
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  response.headers.set("Origin-Agent-Cluster", "?1");
  response.headers.set("Permissions-Policy", "geolocation=(), microphone=()");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");

  if (isAdminPath(request.nextUrl.pathname)) {
    response.headers.set("Cache-Control", "no-store, max-age=0");
  }

  return response;
}

function isAdminPath(pathname: string) {
  return (
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/api/admin" ||
    pathname.startsWith("/api/admin/")
  );
}

function isHistoryPath(pathname: string) {
  return pathname === "/history" || pathname === "/history/";
}

function decodeBasicAuth(encoded: string) {
  try {
    const decoded = atob(encoded);
    const separatorIndex = decoded.indexOf(":");

    if (separatorIndex < 0) {
      return ["", ""];
    }

    return [
      decoded.slice(0, separatorIndex),
      decoded.slice(separatorIndex + 1),
    ];
  } catch {
    return ["", ""];
  }
}

async function passwordMatches(
  password: string,
  rawPassword: string,
  passwordHash: string,
) {
  if (rawPassword && password === rawPassword) {
    return true;
  }

  if (!passwordHash) {
    return false;
  }

  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(password),
  );
  const hex = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  return hex === passwordHash;
}

function cleanEnvValue(value: string | undefined) {
  return value?.replace(/^['"]|['"]$/g, "").trim() ?? "";
}

function normalizeSha256Hash(value: string) {
  const normalized = value.toLowerCase();

  return /^[a-f0-9]{64}$/.test(normalized) ? normalized : "";
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|map|txt|xml|json)$).*)",
  ],
};
