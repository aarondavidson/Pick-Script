import { describe, expect, it } from "vitest";
import {
  DEFAULT_STUCK_ASSIST,
  resolveStuckAssistConfig,
  resolveStuckAssistHotspotId,
  shouldOfferStuckAssist,
} from "./stuckAssist";

describe("stuckAssist", () => {
  it("defaults on when pack has hints", () => {
    expect(resolveStuckAssistConfig(undefined, true).enabled).toBe(true);
    expect(resolveStuckAssistConfig(undefined, false).enabled).toBe(false);
  });

  it("respects false / true / object opts", () => {
    expect(resolveStuckAssistConfig(false, true).enabled).toBe(false);
    expect(resolveStuckAssistConfig(true, false).enabled).toBe(true);
    const c = resolveStuckAssistConfig({ idleMs: 30_000, failedInteracts: 3 }, true);
    expect(c.idleMs).toBe(30_000);
    expect(c.failedInteracts).toBe(3);
  });

  it("offers after idle or failed streak", () => {
    const config = DEFAULT_STUCK_ASSIST;
    const base = {
      config,
      now: 100_000,
      lastActivityAt: 100_000,
      failedStreak: 0,
      dismissedUntil: 0,
      hasActiveHint: true,
    };
    expect(shouldOfferStuckAssist(base)).toBe(false);
    expect(
      shouldOfferStuckAssist({
        ...base,
        lastActivityAt: 100_000 - config.idleMs - 1,
      })
    ).toBe(true);
    expect(
      shouldOfferStuckAssist({
        ...base,
        failedStreak: config.failedInteracts,
      })
    ).toBe(true);
    expect(
      shouldOfferStuckAssist({
        ...base,
        failedStreak: config.failedInteracts,
        dismissedUntil: 200_000,
      })
    ).toBe(false);
    expect(
      shouldOfferStuckAssist({
        ...base,
        failedStreak: config.failedInteracts,
        hasActiveHint: false,
      })
    ).toBe(false);
  });

  it("resolves pulse hotspot from active hint or objective fallback", () => {
    expect(
      resolveStuckAssistHotspotId({
        offering: false,
        hints: [{ exhausted: false, hotspotId: "door" }],
      })
    ).toBeNull();
    expect(
      resolveStuckAssistHotspotId({
        offering: true,
        hints: [
          { exhausted: true, hotspotId: "old" },
          { exhausted: false, hotspotId: "key" },
        ],
      })
    ).toBe("key");
    expect(
      resolveStuckAssistHotspotId({
        offering: true,
        hints: [{ exhausted: false }],
        objectiveHotspotId: "chest",
      })
    ).toBe("chest");
  });
});
