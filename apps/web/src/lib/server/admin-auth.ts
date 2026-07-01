import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import {
  isMirilookAdminEmail,
  MirilookAdminSessionCookieName,
} from "@/lib/mirilook-admin-session";
import { cleanEnvValue } from "@/lib/server/env";

const adminRealm = 'Basic realm="Miri Look Admin"';

export function requireAdminRequest(request: Request) {
  if (hasValidAdminSessionCookie(request.headers.get("cookie"))) {
    return null;
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
      return NextResponse.json(
        {
          error: "admin_password_not_configured",
        },
        { status: 503 },
      );
    }

    return null;
  }

  const adminUser =
    cleanEnvValue(process.env.MIRILOOK_ADMIN_USER ?? process.env.FITCUT_ADMIN_USER) ||
    "mirilook";
  const credentials = parseBasicAuthorization(
    request.headers.get("authorization"),
  );

  if (
    credentials &&
    safeEqual(credentials.user, adminUser) &&
    passwordMatches(credentials.password, adminPassword, adminPasswordHash)
  ) {
    return null;
  }

  return NextResponse.json(
    {
      error: "admin_auth_required",
    },
    {
      headers: {
        "WWW-Authenticate": adminRealm,
      },
      status: 401,
    },
  );
}

function hasValidAdminSessionCookie(cookieHeader: string | null) {
  const token = getCookieValue(cookieHeader, MirilookAdminSessionCookieName);

  if (!token) {
    return false;
  }

  const [version, encodedPayload, signature] = token.split(".");

  if (version !== "v1" || !encodedPayload || !signature) {
    return false;
  }

  const secret = getAdminSessionSecret();

  if (!secret) {
    return false;
  }

  const expected = createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64url");

  if (!safeEqual(signature, expected)) {
    return false;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as { email?: string; exp?: number };

    return Boolean(
      payload.email &&
        payload.exp &&
        payload.exp >= Math.floor(Date.now() / 1000) &&
        isMirilookAdminEmail(payload.email),
    );
  } catch {
    return false;
  }
}

function getCookieValue(cookieHeader: string | null, name: string) {
  if (!cookieHeader) {
    return "";
  }

  const prefix = `${name}=`;
  const cookie = cookieHeader
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(prefix));

  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : "";
}

function getAdminSessionSecret() {
  return (
    cleanEnvValue(process.env.MIRILOOK_ADMIN_SESSION_SECRET) ||
    cleanEnvValue(process.env.MIRILOOK_ADMIN_PASSWORD_SHA256) ||
    cleanEnvValue(process.env.FITCUT_ADMIN_PASSWORD_SHA256) ||
    cleanEnvValue(process.env.MIRILOOK_ADMIN_PASSWORD) ||
    cleanEnvValue(process.env.FITCUT_ADMIN_PASSWORD) ||
    cleanEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY)
  );
}

function parseBasicAuthorization(value: string | null) {
  if (!value?.startsWith("Basic ")) {
    return null;
  }

  try {
    const decoded = Buffer.from(value.slice("Basic ".length), "base64").toString(
      "utf8",
    );
    const separatorIndex = decoded.indexOf(":");

    if (separatorIndex < 0) {
      return null;
    }

    return {
      password: decoded.slice(separatorIndex + 1),
      user: decoded.slice(0, separatorIndex),
    };
  } catch {
    return null;
  }
}

function safeEqual(left: string, right: string) {
  if (!left || !right) {
    return false;
  }

  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function passwordMatches(
  password: string,
  rawPassword: string,
  passwordHash: string,
) {
  if (rawPassword && safeEqual(password, rawPassword)) {
    return true;
  }

  if (!passwordHash) {
    return false;
  }

  const actualHash = createHash("sha256").update(password).digest("hex");

  return safeEqual(actualHash, passwordHash);
}

function normalizeSha256Hash(value: string) {
  const normalized = value.toLowerCase();

  return /^[a-f0-9]{64}$/.test(normalized) ? normalized : "";
}
