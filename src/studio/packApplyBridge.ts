/**
 * Apply Advanced Studio tools (Hotspots / Scene / Combines) into the Pack draft.
 */

import type { DraftCombination, DraftHotspot, DraftOverlay } from "@/authoring/codegen";
import { overlayToHotspot, combinationKey } from "@/authoring/codegen";
import type { JsonPackDocument, JsonPackHotspot } from "@/engine/jsonPack";
import {
  loadPackDraftAsync,
  savePackDraftAsync,
} from "@/studio/packDraftIdb";
import { updateRoom } from "@/studio/packDraft";

function draftToJsonHotspot(h: DraftHotspot): JsonPackHotspot {
  return {
    id: h.id,
    name: h.name,
    x: h.x,
    y: h.y,
    width: h.width,
    height: h.height,
    verbs: h.verbs as JsonPackHotspot["verbs"],
    kind: h.kind,
    lookText: h.lookText,
    itemId: h.itemId,
    itemName: h.itemName,
    itemDescription: h.itemDescription,
    actorId: h.actorId,
    interactSound: h.interactSound,
    useWithSound: h.useWithSound,
  };
}

/** Merge drawn hotspots into a pack room (replace by id, append new). */
export async function applyHotspotsToPackDraft(opts: {
  roomId?: string;
  hotspots: DraftHotspot[];
  /** When true, replace the room's hotspot list entirely */
  replace?: boolean;
}): Promise<JsonPackDocument> {
  const doc = await loadPackDraftAsync();
  const roomId =
    opts.roomId && doc.rooms[opts.roomId] ? opts.roomId : doc.startRoom;
  const room = doc.rooms[roomId];
  if (!room) throw new Error(`Room “${roomId}” not in pack draft`);

  const incoming = opts.hotspots.map(draftToJsonHotspot);
  let hotspots: JsonPackHotspot[];
  if (opts.replace) {
    hotspots = incoming;
  } else {
    const byId = new Map((room.hotspots ?? []).map((h) => [h.id, h]));
    for (const h of incoming) byId.set(h.id, h);
    hotspots = [...byId.values()];
  }

  const next = updateRoom(doc, roomId, { hotspots });
  await savePackDraftAsync(next);
  return next;
}

/** Apply Scene overlays as hotspots (+ optional room background data URL). */
export async function applySceneToPackDraft(opts: {
  roomId?: string;
  overlays: DraftOverlay[];
  roomImageDataUrl?: string | null;
}): Promise<JsonPackDocument> {
  const drafts = opts.overlays
    .filter((o) => o.role !== "decoration")
    .map((o) => overlayToHotspot(o));
  let doc = await applyHotspotsToPackDraft({
    roomId: opts.roomId,
    hotspots: drafts,
  });
  if (opts.roomImageDataUrl) {
    const roomId =
      opts.roomId && doc.rooms[opts.roomId] ? opts.roomId : doc.startRoom;
    doc = updateRoom(doc, roomId, { image: opts.roomImageDataUrl });
    await savePackDraftAsync(doc);
  }
  // Upsert items catalog for pickups
  const items = { ...(doc.items ?? {}) };
  for (const d of drafts) {
    if (d.kind === "pickup" && d.itemId) {
      items[d.itemId] = {
        id: d.itemId,
        name: d.itemName || d.name,
        description: d.itemDescription || d.itemName || d.name,
        ...(items[d.itemId]?.icon ? { icon: items[d.itemId]!.icon } : {}),
      };
    }
  }
  doc = { ...doc, items };
  await savePackDraftAsync(doc);
  return doc;
}

/** Merge combine recipes into pack.combinations (+ result items). */
export async function applyCombinesToPackDraft(
  recipes: DraftCombination[]
): Promise<JsonPackDocument> {
  const doc = await loadPackDraftAsync();
  const combinations = { ...(doc.combinations ?? {}) };
  const items = { ...(doc.items ?? {}) };

  for (const r of recipes) {
    const key = combinationKey(r.itemA, r.itemB);
    combinations[key] = {
      items: [r.itemA, r.itemB],
      result: {
        id: r.resultId,
        name: r.resultName,
        description: r.resultDescription,
      },
      successMessage: r.successMessage,
    };
    items[r.resultId] = {
      id: r.resultId,
      name: r.resultName,
      description: r.resultDescription,
      ...(items[r.resultId]?.icon ? { icon: items[r.resultId]!.icon } : {}),
    };
    for (const id of [r.itemA, r.itemB]) {
      if (!items[id]) {
        items[id] = { id, name: id, description: id };
      }
    }
  }

  const next = { ...doc, combinations, items };
  await savePackDraftAsync(next);
  return next;
}
