import { describe, expect, it } from "vitest";
import {
  compileJsonDialogue,
  createEmptyJsonPack,
  createGameFromJson,
} from "./jsonPack";
import { viewDialogueNode } from "./dialogue";
import { dialogueChoiceTakenPatch } from "./dialogueOptions";
import { createGame } from "./createGame";

describe("json dialogue option modes", () => {
  it("compiles optionMode onto choices", () => {
    const tree = compileJsonDialogue({
      speaker: "NPC",
      lines: [
        {
          id: "hi",
          text: "Hello",
          choices: [
            {
              text: "Secret",
              nextId: "END",
              choiceId: "secret",
              optionMode: "onceGame",
            },
          ],
        },
      ],
    });
    expect(tree.nodes.hi.choices?.[0]?.optionMode).toBe("onceGame");
  });

  it("viewDialogueNode filters onceGame after patch", () => {
    const def = createGameFromJson(
      createEmptyJsonPack({
        id: "n",
        title: "N",
        rooms: {
          start: {
            id: "start",
            name: "S",
            image: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
            hotspots: [
              {
                id: "npc",
                name: "NPC",
                x: 1,
                y: 1,
                width: 10,
                height: 10,
                kind: "character",
                dialogue: {
                  lines: [
                    {
                      id: "hi",
                      text: "Hi",
                      choices: [
                        {
                          text: "Once",
                          nextId: "END",
                          choiceId: "o1",
                          optionMode: "onceGame",
                        },
                        { text: "Always", nextId: "END", choiceId: "a1" },
                      ],
                    },
                  ],
                },
              },
            ],
          },
        },
      })
    );
    const tree = def.rooms.start.hotspots[0].dialogue!;
    const game = createGame(def);
    let state = game.createInitialState();
    let view = viewDialogueNode(tree, "hi", state, "npc");
    expect(view?.choices.length).toBe(2);
    const choice = view!.choices[0]!;
    const patch = dialogueChoiceTakenPatch(choice, 0, state, "npc");
    state = game.applyPatch(state, patch);
    view = viewDialogueNode(tree, "hi", state, "npc");
    expect(view?.choices.map((c) => c.choiceId)).toEqual(["a1"]);
  });
});
