/**
 * Product config — what the launcher, routes and native shell present.
 *
 * This repository ships one product: `engine` (Portable Adventure Engine —
 * P.I.C.K. + S.C.R.I.P.T.). A game built on the engine can add its own
 * single-title product (`isTitleProduct: true`) in its own repository.
 *
 * Layers: P.I.C.K. = editor/IDE · S.C.R.I.P.T. = runtime (see branding.ts).
 */

import {
  ENGINE_DESCRIPTION,
  ENGINE_DOCUMENT_TITLE,
  ENGINE_TAGLINE,
  ENGINE_UMBRELLA,
  PICK,
  SCRIPT,
} from "./branding";
export type ProductId = "engine";

export interface ProductConfig {
  id: ProductId;
  /** Browser / PWA title */
  documentTitle: string;
  /** Launcher H1 / native app name */
  brandName: string;
  /** One-line pitch under the brand */
  tagline: string;
  /** Meta description */
  description: string;
  /** Capacitor / store application id */
  appId: string;
  /** Default /play/:id when the route omits gameId */
  defaultGameId: string;
  /**
   * Catalog filter. `null` = all static packs (engine).
   * Title products only expose their own shipped id.
   */
  catalogGameIds: string[] | null;
  /** Show Design studio pitch + /studio entry on the launcher */
  showStudioChrome: boolean;
  /** Show .pack.json import on the launcher */
  showPackImport: boolean;
  /** Featured card on multi-pack launcher (engine only) */
  featuredGameId: string | null;
  /** Home link label from play UI */
  homeLinkLabel: string;
  /** Title-product: treat home as a single-game splash */
  isTitleProduct: boolean;
}

const PRODUCTS: Record<ProductId, ProductConfig> = {
  engine: {
    id: "engine",
    documentTitle: ENGINE_DOCUMENT_TITLE,
    brandName: ENGINE_UMBRELLA,
    tagline: ENGINE_TAGLINE,
    description: ENGINE_DESCRIPTION,
    appId: "com.portableadventure.engine",
    defaultGameId: "attic-study",
    catalogGameIds: null,
    showStudioChrome: true,
    showPackImport: true,
    featuredGameId: "attic-study",
    homeLinkLabel: "Games",
    isTitleProduct: false,
  },
};

export function parseProductId(raw: unknown): ProductId {
  return typeof raw === "string" && raw in PRODUCTS
    ? (raw as ProductId)
    : "engine";
}

/** Active product from `VITE_PRODUCT` (default: engine). */
export function getProductId(): ProductId {
  return parseProductId(import.meta.env.VITE_PRODUCT);
}

export function getProductConfig(id: ProductId = getProductId()): ProductConfig {
  return PRODUCTS[id] ?? PRODUCTS.engine;
}

/**
 * Shipped pack ids locked out of this deploy (`VITE_LOCKED_GAMES`).
 * Comma-separated, e.g. `harbor-fog` or `harbor-fog,attic-study`.
 * Hidden from the launcher and `/play/:id` returns not found.
 */
export function getLockedGameIds(
  raw: unknown = import.meta.env.VITE_LOCKED_GAMES
): Set<string> {
  if (typeof raw !== "string" || !raw.trim()) return new Set();
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

export function isGameLocked(
  gameId: string,
  locked: Set<string> = getLockedGameIds()
): boolean {
  return locked.has(gameId);
}

/** Whether a catalog / play id is visible for this product (+ lock list). */
export function isGameVisibleInProduct(
  gameId: string,
  product: ProductConfig = getProductConfig()
): boolean {
  if (isGameLocked(gameId)) return false;
  if (!product.catalogGameIds) return true;
  return product.catalogGameIds.includes(gameId);
}

export function filterCatalogForProduct<T extends { id: string }>(
  entries: T[],
  product: ProductConfig = getProductConfig()
): T[] {
  return entries.filter((e) => isGameVisibleInProduct(e.id, product));
}
