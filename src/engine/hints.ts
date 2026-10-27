import type { GameState, StatePatch } from "./types";
import type { GameDefinition } from "./definition";
import { applyStatePatch } from "./state";

export interface HintDef {
  id: string;
  /** Short title in the hint list */
  title: string;
  /** Progressive tiers: vague → clearer → spoilery */
  tiers: string[];
  /** When this hint thread is available */
  condition: (state: GameState) => boolean;
  /** Hide once true (puzzle solved) */
  completed?: (state: GameState) => boolean;
  /** Optional hotspot to pulse when stuck assist offers this hint */
  hotspotId?: string;
}

export interface HintStatus {
  id: string;
  title: string;
  /** Next tier text to reveal, or null if exhausted */
  nextTier: string | null;
  /** Tiers already revealed (0-based count) */
  revealed: number;
  /** Total tiers */
  total: number;
  exhausted: boolean;
  /** Optional hotspot to pulse for stuck assist */
  hotspotId?: string;
}

export function listActiveHints(
  definition: GameDefinition,
  state: GameState
): HintStatus[] {
  const defs = definition.hints ?? [];
  const progress = state.hintProgress ?? {};

  return defs
    .filter((h) => h.condition(state) && !h.completed?.(state))
    .map((h) => {
      const revealed = progress[h.id] ?? 0;
      const exhausted = revealed >= h.tiers.length;
      return {
        id: h.id,
        title: h.title,
        nextTier: exhausted ? null : h.tiers[revealed],
        revealed,
        total: h.tiers.length,
        exhausted,
        ...(h.hotspotId?.trim() ? { hotspotId: h.hotspotId.trim() } : {}),
      };
    });
}

export function revealNextHint(
  definition: GameDefinition,
  state: GameState,
  hintId: string
): { ok: boolean; message?: string; patch?: StatePatch } {
  const def = definition.hints?.find((h) => h.id === hintId);
  if (!def) return { ok: false, message: "No such hint." };
  if (!def.condition(state) || def.completed?.(state)) {
    return { ok: false, message: "That hint isn't available right now." };
  }

  const revealed = state.hintProgress?.[hintId] ?? 0;
  if (revealed >= def.tiers.length) {
    return { ok: false, message: "No more hints for that." };
  }

  const text = def.tiers[revealed];
  const patch: StatePatch = {
    hintProgress: {
      ...(state.hintProgress ?? {}),
      [hintId]: revealed + 1,
    },
    vars: {
      ...(state.vars ?? {}),
      hintsUsed: Number(state.vars?.hintsUsed ?? 0) + 1,
    },
  };

  return {
    ok: true,
    message: text,
    patch,
  };
}

export function applyHintReveal(
  state: GameState,
  patch: StatePatch
): GameState {
  return applyStatePatch(state, patch);
}

/** Helper: hint available until doneFlag is set */
export function untilFlagHint(
  id: string,
  title: string,
  tiers: string[],
  doneFlag: string
): HintDef {
  return {
    id,
    title,
    tiers,
    condition: (s) => !s.flags[doneFlag],
    completed: (s) => !!s.flags[doneFlag],
  };
}
