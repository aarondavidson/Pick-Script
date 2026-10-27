import type { GameState } from "./types";

export function hasItem(state: GameState, itemId: string): boolean {
  return state.inventory.some((item) => item.id === itemId);
}

export function hasFlag(state: GameState, flagName: string): boolean {
  return !!state.flags[flagName];
}

export function hasVisited(state: GameState, locationId: string): boolean {
  return state.visitedLocations.includes(locationId);
}

export function hasAnyItem(state: GameState, itemIds: string[]): boolean {
  return itemIds.some((id) => hasItem(state, id));
}

export function hasAllFlags(state: GameState, flagNames: string[]): boolean {
  return flagNames.every((flag) => hasFlag(state, flag));
}

export function getVar(
  state: GameState,
  key: string
): number | string | undefined {
  return state.vars?.[key];
}
