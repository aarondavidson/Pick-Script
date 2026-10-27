import type {
  ActorAnimSheet,
  ActorAnimState,
  ActorFacing,
  ActorInstance,
  GameState,
  StatePatch,
} from "./types";
import type { GameDefinition } from "./definition";

/** Build runtime actor instances from the pack definition. */
export function createInitialActors(
  def: GameDefinition
): Record<string, ActorInstance> {
  const out: Record<string, ActorInstance> = {};

  if (def.initialActors) {
    for (const [id, inst] of Object.entries(def.initialActors)) {
      out[id] = { ...inst, id };
    }
  }

  // Ensure every declared actor has an instance
  if (def.actors) {
    for (const id of Object.keys(def.actors)) {
      if (!out[id]) {
        out[id] = {
          id,
          roomId: null,
          x: 50,
          y: 70,
          facing: "right",
          visible: true,
        };
      }
    }
  }

  // Ego defaults into start room if missing
  const egoId = def.egoId;
  if (egoId) {
    if (!out[egoId]) {
      out[egoId] = {
        id: egoId,
        roomId: def.startRoom,
        x: 50,
        y: 75,
        facing: "right",
        visible: true,
        costume: def.actors?.[egoId]?.defaultCostume,
      };
    } else if (out[egoId].roomId == null) {
      out[egoId] = { ...out[egoId], roomId: def.startRoom };
    }
  }

  return out;
}

export function getActor(
  state: GameState,
  actorId: string
): ActorInstance | null {
  return state.actors?.[actorId] ?? null;
}

export function getEgo(state: GameState): ActorInstance | null {
  if (!state.egoId) return null;
  return getActor(state, state.egoId);
}

export function actorsInRoom(
  state: GameState,
  roomId: string
): ActorInstance[] {
  if (!state.actors) return [];
  return Object.values(state.actors).filter(
    (a) => a.roomId === roomId && a.visible !== false
  );
}

export function putActor(
  state: GameState,
  actorId: string,
  roomId: string | null,
  x: number,
  y: number,
  facing?: ActorFacing
): StatePatch {
  const prev = state.actors?.[actorId] ?? {
    id: actorId,
    roomId: null,
    x: 50,
    y: 70,
    facing: "right" as ActorFacing,
    visible: true,
  };
  return {
    actors: {
      ...(state.actors ?? {}),
      [actorId]: {
        ...prev,
        id: actorId,
        roomId,
        x,
        y,
        facing: facing ?? prev.facing,
      },
    },
  };
}

export function setActorFacing(
  state: GameState,
  actorId: string,
  facing: ActorFacing
): StatePatch {
  const prev = state.actors?.[actorId];
  if (!prev) return {};
  return {
    actors: {
      ...state.actors,
      [actorId]: { ...prev, facing },
    },
  };
}

export function setActorCostume(
  state: GameState,
  actorId: string,
  costume: string
): StatePatch {
  const prev = state.actors?.[actorId];
  if (!prev) return {};
  return {
    actors: {
      ...state.actors,
      [actorId]: { ...prev, costume },
    },
  };
}

export function setActorAnimState(
  state: GameState,
  actorId: string,
  animState: ActorAnimState
): StatePatch {
  const prev = state.actors?.[actorId];
  if (!prev || prev.animState === animState) return {};
  return {
    actors: {
      ...state.actors,
      [actorId]: { ...prev, animState },
    },
  };
}

/** Resolve CSS class for an actor's current anim cycle. */
export function resolveActorAnimClass(
  defAnimations: Partial<Record<ActorAnimState, ActorAnimSheet>> | undefined,
  animState: ActorAnimState | undefined
): string {
  const state = animState ?? "idle";
  const sheet = defAnimations?.[state];
  if (typeof sheet === "string" && sheet.trim()) return sheet;
  return `actor-anim-${state}`;
}

/** Face toward a target point from actor position. */
export function facingToward(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number
): ActorFacing {
  const dx = toX - fromX;
  const dy = toY - fromY;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0 ? "right" : "left";
  }
  return dy >= 0 ? "down" : "up";
}

export function distance2d(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Actors that can be selected as ego (New Kid / multi-ego). */
export function getPlayableActors(
  def: GameDefinition,
  _state: GameState
): string[] {
  if (def.playableActors?.length) return [...def.playableActors];
  const fromFlags = Object.values(def.actors ?? {})
    .filter((a) => a.canControl || a.isEgo)
    .map((a) => a.id);
  if (fromFlags.length) return fromFlags;
  return def.egoId ? [def.egoId] : [];
}

export interface SwitchEgoResult {
  ok: boolean;
  message?: string;
  patch?: StatePatch;
}

/**
 * SCUMM New Kid / setEgo — swap controllable actor, stash per-ego inventory.
 */
export function switchEgo(
  state: GameState,
  def: GameDefinition,
  actorId: string
): SwitchEgoResult {
  const playable = getPlayableActors(def, state);
  if (!playable.includes(actorId)) {
    return { ok: false, message: "You can't control that character." };
  }
  if (state.egoId === actorId) {
    return { ok: false, message: "Already controlling them." };
  }

  const actor = state.actors?.[actorId];
  if (!actor || actor.roomId == null) {
    return { ok: false, message: "That character isn't available." };
  }

  const actorInventories = { ...(state.actorInventories ?? {}) };
  if (state.egoId) {
    actorInventories[state.egoId] = [...state.inventory];
  }
  const newInventory = actorInventories[actorId]
    ? [...actorInventories[actorId]]
    : [];

  const patch: StatePatch = {
    egoId: actorId,
    inventory: newInventory,
    actorInventories,
    camera: {
      ...(state.camera ?? { x: 50, y: 50, followActorId: null }),
      followActorId: actorId,
      x: actor.x,
      y: actor.y,
    },
  };

  if (actor.roomId !== state.currentLocation) {
    patch.currentLocation = actor.roomId;
    patch.visitedLocations = [
      ...new Set([...(state.visitedLocations ?? []), actor.roomId]),
    ];
  }

  return { ok: true, patch };
}
