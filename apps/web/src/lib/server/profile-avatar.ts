import {
  getProfilePhotoStorageBucket,
  getSupabaseAdminClient,
} from "@/lib/server/supabase-admin";

type SupabaseAdminClient = NonNullable<ReturnType<typeof getSupabaseAdminClient>>;

export const defaultProfileAvatarUrl = "/brand/mirilook-icon-192.png";

export async function resolveProfileAvatarUrl(
  supabase: SupabaseAdminClient,
  avatarUrl: string | null | undefined,
) {
  const source = avatarUrl?.trim();

  if (!source) {
    return defaultProfileAvatarUrl;
  }

  if (
    source.startsWith("/") ||
    source.startsWith("http://") ||
    source.startsWith("https://")
  ) {
    return source;
  }

  const signed = await supabase.storage
    .from(getProfilePhotoStorageBucket())
    .createSignedUrl(source, 60 * 60);

  if (signed.error) {
    console.warn("profile avatar signed url failed", signed.error);
  }

  return signed.data?.signedUrl ?? defaultProfileAvatarUrl;
}
