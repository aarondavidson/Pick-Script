export interface MusicTheme {
  name: string;
  baseNote: number; // MIDI-style base note frequency
  scale: number[]; // frequency ratios for scale degrees
  tempo: number; // BPM-like pulse rate
  filterFreq: number;
  reverbMix: number;
  density: number; // 0-1, how many layers are active
  mood: 'dark' | 'calm' | 'tense' | 'upbeat' | 'eerie';
}

// Frequency helpers
const NOTE_FREQS = {
  C2: 65.41, D2: 73.42, E2: 82.41, F2: 87.31, G2: 98.00, A2: 110.0, B2: 123.47,
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.0, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.0, B4: 493.88,
};

// Minor scale intervals (semitone ratios)
const MINOR_SCALE = [1, 1.0595, 1.1225, 1.1892, 1.2599, 1.3348, 1.4142, 1.4983];
const DORIAN_SCALE = [1, 1.0595, 1.1225, 1.1892, 1.2599, 1.3348, 1.4142, 1.4983];
const PHRYGIAN_SCALE = [1, 1.0293, 1.1225, 1.1892, 1.2599, 1.2968, 1.4142, 1.4983];

/** Named synth presets — packs reference these via `audio.music` / Room.music */
export const MUSIC_PRESETS: Record<string, MusicTheme> = {
  eerie: {
    name: "eerie",
    baseNote: NOTE_FREQS.C2,
    scale: PHRYGIAN_SCALE,
    tempo: 0.4,
    filterFreq: 500,
    reverbMix: 0.7,
    density: 0.6,
    mood: "eerie",
  },
  underground: {
    name: "underground",
    baseNote: NOTE_FREQS.D2,
    scale: PHRYGIAN_SCALE,
    tempo: 0.3,
    filterFreq: 400,
    reverbMix: 0.8,
    density: 0.5,
    mood: "dark",
  },
  upbeat: {
    name: "upbeat",
    baseNote: NOTE_FREQS.A2,
    scale: DORIAN_SCALE,
    tempo: 0.8,
    filterFreq: 1400,
    reverbMix: 0.4,
    density: 0.8,
    mood: "upbeat",
  },
  calm: {
    name: "calm",
    baseNote: NOTE_FREQS.G2,
    scale: MINOR_SCALE,
    tempo: 0.5,
    filterFreq: 900,
    reverbMix: 0.5,
    density: 0.4,
    mood: "calm",
  },
  neutral: {
    name: "neutral",
    baseNote: NOTE_FREQS.E2,
    scale: MINOR_SCALE,
    tempo: 0.55,
    filterFreq: 800,
    reverbMix: 0.5,
    density: 0.5,
    mood: "tense",
  },
  noir: {
    name: "noir",
    baseNote: NOTE_FREQS.D2,
    scale: MINOR_SCALE,
    tempo: 0.45,
    filterFreq: 600,
    reverbMix: 0.6,
    density: 0.55,
    mood: "dark",
  },
  ambient: {
    name: "ambient",
    baseNote: NOTE_FREQS.A2,
    scale: MINOR_SCALE,
    tempo: 0.5,
    filterFreq: 1000,
    reverbMix: 0.5,
    density: 0.5,
    mood: "calm",
  },
};

export function getThemeByPreset(preset: string): MusicTheme {
  return MUSIC_PRESETS[preset] ?? MUSIC_PRESETS.ambient;
}

/**
 * Resolve a pack music key (or preset name) to a MusicTheme.
 * Prefer this over getThemeForLocation.
 * File beds (`{ src }` / URL strings) fall back to ambient (or fallbackPreset).
 */
export function resolveMusicTheme(
  musicKey: string,
  packMap?: Record<
    string,
    string | { preset: string } | { src: string; fallbackPreset?: string }
  >
): MusicTheme {
  const mapped = packMap?.[musicKey];
  if (typeof mapped === "string") {
    if (
      mapped.startsWith("/") ||
      mapped.startsWith("data:") ||
      mapped.includes("://")
    ) {
      return MUSIC_PRESETS.ambient;
    }
    return getThemeByPreset(mapped);
  }
  if (mapped && typeof mapped === "object") {
    if ("src" in mapped && typeof mapped.src === "string") {
      return getThemeByPreset(mapped.fallbackPreset || "ambient");
    }
    if ("preset" in mapped) {
      return getThemeByPreset(mapped.preset);
    }
  }
  if (MUSIC_PRESETS[musicKey]) return MUSIC_PRESETS[musicKey];
  return MUSIC_PRESETS.ambient;
}

/**
 * @deprecated Prefer pack `audio.music` + Room.music via resolveMusicTheme.
 * Kept for ambient SFX location heuristics and legacy callers.
 */
export const getThemeForLocation = (location: string): MusicTheme => {
  if (location.includes("warehouse")) return MUSIC_PRESETS.eerie;
  if (location.includes("sewer")) return MUSIC_PRESETS.underground;
  if (location.includes("concert") || location.includes("venue")) {
    return MUSIC_PRESETS.upbeat;
  }
  if (
    location.includes("bedroom") ||
    location.includes("kitchen") ||
    location.includes("hallway") ||
    location.includes("garage") ||
    location.includes("frontyard")
  ) {
    return MUSIC_PRESETS.calm;
  }
  if (
    location.includes("school") ||
    location.includes("library") ||
    location.includes("cafeteria") ||
    location.includes("computerlab")
  ) {
    return MUSIC_PRESETS.neutral;
  }
  if (location.includes("alley") || location.includes("night")) {
    return MUSIC_PRESETS.noir;
  }
  return MUSIC_PRESETS.ambient;
};
