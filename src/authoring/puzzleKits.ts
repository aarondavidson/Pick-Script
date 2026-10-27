/**
 * Form → JSON pack puzzle kits (get-item, use-with, locked-exit).
 * Emits JsonPackDocument fields — no TypeScript recipes required.
 */

import { suggestId } from "@/authoring/codegen";
import type {
  JsonPackDocument,
  JsonPackHotspot,
  JsonPackItem,
  JsonPackLink,
  JsonPackUseWithRule,
} from "@/engine/jsonPack";
import { upsertLink } from "@/studio/packDraft";

export interface GetItemKitInput {
  hotspotId?: string;
  hotspotName: string;
  x: number;
  y: number;
  width: number;
  height: number;
  itemId?: string;
  itemName: string;
  itemDescription?: string;
  lookText?: string;
  pickupMessage?: string;
  /** Existing hotspot id to convert instead of creating */
  existingHotspotId?: string;
}

export interface UseWithKitInput {
  hotspotId?: string;
  hotspotName: string;
  x: number;
  y: number;
  width: number;
  height: number;
  lookText?: string;
  itemId: string;
  successMessage: string;
  alreadyFlag?: string;
  alreadyMessage?: string;
  setFlag?: string;
  consumeItem?: boolean;
  giveItem?: JsonPackItem;
  fallbackMessage?: string;
  existingHotspotId?: string;
}

export interface LockedExitKitInput {
  from: string;
  to: string;
  direction?: string;
  fromLabel?: string;
  toLabel?: string;
  requireFlag?: string;
  requireItem?: string;
  blockedMessage?: string;
}

function uniqueHotspotId(
  doc: JsonPackDocument,
  roomId: string,
  preferred: string
): string {
  const hotspots = doc.rooms[roomId]?.hotspots ?? [];
  let id = suggestId(preferred, "hotspot");
  if (hotspots.some((h) => h.id === id)) {
    id = `${id}_${hotspots.length}`;
  }
  return id;
}

function putHotspot(
  doc: JsonPackDocument,
  roomId: string,
  hotspot: JsonPackHotspot,
  replaceId?: string
): JsonPackDocument {
  const room = doc.rooms[roomId];
  if (!room) return doc;
  const list = room.hotspots ?? [];
  const hotspots = replaceId
    ? list.map((h) => (h.id === replaceId ? hotspot : h))
    : [...list, hotspot];
  return {
    ...doc,
    rooms: {
      ...doc.rooms,
      [roomId]: { ...room, hotspots },
    },
  };
}

function upsertItem(
  doc: JsonPackDocument,
  item: JsonPackItem
): JsonPackDocument {
  return {
    ...doc,
    items: {
      ...(doc.items ?? {}),
      [item.id]: { ...(doc.items?.[item.id] ?? {}), ...item },
    },
  };
}

/**
 * Pickup hotspot + catalog item.
 * Runtime flag is always `got_<itemId>` (engine compile path).
 */
export function applyGetItemKit(
  doc: JsonPackDocument,
  roomId: string,
  input: GetItemKitInput
): JsonPackDocument {
  const itemId = suggestId(input.itemId || input.itemName, "item");
  const flag = `got_${itemId}`;
  const existing = input.existingHotspotId
    ? doc.rooms[roomId]?.hotspots?.find((h) => h.id === input.existingHotspotId)
    : undefined;
  const id =
    existing?.id ??
    uniqueHotspotId(doc, roomId, input.hotspotId || input.hotspotName);

  const hotspot: JsonPackHotspot = {
    ...(existing ?? {}),
    id,
    name: input.hotspotName,
    x: existing?.x ?? input.x,
    y: existing?.y ?? input.y,
    width: existing?.width ?? input.width,
    height: existing?.height ?? input.height,
    kind: "pickup",
    verbs: ["look", "use"],
    itemId,
    itemName: input.itemName,
    itemDescription: input.itemDescription || input.itemName,
    lookText:
      input.lookText ||
      existing?.lookText ||
      `You see the ${input.hotspotName}.`,
    useText:
      input.pickupMessage ||
      existing?.useText ||
      `You take the ${input.itemName}.`,
    // Clear kit-conflicting fields from prior intent
    actions: undefined,
    useWith: undefined,
    dialogue: undefined,
  };

  let next = putHotspot(doc, roomId, hotspot, existing?.id);
  next = upsertItem(next, {
    id: itemId,
    name: input.itemName,
    description: input.itemDescription || input.itemName,
  });
  next = {
    ...next,
    initialFlags: { ...(next.initialFlags ?? {}), [flag]: false },
  };
  return next;
}

/** Use-with-target hotspot + one inventory rule. */
export function applyUseWithKit(
  doc: JsonPackDocument,
  roomId: string,
  input: UseWithKitInput
): JsonPackDocument {
  const existing = input.existingHotspotId
    ? doc.rooms[roomId]?.hotspots?.find((h) => h.id === input.existingHotspotId)
    : undefined;
  const id =
    existing?.id ??
    uniqueHotspotId(doc, roomId, input.hotspotId || input.hotspotName);
  const alreadyFlag = input.alreadyFlag
    ? suggestId(input.alreadyFlag, "done")
    : undefined;
  const setFlag = input.setFlag
    ? suggestId(input.setFlag, alreadyFlag || "unlocked")
    : alreadyFlag;

  const rule: JsonPackUseWithRule = {
    itemId: suggestId(input.itemId, "item"),
    message: input.successMessage,
    alreadyFlag,
    alreadyMessage: input.alreadyMessage,
    setFlag,
    consumeItem: input.consumeItem,
    giveItem: input.giveItem
      ? {
          id: suggestId(input.giveItem.id, "item"),
          name: input.giveItem.name,
          description: input.giveItem.description || input.giveItem.name,
          ...(input.giveItem.icon ? { icon: input.giveItem.icon } : {}),
        }
      : undefined,
  };

  const hotspot: JsonPackHotspot = {
    ...(existing ?? {}),
    id,
    name: input.hotspotName,
    x: existing?.x ?? input.x,
    y: existing?.y ?? input.y,
    width: existing?.width ?? input.width,
    height: existing?.height ?? input.height,
    kind: "use-with-target",
    verbs: ["look", "use"],
    lookText:
      input.lookText ||
      existing?.lookText ||
      `You see the ${input.hotspotName}.`,
    useWith: [rule],
    fallbackUseWithMessage:
      input.fallbackMessage || "That doesn't work here.",
  };

  let next = putHotspot(doc, roomId, hotspot, existing?.id);
  if (setFlag) {
    next = {
      ...next,
      initialFlags: { ...(next.initialFlags ?? {}), [setFlag]: false },
    };
  }
  if (rule.giveItem) {
    next = upsertItem(next, {
      id: rule.giveItem.id,
      name: rule.giveItem.name,
      description: rule.giveItem.description,
      icon: rule.giveItem.icon,
    });
  }
  return next;
}

/** Bidirectional room link with optional flag/item gate. */
export function applyLockedExitKit(
  doc: JsonPackDocument,
  input: LockedExitKitInput
): JsonPackDocument {
  const fromName = doc.rooms[input.from]?.name || input.from;
  const toName = doc.rooms[input.to]?.name || input.to;
  const link: JsonPackLink = {
    from: input.from,
    to: input.to,
    direction: input.direction || "east",
    fromLabel: input.fromLabel?.trim() || toName,
    toLabel: input.toLabel?.trim() || fromName,
    requireFlag: input.requireFlag?.trim() || undefined,
    requireItem: input.requireItem?.trim() || undefined,
    blockedMessage:
      input.blockedMessage?.trim() ||
      (input.requireFlag || input.requireItem
        ? "You can't go that way yet."
        : undefined),
  };
  let next = upsertLink(doc, link);
  if (link.requireFlag) {
    next = {
      ...next,
      initialFlags: {
        ...(next.initialFlags ?? {}),
        [link.requireFlag]: next.initialFlags?.[link.requireFlag] ?? false,
      },
    };
  }
  return next;
}
