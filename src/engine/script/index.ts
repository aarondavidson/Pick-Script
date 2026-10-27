/**
 * S.C.R.I.P.T. — Story Creation & Retro Interactive Puzzle Toolkit
 *
 * First-class pillars matching docs/PICK-SCRIPT.md:
 * 1. pixelScale     — framebuffer / crisp scaler
 * 2. walkboxes      — pathfinding & walkmasks (re-export)
 * 3. cursorMachine  — contextual cursor modes
 * 4. stateStore     — flags / vars key-value store
 * 5. save           — slotted JSON saves (re-export)
 */

export {
  DEFAULT_NATIVE_SIZE,
  integerScaleFactor,
  pixelBackgroundStyle,
} from "./pixelScale";
export type {
  NativeFramebufferSize,
  PixelBackgroundStyleOpts,
  PixelCss,
} from "./pixelScale";

export { resolveCursorState } from "./cursorMachine";
export type {
  CursorMode,
  CursorState,
  ResolveCursorArgs,
} from "./cursorMachine";

export {
  getFlag,
  setFlag,
  getVar,
  setVar,
  clearVar,
  snapshotStateStore,
} from "./stateStore";

/** Pathfinding & walkmasks — same API as engine/walkboxes */
export {
  pointInWalkbox,
  isWalkable,
  clampToWalkable,
  findWalkPath,
  hotspotApproachPoint,
  roomHasWalkboxes,
  depthScaleAt,
} from "../walkboxes";

/** Node / slot save system */
export { createSaveAdapter } from "../save";
export type { SaveSlot, SaveAdapter, SaveBackupV1 } from "../save";
