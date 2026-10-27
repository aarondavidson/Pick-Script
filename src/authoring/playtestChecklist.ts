/**
 * Playtest readiness checklist derived from a JSON pack draft.
 */

import type { JsonPackDocument } from "@/engine/jsonPack";
import { validateJsonPack } from "@/engine/jsonPack";

export interface PlaytestCheckItem {
  id: string;
  label: string;
  done: boolean;
  hint?: string;
}

function hasRealRoomImage(doc: JsonPackDocument): boolean {
  return Object.values(doc.rooms).some((r) => {
    const img = r.image?.trim() ?? "";
    if (!img) return false;
    if (img.startsWith("data:image/svg")) return false;
    if (/No([+\s%20]*)room([+\s%20]*)image/i.test(img)) return false;
    return true;
  });
}

function allHotspots(doc: JsonPackDocument) {
  return Object.values(doc.rooms ?? {}).flatMap((r) => r.hotspots ?? []);
}

/** Pure checklist for Guided Pack playtest readiness. */
export function buildPlaytestChecklist(
  doc: JsonPackDocument
): PlaytestCheckItem[] {
  const hs = allHotspots(doc);
  const hasPickup = hs.some((h) => h.kind === "pickup");
  const hasUseWith = hs.some((h) => (h.useWith?.length ?? 0) > 0);
  const hasGatedExit = (doc.links ?? []).some(
    (l) => l.requireFlag || l.requireItem
  );
  const hasMusic = Object.values(doc.rooms).some((r) => !!r.music);
  const validation = validateJsonPack(doc);

  return [
    {
      id: "room-art",
      label: "Room art uploaded",
      done: hasRealRoomImage(doc),
      hint: "Upload a background on the Pack room panel (or Pixels → Send to pack).",
    },
    {
      id: "hotspot",
      label: "At least one hotspot",
      done: hs.length > 0,
      hint: "Drag on the room image to draw a hotspot.",
    },
    {
      id: "pickup",
      label: "A pickup (inventory item)",
      done: hasPickup,
      hint: "Use the Hotspot Intent Wizard → Get item.",
    },
    {
      id: "puzzle",
      label: "A puzzle loop (use-with or gated exit)",
      done: hasUseWith || hasGatedExit,
      hint: "Wire Use-with on a target, or gate a room link.",
    },
    {
      id: "music",
      label: "Music cue on a room",
      done: hasMusic,
      hint: "Assign a music cue under Rooms or the Audio tab.",
    },
    {
      id: "valid",
      label: "Pack validates",
      done: validation.ok,
      hint: validation.ok
        ? undefined
        : validation.errors[0] || "Fix validation errors before play.",
    },
  ];
}

export function playtestProgress(items: PlaytestCheckItem[]): {
  done: number;
  total: number;
  ready: boolean;
} {
  const done = items.filter((i) => i.done).length;
  return { done, total: items.length, ready: done === items.length };
}
