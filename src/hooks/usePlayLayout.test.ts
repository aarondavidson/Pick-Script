import { describe, expect, it } from "vitest";
import { isPhoneLayout, resolvePlayLayout } from "./usePlayLayout";

describe("resolvePlayLayout", () => {
  it("treats a short landscape viewport as a sideways phone at any width", () => {
    expect(resolvePlayLayout(true, false)).toBe("phone-landscape");
    expect(resolvePlayLayout(true, true)).toBe("phone-landscape");
  });

  it("falls back to portrait phone, then desktop", () => {
    expect(resolvePlayLayout(false, true)).toBe("phone-portrait");
    expect(resolvePlayLayout(false, false)).toBe("desktop");
  });

  it("knows which layouts are touch-first", () => {
    expect(isPhoneLayout("phone-portrait")).toBe(true);
    expect(isPhoneLayout("phone-landscape")).toBe(true);
    expect(isPhoneLayout("desktop")).toBe(false);
    expect(isPhoneLayout("preview")).toBe(false);
  });
});
