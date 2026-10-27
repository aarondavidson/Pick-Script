import { describe, expect, it } from "vitest";
import type { GameState } from "@/engine/types";
import {
  buildWalkthroughOutline,
  createPlaytestSession,
  diffPlaytestStates,
  finalizePlaytestSession,
  formatPlaytestSessionJson,
  formatPlaytestSessionMarkdown,
  formatWalkthroughNote,
} from "./playtestSession";

function state(partial: Partial<GameState>): GameState {
  return {
    currentLocation: "start",
    inventory: [],
    flags: {},
    objectStates: {},
    dialogueState: {},
    gameComplete: false,
    journalEntries: [],
    achievements: [],
    quests: [],
    visitedLocations: ["start"],
    egoId: null,
    actors: {},
    camera: { x: 0, y: 0, followActorId: null },
    activeScripts: [],
    actorInventories: {},
    hintProgress: {},
    ...partial,
  };
}

describe("playtestSession", () => {
  it("diffs room, flag, and inventory changes", () => {
    const a = state({ currentLocation: "start" });
    const b = state({
      currentLocation: "hall",
      flags: { got_key: true },
      inventory: [{ id: "key", name: "Key", description: "" }],
    });
    const events = diffPlaytestStates(a, b, 1500);
    expect(events.some((e) => e.kind === "room")).toBe(true);
    expect(events.some((e) => e.kind === "flag" && e.flag === "got_key")).toBe(
      true
    );
    expect(
      events.some((e) => e.kind === "inventory_add" && e.itemId === "key")
    ).toBe(true);
  });

  it("formats markdown with final state", () => {
    let session = createPlaytestSession("demo", "Demo");
    const s = state({
      currentLocation: "end",
      flags: { won: true },
      inventory: [{ id: "trophy", name: "Trophy", description: "" }],
    });
    session = {
      ...session,
      events: [...session.events, ...diffPlaytestStates(null, s, 0)],
    };
    session = finalizePlaytestSession(session, s);
    const md = formatPlaytestSessionMarkdown(session);
    expect(md).toContain("# Playtest session");
    expect(md).toContain("won");
    expect(md).toContain("trophy");
    expect(md).toContain("## Room path");
    expect(md).toContain("## Walkthrough outline");
  });

  it("builds walkthrough outline with ordered unique rooms and flag milestones", () => {
    let session = createPlaytestSession("demo", "Demo");
    const start = state({ currentLocation: "start" });
    const hall = state({
      currentLocation: "hall",
      flags: { got_key: true },
      inventory: [{ id: "key", name: "Key", description: "" }],
    });
    const end = state({
      currentLocation: "end",
      flags: { got_key: true, won: true },
      inventory: [
        { id: "key", name: "Key", description: "" },
        { id: "trophy", name: "Trophy", description: "" },
      ],
    });
    // Revisit hall — should not duplicate in roomPath
    const hallAgain = state({
      currentLocation: "hall",
      flags: { got_key: true, won: true },
      inventory: [
        { id: "key", name: "Key", description: "" },
        { id: "trophy", name: "Trophy", description: "" },
      ],
    });

    session = {
      ...session,
      events: [
        ...session.events,
        ...diffPlaytestStates(null, start, 0),
        ...diffPlaytestStates(start, hall, 1000),
        ...diffPlaytestStates(hall, end, 2000),
        ...diffPlaytestStates(end, hallAgain, 3000),
      ],
    };
    session = finalizePlaytestSession(session, hallAgain);

    const outline = buildWalkthroughOutline(session);
    expect(outline.roomPath).toEqual(["start", "hall", "end"]);
    expect(outline.flagsGained).toEqual(["got_key", "won"]);
    expect(outline.inventoryGained).toEqual(["key", "trophy"]);
    expect(outline.milestones.map((m) => `${m.kind}:${m.id}`)).toEqual([
      "room:start",
      "room:hall",
      "flag:got_key",
      "room:end",
      "flag:won",
    ]);

    const note = formatWalkthroughNote(session);
    expect(note).toContain("# Walkthrough");
    expect(note).toContain("## Room path");
    expect(note).toContain("`start`");
    expect(note).toContain("`got_key`");
    expect(note).toContain("enter `hall`");

    const json = JSON.parse(formatPlaytestSessionJson(session));
    expect(json.walkthrough.roomPath).toEqual(["start", "hall", "end"]);
    expect(json.walkthrough.flagsGained).toContain("won");
  });
});
