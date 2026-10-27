import { describe, expect, it } from "vitest";
import { createGame } from "@/engine/createGame";
import {
  compilePackCutscenes,
  compilePackHints,
  createEmptyJsonPack,
  createGameFromJson,
  validateJsonPack,
} from "@/engine/jsonPack";

describe("JSON pack next-tier (walkboxes / hints / cutscenes / dialogue flags)", () => {
  it("compiles custom walkboxes and entry point", () => {
    const doc = createEmptyJsonPack({ id: "wb", title: "WB" });
    doc.rooms.start!.image = "data:image/gif;base64,R0lGODlhAQABAAAAACw=";
    doc.rooms.start!.walkboxes = [
      { id: "ledge", x: 10, y: 60, width: 40, height: 20 },
    ];
    doc.rooms.start!.entryPoint = { x: 20, y: 70 };
    expect(validateJsonPack(doc).ok).toBe(true);
    const def = createGameFromJson(doc);
    expect(def.rooms.start!.walkboxes![0].id).toBe("ledge");
    expect(def.rooms.start!.entryPoint).toEqual({ x: 20, y: 70 });
    expect(def.initialActors!.player.x).toBe(20);
  });

  it("compiles hint untilFlag / requireFlag", () => {
    const hints = compilePackHints([
      {
        id: "desk",
        title: "Desk",
        tiers: ["A", "B", "C"],
        untilFlag: "got_key",
        requireFlag: "saw_note",
      },
    ]);
    expect(hints).toHaveLength(1);
    const h = hints[0]!;
    expect(h.condition({ flags: { saw_note: true }, inventory: [], currentLocation: "x", vars: {} } as never)).toBe(true);
    expect(h.condition({ flags: {}, inventory: [], currentLocation: "x", vars: {} } as never)).toBe(false);
    expect(h.completed?.({ flags: { got_key: true }, inventory: [], currentLocation: "x", vars: {} } as never)).toBe(true);
  });

  it("compiles cutscene steps to lines with walk/sound/wait", () => {
    const cs = compilePackCutscenes({
      intro: {
        id: "intro",
        steps: [
          { op: "sound", key: "creak" },
          { op: "wait", ms: 500 },
          { op: "walk", x: 40, y: 70 },
          { op: "message", text: "Hello", speaker: "Narrator" },
        ],
      },
    });
    expect(cs.intro!.lines).toHaveLength(4);
    expect(cs.intro!.lines[0].sound).toBe("creak");
    expect(cs.intro!.lines[1].durationMs).toBe(500);
    expect(cs.intro!.lines[2].walkTo).toEqual({ x: 40, y: 70, actorId: undefined });
    expect(cs.intro!.lines[3].text).toBe("Hello");
  });

  it("dialogue requireFlag compiles to choice condition", () => {
    const doc = createEmptyJsonPack({ id: "dlg", title: "Dlg" });
    doc.rooms.start!.image = "data:image/gif;base64,R0lGODlhAQABAAAAACw=";
    doc.rooms.start!.hotspots = [
      {
        id: "npc",
        name: "Friend",
        x: 10,
        y: 10,
        width: 10,
        height: 20,
        kind: "character",
        actorId: "friend",
        dialogue: {
          speaker: "Friend",
          lines: [
            {
              id: "hello",
              text: "Hi",
              choices: [
                { text: "Secret", nextId: "END", requireFlag: "trusted" },
                { text: "Bye", nextId: "END" },
              ],
            },
          ],
        },
      },
    ];
    const def = createGameFromJson(doc);
    const tree = def.rooms.start!.hotspots!.find((h) => h.id === "npc")!
      .dialogue!;
    const secret = tree.nodes.hello!.choices!.find((c) => c.text === "Secret")!;
    expect(secret.condition).toBeTypeOf("function");
    expect(
      secret.condition!({
        flags: { trusted: true },
        inventory: [],
        currentLocation: "start",
        vars: {},
      } as never)
    ).toBe(true);
    const game = createGame(def);
    expect(game.definition.hints).toEqual([]);
  });
});
