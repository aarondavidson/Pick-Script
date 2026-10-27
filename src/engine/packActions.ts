/**
 * Declarative action chains for JSON packs (Visionaire / ActionList-lite).
 * Compiled into onInteract / dialogue actions — no TypeScript required.
 */

import type { GameItem, GameState, StatePatch, VerbId } from "./types";
import { setObjectState } from "./objectState";
import type { HapticStyle } from "./haptics";
import type { JuiceCue, JuicePresetId } from "./juice";
import { sanitizeJuiceCue } from "./juice";
import { isSafeIdentifierKey, parsePackActions } from "./security";
import { clampWalkFloor } from "./walkboxes";

export type PackActionEquals = {
  var: string;
  value: string | number | boolean;
};

export type PackAction =
  | { op: "message"; text: string }
  | { op: "say"; text: string; actorId?: string }
  | { op: "setFlag"; flag: string; value?: boolean }
  | { op: "clearFlag"; flag: string }
  | { op: "giveItem"; item: GameItem }
  | { op: "takeItem"; itemId: string }
  | { op: "setObjectState"; objectId: string; value: number }
  | { op: "sound"; key: string }
  | { op: "haptic"; style: HapticStyle }
  | {
      op: "juice";
      preset?: JuicePresetId;
      shake?: JuiceCue["shake"];
      flash?: JuiceCue["flash"];
      burst?: JuiceCue["burst"];
      hitStopMs?: number;
    }
  | { op: "cutscene"; id: string }
  | { op: "requireItem"; itemId: string; failMessage?: string }
  /** Set `vars.walkFloor` (0–8) for multi-floor pathfinding */
  | { op: "setWalkFloor"; floor: number }
  | {
      op: "if";
      flag?: string;
      hasItem?: string;
      equals?: PackActionEquals;
      then: PackAction[];
      else?: PackAction[];
    };

/** Sanitize untrusted JSON into typed PackAction[]. */
export function sanitizePackActions(raw: unknown): PackAction[] {
  return parsePackActions(raw) as PackAction[];
}

export interface PackActionRunResult {
  patch: StatePatch;
  /** First message / say text for the sentence UI */
  message?: string;
  /** Request host to start a named cutscene */
  cutsceneId?: string;
  /** SFX keys to play */
  sounds: string[];
  /** Haptic styles to fire (host / native) */
  haptics: HapticStyle[];
  /** Visual juice cues (shake / flash / burst) */
  juices: JuiceCue[];
  /** True when requireItem stopped the chain */
  stopped?: boolean;
}

function evalPackIfCondition(
  action: Extract<PackAction, { op: "if" }>,
  state: GameState
): boolean {
  if (action.flag !== undefined) {
    if (!isSafeIdentifierKey(action.flag) || !state.flags[action.flag]) {
      return false;
    }
  }
  if (action.hasItem !== undefined) {
    if (
      !isSafeIdentifierKey(action.hasItem) ||
      !state.inventory.some((i) => i.id === action.hasItem)
    ) {
      return false;
    }
  }
  if (action.equals) {
    const { var: varName, value } = action.equals;
    if (!isSafeIdentifierKey(varName)) return false;
    if (typeof value === "boolean") {
      const fromVar = state.vars?.[varName];
      const actual =
        fromVar !== undefined ? Boolean(fromVar) : !!state.flags[varName];
      if (actual !== value) return false;
    } else if (state.vars?.[varName] !== value) {
      return false;
    }
  }
  return !!(action.flag || action.hasItem || action.equals);
}

/** Apply a chain of pack actions against state (pure). */
export function runPackActions(
  actions: PackAction[] | undefined,
  state: GameState
): PackActionRunResult {
  let inventory = state.inventory;
  let flags = { ...state.flags };
  let objectStates = { ...(state.objectStates ?? {}) };
  let vars = state.vars ? { ...state.vars } : undefined;
  let message: string | undefined;
  let cutsceneId: string | undefined;
  let stopped = false;
  const sounds: string[] = [];
  const haptics: HapticStyle[] = [];
  const juices: JuiceCue[] = [];

  const workingState = (): GameState => ({
    ...state,
    inventory,
    flags,
    objectStates,
    ...(vars ? { vars } : {}),
  });

  const mergeNested = (nested: PackActionRunResult) => {
    if (nested.patch.flags) flags = { ...flags, ...nested.patch.flags };
    if (nested.patch.inventory) inventory = nested.patch.inventory;
    if (nested.patch.objectStates) {
      objectStates = { ...objectStates, ...nested.patch.objectStates };
    }
    if (nested.patch.vars) {
      vars = { ...(vars ?? {}), ...nested.patch.vars };
    }
    if (nested.message !== undefined) message = nested.message;
    if (nested.cutsceneId) cutsceneId = nested.cutsceneId;
    sounds.push(...nested.sounds);
    haptics.push(...nested.haptics);
    juices.push(...nested.juices);
    if (nested.stopped) stopped = true;
  };

  for (const action of sanitizePackActions(actions)) {
    if (stopped) break;
    switch (action.op) {
      case "message":
      case "say":
        message = action.text;
        break;
      case "setFlag":
        if (isSafeIdentifierKey(action.flag)) {
          flags[action.flag] = action.value !== false;
        }
        break;
      case "clearFlag":
        if (isSafeIdentifierKey(action.flag)) {
          flags[action.flag] = false;
        }
        break;
      case "giveItem":
        if (
          action.item &&
          isSafeIdentifierKey(action.item.id) &&
          !inventory.some((i) => i.id === action.item.id)
        ) {
          inventory = [...inventory, action.item];
        }
        break;
      case "takeItem":
        if (isSafeIdentifierKey(action.itemId)) {
          inventory = inventory.filter((i) => i.id !== action.itemId);
        }
        break;
      case "setObjectState": {
        if (!isSafeIdentifierKey(action.objectId)) break;
        const p = setObjectState(workingState(), action.objectId, action.value);
        objectStates = { ...objectStates, ...(p.objectStates ?? {}) };
        break;
      }
      case "sound":
        if (isSafeIdentifierKey(action.key)) sounds.push(action.key);
        break;
      case "haptic":
        haptics.push(action.style);
        break;
      case "juice": {
        const cue = sanitizeJuiceCue(action);
        if (cue) juices.push(cue);
        break;
      }
      case "cutscene":
        if (isSafeIdentifierKey(action.id)) cutsceneId = action.id;
        break;
      case "requireItem": {
        if (!isSafeIdentifierKey(action.itemId)) break;
        const has = inventory.some((i) => i.id === action.itemId);
        if (!has) {
          if (action.failMessage) message = action.failMessage;
          stopped = true;
        }
        break;
      }
      case "setWalkFloor": {
        const floor = clampWalkFloor(
          typeof action.floor === "number" ? action.floor : 0
        );
        vars = { ...(vars ?? {}), walkFloor: floor };
        break;
      }
      case "if": {
        const pass = evalPackIfCondition(action, workingState());
        const branch = pass ? action.then : action.else;
        if (branch?.length) {
          mergeNested(runPackActions(branch, workingState()));
        }
        break;
      }
      default:
        break;
    }
  }

  const patch: StatePatch = { flags, inventory, objectStates };
  if (vars) patch.vars = vars;
  return { patch, message, cutsceneId, sounds, haptics, juices, stopped };
}

/** Build an onInteract that runs a pack action chain for matching verbs. */
export function compilePackActionsInteract(
  actions: PackAction[] | undefined,
  verbs: VerbId[] = ["look", "use"]
): (verb: VerbId, state: GameState) => StatePatch {
  return (verb, state) => {
    if (!verbs.includes(verb)) return {};
    return runPackActions(actions, state).patch;
  };
}
