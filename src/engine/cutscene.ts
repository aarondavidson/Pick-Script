/**
 * Cutscene controller primitives (SCUMM cutscene / beginOverride).
 * Presentation layer drives timing; this module is pure state.
 */

import { isSafeIdentifierKey } from "./security";

export interface CutsceneLine {
  /** Spoken / narrated text (empty for wait-only / walk-only beats) */
  text: string;
  subtext?: string;
  /** Display duration hint in ms (UI may ignore if player advances) */
  durationMs?: number;
  speaker?: string;
  /** Play SFX when this line starts */
  sound?: string;
  /** Walk ego (or actor) to room % when this line starts */
  walkTo?: { x: number; y: number; actorId?: string };
  /** Set a flag when this line starts */
  setFlag?: { flag: string; value?: boolean };
  /** Switch pack music cue when this line starts */
  music?: string;
  /**
   * Show floating speech bubble (and optional portrait bar) on an actor.
   * When set without `text`, the overlay stays silent chrome-only.
   */
  sayLine?: {
    text: string;
    actorId?: string;
    durationMs?: number;
    voiceKey?: string;
    /** Optional Rhubarb-style mouth cue timeline (stored for future lip-sync). */
    mouthCues?: { t: number; shape: string }[];
    /** Optional key into an external lip-sync asset map (pass-through). */
    lipSyncKey?: string;
  };
  /** Optional juice cue/preset when this line starts (host plays via playJuice) */
  juice?: import("./juice").JuiceCue | import("./juice").JuicePresetId;
  /** Optional camera beat (pan / zoom / follow) when this line starts */
  camera?: {
    pan?: { x: number; y: number; durationMs?: number };
    zoom?: number;
    zoomDurationMs?: number;
    /** Actor id to follow, or null to clear follow */
    follow?: string | null;
  };
  /**
   * Hold auto-advance until floating speech for this beat finishes.
   * Combine with waitForWalk for parallel walk+say lines.
   */
  waitForSpeech?: boolean;
  /**
   * Hold auto-advance until the cutscene walk finishes.
   * Combine with waitForSpeech when walkTo + sayLine start together.
   */
  waitForWalk?: boolean;
  /** Jump target marker (sanitized identifier) */
  label?: string;
  /** On advance, skip to this label instead of the next line */
  goto?: string;
}

export interface CutsceneDef {
  id: string;
  lines: CutsceneLine[];
  /** Allow ESC / skip button (default true) */
  skippable?: boolean;
  /** Called by host after finish/skip — not stored in engine state */
}

/** Hard stop for a long linear scene (goto loops die much sooner). */
export const MAX_CUTSCENE_ADVANCES = 1024;
/** Same line may be entered this many times (intentional short loops). */
export const MAX_CUTSCENE_LINE_VISITS = 8;
/** Upper bound for wait / beat durations from untrusted JSON. */
export const MAX_CUTSCENE_BEAT_MS = 120_000;

export interface CutsceneRuntime {
  def: CutsceneDef;
  lineIndex: number;
  /** true while cutscene owns input */
  active: boolean;
  /** Successful advances this run — caps runaway timelines. */
  advances?: number;
  /** Times each line index has been entered via advance. */
  visits?: number[];
}

/** Finite beat length, clamped. Non-finite input uses `fallback`. */
export function clampCutsceneDurationMs(raw: unknown, fallback = 0): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(MAX_CUTSCENE_BEAT_MS, n));
}

export function sanitizeCutsceneLabel(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  return isSafeIdentifierKey(trimmed) ? trimmed : undefined;
}

/** Index of the first line with this label, or -1. */
export function findCutsceneLabelIndex(
  def: CutsceneDef,
  label: string
): number {
  const safe = sanitizeCutsceneLabel(label);
  if (!safe) return -1;
  return def.lines.findIndex((l) => l.label === safe);
}

export function startCutscene(def: CutsceneDef): CutsceneRuntime {
  return {
    def,
    lineIndex: 0,
    active: true,
  };
}

/**
 * Advance to the next line, honoring `goto` on the current line.
 * Unknown goto falls through to sequential next.
 */
export function advanceCutscene(
  runtime: CutsceneRuntime
): CutsceneRuntime | null {
  if (!runtime.active) return null;
  const advances = (runtime.advances ?? 0) + 1;
  if (advances > MAX_CUTSCENE_ADVANCES) return null;
  const line = runtime.def.lines[runtime.lineIndex];
  let next = runtime.lineIndex + 1;
  if (line?.goto) {
    const jump = findCutsceneLabelIndex(runtime.def, line.goto);
    if (jump >= 0) next = jump;
  }
  if (next < 0 || next >= runtime.def.lines.length) {
    return null; // finished
  }
  const visits = runtime.visits
    ? runtime.visits.slice()
    : new Array<number>(runtime.def.lines.length).fill(0);
  const seen = (visits[next] ?? 0) + 1;
  // Stops unskippable self-goto / wait loops from locking input forever.
  if (seen > MAX_CUTSCENE_LINE_VISITS) return null;
  visits[next] = seen;
  return { ...runtime, lineIndex: next, advances, visits };
}

export function skipCutscene(
  runtime: CutsceneRuntime
): CutsceneRuntime | null {
  if (runtime.def.skippable === false) return runtime;
  return null;
}

export function currentCutsceneLine(
  runtime: CutsceneRuntime | null
): CutsceneLine | null {
  if (!runtime?.active) return null;
  return runtime.def.lines[runtime.lineIndex] ?? null;
}

export interface CutsceneWaitRequirements {
  waitForSpeech: boolean;
  waitForWalk: boolean;
  durationMs?: number;
}

/** What the host must wait on before auto-advancing this line. */
export function cutsceneLineWaitRequirements(
  line: CutsceneLine | null | undefined
): CutsceneWaitRequirements {
  if (!line) return { waitForSpeech: false, waitForWalk: false };
  return {
    waitForSpeech: !!line.waitForSpeech,
    waitForWalk: !!line.waitForWalk,
    durationMs:
      typeof line.durationMs === "number" &&
      Number.isFinite(line.durationMs) &&
      line.durationMs > 0
        ? Math.min(MAX_CUTSCENE_BEAT_MS, line.durationMs)
        : undefined,
  };
}

/**
 * Whether auto-advance may proceed given host-computed wait state.
 * - durationElapsed: true once durationMs timer (if any) has fired
 * - speechDone: true when !waitForSpeech or speech window finished
 * - walkDone: true when !waitForWalk or walk engaged then finished
 */
export function cutsceneLineReadyToAdvance(
  line: CutsceneLine | null | undefined,
  opts: {
    durationElapsed: boolean;
    speechDone: boolean;
    walkDone: boolean;
  }
): boolean {
  const req = cutsceneLineWaitRequirements(line);
  if (req.durationMs != null && !opts.durationElapsed) return false;
  if (req.waitForSpeech && !opts.speechDone) return false;
  if (req.waitForWalk && !opts.walkDone) return false;
  if (
    req.durationMs == null &&
    !req.waitForSpeech &&
    !req.waitForWalk
  ) {
    return false;
  }
  return true;
}
