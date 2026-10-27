import { describe, expect, it } from "vitest";
import {
  compileJsonDialogue,
  createEmptyJsonPack,
  createGameFromJson,
} from "./jsonPack";

describe("json pack regions + lip-sync slots", () => {
  it("compiles room regions into Room.regions", () => {
    const doc = createEmptyJsonPack({
      id: "reg",
      title: "Regions",
      rooms: {
        start: {
          id: "start",
          name: "Start",
          image: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
          regions: [
            {
              id: "zone_a",
              x: 10,
              y: 60,
              width: 40,
              height: 20,
              setFlag: "entered_a",
              onEnterFlag: "a_once",
              onExitFlag: "left_a",
              message: "You enter zone A.",
              onEnterActions: [{ op: "sound", key: "whoosh" }],
              onExitActions: [{ op: "message", text: "Bye zone." }],
            },
          ],
        },
      },
    });
    const def = createGameFromJson(doc);
    expect(def.rooms.start.regions).toEqual([
      {
        id: "zone_a",
        x: 10,
        y: 60,
        width: 40,
        height: 20,
        setFlag: "entered_a",
        onEnterFlag: "a_once",
        onExitFlag: "left_a",
        message: "You enter zone A.",
        onEnterActions: [{ op: "sound", key: "whoosh" }],
        onExitActions: [{ op: "message", text: "Bye zone." }],
      },
    ]);
  });

  it("passes mouthCues / lipSyncKey through dialogue compile", () => {
    const tree = compileJsonDialogue({
      speaker: "Hero",
      lines: [
        {
          id: "hi",
          text: "Hello!",
          mouthCues: [
            { t: 0, shape: "A" },
            { t: 0.1, shape: "B" },
          ],
          lipSyncKey: "hero_hello_rhubarb",
        },
      ],
    });
    expect(tree.nodes.hi.mouthCues).toEqual([
      { t: 0, shape: "A" },
      { t: 0.1, shape: "B" },
    ]);
    expect(tree.nodes.hi.lipSyncKey).toBe("hero_hello_rhubarb");
  });
});
