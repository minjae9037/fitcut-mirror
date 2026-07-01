import WebSocketImpl from "ws";
import { task } from "@trigger.dev/sdk/v3";
import type { MirilookConsultationJobPayload } from "@/lib/mirilook-jobs";

// The Trigger runtime is Node < 22, which lacks a native global WebSocket. The
// Supabase client constructs a realtime client (needing WebSocket) on creation,
// so provide one here before any Supabase client is created in this task.
{
  const globalWithWs = globalThis as unknown as { WebSocket?: unknown };
  if (typeof globalWithWs.WebSocket === "undefined") {
    globalWithWs.WebSocket = WebSocketImpl;
  }
}
import { MirilookConsultationTaskId } from "@/lib/mirilook-jobs";
import { resultAngles } from "@/lib/mirilook-styles";
import {
  getConsultationStorageBucket,
  getSupabaseAdminClient,
} from "@/lib/server/supabase-admin";

type MirilookConsultationTaskResult = {
  angleCount: number;
  failedCount: number;
  generated: boolean;
  sessionId: string;
  status: "completed" | "failed" | "partial" | "skipped";
};

type SourceAssetRow = {
  angle_label: string | null;
  display_order: number | null;
  storage_path: string | null;
};

type SupabaseAdmin = NonNullable<ReturnType<typeof getSupabaseAdminClient>>;


// Phase 2: the task now renders the 9-angle consultation board server-side by
// re-using the existing /api/hairstyles/angle endpoint (which keeps all prompt
// logic + OpenAI/Gemini keys on Vercel). The task only reads the pre-uploaded
// source photos from Supabase, orchestrates the 9 angles, and stores results.
export const MirilookGenerateConsultationTask = task({
  id: MirilookConsultationTaskId,
  maxDuration: 900,
  queue: { concurrencyLimit: 4, name: "mirilook-image-generation" },
  run: async (
    payload: MirilookConsultationJobPayload,
  ): Promise<MirilookConsultationTaskResult> => {
    const supabase = getSupabaseAdminClient();

    if (!supabase) {
      return resultOf(payload.sessionId, "skipped", 0, 0);
    }

    const bucket = getConsultationStorageBucket();
    const appBaseUrl = (
      process.env.NEXT_PUBLIC_APP_URL ??
      process.env.MIRILOOK_APP_URL ??
      "https://mirilook.com"
    ).replace(/\/$/, "");

    await supabase
      .from("generation_sessions")
      .update({ status: "processing" })
      .eq("id", payload.sessionId);

    try {
      // 1) Load + download the pre-uploaded source photos.
      const sourceResult = await supabase
        .from("generation_assets")
        .select("angle_label, display_order, storage_path")
        .eq("session_id", payload.sessionId)
        .eq("asset_type", "source_photo")
        .order("display_order", { ascending: true })
        .returns<SourceAssetRow[]>();

      if (sourceResult.error) {
        throw sourceResult.error;
      }

      const sourceRows = (sourceResult.data ?? []).filter((row) => row.storage_path);

      if (sourceRows.length < 2) {
        await markSession(supabase, payload.sessionId, "failed");
        return resultOf(payload.sessionId, "failed", 0, 0);
      }

      const frontRow =
        sourceRows.find((row) => (row.angle_label ?? "").includes("정면")) ??
        sourceRows[0];
      const sideRow = sourceRows.find((row) => row !== frontRow) ?? sourceRows[0];

      const frontFile = await downloadAsFile(
        supabase,
        bucket,
        frontRow.storage_path ?? "",
        "front.jpg",
      );
      const sideFile = await downloadAsFile(
        supabase,
        bucket,
        sideRow.storage_path ?? "",
        "side.jpg",
      );

      if (!frontFile || !sideFile) {
        await markSession(supabase, payload.sessionId, "failed");
        return resultOf(payload.sessionId, "failed", 0, 0);
      }

      const previewFile = payload.selectedPreviewPath
        ? await downloadAsFile(
            supabase,
            bucket,
            payload.selectedPreviewPath,
            "preview.jpg",
          )
        : null;

      const photoContext = JSON.stringify({
        hasActualFront: (frontRow.angle_label ?? "").includes("정면"),
        primaryReferenceSlot: "front",
        secondaryReferenceSlot: "side",
        uploadedSlots: ["front", "side"],
      });

      // 2) Generate every angle through the existing Vercel endpoint.
      const generated: Array<{
        angleLabel: string;
        displayOrder: number;
        storagePath: string;
      }> = [];
      const errors: string[] = [];

      // Clean slate so the status endpoint's live n/9 count starts from 0 and a
      // re-run doesn't leave stale angles behind.
      await supabase
        .from("generation_assets")
        .delete()
        .eq("session_id", payload.sessionId)
        .eq("asset_type", "final_angle");

      const renderAngle = async (angleIndex: number, references: File[] = []) => {
        const angle = resultAngles[angleIndex];
        const form = new FormData();
        form.append("front", frontFile, "front.jpg");
        form.append("side", sideFile, "side.jpg");
        if (previewFile) {
          form.append("base", previewFile, "preview.jpg");
        }
        // Staged generation: already-rendered neighbour angles (front first, then
        // its dependents) are handed in as generated stage references so each new
        // angle inherits the exact same haircut, hair length, color, and identity.
        references.forEach((reference, refIndex) => {
          form.append("baseReferences", reference, `stage-ref-${refIndex}.jpg`);
        });
        form.append("styleId", payload.selectedStyleId);
        form.append("hairColorId", payload.hairColorId ?? "natural-black");
        form.append("audience", payload.audience);
        form.append("region", payload.region ?? "korea");
        form.append("angleIndex", String(angleIndex));
        form.append("photoContext", photoContext);
        form.append(
          "referenceRole",
          references.length
            ? "staged-neighbor-anchor-task"
            : "selected-preview-style-to-canonical-front-task",
        );
        if (payload.styleMemo) {
          form.append("styleMemo", payload.styleMemo);
        }

        const response = await fetch(`${appBaseUrl}/api/hairstyles/angle/`, {
          body: form,
          method: "POST",
        });

        if (!response.ok) {
          const body = await response.text().catch(() => "");
          throw new Error(`angle ${angleIndex} http ${response.status}: ${body.slice(0, 200)}`);
        }

        const data = (await response.json()) as { imageUrl?: string };
        const parsed = parseDataImage(data.imageUrl ?? "");

        if (!parsed) {
          throw new Error(`angle ${angleIndex} returned no image`);
        }

        const extension = parsed.mimeType === "image/png" ? "png" : "jpg";
        const storagePath = `${payload.sessionId}/final_angle-${String(
          angleIndex + 1,
        ).padStart(2, "0")}-${slugify(angle.label)}.${extension}`;

        const upload = await supabase.storage.from(bucket).upload(storagePath, parsed.buffer, {
          cacheControl: "31536000",
          contentType: parsed.mimeType,
          upsert: true,
        });

        if (upload.error) {
          throw upload.error;
        }

        // Insert this angle immediately so the status endpoint's live n/9 count
        // advances as each image lands, instead of jumping from 0 to 9 at the end.
        const rowInsert = await supabase.from("generation_assets").insert({
          angle_label: angle.label,
          asset_type: "final_angle",
          display_order: angleIndex + 1,
          original_url: null,
          provider: "mirilook-trigger",
          session_id: payload.sessionId,
          status: "stored",
          storage_path: storagePath,
        });

        if (rowInsert.error) {
          throw rowInsert.error;
        }

        return { angleLabel: angle.label, displayOrder: angleIndex + 1, storagePath };
      };

      // Index map (resultAngles order) for the staged dependency graph.
      const UPPER_LEFT = 0;
      const TOP = 1;
      const UPPER_RIGHT = 2;
      const LEFT = 3;
      const FRONT = 4;
      const RIGHT = 5;
      const LEFT_REAR = 6;
      const REAR = 7;
      const RIGHT_REAR = 8;

      const rendered = new Map<number, File>();
      const failed: number[] = [];

      // Each angle references specific already-rendered angles so the whole board
      // stays one consistent haircut. References are resolved live from `rendered`.
      const angleDependencies: Record<number, number[]> = {
        [FRONT]: [],
        [LEFT]: [FRONT],
        [RIGHT]: [FRONT],
        [TOP]: [FRONT, LEFT, RIGHT],
        [REAR]: [FRONT, LEFT, RIGHT],
        [UPPER_LEFT]: [TOP, FRONT, LEFT],
        [UPPER_RIGHT]: [TOP, FRONT, RIGHT],
        [LEFT_REAR]: [FRONT, LEFT, REAR],
        [RIGHT_REAR]: [FRONT, RIGHT, REAR],
      };

      const renderStaged = async (angleIndex: number) => {
        const references = (angleDependencies[angleIndex] ?? [])
          .map((depIndex) => rendered.get(depIndex))
          .filter((file): file is File => Boolean(file));

        try {
          const item = await renderAngle(angleIndex, references);
          generated.push(item);
          const file = await downloadAsFile(
            supabase,
            bucket,
            item.storagePath,
            `stage-${angleIndex}.jpg`,
          );
          if (file) {
            rendered.set(angleIndex, file);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (errors.length < 6) {
            errors.push(message);
          }
          console.error("mirilook angle generation failed", {
            angleIndex,
            error: message,
            sessionId: payload.sessionId,
          });
          failed.push(angleIndex);
        }
      };

      // Stage 1: exact front first (live count moves immediately + anchor for all).
      await renderStaged(FRONT);
      // Stage 2: left + right reference the front (parallel).
      await Promise.all([renderStaged(LEFT), renderStaged(RIGHT)]);
      // Stage 3: top + rear reference front + left + right (parallel).
      await Promise.all([renderStaged(TOP), renderStaged(REAR)]);
      // Stage 4: the four corners reference their neighbours (parallel).
      await Promise.all([
        renderStaged(UPPER_LEFT),
        renderStaged(UPPER_RIGHT),
        renderStaged(LEFT_REAR),
        renderStaged(RIGHT_REAR),
      ]);

      // One retry pass for any angle that failed; dependencies resolve from
      // whatever neighbours did render by the time the retry runs.
      const toRetry = [...failed];
      failed.length = 0;
      for (const angleIndex of toRetry) {
        await renderStaged(angleIndex);
      }

      const failedCount = failed.length;

      // Angles were persisted incrementally in renderAngle (for live progress),
      // so there is nothing to bulk-insert here.
      const finalStatus =
        generated.length === 0 ? "failed" : failedCount > 0 ? "partial" : "completed";

      // Diagnostic: persist the first errors so failures can be inspected from
      // the session row without needing live task logs.
      if (errors.length) {
        await supabase
          .from("generation_sessions")
          .update({ style_memo: `[bg-diag] ${errors.join(" || ")}`.slice(0, 1000) })
          .eq("id", payload.sessionId);
      }

      await markSession(
        supabase,
        payload.sessionId,
        finalStatus === "failed" ? "failed" : "completed",
      );

      // Notify the owner via web push that the board is ready, even if they left.
      if (finalStatus !== "failed") {
        try {
          await fetch(`${appBaseUrl}/api/consultations/notify-complete/`, {
            body: JSON.stringify({ sessionId: payload.sessionId }),
            headers: {
              Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""}`,
              "content-type": "application/json",
            },
            method: "POST",
          });
        } catch (error) {
          console.warn("completion notification failed", {
            error: error instanceof Error ? error.message : String(error),
            sessionId: payload.sessionId,
          });
        }
      }

      return resultOf(payload.sessionId, finalStatus, generated.length, failedCount);
    } catch (error) {
      console.error("mirilook consultation task failed", {
        error: error instanceof Error ? error.message : String(error),
        sessionId: payload.sessionId,
      });
      await markSession(supabase, payload.sessionId, "failed");
      return resultOf(payload.sessionId, "failed", 0, 0);
    }
  },
});

async function markSession(
  supabase: SupabaseAdmin,
  sessionId: string,
  status: "completed" | "failed",
) {
  await supabase
    .from("generation_sessions")
    .update({
      completed_at: status === "completed" ? new Date().toISOString() : null,
      status,
    })
    .eq("id", sessionId);
}

async function downloadAsFile(
  supabase: SupabaseAdmin,
  bucket: string,
  path: string,
  fileName: string,
): Promise<File | null> {
  if (!path) {
    return null;
  }

  const { data, error } = await supabase.storage.from(bucket).download(path);

  if (error || !data) {
    return null;
  }

  const buffer = Buffer.from(await data.arrayBuffer());
  const type = data.type || (fileName.endsWith(".png") ? "image/png" : "image/jpeg");

  return new File([buffer], fileName, { type });
}

function resultOf(
  sessionId: string,
  status: MirilookConsultationTaskResult["status"],
  angleCount: number,
  failedCount: number,
): MirilookConsultationTaskResult {
  return {
    angleCount,
    failedCount,
    generated: angleCount > 0,
    sessionId,
    status,
  };
}

function slugify(value: string) {
  // Supabase storage keys must be ASCII-safe, so drop any non-ASCII (e.g.
  // Korean angle labels). Uniqueness is guaranteed by the index in the path.
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "angle"
  );
}

function parseDataImage(value: string) {
  const match = value.match(
    /^data:(image\/(?:jpeg|jpg|png));base64,([a-zA-Z0-9+/=]+)$/,
  );

  if (!match) {
    return null;
  }

  return {
    buffer: Buffer.from(match[2], "base64"),
    mimeType: match[1] === "image/jpg" ? "image/jpeg" : match[1],
  };
}
