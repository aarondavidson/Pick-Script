import type { VerbDef, VerbId } from "./types";
import { DEFAULT_VERBS, type GameDefinition } from "./definition";

/** UI / pack verb presets (classic SCUMM vs modern 2-click vs CMI coin). */
export type VerbMode = "classic" | "simple" | "coin";

export const SIMPLE_VERBS: VerbDef[] = [
  { id: "look", label: "Look at", shortLabel: "Look", shortcut: "1" },
  { id: "use", label: "Use", shortLabel: "Use", shortcut: "2" },
];

/** Verb coin maps three faces → look / talk / use (hand). */
export const COIN_VERBS: VerbDef[] = [
  { id: "look", label: "Look", shortLabel: "👁", shortcut: "1" },
  { id: "talk", label: "Talk", shortLabel: "💬", shortcut: "2" },
  { id: "use", label: "Use", shortLabel: "🤚", shortcut: "3" },
];

const STORAGE_PREFIX = "adventure_verb_mode_";

export function verbModeStorageKey(gameId: string): string {
  return `${STORAGE_PREFIX}${gameId}`;
}

export function loadStoredVerbMode(gameId: string): VerbMode | null {
  try {
    const raw = localStorage.getItem(verbModeStorageKey(gameId));
    if (raw === "classic" || raw === "simple" || raw === "coin") return raw;
  } catch {
    /* ignore */
  }
  return null;
}

export function storeVerbMode(gameId: string, mode: VerbMode): void {
  try {
    localStorage.setItem(verbModeStorageKey(gameId), mode);
  } catch {
    /* ignore */
  }
}

/** Resolve effective verb bar for a pack + mode. */
export function resolveVerbs(
  definition: GameDefinition,
  mode?: VerbMode
): VerbDef[] {
  const effective =
    mode ??
    loadStoredVerbMode(definition.id) ??
    definition.verbMode ??
    "classic";

  if (effective === "simple") {
    return SIMPLE_VERBS;
  }
  if (effective === "coin") {
    return COIN_VERBS;
  }

  if (definition.verbs?.length) {
    return definition.verbs;
  }
  return DEFAULT_VERBS;
}

export function isVerbMode(value: string): value is VerbMode {
  return value === "classic" || value === "simple" || value === "coin";
}

/**
 * In simple/coin mode, extra verbs still work if selected programmatically.
 * Give is classic-only in the default verb bar (not simple/coin unless mapped).
 */
export function verbModeIncludes(mode: VerbMode, verb: VerbId): boolean {
  if (mode === "classic") return true;
  if (mode === "coin") {
    return verb === "look" || verb === "use" || verb === "talk";
  }
  return verb === "look" || verb === "use";
}
