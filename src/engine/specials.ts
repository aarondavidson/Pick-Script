import type { GameState, Hotspot, StatePatch, VerbId } from "./types";
import { isSafeIdentifierKey } from "./security";

/** Optional declarative minigame payload (sequence / slider config, winFlag). */
export type PackMinigameConfig = Record<string, unknown>;

/** Presentation modalities the shared shell knows how to open. */
export type PackModality =
  | { type: "comic"; comicId: string }
  | {
      type: "minigame";
      minigameId: string;
      /** Sanitized declarative config (sequence-lock / slider-puzzle). */
      config?: PackMinigameConfig;
    };

export interface SpecialActionResult {
  patch?: StatePatch;
  message?: string;
  modality?: PackModality;
}

export interface SpecialActionContext {
  hotspot: Hotspot;
  verb: VerbId;
  state: GameState;
}

/**
 * Pack-defined special for a hotspot (trade, minigame, comic, …).
 *
 * - If `interceptVerbs` includes the current verb, the special runs
 *   instead of normal verb resolution when it returns a result.
 * - Otherwise the special runs as an after-hook following a successful
 *   normal interaction (e.g. an NPC trade checks inventory flags).
 */
export interface SpecialActionDef {
  interceptVerbs?: VerbId[];
  run: (ctx: SpecialActionContext) => SpecialActionResult | null | undefined;
}

export interface ModalityWinResult {
  patch?: StatePatch;
  message?: string;
  achievementId?: string;
  journalEntry?: {
    id: string;
    title: string;
    content: string;
  };
}

/** Comic reader payload (images are URL strings from Vite imports). */
export interface ComicPage {
  title: string;
  subtitle?: string;
  content: string;
  panel: string;
  image: string;
}

export interface ComicDef {
  id: string;
  title: string;
  pages: ComicPage[];
}

export function resolveSpecialDef(
  specials: Record<string, SpecialActionDef> | undefined,
  hotspot: Hotspot
): SpecialActionDef | null {
  if (!specials) return null;
  const key = hotspot.special ?? hotspot.id;
  // Bracket lookup of "__proto__" returns Object.prototype, not a missing key.
  if (
    !isSafeIdentifierKey(key) ||
    !Object.prototype.hasOwnProperty.call(specials, key)
  ) {
    return null;
  }
  const def = specials[key];
  if (!def || typeof def.run !== "function") return null;
  return def;
}

/** Own-property comic lookup. Rejects prototype keys and non-comic values. */
export function lookupComic(
  comics: Record<string, ComicDef> | undefined,
  comicId: string | undefined | null
): ComicDef | null {
  if (!comics || !isSafeIdentifierKey(comicId)) return null;
  if (!Object.prototype.hasOwnProperty.call(comics, comicId)) return null;
  const comic = comics[comicId];
  if (!comic || !Array.isArray(comic.pages) || !comic.pages.length) return null;
  return comic;
}
