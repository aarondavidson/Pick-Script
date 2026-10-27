import { describe, expect, it } from "vitest";
import {
  isBitmapCostume,
  normalizeFacing,
  pickFacingSheet,
  resolveActorCostumeUrl,
} from "./actorArt";

const PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const PNG_WALK =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
const PNG_LEFT =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYGBgAAAABQABh6FO1AAAAABJRU5ErkJggg==";
const PNG_RIGHT =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==";
const PNG_UP =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEhgJ/l+lQZQAAAABJRU5ErkJggg==";
const PNG_DOWN =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";

describe("actorArt", () => {
  it("detects bitmap costumes", () => {
    expect(isBitmapCostume("actor-ego")).toBe(false);
    expect(isBitmapCostume(PNG)).toBe(true);
    expect(isBitmapCostume("/assets/hero.png")).toBe(true);
  });

  it("normalizes compass aliases", () => {
    expect(normalizeFacing("n")).toBe("up");
    expect(normalizeFacing("s")).toBe("down");
    expect(normalizeFacing("e")).toBe("right");
    expect(normalizeFacing("w")).toBe("left");
  });

  it("prefers anim-state bitmap over default sprite", () => {
    const r = resolveActorCostumeUrl({
      sprite: PNG,
      animations: { walk: PNG_WALK },
      animState: "walk",
      fallbackClass: "actor-ego",
    });
    expect(r).toEqual({ kind: "bitmap", url: PNG_WALK, flipX: false });
  });

  it("falls back to CSS class", () => {
    const r = resolveActorCostumeUrl({
      sprite: "actor-ego",
      fallbackClass: "actor-npc",
    });
    expect(r).toEqual({ kind: "css", className: "actor-ego", flipX: false });
  });

  it("picks facing sheet by animState × facing", () => {
    const r = resolveActorCostumeUrl({
      animations: {
        walk: {
          left: PNG_LEFT,
          right: PNG_RIGHT,
          up: PNG_UP,
          down: PNG_DOWN,
        },
      },
      animState: "walk",
      facing: "up",
      fallbackClass: "actor-ego",
    });
    expect(r).toEqual({ kind: "bitmap", url: PNG_UP, flipX: false });
  });

  it("accepts N/S/E/W aliases on sheets", () => {
    const r = resolveActorCostumeUrl({
      animations: {
        idle: { n: PNG_UP, s: PNG_DOWN, e: PNG_RIGHT, w: PNG_LEFT },
      },
      animState: "idle",
      facing: "left",
      fallbackClass: "actor-ego",
    });
    expect(r).toEqual({ kind: "bitmap", url: PNG_LEFT, flipX: false });
  });

  it("flips scaleX when only a right sheet exists and facing left", () => {
    const r = resolveActorCostumeUrl({
      animations: { walk: { right: PNG_RIGHT } },
      animState: "walk",
      facing: "left",
      fallbackClass: "actor-ego",
    });
    expect(r).toEqual({ kind: "bitmap", url: PNG_RIGHT, flipX: true });
  });

  it("flips single-sheet costumes when facing left", () => {
    const r = resolveActorCostumeUrl({
      sprite: PNG,
      facing: "left",
      fallbackClass: "actor-ego",
    });
    expect(r).toEqual({ kind: "bitmap", url: PNG, flipX: true });
  });

  it("pickFacingSheet flips L/R-only for missing side", () => {
    expect(pickFacingSheet({ right: PNG_RIGHT }, "left")).toEqual({
      value: PNG_RIGHT,
      flipX: true,
    });
    expect(pickFacingSheet({ left: PNG_LEFT, right: PNG_RIGHT }, "left")).toEqual({
      value: PNG_LEFT,
      flipX: false,
    });
  });
});
