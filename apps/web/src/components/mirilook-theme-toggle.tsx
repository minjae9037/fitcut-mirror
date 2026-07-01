"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

type MirilookTheme = "dark" | "light";

const themeStorageKey = "mirilook_theme";

export function MirilookThemeToggle() {
  const theme = useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    getServerThemeSnapshot,
  );
  const nextTheme = theme === "dark" ? "light" : "dark";
  const Icon = theme === "dark" ? Sun : Moon;

  function toggleTheme() {
    applyTheme(nextTheme);
  }

  return (
    <button
      aria-label={
        nextTheme === "light" ? "라이트 모드로 전환" : "다크 모드로 전환"
      }
      className="inline-flex shrink-0 items-center gap-2 rounded-md border border-white/12 bg-[#11100e] px-3 py-2 text-sm font-bold text-[#e7dccb] transition hover:border-[#f3d28a]/60 hover:text-[#f3d28a]"
      data-mirilook-no-translate
      onClick={toggleTheme}
      title={
        nextTheme === "light" ? "라이트 모드로 전환" : "다크 모드로 전환"
      }
      type="button"
    >
      <Icon aria-hidden="true" size={15} />
      {nextTheme === "light" ? "라이트" : "다크"}
    </button>
  );
}

function readStoredTheme(): MirilookTheme | null {
  try {
    const value = window.localStorage.getItem(themeStorageKey);

    return isMirilookTheme(value) ? value : null;
  } catch {
    return null;
  }
}

function readDocumentTheme(): MirilookTheme | null {
  const value = document.documentElement.dataset.mirilookTheme;

  return isMirilookTheme(value) ? value : null;
}

function applyTheme(theme: MirilookTheme) {
  document.documentElement.dataset.mirilookTheme = theme;
  document.documentElement.style.colorScheme = theme;

  try {
    window.localStorage.setItem(themeStorageKey, theme);
  } catch {
    // Theme switching should still work for the current page when storage is blocked.
  }

  window.dispatchEvent(new CustomEvent("mirilook:theme-change", { detail: theme }));
}

function isMirilookTheme(value: unknown): value is MirilookTheme {
  return value === "dark" || value === "light";
}

function subscribeTheme(onStoreChange: () => void) {
  window.addEventListener("mirilook:theme-change", onStoreChange);
  window.addEventListener("storage", onStoreChange);

  return () => {
    window.removeEventListener("mirilook:theme-change", onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function getThemeSnapshot(): MirilookTheme {
  return readDocumentTheme() ?? readStoredTheme() ?? "dark";
}

function getServerThemeSnapshot(): MirilookTheme {
  return "dark";
}
