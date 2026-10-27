/**
 * Catalog of built-in music / ambient / SFX keys for the studio Audio tool.
 */

export const MUSIC_PRESET_IDS = [
  "calm",
  "noir",
  "eerie",
  "underground",
  "upbeat",
  "neutral",
  "ambient",
] as const;

export type MusicPresetId = (typeof MUSIC_PRESET_IDS)[number];

export const MUSIC_PRESET_HINTS: Record<MusicPresetId, string> = {
  calm: "Soft, warm — homes, sunny plazas, safe rooms",
  noir: "Moody — attic, night streets (optional; not required)",
  eerie: "Unsettling — warehouses, ruins",
  underground: "Deep / damp — sewers",
  upbeat: "Energetic / playful — comedy, shops, concerts",
  neutral: "Mid tension — schools, offices",
  ambient: "Generic bed — any tone",
};

export const AMBIENT_IDS = [
  "none",
  "hum",
  "rain",
  "wind",
  "drip",
  "crowd",
  "static",
] as const;

export type AmbientId = (typeof AMBIENT_IDS)[number];

/** Built-in one-shot keys (soundFX.playKey / PackAudio.sfx) */
export const BUILTIN_SFX_KEYS = [
  { key: "click", hint: "Generic interact / UI" },
  { key: "pickup", hint: "Inventory gain (auto on item get)" },
  { key: "success", hint: "Puzzle win / achievement" },
  { key: "error", hint: "Blocked action" },
  { key: "creak", hint: "Floorboard / old wood" },
  { key: "door", hint: "Door open" },
  { key: "verb", hint: "Verb select" },
] as const;

export interface DraftMusicCue {
  cue: string;
  /** Synth preset when not using a file bed */
  preset: MusicPresetId;
  ambient: AmbientId;
  /** Optional looping file bed URL (/audio/… or data:) — overrides preset at play */
  fileSrc?: string;
  /** Relative gain 0–1 for file beds */
  fileGain?: number;
  /** Synth preset if file decode fails */
  fallbackPreset?: MusicPresetId;
}

export interface DraftRoomMusic {
  roomId: string;
  musicCue: string;
}

export interface DraftSfxBinding {
  /** Hotspot id (or label for designer) */
  hotspotId: string;
  /** interact = verb on hotspot; useWith = inventory on hotspot */
  when: "interact" | "useWith";
  soundKey: string;
}

export interface DraftCustomSfx {
  key: string;
  /** Suggested filename under assets/sfx/ */
  filename: string;
}
