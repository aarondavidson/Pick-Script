import { describe, expect, it } from "vitest";
import {
  MAX_MOUTH_CUES,
  parseRhubarbMouthCues,
  sanitizeMouthShape,
} from "@/studio/rhubarbImport";

describe("parseRhubarbMouthCues", () => {
  it("maps Rhubarb value → shape and sanitizes A–F/X", () => {
    const cues = parseRhubarbMouthCues({
      mouthCues: [
        { t: 0, value: "X" },
        { t: 0.05, value: "B" },
        { t: 0.12, value: "c" },
        { t: 0.4, value: "Z" },
        { t: 0.55, value: "" },
      ],
    });
    expect(cues).toEqual([
      { t: 0, shape: "X" },
      { t: 0.05, shape: "B" },
      { t: 0.12, shape: "C" },
      { t: 0.4, shape: "X" },
      { t: 0.55, shape: "X" },
    ]);
  });

  it("accepts shape alias and JSON string input", () => {
    const cues = parseRhubarbMouthCues(
      JSON.stringify({
        mouthCues: [
          { t: 0, shape: "A" },
          { t: 0.1, shape: "F" },
        ],
      })
    );
    expect(cues).toEqual([
      { t: 0, shape: "A" },
      { t: 0.1, shape: "F" },
    ]);
  });

  it("prefers value over shape when both present", () => {
    expect(
      parseRhubarbMouthCues({
        mouthCues: [{ t: 0, value: "D", shape: "A" }],
      })
    ).toEqual([{ t: 0, shape: "D" }]);
  });

  it("drops invalid rows and caps at MAX_MOUTH_CUES", () => {
    const many = Array.from({ length: MAX_MOUTH_CUES + 10 }, (_, i) => ({
      t: i * 0.01,
      value: "B",
    }));
    const cues = parseRhubarbMouthCues({
      mouthCues: [
        { t: -1, value: "A" },
        { t: NaN, value: "A" },
        null,
        "nope",
        ...many,
      ],
    });
    expect(cues).toHaveLength(MAX_MOUTH_CUES);
    expect(cues[0]).toEqual({ t: 0, shape: "B" });
  });

  it("returns [] for missing/invalid input", () => {
    expect(parseRhubarbMouthCues(null)).toEqual([]);
    expect(parseRhubarbMouthCues({})).toEqual([]);
    expect(parseRhubarbMouthCues("{not json")).toEqual([]);
    expect(parseRhubarbMouthCues({ mouthCues: "x" })).toEqual([]);
  });
});

describe("sanitizeMouthShape", () => {
  it("normalizes to A–F/X", () => {
    expect(sanitizeMouthShape("a")).toBe("A");
    expect(sanitizeMouthShape("X")).toBe("X");
    expect(sanitizeMouthShape("Q")).toBe("X");
    expect(sanitizeMouthShape(null)).toBe("X");
  });
});
