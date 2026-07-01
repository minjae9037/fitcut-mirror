import {
  getSupabaseAdminClient,
  getVerifiedSupabaseUser,
} from "@/lib/server/supabase-admin";
import { protectMutationRequest } from "@/lib/server/request-security";

export const runtime = "nodejs";
export const maxDuration = 30;

type SharePayload = {
  sessionId?: string;
  ttlDays?: number;
};

type ShareRevokePayload = {
  sessionId?: string;
  token?: string;
};

export async function POST(request: Request) {
  const securityError = protectMutationRequest(request, {
    maxBodyBytes: 16 * 1024,
    rateLimit: {
      key: "consultations:share:create",
      limit: 40,
      windowMs: 10 * 60 * 1000,
    },
  });

  if (securityError) {
    return securityError;
  }

  let payload: SharePayload;

  try {
    payload = (await request.json()) as SharePayload;
  } catch {
    return Response.json({ error: "Invalid share payload." }, { status: 400 });
  }

  const sessionId = sanitizeId(payload.sessionId);

  if (!sessionId) {
    return Response.json({ error: "Session id is required." }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return Response.json({
      created: false,
      reason: "supabase_not_configured",
    });
  }

  const user = await getVerifiedSupabaseUser(request);

  if (!user) {
    return Response.json(
      {
        created: false,
        reason: "not_authenticated",
      },
      { status: 401 },
    );
  }

  const existing = await supabase
    .from("generation_sessions")
    .select("id, profile_id")
    .eq("id", sessionId)
    .maybeSingle();

  if (existing.error) {
    console.error("share session lookup failed", existing.error);

    return Response.json(
      {
        created: false,
        reason: "supabase_lookup_failed",
      },
      { status: 500 },
    );
  }

  if (!existing.data) {
    return Response.json(
      {
        created: false,
        reason: "session_not_found",
      },
      { status: 404 },
    );
  }

  if (existing.data.profile_id !== user.id) {
    return Response.json(
      {
        created: false,
        reason: "not_owner",
      },
      { status: 403 },
    );
  }

  const ttlDays = normalizeTtlDays(payload.ttlDays);
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000).toISOString();
  const existingActiveShare = await supabase
    .from("consultation_shares")
    .select("token, expires_at")
    .eq("session_id", sessionId)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingActiveShare.error) {
    console.error("consultation share reuse lookup failed", existingActiveShare.error);

    return Response.json(
      {
        created: false,
        reason: "supabase_lookup_failed",
      },
      { status: 500 },
    );
  }

  if (existingActiveShare.data?.token) {
    const currentExpiresAt = new Date(existingActiveShare.data.expires_at).getTime();
    const nextExpiresAt = new Date(expiresAt).getTime();
    let responseExpiresAt = existingActiveShare.data.expires_at as string;

    if (Number.isFinite(currentExpiresAt) && currentExpiresAt < nextExpiresAt) {
      const update = await supabase
        .from("consultation_shares")
        .update({ expires_at: expiresAt })
        .eq("token", existingActiveShare.data.token)
        .is("revoked_at", null);

      if (update.error) {
        console.error("consultation share expiration refresh failed", update.error);

        return Response.json(
          {
            created: false,
            reason: "supabase_update_failed",
          },
          { status: 500 },
        );
      }

      responseExpiresAt = expiresAt;
    }

    return Response.json({
      created: true,
      expiresAt: responseExpiresAt,
      reused: true,
      shareUrl: buildShareUrl(
        existingActiveShare.data.token,
        request.url,
        responseExpiresAt,
      ),
      token: existingActiveShare.data.token,
    });
  }

  const token = createShareToken();
  const insert = await supabase.from("consultation_shares").insert({
    expires_at: expiresAt,
    session_id: sessionId,
    token,
  });

  if (insert.error) {
    console.error("consultation share insert failed", insert.error);

    return Response.json(
      {
        created: false,
        reason: "supabase_insert_failed",
      },
      { status: 500 },
    );
  }

  return Response.json({
    created: true,
    expiresAt,
    reused: false,
    shareUrl: buildShareUrl(token, request.url, expiresAt),
    token,
  });
}

export async function DELETE(request: Request) {
  const securityError = protectMutationRequest(request, {
    maxBodyBytes: 16 * 1024,
    rateLimit: {
      key: "consultations:share:delete",
      limit: 60,
      windowMs: 10 * 60 * 1000,
    },
  });

  if (securityError) {
    return securityError;
  }

  let payload: ShareRevokePayload;

  try {
    payload = (await request.json()) as ShareRevokePayload;
  } catch {
    return Response.json({ error: "Invalid share revoke payload." }, { status: 400 });
  }

  const sessionId = sanitizeId(payload.sessionId);
  const token = sanitizeToken(payload.token);

  if (!sessionId && !token) {
    return Response.json(
      { error: "Session id or share token is required." },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return Response.json({
      reason: "supabase_not_configured",
      revoked: false,
    });
  }

  const user = await getVerifiedSupabaseUser(request);

  if (!user) {
    return Response.json(
      {
        reason: "not_authenticated",
        revoked: false,
      },
      { status: 401 },
    );
  }

  const shareQuery = supabase
    .from("consultation_shares")
    .select("token, session_id, revoked_at")
    .is("revoked_at", null);
  const shareResult = token
    ? await shareQuery.eq("token", token)
    : await shareQuery.eq("session_id", sessionId);

  if (shareResult.error) {
    console.error("consultation share revoke lookup failed", shareResult.error);

    return Response.json(
      {
        reason: "supabase_lookup_failed",
        revoked: false,
      },
      { status: 500 },
    );
  }

  const shares = shareResult.data ?? [];

  if (!shares.length) {
    return Response.json({
      revoked: true,
      revokedCount: 0,
    });
  }

  const sessionIds = Array.from(new Set(shares.map((share) => share.session_id)));
  const sessionsResult = await supabase
    .from("generation_sessions")
    .select("id, profile_id")
    .in("id", sessionIds);

  if (sessionsResult.error) {
    console.error("consultation share revoke session lookup failed", sessionsResult.error);

    return Response.json(
      {
        reason: "supabase_lookup_failed",
        revoked: false,
      },
      { status: 500 },
    );
  }

  const ownedSessionIds = new Set(
    (sessionsResult.data ?? [])
      .filter((session) => session.profile_id === user.id)
      .map((session) => session.id),
  );

  if (ownedSessionIds.size !== sessionIds.length) {
    return Response.json(
      {
        reason: "not_owner",
        revoked: false,
      },
      { status: 403 },
    );
  }

  const tokens = shares.map((share) => share.token);
  const revokeResult = await supabase
    .from("consultation_shares")
    .update({ revoked_at: new Date().toISOString() })
    .in("token", tokens)
    .is("revoked_at", null)
    .select("token");

  if (revokeResult.error) {
    console.error("consultation share revoke failed", revokeResult.error);

    return Response.json(
      {
        reason: "supabase_update_failed",
        revoked: false,
      },
      { status: 500 },
    );
  }

  return Response.json({
    revoked: true,
    revokedCount: revokeResult.data?.length ?? 0,
  });
}

function createShareToken() {
  return `fs_${crypto.randomUUID().replace(/-/g, "")}${crypto
    .randomUUID()
    .replace(/-/g, "")
    .slice(0, 12)}`;
}

function buildShareUrl(token: string, requestUrl: string, expiresAt: string) {
  const url = new URL(`/share/${token}`, requestUrl);
  const version = new Date(expiresAt).getTime();

  if (Number.isFinite(version)) {
    url.searchParams.set("og", version.toString(36));
  }

  return url.toString();
}

function normalizeTtlDays(value: unknown) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 14;
  }

  return Math.max(1, Math.min(30, Math.round(parsed)));
}

function sanitizeId(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  const trimmed = value.trim();

  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(trimmed)) {
    return "";
  }

  return trimmed;
}

function sanitizeToken(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  const trimmed = value.trim();

  if (!/^fs_[a-zA-Z0-9]{16,80}$/.test(trimmed)) {
    return "";
  }

  return trimmed;
}
