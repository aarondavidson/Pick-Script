import { describe, expect, it } from "vitest";
import {
  ENGINE_DOCUMENT_TITLE,
  ENGINE_LAYER_LOCKUP,
  ENGINE_UMBRELLA,
  PICK,
  SCRIPT,
  SCRIPT_CORE_FEATURE_STATUS,
  SCRIPT_POWERED_CREDIT,
} from "./branding";

describe("PICK / SCRIPT branding", () => {
  it("expands both acronyms", () => {
    expect(PICK.expansion).toMatch(/Point-and-Interactive Creation Kit/);
    expect(SCRIPT.expansion).toMatch(
      /Story Creation & Retro Interactive Puzzle Toolkit/
    );
    expect(ENGINE_UMBRELLA).toBe("Portable Adventure Engine");
  });

  it("exposes a hero lockup and document title with both layers", () => {
    expect(ENGINE_LAYER_LOCKUP).toBe("P.I.C.K. · S.C.R.I.P.T.");
    expect(ENGINE_DOCUMENT_TITLE).toContain("P.I.C.K.");
    expect(ENGINE_DOCUMENT_TITLE).toContain("S.C.R.I.P.T.");
    expect(SCRIPT_POWERED_CREDIT).toMatch(/Powered by S\.C\.R\.I\.P\.T\./);
  });

  it("marks all feedback core features as already covered", () => {
    expect(SCRIPT_CORE_FEATURE_STATUS).toHaveLength(5);
    expect(
      SCRIPT_CORE_FEATURE_STATUS.every((f) => f.status === "covered")
    ).toBe(true);
  });
});
