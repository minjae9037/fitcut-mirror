import {
  pilotSocialProfiles,
  type MirilookSocialProfile,
} from "@/lib/mirilook-social";
import { resolveProfileAvatarUrl } from "@/lib/server/profile-avatar";
import { getSupabaseAdminClient } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";
export const maxDuration = 30;

type ProfileRow = {
  avatar_url: string | null;
  bio: string | null;
  display_name: string | null;
  email: string | null;
  handle: string | null;
  id: string;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = sanitizeSearch(searchParams.get("q"));
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return Response.json({
      accepted: true,
      profiles: searchPilotProfiles(query),
      source: "pilot",
    });
  }

  let profileQuery = supabase
    .from("profiles")
    .select("id, display_name, email, avatar_url, bio, handle")
    .order("updated_at", { ascending: false })
    .limit(12);

  if (query) {
    const terms = createSearchTerms(query);

    if (terms.length) {
      profileQuery = profileQuery.or(
        terms
          .flatMap((term) => [
            `display_name.ilike.%${term}%`,
            `handle.ilike.%${term}%`,
            `email.ilike.%${term}%`,
            `bio.ilike.%${term}%`,
          ])
          .join(","),
      );
    }
  }

  const result = await profileQuery;

  if (result.error) {
    console.error("social member search failed", result.error);

    return Response.json(
      { accepted: false, reason: "member_search_failed" },
      { status: 500 },
    );
  }

  let profileRows = (result.data ?? []) as ProfileRow[];

  if (!profileRows.length && query) {
    profileRows = await findAuthBackedProfiles(query);
  }

  const profiles = await Promise.all(
    profileRows.map((profile) => mapProfile(supabase, profile)),
  );

  return Response.json({
    accepted: true,
    profiles,
    source: "supabase",
  });
}

async function findAuthBackedProfiles(query: string) {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return [];
  }

  const users = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (users.error) {
    console.error("social member auth fallback failed", users.error);
    return [];
  }

  const normalizedQuery = normalizeSearchText(query);
  const matchedUsers = (users.data.users ?? [])
    .filter((user) => {
      const metadata = user.user_metadata ?? {};
      const searchText = normalizeSearchText(
        [
          user.email,
          metadata.display_name,
          metadata.full_name,
          metadata.name,
          metadata.handle,
        ]
          .filter((item): item is string => typeof item === "string")
          .join(" "),
      );

      return searchText.includes(normalizedQuery);
    })
    .slice(0, 8);

  if (!matchedUsers.length) {
    return [];
  }

  const rows = matchedUsers.map((user) => {
    const metadata = user.user_metadata ?? {};
    const metadataName =
      stringFromMetadata(metadata.display_name) ||
      stringFromMetadata(metadata.full_name) ||
      stringFromMetadata(metadata.name);
    const displayName = metadataName || user.email?.split("@")[0] || "미리룩 회원";

    return {
      avatar_url: stringFromMetadata(metadata.avatar_url) || null,
      bio: null,
      display_name: displayName,
      email: user.email ?? null,
      handle:
        sanitizeHandle(metadata.handle) ||
        sanitizeHandle(`${displayName}_${user.id.slice(0, 6)}`),
      id: user.id,
    };
  });

  const upsert = await supabase
    .from("profiles")
    .upsert(rows, { onConflict: "id" })
    .select("id, display_name, email, avatar_url, bio, handle");

  if (upsert.error) {
    console.error("social member auth profile upsert failed", upsert.error);
    return rows satisfies ProfileRow[];
  }

  return (upsert.data ?? rows) as ProfileRow[];
}

function searchPilotProfiles(query: string) {
  if (!query) {
    return pilotSocialProfiles.slice(0, 8);
  }

  const keyword = query.toLowerCase();

  return pilotSocialProfiles
    .filter((profile) =>
      [profile.displayName, profile.handle, profile.bio]
        .join(" ")
        .toLowerCase()
        .includes(keyword),
    )
    .slice(0, 8);
}

async function mapProfile(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  row: ProfileRow,
): Promise<MirilookSocialProfile> {
  const displayName = row.display_name || row.email?.split("@")[0] || "미리룩 회원";

  return {
    avatarUrl: await resolveProfileAvatarUrl(supabase, row.avatar_url),
    bio: row.bio || "미리룩에서 스타일을 찾고 있습니다.",
    displayName,
    handle: row.handle || createHandle(displayName, row.id),
    id: row.id,
  };
}

function createHandle(displayName: string, id: string) {
  const seed = `${displayName}-${id.slice(0, 6)}`
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return seed || `member_${id.slice(0, 6)}`;
}

function sanitizeSearch(value: string | null) {
  return (value ?? "")
    .replace(/[<>]/g, "")
    .replace(/^@+/, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function createSearchTerms(query: string) {
  const normalized = sanitizeSearch(query);
  const underscored = normalized.replace(/\s+/g, "_");
  const compact = normalized.replace(/[\s_]+/g, "");
  const tokens = normalized.split(/\s+/).filter((token) => token.length >= 2);

  return Array.from(new Set([normalized, underscored, compact, ...tokens]))
    .map((term) => term.replace(/[%_,()]/g, ""))
    .filter(Boolean)
    .slice(0, 6);
}

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .replace(/^@+/, "")
    .replace(/[\s_]+/g, "");
}

function stringFromMetadata(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 80) : "";
}

function sanitizeHandle(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .toLowerCase()
    .replace(/[^a-z0-9가-힣.-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}
