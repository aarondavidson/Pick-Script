/**
 * Design coach — non-blocking suggestions for pack / game authors.
 * Never fails validation; always ignorable via prefs in the studio UI.
 */

import type { GameDefinition } from "@/engine/definition";
import type { JsonPackDocument } from "@/engine/jsonPack";
import type { StudioTabId } from "@/engine/validationHelp";

export type DesignCoachPhase =
  | "start"
  | "build"
  | "puzzle"
  | "polish"
  | "ship";

export type DesignSuggestionSeverity = "tip" | "improve";

export interface DesignSuggestion {
  /** Stable id for dismiss persistence */
  id: string;
  phase: DesignCoachPhase;
  severity: DesignSuggestionSeverity;
  title: string;
  body: string;
  recipeId?: string;
  studioTab?: StudioTabId;
}

export interface DesignCoachResult {
  /** Inferred where the author is in the process */
  phase: DesignCoachPhase;
  suggestions: DesignSuggestion[];
}

function roomCount(doc: JsonPackDocument): number {
  return Object.keys(doc.rooms ?? {}).length;
}

function allHotspots(doc: JsonPackDocument) {
  return Object.values(doc.rooms ?? {}).flatMap((r) => r.hotspots ?? []);
}

function approxPackChars(doc: JsonPackDocument): number {
  try {
    return JSON.stringify(doc).length;
  } catch {
    return 0;
  }
}

function inferPackPhase(doc: JsonPackDocument): DesignCoachPhase {
  const rooms = roomCount(doc);
  const hs = allHotspots(doc);
  const hasPickup = hs.some((h) => h.kind === "pickup");
  const hasPuzzle =
    hs.some((h) => (h.useWith?.length ?? 0) > 0) ||
    Object.keys(doc.combinations ?? {}).length > 0 ||
    (doc.links ?? []).some((l) => l.requireFlag || l.requireItem);
  const hasPolish =
    Object.values(doc.items ?? {}).some((i) => i.icon) ||
    Object.keys(doc.audio?.music ?? {}).length > 1 ||
    hs.some((h) => h.dialogue?.lines?.length);
  const shipReady = hasPuzzle && (hasPolish || hs.length >= 2);

  if (rooms <= 1 && hs.length === 0) return "start";
  if (!hasPuzzle && (hasPickup || hs.length > 0)) return "build";
  if (hasPuzzle && !hasPolish) return "puzzle";
  if (shipReady) return "ship";
  if (hasPolish || hasPuzzle) return "polish";
  return "build";
}

/**
 * Analyze a JSON pack draft for design / feel improvements.
 * Safe to call on every keystroke — pure and cheap.
 */
export function analyzeJsonPack(doc: JsonPackDocument): DesignCoachResult {
  const suggestions: DesignSuggestion[] = [];
  const rooms = roomCount(doc);
  const hs = allHotspots(doc);
  const links = doc.links ?? [];
  const phase = inferPackPhase(doc);

  const hasRealImage = Object.values(doc.rooms).some((r) => {
    const img = r.image?.trim() ?? "";
    if (!img) return false;
    // Studio placeholder SVG (text may be URL-encoded in the data URL)
    if (img.startsWith("data:image/svg")) return false;
    if (/No([+\s%20]*)room([+\s%20]*)image/i.test(img)) return false;
    return true;
  });
  if (!hasRealImage) {
    suggestions.push({
      id: "pack-upload-room-art",
      phase: "start",
      severity: "improve",
      title: "Upload room art",
      body: "A background image makes hotspots and preview feel real. Aim for 1920×1080.",
      studioTab: "pixels",
    });
  }

  if (rooms === 1 && links.length === 0) {
    suggestions.push({
      id: "pack-second-room",
      phase: "build",
      severity: "tip",
      title: "Add a second room",
      body: "Even one door to another room teaches travel + map. Link them on the Pack graph.",
      studioTab: "pack",
      recipeId: "locked-exit",
    });
  }

  if (hs.length === 0) {
    suggestions.push({
      id: "pack-draw-hotspot",
      phase: "start",
      severity: "improve",
      title: "Draw your first hotspot",
      body: "Pickup or interact boxes turn the picture into a game. Drag on the room image.",
      studioTab: "pack",
      recipeId: "get-item",
    });
  }

  const pickups = hs.filter((h) => h.kind === "pickup");
  if (hs.length > 0 && pickups.length === 0) {
    suggestions.push({
      id: "pack-add-pickup",
      phase: "build",
      severity: "tip",
      title: "Add a pickup",
      body: "Inventory items unlock use-with puzzles and gated doors — start with one key or note.",
      studioTab: "pack",
      recipeId: "get-item",
    });
  }

  const useWithCount = hs.reduce((n, h) => n + (h.useWith?.length ?? 0), 0);
  const comboCount = Object.keys(doc.combinations ?? {}).length;
  if (pickups.length > 0 && useWithCount === 0 && comboCount === 0) {
    suggestions.push({
      id: "pack-first-puzzle",
      phase: "puzzle",
      severity: "improve",
      title: "Wire a first puzzle",
      body: "Use an item on a hotspot, or combine two inventory items. One closed loop beats many props.",
      studioTab: "pack",
      recipeId: "use-with",
    });
  }

  if (
    links.length > 0 &&
    !links.some((l) => l.requireFlag || l.requireItem) &&
    rooms > 1
  ) {
    suggestions.push({
      id: "pack-gated-exit",
      phase: "puzzle",
      severity: "tip",
      title: "Gate one exit",
      body: "A locked door (require flag or item) gives the player a reason to explore and puzzle.",
      studioTab: "pack",
      recipeId: "locked-exit",
    });
  }

  const characters = hs.filter((h) => h.kind === "character");
  if (characters.some((h) => !h.dialogue?.lines?.length)) {
    suggestions.push({
      id: "pack-character-dialogue",
      phase: "build",
      severity: "tip",
      title: "Give a character something to say",
      body: "Lite dialogue (2–3 choices) makes Talk feel purposeful — even one goodbye line helps.",
      studioTab: "pack",
    });
  }

  const itemsWithoutIcon = Object.values(doc.items ?? {}).filter((i) => !i.icon);
  if (pickups.length > 0 && itemsWithoutIcon.length > 0) {
    suggestions.push({
      id: "pack-item-icons",
      phase: "polish",
      severity: "tip",
      title: "Add inventory icons",
      body: `${itemsWithoutIcon.length} catalog item(s) lack icons. Small art sells the pickup fantasy.`,
      studioTab: "pack",
      recipeId: "get-item",
    });
  }

  const roomsWithoutMusic = Object.values(doc.rooms).filter((r) => !r.music);
  if (rooms > 0 && roomsWithoutMusic.length === rooms) {
    suggestions.push({
      id: "pack-room-music",
      phase: "polish",
      severity: "tip",
      title: "Assign a music cue",
      body: "Even one music cue per room (calm, upbeat, noir, …) makes travel feel like a place — match the pack’s tone, not every game is dark.",
      studioTab: "audio",
    });
  }

  if (rooms >= 3) {
    const ft = doc.mapFastTravel;
    const enabled =
      ft !== false && (ft === true || ft == null || ft.enabled !== false);
    if (!enabled) {
      suggestions.push({
        id: "pack-enable-map",
        phase: "polish",
        severity: "tip",
        title: "Consider enabling the Map",
        body: "With several rooms, fast-travel (visited-only) reduces backtracking frustration.",
        studioTab: "pack",
        recipeId: "map-travel",
      });
    }
    if (!doc.mapGroups || !Object.keys(doc.mapGroups).length) {
      suggestions.push({
        id: "pack-map-groups",
        phase: "polish",
        severity: "tip",
        title: "Name map groups",
        body: "Groups like Home / Town help players scan the world map.",
        studioTab: "pack",
        recipeId: "map-travel",
      });
    }
  }

  const tiny = hs.filter((h) => h.width < 4 || h.height < 4);
  if (tiny.length) {
    suggestions.push({
      id: "pack-tiny-hotspots",
      phase: "polish",
      severity: "improve",
      title: "Enlarge tiny hotspots",
      body: `${tiny.length} hotspot(s) are under 4% size — hard to tap on phones.`,
      studioTab: "hotspots",
    });
  }

  const noLook = hs.filter((h) => !h.lookText?.trim());
  if (noLook.length >= 2) {
    suggestions.push({
      id: "pack-look-text",
      phase: "polish",
      severity: "tip",
      title: "Write Look text",
      body: "Flavor on Look is cheap immersion. Two good lines beat ten silent props.",
      studioTab: "pack",
    });
  }

  if (doc.verbMode === "classic" && hs.length > 0 && hs.length < 4) {
    suggestions.push({
      id: "pack-classic-verbs-early",
      phase: "start",
      severity: "tip",
      title: "Prefer coin verbs on touch",
      body: "7-verb bars need Talk/Open coverage. Coin (radial) is the Guided default — one finger, fewer fail states.",
      studioTab: "pack",
    });
  }

  if (doc.verbMode === "classic" && hs.length >= 4) {
    suggestions.push({
      id: "pack-touch-verb-default",
      phase: "polish",
      severity: "tip",
      title: "Offer coin mode for phones",
      body: "Players on phones forget right-click Examine. Coin keeps Look/Talk/Use on a radial tap.",
      studioTab: "pack",
    });
  }

  if (!(doc.hints?.length) && hs.length >= 2) {
    suggestions.push({
      id: "pack-progressive-hints",
      phase: "polish",
      severity: "improve",
      title: "Add progressive hints",
      body: "In-game Hints (H) rescue stuck players. Author 3 tiers: vague → clearer → spoilery.",
      studioTab: "pack",
      recipeId: "hints",
    });
  }

  if (!(doc.quests?.length) && hs.length >= 2 && phase !== "ship") {
    suggestions.push({
      id: "pack-current-objective",
      phase: "puzzle",
      severity: "tip",
      title: "Add a quest for the objective bar",
      body: "The play HUD shows the next incomplete objective. Seed a quest with 1–2 steps + completeFlag.",
      studioTab: "pack",
    });
  }

  if (!doc.subtitle?.trim() && doc.title && doc.title !== "Untitled Pack") {
    suggestions.push({
      id: "pack-subtitle",
      phase: "polish",
      severity: "tip",
      title: "Add a subtitle",
      body: "A short tagline on the launcher helps players know the tone (sunny comedy, cozy mystery, slapstick, noir…).",
      studioTab: "pack",
    });
  }

  // --- Ship phase ---
  const packChars = approxPackChars(doc);
  const softLimit = 8_000_000; // warn before maxInstalledPackChars (12MB)
  if (packChars > softLimit) {
    suggestions.push({
      id: "pack-size-limit",
      phase: "ship",
      severity: "improve",
      title: "Pack is getting large",
      body: `Draft is ~${Math.round(packChars / 1_000_000)}MB JSON. Shrink room art (uploads auto-compress) or Publish may fail near the 12MB install cap.`,
      studioTab: "pixels",
    });
  }

  if (phase === "ship" || phase === "polish") {
    suggestions.push({
      id: "pack-publish-local",
      phase: "ship",
      severity: "tip",
      title: "Publish to this browser",
      body: "Pack → Publish to launcher installs locally only. Use the post-publish Play link to smoke-test from the home screen.",
      studioTab: "pack",
    });
    suggestions.push({
      id: "pack-share-import",
      phase: "ship",
      severity: "tip",
      title: "Share via Import",
      body: "Download .pack.json, then anyone can Import on the launcher home page (no Studio). Or host the file and open /play?packUrl=…",
      studioTab: "pack",
    });
    if (!(doc.achievements?.length || doc.quests?.length) && hs.length >= 2) {
      suggestions.push({
        id: "pack-quests-achievements",
        phase: "ship",
        severity: "tip",
        title: "Add a quest or achievement",
        body: "Journal goals tied to unlockFlag / completeFlag make the win feel intentional.",
        studioTab: "pack",
      });
    }
  }

  return { phase, suggestions };
}

/**
 * Lighter coach for live TypeScript packs (Author mode).
 */
export function analyzeGameDefinition(def: GameDefinition): DesignCoachResult {
  const suggestions: DesignSuggestion[] = [];
  const rooms = Object.values(def.rooms ?? {});
  const hotspots = rooms.flatMap((r) => r.hotspots ?? []);
  const phase: DesignCoachPhase =
    rooms.length <= 1 ? "build" : hotspots.length < 5 ? "build" : "polish";

  if (rooms.length >= 2 && def.mapFastTravel === false) {
    suggestions.push({
      id: "game-map-fast-travel",
      phase: "polish",
      severity: "tip",
      title: "Map / fast-travel is off",
      body: "Multi-room titles usually benefit from visited-only fast-travel.",
      recipeId: "map-travel",
    });
  }

  const noMusic = rooms.filter((r) => !r.music);
  if (noMusic.length && noMusic.length === rooms.length) {
    suggestions.push({
      id: "game-room-music",
      phase: "polish",
      severity: "tip",
      title: "No room music cues",
      body: "Set Room.music keys and map them in pack audio for place-specific beds.",
      studioTab: "audio",
    });
  }

  const silent = hotspots.filter(
    (h) => h.responses?.look == null && !h.isActor
  );
  if (silent.length >= 3) {
    suggestions.push({
      id: "game-look-responses",
      phase: "polish",
      severity: "tip",
      title: "Several hotspots lack Look text",
      body: "Players mash Look first — empty responses feel unfinished.",
    });
  }

  if (
    Object.keys(def.combinations ?? {}).length === 0 &&
    hotspots.every((h) => !h.onUseWith)
  ) {
    suggestions.push({
      id: "game-puzzle-loop",
      phase: "puzzle",
      severity: "tip",
      title: "No use-with / combine loop detected",
      body: "A single item→hotspot or A+B recipe gives the pack a clear win beat.",
      recipeId: "use-with",
    });
  }

  if (!def.hints?.length) {
    suggestions.push({
      id: "game-hints",
      phase: "polish",
      severity: "tip",
      title: "No progressive hints",
      body: "Three-rung hints per goal rescue stuck players without spoiling early.",
      recipeId: "hints",
    });
  }

  return { phase, suggestions };
}

/** Filter out dismissed ids; optionally focus on current phase + earlier. */
export function filterSuggestions(
  result: DesignCoachResult,
  opts?: { dismissed?: Iterable<string>; phaseFocus?: boolean }
): DesignSuggestion[] {
  const dismissed = new Set(opts?.dismissed ?? []);
  const order: DesignCoachPhase[] = [
    "start",
    "build",
    "puzzle",
    "polish",
    "ship",
  ];
  const phaseIdx = order.indexOf(result.phase);
  return result.suggestions.filter((s) => {
    if (dismissed.has(s.id)) return false;
    if (!opts?.phaseFocus) return true;
    return order.indexOf(s.phase) <= phaseIdx;
  });
}
