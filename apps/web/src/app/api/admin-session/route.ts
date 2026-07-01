import { NextResponse } from "next/server";
import {
  createMirilookAdminSessionToken,
  MirilookAdminSessionCookieName,
  MirilookAdminSessionMaxAgeSeconds,
} from "@/lib/mirilook-admin-session";
import { isMirilookAdminUser } from "@/lib/server/mirilook-admins";
import { protectMutationRequest } from "@/lib/server/request-security";
import { getVerifiedSupabaseUser } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  const securityError = protectMutationRequest(request, {
    maxBodyBytes: 4 * 1024,
    rateLimit: {
      key: "admin-session:create",
      limit: 20,
      windowMs: 10 * 60 * 1000,
    },
  });

  if (securityError) {
    return securityError;
  }

  const user = await getVerifiedSupabaseUser(request);

  if (!isMirilookAdminUser(user)) {
    return NextResponse.json(
      {
        accepted: false,
        reason: "admin_email_required",
      },
      { status: 403 },
    );
  }

  const token = await createMirilookAdminSessionToken(user.email ?? "");

  if (!token) {
    return NextResponse.json(
      {
        accepted: false,
        reason: "admin_session_not_configured",
      },
      { status: 503 },
    );
  }

  const response = NextResponse.json({
    accepted: true,
    adminEmail: user.email,
  });

  response.cookies.set(MirilookAdminSessionCookieName, token, {
    httpOnly: true,
    maxAge: MirilookAdminSessionMaxAgeSeconds,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}

export async function DELETE(request: Request) {
  const securityError = protectMutationRequest(request, {
    maxBodyBytes: 4 * 1024,
    rateLimit: {
      key: "admin-session:delete",
      limit: 40,
      windowMs: 10 * 60 * 1000,
    },
  });

  if (securityError) {
    return securityError;
  }

  const response = NextResponse.json({
    accepted: true,
  });

  response.cookies.set(MirilookAdminSessionCookieName, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
