import type { GameState, RoomExit } from "./types";

export type ExitDirection =
  | "north"
  | "south"
  | "east"
  | "west"
  | "northeast"
  | "northwest"
  | "southeast"
  | "southwest"
  | "up"
  | "down"
  | "in"
  | "out"
  | string;

const OPPOSITE: Record<string, string> = {
  north: "south",
  south: "north",
  east: "west",
  west: "east",
  northeast: "southwest",
  southwest: "northeast",
  northwest: "southeast",
  southeast: "northwest",
  up: "down",
  down: "up",
  in: "out",
  out: "in",
};

/** Build a single exit (thin sugar for readable room modules). */
export function exit(def: RoomExit): RoomExit {
  return def;
}

export interface LinkRoomsOptions {
  /** Direction leaving `from` toward `to` (default "east") */
  direction?: ExitDirection;
  /** Direction leaving `to` toward `from` (default opposite of direction) */
  backDirection?: ExitDirection;
  /** Label on the exit from `from` */
  fromLabel: string;
  /** Label on the exit from `to` */
  toLabel: string;
  blocked?: (state: GameState) => boolean;
  blockedMessage?: string;
  /** Gate only the forward exit (from → to) */
  forwardBlocked?: (state: GameState) => boolean;
  forwardBlockedMessage?: string;
  /** Forward exit: show doorway while locked (default true) */
  forwardShowWhenBlocked?: boolean;
  /** Forward exit label while locked */
  forwardLockedLabel?: string;
}

/**
 * Create a pair of RoomExits linking two rooms.
 * Attach `forward` to room A and `back` to room B.
 *
 * @example
 * const { forward, back } = linkRooms("kitchen", "street", {
 *   direction: "south",
 *   fromLabel: "Front door",
 *   toLabel: "Kitchen",
 * });
 * // kitchen.exits.push(forward); street.exits.push(back);
 */
export function linkRooms(
  fromRoomId: string,
  toRoomId: string,
  opts: LinkRoomsOptions
): { forward: RoomExit; back: RoomExit } {
  const direction = opts.direction ?? "east";
  const backDirection =
    opts.backDirection ?? OPPOSITE[direction] ?? "west";

  const forward: RoomExit = {
    direction,
    to: toRoomId,
    label: opts.fromLabel,
    blocked: opts.forwardBlocked ?? opts.blocked,
    blockedMessage:
      opts.forwardBlockedMessage ?? opts.blockedMessage,
    ...(opts.forwardShowWhenBlocked === false
      ? { showWhenBlocked: false }
      : {}),
    ...(opts.forwardLockedLabel?.trim()
      ? { lockedLabel: opts.forwardLockedLabel.trim() }
      : {}),
  };

  const back: RoomExit = {
    direction: backDirection,
    to: fromRoomId,
    label: opts.toLabel,
    blocked: opts.blocked,
    blockedMessage: opts.blockedMessage,
  };

  return { forward, back };
}

/** Opposite cardinal/ordinal for back-links. */
export function oppositeDirection(direction: string): string {
  return OPPOSITE[direction] ?? direction;
}
