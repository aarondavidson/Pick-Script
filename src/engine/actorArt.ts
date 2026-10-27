/**
 * Helpers for actor costume / sprite presentation.
 */

import type {
  ActorAnimSheet,
  ActorAnimState,
  ActorFacing,
  ActorFacingDir,
} from "./types";
import { isSafeMediaUrl } from "./security";

/** True when a costume/sprite value is a bitmap/media URL (not a CSS class). */
export function isBitmapCostume(value: string | undefined): value is string {
  if (!value?.trim()) return false;
  // CSS class tokens never contain : / or data:
  if (value.includes("://") || value.startsWith("data:") || value.startsWith("/")) {
    return isSafeMediaUrl(value);
  }
  return false;
}

/** Normalize compass aliases to cardinal facing. */
export function normalizeFacing(
  facing: ActorFacingDir | ActorFacing | undefined
): ActorFacing {
  switch (facing) {
    case "n":
    case "up":
      return "up";
    case "s":
    case "down":
      return "down";
    case "w":
    case "left":
      return "left";
    case "e":
    case "right":
    default:
      return "right";
  }
}

const FACING_ALIASES: Record<ActorFacing, ActorFacingDir[]> = {
  up: ["up", "n"],
  down: ["down", "s"],
  left: ["left", "w"],
  right: ["right", "e"],
};

function sheetEntry(
  sheet: Partial<Record<ActorFacingDir, string>>,
  facing: ActorFacing
): string | undefined {
  for (const key of FACING_ALIASES[facing]) {
    const v = sheet[key];
    if (typeof v === "string" && v.trim()) return v;
  }
  return undefined;
}

function sheetKeys(
  sheet: Partial<Record<ActorFacingDir, string>>
): ActorFacing[] {
  const found = new Set<ActorFacing>();
  for (const f of ["up", "down", "left", "right"] as ActorFacing[]) {
    if (sheetEntry(sheet, f)) found.add(f);
  }
  return [...found];
}

/**
 * Pick a frame URL/class from a directional sheet for the given facing.
 * Returns flipX when the sheet must be mirrored (single frame or L/R only).
 */
export function pickFacingSheet(
  sheet: ActorAnimSheet | undefined,
  facing: ActorFacing | ActorFacingDir | undefined
): { value?: string; flipX: boolean } {
  const face = normalizeFacing(facing);
  if (sheet == null) return { flipX: face === "left" };
  if (typeof sheet === "string") {
    return { value: sheet, flipX: face === "left" };
  }

  const exact = sheetEntry(sheet, face);
  if (exact) return { value: exact, flipX: false };

  const keys = sheetKeys(sheet);
  const hasLeft = keys.includes("left");
  const hasRight = keys.includes("right");
  const hasUp = keys.includes("up");
  const hasDown = keys.includes("down");
  const onlyHorizontal =
    (hasLeft || hasRight) && !hasUp && !hasDown;

  // Vertical facing with only L/R sheets → use horizontal + optional flip
  if ((face === "up" || face === "down") && onlyHorizontal) {
    const horiz = sheetEntry(sheet, "right") ?? sheetEntry(sheet, "left");
    if (horiz) {
      return {
        value: horiz,
        flipX: !sheetEntry(sheet, "right") && !!sheetEntry(sheet, "left"),
      };
    }
  }

  // Prefer opposite horizontal with flip (left↔right)
  if (face === "left" && hasRight) {
    return { value: sheetEntry(sheet, "right"), flipX: true };
  }
  if (face === "right" && hasLeft) {
    return { value: sheetEntry(sheet, "left"), flipX: true };
  }
  // Prefer opposite vertical without flip
  if (face === "up" && hasDown) {
    return { value: sheetEntry(sheet, "down"), flipX: false };
  }
  if (face === "down" && hasUp) {
    return { value: sheetEntry(sheet, "up"), flipX: false };
  }

  // Any remaining sheet entry
  for (const f of ["right", "left", "down", "up"] as ActorFacing[]) {
    const v = sheetEntry(sheet, f);
    if (v) {
      return {
        value: v,
        flipX: face === "left" && f === "right",
      };
    }
  }
  return { flipX: face === "left" };
}

export type ResolvedActorCostume =
  | { kind: "bitmap"; url: string; flipX: boolean }
  | { kind: "css"; className: string; flipX: boolean };

/**
 * Resolve the visible costume for an actor instance:
 * anim-state (+ facing) override → costume map → sprite → fallback class.
 */
export function resolveActorCostumeUrl(opts: {
  costumeKey?: string;
  sprite?: string;
  costumes?: Record<string, ActorAnimSheet>;
  animations?: Partial<Record<ActorAnimState, ActorAnimSheet>>;
  animState?: ActorAnimState;
  facing?: ActorFacing | ActorFacingDir;
  fallbackClass: string;
}): ResolvedActorCostume {
  const anim = opts.animState ?? "idle";
  const face = normalizeFacing(opts.facing);

  const trySheet = (
    sheet: ActorAnimSheet | undefined
  ): ResolvedActorCostume | null => {
    const picked = pickFacingSheet(sheet, face);
    if (!picked.value) return null;
    if (isBitmapCostume(picked.value)) {
      return { kind: "bitmap", url: picked.value, flipX: picked.flipX };
    }
    return { kind: "css", className: picked.value, flipX: picked.flipX };
  };

  const fromAnim = trySheet(opts.animations?.[anim]);
  if (fromAnim) return fromAnim;

  const costumeKey = opts.costumeKey;
  const fromCostume = trySheet(
    costumeKey ? opts.costumes?.[costumeKey] : undefined
  );
  if (fromCostume) return fromCostume;

  const fromSprite = trySheet(opts.sprite);
  if (fromSprite) return fromSprite;

  return {
    kind: "css",
    className: opts.fallbackClass,
    flipX: face === "left",
  };
}
