import type { GameState, StatePatch } from "./types";

/** SCUMM-style object state (0 = default/closed, 1+ = open/toggled/etc.) */
export function getObjectState(
  state: GameState,
  objectId: string,
  fallback = 0
): number {
  return state.objectStates?.[objectId] ?? fallback;
}

export function setObjectState(
  state: GameState,
  objectId: string,
  value: number
): StatePatch {
  return {
    objectStates: {
      ...(state.objectStates ?? {}),
      [objectId]: value,
    },
  };
}

export function toggleObjectState(
  state: GameState,
  objectId: string,
  a = 0,
  b = 1
): StatePatch {
  const current = getObjectState(state, objectId, a);
  return setObjectState(state, objectId, current === a ? b : a);
}

export function isObjectState(
  state: GameState,
  objectId: string,
  value: number
): boolean {
  return getObjectState(state, objectId) === value;
}
