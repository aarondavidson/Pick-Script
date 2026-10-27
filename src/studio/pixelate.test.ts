import { describe, expect, it } from "vitest";
import {
  ASSET_PRESETS,
  DEFAULT_GAME_PALETTE,
  parseHex,
  type AssetPresetId,
} from "./pixelate";

describe("parseHex", () => {
  it("parses 6-digit hex", () => {
    expect(parseHex("#ff0000")).toEqual([255, 0, 0]);
    expect(parseHex("00ff00")).toEqual([0, 255, 0]);
  });

  it("parses 3-digit hex", () => {
    expect(parseHex("#f0a")).toEqual([255, 0, 170]);
  });
});

describe("ASSET_PRESETS", () => {
  const ids = Object.keys(ASSET_PRESETS) as AssetPresetId[];

  it("covers room, item, portrait, character, comic", () => {
    expect(ids.sort()).toEqual(
      ["character", "comic", "item", "portrait", "room"].sort()
    );
  });

  it("character targets ASSETS.md standing figure size", () => {
    expect(ASSET_PRESETS.character.outputWidth).toBe(128);
    expect(ASSET_PRESETS.character.outputHeight).toBe(192);
    expect(ASSET_PRESETS.character.mime).toBe("image/png");
    expect(ASSET_PRESETS.character.removeBg).toBe(true);
  });

  it("room targets ASSETS.md 1920×1080", () => {
    expect(ASSET_PRESETS.room.outputWidth).toBe(1920);
    expect(ASSET_PRESETS.room.outputHeight).toBe(1080);
    expect(ASSET_PRESETS.room.mime).toBe("image/jpeg");
  });

  it("item targets 256×256 PNG with removeBg", () => {
    expect(ASSET_PRESETS.item.outputWidth).toBe(256);
    expect(ASSET_PRESETS.item.outputHeight).toBe(256);
    expect(ASSET_PRESETS.item.mime).toBe("image/png");
    expect(ASSET_PRESETS.item.removeBg).toBe(true);
  });

  it("every preset has positive generate + pixel sizes", () => {
    for (const id of ids) {
      const p = ASSET_PRESETS[id];
      expect(p.genWidth).toBeGreaterThan(0);
      expect(p.genHeight).toBeGreaterThan(0);
      expect(p.pixelWidth).toBeGreaterThan(0);
      expect(p.outputWidth).toBeGreaterThanOrEqual(p.pixelWidth);
      expect(p.outputHeight).toBeGreaterThan(0);
      expect(p.filename.length).toBeGreaterThan(0);
      expect(p.style.length).toBeGreaterThan(0);
    }
  });
});

describe("DEFAULT_GAME_PALETTE", () => {
  it("has unique parseable colors", () => {
    expect(DEFAULT_GAME_PALETTE.length).toBeGreaterThanOrEqual(8);
    const seen = new Set(DEFAULT_GAME_PALETTE.map((c) => parseHex(c).join(",")));
    expect(seen.size).toBe(DEFAULT_GAME_PALETTE.length);
  });
});
