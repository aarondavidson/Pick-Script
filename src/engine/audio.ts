/**
 * Pack audio map — music keys are pack-defined, not room-id substrings.
 * The host resolves keys → MusicTheme presets or looping file beds.
 */

import { isSafeMediaUrl } from "./security";

export type MusicMood = "dark" | "calm" | "tense" | "upbeat" | "eerie";

/** Serializable theme hint; host maps presets → full synth params. */
export interface MusicThemeRef {
  /** Built-in preset id: calm | eerie | underground | upbeat | neutral | noir | ambient */
  preset: string;
  mood?: MusicMood;
}

/** Looping file bed (MP3/OGG/WAV URL or Vite import). */
export interface MusicFileBed {
  src: string;
  /** Default true for room beds */
  loop?: boolean;
  /** 0–1 relative to music volume (default 1) */
  gain?: number;
  /** Optional synth preset while loading / if decode fails */
  fallbackPreset?: string;
}

export type MusicCueRef = string | MusicThemeRef | MusicFileBed;

export interface PackAudio {
  /** Named music cues used by Room.music / music opcodes */
  music?: Record<string, MusicCueRef>;
  /** When a room omits `music`, use this key (then room id as last resort) */
  defaultMusic?: string;
  /** Ambient SFX cue per music key (rain | crowd | drip | wind | hum | static | none) */
  ambient?: Record<string, string>;
  /** Optional voice key → asset URL (host may ignore until VO ships) */
  voice?: Record<string, string>;
  /** Optional SFX key → asset URL */
  sfx?: Record<string, string>;
}

export function isMusicFileBed(v: unknown): v is MusicFileBed {
  return (
    !!v &&
    typeof v === "object" &&
    typeof (v as MusicFileBed).src === "string" &&
    !!(v as MusicFileBed).src.trim()
  );
}

/**
 * True when a music map string is a media URL (not a synth preset name).
 * Returns boolean, not `v is string`: a false result must still leave
 * preset names ("noir") typed as strings for the synth branch.
 */
export function isMusicUrlString(v: unknown): boolean {
  if (typeof v !== "string" || !v.trim()) return false;
  const s = v.trim();
  if (s.startsWith("/") || s.startsWith("data:") || s.includes("://")) {
    return isSafeMediaUrl(s);
  }
  return false;
}

export type ResolvedMusicCue =
  | {
      kind: "file";
      src: string;
      loop: boolean;
      gain: number;
      fallbackPreset?: string;
    }
  | { kind: "synth"; preset: string; mood?: MusicMood };

/** Resolve a music key through the pack map to a file bed or synth preset. */
export function resolveMusicCue(
  musicKey: string,
  audio?: PackAudio
): ResolvedMusicCue {
  const mapped = audio?.music?.[musicKey];
  if (isMusicFileBed(mapped)) {
    const src = mapped.src.trim();
    if (!isSafeMediaUrl(src)) {
      return {
        kind: "synth",
        preset: mapped.fallbackPreset?.trim() || "ambient",
      };
    }
    return {
      kind: "file",
      src,
      loop: mapped.loop !== false,
      gain: Math.max(0, Math.min(1, mapped.gain ?? 1)),
      fallbackPreset: mapped.fallbackPreset,
    };
  }
  if (typeof mapped === "string" && isMusicUrlString(mapped)) {
    return { kind: "file", src: mapped.trim(), loop: true, gain: 1 };
  }
  if (typeof mapped === "string" && mapped.trim()) {
    return { kind: "synth", preset: mapped.trim() };
  }
  if (mapped && typeof mapped === "object" && "preset" in mapped) {
    return {
      kind: "synth",
      preset: mapped.preset,
      mood: mapped.mood,
    };
  }
  // Allow using preset names directly as keys
  return { kind: "synth", preset: musicKey };
}

/** Resolve the music key for a room using pack audio + Room.music. */
export function resolveRoomMusicKey(
  roomId: string,
  roomMusic: string | undefined,
  audio?: PackAudio
): string {
  return roomMusic ?? audio?.defaultMusic ?? roomId;
}

/** Resolve a music key through the pack map to a preset name or theme ref. */
export function resolveMusicThemeRef(
  musicKey: string,
  audio?: PackAudio
): string | MusicThemeRef {
  const cue = resolveMusicCue(musicKey, audio);
  if (cue.kind === "file") {
    return cue.fallbackPreset?.trim() || "ambient";
  }
  return cue.mood
    ? { preset: cue.preset, mood: cue.mood }
    : cue.preset;
}

export function resolveAmbientKey(
  musicKey: string,
  audio?: PackAudio
): string | undefined {
  return audio?.ambient?.[musicKey];
}
