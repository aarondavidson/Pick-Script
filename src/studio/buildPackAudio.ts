import type {
  DraftCustomSfx,
  DraftMusicCue,
} from "@/authoring/audioPresets";
import type { PackAudio } from "@/engine/audio";

/** Build PackAudio from AudioTool cue + custom SFX drafts. */
export function buildPackAudio(
  cues: DraftMusicCue[],
  customSfx: DraftCustomSfx[]
): PackAudio {
  const music: PackAudio["music"] = {};
  const ambient: Record<string, string> = {};
  for (const c of cues) {
    if (c.fileSrc?.trim()) {
      music[c.cue] = {
        src: c.fileSrc.trim(),
        loop: true,
        gain: c.fileGain ?? 1,
        fallbackPreset: c.fallbackPreset || c.preset,
      };
    } else {
      music[c.cue] = c.preset;
    }
    if (c.ambient && c.ambient !== "none") ambient[c.cue] = c.ambient;
  }
  const sfx: Record<string, string> = {};
  for (const s of customSfx) {
    sfx[s.key] = `./assets/sfx/${s.filename}`;
  }
  return {
    defaultMusic: cues[0]?.cue,
    music,
    ambient,
    ...(Object.keys(sfx).length ? { sfx } : {}),
  };
}
