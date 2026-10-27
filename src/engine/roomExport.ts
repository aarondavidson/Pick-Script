/**
 * Export a room in SCUMM-inspired EN/EX/BOXD/OBCD/LSCR layout
 * for hotspot-editor workflows and content pipelines.
 */

import type { Hotspot, Room, Walkbox } from "./types";

/** Minimal override shape (matches debug overlay). */
export interface HotspotOverrideLike {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ExportedObject {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  verbs: string[];
  actorId?: string;
  isActor?: boolean;
  approach?: { x: number; y: number };
  skipWalkTo?: boolean;
  hasDialogue: boolean;
  hasUseWith: boolean;
  initialState?: number;
}

export interface RoomResourceExport {
  /** Room id */
  room: string;
  name: string;
  /** Entry script metadata (ENCD) */
  ENCD: {
    entryPoint?: { x: number; y: number };
    autoScripts: string[];
    hasOnEnter: boolean;
  };
  /** Exit script metadata (EXCD) */
  EXCD: {
    hasOnExit: boolean;
  };
  /** Walkboxes (BOXD) */
  BOXD: Walkbox[];
  /** Room size / camera bounds */
  roomSize?: { width: number; height: number };
  /** Objects / hotspots (OBCD) */
  objects: ExportedObject[];
  /** Local script ids (LSCR) */
  LSCR: string[];
  /** Exit links */
  exits: Array<{ direction: string; to: string; label: string }>;
  /** Transition hints */
  transitions?: {
    in?: Room["transitionIn"];
    out?: Room["transitionOut"];
  };
  exportedAt: string;
}

function applyOverride(
  hotspot: Hotspot,
  override?: HotspotOverrideLike
): Pick<Hotspot, "x" | "y" | "width" | "height"> {
  return {
    x: override?.x ?? hotspot.x,
    y: override?.y ?? hotspot.y,
    width: override?.width ?? hotspot.width,
    height: override?.height ?? hotspot.height,
  };
}

/**
 * Build a portable room resource dump (JSON-serializable).
 * Pass debug overrides to bake edited coords into the export.
 */
export function exportRoomResource(
  room: Room,
  overrides?: Record<string, HotspotOverrideLike>
): RoomResourceExport {
  const objects: ExportedObject[] = room.hotspots.map((h) => {
    const box = applyOverride(h, overrides?.[h.id]);
    return {
      id: h.id,
      name: h.name,
      ...box,
      verbs: [...h.verbs],
      actorId: h.actorId,
      isActor: h.isActor,
      approach: h.approach,
      skipWalkTo: h.skipWalkTo,
      hasDialogue: !!h.dialogue,
      hasUseWith: !!h.onUseWith || !!h.useWithResponses,
      initialState: h.initialState,
    };
  });

  return {
    room: room.id,
    name: room.name,
    ENCD: {
      entryPoint: room.entryPoint,
      autoScripts: [...(room.autoScripts ?? [])],
      hasOnEnter: typeof room.onEnter === "function",
    },
    EXCD: {
      hasOnExit: typeof room.onExit === "function",
    },
    BOXD: [...(room.walkboxes ?? [])],
    roomSize: room.roomSize,
    objects,
    LSCR: Object.keys(room.localScripts ?? {}),
    exits: room.exits.map((e) => ({
      direction: e.direction,
      to: e.to,
      label: e.label,
    })),
    transitions: {
      in: room.transitionIn,
      out: room.transitionOut,
    },
    exportedAt: new Date().toISOString(),
  };
}

/** Pretty JSON for clipboard / file download. */
export function formatRoomExport(data: RoomResourceExport): string {
  return JSON.stringify(data, null, 2);
}

/** TypeScript snippet for pasting hotspot coords back into locations.ts */
export function formatHotspotCoordSnippet(
  roomId: string,
  objects: ExportedObject[]
): string {
  const lines = objects.map(
    (o) =>
      `  // ${o.name} (${o.id})\n` +
      `  // x: ${o.x.toFixed(1)}, y: ${o.y.toFixed(1)}, ` +
      `width: ${o.width.toFixed(1)}, height: ${o.height.toFixed(1)}`
  );
  return `// Room export: ${roomId}\n${lines.join("\n")}\n`;
}
