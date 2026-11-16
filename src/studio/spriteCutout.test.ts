import { describe, expect, it } from "vitest";
import { cutoutSpriteBackground } from "./spriteCutout";

type Rgba = [number, number, number, number];

/** Build an RGBA image from a per-pixel painter. */
function paint(
  w: number,
  h: number,
  fn: (x: number, y: number) => Rgba
): Uint8ClampedArray {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) data.set(fn(x, y), (y * w + x) * 4);
  }
  return data;
}

const W = 40;
const H = 60;
/** A dark "character" block in the middle, with a gap between the legs */
const inFigure = (x: number, y: number) =>
  x >= 14 && x < 26 && y >= 12 && y < 52 && !(x >= 18 && x < 22 && y >= 40);
const FIGURE: Rgba = [20, 40, 45, 255];
const alphaAt = (d: Uint8ClampedArray, x: number, y: number) =>
  d[(y * W + x) * 4 + 3];

describe("cutoutSpriteBackground", () => {
  it("removes a flat colour background and keeps the figure", () => {
    const src = paint(W, H, (x, y) =>
      inFigure(x, y) ? FIGURE : [255, 0, 255, 255]
    );
    const r = cutoutSpriteBackground(src, W, H);
    expect(r.outcome).toBe("removed");
    expect(alphaAt(r.data, 0, 0)).toBe(0);
    expect(alphaAt(r.data, 20, 20)).toBe(255);
  });

  it("removes a checkerboard with black letterbox bars without eating dark clothing", () => {
    const src = paint(W, H, (x, y) => {
      if (y < 4 || y >= H - 4) return [0, 0, 0, 255];
      if (inFigure(x, y)) return FIGURE;
      const light = (Math.floor(x / 4) + Math.floor(y / 4)) % 2 === 0;
      return light ? [255, 255, 255, 255] : [204, 204, 204, 255];
    });
    const r = cutoutSpriteBackground(src, W, H);
    expect(r.outcome).toBe("removed");
    expect(alphaAt(r.data, 5, 1)).toBe(0); // bar
    expect(alphaAt(r.data, 2, 30)).toBe(0); // checker
    expect(alphaAt(r.data, 20, 45)).toBe(0); // enclosed gap between legs
    expect(alphaAt(r.data, 20, 20)).toBe(255); // dark coat survives
    expect(alphaAt(r.data, 15, 48)).toBe(255); // leg survives
  });

  it("leaves images that already have transparency alone", () => {
    const src = paint(W, H, (x, y) => (inFigure(x, y) ? FIGURE : [0, 0, 0, 0]));
    const r = cutoutSpriteBackground(src, W, H);
    expect(r.outcome).toBe("already-transparent");
    expect(r.changed).toBe(false);
    expect([...r.data]).toEqual([...src]);
  });

  it("refuses a busy background instead of damaging the image", () => {
    let seed = 7;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed % 256;
    };
    const src = paint(W, H, () => [rand(), rand(), rand(), 255]);
    const r = cutoutSpriteBackground(src, W, H);
    expect(r.outcome).toBe("no-simple-background");
    expect(r.changed).toBe(false);
    expect([...r.data]).toEqual([...src]);
  });

  it("refuses when the whole image is one colour", () => {
    const src = paint(W, H, () => [10, 200, 10, 255]);
    expect(cutoutSpriteBackground(src, W, H).changed).toBe(false);
  });
});
