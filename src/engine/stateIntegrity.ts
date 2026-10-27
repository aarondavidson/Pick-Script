/**
 * Sanitize play state against a pack definition.
 * Drops unknown rooms, malformed inventory, unsafe media icons, and
 * oversized collections so forged saves / console patches cannot invent
 * locations or break the runtime with garbage.
 */

import type { GameDefinition } from "./definition";
import type { GameItem, GameState } from "./types";
import {
  isSafeIdentifierKey,
  isSafePlayMediaUrl,
  sanitizeStringRecord,
} from "./security";

const MAX_INVENTORY = 64;
const MAX_JOURNAL = 200;
const MAX_VISITED = 256;

/** Item ids declared on the pack (icons, combinations, hotspot pickups). */
export function collectKnownItemIds(def: GameDefinition): Set<string> {
  const ids = new Set<string>();
  if (def.itemIcons) {
    for (const id of Object.keys(def.itemIcons)) {
      if (isSafeIdentifierKey(id)) ids.add(id);
    }
  }
  for (const [key, combo] of Object.entries(def.combinations ?? {})) {
    for (const part of key.split("+")) {
      if (isSafeIdentifierKey(part)) ids.add(part);
    }
    if (combo?.result?.id && isSafeIdentifierKey(combo.result.id)) {
      ids.add(combo.result.id);
    }
  }
  for (const room of Object.values(def.rooms ?? {})) {
    for (const h of room.hotspots ?? []) {
      if (h.item?.id && isSafeIdentifierKey(h.item.id)) ids.add(h.item.id);
    }
  }
  return ids;
}

function sanitizeItem(
  item: unknown,
  knownIds: Set<string> | null
): GameItem | null {
  if (!item || typeof item !== "object") return null;
  const row = item as GameItem;
  if (!isSafeIdentifierKey(row.id) || typeof row.name !== "string") return null;
  if (knownIds && knownIds.size > 0 && !knownIds.has(row.id)) return null;
  const description =
    typeof row.description === "string" ? row.description.slice(0, 4_000) : row.name;
  const icon =
    row.icon != null && isSafePlayMediaUrl(row.icon) ? row.icon : undefined;
  return {
    id: row.id,
    name: String(row.name).slice(0, 200),
    description,
    ...(icon ? { icon } : {}),
    ...(typeof row.combineHint === "string"
      ? { combineHint: row.combineHint.slice(0, 400) }
      : {}),
  };
}

function sanitizeInventory(
  list: unknown,
  knownIds: Set<string> | null
): GameItem[] {
  if (!Array.isArray(list)) return [];
  const out: GameItem[] = [];
  const seen = new Set<string>();
  for (const row of list.slice(0, MAX_INVENTORY * 2)) {
    const item = sanitizeItem(row, knownIds);
    if (!item || seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
    if (out.length >= MAX_INVENTORY) break;
  }
  return out;
}

/**
 * Clamp a loaded or patched state to what the pack can actually represent.
 * When `strictKnownItems` is true and the pack declares items, unknown
 * inventory ids are dropped (anti-give-item cheat via save edit).
 */
export function sanitizePlayState(
  state: GameState,
  def: GameDefinition,
  options?: { strictKnownItems?: boolean }
): GameState {
  const roomIds = new Set(Object.keys(def.rooms ?? {}));
  const knownItems = collectKnownItemIds(def);
  const strictItems =
    options?.strictKnownItems === true && knownItems.size > 0
      ? knownItems
      : null;

  let currentLocation = state.currentLocation;
  if (!roomIds.has(currentLocation)) {
    currentLocation = def.startRoom;
  }

  let visitedLocations = (state.visitedLocations ?? []).filter(
    (id) => typeof id === "string" && roomIds.has(id)
  );
  if (!visitedLocations.includes(def.startRoom)) {
    visitedLocations = [def.startRoom, ...visitedLocations];
  }
  visitedLocations = [...new Set(visitedLocations)].slice(0, MAX_VISITED);

  const inventory = sanitizeInventory(state.inventory, strictItems);

  const actorInventories: Record<string, GameItem[]> = {};
  for (const [actorId, bag] of Object.entries(state.actorInventories ?? {})) {
    if (!isSafeIdentifierKey(actorId)) continue;
    actorInventories[actorId] = sanitizeInventory(bag, strictItems);
  }

  const achievementIds = new Set(def.achievements.map((a) => a.id));
  const achievements = (state.achievements ?? [])
    .filter((a) => a && achievementIds.has(a.id))
    .map((a) => ({
      ...a,
      unlocked: !!a.unlocked,
    }));

  const questIds = new Set(def.quests.map((q) => q.id));
  const quests = (state.quests ?? []).filter((q) => q && questIds.has(q.id));

  const journalEntries = (state.journalEntries ?? [])
    .filter(
      (e) =>
        e &&
        isSafeIdentifierKey(e.id) &&
        typeof e.title === "string" &&
        typeof e.content === "string"
    )
    .slice(0, MAX_JOURNAL);

  return {
    ...state,
    currentLocation,
    visitedLocations,
    inventory,
    actorInventories,
    flags: sanitizeStringRecord(
      state.flags ?? {},
      (v): v is boolean => typeof v === "boolean"
    ),
    vars: sanitizeStringRecord(
      state.vars ?? {},
      (v): v is number | string =>
        typeof v === "number" || typeof v === "string"
    ),
    objectStates: sanitizeStringRecord(
      state.objectStates ?? {},
      (v): v is number => typeof v === "number" && Number.isFinite(v)
    ),
    dialogueState: sanitizeStringRecord(
      state.dialogueState ?? {},
      (v): v is number => typeof v === "number" && Number.isFinite(v)
    ),
    hintProgress: sanitizeStringRecord(
      state.hintProgress ?? {},
      (v): v is number => typeof v === "number" && Number.isFinite(v)
    ),
    achievements,
    quests,
    journalEntries,
    gameComplete: !!state.gameComplete,
  };
}

export {
  resolveMapTravelPolicy,
  canMapTravelTo as canFastTravelTo,
} from "./mapFog";
