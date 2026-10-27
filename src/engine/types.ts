/**
 * Portable adventure-engine types.
 *
 * Conceptual map to SCUMM:
 *  Room        → Room (Location)
 *  Object      → Hotspot
 *  Actor       → Actor
 *  Verb        → VerbId
 *  Script      → ScriptHook / onInteract / onEnter
 *  Variable    → flags + vars
 *  Inventory   → inventory
 *  Cutscene    → CutsceneId (content-defined)
 */

import type { HapticStyle } from "./haptics";
import type { JuiceCue, JuicePresetId } from "./juice";

/** Classic SCUMM-style verb set. Extend per-game via VerbDef if needed. */
export type VerbId =
  | "look"
  | "talk"
  | "use"
  | "pickup"
  | "open"
  | "push"
  | "pull"
  | "give";

export interface GameItem {
  id: string;
  name: string;
  description: string;
  /** Optional UI icon key / emoji / asset path */
  icon?: string;
  combineHint?: string;
}

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  icon?: string;
  /** When this flag becomes true, auto-unlock (JSON packs / Studio). */
  unlockFlag?: string;
}

export interface Achievement extends AchievementDef {
  unlocked: boolean;
  timestamp?: number;
}

export interface QuestDef {
  id: string;
  title: string;
  description: string;
  objectives: string[];
  /**
   * Parallel to `objectives` — when `flags[objectiveFlags[i]]` is true,
   * mark objective `i` complete (drives the always-on objective bar).
   */
  objectiveFlags?: string[];
  /** When this flag becomes true, mark the quest completed. */
  completeFlag?: string;
}

export interface Quest extends QuestDef {
  completed: boolean;
  completedObjectives: number[];
}

export interface JournalEntry {
  id: string;
  title: string;
  content: string;
  timestamp: number;
  location: string;
}

export type ActorFacing = "left" | "right" | "up" | "down";

/** Facing aliases for directional costume sheets (cardinal + compass). */
export type ActorFacingDir = ActorFacing | "n" | "s" | "e" | "w";

/**
 * Costume / animation art: a single URL/class, or a per-facing sheet.
 * Missing facings fall back to scaleX flip when only left/right (or one sheet) exists.
 */
export type ActorAnimSheet =
  | string
  | Partial<Record<ActorFacingDir, string>>;

/** Costume playback state (idle / walk / talk cycles). */
export type ActorAnimState = "idle" | "walk" | "talk";

/** Runtime placement of an actor in the world (SCUMM putActor). */
export interface ActorInstance {
  id: string;
  /** null = not in any room */
  roomId: string | null;
  /** Position in room % (0–100 of room space) */
  x: number;
  y: number;
  facing: ActorFacing;
  costume?: string;
  visible?: boolean;
  /** Current animation cycle */
  animState?: ActorAnimState;
}

export interface CameraState {
  /** Focus point in room % */
  x: number;
  y: number;
  /** Actor to follow, or null for scripted pans */
  followActorId: string | null;
  /** Viewport zoom (1 = default). Scripted via cameraZoom. */
  zoom?: number;
  /**
   * Optional ease toward a focus/zoom (host advances via stepCameraEase).
   * Cleared when the ease completes.
   */
  ease?: CameraEase;
}

/** In-flight camera pan/zoom interpolation. */
export interface CameraEase {
  fromX: number;
  fromY: number;
  fromZoom: number;
  toX: number;
  toY: number;
  toZoom: number;
  /** Total duration */
  durationMs: number;
  /** Elapsed so far */
  elapsedMs: number;
}

export interface Point2D {
  x: number;
  y: number;
}

/** Axis-aligned walkbox (SCUMM BOXD simplified). Coords in room %. */
export interface Walkbox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Optional depth scale for actor drawing */
  scale?: number;
  /**
   * Optional polygon in room % (length ≥ 3). When set, containment uses
   * point-in-polygon; x/y/width/height remain the AABB for adjacency / clamp.
   */
  points?: Point2D[];
  /**
   * Floor layer (0–8, default 0). Pathfinding only uses boxes on the
   * current walk floor (`state.vars.walkFloor` or `Room.activeFloor`).
   */
  floor?: number;
  /**
   * Explicit neighbor walkbox ids for BFS. When present, preferred over
   * AABB adjacency for this box (sanitized identifiers).
   */
  links?: string[];
  /**
   * When ego arrives at this box (waypoint / center), set `vars.walkFloor`
   * to `toFloor` so subsequent pathfinding uses that layer.
   */
  floorTransition?: { toFloor: number };
}

/**
 * Timed room trigger — fires after ego has dwelled `afterMs` in the room.
 * `once` (default true) persists via flag `timerSeen_<roomId>_<id>`.
 */
export interface RoomTimer {
  id: string;
  afterMs: number;
  /** Default true — fire at most once per save (via timerSeen_ flag) */
  once?: boolean;
  actions?: import("./packActions").PackAction[];
  setFlag?: string;
  message?: string;
}

/** AGS/Escoria-style trigger region (room % AABB), separate from walkboxes. */
export interface RoomRegion {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Fire once when ego enters (unless everyEnter) — sets this flag */
  onEnterFlag?: string;
  /** Set this flag when ego leaves the region */
  onExitFlag?: string;
  /** Set this flag when entered */
  setFlag?: string;
  /** Optional message */
  message?: string;
  /** If true, fire every entry not just once */
  everyEnter?: boolean;
  /** Optional juice cue/preset when ego enters (host plays via playJuice) */
  juice?: import("./juice").JuiceCue | import("./juice").JuicePresetId;
  /** Declarative ActionList on enter (same once/everyEnter gate as flags) */
  onEnterActions?: import("./packActions").PackAction[];
  /** Declarative ActionList on exit (fires every leave) */
  onExitActions?: import("./packActions").PackAction[];
}

/** Room size relative to the viewport (100 = fits exactly). */
export interface RoomSize {
  width: number;
  height: number;
}

export type ScriptCommand =
  | { op: "delay"; ms: number }
  | { op: "breakHere" }
  | { op: "patch"; patch: StatePatch | ((state: GameState) => StatePatch) }
  | {
      op: "putActor";
      actorId: string;
      roomId: string | null;
      x: number;
      y: number;
      facing?: ActorFacing;
    }
  | {
      op: "walkActor";
      actorId: string;
      x: number;
      y: number;
      /** % of room per second (default 35) */
      speed?: number;
    }
  | {
      op: "sayLine";
      actorId?: string;
      text: string;
      durationMs?: number;
      /** Optional portrait asset key/URL shown in speech UI */
      portrait?: string;
      /** Optional voice clip key for host SFX/voice layer */
      voiceKey?: string;
      /** Allow click/Space to skip (default true) */
      skippable?: boolean;
      /** Optional Rhubarb-style mouth cue timeline (stored for future lip-sync). */
      mouthCues?: { t: number; shape: string }[];
      /** Optional key into an external lip-sync asset map (pass-through). */
      lipSyncKey?: string;
    }
  | { op: "startScript"; scriptId: string }
  | { op: "stopScript"; scriptId: string }
  | { op: "freeze"; value: boolean }
  /** Play a one-shot / keyed SFX (SCUMM sound opcode) */
  | { op: "sound"; key: string; channel?: string }
  /** Stop a keyed sound or all on a channel */
  | { op: "stopSound"; key?: string; channel?: string }
  /** Change ambient / room music key */
  | { op: "music"; key: string }
  /** Switch controllable ego (New Kid) */
  | { op: "setEgo"; actorId: string }
  /** Pan camera to room % (clears follow unless follow kept via cameraFollow) */
  | { op: "cameraPan"; x: number; y: number; durationMs?: number }
  /** Zoom camera (1 = default fit) */
  | { op: "cameraZoom"; scale: number; durationMs?: number }
  /** Resume or clear actor follow */
  | { op: "cameraFollow"; actorId: string | null };

export interface ScriptDef {
  id: string;
  commands: ScriptCommand[] | ((state: GameState) => ScriptCommand[]);
  loop?: boolean;
}

export interface ScriptInstance {
  id: string;
  index: number;
  status: "running" | "waiting" | "walking" | "done";
  waitUntil?: number;
  walk?: {
    actorId: string;
    path: Point2D[];
    pathIndex: number;
    speed: number;
  };
  loop: boolean;
  frozen: boolean;
}

export interface GameState {
  currentLocation: string;
  inventory: GameItem[];
  /** Boolean story/puzzle flags (SCUMM bit variables) */
  flags: Record<string, boolean>;
  /** Optional numeric/string vars for richer scripting */
  vars?: Record<string, number | string>;
  /**
   * Per-object visual/puzzle states (SCUMM setState08 / getState08).
   * Keyed by hotspot id. 0 = default; 1+ = open/toggled/etc.
   */
  objectStates: Record<string, number>;
  dialogueState: Record<string, number>;
  gameComplete: boolean;
  journalEntries: JournalEntry[];
  achievements: Achievement[];
  quests: Quest[];
  visitedLocations: string[];
  /** Controllable actor id (SCUMM VAR_EGO) */
  egoId: string | null;
  /** Runtime actor placements */
  actors: Record<string, ActorInstance>;
  /** Camera focus / follow */
  camera: CameraState;
  /** Concurrent named scripts currently running */
  activeScripts: ScriptInstance[];
  /** Per-ego inventories (active ego uses `inventory`) */
  actorInventories: Record<string, GameItem[]>;
  /** Progressive hint reveal counts keyed by hint id */
  hintProgress: Record<string, number>;
}

export type StatePatch = Partial<GameState>;
export type StateFn<T> = T | ((state: GameState) => T);

/**
 * Localizable string for responses / copy:
 * plain text, state function, or message-catalog key.
 * A state function may return a catalog key so state-gated copy stays translatable.
 */
export type LocString =
  | string
  | ((state: GameState) => string | { key: string; fallback?: string })
  | { key: string; fallback?: string };

export type DialogueOptionMode = "normal" | "once" | "onceGame" | "offForever";

export interface DialogueChoice {
  text: string;
  nextNode: string;
  condition?: (state: GameState) => boolean;
  action?: (state: GameState) => StatePatch;
  /** Stable id for once / forever tracking */
  choiceId?: string;
  /** AGS-style option lifecycle */
  optionMode?: DialogueOptionMode;
  /** Alias for optionMode: "offForever" */
  offForever?: boolean;
}

export interface DialogueNode {
  id: string;
  text: StateFn<string>;
  speaker?: string;
  choices?: DialogueChoice[];
  onView?: (state: GameState) => StatePatch;
  /** Stable catalog key for localization (`dlg.room.hotspot.line`) */
  lineKey?: string;
  /** Voice-over clip key in PackAudio.voice */
  voiceKey?: string;
  /** Optional Rhubarb-style mouth cue timeline (stored for future lip-sync). */
  mouthCues?: { t: number; shape: string }[];
  /** Optional key into an external lip-sync asset map (pass-through). */
  lipSyncKey?: string;
}

export interface DialogueTree {
  startNode: string;
  nodes: Record<string, DialogueNode>;
}

export interface Hotspot {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  verbs: VerbId[];
  responses: Partial<Record<VerbId, LocString>>;
  onInteract?: (verb: VerbId, state: GameState) => StatePatch;
  /**
   * Use inventory item with this hotspot (SCUMM Use X with Y).
   * Prefer this over itemRequired for new content.
   */
  onUseWith?: (itemId: string, state: GameState) => StatePatch;
  /** Messages keyed by item id, or "*" as fallback */
  useWithResponses?: Record<string, LocString>;
  itemRequired?: string;
  visible?: (state: GameState) => boolean;
  dialogue?: DialogueTree;
  /** Optional actor/NPC marker for animation hooks */
  isActor?: boolean;
  /** Link to Actor registry (portrait / talk color / sprite) */
  actorId?: string;
  /**
   * Pack special action key (minigame / comic / trade).
   * Defaults to hotspot.id when looking up `GameDefinition.specials`.
   */
  special?: string;
  /** Walk-to approach point in room % (defaults to hotspot bottom-center) */
  approach?: Point2D;
  /** Skip walk-to-before-interact for this hotspot */
  skipWalkTo?: boolean;
  /** Initial object state when missing from gameState.objectStates */
  initialState?: number;
  /**
   * SFX key on successful verb interact (built-in or `PackAudio.sfx`).
   * Prefer omitting on pickups — host already plays `pickup` when inventory grows.
   */
  interactSound?: string;
  /** SFX key when Use-with succeeds (built-in or `PackAudio.sfx`) */
  useWithSound?: string;
  /**
   * Haptic style on successful verb interact (native Capacitor / web vibrate).
   * When omitted, host may derive from `interactSound` via `hapticForSoundKey`.
   */
  interactHaptic?: HapticStyle;
  /** Haptic when Use-with succeeds */
  useWithHaptic?: HapticStyle;
  /** Extra haptics from pack action chains (`{ op: "haptic" }`) */
  actionHaptics?: HapticStyle[];
  /**
   * Visual juice preset on successful verb interact (shake / flash / burst).
   * When omitted, host may derive from `interactSound` via `juiceForSoundKey`.
   */
  interactJuice?: JuicePresetId;
  /** Juice when Use-with succeeds */
  useWithJuice?: JuicePresetId;
  /** Extra juice cues from pack action chains (`{ op: "juice" }`) */
  actionJuices?: JuiceCue[];
  /**
   * Inventory item ids this hotspot's use-with (or takeItem actions) will remove.
   * Shell may confirm before irreversible consumes.
   */
  consumesItems?: string[];
  /**
   * Per-state overlay art (room %). Keyed by objectStates[hotspot.id].
   * 0 = default / closed, 1 = open, etc.
   */
  stateOverlays?: Record<number, string>;
  /**
   * Optional looping overlay frames (independent of objectStates).
   * Good for lanterns, flags, water glints — tiny pixel loops.
   */
  frames?: string[];
  /** Frame rate for hotspot `frames` (default 4) */
  fps?: number;
  /** Built-in CSS motion on the hotspot overlay */
  animClass?: SceneAnimClass | string;
  journalEntry?: {
    id: string;
    title: string;
  };
  item?: GameItem;
}

export interface RoomExit {
  direction: string;
  to: string;
  label: string;
  blocked?: (state: GameState) => boolean;
  blockedMessage?: string;
  /**
   * When blocked, still list this exit (doorway / tunnel the player can see).
   * Default true. Set false to hide until the gate opens.
   */
  showWhenBlocked?: boolean;
  /** Label while blocked (e.g. "Sealed tunnel") — falls back to `label` */
  lockedLabel?: string;
}

/** Room change presentation (fade / slide). */
export type RoomTransitionKind =
  | "none"
  | "fade"
  | "slide-left"
  | "slide-right"
  | "slide-up"
  | "slide-down";

export interface RoomTransition {
  kind: RoomTransitionKind;
  /** Duration for one phase (out or in); default 350 */
  durationMs?: number;
}

/** SCUMM "Room" */
export interface Room {
  id: string;
  name: string;
  description: string;
  image: string;
  hotspots: Hotspot[];
  exits: RoomExit[];
  /** ENCD — run when entering this room */
  onEnter?: (state: GameState) => StatePatch;
  /** EXCD — run when leaving this room (before destination onEnter) */
  onExit?: (state: GameState) => StatePatch;
  /** Ambient music key for this room */
  music?: string;
  /** Visual theme key consumed by presentation layer */
  theme?: string;
  /** Walkable regions (room %). Empty/absent = free click (no walk-to). */
  walkboxes?: Walkbox[];
  /**
   * Default floor layer when `state.vars.walkFloor` is unset (0–8).
   * Ego pathfinds only on walkboxes whose `floor` matches the current walk floor.
   */
  activeFloor?: number;
  /** Enter-trigger regions (AGS/Escoria-style); separate from walkboxes. */
  regions?: RoomRegion[];
  /**
   * Timed triggers while ego dwells in this room.
   * Host accumulates dwell ms (pauses during cutscenes); once timers
   * persist via `timerSeen_<roomId>_<id>` flags.
   */
  timers?: RoomTimer[];
  /**
   * Room extents vs viewport (100 = exact fit).
   * Wider/taller rooms enable camera scroll.
   */
  roomSize?: RoomSize;
  /** Where ego appears when entering (room %) */
  entryPoint?: Point2D;
  /** Named scripts to auto-start on enter */
  autoScripts?: string[];
  /**
   * Local room scripts (SCUMM LSCR) — resolved by id while in this room.
   * Also eligible for autoScripts / startScript lookups.
   */
  localScripts?: Record<string, ScriptDef>;
  /** Transition when entering this room (overrides pack default) */
  transitionIn?: RoomTransition;
  /** Transition when leaving this room */
  transitionOut?: RoomTransition;
  /**
   * Atmospheric layers drawn over/under the room image.
   * `depth` < 0 = behind hotspots/actors (parallax BG), > 0 = foreground.
   */
  layers?: RoomLayer[];
  /**
   * Lightweight particle bed:
   * rain | dust | sparks | fog | stars | sparkle | fireflies | none
   */
  particles?: RoomParticles;
}

/** Pack / room particle atmosphere keys */
export type RoomParticles =
  | "none"
  | "rain"
  | "dust"
  | "sparks"
  | "fog"
  | "stars"
  | "sparkle"
  | "fireflies";

/** Built-in CSS loop classes for layers / hotspots */
export type SceneAnimClass =
  | "twinkle"
  | "bob"
  | "sway"
  | "flicker"
  | "pulse";

/** Parallax / overlay layer for a room */
export interface RoomLayer {
  id: string;
  image: string;
  /** Parallax factor vs camera (0 = locked to room, 1 = full camera) */
  parallax?: number;
  /** CSS opacity 0–1 */
  opacity?: number;
  /** Negative = behind actors; positive = in front */
  depth?: number;
  /**
   * Optional looping sprite frames (data URLs / asset URLs).
   * When set, cycles instead of showing static `image` alone.
   */
  frames?: string[];
  /** Frame rate for `frames` (default 4) */
  fps?: number;
  /** Built-in CSS motion: twinkle | bob | sway | flicker | pulse */
  animClass?: SceneAnimClass | string;
}

/** Legacy alias for Room */
export type Location = Room;

/** SCUMM "Actor" — presentation + dialogue identity */
export interface Actor {
  id: string;
  name: string;
  /** CSS class or image URL for the sprite */
  sprite?: string;
  portrait?: string;
  /** Dialogue nameplate / speech color */
  talkColor?: string;
  /** True if this actor can be the player ego */
  isEgo?: boolean;
  /** Eligible for New Kid / character switch */
  canControl?: boolean;
  defaultCostume?: string;
  /** costume id → sprite class/URL or per-facing sheet */
  costumes?: Record<string, ActorAnimSheet>;
  /** Optional per-anim-state CSS class / URL / per-facing sheet */
  animations?: Partial<Record<ActorAnimState, ActorAnimSheet>>;
  dialogue?: DialogueTree;
}

export interface ItemCombination {
  items: [string, string];
  result: GameItem;
  /** Optional gate before combining */
  condition?: (state: GameState) => boolean;
  failMessage?: string;
  successMessage?: string;
}

export interface VerbDef {
  id: VerbId;
  label: string;
  shortLabel: string;
  /** Optional keyboard shortcut (desktop) */
  shortcut?: string;
}

export type ScriptEvent =
  | { type: "roomEnter"; roomId: string }
  | { type: "roomExit"; from: string; to: string }
  | { type: "interact"; hotspotId: string; verb: VerbId }
  | {
      type: "useWith";
      hotspotId: string;
      itemId: string;
    }
  | { type: "itemPickup"; itemId: string }
  | { type: "itemCombine"; item1: string; item2: string; resultId: string }
  | { type: "flagSet"; flag: string; value: boolean }
  | { type: "objectState"; objectId: string; value: number }
  | { type: "questComplete"; questId: string }
  | { type: "achievementUnlock"; achievementId: string }
  | { type: "cutsceneStart"; cutsceneId: string }
  | { type: "cutsceneEnd"; cutsceneId: string }
  | { type: "scriptStart"; scriptId: string }
  | { type: "scriptEnd"; scriptId: string }
  | { type: "actorWalkEnd"; actorId: string }
  | { type: "soundPlay"; key: string; channel?: string }
  | { type: "soundStop"; key?: string; channel?: string }
  | { type: "musicChange"; key: string }
  | { type: "egoSwitch"; actorId: string; fromId?: string | null }
  | { type: "gameComplete" };

export type ScriptHook = (
  event: ScriptEvent,
  state: GameState
) => StatePatch | void;

export interface InteractResult {
  message?: string;
  patch?: StatePatch;
  openDialogue?: DialogueTree;
  journalAdded?: boolean;
  blocked?: boolean;
}
