import type { GameDefinition } from "./definition";
import { createInitialState, applyStatePatch } from "./state";
import { resolveVerbs } from "./verbs";
import {
  assertValidGameDefinition,
  validateGameDefinition,
} from "./validate";
import { normalizeDefinitionWalkboxes } from "./ensureWalkboxes";
import { resolveSpecialDef } from "./specials";
import {
  getCatalog,
  loadStoredLocale,
  storeLocale,
  translate,
} from "./i18n";
import { tryCombineItems } from "./inventory";
import { getRoom, travelTo, getVisibleHotspots } from "./rooms";
import { resolveInteraction } from "./interact";
import { doSentence, formatSentence, type Sentence } from "./sentence";
import { createSaveAdapter, type SaveAdapter } from "./save";
import { isStrictPlayEnabled } from "./deployLock";
import { sanitizePlayState } from "./stateIntegrity";
import { emitAndPatch, runScripts } from "./scripts";
import {
  getObjectState,
  setObjectState,
  toggleObjectState,
} from "./objectState";
import {
  actorsInRoom,
  getActor,
  getEgo,
  getPlayableActors,
  putActor,
  resolveActorAnimClass,
  setActorAnimState,
  setActorCostume,
  setActorFacing,
  switchEgo,
} from "./actors";
import { listActiveHints, revealNextHint } from "./hints";
import {
  autoStartRoomScripts,
  getScriptDef,
  skipScriptSpeechWaits,
  startScript,
  stopAllScripts,
  stopScript,
  tickScripts,
} from "./scriptRunner";
import {
  exportRoomResource,
  formatHotspotCoordSnippet,
  formatRoomExport,
} from "./roomExport";
import {
  cameraToTranslate,
  followCamera,
  getRoomSize,
  panTo,
  setCameraFollow,
  stepCameraEase,
  updateFollowCamera,
  zoomTo,
} from "./camera";
import {
  depthScaleAt,
  findWalkPath,
  hotspotApproachPoint,
  roomHasWalkboxes,
} from "./walkboxes";
import {
  resolveTransitionIn,
  resolveTransitionOut,
} from "./transitions";
import type {
  Actor,
  GameItem,
  GameState,
  Hotspot,
  InteractResult,
  RoomExit,
  ScriptEvent,
  StatePatch,
  VerbId,
} from "./types";

export interface AdventureRuntime {
  definition: GameDefinition;
  verbs: ReturnType<typeof getVerbs>;
  save: SaveAdapter;
  createInitialState: () => GameState;
  applyPatch: (state: GameState, patch: StatePatch) => GameState;
  getRoom: (roomId: string) => ReturnType<typeof getRoom>;
  getVisibleHotspots: (roomId: string, state: GameState) => Hotspot[];
  travel: (state: GameState, exit: RoomExit) => ReturnType<typeof travelTo>;
  interact: (
    hotspot: Hotspot,
    verb: VerbId,
    state: GameState
  ) => InteractResult;
  doSentence: (
    hotspot: Hotspot,
    verb: VerbId,
    state: GameState,
    withItem?: GameItem | null
  ) => InteractResult;
  formatSentence: (sentence: Sentence) => string;
  getObjectState: typeof getObjectState;
  setObjectState: typeof setObjectState;
  toggleObjectState: typeof toggleObjectState;
  combine: (
    state: GameState,
    item1: GameItem,
    item2: GameItem
  ) => ReturnType<typeof tryCombineItems>;
  runEvent: (event: ScriptEvent, state: GameState) => GameState;
  eventPatch: (event: ScriptEvent, state: GameState) => StatePatch;
  getCutscene: (
    id: string
  ) => NonNullable<GameDefinition["cutscenes"]>[string] | null;
  getActorDef: (id: string) => Actor | null;
  getActor: typeof getActor;
  getEgo: typeof getEgo;
  actorsInRoom: typeof actorsInRoom;
  putActor: typeof putActor;
  setActorFacing: typeof setActorFacing;
  setActorCostume: typeof setActorCostume;
  setActorAnimState: typeof setActorAnimState;
  resolveActorAnimClass: typeof resolveActorAnimClass;
  depthScaleAt: typeof depthScaleAt;
  skipScriptSpeechWaits: typeof skipScriptSpeechWaits;
  getScriptDef: (
    state: GameState,
    scriptId: string
  ) => ReturnType<typeof getScriptDef>;
  exportRoom: (
    roomId: string,
    overrides?: Parameters<typeof exportRoomResource>[1]
  ) => ReturnType<typeof exportRoomResource> | null;
  formatRoomExport: typeof formatRoomExport;
  formatHotspotCoordSnippet: typeof formatHotspotCoordSnippet;
  resolveTransitionOut: (
    fromRoom: Parameters<typeof resolveTransitionOut>[1],
    exit?: Parameters<typeof resolveTransitionOut>[2]
  ) => ReturnType<typeof resolveTransitionOut>;
  resolveTransitionIn: (
    toRoom: Parameters<typeof resolveTransitionIn>[1],
    exit?: Parameters<typeof resolveTransitionIn>[2]
  ) => ReturnType<typeof resolveTransitionIn>;
  startScript: (
    state: GameState,
    scriptId: string
  ) => ReturnType<typeof startScript>;
  stopScript: typeof stopScript;
  stopAllScripts: typeof stopAllScripts;
  tickScripts: (
    state: GameState,
    now: number,
    dtMs: number
  ) => ReturnType<typeof tickScripts>;
  findWalkPath: typeof findWalkPath;
  hotspotApproachPoint: typeof hotspotApproachPoint;
  roomHasWalkboxes: typeof roomHasWalkboxes;
  getRoomSize: typeof getRoomSize;
  followCamera: typeof followCamera;
  updateFollowCamera: typeof updateFollowCamera;
  cameraToTranslate: typeof cameraToTranslate;
  panTo: typeof panTo;
  zoomTo: typeof zoomTo;
  setCameraFollow: typeof setCameraFollow;
  stepCameraEase: typeof stepCameraEase;
  getPlayableActors: (state: GameState) => string[];
  switchEgo: (
    state: GameState,
    actorId: string
  ) => ReturnType<typeof switchEgo>;
  listActiveHints: (state: GameState) => ReturnType<typeof listActiveHints>;
  revealNextHint: (
    state: GameState,
    hintId: string
  ) => ReturnType<typeof revealNextHint>;
  resolveVerbs: typeof resolveVerbs;
  resolveSpecial: (
    hotspot: Hotspot
  ) => ReturnType<typeof resolveSpecialDef>;
  validate: () => ReturnType<typeof validateGameDefinition>;
  getLocale: () => string;
  setLocale: (locale: string) => void;
  t: (key: string, fallback?: string) => string;
}

function getVerbs(def: GameDefinition) {
  return resolveVerbs(def);
}

/**
 * Bind a GameDefinition into a portable runtime API.
 * Presentation layers (React, canvas, etc.) consume this — not raw data.
 */
/** Freeze pack data in strict play so console mutations of the definition fail. */
function hardenDefinition(def: GameDefinition): GameDefinition {
  if (!isStrictPlayEnabled()) return def;
  for (const room of Object.values(def.rooms)) {
    if (room.hotspots) Object.freeze(room.hotspots);
    if (room.exits) Object.freeze(room.exits);
    Object.freeze(room);
  }
  Object.freeze(def.rooms);
  if (def.combinations) Object.freeze(def.combinations);
  if (def.actors) Object.freeze(def.actors);
  return Object.freeze(def);
}

export function createGame(rawDefinition: GameDefinition): AdventureRuntime {
  assertValidGameDefinition(rawDefinition);
  const definition = hardenDefinition(
    normalizeDefinitionWalkboxes(rawDefinition)
  );

  const save = createSaveAdapter(definition.id, definition.saveSlots ?? 3, {
    contentVersion: definition.version,
    migrateSave: definition.migrateSave,
    legacyKeyPrefix: definition.legacySaveKeyPrefix,
    sanitizeState: (state) =>
      sanitizePlayState(state, definition, {
        strictKnownItems:
          isStrictPlayEnabled() && definition.strictInventory === true,
      }),
  });

  let activeLocale =
    loadStoredLocale(definition.id) ??
    definition.i18n?.defaultLocale ??
    "en";

  return {
    definition,
    verbs: getVerbs(definition),
    save,
    createInitialState: () => createInitialState(definition),
    applyPatch: applyStatePatch,
    getRoom: (roomId) => getRoom(definition.rooms, roomId),
    getVisibleHotspots: (roomId, state) => {
      const room = getRoom(definition.rooms, roomId);
      return room ? getVisibleHotspots(room, state) : [];
    },
    travel: (state, exit) => {
      const from = state.currentLocation;
      const result = travelTo(definition.rooms, state, exit);
      if (result.ok && result.nextState) {
        let next = result.nextState;
        // Stop previous room auto-scripts + local scripts so ambient loops don't leak
        const fromRoom = getRoom(definition.rooms, from);
        for (const id of fromRoom?.autoScripts ?? []) {
          next = stopScript(next, id);
        }
        for (const id of Object.keys(fromRoom?.localScripts ?? {})) {
          next = stopScript(next, id);
        }
        next = runScripts(
          definition.scripts,
          { type: "roomExit", from, to: exit.to },
          next
        );
        next = runScripts(
          definition.scripts,
          { type: "roomEnter", roomId: exit.to },
          next
        );
        next = autoStartRoomScripts(next, definition, exit.to);
        return { ...result, nextState: next };
      }
      return result;
    },
    interact: (hotspot, verb, state) =>
      resolveInteraction(hotspot, verb, state, definition, activeLocale),
    doSentence: (hotspot, verb, state, withItem) =>
      doSentence({
        definition,
        hotspot,
        verb,
        state,
        withItem,
        locale: activeLocale,
      }),
    formatSentence,
    getObjectState,
    setObjectState,
    toggleObjectState,
    combine: (state, item1, item2) =>
      tryCombineItems(definition, state, item1, item2),
    runEvent: (event, state) => runScripts(definition.scripts, event, state),
    eventPatch: (event, state) =>
      emitAndPatch(definition.scripts, event, state),
    getCutscene: (id) => definition.cutscenes?.[id] ?? null,
    getActorDef: (id) => definition.actors?.[id] ?? null,
    getActor,
    getEgo,
    actorsInRoom,
    putActor,
    setActorFacing,
    setActorCostume,
    setActorAnimState,
    resolveActorAnimClass,
    depthScaleAt,
    skipScriptSpeechWaits,
    getScriptDef: (state, scriptId) =>
      getScriptDef(definition, state, scriptId),
    exportRoom: (roomId, overrides) => {
      const room = getRoom(definition.rooms, roomId);
      if (!room) return null;
      return exportRoomResource(room, overrides);
    },
    formatRoomExport,
    formatHotspotCoordSnippet,
    resolveTransitionOut: (fromRoom, exit) =>
      resolveTransitionOut(definition, fromRoom, exit),
    resolveTransitionIn: (toRoom, exit) =>
      resolveTransitionIn(definition, toRoom, exit),
    startScript: (state, scriptId) =>
      startScript(state, scriptId, definition),
    stopScript,
    stopAllScripts,
    tickScripts: (state, now, dtMs) =>
      tickScripts(state, definition, now, dtMs),
    findWalkPath,
    hotspotApproachPoint,
    roomHasWalkboxes,
    getRoomSize,
    followCamera,
    updateFollowCamera,
    cameraToTranslate,
    panTo,
    zoomTo,
    setCameraFollow,
    stepCameraEase,
    getPlayableActors: (state) => getPlayableActors(definition, state),
    switchEgo: (state, actorId) => switchEgo(state, definition, actorId),
    listActiveHints: (state) => listActiveHints(definition, state),
    revealNextHint: (state, hintId) =>
      revealNextHint(definition, state, hintId),
    resolveVerbs,
    resolveSpecial: (hotspot) =>
      resolveSpecialDef(definition.specials, hotspot),
    validate: () => validateGameDefinition(definition),
    getLocale: () => activeLocale,
    setLocale: (locale) => {
      activeLocale = locale;
      storeLocale(definition.id, locale);
    },
    t: (key, fallback) =>
      translate(getCatalog(definition.i18n, activeLocale), key, fallback),
  };
}
