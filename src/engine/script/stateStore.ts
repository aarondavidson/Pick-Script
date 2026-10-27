/**
 * S.C.R.I.P.T. pillar — state system (bool / number / string).
 * Thin helpers over GameState.flags + GameState.vars.
 */

import type { GameState, StatePatch } from "../types";

export function getFlag(state: GameState, key: string): boolean {
  return !!state.flags[key];
}

export function setFlag(
  state: GameState,
  key: string,
  value: boolean
): StatePatch {
  if (state.flags[key] === value) return {};
  return { flags: { ...state.flags, [key]: value } };
}

export function getVar(
  state: GameState,
  key: string
): number | string | undefined {
  return state.vars?.[key];
}

export function setVar(
  state: GameState,
  key: string,
  value: number | string
): StatePatch {
  const prev = state.vars?.[key];
  if (prev === value) return {};
  return { vars: { ...(state.vars ?? {}), [key]: value } };
}

export function clearVar(state: GameState, key: string): StatePatch {
  if (!state.vars || !(key in state.vars)) return {};
  const next = { ...state.vars };
  delete next[key];
  return { vars: next };
}

/** Snapshot of SCRIPT-relevant key-value state for debug / save previews. */
export function snapshotStateStore(state: GameState): {
  flags: Record<string, boolean>;
  vars: Record<string, number | string>;
  objectStates: Record<string, number>;
} {
  return {
    flags: { ...state.flags },
    vars: { ...(state.vars ?? {}) },
    objectStates: { ...state.objectStates },
  };
}
