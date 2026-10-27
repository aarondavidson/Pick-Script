import {
  useCallback,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import type { GameDefinition } from "../definition";
import type { AdventureRuntime } from "../createGame";
import type { GameState, RoomExit } from "../types";
import { isStrictPlayEnabled } from "../deployLock";
import { canFastTravelTo } from "../stateIntegrity";
import type { TransitionRuntime } from "../transitions";
import type { WalkMotion } from "../walk";
import type { SpeechLine } from "../speech";
import type { PendingArrive } from "./pendingInteract";

export interface UseTravelArgs {
  runtime: AdventureRuntime;
  definition: GameDefinition;
  cutsceneActiveRef: MutableRefObject<boolean>;
  gameStateRef: MutableRefObject<GameState>;
  pendingArriveRef: MutableRefObject<PendingArrive | null>;
  setEgoWalkBoth: (motion: WalkMotion | null) => void;
  setGameState: Dispatch<SetStateAction<GameState>>;
  setSayLines: Dispatch<SetStateAction<SpeechLine[]>>;
  showMessage: (message: string) => void;
  pushActionLog: (entry: string) => void;
  sfx?: {
    click?: () => void;
    pickup?: () => void;
    success?: () => void;
    error?: () => void;
  };
}

/**
 * Room travel with fade/slide transitions and fast-travel map hops.
 */
export function useTravel({
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
}: UseTravelArgs) {
  const [roomTransition, setRoomTransition] =
    useState<TransitionRuntime | null>(null);
  const transitionRef = useRef<TransitionRuntime | null>(null);
  transitionRef.current = roomTransition;
  const pendingTravelStateRef = useRef<GameState | null>(null);

  const applyTravelResult = useCallback(
    (nextState: GameState) => {
      setEgoWalkBoth(null);
      pendingArriveRef.current = null;
      setSayLines([]);
      setGameState(nextState);
    },
    [setEgoWalkBoth, pendingArriveRef, setSayLines, setGameState]
  );

  const travelThroughExit = useCallback(
    (exit: RoomExit): boolean => {
      if (cutsceneActiveRef.current || transitionRef.current) return false;

      const state = gameStateRef.current;
      const result = runtime.travel(state, exit);
      if (!result.ok || !result.nextState) {
        if (result.message) showMessage(result.message);
        sfx?.error?.();
        return false;
      }

      const fromRoom = runtime.getRoom(state.currentLocation);
      const toRoom = runtime.getRoom(exit.to);
      const out = runtime.resolveTransitionOut(fromRoom, exit);
      const inn = runtime.resolveTransitionIn(toRoom, exit);
      const duration = out.durationMs ?? 350;

      pushActionLog(
        `Travel → ${toRoom?.name ?? exit.to}${
          exit.label ? ` (${exit.label})` : ""
        }`
      );

      if (out.kind === "none" && inn.kind === "none") {
        applyTravelResult(result.nextState);
        return true;
      }

      pendingTravelStateRef.current = result.nextState;
      const transition: TransitionRuntime = {
        phase: "out",
        kind: out.kind === "none" ? inn.kind : out.kind,
        durationMs: duration,
        direction: exit.direction,
        fromRoomId: state.currentLocation,
        toRoomId: exit.to,
      };
      setRoomTransition(transition);

      window.setTimeout(() => {
        const pending = pendingTravelStateRef.current;
        pendingTravelStateRef.current = null;
        if (pending) applyTravelResult(pending);

        const inKind = inn.kind === "none" ? out.kind : inn.kind;
        const inDuration = inn.durationMs ?? duration;
        if (inKind === "none") {
          setRoomTransition(null);
          return;
        }
        setRoomTransition({
          phase: "in",
          kind: inKind,
          durationMs: inDuration,
          direction: exit.direction,
          fromRoomId: state.currentLocation,
          toRoomId: exit.to,
        });
        window.setTimeout(() => setRoomTransition(null), inDuration);
      }, duration);

      return true;
    },
    [
      cutsceneActiveRef,
      gameStateRef,
      runtime,
      showMessage,
      sfx,
      applyTravelResult,
      pushActionLog,
    ]
  );

  const travelToRoom = useCallback(
    (roomId: string): boolean => {
      if (roomId === gameStateRef.current.currentLocation) return false;
      // Deploy lock: fast-travel must obey map visited policy (no console skip).
      if (
        isStrictPlayEnabled() &&
        !canFastTravelTo(definition, gameStateRef.current, roomId)
      ) {
        return false;
      }
      const exit: RoomExit = {
        direction: "fast",
        to: roomId,
        label: "Fast travel",
      };
      return travelThroughExit(exit);
    },
    [definition, travelThroughExit, gameStateRef]
  );

  return {
    roomTransition,
    transitionRef,
    travelThroughExit,
    travelToRoom,
  };
}
