/**
 * JSON pack document types (serializable Studio / .pack.json shape).
 */

import type { PackAudio } from "./audio";
import type {
  ActorAnimSheet,
  GameItem,
  Room,
  RoomLayer,
  RoomTransition,
  VerbId,
  DialogueOptionMode,
} from "./types";
import type { PackAction } from "./packActions";
import type { HapticStyle } from "./haptics";
import type { JuicePresetId } from "./juice";
import type { StuckAssistPackOpt } from "./stuckAssist";
import type { I18nConfig } from "./i18n";
import type { MapFogConfig } from "./mapFog";
import type { CreditEntry } from "./credits";

export const JSON_PACK_SCHEMA_VERSION = 1 as const;

export type JsonPackHotspotKind =
  | "interact"
  | "pickup"
  | "use-with-target"
  | "character";

/** Declarative Use-item-with-hotspot rule (compiled to onUseWith). */
export interface JsonPackUseWithRule {
  itemId: string;
  message?: string;
  /** Set when this rule already applied — show alreadyMessage / no-op patch */
  alreadyFlag?: string;
  alreadyMessage?: string;
  setFlag?: string;
  clearFlag?: string;
  /** Remove the used item from inventory */
  consumeItem?: boolean;
  /** Grant an item on success */
  giveItem?: GameItem;
}

export interface JsonPackHotspot {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  verbs?: VerbId[];
  kind?: JsonPackHotspotKind;
  lookText?: string;
  useText?: string;
  itemId?: string;
  itemName?: string;
  itemDescription?: string;
  itemIcon?: string;
  actorId?: string;
  /** Bitmap costume / CSS class for the walking actor (character hotspots) */
  sprite?: string;
  /** Speech-bar portrait URL */
  portrait?: string;
  /** Speech nameplate color */
  talkColor?: string;
  interactSound?: string;
  useWithSound?: string;
  /** Haptic on successful verb interact */
  interactHaptic?: HapticStyle;
  /** Haptic when Use-with succeeds */
  useWithHaptic?: HapticStyle;
  /** Juice preset on successful verb interact */
  interactJuice?: JuicePresetId;
  /** Juice when Use-with succeeds */
  useWithJuice?: JuicePresetId;
  /** Use-with rules (also used when kind is use-with-target) */
  useWith?: JsonPackUseWithRule[];
  fallbackUseWithMessage?: string;
  /** Lite dialogue for character hotspots (Talk) */
  dialogue?: JsonPackDialogue;
  /** Initial object state (0 = closed/default) */
  initialState?: number;
  /** Per-state overlay image URLs keyed by state number */
  stateOverlays?: Record<string, string>;
  /** Looping overlay frames (tiny pixel anim; independent of stateOverlays) */
  frames?: string[];
  /** Frame rate for `frames` (default 4) */
  fps?: number;
  /** Built-in CSS motion: twinkle | bob | sway | flicker | pulse */
  animClass?: string;
  /** Declarative action chain (Visionaire / ActionList-lite) */
  actions?: PackAction[];
  /** Verbs that run `actions` (default look + use) */
  actionVerbs?: VerbId[];
  /** Where the ego walks before interacting (room %). Default: under hotspot. */
  approach?: { x: number; y: number };
  /**
   * Allowlisted special / modality (minigame, comic, trade).
   * Compiles into `definition.specials[hotspot.id]` — no custom TS.
   */
  special?: JsonPackSpecial;
}

/** Allowlisted special kinds Studio can attach without TS. */
export type JsonPackSpecialKind = "minigame" | "comic" | "trade";

/**
 * Declarative hotspot special (compiled to SpecialActionDef).
 * Only allowlisted kinds/ids are accepted at compile time.
 */
export interface JsonPackSpecial {
  kind: JsonPackSpecialKind;
  /** Minigame modality id (must be in ALLOWED_MINIGAME_IDS) */
  minigameId?: string;
  /**
   * Declarative minigame config (sequence-lock / slider-puzzle).
   * Sanitized in jsonPackSpecials — max lengths, safe ids only.
   */
  config?: Record<string, unknown>;
  /** Comic id (must be defined in pack.comics) */
  comicId?: string;
  /** Trade: require this inventory item id */
  requireItemId?: string;
  /** Trade: grant this catalog / inline item id */
  giveItemId?: string;
  /** Trade: set this flag on success */
  setFlag?: string;
  /** Trade: clear this flag on success */
  clearFlag?: string;
  /** Trade: skip when this flag is already set */
  alreadyFlag?: string;
  /** Optional success message */
  message?: string;
  /** Verbs that intercept normal resolution (default look+use for modalities) */
  interceptVerbs?: VerbId[];
}

/** Serializable comic page for JSON packs. */
export interface JsonPackComicPage {
  title: string;
  subtitle?: string;
  content: string;
  panel: string;
  /** data: / http(s) image URL */
  image: string;
}

/** Comic payload keyed for `{ type: "comic" }` modalities. */
export interface JsonPackComic {
  id: string;
  title: string;
  pages: JsonPackComicPage[];
}

/** Catalog item (icon as data URL or http URL) */
export interface JsonPackItem {
  id: string;
  name: string;
  description?: string;
  icon?: string;
}

/**
 * Linear / lightly-branching talk tree.
 * Choices may jump to another line id or `"END"`.
 */
export interface JsonPackDialogueChoice {
  text: string;
  nextId?: string;
  choiceId?: string;
  optionMode?: DialogueOptionMode;
  offForever?: boolean;
  /** Choice only visible when this flag is truthy */
  requireFlag?: string;
  /** Set this flag when the choice is taken (talk-gate puzzles) */
  setFlag?: string;
  /** Clear this flag when the choice is taken */
  clearFlag?: string;
  /** Grant catalog / inline item id when the choice is taken */
  giveItemId?: string;
}

export interface JsonPackDialogue {
  speaker?: string;
  lines: Array<{
    id: string;
    text: string;
    /** Stable VO clip key (defaults to voice.<room>.<hotspot>.<lineId>) */
    voiceKey?: string;
    /** Optional Rhubarb-style mouth cue timeline (stored for future lip-sync). */
    mouthCues?: { t: number; shape: string }[];
    /** Optional key into an external lip-sync asset map (pass-through). */
    lipSyncKey?: string;
    choices?: JsonPackDialogueChoice[];
  }>;
}

/** Walkable floor region (room %). */
export interface JsonPackWalkbox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  scale?: number;
  /** Optional polygon vertices in room % (length ≥ 3 → point-in-polygon) */
  points?: { x: number; y: number }[];
  /** Floor layer 0–8 (default 0) for multi-floor rooms */
  floor?: number;
  /** Explicit neighbor walkbox ids (preferred over AABB adjacency) */
  links?: string[];
  /** On arrive at this box, set vars.walkFloor to toFloor */
  floorTransition?: { toFloor: number };
}

/** Timed trigger while ego dwells in a room. */
export interface JsonPackRoomTimer {
  id: string;
  afterMs: number;
  /** Default true — persist via timerSeen_<room>_<id> */
  once?: boolean;
  actions?: PackAction[];
  setFlag?: string;
  message?: string;
}

/** Enter-trigger region (AGS/Escoria-style AABB in room %). */
export interface JsonPackRegion {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Fire once when ego enters (unless everyEnter) — sets this flag */
  onEnterFlag?: string;
  /** Set this flag when ego leaves */
  onExitFlag?: string;
  /** Set this flag when entered */
  setFlag?: string;
  /** Optional message */
  message?: string;
  /** If true, fire every entry not just once */
  everyEnter?: boolean;
  /** Juice preset or cue on enter */
  juice?: JuicePresetId | { preset?: JuicePresetId; shake?: string; flash?: string; burst?: string; hitStopMs?: number };
  /** PackAction[] run on enter (same once/everyEnter gate) */
  onEnterActions?: PackAction[];
  /** PackAction[] run on exit (every leave) */
  onExitActions?: PackAction[];
}

export interface JsonPackRoom {
  id: string;
  name: string;
  description?: string;
  /** data: URL or http(s) URL — embedded so export needs no separate asset tree */
  image: string;
  music?: string;
  hotspots?: JsonPackHotspot[];
  /** Walkable areas; default floor used when omitted */
  walkboxes?: JsonPackWalkbox[];
  /** Default walk floor when vars.walkFloor unset (0–8) */
  activeFloor?: number;
  /** Enter-trigger regions (separate from walkboxes) */
  regions?: JsonPackRegion[];
  /** Timed dwell triggers (afterMs while in room) */
  timers?: JsonPackRoomTimer[];
  /** Ego spawn point (room %) */
  entryPoint?: { x: number; y: number };
  layers?: RoomLayer[];
  particles?: Room["particles"];
  /** Enter / leave presentation (fade, slide-*) */
  transitionIn?: RoomTransition;
  transitionOut?: RoomTransition;
}

/** Optional timeline sync / control fields shared by cutscene steps. */
export type JsonPackCutsceneStepSync = {
  label?: string;
  goto?: string;
  waitForSpeech?: boolean;
  waitForWalk?: boolean;
};

/** Declarative cutscene step (compiles to CutsceneLine / walk / SFX). */
export type JsonPackCutsceneStep =
  | ({
      op: "message";
      text: string;
      speaker?: string;
      durationMs?: number;
      juice?: JuicePresetId | { preset?: JuicePresetId };
    } & JsonPackCutsceneStepSync)
  | ({
      op: "wait";
      ms: number;
      juice?: JuicePresetId | { preset?: JuicePresetId };
    } & JsonPackCutsceneStepSync)
  | ({
      op: "juice";
      preset?: JuicePresetId;
      shake?: string;
      flash?: string;
      burst?: string;
      hitStopMs?: number;
      durationMs?: number;
    } & JsonPackCutsceneStepSync)
  | ({
      op: "walk";
      x: number;
      y: number;
      actorId?: string;
      /** Default true — wait for walk to finish before advancing */
      waitForWalk?: boolean;
    } & JsonPackCutsceneStepSync)
  | ({ op: "sound"; key: string } & JsonPackCutsceneStepSync)
  | ({
      op: "setFlag";
      flag: string;
      value?: boolean;
    } & JsonPackCutsceneStepSync)
  | ({ op: "music"; key: string } & JsonPackCutsceneStepSync)
  | ({
      op: "sayLine";
      text: string;
      actorId?: string;
      speaker?: string;
      durationMs?: number;
      voiceKey?: string;
      /** Optional Rhubarb-style mouth cue timeline (stored for future lip-sync). */
      mouthCues?: { t: number; shape: string }[];
      /** Optional key into an external lip-sync asset map (pass-through). */
      lipSyncKey?: string;
      juice?: JuicePresetId | { preset?: JuicePresetId };
      /** Default true — wait for speech to finish before advancing */
      waitForSpeech?: boolean;
    } & JsonPackCutsceneStepSync)
  | ({
      op: "camera";
      pan?: { x: number; y: number; durationMs?: number };
      zoom?: number;
      zoomDurationMs?: number;
      follow?: string | null;
    } & JsonPackCutsceneStepSync)
  | ({
      /** Start walk + say together, then wait for both */
      op: "parallel";
      walk?: { x: number; y: number; actorId?: string };
      sayLine?: {
        text: string;
        actorId?: string;
        speaker?: string;
        durationMs?: number;
        voiceKey?: string;
        mouthCues?: { t: number; shape: string }[];
        lipSyncKey?: string;
      };
      durationMs?: number;
    } & JsonPackCutsceneStepSync)
  | ({ op: "goto"; label: string } & JsonPackCutsceneStepSync)
  | ({ op: "label"; name: string } & JsonPackCutsceneStepSync);

export interface JsonPackCutscene {
  id: string;
  title?: string;
  skippable?: boolean;
  steps: JsonPackCutsceneStep[];
}

/** Progressive hint thread (compiles via untilFlag / requireFlag). */
export interface JsonPackHint {
  id: string;
  title: string;
  /** Vague → clearer → spoilery (1–3 typical) */
  tiers: string[];
  /** Hide once this flag is true (puzzle solved) */
  untilFlag?: string;
  /** Only available when this flag is true */
  requireFlag?: string;
  /** Optional hotspot id to pulse when stuck assist offers this hint */
  hotspotId?: string;
}

export interface JsonPackLink {
  from: string;
  to: string;
  direction?: string;
  fromLabel: string;
  toLabel: string;
  /** When set, forward exit is blocked until this flag is truthy */
  requireFlag?: string;
  /** When set, forward exit is blocked until this item is in inventory */
  requireItem?: string;
  blockedMessage?: string;
  /**
   * Show the exit (doorway / tunnel) while locked. Default true.
   * Set false to hide the exit until the gate opens.
   */
  showWhenBlocked?: boolean;
  /** Label while locked (e.g. "Sealed tunnel") */
  lockedLabel?: string;
}

export interface JsonPackCombination {
  items: [string, string];
  result: GameItem;
  successMessage?: string;
  failMessage?: string;
}

/** Achievement shown in journal; optional flag auto-unlock. */
export interface JsonPackAchievement {
  id: string;
  title: string;
  description: string;
  icon?: string;
  unlockFlag?: string;
}

/** Quest shown in journal; optional flag auto-complete. */
export interface JsonPackQuest {
  id: string;
  title: string;
  description: string;
  objectives: string[];
  /** Parallel to objectives — flag that completes that step */
  objectiveFlags?: string[];
  completeFlag?: string;
}

/** Actor costume entry for JSON packs (bitmap URL or CSS class). */
export interface JsonPackActor {
  id?: string;
  name?: string;
  isEgo?: boolean;
  canControl?: boolean;
  talkColor?: string;
  /** CSS class or media URL */
  sprite?: string;
  portrait?: string;
  defaultCostume?: string;
  costumes?: Record<string, ActorAnimSheet>;
  animations?: Partial<Record<"idle" | "walk" | "talk", ActorAnimSheet>>;
}

export interface JsonPackDocument {
  schemaVersion: typeof JSON_PACK_SCHEMA_VERSION;
  id: string;
  title: string;
  subtitle?: string;
  /** Asset credits (art / music / sound) — shown in Settings and on the default win screen */
  credits?: CreditEntry[];
  version: string;
  startRoom: string;
  verbMode?: "simple" | "classic" | "coin";
  audio?: PackAudio;
  rooms: Record<string, JsonPackRoom>;
  /** Bidirectional room links (compiled with linkRooms) */
  links?: JsonPackLink[];
  combinations?: Record<string, JsonPackCombination>;
  /** Shared item catalog (icons + defaults for pickups) */
  items?: Record<string, JsonPackItem>;
  /** Optional actor costumes (player + NPCs); character hotspots also seed actors */
  actors?: Record<string, JsonPackActor>;
  initialFlags?: Record<string, boolean>;
  mapGroups?: Record<string, string[]>;
  mapFastTravel?: boolean | { enabled?: boolean; requireVisited?: boolean };
  /** Optional map fog / progression reveal (see mapFog.ts) */
  mapFog?: MapFogConfig;
  /** Progressive hint threads */
  hints?: JsonPackHint[];
  /** Idle / failed-interact hint assist (default on when hints exist) */
  stuckAssist?: StuckAssistPackOpt;
  /** Locale catalogs (lineId → text); dialogue source text is the default locale */
  i18n?: I18nConfig;
  /** Named cutscenes (message / wait / walk / sound steps) */
  cutscenes?: Record<string, JsonPackCutscene>;
  achievements?: JsonPackAchievement[];
  quests?: JsonPackQuest[];
  /**
   * When a flag becomes true, auto-start the named cutscene (one-shot).
   * Runtime clears the flag after firing — use dedicated trigger flags
   * (e.g. `play_intro`), not puzzle state flags.
   */
  flagCutscenes?: Record<string, string>;
  /** Default room transition when rooms omit transitionIn/Out */
  defaultTransition?: RoomTransition;
  /**
   * Comic payloads for hotspot `{ kind: "comic" }` specials.
   * Comic ids referenced by hotspot specials must be defined here.
   */
  comics?: Record<string, JsonPackComic>;
}
