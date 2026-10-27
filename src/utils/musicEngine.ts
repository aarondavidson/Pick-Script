// Barrel: ambient music / SFX split across focused modules.
// Existing imports from `@/utils/musicEngine` keep working.

export type { MusicTheme } from "./musicPresets";
export {
  MUSIC_PRESETS,
  getThemeByPreset,
  resolveMusicTheme,
  getThemeForLocation,
} from "./musicPresets";

export type { AmbientSFXType } from "./ambientSfxEngine";
export {
  getAmbientSFXForLocation,
  AmbientSFXEngine,
} from "./ambientSfxEngine";

export { AmbientMusicEngine } from "./ambientMusicEngine";
