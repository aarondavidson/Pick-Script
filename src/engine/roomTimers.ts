/**
 * Timed room triggers — fire after ego dwell time in a room.
 */

import type { GameState, Room, RoomTimer, StatePatch } from "./types";
import type { HapticStyle } from "./haptics";
import type { JuiceCue } from "./juice";
import { runPackActions, sanitizePackActions } from "./packActions";
import { isSafeIdentifierKey } from "./security";

const MAX_ROOM_TIMERS = 64;
const MAX_TIMER_MESSAGE = 4_000;

export function timerSeenFlag(roomId: string, timerId: string): string {
  return `timerSeen_${roomId}_${timerId}`;
}

export type RoomTimerResult = StatePatch & {
  message?: string;
  sounds?: string[];
  haptics?: HapticStyle[];
  juices?: JuiceCue[];
  cutsceneId?: string;
  /** Timer ids that fired this check (host tracks to avoid re-fire) */
  firedIds?: string[];
};

function mergeActionSideEffects(
  into: RoomTimerResult,
  actions: ReturnType<typeof runPackActions>
): void {
  if (actions.patch.flags) {
    into.flags = { ...(into.flags ?? {}), ...actions.patch.flags };
  }
  if (actions.patch.inventory) into.inventory = actions.patch.inventory;
  if (actions.patch.objectStates) {
    into.objectStates = {
      ...(into.objectStates ?? {}),
      ...actions.patch.objectStates,
    };
  }
  if (actions.patch.vars) {
    into.vars = { ...(into.vars ?? {}), ...actions.patch.vars };
  }
  if (actions.message && !into.message) into.message = actions.message;
  if (actions.cutsceneId) into.cutsceneId = actions.cutsceneId;
  if (actions.sounds.length) {
    into.sounds = [...(into.sounds ?? []), ...actions.sounds];
  }
  if (actions.haptics.length) {
    into.haptics = [...(into.haptics ?? []), ...actions.haptics];
  }
  if (actions.juices.length) {
    into.juices = [...(into.juices ?? []), ...actions.juices];
  }
}

/**
 * Fire room timers whose `afterMs` has elapsed for the current dwell.
 * `firedIds` should persist for the dwell session (reset on room change).
 * Once timers also gate on `timerSeen_<room>_<id>` flags.
 */
export function checkRoomTimers(
  room: Room,
  state: GameState,
  dwellMs: number,
  firedIds: Set<string>
): RoomTimerResult {
  const timers = room.timers?.slice(0, MAX_ROOM_TIMERS);
  if (!timers?.length || dwellMs < 0) return {};

  const result: RoomTimerResult = {};
  let flags = state.flags;
  let flagsDirty = false;
  let working: GameState = state;
  const newlyFired: string[] = [];

  for (const timer of timers) {
    const id = timer.id?.trim();
    if (!id || !isSafeIdentifierKey(id)) continue;
    if (firedIds.has(id)) continue;
    const after =
      typeof timer.afterMs === "number" && Number.isFinite(timer.afterMs)
        ? Math.max(0, timer.afterMs)
        : NaN;
    if (!Number.isFinite(after) || dwellMs < after) continue;

    const once = timer.once !== false;
    const seenKey = timerSeenFlag(room.id, id);
    if (once && flags[seenKey]) {
      firedIds.add(id);
      continue;
    }

    if (!flagsDirty) {
      flags = { ...flags };
      flagsDirty = true;
    }
    if (once) {
      flags[seenKey] = true;
    }
    if (timer.setFlag?.trim() && isSafeIdentifierKey(timer.setFlag.trim())) {
      flags[timer.setFlag.trim()] = true;
    }
    if (timer.message?.trim() && !result.message) {
      result.message = timer.message.trim().slice(0, MAX_TIMER_MESSAGE);
    }

    working = { ...working, flags };
    const actions = sanitizePackActions(timer.actions);
    if (actions.length) {
      const ran = runPackActions(actions, working);
      mergeActionSideEffects(result, ran);
      working = {
        ...working,
        flags: { ...working.flags, ...(ran.patch.flags ?? {}) },
        inventory: ran.patch.inventory ?? working.inventory,
        objectStates: {
          ...(working.objectStates ?? {}),
          ...(ran.patch.objectStates ?? {}),
        },
        vars: { ...(working.vars ?? {}), ...(ran.patch.vars ?? {}) },
      };
      if (ran.patch.flags) {
        flags = { ...flags, ...ran.patch.flags };
        flagsDirty = true;
      }
    }

    firedIds.add(id);
    newlyFired.push(id);
  }

  if (flagsDirty) result.flags = flags;
  if (newlyFired.length) result.firedIds = newlyFired;
  return result;
}

/** Sanitize a raw timer list from JSON. */
export function sanitizeRoomTimers(raw: unknown): RoomTimer[] {
  if (!Array.isArray(raw)) return [];
  const out: RoomTimer[] = [];
  for (const item of raw.slice(0, MAX_ROOM_TIMERS)) {
    if (!item || typeof item !== "object") continue;
    const t = item as Record<string, unknown>;
    const id = typeof t.id === "string" ? t.id.trim() : "";
    if (!id || !isSafeIdentifierKey(id)) continue;
    const afterMs =
      typeof t.afterMs === "number" && Number.isFinite(t.afterMs)
        ? Math.max(0, t.afterMs)
        : NaN;
    if (!Number.isFinite(afterMs)) continue;
    const actions = sanitizePackActions(t.actions);
    const setFlag =
      typeof t.setFlag === "string" && t.setFlag.trim()
        ? t.setFlag.trim()
        : undefined;
    const message =
      typeof t.message === "string" && t.message.trim()
        ? t.message.trim().slice(0, MAX_TIMER_MESSAGE)
        : undefined;
    out.push({
      id,
      afterMs,
      ...(t.once === false ? { once: false } : {}),
      ...(actions.length ? { actions } : {}),
      ...(setFlag && isSafeIdentifierKey(setFlag) ? { setFlag } : {}),
      ...(message ? { message } : {}),
    });
  }
  return out;
}
