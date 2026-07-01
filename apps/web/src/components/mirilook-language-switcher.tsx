"use client";

import { Check, ChevronDown, Globe2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  isMirilookLocale,
  mirilookLocaleOptions,
  mirilookLocaleStorageKey,
  type MirilookLocale,
} from "@/lib/mirilook-i18n";

export function MirilookLanguageSwitcher() {
  const [locale, setLocale] = useState<MirilookLocale>("ko");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedOption =
    mirilookLocaleOptions.find((option) => option.id === locale) ??
    mirilookLocaleOptions[0];

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = window.localStorage.getItem(mirilookLocaleStorageKey);

      if (isMirilookLocale(stored)) {
        setLocale(stored);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    function closeOnOutsideClick(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  function selectLocale(nextLocale: MirilookLocale) {
    window.localStorage.setItem(mirilookLocaleStorageKey, nextLocale);
    setLocale(nextLocale);
    setIsOpen(false);
    window.dispatchEvent(
      new CustomEvent<MirilookLocale>("mirilook:locale-change", {
        detail: nextLocale,
      }),
    );
  }

  return (
    <div
      className="relative z-[90] shrink-0"
      data-mirilook-no-translate="true"
      ref={containerRef}
      title="Country / Language"
    >
      <button
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="inline-flex h-10 items-center gap-2 rounded-md border border-white/10 bg-[#0f0e0c]/72 px-3 text-sm font-semibold text-[#d8cbb8] transition hover:border-[#f3d28a]/60 hover:text-[#f3d28a]"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <Globe2 aria-hidden="true" size={14} />
        <span>Country</span>
        <span className="hidden text-xs font-bold text-[#f3d28a] md:inline">
          {selectedOption.label}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`transition ${isOpen ? "rotate-180" : ""}`}
          size={14}
        />
      </button>

      {isOpen ? (
        <div
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-52 overflow-hidden rounded-md border border-white/10 bg-[#242322] p-1 shadow-2xl shadow-black/50"
          role="menu"
        >
          {mirilookLocaleOptions.map((option) => (
            <button
              aria-checked={locale === option.id}
              className={`flex w-full items-center justify-between gap-3 rounded px-3 py-2.5 text-left text-sm font-bold transition ${
                locale === option.id
                  ? "bg-white/8 text-[#fffaf1]"
                  : "text-[#d8cbb8] hover:bg-white/8 hover:text-[#f3d28a]"
              }`}
              key={option.id}
              onClick={() => selectLocale(option.id)}
              onPointerDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
                selectLocale(option.id);
              }}
              role="menuitemradio"
              type="button"
            >
              <span className="min-w-0">
                <span aria-hidden="true" className="mr-2">
                  {option.flag}
                </span>
                {option.label}
              </span>
              {locale === option.id ? <Check aria-hidden="true" size={14} /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
