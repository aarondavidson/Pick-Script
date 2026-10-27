import {
  useCallback,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import type { GameDefinition } from "../definition";
import type { AdventureRuntime } from "../createGame";
import type {
  GameItem,
  GameState,
  Hotspot,
  RoomExit,
  StatePatch,
  VerbId,
} from "../types";
import { applyStatePatch } from "../state";
import { formatSentence } from "../sentence";
import { distance2d, setActorAnimState } from "../actors";
import { clampToWalkable, getWalkFloor, walkboxesForFloor } from "../walkboxes";
import type { WalkMotion } from "../walk";
import type { CutsceneRuntime } from "../cutscene";
import type { TransitionRuntime } from "../transitions";
import { hapticForSoundKey, type HapticStyle } from "../haptics";
import {
  juiceForSoundKey,
  resolveJuiceCue,
  type JuiceCue,
  type JuicePresetId,
} from "../juice";
import { resolveSpecialDef, type PackModality } from "../specials";
import type { PendingArrive, PendingConsumeConfirm } from "./pendingInteract";

export type { PendingArrive, PendingConsumeConfirm };

export interface UseSentenceInteractArgs {
  runtime: AdventureRuntime;
  definition: GameDefinition;
  cutscene: CutsceneRuntime | null;
  selectedVerb: VerbId | null;
  setSelectedVerb: Dispatch<SetStateAction<VerbId | null>>;
  selectedCombineItem: GameItem | null;
  setSelectedCombineItem: Dispatch<SetStateAction<GameItem | null>>;
  gameStateRef: MutableRefObject<GameState>;
  transitionRef: MutableRefObject<TransitionRuntime | null>;
  pendingArriveRef: MutableRefObject<PendingArrive | null>;
  setEgoWalkBoth: (motion: WalkMotion | null) => void;
  setGameState: Dispatch<SetStateAction<GameState>>;
  setPendingModality: Dispatch<SetStateAction<PackModality | null>>;
  showMessage: (message: string) => void;
  pushActionLog: (entry: string) => void;
  markActivity: () => void;
  playJuice: (presetOrCue: JuicePresetId | JuiceCue | undefined) => void;
  failedStreakRef: MutableRefObject<number>;
  travelThroughExit: (exit: RoomExit) => boolean;
  sfx?: {
    click?: () => void;
    pickup?: () => void;
    success?: () => void;
    error?: () => void;
  };
  onSound?: (
    event:
      | { kind: "play"; key: string; channel?: string }
      | { kind: "stop"; key?: string; channel?: string }
  ) => void;
  onHaptic?: (style: HapticStyle) => void;
}

/**
 * Sentence execution: walk-to-before-interact, applySentenceResult, consume confirm.
 */
export function useSentenceInteract({
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
}: UseSentenceInteractArgs) {
  const [pendingConsumeConfirm, setPendingConsumeConfirm] =
    useState<PendingConsumeConfirm | null>(null);

  const applySpecialResult = useCallback(
    (
      specialResult: {
        patch?: StatePatch;
        message?: string;
        modality?: PackModality;
      },
      base: GameState
    ) => {
      let next = base;
      if (specialResult.patch && Object.keys(specialResult.patch).length) {
        next = applyStatePatch(next, specialResult.patch);
        setGameState(next);
      }
      if (specialResult.message) showMessage(specialResult.message);
      if (specialResult.modality) setPendingModality(specialResult.modality);
      return next;
    },
    [showMessage, setGameState, setPendingModality]
  );

  const applySentenceResult = useCallback(
    (
      hotspot: Hotspot,
      verb: VerbId,
      withItem: GameItem | null,
      options?: PendingArrive["options"],
      stateOverride?: GameState
    ) => {
      const base = stateOverride ?? gameStateRef.current;
      const special = resolveSpecialDef(definition.specials, hotspot);

      // Intercepting specials replace normal verb resolution
      if (special?.interceptVerbs?.includes(verb) && !withItem) {
        const specialResult = special.run({ hotspot, verb, state: base });
        if (specialResult) {
          sfx?.click?.();
          applySpecialResult(specialResult, base);
          setSelectedVerb(null);
          return;
        }
      }

      const result = runtime.doSentence(hotspot, verb, base, withItem);

      if (result.openDialogue) {
        sfx?.click?.();
        options?.onDialogueOpen?.();
        setSelectedVerb(null);
        return;
      }

      if (result.blocked) {
        if (result.message) showMessage(result.message);
        sfx?.error?.();
        playJuice("error");
        failedStreakRef.current += 1;
        setSelectedVerb(null);
        return;
      }

      markActivity();
      sfx?.click?.();

      let next = base;

      if (result.journalAdded && hotspot.journalEntry && result.message) {
        const raw = result.message.replace(/\n\n📔 Added to journal\.$/, "");
        if (
          !next.journalEntries.some((e) => e.id === hotspot.journalEntry!.id)
        ) {
          next = applyStatePatch(next, {
            journalEntries: [
              ...next.journalEntries,
              {
                id: hotspot.journalEntry.id,
                title: hotspot.journalEntry.title,
                content: raw,
                timestamp: Date.now(),
                location: next.currentLocation,
              },
            ],
          });
        }
      }

      // Room changes in patches must go through travel (onExit/onEnter/scripts)
      let travelDest: string | null = null;
      if (result.patch && Object.keys(result.patch).length > 0) {
        const {
          currentLocation: dest,
          visitedLocations: _visited,
          ...restPatch
        } = result.patch;
        if (dest && dest !== base.currentLocation) {
          travelDest = dest;
        }
        if (Object.keys(restPatch).length > 0) {
          next = applyStatePatch(next, restPatch);
        }
      }

      if (withItem) {
        next = runtime.runEvent(
          {
            type: "useWith",
            hotspotId: hotspot.id,
            itemId: withItem.id,
          },
          next
        );
      } else {
        next = runtime.runEvent(
          { type: "interact", hotspotId: hotspot.id, verb },
          next
        );
      }

      // After-hook specials (no interceptVerbs)
      if (special && !special.interceptVerbs?.length) {
        const specialResult = special.run({ hotspot, verb, state: next });
        if (specialResult?.patch) {
          const {
            currentLocation: dest,
            visitedLocations: _v,
            ...rest
          } = specialResult.patch;
          if (dest && dest !== next.currentLocation) {
            travelDest = dest;
          }
          if (Object.keys(rest).length) {
            next = applyStatePatch(next, rest);
          }
        }
        if (specialResult?.message) showMessage(specialResult.message);
        if (specialResult?.modality) {
          setPendingModality(specialResult.modality);
        } else {
          options?.onSpecial?.();
        }
      } else {
        options?.onSpecial?.();
      }

      setGameState(next);
      gameStateRef.current = next;
      if (result.message) showMessage(result.message);
      pushActionLog(
        formatSentence({
          verb,
          item: withItem,
          targetName: hotspot.name,
        }) || `${verb} ${hotspot.name}`
      );
      setSelectedVerb(null);
      if (withItem) setSelectedCombineItem(null);

      // Pack patches that grant items / unlock achievements get host SFX
      const inventoryGrew =
        (next.inventory?.length ?? 0) > (base.inventory?.length ?? 0);
      if (inventoryGrew) {
        sfx?.pickup?.();
      }
      const newlyUnlocked = next.achievements?.some(
        (a) =>
          a.unlocked &&
          !base.achievements?.find((b) => b.id === a.id)?.unlocked
      );
      if (newlyUnlocked) {
        sfx?.success?.();
      }

      // Author-assigned hotspot SFX (skip interactSound when pickup already fired)
      if (withItem && hotspot.useWithSound) {
        onSound?.({ kind: "play", key: hotspot.useWithSound });
      } else if (!withItem && hotspot.interactSound && !inventoryGrew) {
        onSound?.({ kind: "play", key: hotspot.interactSound });
      }

      // Explicit haptics, action-chain haptics, or SFX→haptic defaults
      if (onHaptic) {
        const styles: HapticStyle[] = [];
        if (withItem) {
          if (hotspot.useWithHaptic) styles.push(hotspot.useWithHaptic);
          else if (hotspot.useWithSound) {
            const d = hapticForSoundKey(hotspot.useWithSound);
            if (d) styles.push(d);
          }
        } else {
          if (hotspot.interactHaptic) styles.push(hotspot.interactHaptic);
          if (hotspot.actionHaptics?.length) {
            for (const h of hotspot.actionHaptics) {
              if (!styles.includes(h)) styles.push(h);
            }
          } else if (
            !hotspot.interactHaptic &&
            hotspot.interactSound &&
            !inventoryGrew
          ) {
            const d = hapticForSoundKey(hotspot.interactSound);
            if (d) styles.push(d);
          }
        }
        // pickup / success haptics fire via sfx callbacks above
        for (const style of styles) onHaptic(style);
      }

      // Visual juice: explicit, action-chain, SFX defaults, or pickup/success
      {
        const cues: JuiceCue[] = [];
        if (withItem) {
          if (hotspot.useWithJuice) {
            const c = resolveJuiceCue(hotspot.useWithJuice);
            if (c) cues.push(c);
          } else if (hotspot.useWithSound) {
            const p = juiceForSoundKey(hotspot.useWithSound);
            const c = resolveJuiceCue(p);
            if (c) cues.push(c);
          }
        } else {
          if (hotspot.interactJuice) {
            const c = resolveJuiceCue(hotspot.interactJuice);
            if (c) cues.push(c);
          }
          if (hotspot.actionJuices?.length) {
            for (const j of hotspot.actionJuices) {
              const c = resolveJuiceCue(j);
              if (c) cues.push(c);
            }
          } else if (
            !hotspot.interactJuice &&
            hotspot.interactSound &&
            !inventoryGrew
          ) {
            const p = juiceForSoundKey(hotspot.interactSound);
            const c = resolveJuiceCue(p);
            if (c) cues.push(c);
          }
        }
        if (inventoryGrew && !cues.length) {
          const c = resolveJuiceCue("pickup");
          if (c) cues.push(c);
        }
        if (newlyUnlocked && !cues.some((c) => c.burst === "stars")) {
          const c = resolveJuiceCue("success");
          if (c) cues.push(c);
        }
        if (cues.length) {
          // Merge to strongest single pulse for the overlay
          const merged = cues.reduce(
            (acc, c) => ({
              shake:
                ["none", "light", "medium", "heavy"].indexOf(c.shake) >
                ["none", "light", "medium", "heavy"].indexOf(acc.shake)
                  ? c.shake
                  : acc.shake,
              flash: c.flash !== "none" ? c.flash : acc.flash,
              burst: c.burst !== "none" ? c.burst : acc.burst,
              hitStopMs: Math.max(acc.hitStopMs, c.hitStopMs),
            }),
            {
              shake: "none" as JuiceCue["shake"],
              flash: "none" as JuiceCue["flash"],
              burst: "none" as JuiceCue["burst"],
              hitStopMs: 0,
            }
          );
          if (
            merged.shake !== "none" ||
            merged.flash !== "none" ||
            merged.burst !== "none" ||
            merged.hitStopMs
          ) {
            playJuice(merged);
          }
        }
      }

      if (travelDest) {
        const exit: RoomExit = {
          direction: "interact",
          to: travelDest,
          label: hotspot.name,
        };
        travelThroughExit(exit);
      }
    },
    [
      runtime,
      showMessage,
      sfx,
      onSound,
      onHaptic,
      definition.specials,
      applySpecialResult,
      travelThroughExit,
      pushActionLog,
      markActivity,
      playJuice,
      gameStateRef,
      failedStreakRef,
      setGameState,
      setPendingModality,
      setSelectedVerb,
      setSelectedCombineItem,
    ]
  );

  const walkEgoTo = useCallback(
    (x: number, y: number): boolean => {
      if (cutscene?.active || transitionRef.current) return false;
      const state = gameStateRef.current;
      const room = runtime.getRoom(state.currentLocation);
      const ego = runtime.getEgo(state);
      if (!ego || !room || !runtime.roomHasWalkboxes(room)) return false;

      const floor = getWalkFloor(state, room);
      const floorBoxes = walkboxesForFloor(room.walkboxes, floor);
      const target = clampToWalkable(x, y, floorBoxes);
      const dist = distance2d(ego.x, ego.y, target.x, target.y);
      if (dist < 0.5) return false;

      const path = runtime.findWalkPath(
        { x: ego.x, y: ego.y },
        target,
        room.walkboxes,
        { floor }
      );
      if (!path.length) return false;

      pendingArriveRef.current = null;
      const speed = definition.egoWalkSpeed ?? 40;
      setGameState((prev) =>
        applyStatePatch(prev, setActorAnimState(prev, ego.id, "walk"))
      );
      setEgoWalkBoth({
        actorId: ego.id,
        path,
        pathIndex: 0,
        speed,
      });
      pushActionLog(
        `Walk to (${Math.round(target.x)}, ${Math.round(target.y)})`
      );
      return true;
    },
    [
      cutscene,
      runtime,
      definition.egoWalkSpeed,
      setEgoWalkBoth,
      pushActionLog,
      gameStateRef,
      transitionRef,
      pendingArriveRef,
      setGameState,
    ]
  );

  const executeSentence = useCallback(
    (
      hotspot: Hotspot,
      options?: {
        onDialogueOpen?: () => void;
        onSpecial?: () => void;
      },
      opts?: { skipConsumeConfirm?: boolean }
    ) => {
      if (cutscene?.active) return;

      const verb: VerbId | null =
        selectedVerb ?? (selectedCombineItem ? "use" : null);
      if (!verb) return;

      const withItem =
        (verb === "use" || verb === "give") && selectedCombineItem
          ? selectedCombineItem
          : null;

      // Irreversible consume warning (use-with that removes the item)
      if (
        withItem &&
        !opts?.skipConsumeConfirm &&
        hotspot.consumesItems?.includes(withItem.id)
      ) {
        setPendingConsumeConfirm({
          hotspot,
          item: withItem,
          verb,
          options,
        });
        return;
      }

      const state = gameStateRef.current;
      const room = runtime.getRoom(state.currentLocation);
      const ego = runtime.getEgo(state);
      const threshold = definition.walkArriveThreshold ?? 3;
      const speed = definition.egoWalkSpeed ?? 40;

      const shouldWalk =
        !!ego &&
        !!room &&
        runtime.roomHasWalkboxes(room) &&
        !hotspot.skipWalkTo;

      if (shouldWalk && ego) {
        const floor = getWalkFloor(state, room);
        const approach = runtime.hotspotApproachPoint(hotspot, room!, floor);
        const dist = distance2d(ego.x, ego.y, approach.x, approach.y);
        if (dist > threshold) {
          const path = runtime.findWalkPath(
            { x: ego.x, y: ego.y },
            approach,
            room!.walkboxes,
            { floor }
          );
          pendingArriveRef.current = {
            hotspot,
            verb,
            withItem,
            options,
          };
          setGameState((prev) =>
            applyStatePatch(prev, setActorAnimState(prev, ego.id, "walk"))
          );
          setEgoWalkBoth({
            actorId: ego.id,
            path,
            pathIndex: 0,
            speed,
          });
          return;
        }
      }

      applySentenceResult(hotspot, verb, withItem, options, state);
    },
    [
      cutscene,
      selectedVerb,
      selectedCombineItem,
      runtime,
      definition.walkArriveThreshold,
      definition.egoWalkSpeed,
      applySentenceResult,
      setEgoWalkBoth,
      gameStateRef,
      pendingArriveRef,
      setGameState,
    ]
  );

  const confirmConsume = useCallback(() => {
    const pending = pendingConsumeConfirm;
    if (!pending) return;
    setPendingConsumeConfirm(null);
    // Arm selection again then run without re-prompt
    setSelectedCombineItem(pending.item);
    setSelectedVerb(pending.verb);
    // Defer so state updates land before execute
    queueMicrotask(() => {
      applySentenceResult(
        pending.hotspot,
        pending.verb,
        pending.item,
        pending.options
      );
    });
  }, [
    pendingConsumeConfirm,
    applySentenceResult,
    setSelectedCombineItem,
    setSelectedVerb,
  ]);

  const cancelConsume = useCallback(() => {
    setPendingConsumeConfirm(null);
  }, []);

  return {
    applySentenceResult,
    walkEgoTo,
    executeSentence,
    pendingConsumeConfirm,
    setPendingConsumeConfirm,
    confirmConsume,
    cancelConsume,
  };
}
