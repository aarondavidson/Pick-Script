/**
 * Empty pack factory + parse / sanitize shared by createGameFromJson.
 */

import { safeJsonParse } from "./security";
import { sanitizeCredits } from "./credits";
import { sanitizeWinFlag } from "./winFlag";
import type { RoomTransition, RoomTransitionKind } from "./types";
import {
  JSON_PACK_MIN_SCHEMA_VERSION,
  JSON_PACK_SCHEMA_VERSION,
  type JsonPackAchievement,
  type JsonPackDocument,
  type JsonPackQuest,
} from "./jsonPackTypes";

export { compileJsonDialogue } from "./jsonPackDialogue";
export { compilePackCutscenes, compilePackHints } from "./jsonPackCutscenes";
export { compileHotspot } from "./jsonPackHotspot";

/** 1×1 dark PNG — base64 data URL (safe for CSS url() + <img>). */
const PLACEHOLDER_PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

export const JSON_PACK_PLACEHOLDER_IMAGE = PLACEHOLDER_PIXEL;

export function createEmptyJsonPack(
  partial?: Partial<JsonPackDocument>
): JsonPackDocument {
  const id = partial?.id?.trim() || "untitled-pack";
  const startRoom = partial?.startRoom || "start";
  return {
    schemaVersion: JSON_PACK_SCHEMA_VERSION,
    id,
    title: partial?.title || "Untitled Pack",
    subtitle: partial?.subtitle,
    version: partial?.version || "0.1.0",
    startRoom,
    verbMode: partial?.verbMode || "simple",
    audio: partial?.audio ?? {
      defaultMusic: "home",
      music: { home: "calm" },
      ambient: {},
    },
    rooms: partial?.rooms ?? {
      [startRoom]: {
        id: startRoom,
        name: "Starting Room",
        description: "Your first room — upload art and draw hotspots.",
        // Empty until author uploads — compile fills a safe placeholder pixel
        image: "",
        music: "home",
        hotspots: [],
      },
    },
    links: partial?.links ?? [],
    combinations: partial?.combinations ?? {},
    items: partial?.items ?? {},
    actors: partial?.actors,
    initialFlags: partial?.initialFlags ?? {},
    mapGroups: partial?.mapGroups,
    mapFastTravel: partial?.mapFastTravel ?? {
      enabled: true,
      requireVisited: true,
    },
    mapFog: partial?.mapFog,
    hints: partial?.hints ?? [],
    cutscenes: partial?.cutscenes ?? {},
    achievements: partial?.achievements ?? [],
    quests: partial?.quests ?? [],
    flagCutscenes: partial?.flagCutscenes,
    defaultTransition: partial?.defaultTransition,
  };
}

/**
 * Schema upgrades, keyed by the schemaVersion they upgrade FROM.
 * `JSON_PACK_MIGRATIONS[1]` turns a v1 document into v2, and so on.
 *
 * Rule for engine maintainers: when `JSON_PACK_SCHEMA_VERSION` is bumped, add
 * the migration here in the same change so every older `.pack.json` in the
 * wild keeps loading. Only raise `JSON_PACK_MIN_SCHEMA_VERSION` in a major
 * engine release. See docs/RELEASING.md.
 */
export const JSON_PACK_MIGRATIONS: Record<
  number,
  (doc: Record<string, unknown>) => Record<string, unknown>
> = {};

/**
 * Upgrade a raw pack document to the current schemaVersion.
 * Throws a readable error for packs that are too new, too old, or unversioned.
 */
export function migrateJsonPackDocument(
  doc: Record<string, unknown>
): Record<string, unknown> {
  const found = doc.schemaVersion;
  if (typeof found !== "number" || !Number.isInteger(found)) {
    throw new Error(
      `Unsupported schemaVersion ${String(found)} (expected ${JSON_PACK_SCHEMA_VERSION})`
    );
  }
  if (found > JSON_PACK_SCHEMA_VERSION) {
    throw new Error(
      `Unsupported schemaVersion ${found} — this pack was made with a newer engine (this engine reads up to ${JSON_PACK_SCHEMA_VERSION}). Update the engine to open it.`
    );
  }
  if (found < JSON_PACK_MIN_SCHEMA_VERSION) {
    throw new Error(
      `Unsupported schemaVersion ${found} — too old for this engine (oldest supported is ${JSON_PACK_MIN_SCHEMA_VERSION}). Open and re-save it with an older engine release first.`
    );
  }
  let current = doc;
  for (let v = found; v < JSON_PACK_SCHEMA_VERSION; v++) {
    const step = JSON_PACK_MIGRATIONS[v];
    if (!step) {
      throw new Error(
        `Unsupported schemaVersion ${found} (no upgrade path from ${v} to ${v + 1})`
      );
    }
    current = { ...step(current), schemaVersion: v + 1 };
  }
  return current;
}

export function parseJsonPack(raw: unknown): JsonPackDocument {
  // Re-parse through reviver to strip __proto__ / constructor keys
  let cleaned: unknown = raw;
  try {
    cleaned = safeJsonParse(JSON.stringify(raw));
  } catch {
    cleaned = raw;
  }
  if (!cleaned || typeof cleaned !== "object") {
    throw new Error("Pack must be a JSON object");
  }
  const doc = migrateJsonPackDocument(
    cleaned as Record<string, unknown>
  ) as Partial<JsonPackDocument>;
  if (!doc.id?.trim()) throw new Error("Pack missing id");
  if (!doc.title?.trim()) throw new Error("Pack missing title");
  if (!doc.version?.trim()) throw new Error("Pack missing version");
  if (!doc.startRoom?.trim()) throw new Error("Pack missing startRoom");
  if (!doc.rooms || typeof doc.rooms !== "object") {
    throw new Error("Pack missing rooms");
  }
  return {
    schemaVersion: JSON_PACK_SCHEMA_VERSION,
    id: doc.id.trim(),
    title: doc.title.trim(),
    subtitle: doc.subtitle,
    credits: sanitizeCredits(doc.credits),
    winFlag: sanitizeWinFlag(doc.winFlag),
    version: doc.version.trim(),
    ...(typeof doc.minEngineVersion === "string" && doc.minEngineVersion.trim()
      ? { minEngineVersion: doc.minEngineVersion.trim().slice(0, 32) }
      : {}),
    startRoom: doc.startRoom.trim(),
    verbMode:
      doc.verbMode === "classic"
        ? "classic"
        : doc.verbMode === "coin"
          ? "coin"
          : "simple",
    audio: doc.audio,
    rooms: doc.rooms,
    links: Array.isArray(doc.links) ? doc.links : [],
    combinations: doc.combinations ?? {},
    items: doc.items ?? {},
    actors:
      doc.actors && typeof doc.actors === "object" ? doc.actors : undefined,
    initialFlags: doc.initialFlags ?? {},
    mapGroups: doc.mapGroups,
    mapFastTravel: doc.mapFastTravel,
    mapFog:
      doc.mapFog && typeof doc.mapFog === "object" ? doc.mapFog : undefined,
    hints: Array.isArray(doc.hints) ? doc.hints : [],
    stuckAssist: doc.stuckAssist,
    i18n:
      doc.i18n && typeof doc.i18n === "object" ? doc.i18n : undefined,
    cutscenes:
      doc.cutscenes && typeof doc.cutscenes === "object" ? doc.cutscenes : {},
    achievements: Array.isArray(doc.achievements)
      ? doc.achievements.filter(
          (a): a is JsonPackAchievement =>
            !!a && typeof a === "object" && !!a.id?.trim() && !!a.title?.trim()
        )
      : [],
    quests: Array.isArray(doc.quests)
      ? doc.quests.filter(
          (q): q is JsonPackQuest =>
            !!q &&
            typeof q === "object" &&
            !!q.id?.trim() &&
            !!q.title?.trim() &&
            Array.isArray(q.objectives)
        )
      : [],
    flagCutscenes: sanitizeFlagCutscenes(doc.flagCutscenes),
    defaultTransition: sanitizeTransition(doc.defaultTransition),
    comics:
      doc.comics && typeof doc.comics === "object" ? doc.comics : undefined,
  };
}

const TRANSITION_KINDS = new Set<RoomTransitionKind>([
  "none",
  "fade",
  "slide-left",
  "slide-right",
  "slide-up",
  "slide-down",
]);

export function sanitizeTransition(
  raw: RoomTransition | undefined
): RoomTransition | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  if (!TRANSITION_KINDS.has(raw.kind)) return undefined;
  const durationMs =
    typeof raw.durationMs === "number" && Number.isFinite(raw.durationMs)
      ? Math.max(0, Math.min(5000, Math.floor(raw.durationMs)))
      : undefined;
  return {
    kind: raw.kind,
    ...(durationMs != null ? { durationMs } : {}),
  };
}

export function sanitizeFlagCutscenes(
  raw: Record<string, string> | undefined
): Record<string, string> | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const out: Record<string, string> = {};
  for (const [flag, cutsceneId] of Object.entries(raw)) {
    const f = flag?.trim();
    const c = typeof cutsceneId === "string" ? cutsceneId.trim() : "";
    if (!f || !c || f.length > 64 || c.length > 64) continue;
    out[f] = c;
  }
  return Object.keys(out).length ? out : undefined;
}
