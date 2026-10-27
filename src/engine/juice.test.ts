import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  applyReducedMotion,
  cueFromPreset,
  juiceForSoundKey,
  resolveJuiceCue,
  sanitizeJuiceCue,
  setReduceMotionOverride,
  shakeTrauma,
} from "./juice";
import { runPackActions } from "./packActions";
import type { GameState } from "./types";

const emptyState = {
  inventory: [],
  flags: {},
  objectStates: {},
} as unknown as GameState;

describe("juice", () => {
  beforeEach(() => {
    setReduceMotionOverride(false);
  });
  afterEach(() => {
    setReduceMotionOverride(null);
  });

  it("maps sound keys to presets", () => {
    expect(juiceForSoundKey("pickup")).toBe("pickup");
    expect(juiceForSoundKey("success")).toBe("success");
    expect(juiceForSoundKey("creak")).toBe("medium");
  });

  it("sanitizes preset and partial cues", () => {
    expect(sanitizeJuiceCue("success")?.burst).toBe("stars");
    expect(sanitizeJuiceCue({ shake: "heavy", flash: "warm" })?.shake).toBe(
      "heavy"
    );
    expect(sanitizeJuiceCue({ preset: "pickup" })?.burst).toBe("pickup");
    expect(sanitizeJuiceCue({})).toBeUndefined();
  });

  it("applies reduced motion (no shake/burst)", () => {
    setReduceMotionOverride(true);
    const c = applyReducedMotion(cueFromPreset("heavy"));
    expect(c.shake).toBe("none");
    expect(c.burst).toBe("none");
    expect(c.hitStopMs).toBe(0);
    expect(c.flash).not.toBe("none");
  });

  it("resolveJuiceCue honors override", () => {
    setReduceMotionOverride(false);
    expect(resolveJuiceCue("medium")?.shake).toBe("medium");
    setReduceMotionOverride(true);
    expect(resolveJuiceCue("medium")?.shake).toBe("none");
  });

  it("shake trauma scales", () => {
    expect(shakeTrauma("none")).toBe(0);
    expect(shakeTrauma("heavy")).toBeGreaterThan(shakeTrauma("light"));
  });

  it("runPackActions collects juice cues", () => {
    const result = runPackActions(
      [
        { op: "juice", preset: "success" },
        { op: "haptic", style: "success" },
      ],
      emptyState
    );
    expect(result.juices.length).toBe(1);
    expect(result.juices[0].burst).toBe("stars");
    expect(result.haptics).toEqual(["success"]);
  });
});
