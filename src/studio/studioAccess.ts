/**
 * Gate Design studio + Author mode so public players cannot edit.
 *
 * Security model (client apps cannot truly hide UI from determined users):
 * - Production builds omit authoring unless `VITE_ENABLE_STUDIO=true`
 * - Prefer editing locally (`npm run dev`) or on a private preview deploy
 * - Optional `VITE_STUDIO_SECRET` adds a passphrase unlock (obscurity, not crypto)
 */

export const STUDIO_UNLOCK_STORAGE_KEY = "studio-authoring-unlocked-v1";

/** In-memory fallback when localStorage is missing (SSR / node tests). */
let memoryUnlock: string | null = null;

/** Test-only overrides (vitest cannot reliably stub import.meta.env). */
let testOverrides: {
  buildEnabled?: boolean;
  secret?: string;
} | null = null;

/** @internal */
export function __setStudioAccessTestOverrides(
  overrides: { buildEnabled?: boolean; secret?: string } | null
): void {
  testOverrides = overrides;
}

/** True when this build may expose authoring tools at all. */
export function isStudioBuildEnabled(): boolean {
  if (testOverrides?.buildEnabled !== undefined) {
    return testOverrides.buildEnabled;
  }
  if (import.meta.env.DEV) return true;
  if (import.meta.env.MODE === "test") return true;
  return import.meta.env.VITE_ENABLE_STUDIO === "true";
}

/** Passphrase from env (empty = no passphrase once build flag is on / DEV). */
export function getStudioSecret(): string {
  if (testOverrides?.secret !== undefined) {
    return testOverrides.secret;
  }
  const s = import.meta.env.VITE_STUDIO_SECRET;
  return typeof s === "string" ? s.trim() : "";
}

function readUnlockToken(): string | null {
  try {
    if (typeof localStorage !== "undefined") {
      return localStorage.getItem(STUDIO_UNLOCK_STORAGE_KEY);
    }
  } catch {
    /* ignore */
  }
  return memoryUnlock;
}

function writeUnlockToken(token: string | null): void {
  memoryUnlock = token;
  try {
    if (typeof localStorage === "undefined") return;
    if (token == null) localStorage.removeItem(STUDIO_UNLOCK_STORAGE_KEY);
    else localStorage.setItem(STUDIO_UNLOCK_STORAGE_KEY, token);
  } catch {
    /* memory still holds token */
  }
}

export function isStudioUnlocked(): boolean {
  if (!isStudioBuildEnabled()) return false;
  const secret = getStudioSecret();
  if (!secret) return true;
  return readUnlockToken() === secret;
}

/** Author mode + studio tools require unlock. */
export function isAuthoringEnabled(): boolean {
  return isStudioUnlocked();
}

function notifyAccessChanged(): void {
  try {
    window.dispatchEvent(new Event("studio-access-changed"));
  } catch {
    /* SSR / tests */
  }
}

/** Timing-safe-ish string compare (client obscurity; still not real auth). */
function secretsEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export function unlockStudio(passphrase: string): boolean {
  if (!isStudioBuildEnabled()) return false;
  const secret = getStudioSecret();
  if (!secret) return true;
  if (!secretsEqual(passphrase, secret)) return false;
  writeUnlockToken(secret);
  notifyAccessChanged();
  return true;
}

export function lockStudio(): void {
  writeUnlockToken(null);
  notifyAccessChanged();
}

/** Consume `?unlock=` once (bookmarkable private link). */
export function tryUnlockFromSearch(search: string): boolean {
  if (!isStudioBuildEnabled()) return false;
  const secret = getStudioSecret();
  if (!secret) return isStudioUnlocked();
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search
  );
  const token = params.get("unlock");
  if (!token) return isStudioUnlocked();
  return unlockStudio(token);
}
