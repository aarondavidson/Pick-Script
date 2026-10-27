import type { Room, RoomExit, RoomTransition } from "./types";
import type { GameDefinition } from "./definition";

export type TransitionPhase = "idle" | "out" | "in";

export interface TransitionRuntime {
  phase: TransitionPhase;
  kind: RoomTransition["kind"];
  durationMs: number;
  /** Direction of travel for slide defaults */
  direction?: string;
  fromRoomId?: string;
  toRoomId?: string;
}

const DEFAULT_TRANSITION: RoomTransition = {
  kind: "fade",
  durationMs: 350,
};

export function resolveTransitionOut(
  definition: GameDefinition,
  fromRoom: Room | null | undefined,
  exit?: RoomExit
): RoomTransition {
  return (
    fromRoom?.transitionOut ??
    definition.defaultTransition ??
    slideForDirection(exit?.direction) ??
    DEFAULT_TRANSITION
  );
}

export function resolveTransitionIn(
  definition: GameDefinition,
  toRoom: Room | null | undefined,
  exit?: RoomExit
): RoomTransition {
  return (
    toRoom?.transitionIn ??
    definition.defaultTransition ??
    slideForDirection(exit?.direction, true) ??
    DEFAULT_TRANSITION
  );
}

function slideForDirection(
  direction?: string,
  entering = false
): RoomTransition | null {
  if (!direction) return null;
  const map: Record<string, RoomTransition["kind"]> = entering
    ? {
        north: "slide-up",
        south: "slide-down",
        east: "slide-right",
        west: "slide-left",
      }
    : {
        north: "slide-up",
        south: "slide-down",
        east: "slide-left",
        west: "slide-right",
      };
  const kind = map[direction];
  if (!kind) return null;
  return { kind, durationMs: 320 };
}

export function beginTransitionOut(
  kind: RoomTransition["kind"],
  durationMs: number,
  meta: { direction?: string; fromRoomId?: string; toRoomId?: string }
): TransitionRuntime {
  return {
    phase: kind === "none" ? "idle" : "out",
    kind,
    durationMs,
    ...meta,
  };
}
