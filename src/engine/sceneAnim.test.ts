import { describe, expect, it } from "vitest";
import { createGameFromJson, validateJsonPack } from "@/engine/jsonPack";
import { createEmptyJsonPack } from "@/engine/jsonPack";

describe("scene animation schema", () => {
  it("compiles particles + layer frames + hotspot frames", () => {
    let doc = createEmptyJsonPack({
      id: "anim-test",
      title: "Anim",
      startRoom: "night",
    });
    const frameA =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    const frameB =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    doc = {
      ...doc,
      rooms: {
        night: {
          id: "night",
          name: "Night",
          description: "Sky",
          image: frameA,
          particles: "stars",
          layers: [
            {
              id: "sky_glints",
              image: frameA,
              frames: [frameA, frameB],
              fps: 3,
              depth: 1,
              opacity: 0.8,
              animClass: "twinkle",
            },
          ],
          hotspots: [
            {
              id: "lantern",
              name: "Lantern",
              x: 40,
              y: 40,
              width: 10,
              height: 14,
              kind: "interact",
              lookText: "It flickers.",
              frames: [frameA, frameB],
              fps: 4,
              animClass: "flicker",
            },
          ],
        },
      },
    };
    expect(validateJsonPack(doc).ok).toBe(true);
    const game = createGameFromJson(doc);
    expect(game.rooms.night!.particles).toBe("stars");
    expect(game.rooms.night!.layers?.[0]?.frames?.length).toBe(2);
    expect(game.rooms.night!.layers?.[0]?.animClass).toBe("twinkle");
    const lantern = game.rooms.night!.hotspots!.find((h) => h.id === "lantern")!;
    expect(lantern.frames?.length).toBe(2);
    expect(lantern.animClass).toBe("flicker");
  });

});
