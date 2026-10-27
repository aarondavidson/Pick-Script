/**
 * Event juice — shake / flash / particle burst cues for interactions.
 * Ambient room particles do NOT count; juice answers a player event.
 * Host honors prefers-reduced-motion (and optional player override).
 *
 * Theme-agnostic: same presets work for slapstick comedy, sunny adventure,
 * or noir mystery — packs choose intensity; nothing here assumes a dark game.
 */

export const JUICE_PRESETS = [
  "light",
  "medium",
  "heavy",
  "success",
  "pickup",
  "error",
] as const;

export type JuicePresetId = (typeof JUICE_PRESETS)[number];

export const JUICE_SHAKES = ["none", "light", "medium", "heavy"] as const;
export type JuiceShake = (typeof JUICE_SHAKES)[number];

export const JUICE_FLASHES = ["none", "white", "warm", "cool"] as const;
export type JuiceFlash = (typeof JUICE_FLASHES)[number];

export const JUICE_BURSTS = [
  "none",
  "spark",
  "dust",
  "stars",
  "pickup",
] as const;
export type JuiceBurst = (typeof JUICE_BURSTS)[number];

export interface JuiceCue {
  shake: JuiceShake;
  flash: JuiceFlash;
  burst: JuiceBurst;
  /** Brief sim hitch in ms (capped); 0 = none */
  hitStopMs: number;
}

const PRESET_SET = new Set<string>(JUICE_PRESETS);
const SHAKE_SET = new Set<string>(JUICE_SHAKES);
const FLASH_SET = new Set<string>(JUICE_FLASHES);
const BURST_SET = new Set<string>(JUICE_BURSTS);

const PRESET_CUES: Record<JuicePresetId, JuiceCue> = {
  light: { shake: "light", flash: "none", burst: "dust", hitStopMs: 0 },
  medium: { shake: "medium", flash: "white", burst: "spark", hitStopMs: 0 },
  heavy: { shake: "heavy", flash: "warm", burst: "spark", hitStopMs: 40 },
  success: { shake: "light", flash: "warm", burst: "stars", hitStopMs: 0 },
  pickup: { shake: "light", flash: "none", burst: "pickup", hitStopMs: 0 },
  error: { shake: "medium", flash: "cool", burst: "none", hitStopMs: 0 },
};

export function isJuicePresetId(v: unknown): v is JuicePresetId {
  return typeof v === "string" && PRESET_SET.has(v);
}

export function sanitizeJuicePreset(v: unknown): JuicePresetId | undefined {
  return isJuicePresetId(v) ? v : undefined;
}

export function cueFromPreset(id: JuicePresetId): JuiceCue {
  return { ...PRESET_CUES[id] };
}

/** Partial cue from pack JSON / action ops — fills defaults. */
export function sanitizeJuiceCue(raw: unknown): JuiceCue | undefined {
  if (raw == null) return undefined;
  if (typeof raw === "string") {
    return isJuicePresetId(raw) ? cueFromPreset(raw) : undefined;
  }
  if (typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  if (isJuicePresetId(o.preset)) {
    const base = cueFromPreset(o.preset);
    return mergeCue(base, o);
  }
  const shake = SHAKE_SET.has(String(o.shake))
    ? (o.shake as JuiceShake)
    : "none";
  const flash = FLASH_SET.has(String(o.flash))
    ? (o.flash as JuiceFlash)
    : "none";
  const burst = BURST_SET.has(String(o.burst))
    ? (o.burst as JuiceBurst)
    : "none";
  let hitStopMs = 0;
  if (typeof o.hitStopMs === "number" && Number.isFinite(o.hitStopMs)) {
    hitStopMs = Math.max(0, Math.min(120, Math.floor(o.hitStopMs)));
  }
  if (shake === "none" && flash === "none" && burst === "none" && !hitStopMs) {
    return undefined;
  }
  return { shake, flash, burst, hitStopMs };
}

function mergeCue(base: JuiceCue, o: Record<string, unknown>): JuiceCue {
  return {
    shake: SHAKE_SET.has(String(o.shake)) ? (o.shake as JuiceShake) : base.shake,
    flash: FLASH_SET.has(String(o.flash)) ? (o.flash as JuiceFlash) : base.flash,
    burst: BURST_SET.has(String(o.burst)) ? (o.burst as JuiceBurst) : base.burst,
    hitStopMs:
      typeof o.hitStopMs === "number" && Number.isFinite(o.hitStopMs)
        ? Math.max(0, Math.min(120, Math.floor(o.hitStopMs)))
        : base.hitStopMs,
  };
}

/**
 * Default juice when authors assign a built-in SFX key but omit interactJuice.
 */
export function juiceForSoundKey(
  key: string | undefined
): JuicePresetId | undefined {
  if (!key?.trim()) return undefined;
  switch (key.trim().toLowerCase()) {
    case "pickup":
      return "pickup";
    case "success":
      return "success";
    case "error":
      return "error";
    case "creak":
    case "door":
      return "medium";
    case "verb":
    case "click":
      return "light";
    default:
      return "light";
  }
}

const REDUCE_MOTION_KEY = "adventure-reduce-motion";

/** In-memory override (tests + before localStorage hydrate) */
let reduceMotionMemory: boolean | null | undefined = undefined;

/** OS preference */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/** Player Settings override: "on" | "off" | null (follow OS) */
export function getReduceMotionOverride(): boolean | null {
  if (reduceMotionMemory !== undefined) return reduceMotionMemory;
  if (typeof localStorage === "undefined") return null;
  try {
    const v = localStorage.getItem(REDUCE_MOTION_KEY);
    if (v === "on") return true;
    if (v === "off") return false;
    return null;
  } catch {
    return null;
  }
}

export function setReduceMotionOverride(value: boolean | null): void {
  reduceMotionMemory = value;
  if (typeof localStorage === "undefined") return;
  try {
    if (value === null) localStorage.removeItem(REDUCE_MOTION_KEY);
    else localStorage.setItem(REDUCE_MOTION_KEY, value ? "on" : "off");
  } catch {
    /* ignore quota */
  }
}

export function shouldReduceMotion(): boolean {
  const override = getReduceMotionOverride();
  if (override !== null) return override;
  return prefersReducedMotion();
}

/** Strip shake / burst / hit-stop when reduced motion is on; keep a soft flash. */
export function applyReducedMotion(cue: JuiceCue): JuiceCue {
  if (!shouldReduceMotion()) return cue;
  return {
    shake: "none",
    flash: cue.flash === "none" ? "white" : cue.flash,
    burst: "none",
    hitStopMs: 0,
  };
}

export function resolveJuiceCue(
  presetOrCue: JuicePresetId | JuiceCue | undefined
): JuiceCue | undefined {
  if (!presetOrCue) return undefined;
  if (typeof presetOrCue === "string") {
    return isJuicePresetId(presetOrCue)
      ? applyReducedMotion(cueFromPreset(presetOrCue))
      : undefined;
  }
  return applyReducedMotion({ ...presetOrCue });
}

/** Trauma 0–1 for shake intensity (quadratic falloff in the overlay). */
export function shakeTrauma(shake: JuiceShake): number {
  switch (shake) {
    case "light":
      return 0.18;
    case "medium":
      return 0.35;
    case "heavy":
      return 0.55;
    default:
      return 0;
  }
}
