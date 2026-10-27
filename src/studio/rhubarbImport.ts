import {
  IDLE_MOUTH_SHAPE,
  RHUBARB_MOUTH_SHAPES,
  type MouthCue,
  type RhubarbMouthShape,
} from "@/engine/speech";

/** Max mouth cues stored on a dialogue line / say step. */
export const MAX_MOUTH_CUES = 64;

const SHAPE_SET = new Set<string>(RHUBARB_MOUTH_SHAPES);

export type RhubarbMouthCueInput = {
  t: number;
  /** Canonical Rhubarb field */
  value?: string;
  /** Alias used by some exporters / our pack schema */
  shape?: string;
};

export type RhubarbJson = {
  mouthCues?: RhubarbMouthCueInput[];
};

/**
 * Sanitize a single mouth shape to A–F / X (idle).
 * Unknown / empty → X.
 */
export function sanitizeMouthShape(raw: unknown): RhubarbMouthShape {
  const s = String(raw ?? "")
    .trim()
    .toUpperCase();
  if (SHAPE_SET.has(s)) return s as RhubarbMouthShape;
  return IDLE_MOUTH_SHAPE;
}

/**
 * Parse Rhubarb JSON (`mouthCues` with `value` or `shape`) into engine MouthCue[].
 * Maps `value` → `shape`, clamps length to MAX_MOUTH_CUES, drops invalid rows.
 */
export function parseRhubarbMouthCues(raw: unknown): MouthCue[] {
  let doc: unknown = raw;
  if (typeof raw === "string") {
    try {
      doc = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!doc || typeof doc !== "object") return [];
  const cues = (doc as RhubarbJson).mouthCues;
  if (!Array.isArray(cues)) return [];

  const out: MouthCue[] = [];
  for (const row of cues) {
    if (out.length >= MAX_MOUTH_CUES) break;
    if (!row || typeof row !== "object") continue;
    const t = (row as RhubarbMouthCueInput).t;
    if (typeof t !== "number" || !Number.isFinite(t) || t < 0) continue;
    const value = (row as RhubarbMouthCueInput).value;
    const shape = (row as RhubarbMouthCueInput).shape;
    const shapeRaw = value !== undefined ? value : shape;
    out.push({
      t,
      shape: sanitizeMouthShape(shapeRaw),
    });
  }
  return out;
}
