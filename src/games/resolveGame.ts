/**
 * Resolve a playable pack from the static catalog or Studio-installed drafts.
 * Filtered by active product (`VITE_PRODUCT`) — see `src/product/productConfig.ts`.
 */

import type { GameCatalogEntry } from "./registry";
import { gameCatalog, getGameById } from "./registry";
import {
  getInstalledPackDoc,
  installedPackToCatalogEntry,
  listInstalledCatalogEntries,
} from "@/studio/installedPacks";
import { isStrictPlayEnabled } from "@/engine/deployLock";
import {
  filterCatalogForProduct,
  getProductConfig,
  isGameVisibleInProduct,
} from "@/product/productConfig";

/** Static + installed packs for the launcher (product-filtered). */
export function listPlayableGames(): GameCatalogEntry[] {
  const product = getProductConfig();
  const installed = listInstalledCatalogEntries();
  const staticIds = new Set(gameCatalog.map((g) => g.id));

  let merged: GameCatalogEntry[];

  // Deploy lock: never let localStorage drafts replace shipped pack ids.
  if (isStrictPlayEnabled()) {
    merged = [
      ...gameCatalog,
      ...installed.filter((i) => !staticIds.has(i.id)),
    ];
  } else {
    merged = [
      ...gameCatalog.map((g) => {
        const override = installed.find((i) => i.id === g.id);
        return override ?? g;
      }),
      ...installed.filter((i) => !staticIds.has(i.id)),
    ];
  }

  // Title products + VITE_LOCKED_GAMES filter.
  return filterCatalogForProduct(merged, product);
}

export function resolvePlayableGame(id: string): GameCatalogEntry | null {
  const product = getProductConfig();

  if (!isGameVisibleInProduct(id, product)) {
    return null;
  }

  // Deploy lock: shipped catalog wins over Studio-installed overrides.
  if (isStrictPlayEnabled()) {
    const shipped = getGameById(id);
    if (shipped) return shipped;
    if (product.isTitleProduct) return null;
    const installed = getInstalledPackDoc(id);
    return installed ? installedPackToCatalogEntry(installed) : null;
  }

  const installed = getInstalledPackDoc(id);
  if (installed) {
    return installedPackToCatalogEntry(installed);
  }

  return getGameById(id);
}
