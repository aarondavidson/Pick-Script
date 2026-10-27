/**
 * Serializable JSON pack document → GameDefinition.
 * Studio drafts and exported .pack.json use this shape so authors
 * can hand off a playable pack without hunting asset file paths
 * (images travel as data URLs inside the document).
 *
 * Split into types / compile / validate modules; this file re-exports
 * the public API for existing `@/engine/jsonPack` imports.
 */

export { JSON_PACK_SCHEMA_VERSION } from "./jsonPackTypes";
export type {
  JsonPackHotspotKind,
  JsonPackUseWithRule,
  JsonPackHotspot,
  JsonPackItem,
  JsonPackDialogueChoice,
  JsonPackDialogue,
  JsonPackWalkbox,
  JsonPackRegion,
  JsonPackRoomTimer,
  JsonPackRoom,
  JsonPackCutsceneStep,
  JsonPackCutscene,
  JsonPackHint,
  JsonPackLink,
  JsonPackCombination,
  JsonPackAchievement,
  JsonPackQuest,
  JsonPackActor,
  JsonPackDocument,
  JsonPackSpecialKind,
  JsonPackSpecial,
  JsonPackComicPage,
  JsonPackComic,
} from "./jsonPackTypes";

export {
  createEmptyJsonPack,
  parseJsonPack,
  JSON_PACK_PLACEHOLDER_IMAGE,
} from "./jsonPackCompile";

export { createGameFromJson } from "./jsonPackCreateGame";
export { compileHotspot } from "./jsonPackHotspot";

export { compileJsonDialogue } from "./jsonPackDialogue";
export {
  compilePackCutscenes,
  compilePackHints,
} from "./jsonPackCutscenes";

export {
  ALLOWED_MINIGAME_IDS,
  DEFAULT_MINIGAME_WIN_FLAGS,
  sanitizeJsonPackSpecial,
  sanitizeMinigameConfig,
  resolveMinigameWinFlag,
  compilePackSpecials,
  compilePackComics,
} from "./jsonPackSpecials";

export { validateJsonPack } from "./jsonPackValidate";
