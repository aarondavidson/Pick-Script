/**
 * AGS/Escoria-style room enter/exit-trigger regions (AABB in room %).
 */

import type {
  GameState,
  Point2D,
  Room,
  RoomRegion,
  StatePatch,
} from "./types";
import type { HapticStyle } from "./haptics";
import type { JuiceCue } from "./juice";
import { sanitizeJuiceCue } from "./juice";
import { runPackActions, sanitizePackActions } from "./packActions";
import { isSafeIdentifierKey } from "./security";

export function regionSeenFlag(roomId: string, regionId: string): string {
  return `regionSeen_${roomId}_${regionId}`;
}

export function pointInRegion(p: Point2D, r: RoomRegion): boolean {
  return (
    p.x >= r.x &&
    p.x <= r.x + r.width &&
    p.y >= r.y &&
    p.y <= r.y + r.height
  );
}

export type RegionEntryResult = StatePatch & {
  message?: string;
  sounds?: string[];
  haptics?: HapticStyle[];
  juices?: JuiceCue[];
  cutsceneId?: string;
};

function mergeActionSideEffects(
  into: RegionEntryResult,
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
 * Detect ego crossing into/out of region AABBs and apply flag/message/actions.
 * Enter uses `regionSeen_<roomId>_<regionId>` unless everyEnter.
 * Exit fires every leave when onExitFlag / onExitActions are set.
 */
export function checkRegionEntries(
  prev: Point2D,
  next: Point2D,
  room: Room,
  state: GameState
): RegionEntryResult {
  const regions = room.regions;
  if (!regions?.length) return {};

  const result: RegionEntryResult = {};
  let flags = state.flags;
  let flagsDirty = false;
  let working: GameState = state;

  const touchFlags = () => {
    if (!flagsDirty) {
      flags = { ...flags };
      flagsDirty = true;
    }
  };

  for (const region of regions) {
    const wasIn = pointInRegion(prev, region);
    const isIn = pointInRegion(next, region);

    // Enter: outside → inside
    if (!wasIn && isIn) {
      const seenKey = regionSeenFlag(room.id, region.id);
      const allow =
        region.everyEnter || !flags[seenKey];
      if (allow) {
        touchFlags();
        if (!region.everyEnter) {
          flags[seenKey] = true;
        }
        if (region.onEnterFlag && isSafeIdentifierKey(region.onEnterFlag)) {
          flags[region.onEnterFlag] = true;
        }
        if (region.setFlag && isSafeIdentifierKey(region.setFlag)) {
          flags[region.setFlag] = true;
        }
        if (region.message && !result.message) {
          result.message = region.message;
        }
        const enterJuice = sanitizeJuiceCue(region.juice);
        if (enterJuice) {
          result.juices = [...(result.juices ?? []), enterJuice];
        }
        working = { ...working, flags };
        const enterActions = sanitizePackActions(region.onEnterActions);
        if (enterActions.length) {
          const ran = runPackActions(enterActions, working);
          mergeActionSideEffects(result, ran);
          if (ran.patch.flags) {
            flags = { ...flags, ...ran.patch.flags };
            working = {
              ...working,
              flags,
              inventory: ran.patch.inventory ?? working.inventory,
              objectStates: {
                ...working.objectStates,
                ...(ran.patch.objectStates ?? {}),
              },
              ...(ran.patch.vars
                ? { vars: { ...(working.vars ?? {}), ...ran.patch.vars } }
                : {}),
            };
            flagsDirty = true;
          } else if (ran.patch.inventory || ran.patch.objectStates || ran.patch.vars) {
            working = {
              ...working,
              inventory: ran.patch.inventory ?? working.inventory,
              objectStates: {
                ...working.objectStates,
                ...(ran.patch.objectStates ?? {}),
              },
              ...(ran.patch.vars
                ? { vars: { ...(working.vars ?? {}), ...ran.patch.vars } }
                : {}),
            };
          }
        }
      }
    }

    // Exit: inside → outside
    if (wasIn && !isIn) {
      const hasExit =
        (!!region.onExitFlag && isSafeIdentifierKey(region.onExitFlag)) ||
        sanitizePackActions(region.onExitActions).length > 0;
      if (hasExit) {
        if (region.onExitFlag && isSafeIdentifierKey(region.onExitFlag)) {
          touchFlags();
          flags[region.onExitFlag] = true;
          working = { ...working, flags };
        }
        const exitActions = sanitizePackActions(region.onExitActions);
        if (exitActions.length) {
          const ran = runPackActions(exitActions, working);
          mergeActionSideEffects(result, ran);
          if (ran.patch.flags) {
            flags = { ...flags, ...ran.patch.flags };
            flagsDirty = true;
          }
          working = {
            ...working,
            flags,
            inventory: ran.patch.inventory ?? working.inventory,
            objectStates: {
              ...working.objectStates,
              ...(ran.patch.objectStates ?? {}),
            },
            ...(ran.patch.vars
              ? { vars: { ...(working.vars ?? {}), ...ran.patch.vars } }
              : {}),
          };
        }
      }
    }
  }

  if (flagsDirty) result.flags = flags;
  if (result.inventory) {
    /* already set via merge */
  }

  const hasSide =
    !!result.message ||
    !!result.cutsceneId ||
    (result.sounds?.length ?? 0) > 0 ||
    (result.haptics?.length ?? 0) > 0 ||
    (result.juices?.length ?? 0) > 0 ||
    !!result.inventory ||
    !!result.objectStates ||
    !!result.vars;

  if (!flagsDirty && !hasSide) return {};
  return result;
}
