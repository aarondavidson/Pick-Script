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
