import { describe, expect, it } from "vitest";
import { createEmptyJsonPack, validateJsonPack } from "./jsonPack";
import {
  lintDeadItemRefs,
  lintSilentHotspots,
  lintTinyHotspots,
} from "./packLint";

describe("packLint", () => {
  it("flags silent hotspots", () => {
    const doc = createEmptyJsonPack({
      rooms: {
        start: {
          id: "start",
          name: "Start",
          image: "https://example.com/r.jpg",
          hotspots: [
            {
              id: "prop",
              name: "Prop",
              x: 10,
              y: 10,
              width: 12,
              height: 12,
            },
          ],
        },
      },
    });
    const msgs = lintSilentHotspots(doc);
    expect(msgs.some((m) => m.includes("will do nothing"))).toBe(true);
  });

  it("flags dead use-with item refs", () => {
    const doc = createEmptyJsonPack({
      rooms: {
        start: {
          id: "start",
          name: "Start",
          image: "https://example.com/r.jpg",
          hotspots: [
            {
              id: "lock",
              name: "Lock",
              x: 10,
              y: 10,
              width: 12,
              height: 12,
              lookText: "A lock.",
              useWith: [{ itemId: "missing_key", message: "Click." }],
            },
          ],
        },
      },
    });
    const msgs = lintDeadItemRefs(doc);
    expect(msgs.some((m) => m.includes("unknown item"))).toBe(true);
  });

  it("flags tiny hotspots", () => {
    const doc = createEmptyJsonPack({
      rooms: {
        start: {
          id: "start",
          name: "Start",
          image: "https://example.com/r.jpg",
          hotspots: [
            {
              id: "pixel",
              name: "Pixel",
              x: 1,
              y: 1,
              width: 2,
              height: 2,
              lookText: "Tiny.",
            },
          ],
        },
      },
    });
    expect(lintTinyHotspots(doc)[0]).toMatch(/under 4%/);
    const v = validateJsonPack(doc);
    expect(v.ok).toBe(true);
    expect(v.warnings.some((w) => /under 4%/.test(w))).toBe(true);
  });
});

describe("lintBoxedCharacterSprites", () => {
  it("flags JPEG walk sprites and accepts PNG / CSS stand-ins", async () => {
    const { lintBoxedCharacterSprites, isOpaqueOnlyImageUrl } = await import(
      "./packLint"
    );
    const { createEmptyJsonPack } = await import("./jsonPack");
    expect(isOpaqueOnlyImageUrl("data:image/jpeg;base64,xx")).toBe(true);
    expect(isOpaqueOnlyImageUrl("/assets/hero.JPG?v=2")).toBe(true);
    expect(isOpaqueOnlyImageUrl("data:image/png;base64,xx")).toBe(false);
    expect(isOpaqueOnlyImageUrl("actor-ego")).toBe(false);
    const doc = {
      ...createEmptyJsonPack({ id: "boxed", title: "Boxed" }),
      actors: {
        player: { sprite: "data:image/jpeg;base64,xx" },
        cat: { sprite: "data:image/png;base64,xx" },
      },
    };
    const warnings = lintBoxedCharacterSprites(doc);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('actor "player"');
  });
});
