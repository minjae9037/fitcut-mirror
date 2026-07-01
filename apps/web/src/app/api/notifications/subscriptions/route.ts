import {
  getSupabaseAdminClient,
  getVerifiedSupabaseUser,
} from "@/lib/server/supabase-admin";
import { protectMutationRequest } from "@/lib/server/request-security";

export const runtime = "nodejs";
export const maxDuration = 30;

type SubscriptionPayload = {
  consentContext?: string;
  contact?: string;
  subscription?: {
    endpoint?: string;
    keys?: {
      auth?: string;
      p256dh?: string;
    };
  };
  userAgent?: string;
};

type DeletePayload = {
  endpoint?: string;
};

export async function POST(request: Request) {
  const securityError = protectMutationRequest(request, {
    maxBodyBytes: 16 * 1024,
    rateLimit: {
      key: "notifications:subscriptions:create",
      limit: 40,
      windowMs: 10 * 60 * 1000,
    },
  });

  if (securityError) {
    return securityError;
  }

  let payload: SubscriptionPayload;

  try {
    payload = (await request.json()) as SubscriptionPayload;
  } catch {
    return Response.json({ error: "Invalid subscription payload." }, { status: 400 });
  }

  const normalized = normalizeSubscription(payload);

  if (!normalized) {
    return Response.json({ error: "Invalid push subscription." }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  const user = await getVerifiedSupabaseUser(request);

  if (!supabase) {
    return Response.json({
      accepted: false,
      reason: "supabase_not_configured",
    });
  }

  const result = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        auth: normalized.auth,
        consent_context: normalized.consentContext,
        contact: normalized.contact,
        endpoint: normalized.endpoint,
        p256dh: normalized.p256dh,
        profile_id: user?.id ?? null,
        status: "active",
        updated_at: new Date().toISOString(),
        user_agent: normalized.userAgent,
      },
      {
        onConflict: "endpoint",
      },
    )
    .select("id")
    .single();

  if (result.error) {
    console.error("push subscription upsert failed", result.error);

    return Response.json(
      {
        accepted: false,
        reason: "push_subscription_upsert_failed",
      },
      { status: 500 },
    );
  }

  return Response.json({
    accepted: true,
    subscriptionId: result.data?.id,
  });
}

export async function DELETE(request: Request) {
  const securityError = protectMutationRequest(request, {
    maxBodyBytes: 8 * 1024,
    rateLimit: {
      key: "notifications:subscriptions:delete",
      limit: 60,
      windowMs: 10 * 60 * 1000,
    },
  });

  if (securityError) {
    return securityError;
  }

  let payload: DeletePayload;

  try {
    payload = (await request.json()) as DeletePayload;
  } catch {
    return Response.json({ error: "Invalid subscription payload." }, { status: 400 });
  }

  const endpoint = sanitizeEndpoint(payload.endpoint);

  if (!endpoint) {
    return Response.json({ error: "Invalid endpoint." }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return Response.json({
      reason: "supabase_not_configured",
      revoked: false,
    });
  }

  const result = await supabase
    .from("push_subscriptions")
    .update({
      status: "revoked",
      updated_at: new Date().toISOString(),
    })
    .eq("endpoint", endpoint);

  if (result.error) {
    console.error("push subscription revoke failed", result.error);

    return Response.json(
      {
        reason: "push_subscription_revoke_failed",
        revoked: false,
      },
      { status: 500 },
    );
  }

  return Response.json({
    revoked: true,
  });
}

function normalizeSubscription(payload: SubscriptionPayload) {
  const endpoint = sanitizeEndpoint(payload.subscription?.endpoint);
  const p256dh = sanitizeText(payload.subscription?.keys?.p256dh, 512);
  const auth = sanitizeText(payload.subscription?.keys?.auth, 256);

  if (!endpoint || !p256dh || !auth) {
    return null;
  }

  return {
    auth,
    consentContext: sanitizeText(payload.consentContext, 500),
    contact: sanitizeText(payload.contact, 160),
    endpoint,
    p256dh,
    userAgent: sanitizeText(payload.userAgent, 500),
  };
}

function sanitizeEndpoint(value: unknown) {
  const text = sanitizeText(value, 1600);

  if (!text) {
    return null;
  }

  try {
    const url = new URL(text);

    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function sanitizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.replace(/[<>]/g, "").trim();

  return trimmed ? trimmed.slice(0, maxLength) : null;
}
