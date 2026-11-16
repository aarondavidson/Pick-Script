/**
 * Engine release version + compatibility helpers.
 *
 * `ENGINE_VERSION` follows semver and must match the root `package.json`
 * (enforced by `version.test.ts` and `npm run check:release`). Games that
 * vendor `src/engine` can read it to tell which engine copy they ship.
 *
 * See docs/RELEASING.md (maintainers) and docs/UPGRADING.md (game authors).
 */

import { compareSemver, parseSemver } from "./semver";

export const ENGINE_VERSION = "0.2.0";

export interface EngineCompatibility {
  ok: boolean;
  /** Human-readable problem when `ok` is false */
  reason?: string;
}

/**
 * Check a pack's `minEngineVersion` against an engine version.
 * A pack is compatible when the engine is at least the requested version.
 * Omitted / empty requirement is always compatible.
 */
export function checkEngineCompatibility(
  minEngineVersion: string | undefined | null,
  engineVersion: string = ENGINE_VERSION
): EngineCompatibility {
  if (minEngineVersion == null) return { ok: true };
  if (typeof minEngineVersion !== "string" || !parseSemver(minEngineVersion)) {
    return {
      ok: false,
      reason: `minEngineVersion "${String(minEngineVersion)}" is not a semver (expected e.g. "0.2.0")`,
    };
  }
  if (compareSemver(engineVersion, minEngineVersion) < 0) {
    return {
      ok: false,
      reason: `needs engine ${minEngineVersion.trim()} or newer, but this is engine ${engineVersion} — update the engine (docs/UPGRADING.md)`,
    };
  }
  return { ok: true };
}
