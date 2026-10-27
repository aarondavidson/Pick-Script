import {
  useEffect,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import type { AdventureRuntime } from "../createGame";
import type { GameState, Hotspot, VerbId, GameItem } from "../types";
import { applyStatePatch } from "../state";
import { getEgo, setActorAnimState } from "../actors";
import { stepWalk, type WalkMotion } from "../walk";
import { checkRegionEntries } from "../regions";
import { checkRoomTimers } from "../roomTimers";
import { pruneSpeech, type SpeechLine } from "../speech";
import type { TransitionRuntime } from "../transitions";
import type { HapticStyle } from "../haptics";
import type { JuiceCue } from "../juice";
import { floorTransitionPatchAt } from "../walkboxes";
import type {
  PendingArrive,
  PendingConsumeConfirm,
} from "./pendingInteract";

export interface UseWalkTickArgs {
  runtime: AdventureRuntime;
  applySentenceResult: (
    hotspot: Hotspot,
    verb: VerbId,
    withItem: GameItem | null,
    options?: PendingArrive["options"],
    stateOverride?: GameState
  ) => void;
  egoWalkRef: MutableRefObject<WalkMotion | null>;
  pendingArriveRef: MutableRefObject<PendingArrive | null>;
  setEgoWalk: Dispatch<SetStateAction<WalkMotion | null>>;
  setPendingConsumeConfirm: Dispatch<
    SetStateAction<PendingConsumeConfirm | null>
  >;
  setGameState: Dispatch<SetStateAction<GameState>>;
  cutsceneActiveRef: MutableRefObject<boolean>;
  transitionRef: MutableRefObject<TransitionRuntime | null>;
  gameStateRef: MutableRefObject<GameState>;
  showMessageRef: MutableRefObject<(message: string) => void>;
  fireVoiceRef: MutableRefObject<(line: SpeechLine) => void>;
  setSayLines: Dispatch<SetStateAction<SpeechLine[]>>;
  onSound?: (
    event:
      | { kind: "play"; key: string; channel?: string }
      | { kind: "stop"; key?: string; channel?: string }
  ) => void;
  onMusic?: (key: string) => void;
  onHaptic?: (style: HapticStyle) => void;
  playJuice?: (cue: JuiceCue) => void;
  startNamedCutscene?: (id: string) => boolean;
}

/**
 * RAF loop: ego walk stepping, region entries, room timers, concurrent scripts,
 * camera follow, and speech-line pruning / talk-anim cleanup.
 */
export function useWalkTick({
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
}: UseWalkTickArgs): void {
  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    const applyArrive = applySentenceResult;
    /** Room dwell accumulator — pauses while cutscene owns input. */
    const dwell = {
      roomId: "" as string,
      ms: 0,
      fired: new Set<string>(),
    };

    const tick = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;

      setGameState((prev) => {
        let next = prev;
        let changed = false;

        const walk = egoWalkRef.current;
        if (walk) {
          const prevPathIndex = walk.pathIndex;
          const prevEgoPos = getEgo(next);
          const walkResult = stepWalk(next, walk, dt);
          if (Object.keys(walkResult.patch).length) {
            next = applyStatePatch(next, walkResult.patch);
            changed = true;
          }
          const nextEgoPos = getEgo(next);
          const arrivedWaypoint =
            !!nextEgoPos &&
            (walkResult.motion
              ? walkResult.motion.pathIndex > prevPathIndex
              : true);
          if (arrivedWaypoint && nextEgoPos) {
            const roomForFloor = runtime.getRoom(next.currentLocation);
            const floorPatch = floorTransitionPatchAt(
              nextEgoPos.x,
              nextEgoPos.y,
              roomForFloor?.walkboxes,
              next
            );
            if (floorPatch) {
              next = applyStatePatch(next, floorPatch);
              changed = true;
            }
          }
          if (prevEgoPos && nextEgoPos) {
            const roomForRegions = runtime.getRoom(next.currentLocation);
            if (roomForRegions?.regions?.length) {
              const regionHit = checkRegionEntries(
                { x: prevEgoPos.x, y: prevEgoPos.y },
                { x: nextEgoPos.x, y: nextEgoPos.y },
                roomForRegions,
                next
              );
              const {
                message: regionMessage,
                sounds: regionSounds,
                haptics: regionHaptics,
                juices: regionJuices,
                cutsceneId: regionCutsceneId,
                ...regionPatch
              } = regionHit;
              if (Object.keys(regionPatch).length) {
                next = applyStatePatch(next, regionPatch);
                changed = true;
              }
              if (
                regionMessage ||
                regionSounds?.length ||
                regionHaptics?.length ||
                regionJuices?.length ||
                regionCutsceneId
              ) {
                queueMicrotask(() => {
                  if (regionMessage) showMessageRef.current(regionMessage);
                  for (const key of regionSounds ?? []) {
                    onSound?.({ kind: "play", key });
                  }
                  for (const style of regionHaptics ?? []) {
                    onHaptic?.(style);
                  }
                  for (const cue of regionJuices ?? []) {
                    playJuice?.(cue);
                  }
                  if (regionCutsceneId) {
                    startNamedCutscene?.(regionCutsceneId);
                  }
                });
              }
            }
          }
          if (!walkResult.motion) {
            const pending = pendingArriveRef.current;
            const walkerId = walk.actorId;
            pendingArriveRef.current = null;
            egoWalkRef.current = null;
            next = applyStatePatch(
              next,
              setActorAnimState(next, walkerId, "idle")
            );
            changed = true;
            queueMicrotask(() => {
              setEgoWalk(null);
              if (pending) {
                if (
                  pending.withItem &&
                  pending.hotspot.consumesItems?.includes(pending.withItem.id)
                ) {
                  setPendingConsumeConfirm({
                    hotspot: pending.hotspot,
                    item: pending.withItem,
                    verb: pending.verb,
                    options: pending.options,
                  });
                  return;
                }
                applyArrive(
                  pending.hotspot,
                  pending.verb,
                  pending.withItem,
                  pending.options,
                  gameStateRef.current
                );
              }
            });
          } else {
            egoWalkRef.current = walkResult.motion;
          }
        }

        if (
          next.activeScripts?.length &&
          !cutsceneActiveRef.current &&
          !transitionRef.current
        ) {
          const scriptResult = runtime.tickScripts(next, now, dt);
          if (scriptResult.state !== next) {
            next = scriptResult.state;
            changed = true;
          }
          if (scriptResult.sayLines.length) {
            queueMicrotask(() => {
              for (const line of scriptResult.sayLines) {
                fireVoiceRef.current(line);
              }
              setSayLines((prevLines) => [
                ...pruneSpeech(prevLines, now),
                ...scriptResult.sayLines,
              ]);
            });
          }
          if (scriptResult.sounds.length) {
            queueMicrotask(() => {
              for (const snd of scriptResult.sounds) {
                if (snd.kind === "music") {
                  onMusic?.(snd.key);
                } else {
                  onSound?.(snd);
                }
              }
            });
            for (const snd of scriptResult.sounds) {
              if (snd.kind === "play") {
                next = runtime.runEvent(
                  {
                    type: "soundPlay",
                    key: snd.key,
                    channel: snd.channel,
                  },
                  next
                );
                changed = true;
              } else if (snd.kind === "stop") {
                next = runtime.runEvent(
                  {
                    type: "soundStop",
                    key: snd.key,
                    channel: snd.channel,
                  },
                  next
                );
                changed = true;
              } else if (snd.kind === "music") {
                next = runtime.runEvent(
                  { type: "musicChange", key: snd.key },
                  next
                );
                changed = true;
              }
            }
          }
          for (const id of scriptResult.finished) {
            next = runtime.runEvent({ type: "scriptEnd", scriptId: id }, next);
            changed = true;
          }
        }

        const room = runtime.getRoom(next.currentLocation);
        // Timed room triggers — accumulate dwell unless cutscene/transition
        if (room?.timers?.length) {
          if (dwell.roomId !== room.id) {
            dwell.roomId = room.id;
            dwell.ms = 0;
            dwell.fired = new Set();
          }
          if (!cutsceneActiveRef.current && !transitionRef.current) {
            dwell.ms += dt;
            const timerHit = checkRoomTimers(
              room,
              next,
              dwell.ms,
              dwell.fired
            );
            const {
              message: timerMessage,
              sounds: timerSounds,
              haptics: timerHaptics,
              juices: timerJuices,
              cutsceneId: timerCutsceneId,
              firedIds: _firedIds,
              ...timerPatch
            } = timerHit;
            if (Object.keys(timerPatch).length) {
              next = applyStatePatch(next, timerPatch);
              changed = true;
            }
            if (
              timerMessage ||
              timerSounds?.length ||
              timerHaptics?.length ||
              timerJuices?.length ||
              timerCutsceneId
            ) {
              queueMicrotask(() => {
                if (timerMessage) showMessageRef.current(timerMessage);
                for (const key of timerSounds ?? []) {
                  onSound?.({ kind: "play", key });
                }
                for (const style of timerHaptics ?? []) {
                  onHaptic?.(style);
                }
                for (const cue of timerJuices ?? []) {
                  playJuice?.(cue);
                }
                if (timerCutsceneId) {
                  startNamedCutscene?.(timerCutsceneId);
                }
              });
            }
          }
        } else if (dwell.roomId !== (room?.id ?? "")) {
          dwell.roomId = room?.id ?? "";
          dwell.ms = 0;
          dwell.fired = new Set();
        }

        const roomSize = runtime.getRoomSize(room);
        let cam = next.camera;
        if (cam.ease) {
          cam = runtime.stepCameraEase(cam, dt);
        }
        cam = runtime.updateFollowCamera(cam, next.actors, roomSize);
        if (
          cam.x !== next.camera.x ||
          cam.y !== next.camera.y ||
          cam.zoom !== next.camera.zoom ||
          cam.ease !== next.camera.ease ||
          cam.followActorId !== next.camera.followActorId
        ) {
          next = applyStatePatch(next, { camera: cam });
          changed = true;
        }

        return changed ? next : prev;
      });

      setSayLines((prev) => {
        const filtered = pruneSpeech(prev, now);
        if (filtered.length === prev.length) return prev;
        // Clear talk anim for expired speakers
        const expired = prev.filter((l) => l.until <= now && l.actorId);
        if (expired.length) {
          setGameState((gs) => {
            let next = gs;
            for (const line of expired) {
              if (!line.actorId) continue;
              if (next.actors[line.actorId]?.animState === "talk") {
                next = applyStatePatch(
                  next,
                  setActorAnimState(next, line.actorId, "idle")
                );
              }
            }
            return next;
          });
        }
        return filtered;
      });

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [
    runtime,
    applySentenceResult,
    onSound,
    onMusic,
    onHaptic,
    playJuice,
    startNamedCutscene,
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
  ]);
}
