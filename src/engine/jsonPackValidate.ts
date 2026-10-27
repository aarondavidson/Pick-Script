/**
 * Validate JSON pack structure + compiled GameDefinition.
 */

import { validateGameDefinition } from "./validate";
import { lintJsonPack } from "./packLint";
import {
  linkValidationResult,
  type LinkedValidationResult,
} from "./validationHelp";
import type { JsonPackDocument } from "./jsonPackTypes";
import { parseJsonPack } from "./jsonPackCompile";
import { createGameFromJson } from "./jsonPackCreateGame";
import { sanitizeJsonPackSpecial } from "./jsonPackSpecials";

/** Validate JSON pack structure + compiled GameDefinition (with fix-it links). */
export function validateJsonPack(doc: JsonPackDocument): LinkedValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    parseJsonPack(doc);
  } catch (e) {
    return linkValidationResult({
      ok: false,
      errors: [e instanceof Error ? e.message : String(e)],
      warnings: [],
    });
  }

  warnings.push(...lintJsonPack(doc));

  if (!doc.rooms[doc.startRoom]) {
    errors.push(`startRoom "${doc.startRoom}" not found in rooms`);
  }

  for (const link of doc.links ?? []) {
    if (!doc.rooms[link.from]) {
      errors.push(`link from unknown room "${link.from}"`);
    }
    if (!doc.rooms[link.to]) {
      errors.push(`link to unknown room "${link.to}"`);
    }
    if (!link.fromLabel?.trim() || !link.toLabel?.trim()) {
      warnings.push(
        `link ${link.from}→${link.to} should have fromLabel and toLabel`
      );
    }
  }

  for (const [id, room] of Object.entries(doc.rooms)) {
    if (!room.image?.trim()) {
      warnings.push(`room "${id}" has no image (placeholder will be used)`);
    }
    for (const h of room.hotspots ?? []) {
      if (h.kind === "pickup" && !h.itemId) {
        errors.push(`pickup hotspot "${id}/${h.id}" missing itemId`);
      }
      for (const rule of h.useWith ?? []) {
        if (!rule.itemId?.trim()) {
          errors.push(
            `use-with on hotspot "${id}/${h.id}" missing itemId`
          );
        }
      }
      if (
        (h.kind === "use-with-target" || (h.useWith?.length ?? 0) > 0) &&
        !(h.useWith?.length)
      ) {
        warnings.push(
          `use-with target "${id}/${h.id}" has no useWith rules yet`
        );
      }
      if (h.kind === "character" && h.dialogue?.lines?.length) {
        for (const line of h.dialogue.lines) {
          if (!line.id || !line.text?.trim()) {
            errors.push(
              `dialogue on "${id}/${h.id}" has a line missing id/text`
            );
          }
          if ((line.choices?.length ?? 0) > 3) {
            warnings.push(
              `dialogue "${id}/${h.id}" line ${line.id} has >3 choices (lite cap)`
            );
          }
        }
      }
      if (h.special) {
        const packComicIds = new Set(Object.keys(doc.comics ?? {}));
        const safe = sanitizeJsonPackSpecial(h.special, packComicIds);
        if (!safe) {
          errors.push(
            `hotspot "${id}/${h.id}" special is not allowlisted (kind/id)`
          );
        } else if (safe.kind === "comic" && safe.comicId && !doc.comics?.[safe.comicId]) {
          warnings.push(
            `comic special on "${id}/${h.id}" references "${safe.comicId}" — add pack.comics pages for JSON packs`
          );
        }
      }
    }
  }

  for (const [itemId, item] of Object.entries(doc.items ?? {})) {
    if (!item?.id || item.id !== itemId) {
      warnings.push(`items["${itemId}"] should set id: "${itemId}"`);
    }
    if (!item?.name?.trim()) {
      errors.push(`item "${itemId}" missing name`);
    }
  }

  for (const [key, combo] of Object.entries(doc.combinations ?? {})) {
    if (!combo?.items?.[0] || !combo?.items?.[1]) {
      errors.push(`combination "${key}" needs two item ids`);
    }
    if (!combo?.result?.id) {
      errors.push(`combination "${key}" missing result.id`);
    }
  }

  if (errors.length) {
    return linkValidationResult({ ok: false, errors, warnings });
  }

  const compiled = createGameFromJson(doc);
  const result = validateGameDefinition(compiled);
  return linkValidationResult({
    ok: result.ok,
    errors: result.errors,
    warnings: [...warnings, ...result.warnings],
  });
}
