import {
  MirilookConsultationTaskId,
  validateConsultationJobPayload,
} from "@/lib/mirilook-jobs";
import { readServerEnv } from "@/lib/server/env";
import { protectMutationRequest } from "@/lib/server/request-security";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  const securityError = protectMutationRequest(request, {
    maxBodyBytes: 128 * 1024,
    rateLimit: {
      key: "consultations:jobs",
      limit: 20,
      windowMs: 10 * 60 * 1000,
    },
    requireOrigin: true,
  });

  if (securityError) {
    return securityError;
  }

  let rawPayload: unknown;

  try {
    rawPayload = await request.json();
  } catch {
    return Response.json({ error: "Invalid consultation job payload." }, { status: 400 });
  }

  const payload = validateConsultationJobPayload(rawPayload);

  if (!payload) {
    return Response.json(
      {
        error:
          "sessionId, selected style, at least two saved image assets, and requested angles are required.",
      },
      { status: 400 },
    );
  }

  const triggerSecret = readServerEnv("TRIGGER_SECRET_KEY");

  if (!triggerSecret) {
    return Response.json({
      accepted: false,
      reason: "trigger_not_configured",
    });
  }

  try {
    const triggerResponse = await fetch(
      `${getTriggerApiBaseUrl()}/api/v1/tasks/${MirilookConsultationTaskId}/trigger`,
      {
        body: JSON.stringify({
          options: {
            idempotencyKey: `mirilook:${payload.sessionId}:${payload.selectedStyleId}`,
            ttl: "6h",
          },
          payload,
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

      console.error("consultation job trigger rejected", {
        body: body.slice(0, 500),
        status: triggerResponse.status,
      });

      return Response.json(
        {
          accepted: false,
          reason: "trigger_enqueue_rejected",
        },
        { status: 502 },
      );
    }

    const result = (await triggerResponse.json()) as { id?: string };

    return Response.json({
      accepted: true,
      runId: result.id ?? null,
    });
  } catch (error) {
    console.error("consultation job trigger failed", error);

    return Response.json(
      {
        accepted: false,
        reason: "trigger_enqueue_failed",
      },
      { status: 500 },
    );
  }
}

function getTriggerApiBaseUrl() {
  return readServerEnv("TRIGGER_API_BASE_URL") || "https://api.trigger.dev";
}
