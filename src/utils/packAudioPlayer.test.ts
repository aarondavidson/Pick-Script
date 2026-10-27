import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Unit tests for packAudioPlayer stop/channel bookkeeping.
 * Web Audio decode is stubbed — we only verify API shape + stop filters
 * when AudioContext is unavailable in Node (graceful no-ops).
 */

describe("packAudioPlayer", () => {
  beforeEach(async () => {
    vi.resetModules();
  });

  it("exposes volume + stop API", async () => {
    const { packAudioPlayer } = await import("./packAudioPlayer");
    packAudioPlayer.setVolume(0.5);
    expect(packAudioPlayer.getVolume()).toBe(0.5);
    packAudioPlayer.setVolume(2);
    expect(packAudioPlayer.getVolume()).toBe(1);
    packAudioPlayer.setMusicVolume(0.4);
    expect(packAudioPlayer.getMusicVolume()).toBe(0.4);
    packAudioPlayer.setMusicDuckFactor(0.28);
    packAudioPlayer.setMusicDuckFactor(1);
    packAudioPlayer.stopAll();
    expect(packAudioPlayer.activeCount()).toBe(0);
  });

  it("play returns null for empty url without throwing", async () => {
    const { packAudioPlayer } = await import("./packAudioPlayer");
    const id = await packAudioPlayer.play("");
    expect(id).toBeNull();
    const id2 = await packAudioPlayer.play("   ");
    expect(id2).toBeNull();
  });

  it("stop with filters does not throw when idle", async () => {
    const { packAudioPlayer } = await import("./packAudioPlayer");
    expect(() =>
      packAudioPlayer.stop({ key: "pickup", channel: "ui" })
    ).not.toThrow();
    expect(() => packAudioPlayer.stop({ channel: "ambient" })).not.toThrow();
    expect(() => packAudioPlayer.stop({ key: "missing" })).not.toThrow();
  });
});

describe("AmbientMusicEngine duck + ambient volume", () => {
  it("setDuckFactor and setVolume exist and are callable", async () => {
    const { AmbientMusicEngine, MUSIC_PRESETS } = await import(
      "./musicEngine"
    );
    const engine = new AmbientMusicEngine(MUSIC_PRESETS.noir);
    // Don't start() — no AudioContext required for method presence
    expect(typeof engine.setVolume).toBe("function");
    expect(typeof engine.setDuckFactor).toBe("function");
    expect(() => engine.setVolume(0.4)).not.toThrow();
    expect(() => engine.setDuckFactor(0.3)).not.toThrow();
    expect(() => engine.setDuckFactor(1)).not.toThrow();
  });
});
