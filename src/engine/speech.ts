/**
 * First-class speech lines (SCUMM sayLine / talkie hooks).
 */

/** Rhubarb-style rest / closed mouth. */
export const IDLE_MOUTH_SHAPE = "X";

/** Canonical Rhubarb mouth shapes (A–F open vowels/cons, X rest). */
export const RHUBARB_MOUTH_SHAPES = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "X",
] as const;

export type RhubarbMouthShape = (typeof RHUBARB_MOUTH_SHAPES)[number];

export interface MouthCue {
  /** Cue start time in seconds from speech start (Rhubarb convention). */
  t: number;
  shape: string;
}

export interface SpeechLine {
  id: string;
  actorId?: string;
  text: string;
  until: number;
  /** performance.now() when the line started (for lip-sync elapsed). */
  startedAt: number;
  portrait?: string;
  voiceKey?: string;
  skippable: boolean;
  /** Script instance waiting on this line (for skip) */
  scriptId?: string;
  /** Optional Rhubarb-style mouth cue timeline. */
  mouthCues?: MouthCue[];
  /** Optional key into an external lip-sync asset map (pass-through). */
  lipSyncKey?: string;
}

/** Estimate on-screen speech duration from text when VO length is unknown. */
export function estimateSpeechMs(text: string, fallbackMs = 2000): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  if (!words) return fallbackMs;
  return Math.max(1200, Math.min(12_000, 450 + words * 360));
}

/**
 * Resolve the active mouth shape for elapsed speech time.
 * Cues use Rhubarb `t` in seconds; missing/empty cues or reduced motion → idle (X).
 */
export function getMouthShapeAt(
  cues: MouthCue[] | undefined | null,
  elapsedMs: number,
  opts?: { reducedMotion?: boolean; idle?: string }
): string {
  const idle = opts?.idle ?? IDLE_MOUTH_SHAPE;
  if (opts?.reducedMotion) return idle;
  if (!cues?.length) return idle;
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) return idle;

  const elapsedSec = elapsedMs / 1000;
  let shape = idle;
  // Prefer sorted scan; tolerate unsorted by tracking max t ≤ elapsed
  let bestT = -Infinity;
  for (const cue of cues) {
    if (!cue || typeof cue.t !== "number" || !Number.isFinite(cue.t)) continue;
    if (cue.t <= elapsedSec && cue.t >= bestT) {
      bestT = cue.t;
      const s = String(cue.shape ?? "").trim().toUpperCase();
      shape = s || idle;
    }
  }
  return shape;
}

/** CSS class for a mouth shape (`mouth-shape-a` … `mouth-shape-x`). */
export function mouthShapeClass(shape: string | undefined | null): string {
  const s = String(shape ?? IDLE_MOUTH_SHAPE)
    .trim()
    .toUpperCase();
  const key = RHUBARB_MOUTH_SHAPES.includes(s as RhubarbMouthShape)
    ? s.toLowerCase()
    : "x";
  return `mouth-shape-${key}`;
}

let speechSeq = 0;

export function createSpeechLine(args: {
  actorId?: string;
  text: string;
  until: number;
  startedAt?: number;
  portrait?: string;
  voiceKey?: string;
  skippable?: boolean;
  scriptId?: string;
  mouthCues?: MouthCue[];
  lipSyncKey?: string;
}): SpeechLine {
  speechSeq += 1;
  const startedAt =
    typeof args.startedAt === "number" && Number.isFinite(args.startedAt)
      ? args.startedAt
      : typeof performance !== "undefined" &&
          typeof performance.now === "function"
        ? performance.now()
        : Date.now();
  return {
    id: `speech-${speechSeq}-${args.until}`,
    actorId: args.actorId,
    text: args.text,
    until: args.until,
    startedAt,
    portrait: args.portrait,
    voiceKey: args.voiceKey,
    skippable: args.skippable !== false,
    scriptId: args.scriptId,
    ...(args.mouthCues ? { mouthCues: args.mouthCues } : {}),
    ...(args.lipSyncKey ? { lipSyncKey: args.lipSyncKey } : {}),
  };
}

export function pruneSpeech(lines: SpeechLine[], now: number): SpeechLine[] {
  return lines.filter((l) => l.until > now);
}

export function activeSpeech(lines: SpeechLine[], now: number): SpeechLine | null {
  const live = pruneSpeech(lines, now);
  return live[live.length - 1] ?? null;
}
