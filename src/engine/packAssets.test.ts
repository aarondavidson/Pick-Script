import { describe, expect, it, vi } from "vitest";
import { createEmptyJsonPack, createGameFromJson } from "./jsonPack";
import {
  collectRoomMediaUrls,
  externalizePackAssets,
  fetchJsonPack,
  isRelativePackAsset,
  listRelativePackAssets,
  neighbourRoomIds,
  resolvePackAssetUrls,
} from "./packAssets";

const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const GIF = "data:image/gif;base64,R0lGODlhAQABAAAAACw=";

function inlinePack() {
  return {
    ...createEmptyJsonPack({
      id: "big-game",
      title: "Big",
      rooms: {
        start: { id: "start", name: "Start", image: PNG, hotspots: [] },
        hall: { id: "hall", name: "Hall", image: PNG, hotspots: [] },
      },
      items: { key: { id: "key", name: "Key", description: "k", icon: GIF } },
      links: [{ from: "start", to: "hall", direction: "north", fromLabel: "Hall", toLabel: "Back" }],
    }),
    actors: { player: { sprite: GIF } },
  };
}

describe("externalizePackAssets", () => {
  it("moves inline media to files, de-duplicated, and shrinks the JSON", () => {
    const pack = inlinePack();
    const out = externalizePackAssets(pack);
    const paths = Object.keys(out.files);
    expect(paths).toHaveLength(2); // PNG reused by both rooms, GIF by item + actor
    expect(paths.every((p) => isRelativePackAsset(p))).toBe(true);
    expect(out.doc.rooms.start.image).toBe(out.doc.rooms.hall.image);
    expect(out.doc.rooms.start.image).toMatch(/^assets\/.+\.png$/);
    expect(JSON.stringify(out.doc)).not.toContain("data:image");
    expect(out.files[paths[0]].length).toBeGreaterThan(10);
    expect(pack.rooms.start.image).toBe(PNG); // input untouched
    expect(listRelativePackAssets(out.doc)).toEqual([...paths].sort());
  });

  it("round-trips: externalize → resolve → compiles to a playable game", () => {
    const out = externalizePackAssets(inlinePack());
    const resolved = resolvePackAssetUrls(
      out.doc,
      "https://cdn.example.com/games/big/pack.json?v=3"
    );
    expect(resolved.rooms.start.image).toMatch(
      /^https:\/\/cdn\.example\.com\/games\/big\/assets\/.+\.png$/
    );
    const def = createGameFromJson(resolved);
    expect(def.rooms.start.image).toBe(resolved.rooms.start.image);
    expect(def.itemIcons?.key).toMatch(/\/assets\/.+\.gif$/);
  });
});

describe("resolvePackAssetUrls", () => {
  it("resolves against site paths and leaves everything else alone", () => {
    const doc = {
      a: "assets/room.png",
      b: "./assets/sfx/door.mp3",
      c: "assets/../../etc/passwd.png",
      d: "Look at the assets/room.png sign",
      e: "https://example.com/x.png",
      f: "assets/notes.txt",
    };
    const out = resolvePackAssetUrls(doc, "/packs/demo/pack.json");
    expect(out.a).toBe("/packs/demo/assets/room.png");
    expect(out.b).toBe("/packs/demo/assets/sfx/door.mp3");
    expect(out.c).toBe(doc.c);
    expect(out.d).toBe(doc.d);
    expect(out.e).toBe(doc.e);
    expect(out.f).toBe(doc.f);
  });
});

describe("fetchJsonPack", () => {
  it("fetches, resolves assets and parses", async () => {
    const hosted = externalizePackAssets(inlinePack()).doc;
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(hosted),
    })) as unknown as typeof fetch;
    const doc = await fetchJsonPack("https://games.example.org/big/pack.json", {
      fetch: fetchMock,
    });
    expect(doc.rooms.start.image).toMatch(
      /^https:\/\/games\.example\.org\/big\/assets\//
    );
  });

  it("explains oversized packs and failed requests", async () => {
    const big = (async () => ({ ok: true, status: 200, text: async () => "x".repeat(50) })) as unknown as typeof fetch;
    await expect(
      fetchJsonPack("https://a.example/p.json", { fetch: big, maxChars: 10 })
    ).rejects.toThrow(/too large/);
    const missing = (async () => ({ ok: false, status: 404, text: async () => "" })) as unknown as typeof fetch;
    await expect(
      fetchJsonPack("https://a.example/p.json", { fetch: missing })
    ).rejects.toThrow(/404/);
  });
});

describe("preload helpers", () => {
  it("lists a room's images (background first) and its neighbours", () => {
    const resolved = resolvePackAssetUrls(
      externalizePackAssets(inlinePack()).doc,
      "https://cdn.example.com/g/pack.json"
    );
    const def = createGameFromJson(resolved);
    const urls = collectRoomMediaUrls(def, "start");
    expect(urls[0]).toBe(def.rooms.start.image);
    expect(urls.some((u) => u.endsWith(".gif"))).toBe(true); // player sprite
    expect(new Set(urls).size).toBe(urls.length);
    expect(neighbourRoomIds(def, "start")).toEqual(["hall"]);
    expect(collectRoomMediaUrls(def, "nope")).toEqual([]);
  });
});
