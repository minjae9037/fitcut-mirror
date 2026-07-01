"use client";

import Link from "next/link";
import { LogIn, LogOut, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export function MirilookAuthNav() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let mounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) {
        return;
      }

      setIsSignedIn(Boolean(data.user));
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsSignedIn(Boolean(session?.user));
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, [supabase]);

  async function signOut() {
    if (!supabase) {
      return;
    }

    await fetch("/api/admin-session/", { method: "DELETE" }).catch(() => null);
    await supabase.auth.signOut();
    setIsSignedIn(false);
  }

  if (isSignedIn) {
    return (
      <div className="flex shrink-0 items-center gap-2">
        <Link
          className="inline-flex max-w-36 items-center gap-2 truncate rounded-md border border-[#c9a96a]/45 px-3 py-2 text-sm font-semibold text-[#f3d28a] transition hover:bg-[#f3d28a]/10"
          href="/mypage"
        >
          <UserRound aria-hidden="true" size={15} />
          <span className="truncate">마이페이지</span>
        </Link>
        <button
          className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-sm font-semibold text-[#d8cbb8] transition hover:border-[#f3d28a]/60 hover:text-[#f3d28a]"
          onClick={() => void signOut()}
          type="button"
        >
          <LogOut aria-hidden="true" size={15} />
          로그아웃
        </button>
      </div>
    );
  }

  return (
    <Link
      className="inline-flex shrink-0 items-center gap-2 rounded-md border border-[#c9a96a]/45 px-3 py-2 text-sm font-semibold text-[#f3d28a] transition hover:bg-[#f3d28a]/10"
      href="/login"
    >
      <LogIn aria-hidden="true" size={15} />
      로그인
    </Link>
  );
}
