import { describe, expect, it } from "vitest";
import {
  createEmptyJsonPack,
  createGameFromJson,
  sanitizeJsonPackSpecial,
} from "./jsonPack";

describe("json pack specials", () => {
  it("compiles allowlisted minigame special into definition.specials", () => {
    const pack = createEmptyJsonPack({
      id: "spec-mini",
      title: "Spec",
      rooms: {
        start: {
          id: "start",
          name: "Start",
          image: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
          hotspots: [
            {
              id: "arcade",
              name: "Arcade",
              x: 10,
              y: 10,
              width: 20,
              height: 20,
              kind: "interact",
              special: {
                kind: "minigame",
                minigameId: "pixel-invaders",
                interceptVerbs: ["use", "look"],
              },
            },
          ],
        },
      },
    });
    const def = createGameFromJson(pack);
    expect(def.specials?.arcade).toBeTruthy();
    const hs = def.rooms.start!.hotspots!.find((h) => h.id === "arcade")!;
    expect(hs.special).toBe("arcade");
    const out = def.specials!.arcade!.run({
      hotspot: hs,
      verb: "use",
      state: { flags: {}, inventory: [], currentLocation: "start" } as never,
    });
    expect(out?.modality).toEqual({
      type: "minigame",
      minigameId: "pixel-invaders",
    });
  });

  it("compiles trade special as inventory swap after-hook", () => {
    const pack = createEmptyJsonPack({
      id: "spec-trade",
      title: "Trade",
      items: {
        ticket: {
          id: "ticket",
          name: "Ticket",
          description: "A ticket",
        },
      },
      rooms: {
        start: {
          id: "start",
          name: "Start",
          image: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
          hotspots: [
            {
              id: "trader",
              name: "Trader",
              x: 10,
              y: 10,
              width: 12,
              height: 20,
              kind: "character",
              special: {
                kind: "trade",
                requireItemId: "hotpocket",
                giveItemId: "ticket",
                setFlag: "traded",
                alreadyFlag: "traded",
                message: "Deal!",
              },
            },
          ],
        },
      },
    });
    const def = createGameFromJson(pack);
    const special = def.specials!.trader!;
    const miss = special.run({
      hotspot: def.rooms.start!.hotspots![0]!,
      verb: "talk",
      state: {
        flags: {},
        inventory: [],
        currentLocation: "start",
      } as never,
    });
    expect(miss).toBeNull();

    const hit = special.run({
      hotspot: def.rooms.start!.hotspots![0]!,
      verb: "talk",
      state: {
        flags: {},
        inventory: [{ id: "hotpocket", name: "Hot Pocket", description: "" }],
        currentLocation: "start",
      } as never,
    });
    expect(hit?.message).toBe("Deal!");
    expect(hit?.patch?.flags?.traded).toBe(true);
    expect(hit?.patch?.inventory?.some((i) => i.id === "ticket")).toBe(true);
    expect(hit?.patch?.inventory?.some((i) => i.id === "hotpocket")).toBe(
      false
    );
  });

  it("rejects unknown minigame ids", () => {
    expect(
      sanitizeJsonPackSpecial({
        kind: "minigame",
        minigameId: "evil-shell",
      })
    ).toBeNull();
  });

  it("accepts sequence-lock and slider-puzzle with sanitized config", () => {
    const lock = sanitizeJsonPackSpecial({
      kind: "minigame",
      minigameId: "sequence-lock",
      config: {
        sequence: ["north", "east", "south"],
        labels: { north: "N", east: "E", south: "S" },
        winFlag: "lockOpen",
      },
    });
    expect(lock?.minigameId).toBe("sequence-lock");
    expect(lock?.config?.sequence).toEqual(["north", "east", "south"]);
    expect(lock?.config?.winFlag).toBe("lockOpen");
    expect((lock?.config?.labels as Record<string, string>).north).toBe("N");

    const slider = sanitizeJsonPackSpecial({
      kind: "minigame",
      minigameId: "slider-puzzle",
      config: {
        order: ["r", "b", "g", "y"],
        target: ["r", "g", "b", "y"],
        winFlag: "panelAligned",
      },
    });
    expect(slider?.minigameId).toBe("slider-puzzle");
    expect(slider?.config?.order).toEqual(["r", "b", "g", "y"]);
    expect(slider?.config?.target).toEqual(["r", "g", "b", "y"]);
    expect(slider?.config?.winFlag).toBe("panelAligned");
  });

  it("accepts dial-lock and wire-match with sanitized config", () => {
    const dial = sanitizeJsonPackSpecial({
      kind: "minigame",
      minigameId: "dial-lock",
      config: {
        positions: 8,
        target: [1, 4, 7],
        winFlag: "vaultOpen",
      },
    });
    expect(dial?.minigameId).toBe("dial-lock");
    expect(dial?.config?.positions).toBe(8);
    expect(dial?.config?.target).toEqual([1, 4, 7]);
    expect(dial?.config?.winFlag).toBe("vaultOpen");

    const wire = sanitizeJsonPackSpecial({
      kind: "minigame",
      minigameId: "wire-match",
      config: {
        pairs: [
          ["red", "A"],
          ["blue", "B"],
        ],
        winFlag: "boardFixed",
      },
    });
    expect(wire?.minigameId).toBe("wire-match");
    expect(wire?.config?.pairs).toEqual([
      ["red", "A"],
      ["blue", "B"],
    ]);
    expect(wire?.config?.winFlag).toBe("boardFixed");

    const dialDefault = sanitizeJsonPackSpecial({
      kind: "minigame",
      minigameId: "dial-lock",
    });
    expect(dialDefault?.config?.winFlag).toBe("beatDialLock");

    const wireDefault = sanitizeJsonPackSpecial({
      kind: "minigame",
      minigameId: "wire-match",
    });
    expect(wireDefault?.config?.winFlag).toBe("beatWireMatch");
  });

  it("rejects evil minigame config (prototype keys)", () => {
    const evil = Object.create(null) as Record<string, unknown>;
    evil.__proto__ = { polluted: true };
    evil.sequence = ["a", "b"];
    expect(
      sanitizeJsonPackSpecial({
        kind: "minigame",
        minigameId: "sequence-lock",
        config: evil,
      })
    ).toBeNull();

    expect(
      sanitizeJsonPackSpecial({
        kind: "minigame",
        minigameId: "slider-puzzle",
        config: { constructor: "x", order: ["a", "b", "c"] },
      })
    ).toBeNull();
  });

  it("compiles sequence-lock config onto pending modality", () => {
    const pack = createEmptyJsonPack({
      id: "spec-seq",
      title: "Seq",
      rooms: {
        start: {
          id: "start",
          name: "Start",
          image: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
          hotspots: [
            {
              id: "lock",
              name: "Lock",
              x: 10,
              y: 10,
              width: 20,
              height: 20,
              kind: "interact",
              special: {
                kind: "minigame",
                minigameId: "sequence-lock",
                config: {
                  sequence: ["a", "b", "c"],
                  winFlag: "lockOpen",
                },
              },
            },
          ],
        },
      },
    });
    const def = createGameFromJson(pack);
    const hs = def.rooms.start!.hotspots!.find((h) => h.id === "lock")!;
    const out = def.specials!.lock!.run({
      hotspot: hs,
      verb: "use",
      state: { flags: {}, inventory: [], currentLocation: "start" } as never,
    });
    expect(out?.modality).toEqual({
      type: "minigame",
      minigameId: "sequence-lock",
      config: {
        sequence: ["a", "b", "c"],
        winFlag: "lockOpen",
      },
    });
  });

  it("drops unknown specials at compile time", () => {
    const pack = createEmptyJsonPack({
      id: "spec-bad",
      title: "Bad",
      rooms: {
        start: {
          id: "start",
          name: "Start",
          image: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
          hotspots: [
            {
              id: "trap",
              name: "Trap",
              x: 1,
              y: 1,
              width: 10,
              height: 10,
              special: {
                kind: "minigame",
                minigameId: "not-a-real-game",
              },
            },
          ],
        },
      },
    });
    const def = createGameFromJson(pack);
    expect(def.specials?.trap).toBeUndefined();
    expect(def.rooms.start!.hotspots![0]!.special).toBeUndefined();
  });
});
