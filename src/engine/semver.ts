/** Minimal semver helpers for save compatibility (major.minor.patch). */

export function parseSemver(
  version: string
): { major: number; minor: number; patch: number } | null {
  const m = version.trim().match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!m) return null;
  return {
    major: Number(m[1]),
    minor: Number(m[2]),
    patch: Number(m[3]),
  };
}

export function compareSemver(a: string, b: string): number {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  if (!pa || !pb) return a === b ? 0 : a < b ? -1 : 1;
  if (pa.major !== pb.major) return pa.major - pb.major;
  if (pa.minor !== pb.minor) return pa.minor - pb.minor;
  return pa.patch - pb.patch;
}

/** True when major versions differ (breaking content). */
export function isMajorMismatch(a: string, b: string): boolean {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  if (!pa || !pb) return a !== b;
  return pa.major !== pb.major;
}
