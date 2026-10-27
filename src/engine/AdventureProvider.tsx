import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { GameDefinition } from "./definition";
import { createGame, type AdventureRuntime } from "./createGame";
import type {
  GameItem,
  GameState,
  Hotspot,
  Point2D,
  Quest,
  RoomExit,
  StatePatch,
  VerbId,
} from "./types";
import { applyStatePatch, normalizeLoadedState } from "./state";
import { isStrictPlayEnabled } from "./deployLock";
import { sanitizePlayState } from "./stateIntegrity";
import { formatSentence, type Sentence } from "./sentence";
import type {
  CutsceneDef,
  CutsceneLine,
  CutsceneRuntime,
} from "./cutscene";
import type { WalkMotion } from "./walk";
import { autoStartRoomScripts } from "./scriptRunner";
import type { SpeechLine } from "./speech";
import type { TransitionRuntime } from "./transitions";
import type { HintStatus } from "./hints";
import { type HapticStyle } from "./haptics";
import {
  resolveJuiceCue,
  type JuiceCue,
  type JuicePresetId,
} from "./juice";
import {
  resolveStuckAssistConfig,
  resolveStuckAssistHotspotId,
  shouldOfferStuckAssist,
} from "./stuckAssist";
import {
  loadStoredVerbMode,
  resolveVerbs,
  storeVerbMode,
  type VerbMode,
} from "./verbs";
import type { VerbDef } from "./types";
import type { PackModality } from "./specials";
import type { PendingArrive } from "./adventure/pendingInteract";
import { useCutsceneHost } from "./adventure/useCutsceneHost";
import { useModalityHost } from "./adventure/useModalityHost";
import { useProgressionHost } from "./adventure/useProgressionHost";
import { useSentenceInteract } from "./adventure/useSentenceInteract";
import { useSpeechHost } from "./adventure/useSpeechHost";
import { useTravel } from "./adventure/useTravel";
import { useWalkTick } from "./adventure/useWalkTick";

/** @deprecated use SpeechLine */
export type SayLineBubble = SpeechLine;
export type { SpeechLine };

export interface AdventureContextValue {
  runtime: AdventureRuntime;
  definition: GameDefinition;
  gameState: GameState;
  updateGameState: (updates: StatePatch) => void;
  replaceGameState: (state: GameState) => void;
  selectedVerb: VerbId | null;
  setSelectedVerb: (verb: VerbId | null) => void;
  /** Effective verb bar (classic 7 or simple Look/Use) */
  verbs: VerbDef[];
  verbMode: VerbMode;
  setVerbMode: (mode: VerbMode) => void;
  /** Active locale for pack message catalogs */
  locale: string;
  setLocale: (locale: string) => void;
  /** Translate a message key from the pack catalog */
  t: (key: string, fallback?: string) => string;
  showMessage: (message: string) => void;
  currentMessage: string | null;
  combineItems: (item1: GameItem, item2: GameItem) => GameItem | null;
  selectedCombineItem: GameItem | null;
  setSelectedCombineItem: (item: GameItem | null) => void;
  /** Hover target name for sentence line preview */
  hoveredTargetName: string | null;
  setHoveredTargetName: (name: string | null) => void;
  /** Live SCUMM sentence string */
  sentenceLine: string;
  /**
   * Execute verb (+ optional inventory item) on a hotspot.
   * Walks ego to approach point first when the room has walkboxes.
   */
  executeSentence: (
    hotspot: Hotspot,
    options?: {
      onDialogueOpen?: () => void;
      onSpecial?: () => void;
    }
  ) => void;
  /** Click-to-walk ego to a room % point (clamped to walkboxes). */
  walkEgoTo: (x: number, y: number) => boolean;
  /** True while a cutscene owns input */
  inputLocked: boolean;
  /** True while ego is walking to a target */
  isWalking: boolean;
  /** Rolling log of recent sentences / travels (Author debugger) */
  actionLog: string[];
  cutscene: CutsceneRuntime | null;
  cutsceneLine: CutsceneLine | null;
  startNamedCutscene: (id: string) => boolean;
  startCutsceneDef: (def: CutsceneDef) => void;
  advanceCutsceneLine: () => void;
  skipActiveCutscene: () => void;
  startNamedScript: (id: string) => boolean;
  stopNamedScript: (id: string) => void;
  sayLines: SpeechLine[];
  /** Currently foreground speech line (for portrait bar / skip) */
  currentSpeech: SpeechLine | null;
  skipSpeech: () => void;
  /** Queue a speech bubble (cutscenes / author tools) */
  enqueueSpeech: (line: SpeechLine) => void;
  /** Play a pack voice clip by key (ducks music via host) */
  playVoice: (voiceKey: string) => void;
  /**
   * Travel via exit with room transition (fade/slide).
   * Prefer this over raw runtime.travel from UI.
   */
  travelThroughExit: (exit: RoomExit) => boolean;
  /** Fast-travel / map teleport with transition */
  travelToRoom: (roomId: string) => boolean;
  roomTransition: TransitionRuntime | null;
  /** Playable actor ids for New Kid / multi-ego UI */
  playableActors: string[];
  /** Switch controllable ego (stashes per-ego inventory) */
  switchToEgo: (actorId: string) => boolean;
  /** Progressive hints currently available */
  activeHints: HintStatus[];
  /** Reveal next tier of a hint thread */
  revealHint: (hintId: string) => string | null;
  /** Active event juice cue (shake / flash / burst) — shell renders overlay */
  activeJuice: JuiceCue | null;
  /** Play event juice (region enter, cutscene line, interact, …) */
  playJuice: (presetOrCue: JuicePresetId | JuiceCue | undefined) => void;
  /** Clear juice pulse after overlay finishes */
  clearJuice: () => void;
  /** Soft prompt: offer progressive hint after idle / failed interacts */
  stuckAssistOffer: boolean;
  /** Hotspot id to pulse while stuck assist is offered (from hint / objective) */
  stuckAssistHotspotId: string | null;
  /** Accept stuck assist — reveal first active hint's next tier */
  acceptStuckAssist: () => string | null;
  /** Dismiss stuck assist (starts cooldown) */
  dismissStuckAssist: () => void;
  /** Pending irreversible item consume confirm */
  pendingConsumeConfirm: {
    hotspot: Hotspot;
    item: GameItem;
    verb: VerbId;
    options?: {
      onDialogueOpen?: () => void;
      onSpecial?: () => void;
    };
  } | null;
  confirmConsume: () => void;
  cancelConsume: () => void;
  /** Restore from autosave slot if present */
  loadAutosave: () => boolean;
  /** Pack special requesting a comic / minigame UI */
  pendingModality: PackModality | null;
  clearModality: () => void;
  /** Apply pack onModalityWin rewards (+ declarative winFlag from config) */
  completeModality: (
    modalityKey: string,
    config?: Record<string, unknown>
  ) => void;
  addJournalEntry: (id: string, title: string, content: string) => void;
  unlockAchievement: (id: string) => void;
  addQuest: (quest: Quest) => void;
  updateQuest: (id: string, objectiveIndex: number) => void;
  completeQuest: (id: string) => void;
}

const AdventureContext = createContext<AdventureContextValue | undefined>(
  undefined
);

export interface AdventureProviderProps {
  definition: GameDefinition;
  children: React.ReactNode;
  onRoomChange?: (roomId: string) => void;
  sfx?: {
    click?: () => void;
    pickup?: () => void;
    success?: () => void;
    error?: () => void;
  };
  /**
   * Play a voice clip by key from sayLine.voiceKey.
   * May return VO duration (ms) so the host can extend talk anim / speech bar.
   */
  onVoice?: (
    voiceKey: string
  ) => void | Promise<number | null | undefined>;
  /** Script sound opcodes (sound / stopSound) */
  onSound?: (
    event:
      | { kind: "play"; key: string; channel?: string }
      | { kind: "stop"; key?: string; channel?: string }
  ) => void;
  /** Script music opcode */
  onMusic?: (key: string) => void;
  /** Pack / hotspot haptic styles (Capacitor native or web vibrate) */
  onHaptic?: (style: HapticStyle) => void;
  /** Optional host hook when juice fires (tests / analytics) */
  onJuice?: (cue: JuiceCue) => void;
  onCutsceneEnd?: (cutsceneId: string) => void;
}

export const AdventureProvider: React.FC<AdventureProviderProps> = ({
  definition,
  children,
  onRoomChange,
  sfx,
  onVoice,
  onSound,
  onMusic,
  onHaptic,
  onJuice,
  onCutsceneEnd,
}) => {
  const runtime = useMemo(() => createGame(definition), [definition]);
  const [gameState, setGameState] = useState<GameState>(() => {
    let initial = runtime.createInitialState();
    initial = autoStartRoomScripts(
      initial,
      definition,
      initial.currentLocation
    );
    return initial;
  });
  const [selectedVerb, setSelectedVerb] = useState<VerbId | null>(null);
  const [verbMode, setVerbModeState] = useState<VerbMode>(() => {
    return (
      loadStoredVerbMode(definition.id) ??
      definition.verbMode ??
      "classic"
    );
  });
  const verbs = useMemo(
    () => resolveVerbs(definition, verbMode),
    [definition, verbMode]
  );
  const setVerbMode = useCallback(
    (mode: VerbMode) => {
      setVerbModeState(mode);
      storeVerbMode(definition.id, mode);
      setSelectedVerb((prev) => {
        if (!prev) return prev;
        const nextVerbs = resolveVerbs(definition, mode);
        return nextVerbs.some((v) => v.id === prev) ? prev : null;
      });
    },
    [definition]
  );
  const [locale, setLocaleState] = useState(() => runtime.getLocale());
  const setLocale = useCallback(
    (next: string) => {
      runtime.setLocale(next);
      setLocaleState(next);
    },
    [runtime]
  );
  const t = useCallback(
    (key: string, fallback?: string) => runtime.t(key, fallback),
    [runtime, locale]
  );
  const [currentMessage, setCurrentMessage] = useState<string | null>(null);
  const [selectedCombineItem, setSelectedCombineItem] =
    useState<GameItem | null>(null);
  const [hoveredTargetName, setHoveredTargetName] = useState<string | null>(
    null
  );
  const [egoWalk, setEgoWalk] = useState<WalkMotion | null>(null);
  const [actionLog, setActionLog] = useState<string[]>([]);
  const [activeJuice, setActiveJuice] = useState<JuiceCue | null>(null);
  const [stuckAssistOffer, setStuckAssistOffer] = useState(false);
  const pendingArriveRef = useRef<PendingArrive | null>(null);
  const egoWalkRef = useRef<WalkMotion | null>(null);
  const lastActivityAtRef = useRef(Date.now());
  const failedStreakRef = useRef(0);
  const stuckDismissedUntilRef = useRef(0);
  const ACTION_LOG_MAX = 40;

  const stuckConfig = useMemo(
    () =>
      resolveStuckAssistConfig(
        definition.stuckAssist,
        (definition.hints?.length ?? 0) > 0
      ),
    [definition.stuckAssist, definition.hints]
  );

  const markActivity = useCallback(() => {
    lastActivityAtRef.current = Date.now();
    failedStreakRef.current = 0;
    setStuckAssistOffer(false);
  }, []);

  const playJuice = useCallback(
    (presetOrCue: JuicePresetId | JuiceCue | undefined) => {
      const cue = resolveJuiceCue(presetOrCue);
      if (!cue) return;
      setActiveJuice(cue);
      onJuice?.(cue);
    },
    [onJuice]
  );

  const clearJuice = useCallback(() => setActiveJuice(null), []);

  const pushActionLog = useCallback((entry: string) => {
    setActionLog((prev) => {
      const next = [...prev, entry];
      return next.length > ACTION_LOG_MAX
        ? next.slice(next.length - ACTION_LOG_MAX)
        : next;
    });
  }, []);
  const cutsceneActiveRef = useRef(false);
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  const setEgoWalkBoth = useCallback((motion: WalkMotion | null) => {
    egoWalkRef.current = motion;
    setEgoWalk(motion);
  }, []);

  useEffect(() => {
    onRoomChange?.(gameState.currentLocation);
  }, [gameState.currentLocation, onRoomChange]);

  const updateGameState = useCallback(
    (updates: StatePatch) => {
      setGameState((prev) => {
        const next = applyStatePatch(prev, updates);
        // Strict play: clamp rooms / malformed inventory; do not require an
        // item catalog (TS packs often give items from script closures).
        if (!isStrictPlayEnabled()) return next;
        return sanitizePlayState(next, definition);
      });
    },
    [definition]
  );

  const replaceGameState = useCallback(
    (state: GameState) => {
      setEgoWalkBoth(null);
      pendingArriveRef.current = null;
      let next = normalizeLoadedState(state, definition);
      if (isStrictPlayEnabled()) {
        next = sanitizePlayState(next, definition);
      }
      setGameState(next);
    },
    [definition, setEgoWalkBoth]
  );

  const messageTimerRef = useRef<number | null>(null);
  const showMessage = useCallback(
    (message: string) => {
      setCurrentMessage(message);
      const duration = definition.messageDurationMs ?? 15000;
      if (messageTimerRef.current != null) {
        window.clearTimeout(messageTimerRef.current);
      }
      messageTimerRef.current = window.setTimeout(() => {
        setCurrentMessage(null);
        messageTimerRef.current = null;
      }, duration);
    },
    [definition.messageDurationMs]
  );
  const showMessageRef = useRef(showMessage);
  showMessageRef.current = showMessage;

  useEffect(() => {
    return () => {
      if (messageTimerRef.current != null) {
        window.clearTimeout(messageTimerRef.current);
      }
    };
  }, []);

  const {
    pendingModality,
    setPendingModality,
    clearModality,
    completeModality,
  } = useModalityHost({
    definition,
    runtime,
    setGameState,
    showMessage,
    sfx,
  });

  const sentence: Sentence = useMemo(
    () => ({
      verb: selectedVerb,
      item: selectedCombineItem,
      targetName: hoveredTargetName,
    }),
    [selectedVerb, selectedCombineItem, hoveredTargetName]
  );

  const sentenceLine = useMemo(() => formatSentence(sentence), [sentence]);

  const {
    sayLines,
    setSayLines,
    currentSpeech,
    skipSpeech,
    enqueueSpeech,
    playVoice,
    fireVoiceRef,
  } = useSpeechHost({
    runtime,
    setGameState,
    cutsceneActiveRef,
    onVoice,
  });

  const {
    roomTransition,
    transitionRef,
    travelThroughExit,
    travelToRoom,
  } = useTravel({
    runtime,
    definition,
    cutsceneActiveRef,
    gameStateRef,
    pendingArriveRef,
    setEgoWalkBoth,
    setGameState,
    setSayLines,
    showMessage,
    pushActionLog,
    sfx,
  });

  const {
    cutscene,
    cutsceneLine,
    startCutsceneDef,
    startNamedCutscene,
    advanceCutsceneLine,
    skipActiveCutscene,
  } = useCutsceneHost({
    runtime,
    definition,
    roomTransition,
    gameStateFlags: gameState.flags,
    setGameState,
    updateGameState,
    setEgoWalkBoth,
    pendingArriveRef,
    onCutsceneEnd,
    isWalking: !!egoWalk,
  });
  cutsceneActiveRef.current = !!cutscene?.active;

  const startNamedScript = useCallback(
    (id: string) => {
      let started = false;
      setGameState((prev) => {
        const result = runtime.startScript(prev, id);
        started = result.started;
        if (result.started) {
          return runtime.runEvent(
            { type: "scriptStart", scriptId: id },
            result.state
          );
        }
        return prev;
      });
      return started;
    },
    [runtime]
  );

  const stopNamedScript = useCallback(
    (id: string) => {
      setGameState((prev) => {
        const next = runtime.stopScript(prev, id);
        return runtime.runEvent({ type: "scriptEnd", scriptId: id }, next);
      });
    },
    [runtime]
  );

  const {
    applySentenceResult,
    walkEgoTo,
    executeSentence,
    pendingConsumeConfirm,
    setPendingConsumeConfirm,
    confirmConsume,
    cancelConsume,
  } = useSentenceInteract({
    runtime,
    definition,
    cutscene,
    selectedVerb,
    setSelectedVerb,
    selectedCombineItem,
    setSelectedCombineItem,
    gameStateRef,
    transitionRef,
    pendingArriveRef,
    setEgoWalkBoth,
    setGameState,
    setPendingModality,
    showMessage,
    pushActionLog,
    markActivity,
    playJuice,
    failedStreakRef,
    travelThroughExit,
    sfx,
    onSound,
    onHaptic,
  });

  useWalkTick({
    runtime,
    applySentenceResult,
    egoWalkRef,
    pendingArriveRef,
    setEgoWalk,
    setPendingConsumeConfirm,
    setGameState,
    cutsceneActiveRef,
    transitionRef,
    gameStateRef,
    showMessageRef,
    fireVoiceRef,
    setSayLines,
    onSound,
    onMusic,
    onHaptic,
    playJuice,
    startNamedCutscene,
  });

  const {
    combineItems,
    addJournalEntry,
    unlockAchievement,
    addQuest,
    updateQuest,
    completeQuest,
  } = useProgressionHost({
    runtime,
    definition,
    gameState,
    setGameState,
    showMessage,
    cutscene,
    setSelectedCombineItem,
    sfx,
  });

  const inputLocked = !!cutscene?.active || !!roomTransition;
  const isWalking = !!egoWalk;

  const playableActors = useMemo(
    () => runtime.getPlayableActors(gameState),
    [runtime, gameState]
  );

  const stuckAssistHotspotId = useMemo(
    () =>
      resolveStuckAssistHotspotId({
        offering: stuckAssistOffer,
        hints: runtime.listActiveHints(gameState),
      }),
    [stuckAssistOffer, runtime, gameState]
  );

  const activeHints = useMemo(
    () => runtime.listActiveHints(gameState),
    [runtime, gameState]
  );

  const switchToEgo = useCallback(
    (actorId: string) => {
      if (inputLocked) return false;
      const result = runtime.switchEgo(gameStateRef.current, actorId);
      if (!result.ok || !result.patch) {
        if (result.message) showMessage(result.message);
        return false;
      }
      setEgoWalkBoth(null);
      pendingArriveRef.current = null;
      setSelectedCombineItem(null);
      updateGameState(result.patch);
      const name =
        runtime.getActorDef(actorId)?.name ??
        gameStateRef.current.actors?.[actorId]?.id ??
        actorId;
      showMessage(`Now controlling ${name}.`);
      return true;
    },
    [inputLocked, runtime, showMessage, setEgoWalkBoth, updateGameState]
  );

  const revealHint = useCallback(
    (hintId: string) => {
      const result = runtime.revealNextHint(gameStateRef.current, hintId);
      if (!result.ok || !result.patch) {
        if (result.message) showMessage(result.message);
        return null;
      }
      markActivity();
      updateGameState(result.patch);
      if (result.message) showMessage(result.message);
      return result.message ?? null;
    },
    [runtime, showMessage, updateGameState, markActivity]
  );

  const acceptStuckAssist = useCallback(() => {
    setStuckAssistOffer(false);
    markActivity();
    const first = runtime.listActiveHints(gameStateRef.current).find(
      (h) => !h.exhausted
    );
    if (!first) return null;
    return revealHint(first.id);
  }, [runtime, revealHint, markActivity]);

  const dismissStuckAssist = useCallback(() => {
    setStuckAssistOffer(false);
    stuckDismissedUntilRef.current =
      Date.now() + stuckConfig.dismissCooldownMs;
  }, [stuckConfig.dismissCooldownMs]);

  // Poll idle / failed-interact thresholds for stuck assist
  useEffect(() => {
    if (!stuckConfig.enabled) return;
    const id = window.setInterval(() => {
      const now = Date.now();
      const hints = runtime.listActiveHints(gameStateRef.current);
      const hasActiveHint = hints.some((h) => !h.exhausted);
      const offer = shouldOfferStuckAssist({
        config: stuckConfig,
        now,
        lastActivityAt: lastActivityAtRef.current,
        failedStreak: failedStreakRef.current,
        dismissedUntil: stuckDismissedUntilRef.current,
        hasActiveHint,
      });
      setStuckAssistOffer((prev) => (prev === offer ? prev : offer));
    }, 2000);
    return () => window.clearInterval(id);
  }, [stuckConfig, runtime]);

  const loadAutosave = useCallback(() => {
    const slot = runtime.save.loadAutosave();
    if (!slot) {
      showMessage("No autosave found.");
      return false;
    }
    if (slot.incompatible) {
      showMessage(slot.incompatibleReason ?? "Autosave is incompatible.");
      return false;
    }
    replaceGameState(slot.data);
    showMessage("Autosave restored.");
    return true;
  }, [runtime, replaceGameState, showMessage]);

  const autosaveConfig = useMemo(() => {
    const cfg = definition.autosave;
    if (cfg === false || cfg == null) return null;
    if (cfg === true) return { enabled: true, debounceMs: 1500 };
    return {
      enabled: cfg.enabled !== false,
      debounceMs: cfg.debounceMs ?? 1500,
    };
  }, [definition.autosave]);

  useEffect(() => {
    if (!autosaveConfig?.enabled) return;
    if (cutscene?.active || roomTransition) return;
    const handle = window.setTimeout(() => {
      const state = gameStateRef.current;
      const room = runtime.getRoom(state.currentLocation);
      runtime.save.autosave(state, room?.name ?? state.currentLocation);
    }, autosaveConfig.debounceMs);
    return () => window.clearTimeout(handle);
  }, [
    gameState,
    autosaveConfig,
    cutscene?.active,
    roomTransition,
    runtime,
  ]);

  // Flush IndexedDB + call autosave when the tab hides (web reliability)
  useEffect(() => {
    const persistNow = () => {
      if (!autosaveConfig?.enabled) {
        void runtime.save.flush();
        return;
      }
      const state = gameStateRef.current;
      const room = runtime.getRoom(state.currentLocation);
      runtime.save.autosave(state, room?.name ?? state.currentLocation);
      void runtime.save.flush();
    };
    const onVis = () => {
      if (document.visibilityState === "hidden") persistNow();
    };
    window.addEventListener("pagehide", persistNow);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("pagehide", persistNow);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [autosaveConfig, runtime]);

  const value = useMemo<AdventureContextValue>(
    () => ({
      runtime,
      definition,
      gameState,
      updateGameState,
      replaceGameState,
      selectedVerb,
      setSelectedVerb,
      verbs,
      verbMode,
      setVerbMode,
      locale,
      setLocale,
      t,
      showMessage,
      currentMessage,
      combineItems,
      selectedCombineItem,
      setSelectedCombineItem,
      hoveredTargetName,
      setHoveredTargetName,
      sentenceLine,
      executeSentence,
      walkEgoTo,
      inputLocked,
      isWalking,
      actionLog,
      cutscene,
      cutsceneLine,
      startNamedCutscene,
      startCutsceneDef,
      advanceCutsceneLine,
      skipActiveCutscene,
      startNamedScript,
      stopNamedScript,
      sayLines,
      currentSpeech,
      skipSpeech,
      enqueueSpeech,
      playVoice,
      travelThroughExit,
      travelToRoom,
      roomTransition,
      playableActors,
      switchToEgo,
      activeHints,
      revealHint,
      activeJuice,
      playJuice,
      clearJuice,
      stuckAssistOffer,
      stuckAssistHotspotId,
      acceptStuckAssist,
      dismissStuckAssist,
      pendingConsumeConfirm,
      confirmConsume,
      cancelConsume,
      loadAutosave,
      pendingModality,
      clearModality,
      completeModality,
      addJournalEntry,
      unlockAchievement,
      addQuest,
      updateQuest,
      completeQuest,
    }),
    [
      runtime,
      definition,
      gameState,
      updateGameState,
      replaceGameState,
      selectedVerb,
      verbs,
      verbMode,
      setVerbMode,
      locale,
      setLocale,
      t,
      showMessage,
      currentMessage,
      combineItems,
      selectedCombineItem,
      hoveredTargetName,
      sentenceLine,
      executeSentence,
      walkEgoTo,
      inputLocked,
      isWalking,
      actionLog,
      cutscene,
      cutsceneLine,
      startNamedCutscene,
      startCutsceneDef,
      advanceCutsceneLine,
      skipActiveCutscene,
      startNamedScript,
      stopNamedScript,
      sayLines,
      currentSpeech,
      skipSpeech,
      enqueueSpeech,
      playVoice,
      travelThroughExit,
      travelToRoom,
      roomTransition,
      activeJuice,
      playJuice,
      clearJuice,
      stuckAssistOffer,
      stuckAssistHotspotId,
      acceptStuckAssist,
      dismissStuckAssist,
      pendingConsumeConfirm,
      confirmConsume,
      cancelConsume,
      playableActors,
      switchToEgo,
      activeHints,
      revealHint,
      loadAutosave,
      pendingModality,
      clearModality,
      completeModality,
      addJournalEntry,
      unlockAchievement,
      addQuest,
      updateQuest,
      completeQuest,
    ]
  );

  return (
    <AdventureContext.Provider value={value}>
      {children}
    </AdventureContext.Provider>
  );
};

export function useAdventure(): AdventureContextValue {
  const ctx = useContext(AdventureContext);
  if (!ctx) {
    throw new Error("useAdventure must be used within AdventureProvider");
  }
  return ctx;
}

export const useGame = useAdventure;

// re-export for consumers that need the type
export type { Point2D };
