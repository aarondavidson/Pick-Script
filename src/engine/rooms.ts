import type { GameState, Room, RoomExit, StatePatch } from "./types";
import { applyStatePatch } from "./state";
import { putActor } from "./actors";
import { followCamera, getRoomSize } from "./camera";

export function getRoom(
  rooms: Record<string, Room>,
  roomId: string
): Room | null {
  return rooms[roomId] ?? null;
}

export function getVisibleHotspots(room: Room, state: GameState) {
  return room.hotspots.filter((h) => !h.visible || h.visible(state));
}

export interface TravelResult {
  ok: boolean;
  message?: string;
  nextState?: GameState;
  to?: string;
}

/**
 * Attempt to leave current room via an exit.
 * Order: blocked check → source onExit (EXCD) → move ego → destination onEnter (ENCD).
 */
export function travelTo(
  rooms: Record<string, Room>,
  state: GameState,
  exit: RoomExit
): TravelResult {
  if (exit.blocked?.(state)) {
    return {
      ok: false,
      message: exit.blockedMessage ?? "You can't go that way right now.",
    };
  }

  const destination = rooms[exit.to];
  if (!destination) {
    return { ok: false, message: "That path leads nowhere." };
  }

  const source = rooms[state.currentLocation];
  let next = state;

  // EXCD — leave current room
  if (source?.onExit) {
    const exitPatch: StatePatch = source.onExit(next) ?? {};
    next = applyStatePatch(next, exitPatch);
  }

  const visitedLocations = [
    ...new Set([...next.visitedLocations, exit.to]),
  ];

  next = applyStatePatch(next, {
    currentLocation: exit.to,
    visitedLocations,
  });

  // Place ego at destination entry point
  if (next.egoId) {
    const entry = destination.entryPoint ?? { x: 50, y: 75 };
    next = applyStatePatch(
      next,
      putActor(next, next.egoId, exit.to, entry.x, entry.y)
    );
    const roomSize = getRoomSize(destination);
    const ego = next.actors[next.egoId];
    const focus = followCamera({ x: ego.x, y: ego.y }, roomSize);
    next = applyStatePatch(next, {
      camera: {
        x: focus.x,
        y: focus.y,
        followActorId: next.egoId,
      },
    });
  }

  // ENCD — enter destination
  if (destination.onEnter) {
    const enterPatch: StatePatch = destination.onEnter(next) ?? {};
    next = applyStatePatch(next, enterPatch);
  }

  return { ok: true, nextState: next, to: exit.to };
}

export function listExits(room: Room): RoomExit[] {
  return room.exits ?? [];
}
