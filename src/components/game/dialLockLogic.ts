/**
 * Pure helpers for the dial-lock minigame (unit-testable).
 */

/** Advance a dial by one click (wraps within 0..positions-1). */
export function advanceDial(value: number, positions: number): number {
  const n = Math.max(2, Math.floor(positions) || 2);
  const v = ((Math.floor(value) % n) + n) % n;
  return (v + 1) % n;
}

/** True when every dial matches the target combo. */
export function dialLockMatches(
  values: readonly number[],
  target: readonly number[]
): boolean {
  if (!values.length || values.length !== target.length) return false;
  return values.every((v, i) => v === target[i]);
}

/** Clamp / normalize a dial value into range. */
export function clampDialValue(value: number, positions: number): number {
  const n = Math.max(2, Math.floor(positions) || 2);
  return ((Math.floor(value) % n) + n) % n;
}
