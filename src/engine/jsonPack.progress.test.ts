import { describe, expect, it } from "vitest";
import {
  createEmptyJsonPack,
  createGameFromJson,
} from "@/engine/jsonPack";
import { createInitialState } from "@/engine/state";

describe("jsonPack quests & achievements", () => {
  it("compiles achievements and quests with flag hooks", () => {
    const pack = createEmptyJsonPack({
      id: "progress-pack",
      title: "Progress",
      achievements: [
        {
          id: "got_key_ach",
          title: "Key finder",
          description: "You found a key.",
          unlockFlag: "got_brass_key",
        },
      ],
      quests: [
        {
          id: "escape",
          title: "Escape",
          description: "Get out.",
          objectives: ["Find key", "Open door"],
          completeFlag: "door_open",
        },
      ],
    });
    const def = createGameFromJson(pack);
    expect(def.achievements).toHaveLength(1);
    expect(def.achievements[0]?.unlockFlag).toBe("got_brass_key");
    expect(def.quests).toHaveLength(1);
    expect(def.quests[0]?.completeFlag).toBe("door_open");
    expect(def.quests[0]?.objectives).toEqual(["Find key", "Open door"]);

    const withSteps = createEmptyJsonPack({
      id: "obj-flags",
      title: "Obj",
      quests: [
        {
          id: "escape",
          title: "Escape",
          description: "Get out.",
          objectives: ["Find key", "Open door"],
          objectiveFlags: ["got_key", "door_open"],
          completeFlag: "door_open",
        },
      ],
    });
    expect(createGameFromJson(withSteps).quests[0]?.objectiveFlags).toEqual([
      "got_key",
      "door_open",
    ]);

    const state = createInitialState(def);
    expect(state.achievements[0]?.unlocked).toBe(false);
    expect(state.quests[0]?.completed).toBe(false);
  });
});
