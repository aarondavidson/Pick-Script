/**
 * Persist Design Coach on/off + dismissed suggestion ids (local only).
 */

import { safeJsonParse, STORAGE_LIMITS } from "@/engine/security";

export const DESIGN_COACH_PREFS_KEY = "studio-design-coach-v1";

export interface DesignCoachPrefs {
  /** Master switch — off hides the coach everywhere */
  enabled: boolean;
  /** When true, only show tips for current inferred phase and earlier */
  phaseFocus: boolean;
  dismissed: string[];
}

const DEFAULTS: DesignCoachPrefs = {
  enabled: true,
  phaseFocus: true,
  dismissed: [],
};

export function loadDesignCoachPrefs(): DesignCoachPrefs {
  try {
    const raw = localStorage.getItem(DESIGN_COACH_PREFS_KEY);
    if (!raw) return { ...DEFAULTS, dismissed: [] };
    const parsed = safeJsonParse<Partial<DesignCoachPrefs>>(raw);
    return {
      enabled: parsed.enabled !== false,
      phaseFocus: parsed.phaseFocus !== false,
      dismissed: Array.isArray(parsed.dismissed)
        ? parsed.dismissed
            .filter((x): x is string => typeof x === "string" && x.length < 120)
            .slice(0, STORAGE_LIMITS.maxDismissedCoachTips)
        : [],
    };
  } catch {
    return { ...DEFAULTS, dismissed: [] };
  }
}

export function saveDesignCoachPrefs(prefs: DesignCoachPrefs): void {
  try {
    localStorage.setItem(DESIGN_COACH_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* quota */
  }
}

export function dismissSuggestion(id: string): DesignCoachPrefs {
  const prefs = loadDesignCoachPrefs();
  if (prefs.dismissed.includes(id)) return prefs;
  const dismissed = [...prefs.dismissed, id].slice(
    -STORAGE_LIMITS.maxDismissedCoachTips
  );
  const next = { ...prefs, dismissed };
  saveDesignCoachPrefs(next);
  return next;
}

export function clearDismissedSuggestions(): DesignCoachPrefs {
  const prefs = loadDesignCoachPrefs();
  const next = { ...prefs, dismissed: [] };
  saveDesignCoachPrefs(next);
  return next;
}

export function setDesignCoachEnabled(enabled: boolean): DesignCoachPrefs {
  const prefs = loadDesignCoachPrefs();
  const next = { ...prefs, enabled };
  saveDesignCoachPrefs(next);
  return next;
}

export function setDesignCoachPhaseFocus(phaseFocus: boolean): DesignCoachPrefs {
  const prefs = loadDesignCoachPrefs();
  const next = { ...prefs, phaseFocus };
  saveDesignCoachPrefs(next);
  return next;
}
