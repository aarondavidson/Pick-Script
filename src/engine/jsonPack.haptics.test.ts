import { describe, expect, it } from "vitest";
import {
  createEmptyJsonPack,
  createGameFromJson,
} from "./jsonPack";
import { runPackActions } from "./packActions";
import { createGame } from "./createGame";

describe("pack haptics", () => {
  it("compiles hotspot interactHaptic and action haptics", () => {
    const pack = createEmptyJsonPack({
      id: "hap",
      title: "Hap",
      rooms: {
        start: {
          id: "start",
          name: "Start",
          image: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
          hotspots: [
            {
              id: "bell",
              name: "Bell",
              x: 10,
              y: 10,
              width: 12,
              height: 12,
              kind: "interact",
              lookText: "A bell.",
              interactHaptic: "medium",
              actions: [
                { op: "message", text: "Ding." },
                { op: "haptic", style: "heavy" },
              ],
            },
          ],
        },
      },
    });
    const def = createGameFromJson(pack);
    const hs = def.rooms.start!.hotspots![0]!;
    expect(hs.interactHaptic).toBe("medium"); // explicit field wins
    expect(hs.actionHaptics).toEqual(["heavy"]);
  });

  it("runPackActions collects haptic styles", () => {
    const state = createGame(
      createGameFromJson(createEmptyJsonPack({ id: "x", title: "X" }))
    ).createInitialState();
    const result = runPackActions(
      [
        { op: "haptic", style: "success" },
        { op: "sound", key: "click" },
      ],
      state
    );
    expect(result.haptics).toEqual(["success"]);
    expect(result.sounds).toEqual(["click"]);
  });
});
