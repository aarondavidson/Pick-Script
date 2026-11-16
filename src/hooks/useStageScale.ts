import { createContext, useContext, useEffect, useState } from "react";
import { stageSpriteScale } from "@/engine/actorArt";

const StageScaleContext = createContext(1);

export const StageScaleProvider = StageScaleContext.Provider;

/** Sprite scale for the current play stage (1 at a 640px-wide stage). */
export function useStageScale(): number {
  return useContext(StageScaleContext);
}

/** Track an element's width and turn it into the stage sprite scale. */
export function useMeasuredStageScale(el: HTMLElement | null): number {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!el) return;
    const update = () => setScale(stageSpriteScale(el.clientWidth));
    update();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", update);
      return () => window.removeEventListener("resize", update);
    }
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);

  return scale;
}
