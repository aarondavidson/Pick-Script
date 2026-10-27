import type { Achievement, GameState, Quest, StatePatch } from "./types";
import type { GameDefinition } from "./definition";
import { createInitialActors, getEgo } from "./actors";
import { createInitialCamera } from "./camera";
import { isDangerousKey, isSafeIdentifierKey, sanitizeStringRecord } from "./security";

function mergeRecords<T>(
  base: Record<string, T> | undefined,
  patch: Record<string, T> | undefined
): Record<string, T> {
  const out: Record<string, T> = { ...(base ?? {}) };
  if (!patch) return out;
  for (const [k, v] of Object.entries(patch)) {
    if (!isSafeIdentifierKey(k) || isDangerousKey(k)) continue;
    out[k] = v;
  }
  return out;
}

/** Deep-merge a partial patch into game state (flags/vars merge shallowly). */
export function applyStatePatch(state: GameState, patch: StatePatch): GameState {
  if (!patch || Object.keys(patch).length === 0) return state;

  const next: GameState = { ...state, ...patch };

  if (patch.flags) {
    next.flags = mergeRecords(state.flags, patch.flags);
  }
  if (patch.vars) {
    next.vars = mergeRecords(state.vars, patch.vars);
  }
  if (patch.objectStates) {
    next.objectStates = mergeRecords(state.objectStates, patch.objectStates);
  }
  if (patch.dialogueState) {
    next.dialogueState = mergeRecords(state.dialogueState, patch.dialogueState);
  }
  if (patch.actors) {
    next.actors = mergeRecords(state.actors, patch.actors);
  }
  if (patch.camera) {
    next.camera = { ...state.camera, ...patch.camera };
  }
  if (patch.activeScripts) {
    next.activeScripts = patch.activeScripts;
  }
  if (patch.actorInventories) {
    next.actorInventories = mergeRecords(
      state.actorInventories,
      patch.actorInventories
    );
  }
  if (patch.hintProgress) {
    next.hintProgress = mergeRecords(state.hintProgress, patch.hintProgress);
  }
  if (patch.inventory) {
    next.inventory = patch.inventory;
  }
  if (patch.journalEntries) {
    next.journalEntries = patch.journalEntries;
  }
  if (patch.achievements) {
    next.achievements = patch.achievements;
  }
  if (patch.quests) {
    next.quests = patch.quests;
  }
  if (patch.visitedLocations) {
    next.visitedLocations = patch.visitedLocations;
  }

  return next;
}

export function createInitialState(def: GameDefinition): GameState {
  const achievements: Achievement[] = def.achievements.map((a) => ({
    ...a,
    unlocked: false,
  }));

  const quests: Quest[] = def.quests.map((q) => ({
    ...q,
    completed: false,
    completedObjectives: [],
  }));

  const actors = createInitialActors(def);
  const egoId = def.egoId ?? null;
  const ego = egoId ? actors[egoId] ?? null : null;

  return {
    currentLocation: def.startRoom,
    inventory: [],
    flags: { ...(def.initialFlags ?? {}) },
    vars: {},
    objectStates: { ...(def.initialObjectStates ?? {}) },
    dialogueState: {},
    gameComplete: false,
    journalEntries: [],
    achievements,
    quests,
    visitedLocations: [def.startRoom],
    egoId,
    actors,
    camera: createInitialCamera(ego, egoId),
    activeScripts: [],
    actorInventories: egoId ? { [egoId]: [] } : {},
    hintProgress: {},
  };
}

/** Ensure older saves / partial patches have required engine fields. */
export function normalizeLoadedState(
  state: GameState,
  def?: GameDefinition
): GameState {
  const actors =
    state.actors ?? (def ? createInitialActors(def) : {});
  const egoId = state.egoId ?? def?.egoId ?? null;
  const ego = egoId ? actors[egoId] ?? null : getEgo({ ...state, actors, egoId });

  return {
    ...state,
    flags: sanitizeStringRecord(state.flags ?? {}, (v): v is boolean => typeof v === "boolean"),
    vars: sanitizeStringRecord(
      state.vars ?? {},
      (v): v is number | string => typeof v === "number" || typeof v === "string"
    ),
    objectStates: sanitizeStringRecord(
      state.objectStates ?? {},
      (v): v is number => typeof v === "number" && Number.isFinite(v)
    ),
    dialogueState: sanitizeStringRecord(
      state.dialogueState ?? {},
      (v): v is number => typeof v === "number" && Number.isFinite(v)
    ),
    journalEntries: state.journalEntries ?? [],
    achievements: state.achievements ?? [],
    quests: state.quests ?? [],
    visitedLocations: state.visitedLocations ?? [],
    inventory: state.inventory ?? [],
    egoId,
    actors,
    camera:
      state.camera ??
      createInitialCamera(ego, egoId),
    activeScripts: state.activeScripts ?? [],
    actorInventories: state.actorInventories ?? {},
    hintProgress: state.hintProgress ?? {},
  };
}

export function resolveText(
  value: string | ((state: GameState) => string),
  state: GameState
): string {
  return typeof value === "function" ? value(state) : value;
}

export { resolveLocString } from "./i18n";
