import { describe, expect, it } from "vitest";
import { MAX_PALETTE_COLORS, parsePaletteText } from "./paletteParse";

describe("parsePaletteText", () => {
  it("reads a plain hex list (Lospec .hex)", () => {
    expect(parsePaletteText("000000\n1D2B53\n7e2553\n")).toEqual([
      "#000000",
      "#1d2b53",
      "#7e2553",
    ]);
  });

  it("reads #-prefixed, comma separated colors", () => {
    expect(parsePaletteText("#ff0044, #00ff00 #0000FF")).toEqual([
      "#ff0044",
      "#00ff00",
      "#0000ff",
    ]);
  });

  it("reads Paint.NET AARRGGBB with comments", () => {
    expect(parsePaletteText(";paint.net Palette File\nFF000000\nFFff0044")).toEqual([
      "#000000",
      "#ff0044",
    ]);
  });

  it("reads GIMP .gpl rows", () => {
    const gpl = "GIMP Palette\nName: Test\nColumns: 4\n#\n  0   0   0\tBlack\n255 0 68 Red\n";
    expect(parsePaletteText(gpl)).toEqual(["#000000", "#ff0044"]);
  });

  it("dedupes, ignores junk and caps the size", () => {
    expect(parsePaletteText("ff0044 ff0044 hello 12345 zzzzzz")).toEqual(["#ff0044"]);
    const many = Array.from({ length: 300 }, (_, i) => i.toString(16).padStart(6, "0")).join("\n");
    expect(parsePaletteText(many)).toHaveLength(MAX_PALETTE_COLORS);
  });
});
