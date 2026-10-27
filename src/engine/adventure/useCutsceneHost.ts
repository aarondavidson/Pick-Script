import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import type { GameDefinition } from "../definition";
import type { AdventureRuntime } from "../createGame";
import type { GameState, StatePatch } from "../types";
import {
  advanceCutscene,
  currentCutsceneLine,
  cutsceneLineReadyToAdvance,
  cutsceneLineWaitRequirements,
  skipCutscene,
  startCutscene,
  type CutsceneDef,
  type CutsceneRuntime,
} from "../cutscene";
import { freezeScripts } from "../scriptRunner";
import type { TransitionRuntime } from "../transitions";
import type { WalkMotion } from "../walk";
import type { PendingArrive } from "./pendingInteract";

export interface UseCutsceneHostArgs {
  runtime: AdventureRuntime;
  definition: GameDefinition;
  roomTransition: TransitionRuntime | null;
  gameStateFlags: GameState["flags"];
  setGameState: Dispatch<SetStateAction<GameState>>;
  updateGameState: (updates: StatePatch) => void;
  setEgoWalkBoth: (motion: WalkMotion | null) => void;
  pendingArriveRef: MutableRefObject<PendingArrive | null>;
  onCutsceneEnd?: (cutsceneId: string) => void;
  /** Live walk flag — used for waitForWalk auto-advance */
  isWalking?: boolean;
}

/**
 * Cutscene start / advance / skip, keyboard ownership, flag→cutscene triggers,
 * and timeline sync (waitForSpeech / waitForWalk / durationMs / goto).
 */
export function useCutsceneHost({
  runtime,
  definition,
  roomTransition,
  gameStateFlags,
  setGameState,
  updateGameState,
  setEgoWalkBoth,
  pendingArriveRef,
  onCutsceneEnd,
  isWalking = false,
}: UseCutsceneHostArgs) {
  const [cutscene, setCutscene] = useState<CutsceneRuntime | null>(null);
  const speechUntilRef = useRef(0);
  const expectWalkRef = useRef(false);
  const sawWalkRef = useRef(false);
  const durationElapsedRef = useRef(true);
  const lineKeyRef = useRef<string | null>(null);

  const endCutsceneInternal = useCallback(
    (id: string) => {
      setCutscene(null);
      setGameState((prev) => {
        let next = freezeScripts(prev, false);
        next = runtime.runEvent({ type: "cutsceneEnd", cutsceneId: id }, next);
        return next;
      });
      onCutsceneEnd?.(id);
    },
    [runtime, onCutsceneEnd, setGameState]
  );

  const startCutsceneDef = useCallback(
    (def: CutsceneDef) => {
      lineKeyRef.current = null;
      setCutscene(startCutscene(def));
      setEgoWalkBoth(null);
      pendingArriveRef.current = null;
      setGameState((prev) => {
        let next = freezeScripts(prev, true);
        next = runtime.runEvent(
          { type: "cutsceneStart", cutsceneId: def.id },
          next
        );
        return next;
      });
    },
    [runtime, setEgoWalkBoth, pendingArriveRef, setGameState]
  );

  const startNamedCutscene = useCallback(
    (id: string) => {
      const def = runtime.getCutscene(id);
      if (!def) return false;
      startCutsceneDef(def);
      return true;
    },
    [runtime, startCutsceneDef]
  );

  const advanceCutsceneLine = useCallback(() => {
    setCutscene((prev) => {
      if (!prev) return null;
      const next = advanceCutscene(prev);
      if (!next) {
        queueMicrotask(() => endCutsceneInternal(prev.def.id));
        return null;
      }
      return next;
    });
  }, [endCutsceneInternal]);

  const skipActiveCutscene = useCallback(() => {
    setCutscene((prev) => {
      if (!prev) return null;
      const next = skipCutscene(prev);
      if (!next) {
        queueMicrotask(() => endCutsceneInternal(prev.def.id));
        return null;
      }
      return next;
    });
  }, [endCutsceneInternal]);

  const cutsceneLine = currentCutsceneLine(cutscene);

  // Reset wait trackers when the active line changes (presentation starts walk/say)
  useEffect(() => {
    if (!cutscene?.active || !cutsceneLine) return;
    const key = `${cutscene.def.id}:${cutscene.lineIndex}`;
    if (lineKeyRef.current === key) return;
    lineKeyRef.current = key;

    const req = cutsceneLineWaitRequirements(cutsceneLine);
    durationElapsedRef.current = req.durationMs == null;
    expectWalkRef.current = !!(req.waitForWalk && cutsceneLine.walkTo);
    sawWalkRef.current = !req.waitForWalk || !cutsceneLine.walkTo;
    speechUntilRef.current = 0;
    if (req.waitForSpeech && cutsceneLine.sayLine?.text) {
      const ms =
        cutsceneLine.sayLine.durationMs ?? cutsceneLine.durationMs ?? 2800;
      speechUntilRef.current = performance.now() + ms;
    }

    if (req.durationMs == null) return;
    const t = window.setTimeout(() => {
      durationElapsedRef.current = true;
    }, req.durationMs);
    return () => window.clearTimeout(t);
  }, [cutscene, cutsceneLine]);

  // Auto-advance when duration + waitForSpeech + waitForWalk are satisfied
  useEffect(() => {
    if (!cutscene?.active || !cutsceneLine) return;
    const req = cutsceneLineWaitRequirements(cutsceneLine);
    if (
      req.durationMs == null &&
      !req.waitForSpeech &&
      !req.waitForWalk
    ) {
      return;
    }

    const tick = window.setInterval(() => {
      if (isWalking) {
        sawWalkRef.current = true;
        expectWalkRef.current = false;
      }
      const speechDone =
        !req.waitForSpeech || performance.now() >= speechUntilRef.current;
      const walkDone =
        !req.waitForWalk ||
        (sawWalkRef.current && !isWalking && !expectWalkRef.current);
      if (
        cutsceneLineReadyToAdvance(cutsceneLine, {
          durationElapsed: durationElapsedRef.current,
          speechDone,
          walkDone,
        })
      ) {
        advanceCutsceneLine();
      }
    }, 48);
    return () => window.clearInterval(tick);
  }, [cutscene, cutsceneLine, isWalking, advanceCutsceneLine]);

  useEffect(() => {
    if (!cutscene?.active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        skipActiveCutscene();
      } else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        advanceCutsceneLine();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cutscene, skipActiveCutscene, advanceCutsceneLine]);

  const inputLocked = !!cutscene?.active || !!roomTransition;

  // Pack-declared flag → cutscene auto-start
  useEffect(() => {
    if (inputLocked) return;
    const triggers = definition.flagCutscenes;
    if (!triggers) return;
    for (const [flag, cutsceneId] of Object.entries(triggers)) {
      if (gameStateFlags[flag]) {
        updateGameState({ flags: { [flag]: false } });
        startNamedCutscene(cutsceneId);
        break;
      }
    }
  }, [
    gameStateFlags,
    definition.flagCutscenes,
    inputLocked,
    updateGameState,
    startNamedCutscene,
  ]);

  return {
    cutscene,
    cutsceneLine,
    startCutsceneDef,
    startNamedCutscene,
    advanceCutsceneLine,
    skipActiveCutscene,
  };
}
