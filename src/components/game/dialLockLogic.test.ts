import { describe, expect, it } from "vitest";
import {
  advanceDial,
  clampDialValue,
  dialLockMatches,
} from "./dialLockLogic";

describe("dialLockLogic", () => {
  it("advances and wraps within positions", () => {
    expect(advanceDial(0, 10)).toBe(1);
    expect(advanceDial(9, 10)).toBe(0);
    expect(advanceDial(3, 4)).toBe(0);
  });

  it("matches target combo", () => {
    expect(dialLockMatches([3, 7, 1], [3, 7, 1])).toBe(true);
    expect(dialLockMatches([3, 7, 0], [3, 7, 1])).toBe(false);
    expect(dialLockMatches([3, 7], [3, 7, 1])).toBe(false);
    expect(dialLockMatches([], [])).toBe(false);
  });

  it("clamps dial values into range", () => {
    expect(clampDialValue(12, 10)).toBe(2);
    expect(clampDialValue(-1, 10)).toBe(9);
  });
});
