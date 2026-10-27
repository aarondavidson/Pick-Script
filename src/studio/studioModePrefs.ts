/**
 * Guided vs Advanced studio preference.
 * Guided: Pack-first, kit wizards, hide Copy TS / raw JSON.
 */

export type StudioMode = "guided" | "advanced";

const KEY = "studio-mode-v1";

export function loadStudioMode(): StudioMode {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === "advanced") return "advanced";
  } catch {
    /* ignore */
  }
  return "guided";
}

export function saveStudioMode(mode: StudioMode): StudioMode {
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    /* ignore */
  }
  return mode;
}

export function isGuidedMode(mode: StudioMode = loadStudioMode()): boolean {
  return mode === "guided";
}
