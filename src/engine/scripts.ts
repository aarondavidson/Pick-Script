import type { GameState, ScriptEvent, ScriptHook, StatePatch } from "./types";
import { applyStatePatch } from "./state";

/**
 * Run all registered script hooks for an event.
 * Patches are applied sequentially so later hooks see earlier updates.
 */
export function runScripts(
  hooks: ScriptHook[] | undefined,
  event: ScriptEvent,
  state: GameState
): GameState {
  if (!hooks?.length) return state;

  let current = state;
  for (const hook of hooks) {
    const patch = hook(event, current);
    if (patch && Object.keys(patch).length > 0) {
      current = applyStatePatch(current, patch as StatePatch);
    }
  }
  return current;
}

export function emitAndPatch(
  hooks: ScriptHook[] | undefined,
  event: ScriptEvent,
  state: GameState
): StatePatch {
  const next = runScripts(hooks, event, state);
  if (next === state) return {};

  // Return a coarse patch of changed top-level fields
  const patch: StatePatch = {};
  (Object.keys(next) as (keyof GameState)[]).forEach((key) => {
    if (next[key] !== state[key]) {
      (patch as Record<string, unknown>)[key] = next[key];
    }
  });
  return patch;
}
