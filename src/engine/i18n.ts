import type { GameState, LocString } from "./types";

export type LocaleId = string;

/** Flat message catalog: "hotspot.phone.look" → localized string */
export type MessageCatalog = Record<string, string>;

export type { LocString };

export interface I18nConfig {
  /** Active / default locale (e.g. "en") */
  defaultLocale?: LocaleId;
  /** Catalogs keyed by locale */
  messages?: Record<LocaleId, MessageCatalog>;
}

const STORAGE_PREFIX = "adventure_locale_";

export function localeStorageKey(gameId: string): string {
  return `${STORAGE_PREFIX}${gameId}`;
}

export function loadStoredLocale(gameId: string): LocaleId | null {
  try {
    return localStorage.getItem(localeStorageKey(gameId));
  } catch {
    return null;
  }
}

export function storeLocale(gameId: string, locale: LocaleId): void {
  try {
    localStorage.setItem(localeStorageKey(gameId), locale);
  } catch {
    /* ignore */
  }
}

export function listLocales(i18n: I18nConfig | undefined): LocaleId[] {
  if (!i18n?.messages) return [];
  return Object.keys(i18n.messages);
}

export function getCatalog(
  i18n: I18nConfig | undefined,
  locale: LocaleId
): MessageCatalog {
  if (!i18n?.messages) return {};
  return (
    i18n.messages[locale] ??
    i18n.messages[i18n.defaultLocale ?? "en"] ??
    {}
  );
}

export function translate(
  catalog: MessageCatalog,
  key: string,
  fallback?: string
): string {
  return catalog[key] ?? fallback ?? key;
}

export function resolveLocString(
  value: LocString,
  state: GameState,
  catalog: MessageCatalog = {}
): string {
  if (typeof value === "function") {
    const v = value(state);
    return typeof v === "string" ? v : translate(catalog, v.key, v.fallback);
  }
  if (typeof value === "string") return value;
  return translate(catalog, value.key, value.fallback);
}

/** Convenience: `msg("key", "fallback")` for pack authors */
export function msg(
  key: string,
  fallback?: string
): { key: string; fallback?: string } {
  return { key, fallback };
}
