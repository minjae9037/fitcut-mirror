import { createClient } from "@supabase/supabase-js";
import { readServerEnv } from "@/lib/server/env";

export type VerifiedSupabaseUser = {
  email?: string;
  id: string;
};

export function getSupabaseAdminClient() {
  const supabaseUrl = readServerEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = readServerEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function getConsultationStorageBucket() {
  const fallbackBucket = "mirilook-consultations";
  const rawBucket = process.env.SUPABASE_CONSULTATION_BUCKET;

  if (!rawBucket) {
    return fallbackBucket;
  }

  const bucket = rawBucket
    .replace(/^\uFEFF/, "")
    .replace(/^["']|["']$/g, "")
    .trim();

  if (!/^[\x20-\x7E]+$/.test(bucket)) {
    console.warn("Invalid SUPABASE_CONSULTATION_BUCKET value; using default bucket.");
    return fallbackBucket;
  }

  return /^[a-z0-9][a-z0-9._-]{1,62}$/.test(bucket)
    ? bucket
    : fallbackBucket;
}

export function getProfilePhotoStorageBucket() {
  const fallbackBucket = "mirilook-profile-photos";
  const rawBucket = process.env.SUPABASE_PROFILE_PHOTO_BUCKET;

  if (!rawBucket) {
    return fallbackBucket;
  }

  const bucket = rawBucket
    .replace(/^\uFEFF/, "")
    .replace(/^["']|["']$/g, "")
    .trim();

  return /^[a-z0-9][a-z0-9._-]{1,62}$/.test(bucket)
    ? bucket
    : fallbackBucket;
}

export async function ensureProfilePhotoStorageBucket(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
) {
  const bucket = getProfilePhotoStorageBucket();
  const existing = await supabase.storage.getBucket(bucket);

  if (!existing.error) {
    return bucket;
  }

  if (!isStorageMissingError(existing.error)) {
    throw existing.error;
  }

  const created = await supabase.storage.createBucket(bucket, {
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    fileSizeLimit: 10 * 1024 * 1024,
    public: false,
  });

  if (created.error && !isStorageAlreadyExistsError(created.error)) {
    throw created.error;
  }

  return bucket;
}

export function getSocialPostStorageBucket() {
  const fallbackBucket = "mirilook-social-posts";
  const rawBucket = process.env.SUPABASE_SOCIAL_POST_BUCKET;

  if (!rawBucket) {
    return fallbackBucket;
  }

  const bucket = rawBucket
    .replace(/^\uFEFF/, "")
    .replace(/^["']|["']$/g, "")
    .trim();

  return /^[a-z0-9][a-z0-9._-]{1,62}$/.test(bucket)
    ? bucket
    : fallbackBucket;
}

export async function getVerifiedSupabaseUser(request: Request) {
  const supabase = getSupabaseAdminClient();
  const token = getBearerToken(request);

  if (!supabase || !token) {
    return null;
  }

  const result = await supabase.auth.getUser(token);

  if (result.error || !result.data.user) {
    return null;
  }

  return {
    email: result.data.user.email,
    id: result.data.user.id,
  } satisfies VerifiedSupabaseUser;
}

function getBearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);

  return match?.[1]?.trim() || "";
}

function isStorageMissingError(error: StorageErrorLike) {
  const message = error.message?.toLowerCase() ?? "";
  const status = String(error.status ?? error.statusCode ?? "");

  return status === "404" || message.includes("not found");
}

function isStorageAlreadyExistsError(error: StorageErrorLike) {
  const message = error.message?.toLowerCase() ?? "";
  const status = String(error.status ?? error.statusCode ?? "");

  return status === "409" || message.includes("already exists");
}

type StorageErrorLike = {
  message?: string;
  status?: number | string;
  statusCode?: number | string;
};
