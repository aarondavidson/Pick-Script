import type { Room, Walkbox } from "./types";
import type { GameDefinition } from "./definition";

const DEFAULT_FLOOR: Walkbox = {
  id: "floor",
  x: 5,
  y: 55,
  width: 90,
  height: 40,
  scale: 1,
};

/** Inject a default floor walkbox so ego walk-to works when authors omit boxes. */
export function ensureRoomWalkboxes(room: Room): Room {
  if (room.walkboxes?.length) return room;
  return { ...room, walkboxes: [{ ...DEFAULT_FLOOR }] };
}

/** Normalize all rooms when the pack has a controllable ego. */
export function normalizeDefinitionWalkboxes(
  definition: GameDefinition
): GameDefinition {
  if (!definition.egoId && !definition.initialActors) return definition;
  const rooms: Record<string, Room> = {};
  for (const [id, room] of Object.entries(definition.rooms)) {
    rooms[id] = ensureRoomWalkboxes(room);
  }
  return { ...definition, rooms };
}
