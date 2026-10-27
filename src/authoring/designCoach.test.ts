import { describe, expect, it } from "vitest";
import {
  analyzeJsonPack,
  analyzeGameDefinition,
  filterSuggestions,
} from "@/authoring/designCoach";
import { createEmptyJsonPack, createGameFromJson } from "@/engine/jsonPack";

describe("designCoach", () => {
  it("suggests art + hotspot on empty pack", () => {
    const doc = createEmptyJsonPack();
    const { suggestions, phase } = analyzeJsonPack(doc);
    expect(phase).toBe("start");
    const ids = suggestions.map((s) => s.id);
    expect(ids).toContain("pack-upload-room-art");
    expect(ids).toContain("pack-draw-hotspot");
  });

  it("suggests a puzzle after pickups exist", () => {
    const doc = createEmptyJsonPack({
      rooms: {
        start: {
          id: "start",
          name: "Start",
          image: "https://example.com/room.jpg",
          hotspots: [
            {
              id: "key",
              name: "Key",
              x: 10,
              y: 10,
              width: 12,
              height: 12,
              kind: "pickup",
              itemId: "key",
              itemName: "Key",
              lookText: "A key.",
            },
          ],
        },
      },
      items: { key: { id: "key", name: "Key" } },
    });
    const ids = analyzeJsonPack(doc).suggestions.map((s) => s.id);
    expect(ids).toContain("pack-first-puzzle");
    expect(ids).toContain("pack-item-icons");
  });

  it("filterSuggestions respects dismissed + phase focus", () => {
    const doc = createEmptyJsonPack();
    const result = analyzeJsonPack(doc);
    const filtered = filterSuggestions(result, {
      dismissed: ["pack-upload-room-art"],
      phaseFocus: true,
    });
    expect(filtered.every((s) => s.id !== "pack-upload-room-art")).toBe(true);
    expect(filtered.length).toBeGreaterThan(0);
  });

  it("analyzes live GameDefinition without throwing", () => {
    const def = createGameFromJson(
      createEmptyJsonPack({
        id: "coach-live",
        title: "Coach Live",
        rooms: {
          start: {
            id: "start",
            name: "Start",
            image: "https://example.com/room.jpg",
            music: "home",
            hotspots: [
              {
                id: "chest",
                name: "Chest",
                x: 40,
                y: 40,
                width: 12,
                height: 14,
                kind: "use-with-target",
                lookText: "A chest.",
                useWith: [
                  {
                    itemId: "key",
                    message: "Open.",
                    setFlag: "open",
                  },
                ],
              },
            ],
          },
        },
        items: { key: { id: "key", name: "Key" } },
        combinations: {
          "rope+hook": {
            items: ["rope", "hook"],
            result: { id: "grapple", name: "Grapple", description: "Ready." },
            successMessage: "Combined.",
          },
        },
        hints: [
          {
            id: "h1",
            title: "Hint",
            tiers: ["Do the thing."],
            untilFlag: "open",
          },
        ],
      })
    );
    const { suggestions } = analyzeGameDefinition(def);
    expect(Array.isArray(suggestions)).toBe(true);
    // Puzzle pack — should not nag for first puzzle loop
    expect(suggestions.every((s) => s.id !== "game-puzzle-loop")).toBe(true);
  });

  it("surfaces ship tips when a puzzle pack is ready", () => {
    const doc = createEmptyJsonPack({
      title: "Ship Me",
      subtitle: "Ready",
      rooms: {
        start: {
          id: "start",
          name: "Start",
          image: "https://example.com/room.jpg",
          music: "home",
          hotspots: [
            {
              id: "key",
              name: "Key",
              x: 10,
              y: 10,
              width: 12,
              height: 12,
              kind: "pickup",
              itemId: "key",
              itemName: "Key",
              lookText: "A key.",
              useWith: [
                {
                  itemId: "key",
                  setFlag: "door_open",
                  message: "Unlocked.",
                },
              ],
            },
            {
              id: "door",
              name: "Door",
              x: 40,
              y: 40,
              width: 15,
              height: 20,
              kind: "use-with-target",
              lookText: "A door.",
            },
          ],
        },
      },
      items: {
        key: {
          id: "key",
          name: "Key",
          icon: "data:image/png;base64,aaaa",
        },
      },
      audio: { defaultMusic: "home", music: { home: "calm" }, ambient: {} },
    });
    const { phase, suggestions } = analyzeJsonPack(doc);
    expect(phase).toBe("ship");
    const ids = suggestions.map((s) => s.id);
    expect(ids).toContain("pack-publish-local");
    expect(ids).toContain("pack-share-import");
  });
});
