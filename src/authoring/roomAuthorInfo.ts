/**
 * Author-mode helpers — flags, exits, paste-ready hotspot snippets.
 */

import type { GameState, Hotspot, Room, RoomExit } from "@/engine/types";

export interface HotspotBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** True flags in current state (sorted). */
export function listTrueFlags(state: GameState): string[] {
  return Object.keys(state.flags)
    .filter((k) => !!state.flags[k])
    .sort();
}

/** Inventory ids currently held. */
export function listInventoryIds(state: GameState): string[] {
  return state.inventory.map((i) => i.id);
}

export interface ExitAuthorRow {
  direction: string;
  to: string;
  label: string;
  blocked: boolean;
  blockedMessage?: string;
}

export function listExitRows(room: Room, state: GameState): ExitAuthorRow[] {
  return room.exits.map((exit: RoomExit) => ({
    direction: exit.direction,
    to: exit.to,
    label: exit.label,
    blocked: !!exit.blocked?.(state),
    blockedMessage: exit.blockedMessage,
  }));
}

/** Paste-ready coords for one hotspot (with optional override box). */
export function formatHotspotCoordSnippet(
  hotspot: Hotspot,
  box: HotspotBox,
  locationId: string
): string {
  return `// ${hotspot.name} (${hotspot.id}) in ${locationId}
x: ${box.x.toFixed(1)},
y: ${box.y.toFixed(1)},
width: ${box.width.toFixed(1)},
height: ${box.height.toFixed(1)},`;
}

/** Fuller object skeleton for pasting into a room.hotspots array. */
export function formatHotspotObjectSnippet(
  hotspot: Hotspot,
  box: HotspotBox
): string {
  const verbs = JSON.stringify(hotspot.verbs);
  const approach = hotspot.approach
    ? `\n  approach: { x: ${hotspot.approach.x}, y: ${hotspot.approach.y} },`
    : "";
  return `{
  id: "${hotspot.id}",
  name: "${hotspot.name}",
  x: ${box.x.toFixed(1)},
  y: ${box.y.toFixed(1)},
  width: ${box.width.toFixed(1)},
  height: ${box.height.toFixed(1)},
  verbs: ${verbs},${approach}
  responses: {
    look: "TODO",
  },
},`;
}

export function formatFlagsSnippet(state: GameState): string {
  const trueFlags = listTrueFlags(state);
  const inv = listInventoryIds(state);
  return JSON.stringify(
    {
      room: state.currentLocation,
      flagsTrue: trueFlags,
      flags: state.flags,
      inventory: inv,
    },
    null,
    2
  );
}

export function formatAllHotspotCoords(
  locationId: string,
  hotspots: Hotspot[],
  getBox: (h: Hotspot) => HotspotBox
): string {
  const body = hotspots
    .map((h) => formatHotspotCoordSnippet(h, getBox(h), locationId))
    .join("\n\n");
  return `// Location: ${locationId}\n\n${body}`;
}
