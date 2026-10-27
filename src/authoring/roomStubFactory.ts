/**
 * Room stub factory — N rooms + cardinal links + placeholder art.
 */

import { suggestId } from "@/authoring/codegen";
import {
  type JsonPackDocument,
  type JsonPackLink,
} from "@/engine/jsonPack";
import { missingArtPlaceholderDataUrl } from "@/engine/packDoctor";
import { upsertLink } from "@/studio/packDraft";

export interface RoomStubFactoryOpts {
  /** How many new rooms to add (1–8, default 4) */
  count?: number;
  /** Base name prefix (Room A, Room B…) */
  namePrefix?: string;
  /** Connect in a line eastward (default) or cross (N/E/S/W from hub) */
  layout?: "line" | "cross";
  /** Also add map group */
  mapGroupName?: string;
}

const CROSS_DIRS: Array<{
  dir: string;
  fromLabel: string;
  toLabel: string;
}> = [
  { dir: "north", fromLabel: "North wing", toLabel: "Hub" },
  { dir: "east", fromLabel: "East wing", toLabel: "Hub" },
  { dir: "south", fromLabel: "South wing", toLabel: "Hub" },
  { dir: "west", fromLabel: "West wing", toLabel: "Hub" },
];

/**
 * Add stub rooms with MISSING ART placeholders and bidirectional links.
 */
export function applyRoomStubFactory(
  doc: JsonPackDocument,
  opts?: RoomStubFactoryOpts
): JsonPackDocument {
  const count = Math.max(1, Math.min(8, opts?.count ?? 4));
  const layout = opts?.layout ?? "line";
  const prefix = opts?.namePrefix?.trim() || "Room";
  let next = { ...doc, rooms: { ...doc.rooms } };

  const newIds: string[] = [];
  for (let i = 0; i < count; i++) {
    const letter = String.fromCharCode(65 + i);
    const name = `${prefix} ${letter}`;
    let id = suggestId(`${prefix}_${letter}`, `room_${letter.toLowerCase()}`);
    if (next.rooms[id]) id = `${id}_${Date.now().toString(36)}`;
    next.rooms[id] = {
      id,
      name,
      description: `Stub room — replace art and add hotspots.`,
      image: missingArtPlaceholderDataUrl(name),
      music: next.audio?.defaultMusic || "home",
      hotspots: [],
      walkboxes: [{ id: "floor", x: 5, y: 55, width: 90, height: 40 }],
      entryPoint: { x: 50, y: 75 },
    };
    newIds.push(id);
  }

  if (layout === "cross") {
    const hub = doc.startRoom;
    const wings = newIds.slice(0, 4);
    wings.forEach((to, i) => {
      const meta = CROSS_DIRS[i]!;
      const link: JsonPackLink = {
        from: hub,
        to,
        direction: meta.dir,
        fromLabel: meta.fromLabel,
        toLabel: meta.toLabel,
      };
      next = upsertLink(next, link);
    });
  } else {
    // Line: start → A → B → C…
    let prev = doc.startRoom;
    for (const id of newIds) {
      const link: JsonPackLink = {
        from: prev,
        to: id,
        direction: "east",
        fromLabel: next.rooms[id]!.name,
        toLabel: next.rooms[prev]?.name || prev,
      };
      next = upsertLink(next, link);
      prev = id;
    }
  }

  const groupName = opts?.mapGroupName?.trim() || "Stubs";
  const members = [doc.startRoom, ...newIds];
  next = {
    ...next,
    mapGroups: {
      ...(next.mapGroups ?? {}),
      [groupName]: members,
    },
  };

  return next;
}
