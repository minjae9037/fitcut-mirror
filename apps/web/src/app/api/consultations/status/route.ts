import {
  getConsultationStorageBucket,
  getSupabaseAdminClient,
  getVerifiedSupabaseUser,
} from "@/lib/server/supabase-admin";

export const runtime = "nodejs";
export const maxDuration = 30;

// Phase 3: the studio polls this while a background consultation job runs.
// Returns the session status and, once available, signed URLs for the 9 angle
// images so the client can render them without re-generating.

type SessionRow = {
  profile_id: string | null;
  status: string | null;
  style_name: string | null;
};

type AngleAssetRow = {
  angle_label: string | null;
  display_order: number | null;
  storage_path: string | null;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sessionId = (url.searchParams.get("sessionId") ?? "")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 120);

  if (!sessionId) {
    return Response.json({ error: "sessionId is required." }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return Response.json({ ready: false, reason: "supabase_not_configured" });
  }

  const user = await getVerifiedSupabaseUser(request);

  if (!user) {
    return Response.json({ ready: false, reason: "not_authenticated" });
  }

  const sessionResult = await supabase
    .from("generation_sessions")
    .select("profile_id, status, style_name")
    .eq("id", sessionId)
    .maybeSingle<SessionRow>();

  if (sessionResult.error) {
    console.error("consultation status lookup failed", sessionResult.error);
    return Response.json({ ready: false, reason: "status_lookup_failed" }, { status: 500 });
  }

  const session = sessionResult.data;

  if (!session || session.profile_id !== user.id) {
    return Response.json({ ready: false, reason: "not_found" }, { status: 404 });
  }

  const status = session.status ?? "unknown";
  const done = status === "completed" || status === "failed";

  // Sign whatever angle images exist so the studio can show progress (n/9) and
  // render angles as they appear, not only at the very end.
  const bucket = getConsultationStorageBucket();
  const assetResult = await supabase
    .from("generation_assets")
    .select("angle_label, display_order, storage_path")
    .eq("session_id", sessionId)
    .eq("asset_type", "final_angle")
    .order("display_order", { ascending: true })
    .returns<AngleAssetRow[]>();

  const rows = (assetResult.data ?? []).filter((row) => row.storage_path);

  const signed = await Promise.all(
    rows.map(async (row) => {
      const { data } = await supabase.storage
        .from(bucket)
        .createSignedUrl(row.storage_path ?? "", 3600);

      if (!data?.signedUrl) {
        return null;
      }

      return {
        displayOrder: row.display_order ?? 0,
        imageUrl: data.signedUrl,
        label: row.angle_label ?? "",
      };
    }),
  );

  const images = signed.filter(
    (item): item is { displayOrder: number; imageUrl: string; label: string } =>
      Boolean(item),
  );

  return Response.json({
    completedCount: images.length,
    done,
    images,
    ready: status === "completed" && images.length > 0,
    status,
    styleName: session.style_name ?? null,
    total: 9,
  });
}
