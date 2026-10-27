/**
 * Stuck-player assist — idle / failed-interact thresholds for progressive hints.
 * Presentation (banner) lives in the shell; this module owns pure policy.
 */

export interface StuckAssistConfig {
  enabled: boolean;
  /** Idle ms before offering a hint (default 75s) */
  idleMs: number;
  /** Consecutive blocked / failed interacts before offer (default 4) */
  failedInteracts: number;
  /** Cooldown after dismiss before re-prompting (default 5 min) */
  dismissCooldownMs: number;
}

export const DEFAULT_STUCK_ASSIST: StuckAssistConfig = {
  enabled: true,
  idleMs: 75_000,
  failedInteracts: 4,
  dismissCooldownMs: 5 * 60_000,
};

export type StuckAssistPackOpt =
  | boolean
  | {
      enabled?: boolean;
      idleMs?: number;
      failedInteracts?: number;
      dismissCooldownMs?: number;
    };

export function resolveStuckAssistConfig(
  opt: StuckAssistPackOpt | undefined,
  /** When pack has no hints, assist is off unless explicitly enabled */
  hasHints: boolean
): StuckAssistConfig {
  if (opt === false) {
    return { ...DEFAULT_STUCK_ASSIST, enabled: false };
  }
  if (opt === true) {
    return { ...DEFAULT_STUCK_ASSIST, enabled: true };
  }
  if (opt && typeof opt === "object") {
    return {
      enabled: opt.enabled ?? hasHints,
      idleMs:
        typeof opt.idleMs === "number" && Number.isFinite(opt.idleMs)
          ? Math.max(15_000, Math.min(600_000, opt.idleMs))
          : DEFAULT_STUCK_ASSIST.idleMs,
      failedInteracts:
        typeof opt.failedInteracts === "number" &&
        Number.isFinite(opt.failedInteracts)
          ? Math.max(2, Math.min(20, Math.floor(opt.failedInteracts)))
          : DEFAULT_STUCK_ASSIST.failedInteracts,
      dismissCooldownMs:
        typeof opt.dismissCooldownMs === "number" &&
        Number.isFinite(opt.dismissCooldownMs)
          ? Math.max(30_000, Math.min(3_600_000, opt.dismissCooldownMs))
          : DEFAULT_STUCK_ASSIST.dismissCooldownMs,
    };
  }
  return { ...DEFAULT_STUCK_ASSIST, enabled: hasHints };
}

export function shouldOfferStuckAssist(opts: {
  config: StuckAssistConfig;
  now: number;
  lastActivityAt: number;
  failedStreak: number;
  dismissedUntil: number;
  hasActiveHint: boolean;
}): boolean {
  if (!opts.config.enabled || !opts.hasActiveHint) return false;
  if (opts.now < opts.dismissedUntil) return false;
  if (opts.failedStreak >= opts.config.failedInteracts) return true;
  if (opts.now - opts.lastActivityAt >= opts.config.idleMs) return true;
  return false;
}

/**
 * Optional hotspot to pulse while stuck assist is offered.
 * Prefers the first non-exhausted hint with a hotspotId; falls back to an
 * explicit objective hotspot id when provided by the host.
 */
export function resolveStuckAssistHotspotId(opts: {
  offering: boolean;
  hints?: { exhausted: boolean; hotspotId?: string }[];
  objectiveHotspotId?: string | null;
}): string | null {
  if (!opts.offering) return null;
  const fromHint = opts.hints?.find(
    (h) => !h.exhausted && typeof h.hotspotId === "string" && h.hotspotId.trim()
  )?.hotspotId;
  if (fromHint?.trim()) return fromHint.trim();
  const fromObj = opts.objectiveHotspotId?.trim();
  return fromObj || null;
}
