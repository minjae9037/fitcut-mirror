import {
  ensureProfilePhotoStorageBucket,
  getProfilePhotoStorageBucket,
  getSupabaseAdminClient,
  getVerifiedSupabaseUser,
} from "@/lib/server/supabase-admin";
import { resolveProfileAvatarUrl } from "@/lib/server/profile-avatar";
import { protectMutationRequest } from "@/lib/server/request-security";

export const runtime = "nodejs";
export const maxDuration = 30;

type ProfileRow = {
  avatar_url: string | null;
  bio: string | null;
  display_name: string | null;
  email: string | null;
  id: string;
  provider: string | null;
  reference_front_photo_path: string | null;
  reference_left_photo_path: string | null;
  reference_right_photo_path: string | null;
};

type PhotoSlot = "left" | "front" | "right";

const photoSlots: PhotoSlot[] = ["left", "front", "right"];

export async function GET(request: Request) {
  const context = await getProfileContext(request);

  if (context instanceof Response) {
    return context;
  }

  const { supabase, user } = context;
  const profile = await ensureProfile(supabase, user.id, user.email ?? null);

  return Response.json({
    profile: await serializeProfile(supabase, profile),
  });
}

export async function PATCH(request: Request) {
  const securityError = protectMutationRequest(request, {
    maxBodyBytes: 32 * 1024,
    rateLimit: {
      key: "profile:update",
      limit: 60,
      windowMs: 10 * 60 * 1000,
    },
  });

  if (securityError) {
    return securityError;
  }

  const context = await getProfileContext(request);

  if (context instanceof Response) {
    return context;
  }

  const { supabase, user } = context;
  const payload = (await request.json().catch(() => null)) as {
    avatarPhotoSlot?: unknown;
    bio?: unknown;
    displayName?: unknown;
  } | null;
  const displayName = sanitizeText(payload?.displayName, 40);
  const bio = sanitizeText(payload?.bio, 600);
  const hasAvatarPhotoSlot = Boolean(
    payload && Object.prototype.hasOwnProperty.call(payload, "avatarPhotoSlot"),
  );
  const avatarPhotoSlot = hasAvatarPhotoSlot
    ? parsePhotoSlot(payload?.avatarPhotoSlot)
    : null;

  if (!displayName) {
    return Response.json(
      { error: "displayName is required." },
      { status: 400 },
    );
  }

  let avatarPhotoPath: string | undefined;

  if (hasAvatarPhotoSlot) {
    if (!avatarPhotoSlot) {
      return Response.json(
        { error: "invalid_avatar_photo_slot" },
        { status: 400 },
      );
    }

    const currentProfile = await ensureProfile(supabase, user.id, user.email ?? null);
    const savedPhotoPath = getPhotoPath(currentProfile, avatarPhotoSlot);

    if (!savedPhotoPath) {
      return Response.json(
        { error: "profile_photo_not_found" },
        { status: 400 },
      );
    }

    avatarPhotoPath = savedPhotoPath;
  }

  const upsert = await supabase
    .from("profiles")
    .upsert(
      {
        ...(avatarPhotoPath !== undefined ? { avatar_url: avatarPhotoPath } : {}),
        bio,
        display_name: displayName,
        email: user.email ?? null,
        id: user.id,
        provider: "email",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    )
    .select(
      "id, email, display_name, avatar_url, provider, bio, reference_left_photo_path, reference_front_photo_path, reference_right_photo_path",
    )
    .maybeSingle<ProfileRow>();

  if (upsert.error || !upsert.data) {
    console.error("profile update failed", upsert.error);

    return Response.json(
      { error: "profile_update_failed" },
      { status: 500 },
    );
  }

  const authUpdate = await supabase.auth.admin.updateUserById(user.id, {
    user_metadata: {
      full_name: displayName,
      name: displayName,
    },
  });

  if (authUpdate.error) {
    console.warn("auth metadata update failed", authUpdate.error);
  }

  return Response.json({
    profile: await serializeProfile(supabase, upsert.data),
  });
}

export async function POST(request: Request) {
  const securityError = protectMutationRequest(request, {
    maxBodyBytes: 34 * 1024 * 1024,
    rateLimit: {
      key: "profile:photos",
      limit: 20,
      windowMs: 10 * 60 * 1000,
    },
  });

  if (securityError) {
    return securityError;
  }

  const context = await getProfileContext(request);

  if (context instanceof Response) {
    return context;
  }

  if (!hasFormContentType(request)) {
    return Response.json(
      { error: "multipart/form-data is required." },
      { status: 400 },
    );
  }

  const { supabase, user } = context;
  let formData: FormData;
  let currentProfile: ProfileRow;
  const nextPaths: Partial<Record<PhotoSlot, string | null>> = {};
  const uploadedPaths: string[] = [];

  try {
    formData = await request.formData();
    currentProfile = await ensureProfile(
      supabase,
      user.id,
      user.email ?? null,
    );

    await ensureProfilePhotoStorageBucket(supabase);

    for (const slot of photoSlots) {
      const file = formData.get(`${slot}Photo`);

      if (!(file instanceof File)) {
        continue;
      }

      validateImageFile(file);

      const storagePath = await uploadProfilePhoto(supabase, user.id, slot, file);

      nextPaths[slot] = storagePath;
      uploadedPaths.push(storagePath);
    }
  } catch (error) {
    const responseError = toProfilePhotoResponseError(error);

    console.error("profile photo save failed", error);
    await removeProfilePhotoPaths(supabase, uploadedPaths);

    return Response.json(
      { error: responseError.code },
      { status: responseError.status },
    );
  }

  if (!Object.keys(nextPaths).length) {
    return Response.json(
      { error: "At least one profile photo is required." },
      { status: 400 },
    );
  }

  const updatePayload: {
    avatar_url?: string | null;
    email: string | null;
    id: string;
    provider: string;
    reference_front_photo_path?: string | null;
    reference_left_photo_path?: string | null;
    reference_right_photo_path?: string | null;
    updated_at: string;
  } = {
    email: user.email ?? null,
    id: user.id,
    provider: "email",
    updated_at: new Date().toISOString(),
    ...(nextPaths.left !== undefined
      ? { reference_left_photo_path: nextPaths.left }
      : {}),
    ...(nextPaths.front !== undefined
      ? {
          reference_front_photo_path: nextPaths.front,
        }
      : {}),
    ...(nextPaths.right !== undefined
      ? { reference_right_photo_path: nextPaths.right }
      : {}),
  };
  const nextAvatarPath = getNextAvatarPath(currentProfile, nextPaths);

  if (nextAvatarPath) {
    updatePayload.avatar_url = nextAvatarPath;
  }
  const update = await supabase
    .from("profiles")
    .upsert(updatePayload, { onConflict: "id" })
    .select(
      "id, email, display_name, avatar_url, provider, bio, reference_left_photo_path, reference_front_photo_path, reference_right_photo_path",
    )
    .maybeSingle<ProfileRow>();

  if (update.error || !update.data) {
    console.error("profile photo update failed", update.error);
    await removeProfilePhotoPaths(supabase, uploadedPaths);

    return Response.json(
      { error: "profile_photo_update_failed" },
      { status: 500 },
    );
  }

  const previousPaths = photoSlots
    .map((slot) => {
      const nextPath = nextPaths[slot];
      const previousPath = getPhotoPath(currentProfile, slot);

      return nextPath && previousPath && previousPath !== nextPath
        ? previousPath
        : "";
    })
    .filter(Boolean);

  await removeProfilePhotoPaths(supabase, previousPaths);

  return Response.json({
    profile: await serializeProfile(supabase, update.data),
  });
}

async function getProfileContext(request: Request) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return Response.json(
      { error: "supabase_not_configured" },
      { status: 503 },
    );
  }

  const user = await getVerifiedSupabaseUser(request);

  if (!user) {
    return Response.json(
      { error: "not_authenticated" },
      { status: 401 },
    );
  }

  return { supabase, user };
}

async function ensureProfile(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  userId: string,
  email: string | null,
) {
  const result = await supabase
    .from("profiles")
    .select(
      "id, email, display_name, avatar_url, provider, bio, reference_left_photo_path, reference_front_photo_path, reference_right_photo_path",
    )
    .eq("id", userId)
    .maybeSingle<ProfileRow>();

  if (result.error) {
    throw result.error;
  }

  if (result.data) {
    return result.data;
  }

  const inserted = await supabase
    .from("profiles")
    .upsert(
      {
        email,
        id: userId,
        provider: "email",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    )
    .select(
      "id, email, display_name, avatar_url, provider, bio, reference_left_photo_path, reference_front_photo_path, reference_right_photo_path",
    )
    .maybeSingle<ProfileRow>();

  if (inserted.error || !inserted.data) {
    throw inserted.error ?? new Error("profile_insert_failed");
  }

  return inserted.data;
}

async function serializeProfile(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  profile: ProfileRow,
) {
  const photos = await Promise.all(
    photoSlots.map(async (slot) => {
      const path = getPhotoPath(profile, slot);

      if (!path) {
        return [slot, null] as const;
      }

      const signed = await supabase.storage
        .from(getProfilePhotoStorageBucket())
        .createSignedUrl(path, 60 * 60);

      if (signed.error) {
        console.warn("profile photo signed url failed", signed.error);
      }

      return [
        slot,
        {
          fileName: path.split("/").pop() ?? `${slot}.jpg`,
          path,
          url: signed.data?.signedUrl ?? "",
        },
      ] as const;
    }),
  );

  return {
    avatarPhotoSlot: getAvatarPhotoSlot(profile),
    avatarUrl: await resolveProfileAvatarUrl(supabase, profile.avatar_url),
    bio: profile.bio ?? "",
    displayName: profile.display_name ?? profile.email ?? "",
    email: profile.email ?? "",
    id: profile.id,
    photos: Object.fromEntries(photos),
    provider: profile.provider ?? "email",
  };
}

async function uploadProfilePhoto(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  userId: string,
  slot: PhotoSlot,
  file: File,
) {
  const extension = getImageExtension(file);
  const storagePath = `${userId}/${slot}-${Date.now()}.${extension}`;
  const upload = await supabase.storage
    .from(getProfilePhotoStorageBucket())
    .upload(storagePath, Buffer.from(await file.arrayBuffer()), {
      cacheControl: "31536000",
      contentType: file.type || "image/jpeg",
      upsert: true,
    });

  if (upload.error) {
    throw new ProfilePhotoRequestError("profile_photo_upload_failed", 500);
  }

  return storagePath;
}

async function removeProfilePhotoPaths(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  paths: string[],
) {
  const uniquePaths = Array.from(new Set(paths.filter(Boolean)));

  if (!uniquePaths.length) {
    return;
  }

  const remove = await supabase.storage
    .from(getProfilePhotoStorageBucket())
    .remove(uniquePaths);

  if (remove.error) {
    console.warn("profile photo remove failed", remove.error);
  }
}

function getPhotoPath(profile: ProfileRow, slot: PhotoSlot) {
  if (slot === "left") {
    return profile.reference_left_photo_path;
  }

  if (slot === "right") {
    return profile.reference_right_photo_path;
  }

  return profile.reference_front_photo_path;
}

function getAvatarPhotoSlot(profile: ProfileRow) {
  return (
    photoSlots.find((slot) => {
      const photoPath = getPhotoPath(profile, slot);

      return Boolean(photoPath && profile.avatar_url === photoPath);
    }) ?? null
  );
}

function getNextAvatarPath(
  profile: ProfileRow,
  nextPaths: Partial<Record<PhotoSlot, string | null>>,
) {
  const currentAvatarSlot = getAvatarPhotoSlot(profile);

  if (currentAvatarSlot && nextPaths[currentAvatarSlot]) {
    return nextPaths[currentAvatarSlot];
  }

  if (!profile.avatar_url && nextPaths.front) {
    return nextPaths.front;
  }

  return null;
}

function parsePhotoSlot(value: unknown) {
  return photoSlots.includes(value as PhotoSlot) ? (value as PhotoSlot) : null;
}

function validateImageFile(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new ProfilePhotoRequestError("invalid_image_type", 400);
  }

  if (file.size > 10 * 1024 * 1024) {
    throw new ProfilePhotoRequestError("payload_too_large", 413);
  }
}

function getImageExtension(file: File) {
  if (file.type === "image/png") {
    return "png";
  }

  if (file.type === "image/webp") {
    return "webp";
  }

  return "jpg";
}

function sanitizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/[<>]/g, "").trim().slice(0, maxLength);
}

function hasFormContentType(request: Request) {
  return (request.headers.get("content-type") ?? "").includes(
    "multipart/form-data",
  );
}

class ProfilePhotoRequestError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
  ) {
    super(code);
  }
}

function toProfilePhotoResponseError(error: unknown) {
  if (error instanceof ProfilePhotoRequestError) {
    return {
      code: error.code,
      status: error.status,
    };
  }

  const message = error instanceof Error ? error.message.toLowerCase() : "";

  if (message.includes("bucket") || message.includes("storage")) {
    return {
      code: "profile_storage_bucket_failed",
      status: 500,
    };
  }

  return {
    code: "profile_photo_update_failed",
    status: 500,
  };
}
