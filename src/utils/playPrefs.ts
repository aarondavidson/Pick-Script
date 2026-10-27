/**
 * Player presentation prefs (captions, text scale) — persisted per browser.
 */

const CAPTIONS_KEY = "adventure-captions";
const TEXT_SCALE_KEY = "adventure-text-scale";

export type TextScale = "sm" | "md" | "lg";

let captionsMemory: boolean | undefined;
let textScaleMemory: TextScale | undefined;

export function getCaptionsEnabled(): boolean {
  if (captionsMemory !== undefined) return captionsMemory;
  if (typeof localStorage === "undefined") return true;
  try {
    const v = localStorage.getItem(CAPTIONS_KEY);
    if (v === "off") return false;
    if (v === "on") return true;
    return true; // default on for accessibility
  } catch {
    return true;
  }
}

export function setCaptionsEnabled(on: boolean): void {
  captionsMemory = on;
  try {
    localStorage.setItem(CAPTIONS_KEY, on ? "on" : "off");
  } catch {
    /* ignore */
  }
}

export function getTextScale(): TextScale {
  if (textScaleMemory) return textScaleMemory;
  if (typeof localStorage === "undefined") return "md";
  try {
    const v = localStorage.getItem(TEXT_SCALE_KEY);
    if (v === "sm" || v === "md" || v === "lg") return v;
    return "md";
  } catch {
    return "md";
  }
}

export function setTextScale(scale: TextScale): void {
  textScaleMemory = scale;
  try {
    localStorage.setItem(TEXT_SCALE_KEY, scale);
  } catch {
    /* ignore */
  }
}

export function textScaleClass(scale: TextScale): string {
  switch (scale) {
    case "sm":
      return "text-[11px] md:text-xs";
    case "lg":
      return "text-sm md:text-base";
    default:
      return "text-xs md:text-sm";
  }
}
