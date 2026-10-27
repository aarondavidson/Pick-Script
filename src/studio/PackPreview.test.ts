import { describe, expect, it } from "vitest";
import { createEmptyJsonPack } from "@/engine/jsonPack";
import { packPreviewFingerprint } from "./PackPreview";

describe("packPreviewFingerprint", () => {
  it("changes when hotspot is added", () => {
    const a = createEmptyJsonPack({ id: "p" });
    const b = {
      ...a,
      rooms: {
        ...a.rooms,
        start: {
          ...a.rooms.start,
          hotspots: [
            {
              id: "box",
              name: "Box",
              x: 1,
              y: 2,
              width: 3,
              height: 4,
              kind: "interact" as const,
            },
          ],
        },
      },
    };
    expect(packPreviewFingerprint(a)).not.toBe(packPreviewFingerprint(b));
  });

  it("ignores identical image content length for equality when unchanged", () => {
    const a = createEmptyJsonPack({ id: "p" });
    expect(packPreviewFingerprint(a)).toBe(packPreviewFingerprint({ ...a }));
  });
});
