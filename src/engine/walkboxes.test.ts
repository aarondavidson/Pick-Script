import { describe, expect, it } from "vitest";
import type { Room, Walkbox } from "./types";
import {
  clampToWalkable,
  findWalkPath,
  floorTransitionPatchAt,
  getWalkFloor,
  pointInPolygon,
  pointInWalkbox,
  portalMidpoint,
  roomHasWalkboxes,
  sanitizeWalkboxList,
  walkboxesForFloor,
} from "./walkboxes";
import { runPackActions } from "./packActions";
import { createEmptyJsonPack, createGameFromJson } from "./jsonPack";
import { createGame } from "./createGame";

/** Floor strip along the bottom of a room. */
const FLOOR: Walkbox = { id: "floor", x: 10, y: 60, width: 80, height: 30 };

/** Left platform adjacent to FLOOR (shares edge at x=10). */
const LEFT: Walkbox = { id: "left", x: 0, y: 60, width: 10, height: 30 };

/** Right platform adjacent to FLOOR (shares edge at x=90). */
const RIGHT: Walkbox = { id: "right", x: 90, y: 60, width: 10, height: 30 };

/** Island far above — not adjacent to FLOOR. */
const ISLAND: Walkbox = { id: "island", x: 40, y: 10, width: 20, height: 15 };

describe("pointInWalkbox", () => {
  it("returns true for points inside and on the edge", () => {
    expect(pointInWalkbox(50, 75, FLOOR)).toBe(true);
    expect(pointInWalkbox(10, 60, FLOOR)).toBe(true); // top-left corner
    expect(pointInWalkbox(90, 90, FLOOR)).toBe(true); // bottom-right corner
  });

  it("returns false for points outside", () => {
    expect(pointInWalkbox(5, 75, FLOOR)).toBe(false);
    expect(pointInWalkbox(50, 50, FLOOR)).toBe(false);
    expect(pointInWalkbox(95, 75, FLOOR)).toBe(false);
  });
});

describe("clampToWalkable", () => {
  it("passes through points already inside a box", () => {
    expect(clampToWalkable(50, 75, [FLOOR])).toEqual({ x: 50, y: 75 });
  });

  it("clamps outside points to the nearest box edge", () => {
    const clamped = clampToWalkable(50, 40, [FLOOR]);
    expect(clamped.x).toBe(50);
    expect(clamped.y).toBe(60); // top edge of FLOOR
  });

  it("treats empty boxes as free movement", () => {
    expect(clampToWalkable(12, 34, [])).toEqual({ x: 12, y: 34 });
    expect(clampToWalkable(12, 34, undefined)).toEqual({ x: 12, y: 34 });
  });
});

describe("findWalkPath", () => {
  it("returns a direct path when start and end share a box", () => {
    const path = findWalkPath({ x: 20, y: 70 }, { x: 70, y: 80 }, [FLOOR]);
    expect(path).toEqual([{ x: 70, y: 80 }]);
  });

  it("walks straight across boxes when the line of sight is clear", () => {
    const boxes = [LEFT, FLOOR, RIGHT];
    const path = findWalkPath({ x: 5, y: 75 }, { x: 95, y: 75 }, boxes);
    expect(path).toEqual([{ x: 95, y: 75 }]);
  });

  it("keeps the portal corner when the straight line is blocked", () => {
    const tall: Walkbox = { id: "tall", x: 0, y: 0, width: 20, height: 50 };
    const wide: Walkbox = { id: "wide", x: 0, y: 50, width: 100, height: 20 };
    const path = findWalkPath({ x: 10, y: 10 }, { x: 90, y: 60 }, [tall, wide]);
    expect(path).toEqual([
      { x: 10, y: 50 },
      { x: 90, y: 60 },
    ]);
  });

  it("stops at the closest reachable point when the target is unreachable", () => {
    const boxes = [FLOOR, ISLAND];
    const path = findWalkPath({ x: 50, y: 75 }, { x: 50, y: 15 }, boxes);
    // Island isn't connected — stop at FLOOR's top edge, don't cross the gap
    expect(path).toEqual([{ x: 50, y: 60 }]);
  });

  it("returns a single waypoint when no boxes are defined", () => {
    expect(findWalkPath({ x: 1, y: 2 }, { x: 3, y: 4 }, undefined)).toEqual([
      { x: 3, y: 4 },
    ]);
  });
});

describe("roomHasWalkboxes", () => {
  it("detects presence of walkboxes on a room", () => {
    const withBoxes = { walkboxes: [FLOOR] } as Room;
    const empty = { walkboxes: [] } as unknown as Room;
    expect(roomHasWalkboxes(withBoxes)).toBe(true);
    expect(roomHasWalkboxes(empty)).toBe(false);
    expect(roomHasWalkboxes(null)).toBe(false);
    expect(roomHasWalkboxes(undefined)).toBe(false);
  });
});

/** Two overlapping diamond-ish polygons sharing an edge zone. */
const POLY_A: Walkbox = {
  id: "poly_a",
  x: 0,
  y: 50,
  width: 55,
  height: 40,
  points: [
    { x: 10, y: 60 },
    { x: 50, y: 55 },
    { x: 50, y: 85 },
    { x: 10, y: 80 },
  ],
};

const POLY_B: Walkbox = {
  id: "poly_b",
  x: 45,
  y: 50,
  width: 55,
  height: 40,
  points: [
    { x: 50, y: 55 },
    { x: 90, y: 60 },
    { x: 90, y: 80 },
    { x: 50, y: 85 },
  ],
};

describe("polygon walkboxes", () => {
  it("uses point-in-polygon when points length >= 3", () => {
    expect(pointInWalkbox(30, 70, POLY_A)).toBe(true);
    expect(pointInPolygon(30, 70, POLY_A.points!)).toBe(true);
    // Inside AABB but outside diamond notch (above the top edge of poly)
    expect(pointInWalkbox(30, 52, POLY_A)).toBe(false);
  });

  it("falls back to AABB when points are absent or too short", () => {
    expect(pointInWalkbox(50, 75, FLOOR)).toBe(true);
    const short: Walkbox = {
      ...FLOOR,
      points: [
        { x: 10, y: 60 },
        { x: 90, y: 60 },
      ],
    };
    expect(pointInWalkbox(50, 75, short)).toBe(true);
  });

  it("paths across two adjacent polygon boxes via portal midpoint", () => {
    const path = findWalkPath({ x: 20, y: 70 }, { x: 80, y: 70 }, [
      POLY_A,
      POLY_B,
    ]);
    // Clear line of sight through both polygons — no detour via the portal
    expect(path).toEqual([{ x: 80, y: 70 }]);
  });
});

describe("portal midpoints", () => {
  it("uses the midpoint of the shared vertical edge", () => {
    const portal = portalMidpoint(LEFT, FLOOR);
    expect(portal.x).toBe(10);
    expect(portal.y).toBe(75);
  });

  it("keeps portal waypoints that touch a floorTransition box", () => {
    const stairs: Walkbox = { ...FLOOR, floorTransition: { toFloor: 1 } };
    const path = findWalkPath({ x: 5, y: 75 }, { x: 95, y: 75 }, [
      LEFT,
      stairs,
      RIGHT,
    ]);
    expect(path).toEqual([
      { x: 10, y: 75 }, // LEFT↔stairs portal
      { x: 90, y: 75 }, // stairs↔RIGHT portal
      { x: 95, y: 75 },
    ]);
  });
});

describe("explicit walkbox links", () => {
  it("connects non-adjacent boxes when links are set", () => {
    const a: Walkbox = {
      id: "a",
      x: 0,
      y: 60,
      width: 20,
      height: 20,
      links: ["b"],
    };
    const b: Walkbox = {
      id: "b",
      x: 70,
      y: 60,
      width: 20,
      height: 20,
    };
    const path = findWalkPath({ x: 10, y: 70 }, { x: 80, y: 70 }, [a, b]);
    expect(path.length).toBeGreaterThanOrEqual(2);
    expect(path[path.length - 1]).toEqual({ x: 80, y: 70 });
    const portal = portalMidpoint(a, b);
    expect(path.some((p) => p.x === portal.x && p.y === portal.y)).toBe(true);
  });

  it("ignores AABB neighbors when links override", () => {
    const leftLinked: Walkbox = { ...LEFT, links: ["island"] };
    const path = findWalkPath({ x: 5, y: 75 }, { x: 50, y: 75 }, [
      leftLinked,
      FLOOR,
      ISLAND,
    ]);
    // LEFT only links to the island, so FLOOR is unreachable: stop at LEFT's edge
    expect(path).toEqual([{ x: 10, y: 75 }]);
  });

  it("sanitizes link ids and drops unsafe keys", () => {
    const sanitized = sanitizeWalkboxList([
      {
        id: "ok",
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        links: ["neighbor", "__proto__", "", 12, "good_id"],
      },
    ]);
    expect(sanitized?.[0].links).toEqual(["neighbor", "good_id"]);
  });
});

describe("multi-floor walkboxes", () => {
  const GROUND: Walkbox = {
    id: "ground",
    x: 10,
    y: 60,
    width: 40,
    height: 30,
    floor: 0,
  };
  const UPPER: Walkbox = {
    id: "upper",
    x: 50,
    y: 60,
    width: 40,
    height: 30,
    floor: 1,
  };
  const LADDER: Walkbox = {
    id: "ladder",
    x: 40,
    y: 60,
    width: 20,
    height: 30,
    floor: 0,
    floorTransition: { toFloor: 1 },
  };

  it("does not path across floors without a floor change", () => {
    const boxes = [GROUND, UPPER];
    const floor0 = walkboxesForFloor(boxes, 0)!;
    expect(floor0).toHaveLength(1);
    const path = findWalkPath(
      { x: 20, y: 75 },
      { x: 70, y: 75 },
      boxes,
      { floor: 0 }
    );
    expect(path[path.length - 1]).toEqual(clampToWalkable(70, 75, floor0));
  });

  it("paths on the new floor after floorTransition sets walkFloor", () => {
    const boxes = [GROUND, LADDER, UPPER];
    const onGround = findWalkPath(
      { x: 20, y: 75 },
      { x: 70, y: 75 },
      boxes,
      { floor: 0 }
    );
    expect(onGround[onGround.length - 1]).toEqual(
      clampToWalkable(70, 75, walkboxesForFloor(boxes, 0))
    );

    const arrive = floorTransitionPatchAt(50, 75, boxes, { vars: {} });
    expect(arrive?.vars.walkFloor).toBe(1);

    const onUpper = findWalkPath(
      { x: 55, y: 75 },
      { x: 80, y: 75 },
      boxes,
      { floor: 1 }
    );
    expect(onUpper[onUpper.length - 1]).toEqual({ x: 80, y: 75 });
  });

  it("getWalkFloor prefers vars.walkFloor over room.activeFloor", () => {
    expect(getWalkFloor({ vars: { walkFloor: 2 } }, { activeFloor: 1 })).toBe(
      2
    );
    expect(getWalkFloor({ vars: {} }, { activeFloor: 3 })).toBe(3);
    expect(getWalkFloor({ vars: undefined }, null)).toBe(0);
  });

  it("setWalkFloor PackAction writes vars.walkFloor", () => {
    const state = createGame(
      createGameFromJson(createEmptyJsonPack({ id: "wf", title: "WF" }))
    ).createInitialState();
    const result = runPackActions([{ op: "setWalkFloor", floor: 2 }], state);
    expect(result.patch.vars?.walkFloor).toBe(2);
  });
});
