/**
 * Pack win condition — the game ends when `definition.winFlag` turns on.
 *
 * Flags can be set from anywhere (actions, dialogue, cutscenes, minigame wins,
 * pickups, timers), so one flag check covers every way a pack can finish.
 */

import type { GameDefinition } from "./definition";
import type { GameState } from "./types";
import { isSafeIdentifierKey } from "./security";

/** Trimmed, safe flag name — or undefined for blank / unsafe input. */
export function sanitizeWinFlag(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const flag = raw.trim();
  return isSafeIdentifierKey(flag) ? flag : undefined;
}

/** True when the pack's win flag is set and the game hasn't completed yet. */
export function shouldCompleteGame(
  definition: Pick<GameDefinition, "winFlag">,
  state: Pick<GameState, "flags" | "gameComplete">
): boolean {
  const flag = definition.winFlag;
  return !!flag && !state.gameComplete && !!state.flags[flag];
}
