import { isMirilookAdminEmail } from "@/lib/mirilook-admin-session";
import type { VerifiedSupabaseUser } from "@/lib/server/supabase-admin";

export function isMirilookAdminUser(
  user: VerifiedSupabaseUser | null,
): user is VerifiedSupabaseUser & { email: string } {
  return isMirilookAdminEmail(user?.email);
}
