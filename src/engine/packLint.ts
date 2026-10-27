/**
 * Pack lint rules shared by pack doctor, validateJsonPack (warnings), and design coach.
 * Focus: silent interactions, dead use-with refs, tiny hotspots.
 */

import type { JsonPackDocument, JsonPackHotspot } from "./jsonPack";

/** Item ids authors can reasonably use in use-with / combinations / exits. */
export function collectKnownItemIds(doc: JsonPackDocument): Set<string> {
  const ids = new Set<string>();
  for (const id of Object.keys(doc.items ?? {})) {
    if (id.trim()) ids.add(id);
  }
  for (const room of Object.values(doc.rooms ?? {})) {
    for (const h of room.hotspots ?? []) {
      if (h.itemId?.trim()) ids.add(h.itemId.trim());
      for (const rule of h.useWith ?? []) {
        if (rule.giveItem?.id?.trim()) ids.add(rule.giveItem.id.trim());
      }
    }
  }
  for (const combo of Object.values(doc.combinations ?? {})) {
    if (combo?.result?.id?.trim()) ids.add(combo.result.id.trim());
  }
  return ids;
}

function hotspotHasLookOrUse(h: JsonPackHotspot): boolean {
  if (h.lookText?.trim()) return true;
  if (h.useText?.trim()) return true;
  if ((h.actions?.length ?? 0) > 0) return true;
  if ((h.useWith?.length ?? 0) > 0) return true;
  if (h.kind === "pickup" && h.itemId) return true;
  if (h.kind === "character" && (h.dialogue?.lines?.length ?? 0) > 0) {
    return true;
  }
  return false;
}

/**
 * Hotspots that will never produce feedback — classic “handler never fires”
 * authoring trap (AGS unlinked events analog).
 */
export function lintSilentHotspots(doc: JsonPackDocument): string[] {
  const warnings: string[] = [];
  for (const [roomId, room] of Object.entries(doc.rooms ?? {})) {
    for (const h of room.hotspots ?? []) {
      if (h.kind === "character") {
        if (!(h.dialogue?.lines?.length) && !(h.actions?.length)) {
          warnings.push(
            `character hotspot "${roomId}/${h.id}" has no dialogue or actions — Talk will do nothing`
          );
        }
      } else if (!hotspotHasLookOrUse(h)) {
        warnings.push(
          `hotspot "${roomId}/${h.id}" has no Look/Use/actions — interaction will do nothing`
        );
      }
      if (
        Array.isArray(h.actionVerbs) &&
        h.actionVerbs.length === 0 &&
        (h.actions?.length ?? 0) > 0
      ) {
        warnings.push(
          `hotspot "${roomId}/${h.id}" has actions but actionVerbs is empty — handlers never fire`
        );
      }
    }
  }
  return warnings;
}

/** use-with / combinations / exit gates pointing at unknown items. */
export function lintDeadItemRefs(doc: JsonPackDocument): string[] {
  const known = collectKnownItemIds(doc);
  const warnings: string[] = [];

  for (const [roomId, room] of Object.entries(doc.rooms ?? {})) {
    for (const h of room.hotspots ?? []) {
      for (const rule of h.useWith ?? []) {
        const itemId = rule.itemId?.trim();
        if (itemId && !known.has(itemId)) {
          warnings.push(
            `use-with on "${roomId}/${h.id}" references unknown item "${itemId}" — rule never matches`
          );
        }
      }
    }
  }

  for (const [key, combo] of Object.entries(doc.combinations ?? {})) {
    for (const itemId of combo?.items ?? []) {
      if (itemId?.trim() && !known.has(itemId.trim())) {
        warnings.push(
          `combination "${key}" references unknown item "${itemId}" — never craftable`
        );
      }
    }
  }

  for (const link of doc.links ?? []) {
    const need = link.requireItem?.trim();
    if (need && !known.has(need)) {
      warnings.push(
        `link ${link.from}→${link.to} requireItem "${need}" is unknown — exit stays blocked`
      );
    }
  }

  return warnings;
}

/** Hotspots under 4% in either dimension — hard to tap. */
export function lintTinyHotspots(doc: JsonPackDocument): string[] {
  const warnings: string[] = [];
  for (const [roomId, room] of Object.entries(doc.rooms ?? {})) {
    for (const h of room.hotspots ?? []) {
      if (h.width < 4 || h.height < 4) {
        warnings.push(
          `hotspot "${roomId}/${h.id}" is under 4% size (${h.width}×${h.height}) — hard to tap on phones`
        );
      }
    }
  }
  return warnings;
}

/** All pack lint warnings (non-blocking). */
export function lintJsonPack(doc: JsonPackDocument): string[] {
  return [
    ...lintSilentHotspots(doc),
    ...lintDeadItemRefs(doc),
    ...lintTinyHotspots(doc),
  ];
}
