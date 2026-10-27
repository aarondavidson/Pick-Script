import { useEffect, useState } from "react";

/**
 * Cycle through sprite frame URLs at a fixed fps.
 * Returns the active frame URL (or undefined when empty).
 */
export function useFrameCycle(
  frames: string[] | undefined,
  fps = 4
): string | undefined {
  const list = frames?.filter(Boolean) ?? [];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [list.join("|")]);

  useEffect(() => {
    if (list.length <= 1) return;
    const ms = Math.max(40, Math.round(1000 / Math.max(1, fps)));
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % list.length);
    }, ms);
    return () => window.clearInterval(id);
  }, [list.length, fps, list.join("|")]);

  if (!list.length) return undefined;
  return list[Math.min(index, list.length - 1)];
}

/** Map pack animClass names → CSS class on the room plane */
export function sceneAnimClassName(
  animClass: string | undefined
): string {
  if (!animClass?.trim()) return "";
  const key = animClass.trim().toLowerCase();
  switch (key) {
    case "twinkle":
      return "scene-anim-twinkle";
    case "bob":
      return "scene-anim-bob";
    case "sway":
      return "scene-anim-sway";
    case "flicker":
      return "scene-anim-flicker";
    case "pulse":
      return "scene-anim-pulse";
    default:
      // Allow author CSS hooks: only safe token characters
      if (/^[a-z][a-z0-9_-]{0,39}$/i.test(key)) {
        return `scene-anim-${key}`;
      }
      return "";
  }
}
