import { describe, expect, it } from "vitest";
import {
  formatFlagsSnippet,
  formatHotspotCoordSnippet,
  formatHotspotObjectSnippet,
  listExitRows,
  listTrueFlags,
} from "./roomAuthorInfo";
import type { GameState, Hotspot, Room } from "@/engine/types";

const baseState = {
  currentLocation: "attic",
  flags: { gotKey: true, chestOpen: false, unused: false },
  inventory: [{ id: "attic_key", name: "Brass Key", description: "" }],
} as unknown as GameState;

const hotspot = {
  id: "desk",
  name: "Desk",
  x: 8,
  y: 42,
  width: 32,
  height: 28,
  verbs: ["look", "use"],
  approach: { x: 28, y: 72 },
} as Hotspot;

describe("listTrueFlags", () => {
  it("returns only truthy flag keys sorted", () => {
    expect(listTrueFlags(baseState)).toEqual(["gotKey"]);
  });
});

describe("formatHotspotCoordSnippet", () => {
  it("includes name, id, location, and rounded coords", () => {
    const s = formatHotspotCoordSnippet(
      hotspot,
      { x: 8.12, y: 42.0, width: 32.5, height: 28 },
      "attic"
    );
    expect(s).toContain("Desk");
    expect(s).toContain("desk");
    expect(s).toContain("attic");
    expect(s).toContain("x: 8.1");
    expect(s).toContain("width: 32.5");
  });
});

describe("formatHotspotObjectSnippet", () => {
  it("emits a pasteable object with verbs and approach", () => {
    const s = formatHotspotObjectSnippet(hotspot, {
      x: 8,
      y: 42,
      width: 32,
      height: 28,
    });
    expect(s).toContain('id: "desk"');
    expect(s).toContain('verbs: ["look","use"]');
    expect(s).toContain("approach:");
  });
});

describe("formatFlagsSnippet", () => {
  it("includes room, true flags, and inventory ids", () => {
    const parsed = JSON.parse(formatFlagsSnippet(baseState));
    expect(parsed.room).toBe("attic");
    expect(parsed.flagsTrue).toEqual(["gotKey"]);
    expect(parsed.inventory).toEqual(["attic_key"]);
  });
});

describe("listExitRows", () => {
  it("reports blocked status from exit.blocked", () => {
    const room = {
      id: "start",
      exits: [
        {
          direction: "east",
          to: "hallway",
          label: "Hallway",
          blocked: (s: GameState) => !s.flags.gotKey,
          blockedMessage: "Locked",
        },
      ],
    } as Room;
    const locked = listExitRows(room, {
      ...baseState,
      flags: { gotKey: false },
    } as GameState);
    expect(locked[0].blocked).toBe(true);
    const open = listExitRows(room, baseState);
    expect(open[0].blocked).toBe(false);
  });
});
