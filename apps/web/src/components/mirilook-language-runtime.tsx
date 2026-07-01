"use client";

import { useEffect } from "react";
import {
  getMirilookLocaleOption,
  isMirilookLocale,
  mirilookLocaleStorageKey,
  mirilookTranslationCacheVersion,
  translateMirilookText,
  type MirilookLocale,
} from "@/lib/mirilook-i18n";

const textOriginals = new WeakMap<
  Text,
  {
    original: string;
    rendered: string;
  }
>();
const translatableAttributes = ["aria-label", "alt", "placeholder", "title"];
const originalAttributePrefix = "data-mirilook-original-";
const noTranslateSelector = "[data-mirilook-no-translate]";
const sentenceCacheStorageKey = "mirilook_translation_sentence_cache";
const maxSentenceCacheEntries = 2500;

type TranslationSentenceCache = {
  entries: Record<string, string>;
  version: string;
};

export function MirilookLanguageRuntime() {
  useEffect(() => {
    const initialLocale = readStoredLocale();
    let currentLocale = initialLocale;
    let isApplying = false;
    let isQueued = false;
    const sentenceCache = readTranslationSentenceCache();

    writeCacheVersion();
    applyLocale(currentLocale);

    function queueApply(locale = currentLocale) {
      currentLocale = locale;

      if (isApplying || isQueued) {
        return;
      }

      isQueued = true;
      window.requestAnimationFrame(() => {
        isQueued = false;
        applyLocale(currentLocale);
      });
    }

    function applyLocale(locale: MirilookLocale) {
      isApplying = true;
      document.documentElement.lang = getMirilookLocaleOption(locale).lang;
      document.documentElement.dataset.mirilookLocale = locale;
      translateBody(locale, sentenceCache);
      writeTranslationSentenceCache(sentenceCache);
      isApplying = false;
    }

    function handleLocaleChange(event: Event) {
      const locale = (event as CustomEvent<MirilookLocale>).detail;

      if (isMirilookLocale(locale)) {
        queueApply(locale);
      }
    }

    window.addEventListener("mirilook:locale-change", handleLocaleChange);

    const observer = new MutationObserver(() => {
      queueApply();
    });

    observer.observe(document.body, {
      attributeFilter: translatableAttributes,
      attributes: true,
      characterData: true,
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
      window.removeEventListener("mirilook:locale-change", handleLocaleChange);
    };
  }, []);

  return null;
}

function translateBody(
  locale: MirilookLocale,
  sentenceCache: TranslationSentenceCache,
) {
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        const parent = node.parentElement;

        if (!parent || shouldSkipElement(parent)) {
          return NodeFilter.FILTER_REJECT;
        }

        return node.textContent?.trim()
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT;
      },
    },
  );
  const textNodes: Text[] = [];

  while (walker.nextNode()) {
    textNodes.push(walker.currentNode as Text);
  }

  textNodes.forEach((node) => translateTextNode(node, locale, sentenceCache));
  document
    .querySelectorAll<HTMLElement>(
      translatableAttributes.map((attribute) => `[${attribute}]`).join(","),
    )
    .forEach((element) =>
      translateElementAttributes(element, locale, sentenceCache),
    );
}

function translateTextNode(
  node: Text,
  locale: MirilookLocale,
  sentenceCache: TranslationSentenceCache,
) {
  const current = node.data;
  const snapshot = textOriginals.get(node);
  const original =
    snapshot && current === snapshot.rendered ? snapshot.original : current;
  const next = translateCachedText(original, locale, sentenceCache);

  textOriginals.set(node, {
    original,
    rendered: next,
  });

  if (node.data !== next) {
    node.data = next;
  }
}

function translateElementAttributes(
  element: HTMLElement,
  locale: MirilookLocale,
  sentenceCache: TranslationSentenceCache,
) {
  if (shouldSkipAttributeElement(element)) {
    return;
  }

  translatableAttributes.forEach((attribute) => {
    const current = element.getAttribute(attribute);

    if (!current?.trim()) {
      return;
    }

    const safeAttributeName = attribute.replace(/[^a-z0-9]/gi, "-");
    const originalKey = `${originalAttributePrefix}${safeAttributeName}`;
    const renderedKey = `data-mirilook-rendered-${safeAttributeName}`;
    const previousRendered = element.getAttribute(renderedKey);
    const original =
      previousRendered && current === previousRendered
        ? element.getAttribute(originalKey) ?? current
        : current;
    const next = translateCachedText(original, locale, sentenceCache);

    if (!element.hasAttribute(originalKey)) {
      element.setAttribute(originalKey, original);
    }
    element.setAttribute(originalKey, original);
    element.setAttribute(renderedKey, next);

    if (current !== next) {
      element.setAttribute(attribute, next);
    }
  });
}

function translateCachedText(
  text: string,
  locale: MirilookLocale,
  sentenceCache: TranslationSentenceCache,
) {
  if (locale === "ko" || !text.trim()) {
    return text;
  }

  const cacheKey = `${locale}:${text}`;
  const cached = sentenceCache.entries[cacheKey];

  if (cached) {
    return cached;
  }

  const translated = translateMirilookText(text, locale);

  sentenceCache.entries[cacheKey] = translated;
  trimTranslationSentenceCache(sentenceCache);

  return translated;
}

function shouldSkipElement(element: Element) {
  if (element.closest(noTranslateSelector)) {
    return true;
  }

  return [
    "CANVAS",
    "CODE",
    "IFRAME",
    "INPUT",
    "NOSCRIPT",
    "SCRIPT",
    "SELECT",
    "STYLE",
    "SVG",
    "TEXTAREA",
  ].includes(element.tagName);
}

function shouldSkipAttributeElement(element: Element) {
  if (element.closest(noTranslateSelector)) {
    return true;
  }

  return ["CANVAS", "IFRAME", "NOSCRIPT", "SCRIPT", "STYLE", "SVG"].includes(
    element.tagName,
  );
}

function readStoredLocale(): MirilookLocale {
  const stored = window.localStorage.getItem(mirilookLocaleStorageKey);

  return isMirilookLocale(stored) ? stored : "ko";
}

function writeCacheVersion() {
  window.localStorage.setItem(
    "mirilook_translation_cache_version",
    mirilookTranslationCacheVersion,
  );
}

function readTranslationSentenceCache(): TranslationSentenceCache {
  try {
    const raw = window.localStorage.getItem(sentenceCacheStorageKey);
    const parsed = raw ? (JSON.parse(raw) as Partial<TranslationSentenceCache>) : null;

    if (
      parsed?.version === mirilookTranslationCacheVersion &&
      parsed.entries &&
      typeof parsed.entries === "object"
    ) {
      return {
        entries: parsed.entries,
        version: mirilookTranslationCacheVersion,
      };
    }
  } catch {
    window.localStorage.removeItem(sentenceCacheStorageKey);
  }

  return {
    entries: {},
    version: mirilookTranslationCacheVersion,
  };
}

function writeTranslationSentenceCache(sentenceCache: TranslationSentenceCache) {
  try {
    window.localStorage.setItem(
      sentenceCacheStorageKey,
      JSON.stringify(sentenceCache),
    );
  } catch {
    trimTranslationSentenceCache(sentenceCache, Math.floor(maxSentenceCacheEntries / 2));
    try {
      window.localStorage.setItem(
        sentenceCacheStorageKey,
        JSON.stringify(sentenceCache),
      );
    } catch {
      window.localStorage.removeItem(sentenceCacheStorageKey);
    }
  }
}

function trimTranslationSentenceCache(
  sentenceCache: TranslationSentenceCache,
  maxEntries = maxSentenceCacheEntries,
) {
  const entries = Object.entries(sentenceCache.entries);

  if (entries.length <= maxEntries) {
    return;
  }

  sentenceCache.entries = Object.fromEntries(entries.slice(entries.length - maxEntries));
}
