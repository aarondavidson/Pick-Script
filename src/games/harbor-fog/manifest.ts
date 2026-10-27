import { createGameFromJson } from "@/engine/jsonPack";
import { buildHarborFogPack } from "./buildPack";

/** Harbor Fog — short dockside mystery (JSON pack compiled). */
export const harborFogPack = buildHarborFogPack();
/** Intro auto-plays via pack.flagCutscenes.play_intro → "intro". */
export const harborFogGame = createGameFromJson(harborFogPack);
