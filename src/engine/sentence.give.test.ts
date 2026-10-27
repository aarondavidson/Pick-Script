import { describe, expect, it } from "vitest";
import { createEmptyJsonPack, createGameFromJson } from "./jsonPack";
import { createGame } from "./createGame";
import { doSentence, formatSentence } from "./sentence";
import { DEFAULT_VERBS } from "./definition";
import { verbModeIncludes } from "./verbs";

describe("give verb", () => {
  it("is in DEFAULT_VERBS with shortcut 8", () => {
    const give = DEFAULT_VERBS.find((v) => v.id === "give");
    expect(give?.shortcut).toBe("8");
    expect(verbModeIncludes("classic", "give")).toBe(true);
    expect(verbModeIncludes("simple", "give")).toBe(false);
    expect(verbModeIncludes("coin", "give")).toBe(false);
  });

  it("formats Give X to Y sentence", () => {
    expect(
      formatSentence({
        verb: "give",
        item: { id: "coin", name: "Coin", description: "" },
        targetName: "Guard",
      })
    ).toBe("Give Coin to Guard");
    expect(
      formatSentence({
        verb: "give",
        item: { id: "coin", name: "Coin", description: "" },
        targetName: null,
      })
    ).toBe("Give Coin to");
  });

  it("routes give + item through use-with like use", () => {
    const doc = createEmptyJsonPack({
      id: "give-demo",
      title: "Give Demo",
      rooms: {
        start: {
          id: "start",
          name: "Start",
          image: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
          hotspots: [
            {
              id: "npc",
              name: "Merchant",
              x: 40,
              y: 40,
              width: 20,
              height: 30,
              kind: "use-with-target",
              useWith: [
                {
                  itemId: "gem",
                  message: "They take the gem gladly.",
                  setFlag: "traded",
                },
              ],
            },
          ],
        },
      },
      items: {
        gem: { id: "gem", name: "Gem", description: "Sparkly." },
      },
    });
    const def = createGameFromJson(doc);
    const game = createGame(def);
    let state = game.createInitialState();
    state = game.applyPatch(state, {
      inventory: [{ id: "gem", name: "Gem", description: "Sparkly." }],
    });
    const hotspot = def.rooms.start.hotspots.find((h) => h.id === "npc")!;
    const gem = state.inventory[0]!;
    const result = doSentence({
      definition: def,
      hotspot,
      verb: "give",
      state,
      withItem: gem,
    });
    expect(result.blocked).toBeFalsy();
    expect(result.message).toMatch(/gem/i);
    state = game.applyPatch(state, result.patch ?? {});
    expect(state.flags.traded).toBe(true);
  });
});
