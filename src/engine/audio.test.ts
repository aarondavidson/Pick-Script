import { describe, expect, it } from "vitest";
import {
  isMusicFileBed,
  isMusicUrlString,
  resolveMusicCue,
  resolveMusicThemeRef,
  type PackAudio,
} from "./audio";

describe("PackAudio file beds", () => {
  it("detects file beds and URL strings", () => {
    expect(isMusicFileBed({ src: "/audio/loop.mp3" })).toBe(true);
    expect(isMusicFileBed({ preset: "noir" })).toBe(false);
    expect(isMusicUrlString("/audio/loop.mp3")).toBe(true);
    expect(isMusicUrlString("noir")).toBe(false);
  });

  it("resolves cue kinds", () => {
    const audio: PackAudio = {
      music: {
        docks: "noir",
        beacon: { src: "/audio/beacon.mp3", loop: true, gain: 0.7 },
        alley: "/audio/alley.mp3",
        office: { preset: "calm", mood: "calm" },
      },
    };
    expect(resolveMusicCue("docks", audio)).toEqual({
      kind: "synth",
      preset: "noir",
    });
    expect(resolveMusicCue("beacon", audio)).toMatchObject({
      kind: "file",
      src: "/audio/beacon.mp3",
      loop: true,
      gain: 0.7,
    });
    expect(resolveMusicCue("alley", audio).kind).toBe("file");
    expect(resolveMusicThemeRef("beacon", audio)).toBe("ambient");
    expect(resolveMusicThemeRef("office", audio)).toEqual({
      preset: "calm",
      mood: "calm",
    });
  });

  it("rejects unsafe file bed src and falls back to synth", () => {
    const audio: PackAudio = {
      music: {
        bad: { src: "javascript:alert(1)", fallbackPreset: "noir" },
      },
    };
    expect(resolveMusicCue("bad", audio)).toEqual({
      kind: "synth",
      preset: "noir",
    });
  });
});
