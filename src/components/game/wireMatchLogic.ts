/**
 * Pure helpers for the wire-match minigame (unit-testable).
 */

export interface WirePair {
  left: string;
  right: string;
}

/** Fisher–Yates shuffle (pure given rng). */
export function shuffleIds(
  ids: readonly string[],
  rng: () => number = Math.random
): string[] {
  const out = [...ids];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i]!;
    out[i] = out[j]!;
    out[j] = tmp;
  }
  return out;
}

/** Build left→right lookup from pair list. */
export function wirePairMap(
  pairs: readonly WirePair[]
): Record<string, string> {
  const map: Record<string, string> = Object.create(null);
  for (const p of pairs) {
    if (p.left && p.right) map[p.left] = p.right;
  }
  return map;
}

/** True when left id is wired to the given right id. */
export function isWireMatch(
  leftId: string,
  rightId: string,
  pairs: Record<string, string>
): boolean {
  return pairs[leftId] === rightId;
}

/** True when every left terminal has been matched. */
export function wireMatchComplete(
  matchedLeft: ReadonlySet<string>,
  leftIds: readonly string[]
): boolean {
  if (!leftIds.length) return false;
  return leftIds.every((id) => matchedLeft.has(id));
}
