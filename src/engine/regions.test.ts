import { describe, expect, it } from "vitest";
import {
  checkRegionEntries,
  pointInRegion,
  regionSeenFlag,
} from "./regions";
import type { GameState, Room, RoomRegion } from "./types";

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
    egoId: "hero",
    actors: {},
    camera: { x: 50, y: 50, followActorId: "hero" },
    activeScripts: [],
    actorInventories: {},
    hintProgress: {},
  };
}

const region: RoomRegion = {
  id: "trap",
  x: 40,
  y: 40,
  width: 20,
  height: 20,
  setFlag: "stepped_trap",
  onEnterFlag: "trap_entered",
  message: "A pressure plate clicks.",
};

const room: Room = {
  id: "start",
  name: "Start",
  description: "",
  image: "",
  hotspots: [],
  exits: [],
  regions: [region],
};

describe("regions", () => {
  it("pointInRegion uses inclusive AABB", () => {
    expect(pointInRegion({ x: 40, y: 40 }, region)).toBe(true);
    expect(pointInRegion({ x: 60, y: 60 }, region)).toBe(true);
    expect(pointInRegion({ x: 39, y: 50 }, region)).toBe(false);
  });

  it("fires once with regionSeen flag + setFlag/onEnterFlag/message", () => {
    const state = baseState();
    const hit = checkRegionEntries(
      { x: 10, y: 10 },
      { x: 50, y: 50 },
      room,
      state
    );
    expect(hit.message).toBe("A pressure plate clicks.");
    expect(hit.flags?.[regionSeenFlag("start", "trap")]).toBe(true);
    expect(hit.flags?.stepped_trap).toBe(true);
    expect(hit.flags?.trap_entered).toBe(true);

    const again = checkRegionEntries(
      { x: 10, y: 10 },
      { x: 50, y: 50 },
      room,
      { ...state, flags: hit.flags! }
    );
    expect(again).toEqual({});
  });

  it("everyEnter refires without regionSeen", () => {
    const everyRoom: Room = {
      ...room,
      regions: [{ ...region, everyEnter: true }],
    };
    const state = baseState();
    const first = checkRegionEntries(
      { x: 10, y: 10 },
      { x: 50, y: 50 },
      everyRoom,
      state
    );
    expect(first.flags?.stepped_trap).toBe(true);
    expect(first.flags?.[regionSeenFlag("start", "trap")]).toBeUndefined();

    const second = checkRegionEntries(
      { x: 10, y: 10 },
      { x: 50, y: 50 },
      everyRoom,
      { ...state, flags: first.flags! }
    );
    expect(second.flags?.stepped_trap).toBe(true);
    expect(second.message).toBe("A pressure plate clicks.");
  });

  it("does not fire when staying inside or exiting without onExit*", () => {
    const state = baseState();
    expect(
      checkRegionEntries(
        { x: 50, y: 50 },
        { x: 55, y: 55 },
        room,
        state
      )
    ).toEqual({});
    expect(
      checkRegionEntries(
        { x: 50, y: 50 },
        { x: 10, y: 10 },
        room,
        state
      )
    ).toEqual({});
  });

  it("fires onExitFlag and onExitActions when leaving", () => {
    const exitRoom: Room = {
      ...room,
      regions: [
        {
          ...region,
          onExitFlag: "left_trap",
          onExitActions: [
            { op: "message", text: "You step off." },
            { op: "sound", key: "click" },
          ],
        },
      ],
    };
    const state = baseState();
    const leave = checkRegionEntries(
      { x: 50, y: 50 },
      { x: 10, y: 10 },
      exitRoom,
      state
    );
    expect(leave.flags?.left_trap).toBe(true);
    expect(leave.message).toBe("You step off.");
    expect(leave.sounds).toEqual(["click"]);
  });

  it("emits region.juice on enter via sanitizeJuiceCue", () => {
    const juiceRoom: Room = {
      ...room,
      regions: [{ ...region, everyEnter: true, juice: "success" }],
    };
    const hit = checkRegionEntries(
      { x: 10, y: 10 },
      { x: 50, y: 50 },
      juiceRoom,
      baseState()
    );
    expect(hit.juices?.length).toBe(1);
    expect(hit.juices?.[0]?.burst).toBe("stars");
  });

  it("runs onEnterActions with juice/cutscene side effects", () => {
    const actionRoom: Room = {
      ...room,
      regions: [
        {
          id: "zone",
          x: 40,
          y: 40,
          width: 20,
          height: 20,
          everyEnter: true,
          onEnterActions: [
            { op: "setFlag", flag: "zoned" },
            { op: "juice", preset: "pickup" },
            { op: "cutscene", id: "intro" },
            { op: "haptic", style: "medium" },
          ],
        },
      ],
    };
    const hit = checkRegionEntries(
      { x: 10, y: 10 },
      { x: 50, y: 50 },
      actionRoom,
      baseState()
    );
    expect(hit.flags?.zoned).toBe(true);
    expect(hit.cutsceneId).toBe("intro");
    expect(hit.haptics).toEqual(["medium"]);
    expect(hit.juices?.length).toBe(1);
  });

  it("enter once still gates onEnterActions; exit every leave", () => {
    const both: Room = {
      ...room,
      regions: [
        {
          id: "gate",
          x: 40,
          y: 40,
          width: 20,
          height: 20,
          onEnterActions: [{ op: "setFlag", flag: "in" }],
          onExitFlag: "out",
        },
      ],
    };
    const state = baseState();
    const enter = checkRegionEntries(
      { x: 10, y: 10 },
      { x: 50, y: 50 },
      both,
      state
    );
    expect(enter.flags?.in).toBe(true);
    const again = checkRegionEntries(
      { x: 10, y: 10 },
      { x: 50, y: 50 },
      both,
      { ...state, flags: enter.flags! }
    );
    expect(again.flags?.in).toBeUndefined();

    const leave1 = checkRegionEntries(
      { x: 50, y: 50 },
      { x: 10, y: 10 },
      both,
      { ...state, flags: enter.flags! }
    );
    expect(leave1.flags?.out).toBe(true);
    const leave2 = checkRegionEntries(
      { x: 50, y: 50 },
      { x: 10, y: 10 },
      both,
      { ...state, flags: { ...enter.flags!, out: false } }
    );
    expect(leave2.flags?.out).toBe(true);
  });
});
