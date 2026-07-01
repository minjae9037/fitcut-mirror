import { queueNotificationEvent } from "@/lib/server/notifications";
import { getSupabaseAdminClient, getVerifiedSupabaseUser } from "@/lib/server/supabase-admin";
import { protectMutationRequest } from "@/lib/server/request-security";

export const runtime = "nodejs";
export const maxDuration = 30;

type SharePayload = {
  channel?: string;
  postId?: string;
  recipientHandle?: string;
  sessionKey?: string;
};

type ShareRecipient = {
  display_name: string | null;
  handle: string | null;
  id: string;
};

type ShareRecipientLookupResult =
  | {
      accepted: true;
      profile: ShareRecipient;
    }
  | {
      accepted: false;
      reason: string;
      status: number;
    };

type SupabaseAdminClient = NonNullable<ReturnType<typeof getSupabaseAdminClient>>;

export async function POST(request: Request) {
  const securityError = protectMutationRequest(request, {
    maxBodyBytes: 32 * 1024,
    rateLimit: {
      key: "community:social-shares",
      limit: 80,
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

  const postId = sanitizeUuid(payload.postId);

  if (!postId) {
    return Response.json(
      { accepted: false, reason: "invalid_share" },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return Response.json({ accepted: false, reason: "supabase_not_configured" });
  }

  const post = await supabase
    .from("social_posts")
    .select("id, status, visibility")
    .eq("id", postId)
    .maybeSingle();

  if (post.error) {
    console.error("social share post lookup failed", post.error);

    return Response.json(
      { accepted: false, reason: "post_lookup_failed" },
      { status: 500 },
    );
  }

  if (!post.data || post.data.status !== "published" || post.data.visibility !== "public") {
    return Response.json(
      { accepted: false, reason: "post_not_available" },
      { status: 404 },
    );
  }

  const user = await getVerifiedSupabaseUser(request);
  const sessionKey = sanitizeText(payload.sessionKey, 80);
  const channel = sanitizeChannel(payload.channel);
  const recipient =
    channel === "mirilook_direct"
      ? await findShareRecipient(supabase, payload.recipientHandle)
      : null;

  if (recipient && !recipient.accepted) {
    return Response.json(
      { accepted: false, reason: recipient.reason },
      { status: recipient.status },
    );
  }

  const insert = await supabase.from("social_shares").insert({
    channel,
    post_id: postId,
    session_key: user ? null : sessionKey,
    sharer_profile_id: user?.id ?? null,
  });

  if (insert.error) {
    console.error("social share insert failed", insert.error);

    return Response.json(
      { accepted: false, reason: "supabase_insert_failed" },
      { status: 500 },
    );
  }

  const count = await supabase
    .from("social_shares")
    .select("*", { count: "exact", head: true })
    .eq("post_id", postId);

  if (recipient?.profile) {
    const senderName = user?.email?.split("@")[0] || "미리룩 회원";

    await queueNotificationEvent({
      body: `${senderName}님이 커뮤니티 게시물을 공유했습니다.`,
      eventType: "social_share",
      payload: {
        channel,
        postId,
        recipientHandle: recipient.profile.handle,
      },
      targetProfileId: recipient.profile.id,
      title: "미리룩 공유",
      url: `/community?post=${postId}`,
    });
  }

  return Response.json({
    accepted: true,
    shareCount: count.count ?? null,
  });
}

async function findShareRecipient(
  supabase: SupabaseAdminClient,
  value: unknown,
): Promise<ShareRecipientLookupResult> {
  const recipientHandle = sanitizeRecipient(value);

  if (!recipientHandle) {
    return {
      accepted: false,
      reason: "invalid_recipient",
      status: 400,
    };
  }

  const byHandle = await supabase
    .from("profiles")
    .select("id, display_name, handle")
    .ilike("handle", recipientHandle)
    .maybeSingle<ShareRecipient>();

  if (byHandle.error) {
    console.error("social share recipient handle lookup failed", byHandle.error);

    return {
      accepted: false,
      reason: "recipient_lookup_failed",
      status: 500,
    };
  }

  if (byHandle.data) {
    return {
      accepted: true,
      profile: byHandle.data,
    };
  }

  const byDisplayName = await supabase
    .from("profiles")
    .select("id, display_name, handle")
    .ilike("display_name", recipientHandle)
    .maybeSingle<ShareRecipient>();

  if (byDisplayName.error) {
    console.error("social share recipient display name lookup failed", byDisplayName.error);

    return {
      accepted: false,
      reason: "recipient_lookup_failed",
      status: 500,
    };
  }

  if (byDisplayName.data) {
    return {
      accepted: true,
      profile: byDisplayName.data,
    };
  }

  return {
    accepted: false,
    reason: "recipient_not_found",
    status: 404,
  };
}

function sanitizeChannel(value: unknown) {
  if (typeof value !== "string") {
    return "web_share";
  }

  const channel = value
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);

  return channel || "web_share";
}

function sanitizeRecipient(value: unknown) {
  const text = sanitizeText(value, 80);

  if (!text) {
    return "";
  }

  return text.replace(/^@+/, "").trim();
}

function sanitizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.replace(/[<>]/g, "").trim();

  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function sanitizeUuid(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  const trimmed = value.trim();

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    trimmed,
  )
    ? trimmed
    : "";
}
