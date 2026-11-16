/**
 * Pack assets outside the JSON.
 *
 * A Studio draft keeps every image inline as a `data:` URL, which is handy
 * while authoring but makes large games impossible to ship (one multi-megabyte
 * JSON, no caching, a hard size cap). For hosting, a pack is split into:
 *
 *   my-game/pack.json          ← small; media fields hold "assets/…"
 *   my-game/assets/*.png|mp3…  ← ordinary files the browser caches
 *
 * - `externalizePackAssets(doc)` produces that layout from an inline pack
 * - `resolvePackAssetUrls(doc, baseUrl)` turns "assets/…" back into loadable
 *   URLs relative to where pack.json was fetched from
 * - `fetchJsonPack(url)` fetches + resolves + parses in one call
 *
 * And for smooth play: `collectRoomMediaUrls` / `neighbourRoomIds` tell a host
 * what to preload.
 */

import type { GameDefinition } from "./definition";
import type { JsonPackDocument } from "./jsonPackTypes";
import { parseJsonPack } from "./jsonPackCompile";
import { isDangerousKey, safeJsonParse } from "./security";

/** Relative asset reference allowed in a hosted pack.json */
const RELATIVE_ASSET =
  /^(?:\.\/)?assets\/[A-Za-z0-9][A-Za-z0-9._/-]*\.(png|jpe?g|gif|webp|avif|svg|mp3|ogg|oga|wav|m4a|aac|webm)$/i;

const DATA_URL = /^data:((?:image|audio)\/[a-z0-9.+-]+);base64,/i;

const EXT_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/svg+xml": "svg",
  "image/bmp": "bmp",
  "image/x-icon": "ico",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/mp4": "m4a",
  "audio/aac": "aac",
  "audio/webm": "webm",
};

/** Hard cap on how deep / wide the walk goes (untrusted JSON) */
const MAX_DEPTH = 24;
const MAX_NODES = 200_000;

export function isRelativePackAsset(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length < 300 &&
    !value.includes("..") &&
    RELATIVE_ASSET.test(value)
  );
}

/** Deep-copy `value`, replacing strings via `map` (path = keys joined by "/"). */
function mapStrings<T>(
  value: T,
  map: (text: string, path: string) => string
): T {
  let nodes = 0;
  const walk = (v: unknown, path: string, depth: number): unknown => {
    if (++nodes > MAX_NODES || depth > MAX_DEPTH) return v;
    if (typeof v === "string") return map(v, path);
    if (Array.isArray(v)) {
      return v.map((item, i) => walk(item, `${path}/${i}`, depth + 1));
    }
    if (v && typeof v === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, child] of Object.entries(v as Record<string, unknown>)) {
        if (isDangerousKey(k)) continue;
        out[k] = walk(child, path ? `${path}/${k}` : k, depth + 1);
      }
      return out;
    }
    return v;
  };
  return walk(value, "", 0) as T;
}

function decodeBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function slug(path: string): string {
  return (
    path
      .replace(/[^A-Za-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase()
      .slice(0, 60) || "asset"
  );
}

export interface ExternalizedPack {
  /** The pack with inline media replaced by "assets/…" paths */
  doc: JsonPackDocument;
  /** File path (relative to pack.json) → bytes */
  files: Record<string, Uint8Array>;
  /** Total bytes moved out of the JSON */
  bytes: number;
}

/**
 * Move every inline `data:image/…` / `data:audio/…` out of a pack.
 * Identical media is written once. Media that is already a URL is untouched.
 */
export function externalizePackAssets(doc: JsonPackDocument): ExternalizedPack {
  const files: Record<string, Uint8Array> = {};
  const byContent = new Map<string, string>();
  const used = new Set<string>();
  let bytes = 0;

  const next = mapStrings(doc, (text, path) => {
    const m = DATA_URL.exec(text);
    if (!m) return text;
    const ext = EXT_BY_MIME[m[1].toLowerCase()];
    if (!ext) return text;
    const known = byContent.get(text);
    if (known) return known;
    let data: Uint8Array;
    try {
      data = decodeBase64(text.slice(m[0].length));
    } catch {
      return text; // not valid base64 — leave it for validation to report
    }
    const base = slug(path);
    let name = `assets/${base}.${ext}`;
    for (let n = 2; used.has(name); n++) name = `assets/${base}-${n}.${ext}`;
    used.add(name);
    files[name] = data;
    bytes += data.length;
    byContent.set(text, name);
    return name;
  });

  return { doc: next, files, bytes };
}

/**
 * Turn "assets/…" references into URLs relative to where the pack was loaded
 * from. `baseUrl` is the pack.json URL — absolute (`https://…/pack.json`) or a
 * site path (`/games/x/pack.json`).
 */
export function resolvePackAssetUrls<T>(doc: T, baseUrl: string): T {
  const sitePath = baseUrl.startsWith("/") && !baseUrl.startsWith("//");
  const dir = baseUrl.replace(/[?#].*$/, "").replace(/[^/]*$/, "");
  return mapStrings(doc, (text) => {
    if (!isRelativePackAsset(text)) return text;
    const rel = text.replace(/^\.\//, "");
    if (sitePath) return `${dir}${rel}`;
    try {
      return new URL(rel, dir).href;
    } catch {
      return text;
    }
  });
}

/** Paths of relative assets a hosted pack expects next to its pack.json. */
export function listRelativePackAssets(doc: unknown): string[] {
  const found = new Set<string>();
  mapStrings(doc, (text) => {
    if (isRelativePackAsset(text)) found.add(text.replace(/^\.\//, ""));
    return text;
  });
  return [...found].sort();
}

/**
 * Fetch a hosted pack.json, resolve its relative assets and parse it.
 * The caller decides which URLs are acceptable (see `assertSafePackUrl`).
 */
export async function fetchJsonPack(
  url: string,
  options?: { fetch?: typeof fetch; maxChars?: number }
): Promise<JsonPackDocument> {
  const doFetch = options?.fetch ?? fetch;
  const res = await doFetch(url, { credentials: "omit" });
  if (!res.ok) throw new Error(`Could not fetch pack (${res.status})`);
  const text = await res.text();
  if (options?.maxChars && text.length > options.maxChars) {
    throw new Error(
      "Pack file too large — move its images into an assets folder (Studio: Download for web hosting)"
    );
  }
  return parseJsonPack(resolvePackAssetUrls(safeJsonParse(text), url));
}

const IMAGE_URL = /\.(png|jpe?g|gif|webp|avif|svg)(?:[?#].*)?$/i;

function looksLikeImageUrl(text: string): boolean {
  if (text.length > 4_000_000) return false;
  if (text.startsWith("data:image/")) return true;
  if (text.startsWith("data:") || /\s/.test(text)) return false;
  return (
    IMAGE_URL.test(text) &&
    (text.startsWith("/") ||
      text.startsWith("http://") ||
      text.startsWith("https://") ||
      text.startsWith("blob:"))
  );
}

/**
 * Every image a room needs to look right: background first, then layers,
 * hotspot overlays / frames and the sprites of actors placed in it.
 */
export function collectRoomMediaUrls(
  def: GameDefinition,
  roomId: string
): string[] {
  const room = def.rooms?.[roomId];
  if (!room) return [];
  const urls: string[] = [];
  const add = (text: unknown) => {
    if (typeof text === "string" && looksLikeImageUrl(text) && !urls.includes(text)) {
      urls.push(text);
    }
  };
  add(room.image);
  mapStrings(room as unknown, (text) => {
    add(text);
    return text;
  });
  for (const actor of Object.values(def.actors ?? {})) {
    mapStrings(
      { sprite: actor.sprite, costumes: actor.costumes, animations: actor.animations } as unknown,
      (text) => {
        add(text);
        return text;
      }
    );
  }
  return urls;
}

/** Rooms one exit away — worth preloading while the player looks around. */
export function neighbourRoomIds(def: GameDefinition, roomId: string): string[] {
  const room = def.rooms?.[roomId];
  const ids = new Set<string>();
  for (const exit of room?.exits ?? []) {
    if (exit.to && exit.to !== roomId && def.rooms[exit.to]) ids.add(exit.to);
  }
  return [...ids];
}
