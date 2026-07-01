import WebSocketImpl from "ws";
import { schedules } from "@trigger.dev/sdk/v3";
import {
  getConsultationStorageBucket,
  getSupabaseAdminClient,
} from "@/lib/server/supabase-admin";

// Supabase's client needs a WebSocket on the Node <22 Trigger runtime.
{
  const globalWithWs = globalThis as unknown as { WebSocket?: unknown };
  if (typeof globalWithWs.WebSocket === "undefined") {
    globalWithWs.WebSocket = WebSocketImpl;
  }
}

const ABANDON_HOURS = 6;

// Daily cleanup: remove abandoned "preparing" consultation sessions (uploaded
// before generation finished) and their stored source photos. Keeps sensitive
// face photos from accumulating and respects the privacy policy's retention.
export const mirilookCleanupAbandonedSessions = schedules.task({
  id: "mirilook-cleanup-abandoned-sessions",
  cron: "15 4 * * *", // daily 04:15 UTC
  run: async () => {
    const supabase = getSupabaseAdminClient();

    if (!supabase) {
      return { cleaned: 0, reason: "supabase_not_configured" };
    }

    const bucket = getConsultationStorageBucket();
    const cutoff = new Date(
      Date.now() - ABANDON_HOURS * 60 * 60 * 1000,
    ).toISOString();

    const stale = await supabase
      .from("generation_sessions")
      .select("id")
      .eq("status", "preparing")
      .lt("created_at", cutoff)
      .limit(500)
      .returns<{ id: string }[]>();

    if (stale.error) {
      console.error("cleanup: stale session lookup failed", stale.error);
      return { cleaned: 0, reason: "lookup_failed" };
    }

    const sessions = stale.data ?? [];
    let cleaned = 0;

    for (const session of sessions) {
      try {
        const listed = await supabase.storage.from(bucket).list(session.id);
        const paths = (listed.data ?? []).map((file) => `${session.id}/${file.name}`);

        if (paths.length) {
          await supabase.storage.from(bucket).remove(paths);
        }

        await supabase.from("generation_assets").delete().eq("session_id", session.id);
        await supabase.from("generation_sessions").delete().eq("id", session.id);
        cleaned += 1;
      } catch (error) {
        console.error("cleanup: failed for session", {
          error: error instanceof Error ? error.message : String(error),
          sessionId: session.id,
        });
      }
    }

    return { cleaned, scanned: sessions.length };
  },
});
