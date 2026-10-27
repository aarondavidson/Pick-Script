/**
 * Production deploy lock — raise the bar against casual client tampering.
 *
 * Honest model: a determined browser user who patches JS always wins.
 * Strict play makes the common paths (installed pack override, sidecar
 * geometry cheats, fast-travel skip, forged saves, Studio routes) fail closed.
 *
 * Enabled by default when `!import.meta.env.DEV` and Studio is not built-in.
 * Override with `VITE_STRICT_PLAY=true|false`.
 */

let testOverride: boolean | null = null;
let testIntegrityKey: string | null = null;

/** @internal */
export function __setStrictPlayTestOverride(value: boolean | null): void {
  testOverride = value;
}

/** @internal */
export function __setSaveIntegrityKeyTestOverride(value: string | null): void {
  testIntegrityKey = value;
}

function isStudioBuildEnabledLocal(): boolean {
  if (import.meta.env.DEV) return true;
  if (import.meta.env.MODE === "test") return true;
  return import.meta.env.VITE_ENABLE_STUDIO === "true";
}

/**
 * True when the play client should refuse authoring overrides and
 * enforce travel / save / pack integrity guards.
 */
export function isStrictPlayEnabled(): boolean {
  if (testOverride !== null) return testOverride;

  const flag = import.meta.env.VITE_STRICT_PLAY;
  if (flag === "true") return true;
  if (flag === "false") return false;

  // Default: production player builds lock down; DEV / test / studio builds stay open.
  if (import.meta.env.DEV) return false;
  if (import.meta.env.MODE === "test") return false;
  if (isStudioBuildEnabledLocal()) return false;
  return true;
}

/**
 * Optional integrity secret baked into the client build.
 * Not real crypto secrecy (it ships in the bundle) — blocks casual
 * localStorage edits that don't recompute the seal tag.
 */
export function getSaveIntegrityKey(): string {
  if (testIntegrityKey !== null) return testIntegrityKey;
  const s = import.meta.env.VITE_SAVE_INTEGRITY_KEY;
  return typeof s === "string" ? s.trim() : "";
}

export function isSaveSealingEnabled(): boolean {
  return getSaveIntegrityKey().length > 0;
}

/** Lightweight keyed tag (djb2 of secret||payload). Sync-friendly for saves. */
export function sealTag(payload: string, secret: string): string {
  let h = 5381;
  const input = `${secret}\0${payload}`;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) + h) ^ input.charCodeAt(i);
    h |= 0;
  }
  return `seal_${(h >>> 0).toString(16)}`;
}

export function verifySealTag(
  payload: string,
  tag: string,
  secret: string
): boolean {
  if (!secret || typeof tag !== "string" || !tag.startsWith("seal_")) {
    return false;
  }
  return tag === sealTag(payload, secret);
}
