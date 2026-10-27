import type { GameDefinition } from "./definition";

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Structural checks for a GameDefinition.
 * Call at boot / CI so broken packs fail fast instead of mid-play.
 */
export function validateGameDefinition(
  def: GameDefinition
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!def.id?.trim()) errors.push("missing id");
  if (!def.title?.trim()) errors.push("missing title");
  if (!def.version?.trim()) errors.push("missing version");
  if (!def.startRoom?.trim()) errors.push("missing startRoom");
  if (!def.rooms || Object.keys(def.rooms).length === 0) {
    errors.push("rooms is empty");
  }

  if (def.startRoom && def.rooms && !def.rooms[def.startRoom]) {
    errors.push(`startRoom "${def.startRoom}" not found in rooms`);
  }

  if (def.egoId && def.actors && !def.actors[def.egoId]) {
    errors.push(`egoId "${def.egoId}" not found in actors`);
  }

  if (def.playableActors) {
    for (const id of def.playableActors) {
      if (def.actors && !def.actors[id]) {
        errors.push(`playableActors entry "${id}" not found in actors`);
      }
    }
  }

  if (def.rooms) {
    for (const [roomKey, room] of Object.entries(def.rooms)) {
      const roomId = room.id || roomKey;
      if (!room.id) {
        errors.push(`room key "${roomKey}" missing id`);
      } else if (room.id !== roomKey) {
        warnings.push(`room key "${roomKey}" !== room.id "${room.id}"`);
      }
      if (!room.image) {
        warnings.push(`room "${roomId}" has no image`);
      }

      const hotspotIds = new Set<string>();
      for (const h of room.hotspots ?? []) {
        if (!h.id) {
          errors.push(`room "${roomId}" has hotspot without id`);
          continue;
        }
        if (hotspotIds.has(h.id)) {
          errors.push(`room "${roomId}" duplicate hotspot id "${h.id}"`);
        }
        hotspotIds.add(h.id);

        if (
          h.actorId &&
          def.actors &&
          !Object.prototype.hasOwnProperty.call(def.actors, h.actorId)
        ) {
          warnings.push(
            `hotspot "${roomId}/${h.id}" actorId "${h.actorId}" not in actors`
          );
        }
        if (
          h.special &&
          def.specials &&
          !Object.prototype.hasOwnProperty.call(def.specials, h.special)
        ) {
          errors.push(
            `hotspot "${roomId}/${h.id}" special "${h.special}" not in specials`
          );
        }
      }

      for (const exit of room.exits ?? []) {
        if (!exit.to) {
          errors.push(`room "${roomId}" exit missing "to"`);
          continue;
        }
        if (!def.rooms[exit.to]) {
          errors.push(
            `room "${roomId}" exit "${exit.label || exit.direction}" → unknown room "${exit.to}"`
          );
        }
      }

      for (const scriptId of room.autoScripts ?? []) {
        const inNamed = !!def.namedScripts?.[scriptId];
        const inLocal = !!room.localScripts?.[scriptId];
        if (!inNamed && !inLocal) {
          errors.push(
            `room "${roomId}" autoScripts references missing script "${scriptId}"`
          );
        }
      }
    }
  }

  // Map groups reference real rooms
  if (def.mapGroups) {
    for (const [group, ids] of Object.entries(def.mapGroups)) {
      for (const id of ids) {
        if (!def.rooms[id]) {
          errors.push(`mapGroups["${group}"] references unknown room "${id}"`);
        }
      }
    }
  }

  // Combinations
  for (const [key, combo] of Object.entries(def.combinations ?? {})) {
    if (!combo?.items || combo.items.length !== 2) {
      errors.push(`combination "${key}" must have items: [a, b]`);
    }
    if (!combo?.result?.id) {
      warnings.push(`combination "${key}" missing result.id`);
    }
  }

  // Cutscenes / flag triggers
  if (def.flagCutscenes) {
    for (const [flag, cutsceneId] of Object.entries(def.flagCutscenes)) {
      if (!def.cutscenes?.[cutsceneId]) {
        errors.push(
          `flagCutscenes["${flag}"] → unknown cutscene "${cutsceneId}"`
        );
      }
    }
  }

  // Comics referenced by specials
  if (def.specials) {
    for (const [key, special] of Object.entries(def.specials)) {
      if (typeof special.run !== "function") {
        errors.push(`specials["${key}"] missing run()`);
      }
    }
  }

  if (def.comics) {
    for (const [id, comic] of Object.entries(def.comics)) {
      if (!comic.pages?.length) {
        warnings.push(`comics["${id}"] has no pages`);
      }
    }
  }

  // Achievement / quest id uniqueness
  const achIds = new Set<string>();
  for (const a of def.achievements ?? []) {
    if (achIds.has(a.id)) errors.push(`duplicate achievement id "${a.id}"`);
    achIds.add(a.id);
  }
  const questIds = new Set<string>();
  for (const q of def.quests ?? []) {
    if (questIds.has(q.id)) errors.push(`duplicate quest id "${q.id}"`);
    questIds.add(q.id);
  }

  // Hint ids
  const hintIds = new Set<string>();
  for (const h of def.hints ?? []) {
    if (hintIds.has(h.id)) errors.push(`duplicate hint id "${h.id}"`);
    hintIds.add(h.id);
    if (!h.tiers?.length) warnings.push(`hint "${h.id}" has no tiers`);
  }

  return { ok: errors.length === 0, errors, warnings };
}

/** Throw if the pack is structurally invalid. */
export function assertValidGameDefinition(def: GameDefinition): void {
  const result = validateGameDefinition(def);
  for (const w of result.warnings) {
    console.warn(`[adventure:${def.id}] ${w}`);
  }
  if (!result.ok) {
    throw new Error(
      `Invalid GameDefinition "${def.id}":\n- ${result.errors.join("\n- ")}`
    );
  }
}
