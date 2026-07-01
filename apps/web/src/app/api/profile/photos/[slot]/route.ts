import {
  getProfilePhotoStorageBucket,
  getSupabaseAdminClient,
  getVerifiedSupabaseUser,
} from "@/lib/server/supabase-admin";

export const runtime = "nodejs";
export const maxDuration = 30;

type PhotoSlot = "left" | "front" | "right";

type ProfilePhotoPathRow = {
  reference_front_photo_path: string | null;
  reference_left_photo_path: string | null;
  reference_right_photo_path: string | null;
};

const photoSlots = new Set<PhotoSlot>(["left", "front", "right"]);

export async function GET(
  request: Request,
  context: { params: Promise<{ slot: string }> },
) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return Response.json(
      { error: "supabase_not_configured" },
      { status: 503 },
    );
  }

  const user = await getVerifiedSupabaseUser(request);

  if (!user) {
    return Response.json({ error: "not_authenticated" }, { status: 401 });
  }

  const { slot: rawSlot } = await context.params;
  const slot = parsePhotoSlot(rawSlot);

  if (!slot) {
    return Response.json({ error: "invalid_photo_slot" }, { status: 400 });
  }

  const profile = await supabase
    .from("profiles")
    .select(
      "reference_left_photo_path, reference_front_photo_path, reference_right_photo_path",
    )
    .eq("id", user.id)
    .maybeSingle<ProfilePhotoPathRow>();

  if (profile.error) {
    console.error("profile photo path lookup failed", profile.error);

    return Response.json(
      { error: "profile_photo_lookup_failed" },
      { status: 500 },
    );
  }

  const storagePath = profile.data ? getPhotoPath(profile.data, slot) : null;

  if (!storagePath) {
    return Response.json({ error: "profile_photo_not_found" }, { status: 404 });
  }

  const download = await supabase.storage
    .from(getProfilePhotoStorageBucket())
    .download(storagePath);

  if (download.error || !download.data) {
    console.error("profile photo download failed", download.error);

    return Response.json(
      { error: "profile_photo_download_failed" },
      { status: 500 },
    );
  }

  const headers = new Headers({
    "Cache-Control": "private, no-store",
    "Content-Disposition": `inline; filename="${getSafeFileName(storagePath)}"`,
    "Content-Type": download.data.type || getContentType(storagePath),
  });

  return new Response(download.data, { headers });
}

function parsePhotoSlot(value: string) {
  return photoSlots.has(value as PhotoSlot) ? (value as PhotoSlot) : null;
}

function getPhotoPath(profile: ProfilePhotoPathRow, slot: PhotoSlot) {
  if (slot === "left") {
    return profile.reference_left_photo_path;
  }

  if (slot === "right") {
    return profile.reference_right_photo_path;
  }

  return profile.reference_front_photo_path;
}

function getSafeFileName(path: string) {
  return (path.split("/").pop() || "mirilook-profile-photo.jpg").replace(
    /[^a-zA-Z0-9._-]/g,
    "-",
  );
}

function getContentType(path: string) {
  const lowerPath = path.toLowerCase();

  if (lowerPath.endsWith(".png")) {
    return "image/png";
  }

  if (lowerPath.endsWith(".webp")) {
    return "image/webp";
  }

  return "image/jpeg";
}
