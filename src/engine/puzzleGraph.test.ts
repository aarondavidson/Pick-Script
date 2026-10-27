import { describe, expect, it } from "vitest";
import { createEmptyJsonPack } from "@/engine/jsonPack";
import { applyGetItemKit, applyLockedExitKit } from "@/authoring/puzzleKits";
import { createGameFromJson } from "@/engine/jsonPack";
import { atticStudyGame } from "@/games/attic-study/manifest";
import {
  blockedGatePathEdgeIds,
  buildPuzzleGraph,
  buildPuzzleGraphFromGameDefinition,
  gatedExitsForSoftLockFlag,
  parseExitNodeId,
  type PuzzleGraphEdge,
  type PuzzleGraphNode,
} from "@/engine/puzzleGraph";

describe("buildPuzzleGraph", () => {
  it("maps key pickup → got_* flag → gated exit (key unlocks door)", () => {
    let doc = createEmptyJsonPack({
      id: "key-door",
      title: "Key Door",
    });
    const startId = doc.startRoom;
    doc = applyGetItemKit(doc, startId, {
      hotspotId: "key_desk",
      hotspotName: "Desk",
      x: 20,
      y: 40,
      width: 18,
      height: 22,
      itemId: "brass_key",
      itemName: "Brass Key",
      itemDescription: "Opens the door.",
      lookText: "A key in the drawer.",
      pickupMessage: "You take the brass key.",
    });
    const hallId = "hall";
    doc = {
      ...doc,
      rooms: {
        ...doc.rooms,
        [hallId]: {
          id: hallId,
          name: "Hall",
          description: "Beyond the door.",
          image: "",
          hotspots: [],
        },
      },
    };
    doc = applyLockedExitKit(doc, {
      from: startId,
      to: hallId,
      direction: "east",
      fromLabel: "Hall",
      toLabel: "Start",
      requireFlag: "got_brass_key",
      blockedMessage: "The door needs the brass key.",
    });

    const graph = buildPuzzleGraph(doc);

    const byKind = (kind: PuzzleGraphNode["kind"]) =>
      graph.nodes.filter((n) => n.kind === kind);
    const edgeKinds = (kind: PuzzleGraphEdge["kind"]) =>
      graph.edges.filter((e) => e.kind === kind);

    expect(byKind("room").map((n) => n.id)).toEqual(
      expect.arrayContaining([`room:${startId}`, `room:${hallId}`])
    );
    expect(byKind("item").some((n) => n.id === "item:brass_key")).toBe(true);
    expect(byKind("flag").some((n) => n.id === "flag:got_brass_key")).toBe(
      true
    );
    expect(byKind("exit").some((n) => n.id === `exit:${startId}→${hallId}`)).toBe(
      true
    );

    expect(edgeKinds("pickup").length).toBeGreaterThanOrEqual(1);
    expect(edgeKinds("pickup_flag").some((e) => e.to === "flag:got_brass_key")).toBe(
      true
    );
    expect(
      edgeKinds("unlocks_exit").some(
        (e) =>
          e.from === "flag:got_brass_key" &&
          e.to === `exit:${startId}→${hallId}`
      )
    ).toBe(true);
    expect(graph.truncated).toBe(false);
  });

  it("wires use-with → flag and combination → result item", () => {
    let doc = createEmptyJsonPack({ id: "uw", title: "UW" });
    const start = doc.startRoom;
    doc = {
      ...doc,
      items: {
        key: { id: "key", name: "Key", description: "A key" },
        lock: { id: "lock", name: "Lock", description: "A lock" },
        open_lock: {
          id: "open_lock",
          name: "Open lock",
          description: "An unlocked lock",
        },
      },
      combinations: {
        "key+lock": {
          items: ["key", "lock"],
          result: {
            id: "open_lock",
            name: "Open lock",
            description: "An unlocked lock",
          },
          successMessage: "Unlocked.",
        },
      },
      rooms: {
        ...doc.rooms,
        [start]: {
          ...doc.rooms[start]!,
          hotspots: [
            {
              id: "chest",
              name: "Chest",
              x: 40,
              y: 40,
              width: 20,
              height: 20,
              kind: "use-with-target",
              useWith: [
                {
                  itemId: "key",
                  setFlag: "chest_open",
                  message: "It opens.",
                },
              ],
            },
          ],
        },
      },
    };

    const graph = buildPuzzleGraph(doc);
    expect(
      graph.edges.some(
        (e) =>
          e.kind === "sets_flag" &&
          e.from === `hotspot:${start}/chest` &&
          e.to === "flag:chest_open"
      )
    ).toBe(true);
    expect(
      graph.edges.some(
        (e) =>
          e.kind === "combination" &&
          e.from === "item:key" &&
          e.to === "item:open_lock"
      )
    ).toBe(true);
  });

  it("marks soft-lock flags and respects node/edge caps", () => {
    const doc = createEmptyJsonPack({ id: "cap", title: "Cap" });
    // Bare gated link — no setter / no initialFlags — soft-lock via flagsNeverSet
    const gated = {
      ...doc,
      rooms: {
        ...doc.rooms,
        other: {
          id: "other",
          name: "Other",
          image: "",
          hotspots: [],
        },
      },
      links: [
        {
          from: doc.startRoom,
          to: "other",
          fromLabel: "Other",
          toLabel: "Start",
          requireFlag: "never_set_flag",
        },
      ],
      initialFlags: {},
    };

    const graph = buildPuzzleGraph(gated);
    const flag = graph.nodes.find((n) => n.id === "flag:never_set_flag");
    expect(flag?.softLock).toBe(true);

    const exits = gatedExitsForSoftLockFlag(graph, "never_set_flag");
    expect(exits).toEqual([
      {
        from: doc.startRoom,
        to: "other",
        exitNodeId: `exit:${doc.startRoom}→other`,
      },
    ]);
    expect(parseExitNodeId(`exit:${doc.startRoom}→other`)).toEqual({
      from: doc.startRoom,
      to: "other",
    });
    const path = blockedGatePathEdgeIds(graph, "never_set_flag");
    expect(path.size).toBeGreaterThan(0);

    const tiny = buildPuzzleGraph(gated, { maxNodes: 2, maxEdges: 1 });
    expect(tiny.nodes.length).toBeLessThanOrEqual(2);
    expect(tiny.edges.length).toBeLessThanOrEqual(1);
    expect(tiny.truncated).toBe(true);
  });

  it("buildPuzzleGraphFromGameDefinition mirrors JSON key→door graph", () => {
    let doc = createEmptyJsonPack({
      id: "key-door-def",
      title: "Key Door Def",
    });
    const startId = doc.startRoom;
    doc = applyGetItemKit(doc, startId, {
      hotspotId: "key_desk",
      hotspotName: "Desk",
      x: 20,
      y: 40,
      width: 18,
      height: 22,
      itemId: "brass_key",
      itemName: "Brass Key",
      pickupMessage: "You take the brass key.",
    });
    doc = {
      ...doc,
      rooms: {
        ...doc.rooms,
        hall: {
          id: "hall",
          name: "Hall",
          description: "Beyond.",
          image: "",
          hotspots: [],
        },
      },
    };
    doc = applyLockedExitKit(doc, {
      from: startId,
      to: "hall",
      direction: "east",
      fromLabel: "Hall",
      toLabel: "Start",
      requireFlag: "got_brass_key",
      blockedMessage: "Locked.",
    });

    const def = createGameFromJson(doc);
    const graph = buildPuzzleGraphFromGameDefinition(def);
    expect(graph.nodes.some((n) => n.id === "item:brass_key")).toBe(true);
    expect(graph.nodes.some((n) => n.id === "flag:got_brass_key")).toBe(true);
    expect(
      graph.edges.some(
        (e) =>
          e.kind === "unlocks_exit" &&
          e.from === "flag:got_brass_key" &&
          e.to === `exit:${startId}→hall`
      )
    ).toBe(true);
    expect(graph.nodes.find((n) => n.id === "flag:got_brass_key")?.softLock).not.toBe(
      true
    );
  });

  it("buildPuzzleGraphFromGameDefinition works on TS attic-study pack", () => {
    const graph = buildPuzzleGraphFromGameDefinition(atticStudyGame);
    expect(graph.nodes.some((n) => n.kind === "room")).toBe(true);
    expect(graph.nodes.some((n) => n.kind === "hotspot")).toBe(true);
    // Desk onInteract sets gotKey
    expect(
      graph.edges.some(
        (e) => e.kind === "sets_flag" && e.to === "flag:gotKey"
      )
    ).toBe(true);
  });

  it("links region/timer → flag and hint → hotspot", () => {
    let doc = createEmptyJsonPack({ id: "rt", title: "RT" });
    const start = doc.startRoom;
    doc = {
      ...doc,
      hints: [
        {
          id: "h1",
          title: "Try the pedestal",
          tiers: ["Look around.", "The pedestal."],
          untilFlag: "pedestal_done",
          hotspotId: "pedestal",
        },
      ],
      rooms: {
        ...doc.rooms,
        [start]: {
          ...doc.rooms[start]!,
          hotspots: [
            {
              id: "pedestal",
              name: "Pedestal",
              x: 50,
              y: 50,
              width: 10,
              height: 10,
              kind: "interact",
            },
          ],
          regions: [
            {
              id: "zone",
              x: 10,
              y: 10,
              width: 20,
              height: 20,
              setFlag: "entered_zone",
            },
          ],
          timers: [
            {
              id: "tick",
              afterMs: 3000,
              setFlag: "waited",
            },
          ],
        },
      },
    };

    const graph = buildPuzzleGraph(doc);
    expect(
      graph.edges.some(
        (e) =>
          e.kind === "region_flag" && e.to === "flag:entered_zone"
      )
    ).toBe(true);
    expect(
      graph.edges.some((e) => e.kind === "timer_flag" && e.to === "flag:waited")
    ).toBe(true);
    expect(
      graph.edges.some(
        (e) =>
          e.kind === "hint_hotspot" &&
          e.from === "hint:h1" &&
          e.to === `hotspot:${start}/pedestal`
      )
    ).toBe(true);
  });
});
