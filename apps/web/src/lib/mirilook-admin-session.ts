export const MirilookAdminSessionCookieName = "mirilook_admin_session";
export const MirilookAdminSessionMaxAgeSeconds = 60 * 60 * 8;

type AdminSessionPayload = {
  email: string;
  exp: number;
};

const defaultAdminEmails = ["minjae9037@naver.com"];

export function isMirilookAdminEmail(email: string | null | undefined) {
  const normalized = normalizeEmail(email);

  return Boolean(normalized && getMirilookAdminEmails().has(normalized));
}

export function getMirilookAdminEmails() {
  const configured =
    process.env.MIRILOOK_ADMIN_EMAILS ?? process.env.FITCUT_ADMIN_EMAILS ?? "";
  const emails = configured
    .split(",")
    .map((email) => normalizeEmail(email))
    .filter((email): email is string => Boolean(email));

  return new Set([...defaultAdminEmails, ...emails]);
}

export async function createMirilookAdminSessionToken(email: string) {
  const normalized = normalizeEmail(email);

  if (!normalized || !isMirilookAdminEmail(normalized)) {
    return "";
  }

  const payload: AdminSessionPayload = {
    email: normalized,
    exp: Math.floor(Date.now() / 1000) + MirilookAdminSessionMaxAgeSeconds,
  };
  const encodedPayload = bytesToBase64Url(
    new TextEncoder().encode(JSON.stringify(payload)),
  );
  const signature = await signAdminSessionValue(encodedPayload);

  return signature ? `v1.${encodedPayload}.${signature}` : "";
}

export async function verifyMirilookAdminSessionToken(value: string | undefined) {
  if (!value) {
    return null;
  }

  const [version, encodedPayload, signature] = value.split(".");

  if (version !== "v1" || !encodedPayload || !signature) {
    return null;
  }

  const expected = await signAdminSessionValue(encodedPayload);

  if (!expected || expected !== signature) {
    return null;
  }

  let payload: AdminSessionPayload;

  try {
    payload = JSON.parse(
      new TextDecoder().decode(base64UrlToBytes(encodedPayload)),
    ) as AdminSessionPayload;
  } catch {
    return null;
  }

  if (
    !payload.email ||
    !payload.exp ||
    payload.exp < Math.floor(Date.now() / 1000) ||
    !isMirilookAdminEmail(payload.email)
  ) {
    return null;
  }

  return payload;
}

export function getMirilookAdminSessionTokenFromCookieHeader(
  cookieHeader: string | null,
) {
  if (!cookieHeader) {
    return "";
  }

  const cookies = cookieHeader.split(";").map((item) => item.trim());
  const prefix = `${MirilookAdminSessionCookieName}=`;
  const cookie = cookies.find((item) => item.startsWith(prefix));

  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : "";
}

function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() || "";
}

async function signAdminSessionValue(value: string) {
  const secret = getAdminSessionSecret();

  if (!secret) {
    return "";
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    {
      hash: "SHA-256",
      name: "HMAC",
    },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value),
  );

  return bytesToBase64Url(new Uint8Array(signature));
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

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function cleanEnvValue(value: string | undefined) {
  return value
    ?.trim()
    .replace(/^["']|["']$/g, "")
    .replace(/^\uFEFF/, "")
    .replace(/^[^\x20-\x7E]+/, "")
    .trim() ?? "";
}
