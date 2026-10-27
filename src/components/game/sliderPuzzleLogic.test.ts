import { describe, expect, it } from "vitest";
import { rotateSegmentAt, sliderPuzzleMatches } from "./sliderPuzzleLogic";

describe("sliderPuzzleLogic", () => {
  it("swaps a segment with the next slot", () => {
    expect(rotateSegmentAt(["a", "b", "c"], 0)).toEqual(["b", "a", "c"]);
    expect(rotateSegmentAt(["a", "b", "c"], 2)).toEqual(["c", "b", "a"]);
  });

  it("wraps negative and oversized indexes", () => {
    expect(rotateSegmentAt(["a", "b", "c"], -1)).toEqual(["c", "b", "a"]);
    expect(rotateSegmentAt(["a", "b", "c"], 3)).toEqual(["b", "a", "c"]);
  });

  it("leaves short orders alone", () => {
    expect(rotateSegmentAt(["a"], 0)).toEqual(["a"]);
    expect(rotateSegmentAt([], 0)).toEqual([]);
  });

  it("matches target order", () => {
    expect(sliderPuzzleMatches(["a", "b", "c"], ["a", "b", "c"])).toBe(true);
    expect(sliderPuzzleMatches(["a", "c", "b"], ["a", "b", "c"])).toBe(false);
    expect(sliderPuzzleMatches(["a", "b"], ["a", "b", "c"])).toBe(false);
  });
});
