import type { GameDefinition } from "./definition";
import { resolveMapTravelPolicy } from "./mapFog";

/** Which play-header extras are available (toolbar + mobile Menu sheet). */
export type PlayChromeFlags = {
  home: boolean;
  journal: boolean;
  quests: boolean;
  map: boolean;
  achievements: boolean;
  hints: boolean;
};

/**
 * Resolve pack `shell.chrome` hide flags + map policy.
 * Defaults: everything on except Map when the pack disables fast travel.
 */
export function resolvePlayChrome(
  definition: GameDefinition,
  opts?: { showHomeLink?: boolean }
): PlayChromeFlags {
  const c = definition.shell?.chrome;
  const mapEnabled = resolveMapTravelPolicy(definition).enabled;
  return {
    home: !!opts?.showHomeLink && !c?.hideHome,
    journal: !c?.hideJournal,
    quests: !c?.hideQuests,
    map: mapEnabled && !c?.hideMap,
    achievements: !c?.hideAchievements,
    hints: !c?.hideHints,
  };
}
