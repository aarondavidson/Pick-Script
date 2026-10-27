import type {
  AchievementDef,
  Actor,
  ActorInstance,
  GameState,
  ItemCombination,
  QuestDef,
  Room,
  RoomTransition,
  ScriptDef,
  ScriptHook,
  VerbDef,
} from "./types";
import type { DefaultVerbResponses } from "./defaultResponses";
import type { CutsceneDef } from "./cutscene";
import type { HintDef } from "./hints";
import type { VerbMode } from "./verbs";
import type { CreditEntry } from "./credits";
import type {
  ComicDef,
  ModalityWinResult,
  SpecialActionDef,
} from "./specials";
import type { PackAudio } from "./audio";
import type { I18nConfig } from "./i18n";
import type { MigrateSaveFn } from "./save";
import type { MapFogConfig } from "./mapFog";
import type { ComponentType } from "react";

/**
 * Lazy loader for pack-owned shell UI (intro / canvas FX / completion screen).
 * Packs return a dynamic `import()` so the UI ships only with that pack.
 */
export type ShellUiLoader<P = object> = () => Promise<{
  default: ComponentType<P>;
}>;

/** Props passed to a pack completion screen (`shell.complete`). */
export interface ShellCompleteProps {
  gameState: GameState;
  onRestart: () => void;
}

/**
 * A portable game pack.
 *
 * Engine code never imports game content directly —
 * it receives a GameDefinition at boot time.
 */
export interface GameDefinition {
  /** Unique id used for save keys, analytics, etc. */
  id: string;
  /** Display title */
  title: string;
  /** Short tagline for UI chrome */
  subtitle?: string;
  /** Asset credits (art / music / sound) — shown in Settings and on the default win screen */
  credits?: CreditEntry[];
  /** The game ends (win screen) when this flag turns on */
  winFlag?: string;
  /** Semver for content (independent of engine) */
  version: string;
  /** Starting room id */
  startRoom: string;
  /** Controllable actor id (SCUMM VAR_EGO). Omit to disable walker/ego. */
  egoId?: string;
  /** Actors eligible for character switch (defaults to canControl/isEgo) */
  playableActors?: string[];
  /** Verb bar configuration (defaults to classic 7-verb SCUMM set) */
  verbs?: VerbDef[];
  /** classic = 7 verbs; simple = Look/Use only (modern 2-click) */
  verbMode?: VerbMode;
  /** Progressive hint threads */
  hints?: HintDef[];
  /**
   * Idle / failed-interact assist that offers the next progressive hint.
   * Defaults on when the pack has hints. `false` disables.
   */
  stuckAssist?:
    | boolean
    | {
        enabled?: boolean;
        idleMs?: number;
        failedInteracts?: number;
        dismissCooldownMs?: number;
      };
  /**
   * Autosave after room changes / interactions.
   * `true` uses defaults; or `{ debounceMs, enabled }`.
   */
  autosave?: boolean | { enabled?: boolean; debounceMs?: number };
  /**
   * World map groupings: group label → room ids.
   * When omitted, the map lists all rooms under one group.
   */
  mapGroups?: Record<string, string[]>;
  /**
   * Fast-travel map UI.
   * - `false` / `{ enabled: false }` — hide Map button (e.g. one-room packs)
   * - `true` / omitted — show map; only **visited** rooms are travel targets
   * - `{ requireVisited: false }` — allow travel to any listed room (debug / open world)
   */
  mapFastTravel?: boolean | { enabled?: boolean; requireVisited?: boolean };
  /**
   * Optional map fog — shroud unrevealed rooms until visit and/or story flags.
   * Omit or `{ enabled: false }` for classic visit-only maps.
   * See `mapFog.ts`.
   */
  mapFog?: MapFogConfig;
  /**
   * When a flag becomes true, auto-start the named cutscene and clear the flag.
   * Example: `{ pendingWarehouseCutscene: "warehouse_arrival" }`
   */
  flagCutscenes?: Record<string, string>;
  /**
   * Pack specials keyed by `Hotspot.special` or hotspot id
   * (minigames, comics, trades — kept out of generic UI).
   */
  specials?: Record<string, SpecialActionDef>;
  /** Comic payloads for `{ type: "comic" }` modalities */
  comics?: Record<string, ComicDef>;
  /** Rewards when a modality (minigame id / comic id) completes */
  onModalityWin?: (
    modalityKey: string,
    state: GameState
  ) => ModalityWinResult | null;
  /**
   * Pack audio map — `Room.music` / music opcodes resolve through this.
   * Prefer named cues over room-id substring heuristics.
   */
  audio?: PackAudio;
  /**
   * Localization catalogs. Use `{ key, fallback }` LocStrings in content
   * or `t(key)` from AdventureProvider.
   */
  i18n?: I18nConfig;
  /**
   * Migrate a save from an older content version.
   * Return null to reject the load (shown as incompatible).
   */
  migrateSave?: MigrateSaveFn;
  /** Rooms / locations registry */
  rooms: Record<string, Room>;
  /** Actor registry (portraits, talk colors, costumes) */
  actors?: Record<string, Actor>;
  /** Initial actor placements (putActor at boot) */
  initialActors?: Record<string, ActorInstance>;
  /** Named concurrent scripts (startScript / stopScript) */
  namedScripts?: Record<string, ScriptDef>;
  /** Item combination recipes keyed as "a+b" (order-independent lookup handled by engine) */
  combinations: Record<string, ItemCombination>;
  /**
   * Optional inventory icon URLs by item id (Vite-imported).
   * Host resolves `item.icon` first, then this map — packs own their art.
   */
  itemIcons?: Record<string, string>;
  /** Initial achievements (unlocked: false implied if omitted) */
  achievements: AchievementDef[];
  /** Initial quests */
  quests: QuestDef[];
  /** Seed flags on new game */
  initialFlags?: Record<string, boolean>;
  /** Seed object states on new game */
  initialObjectStates?: Record<string, number>;
  /** Fallback lines when a verb isn't valid (Maniac Script 2 style) */
  defaultVerbResponses?: DefaultVerbResponses;
  /** Named cutscenes the pack can start by id */
  cutscenes?: Record<string, CutsceneDef>;
  /** Optional global script hooks (room enter, combine, etc.) */
  scripts?: ScriptHook[];
  /** Number of save slots (default 3) */
  saveSlots?: number;
  /** Message display duration in ms (default 15000) */
  messageDurationMs?: number;
  /** Walk arrival threshold in room % (default 3) */
  walkArriveThreshold?: number;
  /** Ego walk speed in room % per second (default 40) */
  egoWalkSpeed?: number;
  /** Default room transition when rooms omit transitionIn/Out */
  defaultTransition?: RoomTransition;
  /** Default sayLine duration when omitted (ms) */
  defaultSpeechDurationMs?: number;
  /**
   * Optional gate before a specific combination succeeds.
   * Prefer putting condition on ItemCombination when possible.
   */
  canCombine?: (
    item1Id: string,
    item2Id: string,
    state: GameState
  ) => { ok: true } | { ok: false; message: string };
  /**
   * S.C.R.I.P.T. presentation — pixel scaler / framebuffer hints for the host shell.
   */
  presentation?: {
    /** Nearest-neighbor scaling for room backgrounds (pixel art packs) */
    crispPixels?: boolean;
    /** Logical framebuffer size for integer scale math (default 640×360) */
    nativeSize?: { width: number; height: number };
  };
  /**
   * When true (JSON packs), strict play drops inventory ids not declared on the pack.
   * TypeScript packs leave this unset so closure-created items still load from saves.
   */
  strictInventory?: boolean;
  /**
   * Pack-owned play shell knobs — avoid game-id checks in shared UI.
   * Omit for generic shell (engine demos, JSON packs).
   */
  shell?: {
    /** Pack intro overlay shown until `flags.introSeen` is set */
    intro?: ShellUiLoader | false;
    /** Extra canvas FX layer rendered over play */
    canvasFx?: ShellUiLoader | false;
    /** Completion screen; omit or "generic" for the built-in restart screen */
    complete?: "generic" | ShellUiLoader<ShellCompleteProps>;
    /**
     * Hide play-header extras (desktop toolbar + mobile Menu sheet).
     * Map is also hidden when `mapFastTravel: false`.
     */
    chrome?: {
      hideHome?: boolean;
      hideJournal?: boolean;
      hideQuests?: boolean;
      hideMap?: boolean;
      hideAchievements?: boolean;
      hideHints?: boolean;
    };
  };
  /**
   * Opt-in one-time migration of old save keys `${prefix}${slot}` into this
   * pack's slots (e.g. a renamed title's `oldname_save_`).
   */
  legacySaveKeyPrefix?: string;
}

export const DEFAULT_VERBS: VerbDef[] = [
  { id: "look", label: "Look at", shortLabel: "Look", shortcut: "1" },
  { id: "talk", label: "Talk to", shortLabel: "Talk", shortcut: "2" },
  { id: "use", label: "Use", shortLabel: "Use", shortcut: "3" },
  { id: "pickup", label: "Pick up", shortLabel: "Pick", shortcut: "4" },
  { id: "open", label: "Open", shortLabel: "Open", shortcut: "5" },
  { id: "push", label: "Push", shortLabel: "Push", shortcut: "6" },
  { id: "pull", label: "Pull", shortLabel: "Pull", shortcut: "7" },
  { id: "give", label: "Give", shortLabel: "Give", shortcut: "8" },
];
