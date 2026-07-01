import webPush from "web-push";
import {
  type MirilookNotificationPayload,
} from "@/lib/mirilook-notifications";
import { readServerEnv } from "@/lib/server/env";
import { getSupabaseAdminClient } from "@/lib/server/supabase-admin";

type NotificationEventRow = {
  body: string | null;
  broadcast_all: boolean | null;
  event_type: string | null;
  id: string;
  payload: Record<string, unknown> | null;
  subscription_id: string | null;
  target_profile_id: string | null;
  title: string | null;
  url: string | null;
};

type PushSubscriptionRow = {
  auth: string | null;
  endpoint: string | null;
  id: string;
  p256dh: string | null;
  profile_id: string | null;
};

type QueueNotificationResult =
  | {
      eventId: string;
      queued: true;
    }
  | {
      queued: false;
      reason: string;
    };

export async function queueNotificationEvent(
  payload: MirilookNotificationPayload,
): Promise<QueueNotificationResult> {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return {
      queued: false,
      reason: "supabase_not_configured",
    };
  }

  const title = sanitizeText(payload.title, 120);
  const body = sanitizeText(payload.body, 500);

  if (!title || !body) {
    return {
      queued: false,
      reason: "invalid_notification_payload",
    };
  }

  const insert = await supabase
    .from("notification_events")
    .insert({
      body,
      broadcast_all: Boolean(payload.broadcastAll),
      event_type: sanitizeText(payload.eventType, 80) ?? "manual",
      payload: normalizeJsonPayload(payload.payload),
      status: "queued",
      subscription_id: sanitizeUuid(payload.subscriptionId),
      target_profile_id: sanitizeUuid(payload.targetProfileId),
      title,
      url: sanitizeUrlPath(payload.url),
    })
    .select("id")
    .single();

  if (insert.error) {
    console.error("notification event insert failed", insert.error);

    return {
      queued: false,
      reason: "notification_event_insert_failed",
    };
  }

  return {
    eventId: insert.data.id,
    queued: true,
  };
}

export async function dispatchQueuedNotifications(limit = 20) {
  const config = getWebPushConfig();

  if (!config.configured) {
    return {
      dispatchedEvents: 0,
      failedEvents: 0,
      reason: config.reason,
      sentNotifications: 0,
    };
  }

  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return {
      dispatchedEvents: 0,
      failedEvents: 0,
      reason: "supabase_not_configured",
      sentNotifications: 0,
    };
  }

  webPush.setVapidDetails(
    config.subject,
    config.publicKey,
    config.privateKey,
  );

  const eventResult = await supabase
    .from("notification_events")
    .select("id, subscription_id, target_profile_id, broadcast_all, event_type, title, body, url, payload")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(Math.max(1, Math.min(50, limit)));

  if (eventResult.error) {
    console.error("notification event select failed", eventResult.error);

    return {
      dispatchedEvents: 0,
      failedEvents: 0,
      reason: "notification_event_select_failed",
      sentNotifications: 0,
    };
  }

  let dispatchedEvents = 0;
  let failedEvents = 0;
  let sentNotifications = 0;

  for (const event of (eventResult.data ?? []) as NotificationEventRow[]) {
    const subscriptions = await loadEventSubscriptions(event);

    if (!subscriptions.length) {
      await markEventFailed(event.id, getMissingSubscriptionReason(event));
      failedEvents += 1;
      continue;
    }

    const result = await sendEventToSubscriptions(event, subscriptions);

    sentNotifications += result.sent;

    if (result.sent > 0) {
      await supabase
        .from("notification_events")
        .update({
          error_message: result.failed
            ? `${result.failed} subscription send failure(s)`
            : null,
          sent_at: new Date().toISOString(),
          status: "sent",
        })
        .eq("id", event.id);
      dispatchedEvents += 1;
    } else {
      await markEventFailed(event.id, result.reason ?? "web_push_send_failed");
      failedEvents += 1;
    }
  }

  return {
    dispatchedEvents,
    failedEvents,
    sentNotifications,
  };
}

async function loadEventSubscriptions(event: NotificationEventRow) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return [];
  }

  const query = supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth, profile_id")
    .eq("status", "active");

  const result = event.subscription_id
    ? await query.eq("id", event.subscription_id)
    : event.target_profile_id
      ? await query.eq("profile_id", event.target_profile_id).limit(20)
      : event.broadcast_all
        ? await query.limit(200)
        : null;

  if (!result) {
    return [];
  }

  if (result.error) {
    console.error("push subscription select failed", result.error);
    return [];
  }

  return ((result.data ?? []) as PushSubscriptionRow[]).filter(
    (subscription) =>
      subscription.id &&
      subscription.endpoint &&
      subscription.p256dh &&
      subscription.auth,
  );
}

function getMissingSubscriptionReason(event: NotificationEventRow) {
  if (!event.subscription_id && !event.target_profile_id && !event.broadcast_all) {
    return "missing_notification_target";
  }

  return "no_active_push_subscription";
}

async function sendEventToSubscriptions(
  event: NotificationEventRow,
  subscriptions: PushSubscriptionRow[],
) {
  let failed = 0;
  let sent = 0;
  let reason = "";

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webPush.sendNotification(
          {
            endpoint: subscription.endpoint!,
            keys: {
              auth: subscription.auth!,
              p256dh: subscription.p256dh!,
            },
          },
          JSON.stringify({
            body: event.body,
            eventType: event.event_type,
            payload: event.payload ?? {},
            title: event.title,
            url: event.url || "/community",
          }),
        );
        sent += 1;
      } catch (error) {
        failed += 1;
        reason = getPushErrorReason(error);
        await disableDeadSubscriptionIfNeeded(subscription.id, error);
      }
    }),
  );

  return {
    failed,
    reason,
    sent,
  };
}

async function disableDeadSubscriptionIfNeeded(
  subscriptionId: string,
  error: unknown,
) {
  const statusCode =
    typeof error === "object" && error && "statusCode" in error
      ? Number((error as { statusCode?: unknown }).statusCode)
      : 0;

  if (![404, 410].includes(statusCode)) {
    return;
  }

  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return;
  }

  await supabase
    .from("push_subscriptions")
    .update({
      status: "disabled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", subscriptionId);
}

async function markEventFailed(eventId: string, reason: string) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return;
  }

  await supabase
    .from("notification_events")
    .update({
      error_message: reason,
      status: "failed",
    })
    .eq("id", eventId);
}

function getWebPushConfig() {
  const publicKey = readServerEnv("NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY");
  const privateKey = readServerEnv("WEB_PUSH_PRIVATE_KEY");
  const subject =
    readServerEnv("WEB_PUSH_SUBJECT") || "mailto:hello@mirilook.com";

  if (!publicKey || !privateKey) {
    return {
      configured: false as const,
      reason: "web_push_not_configured",
    };
  }

  return {
    configured: true as const,
    privateKey,
    publicKey,
    subject,
  };
}

function getPushErrorReason(error: unknown) {
  if (error instanceof Error) {
    return error.message.slice(0, 240);
  }

  return "web_push_send_failed";
}

function normalizeJsonPayload(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function sanitizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.replace(/[<>]/g, "").trim();

  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function sanitizeUrlPath(value: unknown) {
  const text = sanitizeText(value, 500);

  if (!text) {
    return null;
  }

  if (text.startsWith("/")) {
    return text;
  }

  try {
    const url = new URL(text);

    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function sanitizeUuid(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    trimmed,
  )
    ? trimmed
    : null;
}
