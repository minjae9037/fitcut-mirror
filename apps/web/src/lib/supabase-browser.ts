"use client";

import { createClient, type AuthUser, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null | undefined;

export type MirilookOAuthProvider = "google" | "kakao" | `custom:${string}`;

export function getSupabaseBrowserClient() {
  const supabaseUrl = cleanPublicEnv(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    "url",
  );
  const anonKey = cleanPublicEnv(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    "jwt",
  );

  if (!supabaseUrl || !anonKey) {
    return null;
  }

  if (browserClient !== undefined) {
    return browserClient;
  }

  browserClient = createClient(supabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
    },
  });

  return browserClient;
}

export function getAuthRedirectUrl() {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/login`;
  }

  return `${process.env.NEXT_PUBLIC_APP_URL ?? "https://mirilook.com"}/login`;
}

export function getNaverOAuthProvider(): MirilookOAuthProvider {
  const provider = cleanPublicEnv(
    process.env.NEXT_PUBLIC_NAVER_OAUTH_PROVIDER,
    "text",
  );

  if (provider?.startsWith("custom:")) {
    return provider as `custom:${string}`;
  }

  return "custom:naver";
}

// 네이버 로그인은 백엔드 커스텀 OAuth(/api/auth/naver/*)로 동작한다. 네이버
// 개발자센터 앱 등록 + 서버 키(NAVER_LOGIN_CLIENT_ID/SECRET)가 준비된 뒤
// 이 공개 플래그를 "true"로 켜면 로그인 화면에 네이버 버튼이 활성화된다.
export function isNaverLoginEnabled() {
  return (
    cleanPublicEnv(process.env.NEXT_PUBLIC_NAVER_LOGIN_ENABLED, "text") === "true"
  );
}

// 네이버 로그인 시작 — 백엔드가 네이버 인증 페이지로 보냈다가, 콜백에서
// 매직링크 token_hash를 붙여 로그인 페이지로 돌려보낸다.
export function startNaverLogin() {
  if (typeof window === "undefined") {
    return;
  }

  const redirect = encodeURIComponent(getAuthRedirectUrl());
  window.location.href = `/api/auth/naver/start?redirect=${redirect}`;
}

export async function getSupabaseAccessToken() {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return "";
  }

  const { data } = await supabase.auth.getSession();

  return data.session?.access_token ?? "";
}

export async function getSupabaseHistoryOwnerId() {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return "anonymous";
  }

  const { data } = await supabase.auth.getSession();

  return data.session?.user.id ?? "anonymous";
}

export function getUserDisplayName(user: AuthUser | null) {
  if (!user) {
    return "";
  }

  return (
    text(user.user_metadata?.full_name) ||
    text(user.user_metadata?.name) ||
    text(user.user_metadata?.preferred_username) ||
    text(user.email) ||
    "mirilook member"
  );
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanPublicEnv(value: string | undefined, kind: "jwt" | "url" | "text") {
  if (!value) {
    return "";
  }

  const cleaned = value
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/^\uFEFF/, "")
    .replace(/^(?:ï»¿|癤.)/, "")
    .trim();

  if (kind === "url" && cleaned.startsWith("ttps://")) {
    return `h${cleaned}`;
  }

  if (kind === "jwt" && cleaned.startsWith("yJ")) {
    return `e${cleaned}`;
  }

  return cleaned;
}
