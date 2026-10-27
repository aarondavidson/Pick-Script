/**
 * Genre / tone presets for New Game Wizard.
 * Verb chrome + light atmosphere hints — packs stay theme-agnostic.
 * Mysteries, comedies, sunny adventures, and minimalists all share the same engine.
 */

import type { JsonPackDocument, JsonPackRoom } from "@/engine/jsonPack";
import type { RoomParticles } from "@/engine/types";
import type { MusicPresetId } from "@/authoring/audioPresets";

export type GenrePresetId =
  | "mobile-mystery"
  | "desktop-comedy"
  | "sunny-adventure"
  | "minimal";

/** High-level tone for launcher copy / studio coaching (not a visual lock). */
export type GenreTone =
  | "mystery"
  | "comedy"
  | "bright"
  | "neutral";

export interface GenrePreset {
  id: GenrePresetId;
  title: string;
  blurb: string;
  tone: GenreTone;
  verbMode: NonNullable<JsonPackDocument["verbMode"]>;
  /** Suggested synth bed for the start room (author can change). */
  suggestedMusic?: MusicPresetId;
  /** Suggested particle bed when the start room has none. */
  suggestedParticles?: RoomParticles;
  /** Hint for authors — not a hard lock */
  notes: string;
}

export const GENRE_PRESETS: GenrePreset[] = [
  {
    id: "mobile-mystery",
    title: "Mobile mystery",
    blurb: "Coin verbs — foggy docks, locked doors, short phone sessions.",
    tone: "mystery",
    verbMode: "coin",
    suggestedMusic: "noir",
    suggestedParticles: "fog",
    notes: "Prefer coin UI + progressive hints + clear objective flags.",
  },
  {
    id: "desktop-comedy",
    title: "Desktop comedy",
    blurb: "Classic 7-verb bar — slapstick looks, denser Look/Use/Talk jokes.",
    tone: "comedy",
    verbMode: "classic",
    suggestedMusic: "upbeat",
    suggestedParticles: "sparkle",
    notes: "Write distinct Look vs Use lines; classic bar on desktop. Keep juice light.",
  },
  {
    id: "sunny-adventure",
    title: "Sunny adventure",
    blurb: "Light-hearted coin UI — bright towns, friendly NPCs, sparkle beds.",
    tone: "bright",
    verbMode: "coin",
    suggestedMusic: "calm",
    suggestedParticles: "sparkle",
    notes: "Not every pack is noir. Use calm/upbeat music and sparkle/fireflies particles.",
  },
  {
    id: "minimal",
    title: "Minimal",
    blurb: "Simple Look / Use only — fewest chrome decisions; tone is yours.",
    tone: "neutral",
    verbMode: "simple",
    suggestedMusic: "neutral",
    notes: "Keep interactions to Look + Use; Talk via character hotspots.",
  },
];

export function genrePresetById(id: string): GenrePreset | undefined {
  return GENRE_PRESETS.find((p) => p.id === id);
}

/**
 * Apply genre verb mode + light start-room atmosphere hints.
 * Never forces a dark look — comedy / sunny presets seed bright beds.
 */
export function applyGenrePreset(
  doc: JsonPackDocument,
  presetId: GenrePresetId
): JsonPackDocument {
  const preset = genrePresetById(presetId);
  if (!preset) return doc;

  let rooms = doc.rooms;
  const startId = doc.startRoom;
  const start = rooms?.[startId];
  if (start && (preset.suggestedParticles || preset.suggestedMusic)) {
    const nextRoom: JsonPackRoom = { ...start };
    if (preset.suggestedParticles && !nextRoom.particles) {
      nextRoom.particles = preset.suggestedParticles;
    }
    if (preset.suggestedMusic && !nextRoom.music) {
      nextRoom.music = startId;
    }
    rooms = { ...rooms, [startId]: nextRoom };
  }

  let audio = doc.audio;
  if (
    preset.suggestedMusic &&
    startId &&
    !(doc.audio?.music && doc.audio.music[startId])
  ) {
    audio = {
      ...doc.audio,
      music: {
        ...(doc.audio?.music ?? {}),
        [startId]: preset.suggestedMusic,
      },
    };
  }

  const subtitle =
    doc.subtitle?.trim() ||
    (preset.tone === "comedy"
      ? "A light-hearted point-and-click"
      : preset.tone === "bright"
        ? "A sunny point-and-click adventure"
        : preset.tone === "mystery"
          ? "A short mystery adventure"
          : doc.subtitle);

  return {
    ...doc,
    verbMode: preset.verbMode,
    ...(subtitle ? { subtitle } : {}),
    ...(rooms ? { rooms } : {}),
    ...(audio ? { audio } : {}),
  };
}
