"use client";

import { useEffect, useRef, useState } from "react";

type KakaoMapsWindow = Window &
  typeof globalThis & {
    kakao?: {
      maps: {
        LatLng: new (latitude: number, longitude: number) => unknown;
        Map: new (
          container: HTMLElement,
          options: { center: unknown; level: number },
        ) => unknown;
        Marker: new (options: { position: unknown }) => {
          setMap: (map: unknown) => void;
        };
        load: (callback: () => void) => void;
      };
    };
  };

type MirilookSalonMapProps = {
  appKey?: string;
  fallbackUrl?: string;
  latitude: number;
  longitude: number;
  name: string;
  providerLabel: string;
};

let kakaoMapsLoader: Promise<void> | null = null;

export function MirilookSalonMap({
  appKey,
  fallbackUrl,
  latitude,
  longitude,
  name,
  providerLabel,
}: MirilookSalonMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canUseKakaoMap =
    Boolean(appKey) && Number.isFinite(latitude) && Number.isFinite(longitude);
  const [status, setStatus] = useState<"loading" | "ready" | "fallback">(
    canUseKakaoMap ? "loading" : "fallback",
  );

  useEffect(() => {
    if (!appKey || !canUseKakaoMap) {
      return;
    }

    let cancelled = false;

    loadKakaoMaps(appKey)
      .then(() => {
        if (cancelled || !containerRef.current) {
          return;
        }

        const kakao = (window as KakaoMapsWindow).kakao;

        if (!kakao?.maps) {
          setStatus("fallback");
          return;
        }

        const center = new kakao.maps.LatLng(latitude, longitude);
        const map = new kakao.maps.Map(containerRef.current, {
          center,
          level: 4,
        });
        const marker = new kakao.maps.Marker({ position: center });

        marker.setMap(map);
        setStatus("ready");
      })
      .catch((error) => {
        console.error("kakao maps load failed", error);
        setStatus("fallback");
      });

    return () => {
      cancelled = true;
    };
  }, [appKey, canUseKakaoMap, latitude, longitude]);

  const effectiveStatus = canUseKakaoMap ? status : "fallback";

  if (!appKey && fallbackUrl) {
    return (
      <iframe
        className="h-44 w-full border-0 grayscale-[20%]"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        src={fallbackUrl}
        title={`${name} 지도`}
      />
    );
  }

  return (
    <div className="relative h-44 w-full overflow-hidden bg-[#0f0e0c]">
      <div aria-label={`${name} ${providerLabel}`} className="h-full w-full" ref={containerRef} />
      {effectiveStatus !== "ready" ? (
        fallbackUrl ? (
          <iframe
            className="absolute inset-0 h-full w-full border-0 grayscale-[20%]"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            src={fallbackUrl}
            title={`${name} 지도 fallback`}
          />
        ) : (
          <div className="grid h-full place-items-center px-4 text-center text-xs leading-5 text-[#b8aa95]">
            {effectiveStatus === "loading"
              ? "지도를 불러오는 중입니다."
              : "지도 정보를 불러오지 못했습니다."}
          </div>
        )
      ) : null}
    </div>
  );
}

function loadKakaoMaps(appKey: string) {
  if (kakaoMapsLoader) {
    return kakaoMapsLoader;
  }

  kakaoMapsLoader = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      "script[data-mirilook-kakao-map]",
    );

    if (existing && (window as KakaoMapsWindow).kakao?.maps) {
      (window as KakaoMapsWindow).kakao?.maps.load(resolve);
      return;
    }

    const script = existing ?? document.createElement("script");

    script.dataset.mirilookKakaoMap = "true";
    script.async = true;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(
      appKey,
    )}&autoload=false`;
    script.onload = () => {
      const kakao = (window as KakaoMapsWindow).kakao;

      if (!kakao?.maps) {
        reject(new Error("kakao maps sdk unavailable"));
        return;
      }

      kakao.maps.load(resolve);
    };
    script.onerror = () => reject(new Error("kakao maps sdk load failed"));

    if (!existing) {
      document.head.appendChild(script);
    }
  });

  return kakaoMapsLoader;
}
