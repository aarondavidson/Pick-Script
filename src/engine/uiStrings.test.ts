import { afterEach, describe, expect, it } from "vitest";
import {
  UI_STRINGS_EN,
  registerUiStrings,
  setActiveUiLocale,
  translateUi,
  uiStringsCsv,
  uiText,
  uiTextOr,
} from "./uiStrings";
import { formatSentence } from "./sentence";

afterEach(() => setActiveUiLocale("en", {}));

describe("interface strings", () => {
  it("falls back to English and fills placeholders", () => {
    expect(uiText("ui.exits.title")).toBe("Exits");
    expect(uiText("ui.save.saved_slot_ok", { slot: 2 })).toBe(
      "Game saved to slot 2!"
    );
    // unknown placeholder is left visible rather than silently dropped
    expect(uiText("ui.save.saved_slot_ok")).toContain("{slot}");
  });

  it("a pack catalog translates the interface for its locale", () => {
    setActiveUiLocale("es", {
      "ui.exits.title": "Salidas",
      "ui.msg.achievement": "¡Logro desbloqueado: {title}!",
    });
    expect(uiText("ui.exits.title")).toBe("Salidas");
    expect(uiText("ui.msg.achievement", { title: "Llave" })).toBe(
      "¡Logro desbloqueado: Llave!"
    );
    expect(uiText("ui.menu.journal")).toBe("Journal"); // untranslated → English
  });

  it("host-registered tables apply, including for regional locales", () => {
    registerUiStrings("de", { "ui.common.cancel": "Abbrechen" });
    expect(translateUi("ui.common.cancel", { locale: "de-AT" })).toBe("Abbrechen");
    expect(translateUi("ui.common.cancel", { locale: "fr" })).toBe("Cancel");
    // the pack still wins over the host table
    expect(
      translateUi("ui.common.cancel", {
        locale: "de",
        catalog: { "ui.common.cancel": "Zurück" },
      })
    ).toBe("Zurück");
  });

  it("an author's own verb label beats the English default but not a translation", () => {
    expect(uiTextOr("ui.verb.look", "Examine")).toBe("Examine");
    setActiveUiLocale("es", { "ui.verb.look": "Mirar" });
    expect(uiTextOr("ui.verb.look", "Examine")).toBe("Mirar");
    expect(uiTextOr("custom.key", "Fallback")).toBe("Fallback");
  });

  it("sentence wording and word order are translatable", () => {
    const item = { id: "key", name: "Key", description: "" };
    expect(formatSentence({ verb: "look", item: null, targetName: "Door" })).toBe(
      "Look at Door"
    );
    expect(formatSentence({ verb: "use", item, targetName: "Door" })).toBe(
      "Use Key with Door"
    );
    setActiveUiLocale("de", {
      "ui.verb.look": "ansehen",
      "ui.sentence.verb_target": "{target} {verb}",
      "ui.sentence.use_with": "{item} mit {target} benutzen",
    });
    expect(formatSentence({ verb: "look", item: null, targetName: "Tür" })).toBe(
      "Tür ansehen"
    );
    expect(formatSentence({ verb: "use", item, targetName: "Tür" })).toBe(
      "Key mit Tür benutzen"
    );
  });

  it("every key is namespaced, non-empty and exported for translators", () => {
    const keys = Object.keys(UI_STRINGS_EN);
    expect(keys.length).toBeGreaterThan(150);
    for (const k of keys) {
      expect(k.startsWith("ui.")).toBe(true);
      expect(UI_STRINGS_EN[k as keyof typeof UI_STRINGS_EN].length).toBeGreaterThan(0);
    }
    const csv = uiStringsCsv().split("\n");
    expect(csv[0]).toBe("key,en");
    expect(csv.length).toBe(keys.length + 1);
  });
});
