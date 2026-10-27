/**
 * Compile JSON pack hotspot specials → SpecialActionDef + ComicDef maps.
 * Security: only allowlisted kinds and modality / comic ids.
 */

import type { ComicDef, SpecialActionDef } from "./specials";
import {
  isDangerousKey,
  isSafeIdentifierKey,
  isSafeMediaUrl,
  isSafePlayMediaUrl,
} from "./security";
import type { GameItem, VerbId } from "./types";
import type {
  JsonPackComic,
  JsonPackDocument,
  JsonPackItem,
  JsonPackSpecial,
  JsonPackSpecialKind,
} from "./jsonPackTypes";

/** Minigame ids the shared shell registers (see modalityRegistry). */
export const ALLOWED_MINIGAME_IDS = [
  "pixel-invaders",
  "hacking",
  "sequence-lock",
  "slider-puzzle",
  "dial-lock",
  "wire-match",
] as const;

/** Convention win flags when config.winFlag is omitted. */
export const DEFAULT_MINIGAME_WIN_FLAGS: Record<string, string> = {
  "sequence-lock": "beatSequenceLock",
  "slider-puzzle": "beatSliderPuzzle",
  "dial-lock": "beatDialLock",
  "wire-match": "beatWireMatch",
};

const MAX_SEQUENCE_LEN = 8;
const MAX_SLIDER_LEN = 4;
const MIN_SLIDER_LEN = 3;
const MAX_LABEL_LEN = 32;
const MAX_DIAL_COUNT = 6;
const MIN_DIAL_COUNT = 2;
const MAX_DIAL_POSITIONS = 12;
const MIN_DIAL_POSITIONS = 2;
const MAX_WIRE_PAIRS = 8;
const MIN_WIRE_PAIRS = 2;

const SPECIAL_KINDS = new Set<JsonPackSpecialKind>([
  "minigame",
  "comic",
  "trade",
]);

const VERB_SET = new Set<VerbId>([
  "look",
  "talk",
  "use",
  "pickup",
  "open",
  "push",
  "pull",
  "give",
]);

function sanitizeId(raw: string | undefined, max = 64): string {
  if (typeof raw !== "string") return "";
  return raw.trim().slice(0, max);
}

/** Identifier used as an object key or flag. Drops __proto__ / constructor. */
function sanitizeKey(raw: string | undefined, max = 64): string {
  const trimmed = sanitizeId(raw, max);
  return trimmed && isSafeIdentifierKey(trimmed, max) ? trimmed : "";
}

function sanitizeVerbs(raw: VerbId[] | undefined): VerbId[] | undefined {
  if (!raw?.length) return undefined;
  const out = raw.filter((v) => VERB_SET.has(v));
  return out.length ? out : undefined;
}

function sanitizeIdList(
  raw: unknown,
  maxLen: number
): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw.slice(0, maxLen)) {
    const id = sanitizeKey(typeof item === "string" ? item : undefined, 32);
    if (id) out.push(id);
  }
  return out;
}

function sanitizeLabels(
  raw: unknown
): Record<string, string> | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const out: Record<string, string> = Object.create(null);
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const key = sanitizeKey(k, 32);
    if (!key || typeof v !== "string") continue;
    const label = v.trim().slice(0, MAX_LABEL_LEN);
    if (label) out[key] = label;
  }
  return Object.keys(out).length ? out : undefined;
}

/**
 * Sanitize declarative minigame config. Returns undefined for games that
 * take no config, or null when config is present but unusable/evil.
 */
export function sanitizeMinigameConfig(
  minigameId: string,
  raw: unknown
): Record<string, unknown> | undefined | null {
  if (raw == null) {
    // Defaults for declarative templates so Studio can attach without config.
    if (minigameId === "sequence-lock") {
      return {
        sequence: ["a", "b", "c", "d"],
        winFlag: DEFAULT_MINIGAME_WIN_FLAGS["sequence-lock"],
      };
    }
    if (minigameId === "slider-puzzle") {
      return {
        order: ["b", "r", "g"],
        target: ["r", "g", "b"],
        winFlag: DEFAULT_MINIGAME_WIN_FLAGS["slider-puzzle"],
      };
    }
    if (minigameId === "dial-lock") {
      return {
        positions: 10,
        target: [3, 7, 1],
        winFlag: DEFAULT_MINIGAME_WIN_FLAGS["dial-lock"],
      };
    }
    if (minigameId === "wire-match") {
      return {
        pairs: [
          ["a", "1"],
          ["b", "2"],
          ["c", "3"],
        ],
        winFlag: DEFAULT_MINIGAME_WIN_FLAGS["wire-match"],
      };
    }
    return undefined;
  }
  if (typeof raw !== "object" || Array.isArray(raw)) return null;

  const cfg = raw as Record<string, unknown>;
  // Reject prototype-pollution vectors on the config object itself.
  for (const k of Object.keys(cfg)) {
    if (isDangerousKey(k)) return null;
  }

  const winFlagRaw = sanitizeKey(
    typeof cfg.winFlag === "string" ? cfg.winFlag : undefined
  );
  const defaultFlag = DEFAULT_MINIGAME_WIN_FLAGS[minigameId];

  if (minigameId === "sequence-lock") {
    let sequence = sanitizeIdList(cfg.sequence, MAX_SEQUENCE_LEN);
    if (sequence.length < 2) {
      sequence = ["a", "b", "c", "d"];
    }
    const labels = sanitizeLabels(cfg.labels);
    return {
      sequence,
      ...(labels ? { labels } : {}),
      winFlag: winFlagRaw || defaultFlag || "beatSequenceLock",
    };
  }

  if (minigameId === "slider-puzzle") {
    let order = sanitizeIdList(cfg.order, MAX_SLIDER_LEN);
    let target = sanitizeIdList(cfg.target, MAX_SLIDER_LEN);
    if (order.length < MIN_SLIDER_LEN) order = ["b", "r", "g"];
    if (target.length < MIN_SLIDER_LEN) target = ["r", "g", "b"];
    // Align lengths to the shorter sanitized list (3–4).
    const len = Math.min(
      Math.max(order.length, MIN_SLIDER_LEN),
      Math.max(target.length, MIN_SLIDER_LEN),
      MAX_SLIDER_LEN
    );
    order = order.slice(0, len);
    target = target.slice(0, len);
    while (order.length < len) order.push(`s${order.length}`);
    while (target.length < len) target.push(`s${target.length}`);
    return {
      order,
      target,
      winFlag: winFlagRaw || defaultFlag || "beatSliderPuzzle",
    };
  }

  if (minigameId === "dial-lock") {
    let positions =
      typeof cfg.positions === "number" && Number.isFinite(cfg.positions)
        ? Math.floor(cfg.positions)
        : 10;
    positions = Math.min(
      MAX_DIAL_POSITIONS,
      Math.max(MIN_DIAL_POSITIONS, positions)
    );
    let target: number[] = [];
    if (Array.isArray(cfg.target)) {
      for (const item of cfg.target.slice(0, MAX_DIAL_COUNT)) {
        if (typeof item === "number" && Number.isFinite(item)) {
          const v = ((Math.floor(item) % positions) + positions) % positions;
          target.push(v);
        } else if (typeof item === "string" && /^\d+$/.test(item.trim())) {
          const n = parseInt(item.trim(), 10);
          target.push(((n % positions) + positions) % positions);
        }
      }
    }
    if (target.length < MIN_DIAL_COUNT) {
      target = [3, 7, 1].map((v) => v % positions);
    }
    return {
      positions,
      target,
      winFlag: winFlagRaw || defaultFlag || "beatDialLock",
    };
  }

  if (minigameId === "wire-match") {
    const pairs: [string, string][] = [];
    const seenLeft = new Set<string>();
    const seenRight = new Set<string>();
    if (Array.isArray(cfg.pairs)) {
      for (const item of cfg.pairs.slice(0, MAX_WIRE_PAIRS)) {
        let left = "";
        let right = "";
        if (Array.isArray(item) && item.length >= 2) {
          left = sanitizeKey(
            typeof item[0] === "string" ? item[0] : undefined,
            32
          );
          right = sanitizeKey(
            typeof item[1] === "string" ? item[1] : undefined,
            32
          );
        } else if (item && typeof item === "object" && !Array.isArray(item)) {
          const o = item as Record<string, unknown>;
          left = sanitizeKey(
            typeof o.left === "string" ? o.left : undefined,
            32
          );
          right = sanitizeKey(
            typeof o.right === "string" ? o.right : undefined,
            32
          );
        }
        if (!left || !right) continue;
        if (seenLeft.has(left) || seenRight.has(right)) continue;
        seenLeft.add(left);
        seenRight.add(right);
        pairs.push([left, right]);
      }
    }
    if (pairs.length < MIN_WIRE_PAIRS) {
      pairs.length = 0;
      pairs.push(["a", "1"], ["b", "2"], ["c", "3"]);
    }
    return {
      pairs,
      winFlag: winFlagRaw || defaultFlag || "beatWireMatch",
    };
  }

  // pixel-invaders / hacking ignore config
  return undefined;
}

/** Resolve win flag from modality config or convention defaults. */
export function resolveMinigameWinFlag(
  minigameId: string,
  config?: Record<string, unknown> | null
): string | undefined {
  const fromConfig =
    config && typeof config.winFlag === "string"
      ? sanitizeKey(config.winFlag)
      : "";
  if (fromConfig) return fromConfig;
  return DEFAULT_MINIGAME_WIN_FLAGS[minigameId];
}

/** Drop unsafe / unknown special fields. Returns null when unusable. */
export function sanitizeJsonPackSpecial(
  raw: JsonPackSpecial | undefined,
  packComicIds?: Set<string>
): JsonPackSpecial | null {
  if (!raw || typeof raw !== "object") return null;
  if (!SPECIAL_KINDS.has(raw.kind)) return null;

  if (raw.kind === "minigame") {
    const minigameId = sanitizeId(raw.minigameId);
    if (
      !(ALLOWED_MINIGAME_IDS as readonly string[]).includes(minigameId)
    ) {
      return null;
    }
    const config = sanitizeMinigameConfig(minigameId, raw.config);
    if (config === null) return null;
    return {
      kind: "minigame",
      minigameId,
      interceptVerbs: sanitizeVerbs(raw.interceptVerbs) ?? ["look", "use"],
      message: sanitizeId(raw.message, 240) || undefined,
      ...(config ? { config } : {}),
    };
  }

  if (raw.kind === "comic") {
    const comicId = sanitizeId(raw.comicId);
    if (!comicId || !/^[a-z][a-z0-9_-]{0,63}$/i.test(comicId)) return null;
    // Comics ship with the pack (pack.comics). Hotspot compile may omit the
    // set — compilePackSpecials still gates defs.
    if (packComicIds && !packComicIds.has(comicId)) return null;
    if (!packComicIds && comicId.length < 2) return null;
    return {
      kind: "comic",
      comicId,
      interceptVerbs: sanitizeVerbs(raw.interceptVerbs) ?? ["look", "use"],
      message: sanitizeId(raw.message, 240) || undefined,
    };
  }

  // trade
  const requireItemId = sanitizeKey(raw.requireItemId);
  if (!requireItemId) return null;
  return {
    kind: "trade",
    requireItemId,
    giveItemId: sanitizeKey(raw.giveItemId) || undefined,
    setFlag: sanitizeKey(raw.setFlag) || undefined,
    clearFlag: sanitizeKey(raw.clearFlag) || undefined,
    alreadyFlag: sanitizeKey(raw.alreadyFlag) || undefined,
    message: sanitizeId(raw.message, 240) || undefined,
    interceptVerbs: sanitizeVerbs(raw.interceptVerbs),
  };
}

/** Build SpecialActionDef from an already-sanitized special. */
function compileOneSpecial(
  safe: JsonPackSpecial,
  items?: Record<string, JsonPackItem>
): SpecialActionDef | null {
  if (safe.kind === "minigame" && safe.minigameId) {
    const minigameId = safe.minigameId;
    const config = safe.config;
    return {
      interceptVerbs: safe.interceptVerbs ?? ["look", "use"],
      run: () => ({
        modality: {
          type: "minigame",
          minigameId,
          ...(config ? { config } : {}),
        },
        ...(safe.message ? { message: safe.message } : {}),
      }),
    };
  }

  if (safe.kind === "comic" && safe.comicId) {
    const comicId = safe.comicId;
    return {
      interceptVerbs: safe.interceptVerbs ?? ["look", "use"],
      run: () => ({
        modality: { type: "comic", comicId },
        ...(safe.message ? { message: safe.message } : {}),
      }),
    };
  }

  if (safe.kind === "trade" && safe.requireItemId) {
    const requireItemId = safe.requireItemId;
    const giveItemId = safe.giveItemId;
    const setFlag = safe.setFlag;
    const clearFlag = safe.clearFlag;
    const alreadyFlag = safe.alreadyFlag;
    const message = safe.message;
    const catalog = giveItemId ? items?.[giveItemId] : undefined;
    return {
      interceptVerbs: safe.interceptVerbs,
      run: ({ state }) => {
        if (alreadyFlag && state.flags[alreadyFlag]) return null;
        if (!state.inventory.some((i) => i.id === requireItemId)) return null;
        let inventory = state.inventory.filter((i) => i.id !== requireItemId);
        if (giveItemId && !inventory.some((i) => i.id === giveItemId)) {
          const item: GameItem = {
            id: giveItemId,
            name: catalog?.name || giveItemId,
            description: catalog?.description || catalog?.name || giveItemId,
            ...(catalog?.icon && isSafePlayMediaUrl(catalog.icon)
              ? { icon: catalog.icon }
              : {}),
          };
          inventory = [...inventory, item];
        }
        const flags = { ...state.flags };
        if (setFlag) flags[setFlag] = true;
        if (clearFlag) flags[clearFlag] = false;
        if (alreadyFlag) flags[alreadyFlag] = true;
        return {
          patch: { inventory, flags },
          message: message || "Deal.",
        };
      },
    };
  }

  return null;
}

/** Compile pack.comics → ComicDef (safe media only). */
export function compilePackComics(
  comics: Record<string, JsonPackComic> | undefined
): Record<string, ComicDef> {
  if (!comics || typeof comics !== "object") return {};
  const out: Record<string, ComicDef> = {};
  for (const [key, raw] of Object.entries(comics)) {
    const id = sanitizeKey(raw?.id || key);
    if (!id || !raw || typeof raw !== "object") continue;
    const pages = (raw.pages ?? [])
      .filter(
        (p) =>
          p &&
          typeof p === "object" &&
          typeof p.title === "string" &&
          typeof p.image === "string" &&
          isSafeMediaUrl(p.image)
      )
      .map((p) => ({
        title: String(p.title).slice(0, 120),
        subtitle:
          typeof p.subtitle === "string"
            ? p.subtitle.slice(0, 160)
            : undefined,
        content: typeof p.content === "string" ? p.content.slice(0, 2000) : "",
        panel: typeof p.panel === "string" ? p.panel.slice(0, 80) : "",
        image: p.image,
      }));
    if (!pages.length) continue;
    out[id] = {
      id,
      title: sanitizeId(raw.title, 120) || id,
      pages,
    };
  }
  return out;
}

export interface CompiledPackSpecials {
  specials: Record<string, SpecialActionDef>;
  comics: Record<string, ComicDef>;
}

/**
 * Walk all room hotspots with `special`, compile allowlisted SpecialActionDef
 * keyed by hotspot id (Hotspot.special defaults to id at resolve time).
 */
export function compilePackSpecials(
  pack: JsonPackDocument
): CompiledPackSpecials {
  const comics = compilePackComics(pack.comics);
  const packComicIds = new Set(Object.keys(comics));
  const specials: Record<string, SpecialActionDef> = {};

  for (const room of Object.values(pack.rooms ?? {})) {
    for (const h of room.hotspots ?? []) {
      if (!h.special) continue;
      const sanitized = sanitizeJsonPackSpecial(h.special, packComicIds);
      if (!sanitized) continue;
      // Re-check comic against pack comics
      if (sanitized.kind === "comic" && !packComicIds.has(sanitized.comicId!)) {
        continue;
      }
      const def = compileOneSpecial(sanitized, pack.items);
      if (!def) continue;
      const key = sanitizeKey(h.id) || sanitizeKey(h.special.minigameId);
      if (!key) continue;
      specials[key] = def;
    }
  }

  return { specials, comics };
}
