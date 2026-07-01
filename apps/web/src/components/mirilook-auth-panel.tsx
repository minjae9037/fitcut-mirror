"use client";

import type { AuthUser } from "@supabase/supabase-js";
import {
  CheckCircle2,
  CircleAlert,
  Loader2,
  Lock,
  LogIn,
  LogOut,
  Mail,
  ShieldCheck,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getAuthRedirectUrl,
  getSupabaseBrowserClient,
  getUserDisplayName,
  isNaverLoginEnabled,
  startNaverLogin,
} from "@/lib/supabase-browser";

type AuthMode = "login" | "signup";
type StatusTone = "info" | "success" | "error";

export function MirilookAuthPanel() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const naverEnabled = useMemo(() => isNaverLoginEnabled(), []);
  const [mode, setMode] = useState<AuthMode>("login");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState(() =>
    supabase
      ? ""
      : "Supabase URL과 anon key를 연결하면 회원가입/로그인 기능이 활성화됩니다.",
  );
  const [statusTone, setStatusTone] = useState<StatusTone>(supabase ? "info" : "error");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [busyAction, setBusyAction] = useState("");
  // Guard so a fresh sign-in only redirects home once (avoids loops on re-renders).
  const postAuthRedirectedRef = useRef(false);

  const syncProfile = useCallback(
    async (nextUser: AuthUser) => {
      if (!supabase) {
        return;
      }

      const result = await supabase.from("profiles").upsert(
        {
          avatar_url: text(nextUser.user_metadata?.avatar_url),
          display_name: getUserDisplayName(nextUser),
          email: nextUser.email,
          id: nextUser.id,
          provider: text(nextUser.app_metadata?.provider) || "email",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      );

      if (result.error) {
        console.warn("profile sync failed", result.error);
      }
    },
    [supabase],
  );

  const signInWithProvider = useCallback(
    async (provider: "google" | "kakao") => {
      const providerLabel = provider === "google" ? "구글" : "카카오";

      if (!supabase) {
        setStatusTone("error");
        setStatus("Supabase 연결 후 SNS 로그인을 사용할 수 있습니다.");
        return;
      }

      setBusyAction(provider);
      setStatusTone("info");
      setStatus(`${providerLabel} 로그인 창으로 이동합니다...`);

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: getAuthRedirectUrl() },
      });

      if (error) {
        setBusyAction("");
        setStatusTone("error");
        setStatus(
          `${providerLabel} 로그인을 시작하지 못했습니다. 관리자에게 ${providerLabel} 로그인 설정을 요청하거나 잠시 후 다시 시도해 주세요.`,
        );
      }
      // On success the browser is redirected to the provider, then back to /login.
    },
    [supabase],
  );

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let mounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) {
        return;
      }

      setUser(data.user);

      if (data.user) {
        void syncProfile(data.user);
      }
    });

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);

      if (session?.user) {
        void syncProfile(session.user);

        // After OAuth (Google/Kakao) the browser returns to /login and fires
        // SIGNED_IN once the session is established — send the user to the home
        // screen rather than leaving them on the login page. INITIAL_SESSION
        // (a normal page load while already logged in) is intentionally ignored.
        if (event === "SIGNED_IN" && !postAuthRedirectedRef.current) {
          postAuthRedirectedRef.current = true;
          router.replace("/");
        }
      }
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, [supabase, syncProfile, router]);

  // 네이버 커스텀 OAuth 복귀 처리: 콜백이 붙여 보낸 token_hash로 세션을 만든다.
  // 일반 페이지 로드(네이버 파라미터 없음)에서는 아무 일도 하지 않는다.
  useEffect(() => {
    if (!supabase || typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const naverError = params.get("error");
    const tokenHash = params.get("token_hash");
    const type = params.get("type");

    if (!naverError && (!tokenHash || type !== "magiclink")) {
      return;
    }

    const clearAuthParams = () => {
      ["token_hash", "type", "provider", "error"].forEach((key) =>
        params.delete(key),
      );
      const query = params.toString();
      window.history.replaceState(
        {},
        "",
        `${window.location.pathname}${query ? `?${query}` : ""}`,
      );
    };

    void (async () => {
      if (naverError) {
        setStatusTone("error");
        setStatus(`네이버 로그인에 실패했습니다: ${naverError}`);
        clearAuthParams();
        return;
      }

      setBusyAction("naver");
      setStatusTone("info");
      setStatus("네이버 로그인을 마무리하는 중입니다...");

      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash as string,
        type: "magiclink",
      });
      clearAuthParams();

      if (error) {
        setBusyAction("");
        setStatusTone("error");
        setStatus(
          "네이버 로그인 세션 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.",
        );
        return;
      }
      // 성공 시 onAuthStateChange(SIGNED_IN)가 홈으로 이동시킨다.
    })();
  }, [supabase]);

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase) {
      setStatusTone("error");
      setStatus("로그인 서버가 아직 연결되지 않았습니다. Supabase 환경변수를 먼저 설정해 주세요.");
      return;
    }

    const normalizedEmail = email.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setStatusTone("error");
      setStatus("이메일 주소를 정확히 입력해 주세요.");
      return;
    }

    if (password.length < 6) {
      setStatusTone("error");
      setStatus("비밀번호는 최소 6자 이상으로 입력해 주세요.");
      return;
    }

    setBusyAction(mode);
    setStatusTone("info");
    setStatus(mode === "signup" ? "회원가입을 처리하는 중입니다." : "로그인 중입니다.");

    try {
      const result =
        mode === "signup"
          ? await supabase.auth.signUp({
              email: normalizedEmail,
              options: {
                data: {
                  full_name: displayName.trim() || undefined,
                },
                emailRedirectTo: getAuthRedirectUrl(),
              },
              password,
            })
          : await supabase.auth.signInWithPassword({
              email: normalizedEmail,
              password,
            });

      if (result.error) {
        setStatusTone("error");
        setStatus(getReadableAuthMessage(result.error.message, mode));
        return;
      }

      const sessionUser = result.data.session?.user ?? null;

      if (sessionUser) {
        setUser(sessionUser);
        setStatusTone("success");
        setStatus(
          mode === "signup"
            ? "회원가입과 로그인이 완료되었습니다. 홈으로 이동합니다."
            : "로그인되었습니다. 홈으로 이동합니다.",
        );
        postAuthRedirectedRef.current = true;
        router.replace("/");
        return;
      }

      if (mode === "signup") {
        setUser(null);
        setMode("login");
        setPassword("");
        setStatusTone("success");
        setStatus(getSignupFollowUpMessage(result.data.user));
        return;
      }

      setUser(null);
      setStatusTone("error");
      setStatus("로그인 응답을 받았지만 세션을 확인하지 못했습니다. 다시 로그인해 주세요.");
    } catch (error) {
      setStatusTone("error");
      setStatus(getReadableAuthMessage(error, mode));
    } finally {
      setBusyAction("");
    }
  }

  async function sendPasswordReset() {
    if (!supabase) {
      setStatusTone("error");
      setStatus("로그인 서버가 아직 연결되지 않았습니다. Supabase 환경변수를 먼저 설정해 주세요.");
      return;
    }

    const normalizedEmail = email.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setStatusTone("error");
      setStatus("비밀번호 재설정 메일을 받을 이메일을 입력해 주세요.");
      return;
    }

    setBusyAction("reset");
    setStatusTone("info");
    setStatus("비밀번호 재설정 메일을 발송하는 중입니다.");

    try {
      const result = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: getAuthRedirectUrl(),
      });

      setStatus(
        result.error
          ? getReadableAuthMessage(result.error.message, "login")
          : "비밀번호 재설정 메일을 보냈습니다. 메일함을 확인해 주세요.",
      );
      setStatusTone(result.error ? "error" : "success");
    } catch (error) {
      setStatusTone("error");
      setStatus(getReadableAuthMessage(error, "login"));
    } finally {
      setBusyAction("");
    }
  }

  async function signOut() {
    if (!supabase) {
      return;
    }

    setBusyAction("signout");
    await fetch("/api/admin-session/", { method: "DELETE" }).catch(() => null);
    const result = await supabase.auth.signOut();
    setBusyAction("");

    if (result.error) {
      setStatusTone("error");
      setStatus(getReadableAuthMessage(result.error.message, "login"));
      return;
    }

    setUser(null);
    setStatusTone("success");
    setStatus("로그아웃되었습니다.");
  }

  return (
    <section className="grid gap-5 rounded-lg border border-white/12 bg-[#171511]/92 p-4 shadow-2xl shadow-black/40 backdrop-blur md:p-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div>
        <div className="flex items-center gap-2">
          <ShieldCheck aria-hidden="true" className="text-[#f3d28a]" size={20} />
          <h2 className="text-xl font-semibold text-[#fffaf1]">
            미리룩 계정
          </h2>
        </div>
        <p className="mt-2 text-sm leading-6 text-[#b8aa95]">
          이메일 계정으로 로그인하면 추천받은 헤어스타일, 상담 이미지, 저장한 결과를 계정별
          히스토리로 관리할 수 있습니다.
        </p>

        {status ? <AuthStatusNotice message={status} tone={statusTone} /> : null}

        {user ? (
          <div className="mt-5 rounded-md border border-[#c9a96a]/35 bg-[#201a12]/78 p-4">
            <p className="text-sm font-semibold text-[#f3d28a]">
              로그인된 계정
            </p>
            <p className="mt-2 text-lg font-bold text-[#fffaf1]">
              {getUserDisplayName(user)}
            </p>
            <p className="mt-1 text-sm text-[#b8aa95]">
              {user.email ?? "이메일 계정"}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                className="inline-flex h-10 items-center gap-2 rounded-md bg-[#f3d28a] px-3 text-sm font-bold text-[#1a1712] transition hover:bg-[#ffdf98]"
                href="/mypage"
              >
                <CheckCircle2 aria-hidden="true" size={16} />
                마이페이지 보기
              </a>
              <button
                className="inline-flex h-10 items-center gap-2 rounded-md border border-white/12 px-3 text-sm font-semibold text-[#e7dccb] transition hover:bg-white/8 disabled:cursor-not-allowed disabled:text-[#8f826f]"
                disabled={busyAction === "signout"}
                onClick={() => void signOut()}
                type="button"
              >
                {busyAction === "signout" ? (
                  <Loader2 aria-hidden="true" className="animate-spin" size={16} />
                ) : (
                  <LogOut aria-hidden="true" size={16} />
                )}
                로그아웃
              </button>
            </div>
          </div>
        ) : (
          <form className="mt-5 grid gap-3" onSubmit={(event) => void handleEmailSubmit(event)}>
            <div className="flex rounded-md border border-white/10 bg-[#0f0e0c]/72 p-1">
              {(["login", "signup"] as const).map((item) => (
                <button
                  className={`h-10 flex-1 rounded-md text-sm font-bold transition ${
                    mode === item
                      ? "bg-[#f3d28a] text-[#1a1712]"
                      : "text-[#b8aa95] hover:bg-white/8 hover:text-[#fffaf1]"
                  }`}
                  key={item}
                  onClick={() => {
                    setMode(item);
                    setStatus("");
                    setStatusTone("info");
                  }}
                  type="button"
                >
                  {item === "login" ? "로그인" : "회원가입"}
                </button>
              ))}
            </div>

            {mode === "signup" ? (
              <label className="grid gap-1 text-sm font-semibold text-[#e7dccb]">
                이름
                <input
                  className="h-11 rounded-md border border-white/10 bg-[#11100e] px-3 text-sm text-[#fffaf1] outline-none transition placeholder:text-[#8f826f] focus:border-[#f3d28a]/70"
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="히스토리에 표시할 이름"
                  value={displayName}
                />
              </label>
            ) : null}

            <label className="grid gap-1 text-sm font-semibold text-[#e7dccb]">
              이메일
              <span className="relative">
                <Mail
                  aria-hidden="true"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8f826f]"
                  size={16}
                />
                <input
                  className="h-11 w-full rounded-md border border-white/10 bg-[#11100e] px-9 text-sm text-[#fffaf1] outline-none transition placeholder:text-[#8f826f] focus:border-[#f3d28a]/70"
                  inputMode="email"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  type="email"
                  value={email}
                />
              </span>
            </label>

            <label className="grid gap-1 text-sm font-semibold text-[#e7dccb]">
              비밀번호
              <span className="relative">
                <Lock
                  aria-hidden="true"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8f826f]"
                  size={16}
                />
                <input
                  className="h-11 w-full rounded-md border border-white/10 bg-[#11100e] px-9 text-sm text-[#fffaf1] outline-none transition placeholder:text-[#8f826f] focus:border-[#f3d28a]/70"
                  minLength={6}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="6자 이상"
                  type="password"
                  value={password}
                />
              </span>
            </label>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md bg-[#f3d28a] px-4 text-sm font-bold text-[#1a1712] transition hover:bg-[#ffdf98] disabled:cursor-not-allowed disabled:bg-[#675737] disabled:text-[#b8aa95]"
                disabled={busyAction === mode}
                type="submit"
              >
                {busyAction === mode ? (
                  <Loader2 aria-hidden="true" className="animate-spin" size={17} />
                ) : mode === "login" ? (
                  <LogIn aria-hidden="true" size={17} />
                ) : (
                  <UserPlus aria-hidden="true" size={17} />
                )}
                {busyAction === mode
                  ? mode === "login"
                    ? "로그인 중..."
                    : "가입 처리 중..."
                  : mode === "login"
                    ? "이메일로 로그인"
                    : "이메일로 회원가입"}
              </button>
              {mode === "login" ? (
                <button
                  className="inline-flex h-11 items-center justify-center rounded-md border border-white/12 px-4 text-sm font-semibold text-[#e7dccb] transition hover:border-[#f3d28a]/60 hover:text-[#f3d28a] disabled:cursor-not-allowed disabled:text-[#8f826f]"
                  disabled={busyAction === "reset"}
                  onClick={() => void sendPasswordReset()}
                  type="button"
                >
                  {busyAction === "reset" ? "발송 중" : "비밀번호 재설정"}
                </button>
              ) : null}
            </div>
          </form>
        )}
      </div>

      <aside className="rounded-md border border-[#2b281f] bg-[#0f0e0c]/78 p-4">
        <div className="flex items-center gap-2">
          <Sparkles aria-hidden="true" className="text-[#f3d28a]" size={18} />
          <h3 className="text-base font-semibold text-[#fffaf1]">
            SNS로 간편하게 시작하기
          </h3>
        </div>
        <p className="mt-2 text-sm leading-6 text-[#b8aa95]">
          구글·카카오 계정으로 1초 만에 로그인하고, 추천 결과와 상담 기록을
          계정에 저장하세요.
        </p>
        <div className="mt-4 grid gap-2">
          <button
            className="grid grid-cols-[40px_minmax(0,1fr)] items-center gap-3 rounded-md border border-white/12 bg-[#15130f] p-2 text-left transition hover:border-[#f3d28a]/60 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={busyAction === "google"}
            onClick={() => void signInWithProvider("google")}
            type="button"
          >
            <span className="flex size-10 items-center justify-center rounded-md bg-white text-base font-black text-[#1a1712]">
              {busyAction === "google" ? (
                <Loader2 aria-hidden="true" className="animate-spin" size={16} />
              ) : (
                "G"
              )}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-[#fffaf1]">
                Google로 계속하기
              </span>
              <span className="mt-0.5 block text-xs text-[#8f826f]">
                구글 계정으로 로그인 / 회원가입
              </span>
            </span>
          </button>

          <button
            className="grid grid-cols-[40px_minmax(0,1fr)] items-center gap-3 rounded-md border border-white/12 bg-[#15130f] p-2 text-left transition hover:border-[#f3d28a]/60 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={busyAction === "kakao"}
            onClick={() => void signInWithProvider("kakao")}
            type="button"
          >
            <span className="flex size-10 items-center justify-center rounded-md bg-[#fee500] text-base font-black text-[#191600]">
              {busyAction === "kakao" ? (
                <Loader2 aria-hidden="true" className="animate-spin" size={16} />
              ) : (
                "K"
              )}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-[#fffaf1]">
                카카오로 계속하기
              </span>
              <span className="mt-0.5 block text-xs text-[#8f826f]">
                카카오 계정으로 로그인 / 회원가입
              </span>
            </span>
          </button>

          {naverEnabled ? (
            <button
              className="grid grid-cols-[40px_minmax(0,1fr)] items-center gap-3 rounded-md border border-white/12 bg-[#15130f] p-2 text-left transition hover:border-[#f3d28a]/60 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={busyAction === "naver"}
              onClick={() => {
                setBusyAction("naver");
                setStatusTone("info");
                setStatus("네이버 로그인 창으로 이동합니다...");
                startNaverLogin();
              }}
              type="button"
            >
              <span className="flex size-10 items-center justify-center rounded-md bg-[#03c75a] text-base font-black text-white">
                {busyAction === "naver" ? (
                  <Loader2 aria-hidden="true" className="animate-spin" size={16} />
                ) : (
                  "N"
                )}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-[#fffaf1]">
                  네이버로 계속하기
                </span>
                <span className="mt-0.5 block text-xs text-[#8f826f]">
                  네이버 계정으로 로그인 / 회원가입
                </span>
              </span>
            </button>
          ) : (
            <div className="grid grid-cols-[40px_minmax(0,1fr)] items-center gap-3 rounded-md border border-white/10 bg-[#15130f] p-2 opacity-70">
              <span className="flex size-10 items-center justify-center rounded-md bg-[#03c75a] text-base font-black text-white">
                N
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-[#fffaf1]">
                  네이버
                </span>
                <span className="mt-0.5 block text-xs text-[#8f826f]">
                  준비 중 (곧 지원 예정)
                </span>
              </span>
            </div>
          )}
        </div>
      </aside>

    </section>
  );
}

function AuthStatusNotice({
  message,
  tone,
}: {
  message: string;
  tone: StatusTone;
}) {
  const Icon = tone === "error" ? CircleAlert : tone === "success" ? CheckCircle2 : Loader2;
  const toneClass =
    tone === "error"
      ? "border-red-400/40 bg-red-950/30 text-red-100"
      : tone === "success"
        ? "border-emerald-400/35 bg-emerald-950/28 text-emerald-100"
        : "border-[#c9a96a]/35 bg-[#201a12]/76 text-[#f3d28a]";

  return (
    <p
      aria-live="polite"
      className={`mt-4 flex items-start gap-2 rounded-md border px-3 py-2 text-sm leading-6 ${toneClass}`}
      role="status"
    >
      <Icon
        aria-hidden="true"
        className={tone === "info" ? "mt-0.5 shrink-0 animate-spin" : "mt-0.5 shrink-0"}
        size={16}
      />
      <span>{message}</span>
    </p>
  );
}

function getSignupFollowUpMessage(user: AuthUser | null) {
  if (Array.isArray(user?.identities) && user.identities.length === 0) {
    return "이미 가입된 이메일일 수 있습니다. 로그인 탭에서 같은 이메일과 비밀번호로 로그인해 주세요.";
  }

  return "회원가입이 접수되었습니다. 이메일 인증 메일이 도착했다면 인증을 완료한 뒤 로그인해 주세요.";
}

function getReadableAuthMessage(error: unknown, mode: AuthMode) {
  const raw =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? error.message
        : "알 수 없는 오류가 발생했습니다.";
  const message = raw.toLowerCase();

  if (/invalid login credentials|invalid credentials|email not confirmed/.test(message)) {
    return "이메일 또는 비밀번호가 맞지 않거나 이메일 인증이 아직 완료되지 않았습니다.";
  }

  if (/already registered|user already registered|already exists/.test(message)) {
    return "이미 가입된 이메일입니다. 로그인 탭에서 로그인해 주세요.";
  }

  if (/rate limit|too many|for security purposes/.test(message)) {
    return "요청이 잠시 많았습니다. 1분 뒤 다시 시도해 주세요.";
  }

  if (/failed to fetch|network|fetch/.test(message)) {
    return "로그인 서버 응답이 지연되고 있습니다. 인터넷 연결을 확인한 뒤 다시 시도해 주세요.";
  }

  return mode === "signup"
    ? `회원가입을 완료하지 못했습니다. ${raw}`
    : `로그인을 완료하지 못했습니다. ${raw}`;
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : null;
}
