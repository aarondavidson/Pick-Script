/**
 * Harbor Fog room + item art (imported raster assets).
 * Gameplay / IDs stay in buildPack.ts — swap files here to re-skin.
 */

import docks from "./assets/docks.jpg";
import warehouse from "./assets/warehouse.jpg";
import watchOffice from "./assets/watch-office.jpg";
import pierAlley from "./assets/pier-alley.jpg";
import lighthouse from "./assets/lighthouse.jpg";
import key from "./assets/items/key.jpg";
import coin from "./assets/items/coin.jpg";
import playerSprite from "./assets/actors/player.jpg";
import harborMasterSprite from "./assets/actors/harbor_master.jpg";
import traderSprite from "./assets/actors/trader.jpg";

function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}

/** Tiny transparent glow sprites for window / lantern frame loops. */
function glowFrame(opacity: number, color = "#ffd080"): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <defs>
    <radialGradient id="g" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${color}" stop-opacity="${opacity}"/>
      <stop offset="55%" stop-color="${color}" stop-opacity="${opacity * 0.35}"/>
      <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <circle cx="32" cy="32" r="30" fill="url(#g)"/>
</svg>`;
  return `data:image/svg+xml;base64,${utf8ToBase64(svg)}`;
}

export const harborArt = {
  docks,
  warehouse,
  watchOffice,
  pierAlley,
  lighthouse,
  key,
  coin,
  player: playerSprite,
  harborMaster: harborMasterSprite,
  trader: traderSprite,
  /** 2-frame warm window glow for docks shack */
  windowGlowFrames: [glowFrame(0.55), glowFrame(0.95)] as string[],
  /** 2-frame cooler beacon pulse */
  beaconGlowFrames: [
    glowFrame(0.4, "#e8f0ff"),
    glowFrame(0.85, "#fff8e0"),
  ] as string[],
};
