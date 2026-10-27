import { useCallback, useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { haptics } from "@/utils/haptics";
import { soundFX } from "@/utils/soundEffects";
import type { ModalityPlayerProps } from "./modalityRegistry";
import { advanceSequenceLock } from "./sequenceLockLogic";

const DEFAULT_SEQUENCE = ["a", "b", "c", "d"];

type Phase = "ready" | "playing" | "won";

/**
 * Declarative sequence-lock: press pads in order; wrong press resets.
 */
export function SequenceLockGame({
  isOpen,
  onClose,
  onWin,
  alreadyWon,
  config,
}: ModalityPlayerProps) {
  const sequence = useMemo(() => {
    const raw = config?.sequence;
    if (Array.isArray(raw) && raw.every((x) => typeof x === "string") && raw.length >= 2) {
      return raw as string[];
    }
    return DEFAULT_SEQUENCE;
  }, [config?.sequence]);

  const labels = useMemo(() => {
    const raw = config?.labels;
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      return raw as Record<string, string>;
    }
    return {} as Record<string, string>;
  }, [config?.labels]);

  const pads = useMemo(() => {
    const seen = new Set<string>();
    const order: string[] = [];
    for (const id of sequence) {
      if (!seen.has(id)) {
        seen.add(id);
        order.push(id);
      }
    }
    return order;
  }, [sequence]);

  const [phase, setPhase] = useState<Phase>("ready");
  const [progress, setProgress] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setPhase("ready");
      setProgress(0);
      setFeedback(null);
    }
  }, [isOpen]);

  const start = useCallback(() => {
    setPhase("playing");
    setProgress(0);
    setFeedback(null);
    haptics.medium();
    soundFX.click();
  }, []);

  const press = useCallback(
    (id: string) => {
      if (phase !== "playing") return;
      const result = advanceSequenceLock(sequence, progress, id);
      setProgress(result.progress);
      if (result.won) {
        setPhase("won");
        setFeedback("UNLOCKED");
        haptics.success();
        soundFX.success();
        if (!alreadyWon) onWin();
        return;
      }
      if (result.reset) {
        setFeedback("WRONG — RESET");
        haptics.error();
        soundFX.error();
      } else {
        setFeedback(`${result.progress} / ${sequence.length}`);
        haptics.light();
        soundFX.click();
      }
    },
    [phase, sequence, progress, alreadyWon, onWin]
  );

  const handleClose = () => {
    setPhase("ready");
    setProgress(0);
    setFeedback(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[400px] bg-[#0c0c14] border-2 border-game-border p-4">
        <div className="space-y-4 text-center">
          {phase === "ready" && (
            <div className="space-y-3 py-4">
              <h2 className="pixel-font text-lg text-accent">SEQUENCE LOCK</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Press the pads in the correct order. A wrong press resets the
                sequence.
              </p>
              {alreadyWon && (
                <p className="text-xs text-green-400 pixel-font">
                  Already unlocked
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
              <h2 className="pixel-font text-sm text-accent">ENTER SEQUENCE</h2>
              <p className="pixel-font text-xs text-muted-foreground" aria-live="polite">
                {feedback ?? `0 / ${sequence.length}`}
              </p>
              <div
                className="flex flex-wrap justify-center gap-2"
                role="group"
                aria-label="Lock pads"
              >
                {pads.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => press(id)}
                    className="min-h-[48px] min-w-[64px] px-3 border-2 border-game-border bg-secondary/40 hover:bg-accent/20 pixel-font text-xs text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                    aria-label={labels[id] || id}
                  >
                    {labels[id] || id.toUpperCase()}
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
              <h2 className="pixel-font text-lg text-green-400">UNLOCKED</h2>
              <p className="text-xs text-muted-foreground">
                The sequence matched. Lock disengaged.
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
