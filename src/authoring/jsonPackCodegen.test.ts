import { describe, expect, it } from "vitest";
import { createEmptyJsonPack } from "@/engine/jsonPack";
import {
  formatJsonPackAsGameFolder,
  formatJsonPackAsManifestTs,
  listJsonPackAssetFiles,
} from "./jsonPackCodegen";

describe("jsonPackCodegen", () => {
  it("emits createGameFromJson loader with asset imports", () => {
    const doc = createEmptyJsonPack({
      id: "haunted-diner",
      title: "Haunted Diner",
      rooms: {
        start: {
          id: "start",
          name: "Diner",
          image: "data:image/gif;base64,xx",
          hotspots: [
            {
              id: "key",
              name: "Key",
              x: 1,
              y: 2,
              width: 3,
              height: 4,
              kind: "pickup",
              itemId: "brass_key",
              itemName: "Brass Key",
            },
          ],
        },
      },
    });
    const ts = formatJsonPackAsManifestTs(doc);
    expect(ts).toContain("createGameFromJson");
    expect(ts).toContain("hauntedDinerGame");
    expect(ts).toContain('from "./assets/start.jpg"');
    expect(ts).toContain("brass_key");
    expect(listJsonPackAssetFiles(doc)).toEqual(["assets/start.jpg"]);
  });

  it("formatJsonPackAsGameFolder includes manifest + registry snippet", () => {
    const doc = createEmptyJsonPack({
      id: "haunted-diner",
      title: "Haunted Diner",
      subtitle: "Late night specials",
    });
    const { files } = formatJsonPackAsGameFolder(doc);
    expect(files["src/games/haunted-diner/manifest.ts"]).toContain(
      "createGameFromJson"
    );
    expect(files["src/games/haunted-diner/index.ts"]).toContain(
      "hauntedDinerGame"
    );
    expect(files["src/games/haunted-diner/README.md"]).toContain("Haunted Diner");
    expect(files["src/games/haunted-diner/assets/README.md"]).toContain(
      "start.jpg"
    );
    expect(files["REGISTRY_SNIPPET.ts.txt"]).toContain(
      'from "./haunted-diner"'
    );
    expect(files["REGISTRY_SNIPPET.ts.txt"]).toContain("hauntedDinerGame");
    expect(files["REGISTRY_SNIPPET.ts.txt"]).toContain("gameCatalog");
  });
});
