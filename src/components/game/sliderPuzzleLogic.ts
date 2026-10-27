/**
 * Pure helpers for the slider-puzzle minigame.
 */

/** Swap segment at `index` with the next slot (wraps). */
export function rotateSegmentAt(order: readonly string[], index: number): string[] {
  if (order.length < 2) return [...order];
  const i = ((index % order.length) + order.length) % order.length;
  const j = (i + 1) % order.length;
  const next = [...order];
  const tmp = next[i]!;
  next[i] = next[j]!;
  next[j] = tmp;
  return next;
}

export function sliderPuzzleMatches(
  order: readonly string[],
  target: readonly string[]
): boolean {
  if (order.length !== target.length) return false;
  return order.every((v, i) => v === target[i]);
}
