import type {
  ActorFacing,
  ActorInstance,
  GameState,
  Point2D,
  StatePatch,
} from "./types";
import { facingToward, putActor } from "./actors";

export interface WalkMotion {
  actorId: string;
  path: Point2D[];
  pathIndex: number;
  speed: number;
}

export interface WalkStepResult {
  patch: StatePatch;
  motion: WalkMotion | null; // null = arrived
}

/** Advance an actor along a waypoint path by dtMs. */
export function stepWalk(
  state: GameState,
  motion: WalkMotion,
  dtMs: number
): WalkStepResult {
  const actor = state.actors?.[motion.actorId];
  if (!actor) {
    return { patch: {}, motion: null };
  }

  let remaining = (motion.speed * dtMs) / 1000;
  let x = actor.x;
  let y = actor.y;
  let pathIdx = motion.pathIndex;
  let facing: ActorFacing = actor.facing;
  const path = motion.path;

  while (remaining > 0 && pathIdx < path.length) {
    const dest = path[pathIdx];
    const dx = dest.x - x;
    const dy = dest.y - y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.15) {
      x = dest.x;
      y = dest.y;
      pathIdx++;
      continue;
    }
    facing = facingToward(x, y, dest.x, dest.y);
    if (remaining >= dist) {
      x = dest.x;
      y = dest.y;
      remaining -= dist;
      pathIdx++;
    } else {
      const t = remaining / dist;
      x += dx * t;
      y += dy * t;
      remaining = 0;
    }
  }

  const patch = putActor(state, motion.actorId, actor.roomId, x, y, facing);

  if (pathIdx >= path.length) {
    return { patch, motion: null };
  }

  return {
    patch,
    motion: { ...motion, pathIndex: pathIdx },
  };
}

export function actorAt(
  actors: Record<string, ActorInstance> | undefined,
  id: string
): ActorInstance | null {
  return actors?.[id] ?? null;
}
