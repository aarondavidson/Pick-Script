/**
 * Canonical product layer names.
 *
 * P.I.C.K.  — Point-and-Interactive Creation Kit (visual editor / IDE)
 * S.C.R.I.P.T. — Story Creation & Retro Interactive Puzzle Toolkit (runtime + DSL)
 *
 * The shippable umbrella remains “Portable Adventure Engine”.
 * Games built on the engine stay branded as themselves; credit SCRIPT.
 */

export const ENGINE_UMBRELLA = "Portable Adventure Engine";

export const PICK = {
  acronym: "P.I.C.K.",
  short: "PICK",
  expansion: "Point-and-Interactive Creation Kit",
  /** One-line role */
  role: "Visual editor & IDE — sprites, walkboxes, hotspots, puzzle wiring",
  /** Routes / surfaces that are PICK */
  surfaces: [
    "P.I.C.K. studio (/pick · /studio)",
    "P.I.C.K. Author mode (in play)",
    "Recipes (/pick/recipes · /recipes)",
  ] as const,
} as const;

export const SCRIPT = {
  acronym: "S.C.R.I.P.T.",
  short: "SCRIPT",
  expansion: "Story Creation & Retro Interactive Puzzle Toolkit",
  /** One-line role */
  role: "Runtime & scripting — pack state, verbs, rooms, save/load, scene render",
  /** Code home */
  module: "@/engine",
} as const;

/** Hero-level dual-layer lockup (engine product chrome). */
export const ENGINE_LAYER_LOCKUP = `${PICK.acronym} · ${SCRIPT.acronym}`;

/** Browser tab / PWA title for the engine product. */
export const ENGINE_DOCUMENT_TITLE = `${ENGINE_UMBRELLA} — ${PICK.acronym} + ${SCRIPT.acronym}`;

/** Compact expansions under the lockup. */
export const ENGINE_LAYER_BLURB = `${PICK.acronym} builds · ${SCRIPT.acronym} runs`;

/** Title-product footer credit. */
export const SCRIPT_POWERED_CREDIT = `Powered by ${SCRIPT.acronym} · ${ENGINE_UMBRELLA}`;

/** Launcher / docs blurb for the engine product. */
export const ENGINE_TAGLINE =
  `${PICK.acronym} to build · ${SCRIPT.acronym} to run — SCUMM-inspired packs for web and iOS.`;

export const ENGINE_DESCRIPTION =
  `${ENGINE_UMBRELLA}: ${PICK.expansion} (editor) + ${SCRIPT.expansion} (runtime). Play GPL packs or author your own.`;
/**
 * Feedback checklist vs what SCRIPT already ships.
 * Naming/branding only — no new framebuffer stack required.
 */
export const SCRIPT_CORE_FEATURE_STATUS = [
  {
    id: "framebuffer",
    name: "2D Framebuffer & Pixel Scaler",
    status: "covered" as const,
    note: "Room art renders via the host shell (CSS integer-friendly scaling). Classic 320×200 blit buffer is not required for pack play.",
  },
  {
    id: "walkmasks",
    name: "Pathfinding & Walkmasks",
    status: "covered" as const,
    note: "AABB walkboxes + walk pathing in src/engine/walkboxes.ts / walk.ts; Studio/Author can edit geometry.",
  },
  {
    id: "cursor",
    name: "Cursor State Machine",
    status: "covered" as const,
    note: "Verb bar + sentence line + inventory-item cursor (Walk/Look/Use/… modes).",
  },
  {
    id: "state",
    name: "State System",
    status: "covered" as const,
    note: "flags (boolean), vars (number|string), inventory, objectStates, dialogue/quest progress.",
  },
  {
    id: "saves",
    name: "Save System",
    status: "covered" as const,
    note: "Slotted JSON saves (IndexedDB + localStorage mirror), autosave, export/import backup.",
  },
] as const;
