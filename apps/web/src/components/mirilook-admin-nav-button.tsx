"use client";

import { ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { isMirilookAdminEmail } from "@/lib/mirilook-admin-session";
import {
  getSupabaseAccessToken,
  getSupabaseBrowserClient,
} from "@/lib/supabase-browser";

type AdminSessionResult = {
  accepted?: boolean;
  reason?: string;
};

export function MirilookAdminNavButton() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOpening, setIsOpening] = useState(false);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let mounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) {
        return;
      }

      setIsAdmin(isMirilookAdminEmail(data.user?.email));
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAdmin(isMirilookAdminEmail(session?.user.email));
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, [supabase]);

  async function openAdmin() {
    setIsOpening(true);

    try {
      const token = await getSupabaseAccessToken();
      const response = await fetch("/api/admin-session/", {
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : undefined,
        method: "POST",
      });
      const result = (await response.json()) as AdminSessionResult;

      if (!response.ok || !result.accepted) {
        window.location.href = "/admin";
        return;
      }

      window.location.href = "/admin";
    } catch {
      window.location.href = "/admin";
    }
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <button
      className="inline-flex shrink-0 items-center gap-2 rounded-md border border-[#7fcf9b]/45 bg-[#15331f] px-3 py-2 text-sm font-bold text-[#b9f0c5] transition hover:border-[#9ee5b6] hover:bg-[#1e452b] disabled:cursor-wait disabled:opacity-70"
      disabled={isOpening}
      onClick={() => void openAdmin()}
      type="button"
    >
      <ShieldCheck aria-hidden="true" size={15} />
      {isOpening ? "관리자 연결" : "관리자"}
    </button>
  );
}
