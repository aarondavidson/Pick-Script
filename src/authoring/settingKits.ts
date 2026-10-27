/**
 * Setting / place kits — atmosphere seeds for diverse point-and-click worlds.
 * Theme-agnostic: space, forest, cyberpunk, Deep South, water, etc.
 * Complements genrePresets (verb tone) with place mood (particles + music).
 */

import type { JsonPackDocument, JsonPackRoom } from "@/engine/jsonPack";
import type { RoomParticles } from "@/engine/types";
import type { MusicPresetId } from "@/authoring/audioPresets";

export type SettingKitId =
  | "space"
  | "adventure"
  | "forest"
  | "city"
  | "office"
  | "cyberpunk"
  | "european-city"
  | "california"
  | "deep-south"
  | "water";

export interface SettingKit {
  id: SettingKitId;
  title: string;
  blurb: string;
  suggestedMusic: MusicPresetId;
  suggestedParticles: RoomParticles | "none";
  /** Optional start-room description flavor if empty */
  roomFlavor?: string;
}

export const SETTING_KITS: SettingKit[] = [
  {
    id: "space",
    title: "Space",
    blurb: "Stations, starfields, airlocks — vast and quiet.",
    suggestedMusic: "ambient",
    suggestedParticles: "stars",
    roomFlavor: "Stars wheel beyond the viewport.",
  },
  {
    id: "adventure",
    title: "Adventure trek",
    blurb: "Roads, ruins, and maps — classic exploration energy.",
    suggestedMusic: "upbeat",
    suggestedParticles: "dust",
    roomFlavor: "The trail continues just out of sight.",
  },
  {
    id: "forest",
    title: "Forest",
    blurb: "Moss, fireflies, and paths that fork.",
    suggestedMusic: "calm",
    suggestedParticles: "fireflies",
    roomFlavor: "Leaves whisper. Something moved between the trunks.",
  },
  {
    id: "city",
    title: "City",
    blurb: "Streets, neon-optional downtown, crowd hum.",
    suggestedMusic: "neutral",
    suggestedParticles: "dust",
    roomFlavor: "Traffic and talk blur into one city sound.",
  },
  {
    id: "office",
    title: "Office",
    blurb: "Cubicles, fluorescent calm, paperwork puzzles.",
    suggestedMusic: "neutral",
    suggestedParticles: "none",
    roomFlavor: "The HVAC hums. Someone left a sticky note.",
  },
  {
    id: "cyberpunk",
    title: "Cyberpunk",
    blurb: "Rain-slick alleys, sparks, underground bass.",
    suggestedMusic: "underground",
    suggestedParticles: "sparks",
    roomFlavor: "Holo-ads flicker. The net smells like ozone.",
  },
  {
    id: "european-city",
    title: "European city",
    blurb: "Plazas, tram bells, café chairs on stone.",
    suggestedMusic: "calm",
    suggestedParticles: "sparkle",
    roomFlavor: "Cobblestones hold the afternoon light.",
  },
  {
    id: "california",
    title: "California",
    blurb: "Sun, palm shade, highway glare — bright west coast.",
    suggestedMusic: "upbeat",
    suggestedParticles: "sparkle",
    roomFlavor: "Heat shimmers off the asphalt.",
  },
  {
    id: "deep-south",
    title: "Deep South",
    blurb: "Porches, humidity, slow afternoons and tall tales.",
    suggestedMusic: "calm",
    suggestedParticles: "dust",
    roomFlavor: "Cicadas argue in the pecan trees.",
  },
  {
    id: "water",
    title: "Water / harbor",
    blurb: "Docks, mist, tide — boats and wet rope.",
    suggestedMusic: "ambient",
    suggestedParticles: "fog",
    roomFlavor: "The water takes the light and keeps it.",
  },
];

export function settingKitById(id: string): SettingKit | undefined {
  return SETTING_KITS.find((k) => k.id === id);
}

/** Overlay setting atmosphere onto start room + music map (does not change verbMode). */
export function applySettingKit(
  doc: JsonPackDocument,
  kitId: SettingKitId
): JsonPackDocument {
  const kit = settingKitById(kitId);
  if (!kit) return doc;

  const startId = doc.startRoom;
  const start = doc.rooms?.[startId];
  if (!start) return doc;

  const nextRoom: JsonPackRoom = { ...start };
  if (kit.suggestedParticles !== "none") {
    nextRoom.particles = kit.suggestedParticles;
  } else {
    delete nextRoom.particles;
  }
  if (!nextRoom.music) nextRoom.music = startId;
  if (
    kit.roomFlavor &&
    (!nextRoom.description || nextRoom.description === "A new room.")
  ) {
    nextRoom.description = kit.roomFlavor;
  }

  const audio = {
    ...doc.audio,
    music: {
      ...(doc.audio?.music ?? {}),
      [startId]: kit.suggestedMusic,
    },
  };

  return {
    ...doc,
    rooms: { ...doc.rooms, [startId]: nextRoom },
    audio,
  };
}
