/**
 * S.C.R.I.P.T. — Story Creation & Retro Interactive Puzzle Toolkit
 * (Portable SCUMM-inspired adventure engine).
 *
 * Use `createGame(definition)` for a headless runtime, or
 * `<AdventureProvider definition={...}>` for React apps.
 *
 * Named pillars: `import { … } from "@/engine/script"` — see docs/PICK-SCRIPT.md.
 */

export type {
  VerbId,
  GameItem,
  Achievement,
  AchievementDef,
  Quest,
  QuestDef,
  JournalEntry,
  GameState,
  StatePatch,
  StateFn,
  DialogueChoice,
  DialogueNode,
  DialogueTree,
  Hotspot,
  RoomExit,
  Room,
  RoomLayer,
  RoomParticles,
  SceneAnimClass,
  Location,
  Actor,
  ActorInstance,
  ActorFacing,
  ActorFacingDir,
  ActorAnimSheet,
  ActorAnimState,
  CameraState,
  CameraEase,
  Point2D,
  Walkbox,
  RoomRegion,
  RoomTimer,
  RoomSize,
  RoomTransition,
  RoomTransitionKind,
  ScriptCommand,
  ScriptDef,
  ScriptInstance,
  ItemCombination,
  VerbDef,
  ScriptEvent,
  ScriptHook,
  InteractResult,
} from "./types";

export type {
  GameDefinition,
  ShellCompleteProps,
  ShellUiLoader,
} from "./definition";
export { DEFAULT_VERBS } from "./definition";

export { formatCredit, mergeCredits, sanitizeCredits } from "./credits";
export { sanitizeWinFlag, shouldCompleteGame } from "./winFlag";
export type { CreditEntry } from "./credits";

export { resolvePlayChrome } from "./playChrome";
export type { PlayChromeFlags } from "./playChrome";

export { createGame } from "./createGame";
export type { AdventureRuntime } from "./createGame";

export {
  AdventureProvider,
  useAdventure,
  useGame,
} from "./AdventureProvider";
export type {
  AdventureContextValue,
  AdventureProviderProps,
} from "./AdventureProvider";

export { applyStatePatch, createInitialState, resolveText } from "./state";
export {
  hasItem,
  hasFlag,
  hasVisited,
  hasAnyItem,
  hasAllFlags,
  getVar,
} from "./queries";
export {
  addItem,
  removeItem,
  removeItems,
  findCombination,
  tryCombineItems,
} from "./inventory";
export type { CombineResult } from "./inventory";
export {
  getRoom,
  getVisibleHotspots,
  travelTo,
  listExits,
} from "./rooms";
export type { TravelResult } from "./rooms";
export {
  getDialogueNode,
  viewDialogueNode,
  applyDialogueChoice,
  applyDialogueOnView,
} from "./dialogue";
export type { DialogueView, ChoiceResult } from "./dialogue";
export {
  filterDialogueChoices,
  dialogueChoiceTakenPatch,
  dialogueOnceFlag,
  dialogueOnceGameFlag,
  dialogueOffForeverFlag,
  choiceStableId,
} from "./dialogueOptions";
export {
  runPackActions,
  compilePackActionsInteract,
  sanitizePackActions,
} from "./packActions";
export type { PackAction, PackActionRunResult } from "./packActions";
export {
  isSafeMediaUrl,
  isSafePlayMediaUrl,
  safeMediaUrl,
  safePlayMediaUrl,
  cssSafeUrl,
  cssUrlValue,
  cssPlayUrlValue,
  safeCssColor,
  safeJsonParse,
  sanitizeStringRecord,
  isSafeIdentifierKey,
  parsePackActions,
  assertImageFile,
  createImageObjectUrl,
  assertSafePackUrl,
  STORAGE_LIMITS,
} from "./security";
export {
  isStrictPlayEnabled,
  isSaveSealingEnabled,
  getSaveIntegrityKey,
  sealTag,
  verifySealTag,
} from "./deployLock";
export {
  sanitizePlayState,
  collectKnownItemIds,
  canFastTravelTo,
  resolveMapTravelPolicy,
} from "./stateIntegrity";
export {
  getMapRoomStatus,
  isMapRoomRevealed,
  canMapTravelTo,
} from "./mapFog";
export type { MapFogConfig, MapRoomStatus, MapRoomVisibility } from "./mapFog";
export {
  ensureRoomWalkboxes,
  normalizeDefinitionWalkboxes,
} from "./ensureWalkboxes";
export {
  loadPackSidecar,
  savePackSidecar,
  clearPackSidecar,
  upsertSidecarRoom,
  applySidecarToDefinition,
  applySidecarToRoom,
  hotspotsToSidecarOverlays,
  packSidecarStorageKey,
} from "./packSidecar";
export type { PackSidecar, SidecarHotspotOverlay } from "./packSidecar";
export { createSaveAdapter } from "./save";
export type { SaveSlot, SaveAdapter, SaveBackupV1 } from "./save";
export {
  checksumString,
  createDualSaveStore,
  verifyEnvelope,
  wrapPayload,
} from "./saveStorage";
export type { SaveBackend, SaveEnvelope } from "./saveStorage";
export { runScripts, emitAndPatch } from "./scripts";
export { resolveInteraction } from "./interact";
export {
  doSentence,
  formatSentence,
} from "./sentence";
export type { Sentence, DoSentenceArgs } from "./sentence";
export {
  DEFAULT_VERB_RESPONSES,
  getDefaultVerbResponse,
} from "./defaultResponses";
export type { DefaultVerbResponses } from "./defaultResponses";
export {
  getObjectState,
  setObjectState,
  toggleObjectState,
  isObjectState,
} from "./objectState";
export {
  startCutscene,
  advanceCutscene,
  skipCutscene,
  currentCutsceneLine,
  sanitizeCutsceneLabel,
  findCutsceneLabelIndex,
  cutsceneLineWaitRequirements,
  cutsceneLineReadyToAdvance,
} from "./cutscene";
export type {
  CutsceneDef,
  CutsceneLine,
  CutsceneRuntime,
  CutsceneWaitRequirements,
} from "./cutscene";
export { normalizeLoadedState } from "./state";
export {
  createInitialActors,
  getActor,
  getEgo,
  actorsInRoom,
  putActor,
  setActorFacing,
  setActorCostume,
  setActorAnimState,
  resolveActorAnimClass,
  facingToward,
  distance2d,
  getPlayableActors,
  switchEgo,
} from "./actors";
export type { SwitchEgoResult } from "./actors";
export {
  resolveVerbs,
  loadStoredVerbMode,
  storeVerbMode,
  SIMPLE_VERBS,
  COIN_VERBS,
  isVerbMode,
  verbModeIncludes,
} from "./verbs";
export type { VerbMode } from "./verbs";
export {
  listActiveHints,
  revealNextHint,
  untilFlagHint,
} from "./hints";
export type { HintDef, HintStatus } from "./hints";
export {
  validateGameDefinition,
  assertValidGameDefinition,
} from "./validate";
export type { ValidationResult } from "./validate";
export {
  createEmptyJsonPack,
  createGameFromJson,
  parseJsonPack,
  validateJsonPack,
  compileJsonDialogue,
  JSON_PACK_SCHEMA_VERSION,
  JSON_PACK_PLACEHOLDER_IMAGE,
} from "./jsonPack";
export {
  diagnosePack,
  formatPackDoctorReport,
  isMissingOrPlaceholderArt,
  missingArtPlaceholderDataUrl,
} from "./packDoctor";
export type {
  PackDoctorFinding,
  PackDoctorReport,
  PackDoctorCategory,
  PackDoctorSeverity,
} from "./packDoctor";
export { analyzeSoftLock } from "./softLock";
export type { SoftLockReport, SoftLockIssue } from "./softLock";
export {
  isBitmapCostume,
  normalizeFacing,
  pickFacingSheet,
  resolveActorCostumeUrl,
} from "./actorArt";
export type { ResolvedActorCostume } from "./actorArt";
export { getCurrentObjective } from "./currentObjective";
export type { CurrentObjective } from "./currentObjective";
export {
  HAPTIC_STYLES,
  isHapticStyle,
  sanitizeHapticStyle,
  hapticForSoundKey,
} from "./haptics";
export type { HapticStyle } from "./haptics";
export {
  JUICE_PRESETS,
  JUICE_SHAKES,
  JUICE_FLASHES,
  JUICE_BURSTS,
  isJuicePresetId,
  sanitizeJuicePreset,
  sanitizeJuiceCue,
  cueFromPreset,
  juiceForSoundKey,
  resolveJuiceCue,
  applyReducedMotion,
  prefersReducedMotion,
  shouldReduceMotion,
  getReduceMotionOverride,
  setReduceMotionOverride,
  shakeTrauma,
} from "./juice";
export type {
  JuicePresetId,
  JuiceCue,
  JuiceShake,
  JuiceFlash,
  JuiceBurst,
} from "./juice";
export {
  DEFAULT_STUCK_ASSIST,
  resolveStuckAssistConfig,
  shouldOfferStuckAssist,
  resolveStuckAssistHotspotId,
} from "./stuckAssist";
export type {
  StuckAssistConfig,
  StuckAssistPackOpt,
} from "./stuckAssist";
export {
  extractPackStrings,
  exportStringsCsv,
  parseStringsCsv,
  mergeLocaleIntoPack,
  ensureDialogueVoiceKeys,
  seedDefaultLocaleCatalog,
  dialogueLineId,
  defaultVoiceKey,
  catalogFromRows,
  stubTranslateText,
  applyTranslateStub,
} from "./lineCatalog";
export type { LineCatalogRow, LineKind } from "./lineCatalog";
export {
  BLEND_LAYERS,
  blendPacks,
  blendPacksMany,
  formatBlendReport,
} from "./blendPacks";
export type {
  BlendLayer,
  BlendConflictPolicy,
  BlendPackOptions,
  BlendPackReport,
} from "./blendPacks";
export { estimateSpeechMs } from "./speech";
export { buildFlagIndex, flagsNeverSet } from "./flagIndex";
export type { FlagIndexEntry, FlagRef } from "./flagIndex";
export {
  buildPuzzleGraph,
  buildPuzzleGraphFromGameDefinition,
  blockedGatePathEdgeIds,
  gatedExitsForSoftLockFlag,
  parseExitNodeId,
  PUZZLE_NODE_KIND_ORDER,
} from "./puzzleGraph";
export type {
  GatedExitRef,
  PuzzleGraph,
  PuzzleGraphNode,
  PuzzleGraphEdge,
  PuzzleGraphOptions,
  PuzzleNodeKind,
  PuzzleEdgeKind,
} from "./puzzleGraph";
export type {
  JsonPackDocument,
  JsonPackRoom,
  JsonPackHotspot,
  JsonPackHotspotKind,
  JsonPackLink,
  JsonPackCombination,
  JsonPackUseWithRule,
  JsonPackItem,
  JsonPackDialogue,
} from "./jsonPack";
export {
  linkValidationResult,
  studioTabHref,
  recipeHref,
  recipesGalleryHref,
} from "./validationHelp";
export type {
  ValidationIssue,
  LinkedValidationResult,
  StudioTabId,
  StudioTabHrefOpts,
} from "./validationHelp";
export { exit, linkRooms, oppositeDirection } from "./exits";
export type { ExitDirection, LinkRoomsOptions } from "./exits";
export { resolveSpecialDef } from "./specials";
export type {
  PackModality,
  SpecialActionDef,
  SpecialActionResult,
  SpecialActionContext,
  ModalityWinResult,
  ComicDef,
  ComicPage,
} from "./specials";
export {
  resolveRoomMusicKey,
  resolveMusicThemeRef,
  resolveAmbientKey,
  resolveMusicCue,
  isMusicFileBed,
  isMusicUrlString,
} from "./audio";
export type {
  PackAudio,
  MusicThemeRef,
  MusicMood,
  MusicFileBed,
  MusicCueRef,
  ResolvedMusicCue,
} from "./audio";
export {
  msg,
  translate,
  resolveLocString,
  getCatalog,
  listLocales,
  loadStoredLocale,
  storeLocale,
} from "./i18n";
export type { LocaleId, MessageCatalog, I18nConfig } from "./i18n";
export { compareSemver, isMajorMismatch, parseSemver } from "./semver";
export type { LocString } from "./types";
export {
  pointInWalkbox,
  pointInPolygon,
  isWalkable,
  clampToWalkable,
  findWalkPath,
  hotspotApproachPoint,
  roomHasWalkboxes,
  depthScaleAt,
  aabbFromPoints,
  clampWalkFloor,
  getWalkFloor,
  walkboxesForFloor,
  portalMidpoint,
  floorTransitionPatchAt,
  MAX_WALK_FLOOR,
  MAX_WALKBOXES_PER_ROOM,
  MAX_POLYGON_POINTS,
} from "./walkboxes";
export type { FindWalkPathOptions } from "./walkboxes";
export {
  pointInRegion,
  checkRegionEntries,
  regionSeenFlag,
} from "./regions";
export type { RegionEntryResult } from "./regions";
export {
  checkRoomTimers,
  timerSeenFlag,
  sanitizeRoomTimers,
} from "./roomTimers";
export type { RoomTimerResult } from "./roomTimers";
export {
  startScript,
  stopScript,
  stopAllScripts,
  freezeScripts,
  tickScripts,
  autoStartRoomScripts,
  skipScriptSpeechWaits,
} from "./scriptRunner";
export type { ScriptTickResult } from "./scriptRunner";
export {
  getRoomSize,
  followCamera,
  cameraToTranslate,
  updateFollowCamera,
  createInitialCamera,
  panTo,
  zoomTo,
  setCameraFollow,
  stepCameraEase,
  easeLinear,
  easeInOut,
  easePoint,
  clampZoom,
  DEFAULT_ROOM_SIZE,
  DEFAULT_CAMERA_ZOOM,
} from "./camera";
export { stepWalk } from "./walk";
export type { WalkMotion, WalkStepResult } from "./walk";
export {
  createSpeechLine,
  pruneSpeech,
  activeSpeech,
  getMouthShapeAt,
  mouthShapeClass,
  IDLE_MOUTH_SHAPE,
  RHUBARB_MOUTH_SHAPES,
} from "./speech";
export type { SpeechLine, MouthCue, RhubarbMouthShape } from "./speech";
export {
  resolveTransitionOut,
  resolveTransitionIn,
  beginTransitionOut,
} from "./transitions";
export type { TransitionPhase, TransitionRuntime } from "./transitions";
export {
  exportRoomResource,
  formatRoomExport,
  formatHotspotCoordSnippet,
} from "./roomExport";
export type {
  RoomResourceExport,
  ExportedObject,
  HotspotOverrideLike,
} from "./roomExport";
export { getScriptDef } from "./scriptRunner";
export type { ScriptSoundEvent } from "./scriptRunner";

/**
 * S.C.R.I.P.T. pillars (pixel scale, cursor, state store, walkmasks, saves).
 * Prefer `import { … } from "@/engine/script"` — top-level re-exports omit
 * getVar/setVar (those names already mean actor vars in queries.ts).
 */
export * as script from "./script";
export {
  DEFAULT_NATIVE_SIZE,
  integerScaleFactor,
  pixelBackgroundStyle,
  resolveCursorState,
  snapshotStateStore,
} from "./script";
export type {
  NativeFramebufferSize,
  PixelBackgroundStyleOpts,
  PixelCss,
  CursorMode,
  CursorState,
  ResolveCursorArgs,
} from "./script";
