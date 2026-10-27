/**
 * Concurrent script runner (SCUMM startScript / stopScript / breakHere / delay).
 * Command-list VM — presentation host ticks via `tickScripts`.
 */

import type {
  GameState,
  ScriptCommand,
  ScriptDef,
  ScriptInstance,
  StatePatch,
} from "./types";
import { applyStatePatch } from "./state";
import { putActor, setActorAnimState, switchEgo } from "./actors";
import { findWalkPath, getWalkFloor } from "./walkboxes";
import { stepWalk } from "./walk";
import {
  createSpeechLine,
  estimateSpeechMs,
  type SpeechLine,
} from "./speech";
import type { GameDefinition } from "./definition";
import { getRoom } from "./rooms";
import {
  getRoomSize,
  panTo,
  setCameraFollow,
  zoomTo,
} from "./camera";

/** Commands one script may run per frame before it is forced to yield. */
export const MAX_SCRIPT_COMMANDS_PER_TICK = 32;
const warnedRunaway = new Set<string>();

export function resolveScriptCommands(
  def: ScriptDef,
  state: GameState
): ScriptCommand[] {
  return typeof def.commands === "function"
    ? def.commands(state)
    : def.commands;
}

/** Resolve global named script or current room local script (LSCR). */
export function getScriptDef(
  definition: GameDefinition,
  state: GameState,
  scriptId: string
): ScriptDef | null {
  const named = definition.namedScripts?.[scriptId];
  if (named) return named;
  const room = getRoom(definition.rooms, state.currentLocation);
  return room?.localScripts?.[scriptId] ?? null;
}

export type ScriptSoundEvent =
  | { kind: "play"; key: string; channel?: string }
  | { kind: "stop"; key?: string; channel?: string }
  | { kind: "music"; key: string };

export function startScript(
  state: GameState,
  scriptId: string,
  definition: GameDefinition
): { state: GameState; started: boolean } {
  const def = getScriptDef(definition, state, scriptId);
  if (!def) return { state, started: false };

  const existing = state.activeScripts ?? [];
  // Restart if already running
  const filtered = existing.filter((s) => s.id !== scriptId);
  const commands = resolveScriptCommands(def, state);
  const instance: ScriptInstance = {
    id: scriptId,
    index: 0,
    status: "running",
    loop: !!def.loop,
    frozen: false,
  };

  // Empty script finishes immediately
  if (!commands.length) {
    return {
      state: applyStatePatch(state, { activeScripts: filtered }),
      started: true,
    };
  }

  return {
    state: applyStatePatch(state, {
      activeScripts: [...filtered, instance],
    }),
    started: true,
  };
}

export function stopScript(state: GameState, scriptId: string): GameState {
  const active = state.activeScripts ?? [];
  if (!active.some((s) => s.id === scriptId)) return state;
  return applyStatePatch(state, {
    activeScripts: active.filter((s) => s.id !== scriptId),
  });
}

export function stopAllScripts(state: GameState): GameState {
  if (!state.activeScripts?.length) return state;
  return applyStatePatch(state, { activeScripts: [] });
}

export function freezeScripts(state: GameState, frozen: boolean): GameState {
  const active = state.activeScripts ?? [];
  if (!active.length) return state;
  return applyStatePatch(state, {
    activeScripts: active.map((s) => ({ ...s, frozen })),
  });
}

export interface ScriptTickResult {
  state: GameState;
  /** Transient say-lines for UI (not persisted) */
  sayLines: SpeechLine[];
  /** Sound / music opcodes emitted this tick */
  sounds: ScriptSoundEvent[];
  /** Scripts that finished this tick */
  finished: string[];
}

/**
 * Advance all running scripts by one slice.
 * `now` is performance.now() / Date.now(); `dtMs` is frame delta.
 */
export function tickScripts(
  state: GameState,
  definition: GameDefinition,
  now: number,
  dtMs: number
): ScriptTickResult {
  let current = state;
  const sayLines: ScriptTickResult["sayLines"] = [];
  const sounds: ScriptSoundEvent[] = [];
  const finished: string[] = [];
  const active = [...(current.activeScripts ?? [])];

  if (!active.length) {
    return { state: current, sayLines, sounds, finished };
  }

  const nextActive: ScriptInstance[] = [];

  for (const inst of active) {
    if (inst.frozen) {
      nextActive.push(inst);
      continue;
    }

    let script = { ...inst };
    const def = getScriptDef(definition, current, script.id);
    if (!def) {
      finished.push(script.id);
      continue;
    }

    const commands = resolveScriptCommands(def, current);
    let guard = 0;

    while (guard++ < MAX_SCRIPT_COMMANDS_PER_TICK) {
      // Handle wait
      if (script.status === "waiting" && script.waitUntil != null) {
        if (now < script.waitUntil) break;
        script = {
          ...script,
          status: "running",
          waitUntil: undefined,
          index: script.index + 1,
        };
      }

      // Handle walk
      if (script.status === "walking" && script.walk) {
        const walkResult = advanceWalk(current, script, dtMs, definition);
        current = walkResult.state;
        script = walkResult.script;
        if (script.status === "walking") break;
        // walk finished → advance index
        script = {
          ...script,
          status: "running",
          walk: undefined,
          index: script.index + 1,
        };
      }

      if (script.index >= commands.length) {
        if (script.loop) {
          script = { ...script, index: 0, status: "running" };
          continue;
        }
        finished.push(script.id);
        script = { ...script, status: "done" };
        break;
      }

      const cmd = commands[script.index];
      const applied = applyCommand(current, script, cmd, definition, now);
      current = applied.state;
      script = applied.script;
      if (applied.sayLine) sayLines.push(applied.sayLine);
      if (applied.sound) sounds.push(applied.sound);

      if (
        script.status === "waiting" ||
        script.status === "walking" ||
        script.status === "done"
      ) {
        break;
      }

      // breakHere yields one frame
      if (applied.yieldFrame) {
        break;
      }
    }

    if (
      guard > MAX_SCRIPT_COMMANDS_PER_TICK &&
      import.meta.env?.DEV &&
      !warnedRunaway.has(script.id)
    ) {
      // Usually a `loop` script with no wait/breakHere — it eats every frame.
      warnedRunaway.add(script.id);
      console.warn(
        `[adventure:${definition.id}] script "${script.id}" ran ${MAX_SCRIPT_COMMANDS_PER_TICK} commands in one frame without yielding — add a wait or breakHere.`
      );
    }

    if (script.status !== "done") {
      nextActive.push(script);
    }
  }

  current = applyStatePatch(current, { activeScripts: nextActive });
  return { state: current, sayLines, sounds, finished };
}

function advanceWalk(
  state: GameState,
  script: ScriptInstance,
  dtMs: number,
  _definition: GameDefinition
): { state: GameState; script: ScriptInstance } {
  const walk = script.walk;
  if (!walk) return { state, script };

  let nextState = applyStatePatch(
    state,
    setActorAnimState(state, walk.actorId, "walk")
  );
  const result = stepWalk(nextState, walk, dtMs);
  nextState = applyStatePatch(nextState, result.patch);

  if (!result.motion) {
    nextState = applyStatePatch(
      nextState,
      setActorAnimState(nextState, walk.actorId, "idle")
    );
    return {
      state: nextState,
      script: { ...script, status: "running", walk: undefined },
    };
  }

  return {
    state: nextState,
    script: {
      ...script,
      status: "walking",
      walk: result.motion,
    },
  };
}

interface CommandApply {
  state: GameState;
  script: ScriptInstance;
  yieldFrame?: boolean;
  sayLine?: SpeechLine;
  sound?: ScriptSoundEvent;
}

function applyCommand(
  state: GameState,
  script: ScriptInstance,
  cmd: ScriptCommand,
  definition: GameDefinition,
  now: number
): CommandApply {
  switch (cmd.op) {
    case "delay":
      return {
        state,
        script: {
          ...script,
          status: "waiting",
          waitUntil: now + cmd.ms,
        },
      };

    case "breakHere":
      return {
        state,
        script: { ...script, index: script.index + 1 },
        yieldFrame: true,
      };

    case "patch": {
      const patch =
        typeof cmd.patch === "function" ? cmd.patch(state) : cmd.patch;
      return {
        state: applyStatePatch(state, patch ?? {}),
        script: { ...script, index: script.index + 1 },
      };
    }

    case "putActor": {
      const patch = putActor(
        state,
        cmd.actorId,
        cmd.roomId,
        cmd.x,
        cmd.y,
        cmd.facing
      );
      return {
        state: applyStatePatch(state, patch),
        script: { ...script, index: script.index + 1 },
      };
    }

    case "walkActor": {
      const actor = state.actors?.[cmd.actorId];
      if (!actor || actor.roomId == null) {
        return {
          state,
          script: { ...script, index: script.index + 1 },
        };
      }
      const room = getRoom(definition.rooms, actor.roomId);
      const floor = getWalkFloor(state, room);
      const path = findWalkPath(
        { x: actor.x, y: actor.y },
        { x: cmd.x, y: cmd.y },
        room?.walkboxes,
        { floor }
      );
      return {
        state,
        script: {
          ...script,
          status: "walking",
          walk: {
            actorId: cmd.actorId,
            path,
            pathIndex: 0,
            speed: cmd.speed ?? 35,
          },
        },
      };
    }

    case "sayLine": {
      const duration =
        cmd.durationMs ??
        estimateSpeechMs(
          cmd.text,
          definition.defaultSpeechDurationMs ?? 2000
        );
      const until = now + duration;
      let nextState = state;
      if (cmd.actorId) {
        nextState = applyStatePatch(
          nextState,
          setActorAnimState(nextState, cmd.actorId, "talk")
        );
      }
      const portrait =
        cmd.portrait ??
        (cmd.actorId
          ? definition.actors?.[cmd.actorId]?.portrait
          : undefined);
      return {
        state: nextState,
        script: {
          ...script,
          status: "waiting",
          waitUntil: until,
        },
        sayLine: createSpeechLine({
          actorId: cmd.actorId,
          text: cmd.text,
          until,
          portrait,
          voiceKey: cmd.voiceKey,
          skippable: cmd.skippable,
          scriptId: script.id,
          mouthCues: cmd.mouthCues,
          lipSyncKey: cmd.lipSyncKey,
        }),
      };
    }

    case "startScript": {
      const result = startScript(state, cmd.scriptId, definition);
      return {
        state: result.state,
        script: { ...script, index: script.index + 1 },
      };
    }

    case "stopScript":
      return {
        state: stopScript(state, cmd.scriptId),
        script: { ...script, index: script.index + 1 },
      };

    case "freeze":
      return {
        state: freezeScripts(state, cmd.value),
        script: { ...script, index: script.index + 1 },
      };

    case "sound":
      return {
        state: applyStatePatch(
          state,
          // emit as script event patch via host; keep vars breadcrumb
          {
            vars: {
              ...(state.vars ?? {}),
              lastSound: cmd.key,
            },
          }
        ),
        script: { ...script, index: script.index + 1 },
        sound: { kind: "play", key: cmd.key, channel: cmd.channel },
      };

    case "stopSound":
      return {
        state,
        script: { ...script, index: script.index + 1 },
        sound: { kind: "stop", key: cmd.key, channel: cmd.channel },
      };

    case "music":
      return {
        state: applyStatePatch(state, {
          vars: { ...(state.vars ?? {}), music: cmd.key },
        }),
        script: { ...script, index: script.index + 1 },
        sound: { kind: "music", key: cmd.key },
      };

    case "setEgo": {
      const result = switchEgo(state, definition, cmd.actorId);
      if (!result.ok || !result.patch) {
        return {
          state,
          script: { ...script, index: script.index + 1 },
        };
      }
      return {
        state: applyStatePatch(state, result.patch),
        script: { ...script, index: script.index + 1 },
      };
    }

    case "cameraPan": {
      const room = getRoom(definition.rooms, state.currentLocation);
      const roomSize = getRoomSize(room);
      const camera = panTo(
        state.camera,
        cmd.x,
        cmd.y,
        roomSize,
        cmd.durationMs ?? 0
      );
      return {
        state: applyStatePatch(state, { camera }),
        script: { ...script, index: script.index + 1 },
      };
    }

    case "cameraZoom": {
      const room = getRoom(definition.rooms, state.currentLocation);
      const roomSize = getRoomSize(room);
      const camera = zoomTo(
        state.camera,
        cmd.scale,
        roomSize,
        cmd.durationMs ?? 0
      );
      return {
        state: applyStatePatch(state, { camera }),
        script: { ...script, index: script.index + 1 },
      };
    }

    case "cameraFollow": {
      const camera = setCameraFollow(state.camera, cmd.actorId);
      return {
        state: applyStatePatch(state, { camera }),
        script: { ...script, index: script.index + 1 },
      };
    }

    default:
      return {
        state,
        script: { ...script, index: script.index + 1 },
      };
  }
}

/** Start room-entry auto scripts listed on the room or matching id pattern. */
export function autoStartRoomScripts(
  state: GameState,
  definition: GameDefinition,
  roomId: string
): GameState {
  const room = getRoom(definition.rooms, roomId);
  const ids = room?.autoScripts ?? [];
  let current = state;
  for (const id of ids) {
    current = startScript(current, id, definition).state;
  }
  return current;
}

/** Force speech waits to end now (click-to-skip). */
export function skipScriptSpeechWaits(
  state: GameState,
  now: number,
  scriptIds?: string[]
): GameState {
  const active = state.activeScripts ?? [];
  if (!active.length) return state;

  const next = active.map((s) => {
    if (s.status !== "waiting" || s.waitUntil == null) return s;
    if (scriptIds && !scriptIds.includes(s.id)) return s;
    if (s.waitUntil <= now) return s;
    return { ...s, waitUntil: now };
  });

  // Restore talk -> idle for actors that were speaking
  let patched = applyStatePatch(state, { activeScripts: next });
  for (const [id, actor] of Object.entries(patched.actors ?? {})) {
    if (actor.animState === "talk") {
      patched = applyStatePatch(
        patched,
        setActorAnimState(patched, id, "idle")
      );
    }
  }
  return patched;
}
