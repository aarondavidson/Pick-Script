import { describe, expect, it } from "vitest";
import type { GameState, Room } from "./types";
import {
  checkRoomTimers,
  sanitizeRoomTimers,
  timerSeenFlag,
} from "./roomTimers";
import {
  createEmptyJsonPack,
  createGameFromJson,
} from "./jsonPack";

function baseState(flags: Record<string, boolean> = {}): GameState {
  return {
    currentLocation: "start",
    inventory: [],
    flags,
    objectStates: {},
    dialogueState: {},
    gameComplete: false,
    journalEntries: [],
    achievements: [],
    quests: [],
    visitedLocations: ["start"],
    egoId: "player",
    actors: {},
    camera: { x: 50, y: 50, followActorId: null },
    activeScripts: [],
    actorInventories: {},
    hintProgress: {},
  };
}

const ROOM: Room = {
  id: "start",
  name: "Start",
  description: "",
  image: "",
  hotspots: [],
  exits: [],
  timers: [
    {
      id: "ambience",
      afterMs: 1000,
      once: true,
      setFlag: "heard_drip",
      message: "A drip echoes.",
    },
  ],
};

describe("checkRoomTimers", () => {
  it("fires once after afterMs and persists timerSeen flag", () => {
    const fired = new Set<string>();
    const early = checkRoomTimers(ROOM, baseState(), 500, fired);
    expect(early.flags).toBeUndefined();
    expect(fired.size).toBe(0);

    const hit = checkRoomTimers(ROOM, baseState(), 1000, fired);
    expect(hit.message).toBe("A drip echoes.");
    expect(hit.flags?.heard_drip).toBe(true);
    expect(hit.flags?.[timerSeenFlag("start", "ambience")]).toBe(true);
    expect(fired.has("ambience")).toBe(true);

    // Second check with same fired set — no re-fire
    const again = checkRoomTimers(
      ROOM,
      baseState(hit.flags),
      5000,
      fired
    );
    expect(again.flags).toBeUndefined();
    expect(again.message).toBeUndefined();
  });

  it("does not re-fire once timer when flag already set (new dwell)", () => {
    const fired = new Set<string>();
    const seen = timerSeenFlag("start", "ambience");
    const hit = checkRoomTimers(
      ROOM,
      baseState({ [seen]: true }),
      2000,
      fired
    );
    expect(hit.message).toBeUndefined();
    expect(hit.flags).toBeUndefined();
    expect(fired.has("ambience")).toBe(true);
  });

  it("runs pack actions on fire", () => {
    const room: Room = {
      ...ROOM,
      timers: [
        {
          id: "give",
          afterMs: 100,
          actions: [{ op: "setFlag", flag: "from_action", value: true }],
        },
      ],
    };
    const fired = new Set<string>();
    const hit = checkRoomTimers(room, baseState(), 100, fired);
    expect(hit.flags?.from_action).toBe(true);
    expect(hit.flags?.[timerSeenFlag("start", "give")]).toBe(true);
  });
});

describe("sanitizeRoomTimers + JSON compile", () => {
  it("sanitizes raw timer lists", () => {
    expect(
      sanitizeRoomTimers([
        { id: "ok", afterMs: 500, setFlag: "a" },
        { id: "__proto__", afterMs: 1 },
        { id: "bad", afterMs: "nope" },
        null,
      ])
    ).toEqual([{ id: "ok", afterMs: 500, setFlag: "a" }]);
  });

  it("compiles room.timers from JSON pack", () => {
    const doc = createEmptyJsonPack({
      id: "timers",
      title: "Timers",
      rooms: {
        start: {
          id: "start",
          name: "Start",
          image: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
          timers: [
            {
              id: "wait_beat",
              afterMs: 2500,
              once: true,
              setFlag: "patient",
              message: "You wait.",
              actions: [{ op: "setFlag", flag: "also", value: true }],
            },
          ],
        },
      },
    });
    const def = createGameFromJson(doc);
    expect(def.rooms.start.timers).toEqual([
      {
        id: "wait_beat",
        afterMs: 2500,
        setFlag: "patient",
        message: "You wait.",
        actions: [{ op: "setFlag", flag: "also", value: true }],
      },
    ]);
  });
});
