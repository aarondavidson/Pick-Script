import { describe, expect, it } from "vitest";
import {
  isWireMatch,
  shuffleIds,
  wireMatchComplete,
  wirePairMap,
} from "./wireMatchLogic";

describe("wireMatchLogic", () => {
  const pairs = wirePairMap([
    { left: "a", right: "1" },
    { left: "b", right: "2" },
    { left: "c", right: "3" },
  ]);

  it("maps pairs and checks matches", () => {
    expect(pairs.a).toBe("1");
    expect(isWireMatch("a", "1", pairs)).toBe(true);
    expect(isWireMatch("a", "2", pairs)).toBe(false);
  });

  it("reports complete only when all left terminals matched", () => {
    const left = ["a", "b", "c"];
    expect(wireMatchComplete(new Set(["a", "b"]), left)).toBe(false);
    expect(wireMatchComplete(new Set(["a", "b", "c"]), left)).toBe(true);
    expect(wireMatchComplete(new Set(), [])).toBe(false);
  });

  it("shuffles deterministically with a fixed rng", () => {
    let i = 0;
    const seq = [0.9, 0.1, 0.5, 0.2, 0.8, 0.3];
    const rng = () => seq[i++ % seq.length]!;
    const a = shuffleIds(["a", "b", "c"], rng);
    expect(a).toHaveLength(3);
    expect(new Set(a)).toEqual(new Set(["a", "b", "c"]));
  });
});
