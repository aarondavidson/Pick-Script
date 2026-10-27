import { useCallback, useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { haptics } from "@/utils/haptics";
import { soundFX } from "@/utils/soundEffects";
import type { ModalityPlayerProps } from "./modalityRegistry";
import {
  rotateSegmentAt,
  sliderPuzzleMatches,
} from "./sliderPuzzleLogic";

const DEFAULT_ORDER = ["b", "r", "g"];
const DEFAULT_TARGET = ["r", "g", "b"];

type Phase = "ready" | "playing" | "won";

/**
 * Declarative slider puzzle: click segments to swap with the next until
 * the order matches the target pattern.
 */
export function SliderPuzzleGame({
  isOpen,
  onClose,
  onWin,
  alreadyWon,
  config,
}: ModalityPlayerProps) {
  const target = useMemo(() => {
    const raw = config?.target;
    if (Array.isArray(raw) && raw.every((x) => typeof x === "string") && raw.length >= 3) {
      return (raw as string[]).slice(0, 4);
    }
    return DEFAULT_TARGET;
  }, [config?.target]);

  const startOrder = useMemo(() => {
    const raw = config?.order;
    if (Array.isArray(raw) && raw.every((x) => typeof x === "string") && raw.length >= 3) {
      return (raw as string[]).slice(0, target.length);
    }
    return DEFAULT_ORDER.slice(0, target.length);
  }, [config?.order, target.length]);

  const [phase, setPhase] = useState<Phase>("ready");
  const [order, setOrder] = useState<string[]>(startOrder);

  useEffect(() => {
    if (!isOpen) {
      setPhase("ready");
      setOrder(startOrder);
    }
  }, [isOpen, startOrder]);

  const start = useCallback(() => {
    setOrder(startOrder);
    setPhase("playing");
    haptics.medium();
    soundFX.click();
  }, [startOrder]);

  const clickSegment = useCallback(
    (index: number) => {
      if (phase !== "playing") return;
      const next = rotateSegmentAt(order, index);
      setOrder(next);
      haptics.light();
      soundFX.click();
      if (sliderPuzzleMatches(next, target)) {
        setPhase("won");
        haptics.success();
        soundFX.success();
        if (!alreadyWon) onWin();
      }
    },
    [phase, order, target, alreadyWon, onWin]
  );

  const handleClose = () => {
    setPhase("ready");
    setOrder(startOrder);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[400px] bg-[#0c0c14] border-2 border-game-border p-4">
        <div className="space-y-4 text-center">
          {phase === "ready" && (
            <div className="space-y-3 py-4">
              <h2 className="pixel-font text-lg text-accent">SLIDER PANEL</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Tap a segment to swap it with the next until the pattern
                matches the target.
              </p>
              {alreadyWon && (
                <p className="text-xs text-green-400 pixel-font">
                  Already aligned
                </p>
              )}
              <Button
                onClick={start}
                className="pixel-font bg-accent hover:bg-accent/80 text-accent-foreground"
              >
                {alreadyWon ? "TRY AGAIN" : "START"}
              </Button>
            </div>
          )}

          {phase === "playing" && (
            <div className="space-y-3">
              <h2 className="pixel-font text-sm text-accent">ALIGN SEGMENTS</h2>
              <p className="text-[11px] text-muted-foreground pixel-font">
                TARGET: {target.map((t) => t.toUpperCase()).join(" · ")}
              </p>
              <div
                className="flex justify-center gap-2"
                role="group"
                aria-label="Slider segments"
              >
                {order.map((id, i) => (
                  <button
                    key={`${id}-${i}`}
                    type="button"
                    onClick={() => clickSegment(i)}
                    className="min-h-[56px] min-w-[56px] border-2 border-game-border bg-secondary/40 hover:bg-accent/20 pixel-font text-sm text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                    aria-label={`Segment ${i + 1}: ${id}. Click to swap with next.`}
                  >
                    {id.toUpperCase()}
                  </button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClose}
                className="pixel-font text-xs"
              >
                ABORT
              </Button>
            </div>
          )}

          {phase === "won" && (
            <div className="space-y-3 py-4">
              <h2 className="pixel-font text-lg text-green-400">ALIGNED</h2>
              <p className="text-xs text-muted-foreground">
                Panel segments match the target pattern.
              </p>
              <Button onClick={handleClose} className="pixel-font">
                DONE
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
