import { describe, expect, it } from "vitest";
import {
  PIXEL_LIBRARIES,
  pixelLibrariesForTag,
  pixelLibraryGalleries,
} from "@/studio/pixelLibraries";

describe("pixelLibraries", () => {
  it("lists curated CC0-friendly libraries with urls", () => {
    expect(PIXEL_LIBRARIES.length).toBeGreaterThanOrEqual(12);
    for (const lib of PIXEL_LIBRARIES) {
      expect(lib.url).toMatch(/^https:\/\//);
      expect(lib.license.length).toBeGreaterThan(0);
      expect(lib.goodFor.length).toBeGreaterThan(0);
    }
  });

  it("exposes browseable gallery hubs", () => {
    const galleries = pixelLibraryGalleries();
    expect(galleries.length).toBeGreaterThanOrEqual(5);
    expect(galleries.some((g) => g.id === "itch-cc0-pixel")).toBe(true);
    expect(galleries.some((g) => g.id === "opengameart")).toBe(true);
  });

  it("filters by tag", () => {
    const rooms = pixelLibrariesForTag("rooms");
    expect(rooms.length).toBeGreaterThan(0);
  });
});
