import { describe, expect, it } from "vitest";
import type { I18nConfig } from "@/engine/i18n";
import {
  hasLocalePreview,
  localePreviewChoices,
  previewLocaleString,
} from "@/studio/localePreview";

const i18n: I18nConfig = {
  defaultLocale: "en",
  messages: {
    en: { "dlg.room.npc.hello": "Hello there." },
    es: { "dlg.room.npc.hello": "Hola." },
  },
};

describe("previewLocaleString", () => {
  it("resolves t(key) against the chosen locale catalog", () => {
    expect(
      previewLocaleString(i18n, "es", "dlg.room.npc.hello", "Hello there.")
    ).toBe("Hola.");
    expect(
      previewLocaleString(i18n, "en", "dlg.room.npc.hello", "Hello there.")
    ).toBe("Hello there.");
  });

  it("falls back when the key is missing in the locale", () => {
    expect(
      previewLocaleString(i18n, "es", "missing.key", "Fallback line")
    ).toBe("Fallback line");
  });

  it("reports when 2+ locales are available for the dropdown", () => {
    expect(localePreviewChoices(i18n)).toEqual(["en", "es"]);
    expect(hasLocalePreview(i18n)).toBe(true);
    expect(hasLocalePreview({ messages: { en: {} } })).toBe(false);
    expect(hasLocalePreview(undefined)).toBe(false);
  });
});
