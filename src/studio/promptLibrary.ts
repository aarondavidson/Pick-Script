/**
 * Curated pixel-art prompt library for Studio Pixels.
 */

import type { AssetPresetId } from "@/studio/pixelate";

export interface PromptEntry {
  id: string;
  label: string;
  preset: AssetPresetId;
  prompt: string;
}

export const PROMPT_LIBRARY: PromptEntry[] = [
  {
    id: "attic-room",
    label: "Dusty attic",
    preset: "room",
    prompt:
      "cozy dusty attic study interior, desk left, wooden chest right, warm lamp, 16:9 pixel art scene",
  },
  {
    id: "kitchen-room",
    label: "90s kitchen",
    preset: "room",
    prompt:
      "1990s suburban kitchen interior, linoleum floor, fridge right, window daylight, 16:9 pixel art",
  },
  {
    id: "alley-room",
    label: "Rain alley",
    preset: "room",
    prompt:
      "noir rainy alley at night, neon reflection puddles, dumpster left, brick walls, 16:9 pixel art",
  },
  {
    id: "brass-key",
    label: "Brass key",
    preset: "item",
    prompt:
      "brass skeleton key, simple pixel art icon, centered, game inventory item",
  },
  {
    id: "locket",
    label: "Silver locket",
    preset: "item",
    prompt:
      "small silver heart locket, pixel art inventory icon, centered, soft shine",
  },
  {
    id: "note",
    label: "Sticky note",
    preset: "item",
    prompt:
      "yellow sticky note with scribble, pixel art inventory icon, centered",
  },
  {
    id: "hero-portrait",
    label: "Young adventurer",
    preset: "portrait",
    prompt:
      "young adventurer portrait bust, kind face, pixel art, centered",
  },
  {
    id: "npc-shop",
    label: "Shop clerk",
    preset: "character",
    prompt:
      "pixel art shop clerk standing full body, apron, feet at bottom, transparent background",
  },
  {
    id: "comic-lamp",
    label: "Streetlamp panel",
    preset: "comic",
    prompt:
      "comic panel of a detective reading a note under a streetlamp, pixel art",
  },
];

export function promptsForPreset(preset: AssetPresetId): PromptEntry[] {
  return PROMPT_LIBRARY.filter((p) => p.preset === preset);
}
