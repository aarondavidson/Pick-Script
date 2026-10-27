import { describe, expect, it } from "vitest";
import { advanceSequenceLock } from "./sequenceLockLogic";

describe("advanceSequenceLock", () => {
  const seq = ["a", "b", "c"];

  it("advances on correct presses and wins at the end", () => {
    let progress = 0;
    let r = advanceSequenceLock(seq, progress, "a");
    expect(r).toEqual({ progress: 1, won: false, reset: false });
    progress = r.progress;

    r = advanceSequenceLock(seq, progress, "b");
    expect(r).toEqual({ progress: 2, won: false, reset: false });
    progress = r.progress;

    r = advanceSequenceLock(seq, progress, "c");
    expect(r).toEqual({ progress: 3, won: true, reset: false });
  });

  it("resets on a wrong press", () => {
    const r = advanceSequenceLock(seq, 1, "c");
    expect(r).toEqual({ progress: 0, won: false, reset: true });
  });

  it("handles empty sequence safely", () => {
    expect(advanceSequenceLock([], 0, "a")).toEqual({
      progress: 0,
      won: false,
      reset: false,
    });
  });
});
