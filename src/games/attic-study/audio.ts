import type { PackAudio } from "@/engine/audio";
import keyPickupSfx from "./assets/sfx/key-pickup.mp3";
import chestOpenSfx from "./assets/sfx/chest-open.mp3";

/**
 * Pack audio map for Attic Study.
 * - music / ambient → procedural synth presets (MusicContext)
 * - sfx → MP3 URLs played by GameProvider when keys match
 */
export const atticStudyAudio: PackAudio = {
  defaultMusic: "attic",
  music: {
    attic: "noir",
  },
  ambient: {
    attic: "hum",
  },
  sfx: {
    /** Host plays this on inventory gain */
    pickup: keyPickupSfx,
    /** Host plays this on achievement unlock */
    success: chestOpenSfx,
    /** Also usable from script `{ op: "sound", key: "creak" }` via built-in fallback */
  },
};
