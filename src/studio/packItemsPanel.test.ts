import { describe, expect, it } from "vitest";
import { createEmptyJsonPack } from "@/engine/jsonPack";
import { collectPickupItems } from "@/studio/PackItemsPanel";

describe("collectPickupItems", () => {
  it("gathers unique pickup catalog rows from hotspots", () => {
    const doc = createEmptyJsonPack({
      rooms: {
        start: {
          id: "start",
          name: "Start",
          image: "x",
          hotspots: [
            {
              id: "a",
              name: "Key",
              x: 0,
              y: 0,
              width: 5,
              height: 5,
              kind: "pickup",
              itemId: "key",
              itemName: "Brass key",
            },
            {
              id: "b",
              name: "Key again",
              x: 10,
              y: 0,
              width: 5,
              height: 5,
              kind: "pickup",
              itemId: "key",
              itemName: "Ignored duplicate",
            },
            {
              id: "c",
              name: "Poster",
              x: 20,
              y: 0,
              width: 5,
              height: 5,
              kind: "interact",
            },
          ],
        },
      },
      items: {
        key: { id: "key", name: "Catalog name", icon: "data:icon" },
      },
    });
    const items = collectPickupItems(doc);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: "key",
      name: "Brass key",
      icon: "data:icon",
    });
  });
});
