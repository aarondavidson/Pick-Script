/**
 * Bridge Pixels / Audio tools → current pack draft (IndexedDB).
 */

import {
  loadPackDraftAsync,
  savePackDraftAsync,
} from "@/studio/packDraftIdb";
import { updateRoom } from "@/studio/packDraft";
import type { JsonPackDocument } from "@/engine/jsonPack";
import type { PackAudio } from "@/engine/audio";
import { suggestId } from "@/authoring/codegen";

export type PackArtTarget = "room" | "item" | "character" | "portrait";

export async function applyArtToPackDraft(opts: {
  dataUrl: string;
  target: PackArtTarget;
  /** Room id (defaults to startRoom) */
  roomId?: string;
  /** Item id when target is item */
  itemId?: string;
  itemName?: string;
  /** Actor / character hotspot id when target is character|portrait */
  actorId?: string;
}): Promise<JsonPackDocument> {
  const doc = await loadPackDraftAsync();
  if (opts.target === "room") {
    const roomId = opts.roomId && doc.rooms[opts.roomId]
      ? opts.roomId
      : doc.startRoom;
    const next = updateRoom(doc, roomId, { image: opts.dataUrl });
    await savePackDraftAsync(next);
    return next;
  }

  if (opts.target === "character" || opts.target === "portrait") {
    const actorId = suggestId(opts.actorId || "player", "actor");
    const prev = doc.actors?.[actorId] ?? {};
    let next: JsonPackDocument = {
      ...doc,
      actors: {
        ...(doc.actors ?? {}),
        [actorId]: {
          ...prev,
          id: actorId,
          name: prev.name || (actorId === "player" ? "You" : actorId),
          isEgo: actorId === "player" ? true : prev.isEgo,
          ...(opts.target === "character"
            ? { sprite: opts.dataUrl }
            : { portrait: opts.dataUrl }),
        },
      },
    };
    // Stamp matching character hotspots
    if (opts.target === "character") {
      const rooms = { ...next.rooms };
      for (const [rid, room] of Object.entries(rooms)) {
        const hotspots = (room.hotspots ?? []).map((h) => {
          const hid = h.actorId || h.id;
          if (h.kind !== "character" || hid !== actorId) return h;
          return { ...h, sprite: opts.dataUrl };
        });
        rooms[rid] = { ...room, hotspots };
      }
      next = { ...next, rooms };
    }
    await savePackDraftAsync(next);
    return next;
  }

  const itemId = suggestId(opts.itemId || opts.itemName || "item", "item");
  const prev = doc.items?.[itemId];
  const next: JsonPackDocument = {
    ...doc,
    items: {
      ...(doc.items ?? {}),
      [itemId]: {
        id: itemId,
        name: opts.itemName || prev?.name || itemId,
        description: prev?.description || opts.itemName || itemId,
        icon: opts.dataUrl,
      },
    },
  };
  // Also stamp matching pickup hotspots
  const rooms = { ...next.rooms };
  for (const [rid, room] of Object.entries(rooms)) {
    const hotspots = (room.hotspots ?? []).map((h) =>
      h.itemId === itemId ? { ...h, itemIcon: opts.dataUrl } : h
    );
    rooms[rid] = { ...room, hotspots };
  }
  const stamped = { ...next, rooms };
  await savePackDraftAsync(stamped);
  return stamped;
}

export async function applyAudioToPackDraft(opts: {
  audio: PackAudio;
  roomMusic?: Array<{ roomId: string; musicCue: string }>;
  sfxBindings?: Array<{
    hotspotId: string;
    when: "interact" | "useWith";
    soundKey: string;
  }>;
}): Promise<JsonPackDocument> {
  let doc = await loadPackDraftAsync();
  doc = { ...doc, audio: { ...doc.audio, ...opts.audio } };

  if (opts.roomMusic?.length) {
    const rooms = { ...doc.rooms };
    for (const assign of opts.roomMusic) {
      if (!rooms[assign.roomId]) continue;
      rooms[assign.roomId] = {
        ...rooms[assign.roomId]!,
        music: assign.musicCue,
      };
    }
    doc = { ...doc, rooms };
  }

  if (opts.sfxBindings?.length) {
    const rooms = { ...doc.rooms };
    for (const [rid, room] of Object.entries(rooms)) {
      const hotspots = (room.hotspots ?? []).map((h) => {
        const binds = opts.sfxBindings!.filter((b) => b.hotspotId === h.id);
        if (!binds.length) return h;
        const next = { ...h };
        for (const b of binds) {
          if (b.when === "interact") next.interactSound = b.soundKey;
          else next.useWithSound = b.soundKey;
        }
        return next;
      });
      rooms[rid] = { ...room, hotspots };
    }
    doc = { ...doc, rooms };
  }

  await savePackDraftAsync(doc);
  return doc;
}

export async function listPackRoomIds(): Promise<
  Array<{ id: string; name: string }>
> {
  const doc = await loadPackDraftAsync();
  return Object.values(doc.rooms).map((r) => ({ id: r.id, name: r.name }));
}

export async function listPackHotspotIds(): Promise<
  Array<{ id: string; name: string; roomId: string }>
> {
  const doc = await loadPackDraftAsync();
  const out: Array<{ id: string; name: string; roomId: string }> = [];
  for (const room of Object.values(doc.rooms)) {
    for (const h of room.hotspots ?? []) {
      out.push({ id: h.id, name: h.name, roomId: room.id });
    }
  }
  return out;
}

export async function listPackItemIds(): Promise<
  Array<{ id: string; name: string }>
> {
  const doc = await loadPackDraftAsync();
  return Object.values(doc.items ?? {}).map((i) => ({
    id: i.id,
    name: i.name,
  }));
}

/** Player + character hotspot actor ids for costume / portrait send. */
export async function listPackActorIds(): Promise<
  Array<{ id: string; name: string }>
> {
  const doc = await loadPackDraftAsync();
  const map = new Map<string, string>();
  map.set("player", doc.actors?.player?.name || "You (player)");
  for (const [id, a] of Object.entries(doc.actors ?? {})) {
    map.set(id, a.name || id);
  }
  for (const room of Object.values(doc.rooms)) {
    for (const h of room.hotspots ?? []) {
      if (h.kind !== "character") continue;
      const id = h.actorId || h.id;
      if (!map.has(id)) map.set(id, h.name);
    }
  }
  return [...map.entries()].map(([id, name]) => ({ id, name }));
}
