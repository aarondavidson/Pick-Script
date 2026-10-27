import { describe, expect, it } from "vitest";
import { createEmptyJsonPack, createGameFromJson, parseJsonPack } from "./jsonPack";
import { flagsNeverSet } from "./flagIndex";
import { diagnosePack } from "./packDoctor";
import { sanitizeWinFlag, shouldCompleteGame } from "./winFlag";

describe("winFlag", () => {
  it("sanitizes the flag name", () => {
    expect(sanitizeWinFlag("  escaped ")).toBe("escaped");
    expect(sanitizeWinFlag("")).toBeUndefined();
    expect(sanitizeWinFlag("__proto__")).toBeUndefined();
    expect(sanitizeWinFlag(42)).toBeUndefined();
  });

  it("completes only once the flag is on", () => {
    const def = { winFlag: "escaped" };
    expect(shouldCompleteGame(def, { flags: {}, gameComplete: false })).toBe(false);
    expect(shouldCompleteGame(def, { flags: { escaped: true }, gameComplete: false })).toBe(true);
    expect(shouldCompleteGame(def, { flags: { escaped: true }, gameComplete: true })).toBe(false);
    expect(shouldCompleteGame({}, { flags: { escaped: true }, gameComplete: false })).toBe(false);
  });

  it("JSON packs carry winFlag into the game definition", () => {
    const doc = parseJsonPack({ ...createEmptyJsonPack({ id: "w" }), winFlag: " escaped " });
    expect(doc.winFlag).toBe("escaped");
    expect(createGameFromJson(doc).winFlag).toBe("escaped");
  });

  it("pack doctor flags a win flag nothing sets, and a pack with no ending", () => {
    const base = createEmptyJsonPack({ id: "w" });
    expect(flagsNeverSet({ ...base, winFlag: "escaped" })).toContain("escaped");
    expect(flagsNeverSet({ ...base, winFlag: "escaped", initialFlags: { escaped: false } })).not.toContain(
      "escaped"
    );
    const ids = (d: ReturnType<typeof diagnosePack>) => d.findings.map((f) => f.id);
    expect(ids(diagnosePack(base))).toContain("win:missing");
    expect(ids(diagnosePack({ ...base, winFlag: "escaped" }))).not.toContain("win:missing");
  });
});
