/**
 * QA: Attic Study–parity flow entirely from a JSON pack (no hand-written TS).
 * pickup key → use-with chest → get locket / set flag.
 */
import { describe, expect, it } from "vitest";
import { createGameFromJson, validateJsonPack } from "./jsonPack";
import { createGame } from "./createGame";

describe("JSON pack Attic Study parity (QA)", () => {
  it("ships one-room two-puzzle pack without TypeScript handlers", () => {
    const doc = {
      schemaVersion: 1 as const,
      id: "qa-attic-parity",
      title: "QA Attic",
      version: "0.1.0",
      startRoom: "attic",
      verbMode: "simple" as const,
      rooms: {
        attic: {
          id: "attic",
          name: "Attic",
          image: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
          music: "noir",
          hotspots: [
            {
              id: "desk",
              name: "Desk",
              x: 20,
              y: 40,
              width: 15,
              height: 15,
              kind: "pickup" as const,
              itemId: "attic_key",
              itemName: "Brass Key",
              itemDescription: "Opens the chest.",
              lookText: "A sticky note: key in the drawer.",
            },
            {
              id: "chest",
              name: "Chest",
              x: 60,
              y: 50,
              width: 18,
              height: 16,
              kind: "use-with-target" as const,
              lookText: "A locked chest.",
              useWith: [
                {
                  itemId: "attic_key",
                  message: "The key turns. Inside: a silver locket.",
                  setFlag: "chest_open",
                  alreadyFlag: "chest_open",
                  alreadyMessage: "The chest is already open.",
                  consumeItem: true,
                  giveItem: {
                    id: "locket",
                    name: "Silver Locket",
                    description: "You did it.",
                  },
                },
              ],
            },
          ],
        },
      },
      links: [],
      combinations: {},
      audio: {
        defaultMusic: "attic",
        music: { attic: "noir" },
        ambient: { attic: "hum" },
      },
    };

    const v = validateJsonPack(doc);
    expect(v.ok).toBe(true);

    const def = createGameFromJson(doc);
    const game = createGame(def);
    let state = game.createInitialState();

    const desk = def.rooms.attic.hotspots.find((h) => h.id === "desk")!;
    const chest = def.rooms.attic.hotspots.find((h) => h.id === "chest")!;

    // Puzzle 1: get key
    let r = game.doSentence(desk, "look", state, null);
    state = game.applyPatch(state, r.patch ?? {});
    expect(state.flags.got_attic_key).toBe(true);
    expect(state.inventory.some((i) => i.id === "attic_key")).toBe(true);

    // Puzzle 2: use key with chest
    const key = state.inventory.find((i) => i.id === "attic_key")!;
    r = game.doSentence(chest, "use", state, key);
    state = game.applyPatch(state, r.patch ?? {});
    expect(state.flags.chest_open).toBe(true);
    expect(state.inventory.some((i) => i.id === "attic_key")).toBe(false);
    expect(state.inventory.some((i) => i.id === "locket")).toBe(true);

    // Already-open is a no-op patch
    r = game.doSentence(chest, "use", state, {
      id: "attic_key",
      name: "Brass Key",
      description: "x",
    });
    const before = state.inventory.length;
    state = game.applyPatch(state, r.patch ?? {});
    expect(state.inventory.length).toBe(before);
  });
});
