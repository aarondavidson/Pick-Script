import { describe, expect, it } from "vitest";
import { createEmptyJsonPack, createGameFromJson } from "./jsonPack";
import { createGame } from "./createGame";

describe("json pack puzzles", () => {
  it("compiles use-with grant + consume + flag", () => {
    const doc = createEmptyJsonPack({
      id: "puzzle-pack",
      title: "Puzzle",
      rooms: {
        start: {
          id: "start",
          name: "Room",
          image: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
          hotspots: [
            {
              id: "chest",
              name: "Chest",
              x: 40,
              y: 40,
              width: 20,
              height: 20,
              kind: "use-with-target",
              lookText: "A locked chest.",
              useWith: [
                {
                  itemId: "key",
                  message: "The chest opens.",
                  setFlag: "chest_open",
                  alreadyFlag: "chest_open",
                  alreadyMessage: "Already open.",
                  consumeItem: true,
                  giveItem: {
                    id: "locket",
                    name: "Locket",
                    description: "Shiny.",
                  },
                },
              ],
            },
          ],
        },
      },
    });

    const def = createGameFromJson(doc);
    const chest = def.rooms.start.hotspots.find((h) => h.id === "chest")!;
    const game = createGame(def);
    let state = game.createInitialState();
    state = {
      ...state,
      inventory: [
        { id: "key", name: "Key", description: "A key." },
      ],
    };

    const result = game.doSentence(chest, "use", state, state.inventory[0]);
    expect(result.blocked).toBeFalsy();
    state = game.applyPatch(state, result.patch ?? {});
    expect(state.flags.chest_open).toBe(true);
    expect(state.inventory.some((i) => i.id === "key")).toBe(false);
    expect(state.inventory.some((i) => i.id === "locket")).toBe(true);
  });

  it("gates exit on requireItem", () => {
    const doc = createEmptyJsonPack({
      id: "gate",
      title: "Gate",
      startRoom: "a",
      rooms: {
        a: {
          id: "a",
          name: "A",
          image: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
          hotspots: [],
        },
        b: {
          id: "b",
          name: "B",
          image: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
          hotspots: [],
        },
      },
      links: [
        {
          from: "a",
          to: "b",
          fromLabel: "Door",
          toLabel: "Back",
          requireItem: "pass",
          blockedMessage: "Need a pass.",
        },
      ],
    });
    const def = createGameFromJson(doc);
    const exit = def.rooms.a.exits![0];
    const game = createGame(def);
    let state = game.createInitialState();
    expect(exit.blocked!(state)).toBe(true);
    state = {
      ...state,
      inventory: [{ id: "pass", name: "Pass", description: "OK" }],
    };
    expect(exit.blocked!(state)).toBe(false);
  });
});
