/**
 * Browser-installed JSON packs — publish from Studio → appear on Launcher.
 */

import {
  createGameFromJson,
  parseJsonPack,
  type JsonPackDocument,
} from "@/engine/jsonPack";
import type { GameCatalogEntry } from "@/games/registry";
import { safeJsonParse, STORAGE_LIMITS } from "@/engine/security";

export const INSTALLED_PACKS_KEY = "studio-installed-packs-v1";

export function listInstalledPackDocs(): JsonPackDocument[] {
  try {
    const raw = localStorage.getItem(INSTALLED_PACKS_KEY);
    if (!raw) return [];
    if (raw.length > STORAGE_LIMITS.maxInstalledPackChars) return [];
    const arr = safeJsonParse<unknown>(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .slice(0, STORAGE_LIMITS.maxInstalledPacks)
      .map((row) => {
        try {
          return parseJsonPack(row);
        } catch {
          return null;
        }
      })
      .filter((d): d is JsonPackDocument => !!d);
  } catch {
    return [];
  }
}

export function getInstalledPackDoc(id: string): JsonPackDocument | null {
  return listInstalledPackDocs().find((d) => d.id === id) ?? null;
}

/** Upsert pack into the local launcher catalog. */
export function installPack(doc: JsonPackDocument): JsonPackDocument {
  const parsed = parseJsonPack(doc);
  const rest = listInstalledPackDocs().filter((d) => d.id !== parsed.id);
  const next = [...rest, parsed].slice(-STORAGE_LIMITS.maxInstalledPacks);
  const payload = JSON.stringify(next);
  if (payload.length > STORAGE_LIMITS.maxInstalledPackChars) {
    throw new Error(
      "Installed pack catalog is too large — uninstall older packs or shrink embedded images."
    );
  }
  localStorage.setItem(INSTALLED_PACKS_KEY, payload);
  return parsed;
}

export function uninstallPack(id: string): void {
  const next = listInstalledPackDocs().filter((d) => d.id !== id);
  localStorage.setItem(INSTALLED_PACKS_KEY, JSON.stringify(next));
}

export function installedPackToCatalogEntry(
  doc: JsonPackDocument
): GameCatalogEntry {
  const definition = createGameFromJson(doc);
  return {
    id: definition.id,
    title: definition.title,
    subtitle: definition.subtitle,
    version: definition.version,
    blurb: "Installed from P.I.C.K. (this browser).",
    definition,
  };
}

export function listInstalledCatalogEntries(): GameCatalogEntry[] {
  return listInstalledPackDocs().map(installedPackToCatalogEntry);
}
