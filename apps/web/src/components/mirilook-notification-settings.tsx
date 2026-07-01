"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { getSupabaseAccessToken } from "@/lib/supabase-browser";

type PushState =
  | "checking"
  | "unsupported"
  | "needs-key"
  | "denied"
  | "ready"
  | "subscribed";

const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY;

export function MirilookNotificationSettings() {
  const [contact, setContact] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [pushState, setPushState] = useState<PushState>("checking");

  async function checkPushState() {
    if (!isPushSupported()) {
      setPushState("unsupported");
      return;
    }

    if (!publicKey) {
      setPushState("needs-key");
      return;
    }

    if (Notification.permission === "denied") {
      setPushState("denied");
      return;
    }

    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();

    setPushState(subscription ? "subscribed" : "ready");
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void checkPushState();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  async function enableNotifications() {
    setIsBusy(true);
    setMessage("");

    try {
      if (!isPushSupported()) {
        setPushState("unsupported");
        setMessage("이 브라우저에서는 알림을 지원하지 않습니다.");
        return;
      }

      if (!publicKey) {
        setPushState("needs-key");
        setMessage("Vercel에 NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY를 설정하면 알림을 켤 수 있습니다.");
        return;
      }

      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        setPushState(permission === "denied" ? "denied" : "ready");
        setMessage("브라우저 알림 권한이 허용되지 않았습니다.");
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      const existingSubscription =
        await registration.pushManager.getSubscription();
      const subscription =
        existingSubscription ??
        (await registration.pushManager.subscribe({
          applicationServerKey: urlBase64ToUint8Array(publicKey),
          userVisibleOnly: true,
        }));
      const token = await getSupabaseAccessToken();

      const response = await fetch("/api/notifications/subscriptions/", {
        body: JSON.stringify({
          consentContext: "community_vote_dm_payment_notifications",
          contact,
          subscription: subscription.toJSON(),
          userAgent: navigator.userAgent,
        }),
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const result = (await response.json()) as {
        accepted?: boolean;
        reason?: string;
      };

      setPushState("subscribed");
      setMessage(
        result.accepted
          ? "알림 구독이 저장되었습니다. 투표, 댓글, DM, 결제 알림으로 확장할 수 있습니다."
          : result.reason === "supabase_not_configured"
            ? "브라우저 알림은 준비됐습니다. Supabase 연결 후 서버 구독 저장이 활성화됩니다."
            : `알림 구독 저장을 확인하지 못했습니다. ${result.reason ?? response.status}`,
      );
    } catch (error) {
      console.error(error);
      setMessage("알림 설정 중 오류가 발생했습니다.");
    } finally {
      setIsBusy(false);
    }
  }

  async function disableNotifications() {
    setIsBusy(true);
    setMessage("");

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      const endpoint = subscription?.endpoint;

      if (endpoint) {
        await fetch("/api/notifications/subscriptions/", {
          body: JSON.stringify({ endpoint }),
          headers: {
            "Content-Type": "application/json",
          },
          method: "DELETE",
        });
      }

      await subscription?.unsubscribe();
      setPushState("ready");
      setMessage("이 브라우저의 알림 구독을 해제했습니다.");
    } catch (error) {
      console.error(error);
      setMessage("알림 해제 중 오류가 발생했습니다.");
    } finally {
      setIsBusy(false);
    }
  }

  const isSubscribed = pushState === "subscribed";

  return (
    <section className="rounded-md border border-[#2b281f] bg-[#171511]/92 p-4">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-md border border-[#f3d28a]/35 bg-[#2d2414] text-[#f3d28a]">
          {isSubscribed ? (
            <Bell aria-hidden="true" size={18} />
          ) : (
            <BellOff aria-hidden="true" size={18} />
          )}
        </span>
        <div>
          <h2 className="text-lg font-semibold text-[#fffaf1]">
            알림 설정
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#b8aa95]">
            투표 결과, 댓글, DM 요청, 결제 후 노출 상태를 브라우저 push 알림으로 받을 수 있게 준비합니다.
          </p>
        </div>
      </div>

      <label className="mt-4 grid gap-2 text-sm font-semibold text-[#d8cbb8]">
        연락처 또는 이메일
        <input
          className="h-10 rounded-md border border-white/10 bg-[#0f0e0c] px-3 text-sm text-[#fffaf1] outline-none transition placeholder:text-[#6f6658] focus:border-[#f3d28a]/70"
          onChange={(event) => setContact(event.target.value)}
          placeholder="선택 입력"
          value={contact}
        />
      </label>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#f3d28a] px-3 text-sm font-bold text-[#171511] transition hover:bg-[#ffe0a0] disabled:cursor-not-allowed disabled:opacity-55"
          disabled={isBusy || isSubscribed}
          onClick={() => void enableNotifications()}
          type="button"
        >
          {isBusy && !isSubscribed ? (
            <Loader2 aria-hidden="true" className="animate-spin" size={16} />
          ) : (
            <Bell aria-hidden="true" size={16} />
          )}
          알림 받기
        </button>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-white/12 px-3 text-sm font-semibold text-[#e7dccb] transition hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-55"
          disabled={isBusy || !isSubscribed}
          onClick={() => void disableNotifications()}
          type="button"
        >
          {isBusy && isSubscribed ? (
            <Loader2 aria-hidden="true" className="animate-spin" size={16} />
          ) : (
            <BellOff aria-hidden="true" size={16} />
          )}
          해제
        </button>
      </div>

      <p className="mt-3 text-xs leading-5 text-[#8f826f]">
        {getStateLabel(pushState)}
      </p>
      {message ? (
        <p className="mt-3 rounded-md border border-[#f3d28a]/22 bg-[#2b2112] px-3 py-2 text-sm leading-6 text-[#f3d28a]">
          {message}
        </p>
      ) : null}
    </section>
  );
}

function isPushSupported() {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "PushManager" in window &&
    "serviceWorker" in navigator
  );
}

function getStateLabel(state: PushState) {
  switch (state) {
    case "checking":
      return "브라우저 알림 지원 여부를 확인하고 있습니다.";
    case "unsupported":
      return "현재 브라우저에서는 Web Push가 지원되지 않습니다.";
    case "needs-key":
      return "Vercel에 Web Push 공개키를 설정하면 활성화됩니다.";
    case "denied":
      return "브라우저 알림 권한이 차단되어 있습니다.";
    case "subscribed":
      return "이 브라우저는 미리룩 알림을 받을 준비가 되어 있습니다.";
    default:
      return "브라우저 알림을 켜면 커뮤니티 투표와 DM 흐름에 연결할 수 있습니다.";
  }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}
