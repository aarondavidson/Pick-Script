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

describe("voice clips", () => {
  it("resolves a translated recording before the default one", async () => {
    const { resolveVoiceUrl } = await import("./audio");
    const audio = {
      voice: {
        "voice.a.b.hi": "/v/hi.mp3",
        "voice.a.b.hi@es": "/v/hi.es.mp3",
        "voice.a.b.hi@pt": "/v/hi.pt.mp3",
      },
    };
    expect(resolveVoiceUrl(audio, "voice.a.b.hi")).toBe("/v/hi.mp3");
    expect(resolveVoiceUrl(audio, "voice.a.b.hi", "es")).toBe("/v/hi.es.mp3");
    expect(resolveVoiceUrl(audio, "voice.a.b.hi", "pt-BR")).toBe("/v/hi.pt.mp3");
    expect(resolveVoiceUrl(audio, "voice.a.b.hi", "fr")).toBe("/v/hi.mp3");
    expect(resolveVoiceUrl(audio, "voice.missing", "es")).toBeUndefined();
    expect(resolveVoiceUrl(audio, "__proto__")).toBeUndefined();
    expect(resolveVoiceUrl(undefined, "voice.a.b.hi")).toBeUndefined();
  });

  it("accepts small inline audio and rejects other data URLs", async () => {
    const { isSafeAudioUrl } = await import("./security");
    expect(isSafeAudioUrl("data:audio/mpeg;base64,SUQzAAAA")).toBe(true);
    expect(isSafeAudioUrl("https://cdn.example.com/a.ogg")).toBe(true);
    expect(isSafeAudioUrl("/assets/a.mp3")).toBe(true);
    expect(isSafeAudioUrl("data:text/html;base64,PGI+")).toBe(false);
    expect(isSafeAudioUrl("data:audio/mpeg;base64,<script>")).toBe(false);
    expect(isSafeAudioUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeAudioUrl(`data:audio/mpeg;base64,${"A".repeat(2_200_000)}`)).toBe(false);
  });

  it("keeps inline voice clips when a JSON pack is compiled", async () => {
    const { createEmptyJsonPack, createGameFromJson } = await import("./jsonPack");
    const def = createGameFromJson({
      ...createEmptyJsonPack({ id: "voiced", title: "Voiced" }),
      audio: {
        voice: {
          "voice.start.npc.hi": "data:audio/mpeg;base64,SUQzAAAA",
          "voice.bad": "data:text/html;base64,PGI+",
        },
      },
    });
    expect(def.audio?.voice).toEqual({
      "voice.start.npc.hi": "data:audio/mpeg;base64,SUQzAAAA",
    });
  });
});
