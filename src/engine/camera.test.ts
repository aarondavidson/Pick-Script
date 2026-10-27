import { describe, expect, it } from "vitest";
import {
  MAX_CAMERA_DURATION_MS,
  clampZoom,
  easeInOut,
  easeLinear,
  followCamera,
  panTo,
  setCameraFollow,
  stepCameraEase,
  updateFollowCamera,
  zoomTo,
} from "./camera";
import type { CameraState, RoomSize } from "./types";

const WIDE: RoomSize = { width: 200, height: 100 };

function cam(partial: Partial<CameraState> = {}): CameraState {
  return {
    x: 50,
    y: 50,
    followActorId: "player",
    zoom: 1,
    ...partial,
  };
}

describe("followCamera clamp to roomSize", () => {
  it("pins to center when room fits the viewport", () => {
    expect(followCamera({ x: 10, y: 90 }, { width: 100, height: 100 })).toEqual(
      { x: 50, y: 50 }
    );
  });

  it("clamps focus so the viewport stays inside a wide room", () => {
    // halfViewX = (100/200)*50 = 25 → focus in [25, 75]
    expect(followCamera({ x: 0, y: 50 }, WIDE)).toEqual({ x: 25, y: 50 });
    expect(followCamera({ x: 100, y: 50 }, WIDE)).toEqual({ x: 75, y: 50 });
    expect(followCamera({ x: 50, y: 50 }, WIDE)).toEqual({ x: 50, y: 50 });
  });

  it("tightens clamp when zoomed in", () => {
    // halfViewX = (100/200)*(50/2) = 12.5 → [12.5, 87.5]
    const c = followCamera({ x: 0, y: 50 }, WIDE, 2);
    expect(c.x).toBeCloseTo(12.5);
    expect(c.y).toBe(50);
  });
});

describe("panTo / zoomTo", () => {
  it("panTo clamps and clears follow", () => {
    const next = panTo(cam(), 0, 50, WIDE);
    expect(next.followActorId).toBeNull();
    expect(next.x).toBe(25);
    expect(next.y).toBe(50);
    expect(next.ease).toBeUndefined();
  });

  it("panTo with duration stores an ease", () => {
    const next = panTo(cam({ x: 50 }), 100, 50, WIDE, 500);
    expect(next.ease?.toX).toBe(75);
    expect(next.ease?.durationMs).toBe(500);
    expect(next.followActorId).toBeNull();
  });

  it("zoomTo clamps scale", () => {
    expect(zoomTo(cam(), 99, WIDE).zoom).toBe(clampZoom(99));
    expect(zoomTo(cam(), 0, WIDE).zoom).toBe(clampZoom(0));
  });

  it("rejects non-finite pan and caps ease duration", () => {
    const next = panTo(
      cam({ x: 40, y: 50 }),
      Number.NaN,
      50,
      WIDE,
      Number.POSITIVE_INFINITY
    );
    expect(Number.isFinite(next.x)).toBe(true);
    expect(Number.isFinite(next.y)).toBe(true);
    expect(next.ease?.durationMs).toBe(MAX_CAMERA_DURATION_MS);
    const snapped = panTo(cam(), 10, Number.NaN, { width: 100, height: 100 });
    expect(snapped.x).toBe(50);
    expect(snapped.y).toBe(50);
    expect(snapped.ease).toBeUndefined();
  });

  it("does not follow __proto__ actor ids", () => {
    const stuck = setCameraFollow(cam(), "__proto__");
    expect(stuck.followActorId).toBe("player");
    const cleared = setCameraFollow(cam(), null);
    expect(cleared.followActorId).toBeNull();
    const actors = {
      player: { id: "player", roomId: "r", x: 10, y: 20, facing: "right" as const, visible: true },
    };
    const followed = updateFollowCamera(
      cam({ followActorId: "__proto__", x: 40, y: 50 }),
      actors,
      WIDE
    );
    expect(Number.isFinite(followed.x)).toBe(true);
    expect(Number.isFinite(followed.y)).toBe(true);
    expect(followed.x).not.toBeNaN();
  });
});

describe("ease helpers + stepCameraEase", () => {
  it("easeLinear / easeInOut interpolate", () => {
    expect(easeLinear(0, 10, 0.5)).toBe(5);
    expect(easeInOut(0, 10, 0)).toBe(0);
    expect(easeInOut(0, 10, 1)).toBe(10);
    expect(easeInOut(0, 10, 0.5)).toBe(5);
  });

  it("stepCameraEase completes and clears ease", () => {
    const started = panTo(cam({ x: 50 }), 100, 50, WIDE, 200);
    const mid = stepCameraEase(started, 100);
    expect(mid.ease).toBeDefined();
    expect(mid.x).toBeGreaterThan(50);
    const done = stepCameraEase(mid, 200);
    expect(done.ease).toBeUndefined();
    expect(done.x).toBe(75);
  });
});
