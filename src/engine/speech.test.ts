import { describe, expect, it } from "vitest";
import {
  IDLE_MOUTH_SHAPE,
  getMouthShapeAt,
  mouthShapeClass,
} from "./speech";

describe("getMouthShapeAt", () => {
  const cues = [
    { t: 0, shape: "X" },
    { t: 0.05, shape: "B" },
    { t: 0.12, shape: "C" },
    { t: 0.4, shape: "A" },
    { t: 0.55, shape: "X" },
  ];

  it("returns idle when cues missing or reduced motion", () => {
    expect(getMouthShapeAt(undefined, 100)).toBe(IDLE_MOUTH_SHAPE);
    expect(getMouthShapeAt([], 100)).toBe(IDLE_MOUTH_SHAPE);
    expect(getMouthShapeAt(cues, 100, { reducedMotion: true })).toBe(
      IDLE_MOUTH_SHAPE
    );
  });

  it("picks the latest cue at or before elapsed time", () => {
    expect(getMouthShapeAt(cues, 0)).toBe("X");
    expect(getMouthShapeAt(cues, 60)).toBe("B");
    expect(getMouthShapeAt(cues, 120)).toBe("C");
    expect(getMouthShapeAt(cues, 400)).toBe("A");
    expect(getMouthShapeAt(cues, 550)).toBe("X");
    expect(getMouthShapeAt(cues, 900)).toBe("X");
  });

  it("tolerates unsorted cues", () => {
    const unsorted = [
      { t: 0.2, shape: "D" },
      { t: 0, shape: "B" },
      { t: 0.1, shape: "C" },
    ];
    expect(getMouthShapeAt(unsorted, 150)).toBe("C");
    expect(getMouthShapeAt(unsorted, 250)).toBe("D");
  });

  it("honors custom idle and normalizes empty shape", () => {
    expect(getMouthShapeAt([{ t: 0, shape: "" }], 10, { idle: "Z" })).toBe(
      "Z"
    );
  });
});

describe("mouthShapeClass", () => {
  it("maps Rhubarb letters to CSS classes", () => {
    expect(mouthShapeClass("A")).toBe("mouth-shape-a");
    expect(mouthShapeClass("x")).toBe("mouth-shape-x");
    expect(mouthShapeClass("???")).toBe("mouth-shape-x");
  });
});
