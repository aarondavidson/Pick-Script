import { describe, expect, it } from "vitest";
import { sceneAnimClassName } from "./useFrameCycle";

describe("sceneAnimClassName", () => {
  it("maps built-in presets", () => {
    expect(sceneAnimClassName("twinkle")).toBe("scene-anim-twinkle");
    expect(sceneAnimClassName("bob")).toBe("scene-anim-bob");
    expect(sceneAnimClassName("Flicker")).toBe("scene-anim-flicker");
  });

  it("rejects unsafe class tokens", () => {
    expect(sceneAnimClassName("foo bar")).toBe("");
    expect(sceneAnimClassName("../x")).toBe("");
    expect(sceneAnimClassName("")).toBe("");
  });

  it("allows custom safe tokens", () => {
    expect(sceneAnimClassName("lantern_glow")).toBe("scene-anim-lantern_glow");
  });
});
