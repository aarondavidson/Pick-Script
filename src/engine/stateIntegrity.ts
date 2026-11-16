/**
 * Sanitize play state against a pack definition.
 * Drops unknown rooms, malformed inventory, unsafe media icons, and
 * oversized collections so forged saves / console patches cannot invent
 * locations or break the runtime with garbage.
 */

import type { GameDefinition } from "./definition";
import type { GameItem, GameState, Quest } from "./types";
import { createInitialActors } from "./actors";
import {
  isSafeIdentifierKey,
  isSafePlayMediaUrl,
  sanitizeStringRecord,
} from "./security";

const MAX_INVENTORY = 64;
const MAX_JOURNAL = 200;
const MAX_VISITED = 256;
const MAX_RUNTIME_QUESTS = 50;

/** Shape check for a quest that is not declared in the pack. */
function isWellFormedRuntimeQuest(q: unknown): q is Quest {
  if (!q || typeof q !== "object") return false;
  const row = q as Quest;
  return (
    isSafeIdentifierKey(row.id) &&
    typeof row.title === "string" &&
    row.title.length <= 200 &&
    typeof row.description === "string" &&
    row.description.length <= 2_000 &&
    Array.isArray(row.objectives) &&
    row.objectives.length <= 32 &&
    row.objectives.every((o) => typeof o === "string" && o.length <= 400)
  );
}

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

  // Pack quests, plus quests a script added at runtime (`addQuest`) — those
  // are not in the definition, so they are kept when well-formed.
  const questIds = new Set(def.quests.map((q) => q.id));
  const quests = (state.quests ?? [])
    .filter((q) => q && (questIds.has(q.id) || isWellFormedRuntimeQuest(q)))
    .slice(0, def.quests.length + MAX_RUNTIME_QUESTS);

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

/**
 * Bring a loaded save up to date with the current pack content.
 *
 * Saves store a snapshot of achievements / quests / actors. When a pack
 * update adds new ones, an old save would never be able to unlock or show
 * them. This fills the gaps without touching recorded progress:
 *
 * - achievements / quests: pack order and text win; `unlocked`, `timestamp`,
 *   `completed`, `completedObjectives` are kept from the save
 * - actors: instances are added for actors the save has never seen
 * - flags / objectStates: `initialFlags` / `initialObjectStates` keys that
 *   are absent from the save get their initial value (present keys are kept)
 * - ego: falls back to the pack ego when the saved one no longer exists
 *
 * Runs on save load only (not per state patch).
 */
export function reconcileStateWithDefinition(
  state: GameState,
  def: GameDefinition
): GameState {
  const savedAch = new Map((state.achievements ?? []).map((a) => [a.id, a]));
  const achievements = def.achievements.map((a) => {
    const saved = savedAch.get(a.id);
    return {
      ...a,
      unlocked: !!saved?.unlocked,
      ...(typeof saved?.timestamp === "number"
        ? { timestamp: saved.timestamp }
        : {}),
    };
  });

  const savedQuests = new Map((state.quests ?? []).map((q) => [q.id, q]));
  const quests = def.quests.map((q) => {
    const saved = savedQuests.get(q.id);
    const done = Array.isArray(saved?.completedObjectives)
      ? saved.completedObjectives.filter(
          (i) => Number.isInteger(i) && i >= 0 && i < q.objectives.length
        )
      : [];
    return { ...q, completed: !!saved?.completed, completedObjectives: done };
  });
  // Quests added at runtime are not in the pack — carry them over after it
  const packQuestIds = new Set(def.quests.map((q) => q.id));
  for (const saved of state.quests ?? []) {
    if (!saved || packQuestIds.has(saved.id)) continue;
    quests.push({
      ...saved,
      completed: !!saved.completed,
      completedObjectives: Array.isArray(saved.completedObjectives)
        ? saved.completedObjectives.filter(
            (i) =>
              Number.isInteger(i) && i >= 0 && i < saved.objectives.length
          )
        : [],
    });
  }

  const actors = { ...(state.actors ?? {}) };
  for (const [id, inst] of Object.entries(createInitialActors(def))) {
    if (!Object.prototype.hasOwnProperty.call(actors, id)) actors[id] = inst;
  }

  let egoId = state.egoId ?? null;
  if (egoId && def.actors && !def.actors[egoId]) egoId = def.egoId ?? null;
  if (!egoId && def.egoId) egoId = def.egoId;

  return {
    ...state,
    achievements,
    quests,
    actors,
    egoId,
    flags: { ...(def.initialFlags ?? {}), ...(state.flags ?? {}) },
    objectStates: {
      ...(def.initialObjectStates ?? {}),
      ...(state.objectStates ?? {}),
    },
  };
}

export {
  resolveMapTravelPolicy,
  canMapTravelTo as canFastTravelTo,
} from "./mapFog";
