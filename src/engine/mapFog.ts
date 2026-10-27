/**
 * Optional map fog / progression reveal.
 * When `mapFog` is omitted or `enabled: false`, maps keep visit-based behavior.
 */

import type { GameDefinition } from "./definition";
import type { GameState } from "./types";

/** Map / fast-travel policy shared with MapDialog + deploy lock. */
export function resolveMapTravelPolicy(definition: {
  mapFastTravel?: boolean | { enabled?: boolean; requireVisited?: boolean };
  rooms: Record<string, unknown>;
}): { enabled: boolean; requireVisited: boolean } {
  const raw = definition.mapFastTravel;
  if (raw === false) return { enabled: false, requireVisited: true };
  if (raw === true || raw === undefined) {
    const roomCount = Object.keys(definition.rooms).length;
    return {
      enabled: roomCount > 1 || raw === true,
      requireVisited: true,
    };
  }
  return {
    enabled: raw.enabled !== false,
    requireVisited: raw.requireVisited !== false,
  };
}

/** Pack / definition fog config (optional). */
export interface MapFogConfig {
  /** Master switch — omit or false = no fog layer */
  enabled?: boolean;
  /** Visiting a room clears its fog (default true when enabled) */
  clearOnVisit?: boolean;
  /** roomId → flag that reveals name/description on the map */
  revealByFlag?: Record<string, string>;
  /**
   * roomId → flag required for fast-travel once revealed.
   * Lets players see a locked district without teleporting there yet.
   */
  travelByFlag?: Record<string, string>;
  /** Rooms that never fog (defaults to [startRoom] when enabled) */
  alwaysKnown?: string[];
}

export type MapRoomVisibility = "fogged" | "known";

export interface MapRoomStatus {
  roomId: string;
  visibility: MapRoomVisibility;
  /** Fast-travel allowed */
  canTravel: boolean;
  /** Why travel is blocked (when known or fogged) */
  travelBlockedReason?: string;
}

function activeFog(definition: GameDefinition): MapFogConfig | null {
  const fog = definition.mapFog;
  if (!fog || fog.enabled === false) return null;
  return { clearOnVisit: true, ...fog, enabled: true };
}

function alwaysKnownIds(
  definition: GameDefinition,
  fog: MapFogConfig
): Set<string> {
  const list = fog.alwaysKnown?.length
    ? fog.alwaysKnown
    : [definition.startRoom];
  return new Set(list);
}

/** Fog cleared — show real name / description. */
export function isMapRoomRevealed(
  definition: GameDefinition,
  state: GameState,
  roomId: string
): boolean {
  const fog = activeFog(definition);
  if (!fog) {
    const policy = resolveMapTravelPolicy(definition);
    if (!policy.requireVisited) return true;
    return state.visitedLocations.includes(roomId);
  }

  if (alwaysKnownIds(definition, fog).has(roomId)) return true;
  if (fog.clearOnVisit !== false && state.visitedLocations.includes(roomId)) {
    return true;
  }
  const flag = fog.revealByFlag?.[roomId];
  if (flag && state.flags[flag]) return true;
  return false;
}

/**
 * Map tile status for one room.
 * Fogged = silhouette / “???” until progression or visit.
 * Known + !canTravel = visible doorway/district that stays sealed.
 */
export function getMapRoomStatus(
  definition: GameDefinition,
  state: GameState,
  roomId: string
): MapRoomStatus {
  if (!definition.rooms[roomId]) {
    return {
      roomId,
      visibility: "fogged",
      canTravel: false,
      travelBlockedReason: "Unknown place",
    };
  }

  if (roomId === state.currentLocation) {
    return { roomId, visibility: "known", canTravel: false };
  }

  const fog = activeFog(definition);
  const policy = resolveMapTravelPolicy(definition);
  const revealed = isMapRoomRevealed(definition, state, roomId);

  if (!revealed) {
    return {
      roomId,
      visibility: "fogged",
      canTravel: false,
      travelBlockedReason: fog
        ? "Shrouded — explore or progress the story"
        : "Not visited yet",
    };
  }

  if (!policy.enabled) {
    return {
      roomId,
      visibility: "known",
      canTravel: false,
      travelBlockedReason: "Map travel disabled",
    };
  }

  const travelFlag = fog?.travelByFlag?.[roomId];
  if (travelFlag && !state.flags[travelFlag]) {
    return {
      roomId,
      visibility: "known",
      canTravel: false,
      travelBlockedReason: "Path sealed — come back later",
    };
  }

  const visited = state.visitedLocations.includes(roomId);
  const flagReveal =
    !!fog?.revealByFlag?.[roomId] &&
    !!state.flags[fog.revealByFlag[roomId]!];

  // Travel if: open-world, or visited, or story-revealed (revealByFlag)
  let canTravel = true;
  if (policy.requireVisited && !visited && !flagReveal) {
    canTravel = false;
  }

  return {
    roomId,
    visibility: "known",
    canTravel,
    travelBlockedReason: canTravel ? undefined : "Not visited yet",
  };
}

export function canMapTravelTo(
  definition: GameDefinition,
  state: GameState,
  roomId: string
): boolean {
  return getMapRoomStatus(definition, state, roomId).canTravel;
}
