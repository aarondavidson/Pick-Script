import { useCallback, type RefObject } from "react";

export type StagePct = { x: number; y: number };

/**
 * Percent coordinates (0–100) of a pointer event relative to a stage element.
 * Shared by PackStageCanvas, HotspotTool, and HotspotDebugOverlay.
 */
export function pctFromEvent(
  e: { clientX: number; clientY: number },
  el: HTMLElement | null | undefined
): StagePct {
  if (!el) return { x: 0, y: 0 };
  const r = el.getBoundingClientRect();
  return {
    x: Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100)),
    y: Math.max(0, Math.min(100, ((e.clientY - r.top) / r.height) * 100)),
  };
}

/** Stable callback bound to a stage/container ref. */
export function usePctFromEvent(
  stageRef: RefObject<HTMLElement | null>
): (e: { clientX: number; clientY: number }) => StagePct {
  return useCallback(
    (e: { clientX: number; clientY: number }) =>
      pctFromEvent(e, stageRef.current),
    [stageRef]
  );
}
