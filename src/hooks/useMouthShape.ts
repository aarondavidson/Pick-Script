import { useEffect, useState } from "react";
import {
  IDLE_MOUTH_SHAPE,
  getMouthShapeAt,
  type SpeechLine,
} from "@/engine/speech";
import { shouldReduceMotion } from "@/engine/juice";

/**
 * Live mouth shape for an active speech line (Rhubarb cues × elapsed ms).
 * Falls back to idle when cues are missing or reduced motion is on.
 */
export function useMouthShape(line: SpeechLine | null | undefined): string {
  const [shape, setShape] = useState(IDLE_MOUTH_SHAPE);

  useEffect(() => {
    if (!line?.mouthCues?.length || shouldReduceMotion()) {
      setShape(IDLE_MOUTH_SHAPE);
      return;
    }
    const cues = line.mouthCues;
    const start = line.startedAt;
    let raf = 0;
    const tick = (now: number) => {
      setShape(getMouthShapeAt(cues, now - start));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [line?.id, line?.mouthCues, line?.startedAt]);

  return shape;
}
