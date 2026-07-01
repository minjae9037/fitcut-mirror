import { MirilookNotificationDispatchTaskId } from "@/lib/mirilook-notifications";
import {
  dispatchQueuedNotifications,
  queueNotificationEvent,
} from "@/lib/server/notifications";
import { requireAdminRequest } from "@/lib/server/admin-auth";
import { readServerEnv } from "@/lib/server/env";

export const runtime = "nodejs";
export const maxDuration = 60;

type AdminNotificationPayload = {
  action?: "queue" | "dispatch" | "queue_and_dispatch" | "trigger_dispatch";
  body?: string;
  broadcastAll?: boolean;
  eventType?:
    | "salon_application"
    | "salon_booking_request"
    | "salon_review"
    | "community_vote_request"
    | "community_vote"
    | "community_comment"
    | "community_dm"
    | "social_post_created"
    | "social_dm"
    | "moderation_report"
    | "payment_verified"
    | "support_case"
    | "manual";
  limit?: number;
  payload?: Record<string, unknown>;
  subscriptionId?: string;
  targetProfileId?: string;
  title?: string;
  url?: string;
};

export async function POST(request: Request) {
  const adminError = requireAdminRequest(request);

  if (adminError) {
    return adminError;
  }

  let payload: AdminNotificationPayload;

  try {
    payload = (await request.json()) as AdminNotificationPayload;
  } catch {
    return Response.json({ error: "Invalid notification payload." }, { status: 400 });
  }

  const action = payload.action ?? "queue";

  if (action === "dispatch") {
    const dispatch = await dispatchQueuedNotifications(payload.limit ?? 20);

    return Response.json({
      dispatched: true,
      ...dispatch,
    });
  }

  if (action === "trigger_dispatch") {
    const triggered = await triggerNotificationDispatch(payload.limit ?? 20);

    return Response.json(triggered, {
      status: triggered.accepted ? 200 : triggered.status,
    });
  }

  const queued = await queueNotificationEvent({
    body: payload.body ?? "",
    broadcastAll: payload.broadcastAll === true,
    eventType: payload.eventType ?? "manual",
    payload: payload.payload,
    subscriptionId: payload.subscriptionId,
    targetProfileId: payload.targetProfileId,
    title: payload.title ?? "",
    url: payload.url,
  });

  if (!queued.queued) {
    return Response.json({
      accepted: false,
      reason: queued.reason,
    });
  }

  if (action === "queue_and_dispatch") {
    const dispatch = await dispatchQueuedNotifications(payload.limit ?? 20);

    return Response.json({
      accepted: true,
      eventId: queued.eventId,
      ...dispatch,
    });
  }

  return Response.json({
    accepted: true,
    eventId: queued.eventId,
  });
}

async function triggerNotificationDispatch(limit: number) {
  const triggerSecret = readServerEnv("TRIGGER_SECRET_KEY");

  if (!triggerSecret) {
    return {
      accepted: false,
      reason: "trigger_not_configured",
      status: 503,
    };
  }

  try {
    const normalizedLimit = Math.max(1, Math.min(50, Math.round(limit)));
    const triggerResponse = await fetch(
      `${getTriggerApiBaseUrl()}/api/v1/tasks/${MirilookNotificationDispatchTaskId}/trigger`,
      {
        body: JSON.stringify({
          options: {
            idempotencyKey: `mirilook-notifications:${new Date().toISOString().slice(0, 16)}`,
            ttl: "5m",
          },
          payload: {
            limit: normalizedLimit,
          },
        }),
        headers: {
          Authorization: `Bearer ${triggerSecret}`,
          "Content-Type": "application/json",
        },
        method: "POST",
      },
    );

    if (!triggerResponse.ok) {
      const body = await triggerResponse.text();

      console.error("notification dispatch trigger rejected", {
        body: body.slice(0, 500),
        status: triggerResponse.status,
      });

      return {
        accepted: false,
        reason: "trigger_enqueue_rejected",
        status: 502,
      };
    }

    const result = (await triggerResponse.json()) as { id?: string };

    return {
      accepted: true,
      limit: normalizedLimit,
      runId: result.id ?? null,
      triggered: true,
    };
  } catch (error) {
    console.error("notification dispatch trigger failed", error);

    return {
      accepted: false,
      reason: "trigger_enqueue_failed",
      status: 500,
    };
  }
}

function getTriggerApiBaseUrl() {
  return readServerEnv("TRIGGER_API_BASE_URL") || "https://api.trigger.dev";
}
