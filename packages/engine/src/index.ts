/**
 * @portable-adventure/engine — S.C.R.I.P.T. runtime + play UI.
 *
 * Built from the monorepo sources (`src/engine`, `src/components/game`, …) by
 * `npm run build:package`. Nothing here is hand-maintained API: it re-exports
 * the same modules the Pick-Script app itself runs.
 *
 *   import { PickScriptGame, createGameFromJson } from "@portable-adventure/engine";
 *   import "@portable-adventure/engine/style.css";
 */

import "../../../src/index.css";

// Engine: createGame, createGameFromJson, types, saves, packs, i18n, …
export * from "../../../src/engine";
/** Named S.C.R.I.P.T. pillars (cursor machine, state store, …) */
export * as script from "../../../src/engine/script";

// Play UI
export { PickScriptGame } from "../../../src/components/game/PickScriptGame";
export type { PickScriptGameProps } from "../../../src/components/game/PickScriptGame";
export { AdventurePlaySurface } from "../../../src/components/game/AdventurePlaySurface";
export type {
  AdventurePlaySurfaceProps,
  AdventurePlayVariant,
} from "../../../src/components/game/AdventurePlaySurface";

// Providers, for hosts that compose their own shell around the play surface
export { GameProvider } from "../../../src/contexts/GameContext";
export { MusicProvider, useMusic } from "../../../src/contexts/MusicContext";
export { DebugProvider } from "../../../src/contexts/DebugContext";
export {
  usePlayLayout,
  useViewportPlayLayout,
  PlayLayoutProvider,
  isPhoneLayout,
} from "../../../src/hooks/usePlayLayout";
export type { PlayLayout } from "../../../src/hooks/usePlayLayout";
