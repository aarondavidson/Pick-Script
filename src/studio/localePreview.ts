/**
 * Studio helpers for live locale string preview (does not mutate the pack).
 */

import {
  getCatalog,
  listLocales,
  resolveLocString,
  type I18nConfig,
  type LocaleId,
} from "@/engine/i18n";
import type { GameState } from "@/engine/types";

/** Minimal state stub — resolveLocString only needs it for function LocStrings. */
const PREVIEW_STATE = {
  flags: {},
  inventory: [],
  currentLocation: "",
} as GameState;

/**
 * Resolve `t(key)` against a chosen locale catalog.
 * Falls back to `fallback`, then the key itself (same as runtime translate).
 */
export function previewLocaleString(
  i18n: I18nConfig | undefined,
  locale: LocaleId,
  key: string,
  fallback?: string
): string {
  const trimmed = key.trim();
  if (!trimmed) return fallback?.trim() || "";
  const catalog = getCatalog(i18n, locale);
  return resolveLocString(
    { key: trimmed, fallback: fallback?.trim() || undefined },
    PREVIEW_STATE,
    catalog
  );
}

/** Locales available for the Studio dropdown (2+ → show select). */
export function localePreviewChoices(
  i18n: I18nConfig | undefined
): LocaleId[] {
  return listLocales(i18n);
}

/** True when the pack has enough locales for a meaningful preview dropdown. */
export function hasLocalePreview(i18n: I18nConfig | undefined): boolean {
  return localePreviewChoices(i18n).length >= 2;
}
