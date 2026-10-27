/**
 * Pure helpers for the sequence-lock minigame (unit-testable).
 */

export interface SequenceLockAdvance {
  /** Index into the target sequence after this press */
  progress: number;
  /** True when the full sequence was entered */
  won: boolean;
  /** True when a wrong pad reset progress to 0 */
  reset: boolean;
}

/**
 * Apply one pad press against the target sequence.
 * Correct press advances; wrong press resets to 0.
 */
export function advanceSequenceLock(
  sequence: readonly string[],
  progress: number,
  press: string
): SequenceLockAdvance {
  if (!sequence.length) {
    return { progress: 0, won: false, reset: false };
  }
  const expected = sequence[Math.max(0, Math.min(progress, sequence.length - 1))];
  if (press === expected) {
    const next = progress + 1;
    if (next >= sequence.length) {
      return { progress: next, won: true, reset: false };
    }
    return { progress: next, won: false, reset: false };
  }
  return { progress: 0, won: false, reset: true };
}
