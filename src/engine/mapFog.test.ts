import { describe, expect, it } from "vitest";
import { createEmptyJsonPack, createGameFromJson } from "./jsonPack";
import {
  canMapTravelTo,
  getMapRoomStatus,
  isMapRoomRevealed,
} from "./mapFog";
import { createInitialState } from "./state";
import { linkRooms } from "./exits";

describe("mapFog", () => {
  it("without mapFog, visit policy still applies", () => {
    const doc = createEmptyJsonPack({
      id: "nofog",
      title: "No Fog",
      rooms: {
        start: {
          id: "start",
          name: "Start",
          image: "https://example.com/a.jpg",
          hotspots: [],
        },
        cave: {
          id: "cave",
          name: "Cave",
          image: "https://example.com/b.jpg",
          hotspots: [],
        },
      },
      mapFastTravel: { enabled: true, requireVisited: true },
    });
    const def = createGameFromJson(doc);
    const state = createInitialState(def);
    expect(isMapRoomRevealed(def, state, "cave")).toBe(false);
    expect(canMapTravelTo(def, state, "cave")).toBe(false);

    const visited = {
      ...state,
      visitedLocations: [...state.visitedLocations, "cave"],
    };
    expect(canMapTravelTo(def, visited, "cave")).toBe(true);
  });

  it("fog clears by reveal flag and travel stays sealed until travel flag", () => {
    const doc = createEmptyJsonPack({
      id: "fogpack",
      title: "Fog",
      rooms: {
        start: {
          id: "start",
          name: "Start",
          image: "https://example.com/a.jpg",
          hotspots: [],
        },
        docks: {
          id: "docks",
          name: "Docks",
          image: "https://example.com/b.jpg",
          hotspots: [],
        },
      },
      mapFog: {
        enabled: true,
        clearOnVisit: true,
        revealByFlag: { docks: "heard_of_docks" },
        travelByFlag: { docks: "ferry_open" },
      },
      mapFastTravel: { enabled: true, requireVisited: true },
    });
    const def = createGameFromJson(doc);
    expect(def.mapFog?.enabled).toBe(true);

    let state = createInitialState(def);
    expect(getMapRoomStatus(def, state, "docks").visibility).toBe("fogged");

    state = {
      ...state,
      flags: { ...state.flags, heard_of_docks: true },
    };
    const known = getMapRoomStatus(def, state, "docks");
    expect(known.visibility).toBe("known");
    expect(known.canTravel).toBe(false);
    expect(known.travelBlockedReason).toMatch(/sealed/i);

    state = {
      ...state,
      flags: { ...state.flags, ferry_open: true },
    };
    expect(canMapTravelTo(def, state, "docks")).toBe(true);
  });

  it("compiles lockedLabel + showWhenBlocked on gated links", () => {
    const doc = createEmptyJsonPack({
      id: "gates",
      title: "Gates",
      rooms: {
        start: {
          id: "start",
          name: "Start",
          image: "https://example.com/a.jpg",
          hotspots: [],
        },
        vault: {
          id: "vault",
          name: "Vault",
          image: "https://example.com/b.jpg",
          hotspots: [],
        },
      },
      links: [
        {
          from: "start",
          to: "vault",
          direction: "north",
          fromLabel: "Vault door",
          toLabel: "Back",
          requireFlag: "vault_unlocked",
          lockedLabel: "Sealed vault door",
          showWhenBlocked: true,
          blockedMessage: "The seals hold.",
        },
      ],
    });
    const def = createGameFromJson(doc);
    const exit = def.rooms.start!.exits.find((e) => e.to === "vault");
    expect(exit?.lockedLabel).toBe("Sealed vault door");
    expect(exit?.showWhenBlocked).not.toBe(false);
    const state = createInitialState(def);
    expect(exit?.blocked?.(state)).toBe(true);

    // linkRooms helper also accepts forward locked label
    const { forward } = linkRooms("a", "b", {
      fromLabel: "Tunnel",
      toLabel: "Back",
      forwardBlocked: () => true,
      forwardLockedLabel: "Caved-in tunnel",
      forwardShowWhenBlocked: false,
    });
    expect(forward.lockedLabel).toBe("Caved-in tunnel");
    expect(forward.showWhenBlocked).toBe(false);
  });
});
