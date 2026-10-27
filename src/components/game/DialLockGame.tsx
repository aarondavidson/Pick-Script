import { useCallback, useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { haptics } from "@/utils/haptics";
import { soundFX } from "@/utils/soundEffects";
import type { ModalityPlayerProps } from "./modalityRegistry";
import {
  advanceDial,
  clampDialValue,
  dialLockMatches,
} from "./dialLockLogic";

const DEFAULT_TARGET = [3, 7, 1];
const DEFAULT_POSITIONS = 10;

type Phase = "ready" | "playing" | "won";

/**
 * Declarative dial-lock: N-position dial(s); match the target combo.
 */
export function DialLockGame({
  isOpen,
  onClose,
  onWin,
  alreadyWon,
  config,
}: ModalityPlayerProps) {
  const positions = useMemo(() => {
    const raw = config?.positions;
    if (typeof raw === "number" && Number.isFinite(raw)) {
      return Math.min(12, Math.max(2, Math.floor(raw)));
    }
    return DEFAULT_POSITIONS;
  }, [config?.positions]);

  const target = useMemo(() => {
    const raw = config?.target;
    if (
      Array.isArray(raw) &&
      raw.length >= 2 &&
      raw.every((x) => typeof x === "number" && Number.isFinite(x))
    ) {
      return (raw as number[])
        .slice(0, 6)
        .map((v) => clampDialValue(v, positions));
    }
    return DEFAULT_TARGET.map((v) => clampDialValue(v, positions));
  }, [config?.target, positions]);

  const startValues = useMemo(
    () => target.map(() => 0),
    [target]
  );

  const [phase, setPhase] = useState<Phase>("ready");
  const [values, setValues] = useState<number[]>(startValues);

  useEffect(() => {
    if (!isOpen) {
      setPhase("ready");
      setValues(startValues);
    }
  }, [isOpen, startValues]);

  const start = useCallback(() => {
    setValues(startValues);
    setPhase("playing");
    haptics.medium();
    soundFX.click();
  }, [startValues]);

  const clickDial = useCallback(
    (index: number) => {
      if (phase !== "playing") return;
      const next = values.map((v, i) =>
        i === index ? advanceDial(v, positions) : v
      );
      setValues(next);
      haptics.light();
      soundFX.click();
      if (dialLockMatches(next, target)) {
        setPhase("won");
        haptics.success();
        soundFX.success();
        if (!alreadyWon) onWin();
      }
    },
    [phase, values, positions, target, alreadyWon, onWin]
  );

  const handleClose = () => {
    setPhase("ready");
    setValues(startValues);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[400px] bg-[#0c0c14] border-2 border-game-border p-4">
        <div className="space-y-4 text-center">
          {phase === "ready" && (
            <div className="space-y-3 py-4">
              <h2 className="pixel-font text-lg text-accent">DIAL LOCK</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Turn each dial until the combination matches. {target.length}{" "}
                dials · {positions} positions.
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
              <h2 className="pixel-font text-sm text-accent">ENTER COMBO</h2>
              <div
                className="flex flex-wrap justify-center gap-2"
                role="group"
                aria-label="Combination dials"
              >
                {values.map((v, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => clickDial(i)}
                    className="min-h-[64px] min-w-[56px] border-2 border-game-border bg-secondary/40 hover:bg-accent/20 pixel-font text-lg text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                    aria-label={`Dial ${i + 1}: ${v}. Click to advance.`}
                  >
                    {v}
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
                Combination matched. Lock disengaged.
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
