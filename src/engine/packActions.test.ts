import { describe, expect, it } from "vitest";
import { createEmptyJsonPack, createGameFromJson } from "./jsonPack";
import { createGame } from "./createGame";
import { runPackActions } from "./packActions";
import {
  dialogueChoiceTakenPatch,
  filterDialogueChoices,
} from "./dialogueOptions";
import {
  applySidecarToDefinition,
  hotspotsToSidecarOverlays,
  type PackSidecar,
} from "./packSidecar";
import { ensureRoomWalkboxes } from "./ensureWalkboxes";
import type { DialogueChoice } from "./types";
import {
  MAX_PACK_ACTION_NEST_DEPTH,
  parsePackActions,
} from "./security";

describe("packActions", () => {
  it("runs say / flag / give / object state chain", () => {
    const doc = createEmptyJsonPack({ id: "chain", title: "Chain" });
    const def = createGameFromJson(doc);
    const game = createGame(def);
    const state = game.createInitialState();
    const result = runPackActions(
      [
        { op: "message", text: "Click." },
        { op: "setFlag", flag: "done" },
        {
          op: "giveItem",
          item: { id: "coin", name: "Coin", description: "Shiny" },
        },
        { op: "setObjectState", objectId: "door", value: 1 },
      ],
      state
    );
    expect(result.message).toBe("Click.");
    expect(result.patch.flags?.done).toBe(true);
    expect(result.patch.inventory?.some((i) => i.id === "coin")).toBe(true);
    expect(result.patch.objectStates?.door).toBe(1);
  });

  it("if/else branches on flag and hasItem", () => {
    const game = createGame(
      createGameFromJson(createEmptyJsonPack({ id: "cond", title: "Cond" }))
    );
    const base = game.createInitialState();
    const withKey = {
      ...base,
      flags: { ...base.flags, gate_open: true },
      inventory: [
        ...base.inventory,
        { id: "key", name: "Key", description: "A key" },
      ],
    };
    const pass = runPackActions(
      [
        {
          op: "if",
          flag: "gate_open",
          hasItem: "key",
          then: [{ op: "message", text: "Open." }],
          else: [{ op: "message", text: "Locked." }],
        },
      ],
      withKey
    );
    expect(pass.message).toBe("Open.");

    const fail = runPackActions(
      [
        {
          op: "if",
          flag: "gate_open",
          hasItem: "key",
          then: [{ op: "message", text: "Open." }],
          else: [{ op: "message", text: "Locked." }],
        },
      ],
      base
    );
    expect(fail.message).toBe("Locked.");
  });

  it("if equals checks vars / boolean flags", () => {
    const game = createGame(
      createGameFromJson(createEmptyJsonPack({ id: "eq", title: "Eq" }))
    );
    const state = {
      ...game.createInitialState(),
      vars: { score: 3 },
      flags: { lit: true },
    };
    const byVar = runPackActions(
      [
        {
          op: "if",
          equals: { var: "score", value: 3 },
          then: [{ op: "setFlag", flag: "won" }],
        },
      ],
      state
    );
    expect(byVar.patch.flags?.won).toBe(true);

    const byFlag = runPackActions(
      [
        {
          op: "if",
          equals: { var: "lit", value: true },
          then: [{ op: "message", text: "Bright" }],
          else: [{ op: "message", text: "Dark" }],
        },
      ],
      state
    );
    expect(byFlag.message).toBe("Bright");
  });

  it("requireItem stops the chain when missing", () => {
    const game = createGame(
      createGameFromJson(createEmptyJsonPack({ id: "req", title: "Req" }))
    );
    const state = game.createInitialState();
    const missing = runPackActions(
      [
        {
          op: "requireItem",
          itemId: "torch",
          failMessage: "Need a torch.",
        },
        { op: "setFlag", flag: "should_not_set" },
        { op: "message", text: "Lit." },
      ],
      state
    );
    expect(missing.message).toBe("Need a torch.");
    expect(missing.stopped).toBe(true);
    expect(missing.patch.flags?.should_not_set).toBeUndefined();

    const withTorch = {
      ...state,
      inventory: [
        { id: "torch", name: "Torch", description: "Fire" },
      ],
    };
    const ok = runPackActions(
      [
        { op: "requireItem", itemId: "torch", failMessage: "Need a torch." },
        { op: "setFlag", flag: "lit" },
        { op: "message", text: "Lit." },
      ],
      withTorch
    );
    expect(ok.stopped).toBeFalsy();
    expect(ok.patch.flags?.lit).toBe(true);
    expect(ok.message).toBe("Lit.");
  });

  it("parsePackActions clamps if nesting depth", () => {
    const nest = (depth: number): unknown => {
      if (depth <= 0) return [{ op: "message", text: "leaf" }];
      return [
        {
          op: "if",
          flag: "a",
          then: nest(depth - 1),
        },
      ];
    };
    const deep = parsePackActions(nest(MAX_PACK_ACTION_NEST_DEPTH + 3));
    expect(deep).toHaveLength(1);
    expect(deep[0]?.op).toBe("if");
    let node = deep[0];
    let levels = 0;
    while (node?.op === "if" && node.then?.[0]) {
      levels += 1;
      node = node.then[0];
    }
    // Top-level depth 0 … nested thens through depth MAX inclusive
    expect(levels).toBe(MAX_PACK_ACTION_NEST_DEPTH);
    expect(node?.op).toBe("if");
    expect(node?.then ?? []).toEqual([]);
  });

  it("compiles hotspot actions from JSON pack", () => {
    const doc = createEmptyJsonPack({
      id: "act",
      title: "Act",
      rooms: {
        start: {
          id: "start",
          name: "Start",
          image: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
          hotspots: [
            {
              id: "lever",
              name: "Lever",
              x: 10,
              y: 10,
              width: 10,
              height: 10,
              kind: "interact",
              lookText: "A lever.",
              initialState: 0,
              stateOverlays: { "1": "data:image/gif;base64,R0lGODlhAQABAAAAACw=" },
              actions: [
                { op: "message", text: "Clunk." },
                { op: "setObjectState", objectId: "lever", value: 1 },
                { op: "setFlag", flag: "pulled" },
              ],
            },
          ],
        },
      },
    });
    const def = createGameFromJson(doc);
    const hs = def.rooms.start.hotspots[0]!;
    expect(hs.stateOverlays?.[1]).toBeTruthy();
    expect(def.initialObjectStates?.lever).toBe(0);
    const game = createGame(def);
    let state = game.createInitialState();
    const result = game.doSentence(hs, "use", state, null);
    state = game.applyPatch(state, result.patch ?? {});
    expect(state.flags.pulled).toBe(true);
    expect(state.objectStates.lever).toBe(1);
    expect(result.message).toBe("Clunk.");
  });
});

describe("dialogueOptions", () => {
  it("hides once choices after taken", () => {
    const choices: DialogueChoice[] = [
      { text: "Ask again", nextNode: "END", choiceId: "ask", optionMode: "once" },
      { text: "Bye", nextNode: "END", choiceId: "bye" },
    ];
    const doc = createEmptyJsonPack({ id: "dlg", title: "Dlg" });
    const state = createGame(createGameFromJson(doc)).createInitialState();
    expect(filterDialogueChoices(choices, state, "npc").length).toBe(2);
    const patch = dialogueChoiceTakenPatch(choices[0]!, 0, state, "npc");
    const next = { ...state, flags: { ...state.flags, ...patch.flags } };
    expect(filterDialogueChoices(choices, next, "npc").map((c) => c.choiceId)).toEqual([
      "bye",
    ]);
  });
});

describe("ensureWalkboxes + sidecar", () => {
  it("injects default floor walkbox", () => {
    const room = ensureRoomWalkboxes({
      id: "r",
      name: "R",
      description: "",
      image: "",
      hotspots: [],
      exits: [],
    });
    expect(room.walkboxes?.length).toBe(1);
    expect(room.walkboxes![0].id).toBe("floor");
  });

  it("applies sidecar overlays to definition", () => {
    const def = createGameFromJson(
      createEmptyJsonPack({
        id: "side",
        title: "Side",
        rooms: {
          start: {
            id: "start",
            name: "Start",
            image: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
            hotspots: [
              {
                id: "box",
                name: "Box",
                x: 10,
                y: 10,
                width: 10,
                height: 10,
              },
            ],
          },
        },
      })
    );
    const sidecar: PackSidecar = {
      gameId: "side",
      updatedAt: Date.now(),
      rooms: {
        start: {
          hotspots: hotspotsToSidecarOverlays([
            { ...def.rooms.start.hotspots[0]!, x: 40, y: 50, width: 12, height: 8 },
          ]),
        },
      },
    };
    const merged = applySidecarToDefinition(def, sidecar);
    expect(merged.rooms.start.hotspots[0].x).toBe(40);
    expect(merged.rooms.start.hotspots[0].y).toBe(50);
  });
});
