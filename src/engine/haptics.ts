/**
 * Declarative haptic styles for packs / hotspots / action chains.
 * Host maps styles → Capacitor Haptics (native) or navigator.vibrate (web).
 */

export const HAPTIC_STYLES = [
  "light",
  "medium",
  "heavy",
  "success",
  "warning",
  "error",
  "selection",
] as const;

export type HapticStyle = (typeof HAPTIC_STYLES)[number];

const STYLE_SET = new Set<string>(HAPTIC_STYLES);

export function isHapticStyle(v: unknown): v is HapticStyle {
  return typeof v === "string" && STYLE_SET.has(v);
}

export function sanitizeHapticStyle(v: unknown): HapticStyle | undefined {
  return isHapticStyle(v) ? v : undefined;
}

/**
 * Default haptic when authors assign a built-in / pack SFX key
 * but omit an explicit interactHaptic.
 */
export function hapticForSoundKey(key: string | undefined): HapticStyle | undefined {
  if (!key?.trim()) return undefined;
  switch (key.trim().toLowerCase()) {
    case "pickup":
      return "heavy";
    case "success":
      return "success";
    case "error":
      return "error";
    case "creak":
    case "door":
      return "medium";
    case "verb":
    case "click":
      return "selection";
    default:
      return "light";
  }
}
