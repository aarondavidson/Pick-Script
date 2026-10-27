import { describe, expect, it } from "vitest";
import {
  linkValidationResult,
  recipeHref,
  recipesGalleryHref,
  studioTabHref,
} from "./validationHelp";

describe("linkValidationResult", () => {
  it("links pickup itemId errors to hotspots + get-item recipe", () => {
    const r = linkValidationResult({
      ok: false,
      errors: ['pickup hotspot "start/key" missing itemId'],
      warnings: [],
    });
    expect(r.issues[0].studioTab).toBe("hotspots");
    expect(r.issues[0].recipeId).toBe("get-item");
    expect(recipeHref("get-item")).toBe("/pick/recipes#recipe-get-item");
    expect(studioTabHref("hotspots")).toBe("/pick?tab=hotspots");
  });

  it("links unknown exit rooms to pack + locked-exit", () => {
    const r = linkValidationResult({
      ok: false,
      errors: ['link from unknown room "kitchen"'],
      warnings: ['room "a" has no image (placeholder will be used)'],
    });
    expect(r.issues[0].recipeId).toBe("locked-exit");
    expect(r.issues[0].studioTab).toBe("pack");
    expect(r.issues[1].studioTab).toBe("pixels");
  });
});

describe("studio deep links", () => {
  it("builds /pick tab + send query params", () => {
    expect(studioTabHref("pack")).toBe("/pick");
    expect(studioTabHref("pixels", { send: "room" })).toBe(
      "/pick?tab=pixels&send=room"
    );
    expect(recipesGalleryHref()).toBe("/pick/recipes");
  });
});

