import { useCallback, useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { haptics } from "@/utils/haptics";
import { soundFX } from "@/utils/soundEffects";
import type { ModalityPlayerProps } from "./modalityRegistry";
import {
  isWireMatch,
  shuffleIds,
  wireMatchComplete,
  wirePairMap,
  type WirePair,
} from "./wireMatchLogic";

const DEFAULT_PAIRS: WirePair[] = [
  { left: "a", right: "1" },
  { left: "b", right: "2" },
  { left: "c", right: "3" },
];

type Phase = "ready" | "playing" | "won";

function parsePairs(config?: Record<string, unknown>): WirePair[] {
  const raw = config?.pairs;
  if (Array.isArray(raw) && raw.length >= 2) {
    const out: WirePair[] = [];
    for (const item of raw.slice(0, 8)) {
      if (Array.isArray(item) && item.length >= 2) {
        const left = String(item[0] ?? "").trim();
        const right = String(item[1] ?? "").trim();
        if (left && right) out.push({ left, right });
      } else if (item && typeof item === "object" && !Array.isArray(item)) {
        const o = item as Record<string, unknown>;
        const left = typeof o.left === "string" ? o.left.trim() : "";
        const right = typeof o.right === "string" ? o.right.trim() : "";
        if (left && right) out.push({ left, right });
      }
    }
    if (out.length >= 2) return out;
  }
  return DEFAULT_PAIRS;
}

/**
 * Declarative wire-match: connect left terminals to shuffled right ends.
 */
export function WireMatchGame({
  isOpen,
  onClose,
  onWin,
  alreadyWon,
  config,
}: ModalityPlayerProps) {
  const pairs = useMemo(() => parsePairs(config), [config]);
  const pairMap = useMemo(() => wirePairMap(pairs), [pairs]);
  const leftIds = useMemo(() => pairs.map((p) => p.left), [pairs]);
  const rightBase = useMemo(() => pairs.map((p) => p.right), [pairs]);

  const [phase, setPhase] = useState<Phase>("ready");
  const [rightOrder, setRightOrder] = useState<string[]>(() =>
    shuffleIds(rightBase)
  );
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(() => new Set());
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setPhase("ready");
      setSelectedLeft(null);
      setMatched(new Set());
      setFeedback(null);
      setRightOrder(shuffleIds(rightBase));
    }
  }, [isOpen, rightBase]);

  const start = useCallback(() => {
    setRightOrder(shuffleIds(rightBase));
    setMatched(new Set());
    setSelectedLeft(null);
    setFeedback(null);
    setPhase("playing");
    haptics.medium();
    soundFX.click();
  }, [rightBase]);

  const pickLeft = useCallback(
    (id: string) => {
      if (phase !== "playing" || matched.has(id)) return;
      setSelectedLeft(id);
      setFeedback(null);
      haptics.light();
      soundFX.click();
    },
    [phase, matched]
  );

  const pickRight = useCallback(
    (rightId: string) => {
      if (phase !== "playing" || !selectedLeft) return;
      if ([...matched].some((l) => pairMap[l] === rightId)) return;

      if (isWireMatch(selectedLeft, rightId, pairMap)) {
        const next = new Set(matched);
        next.add(selectedLeft);
        setMatched(next);
        setSelectedLeft(null);
        setFeedback("CONNECTED");
        haptics.success();
        soundFX.success();
        if (wireMatchComplete(next, leftIds)) {
          setPhase("won");
          if (!alreadyWon) onWin();
        }
      } else {
        setFeedback("WRONG PAIR");
        setSelectedLeft(null);
        haptics.error();
        soundFX.error();
      }
    },
    [phase, selectedLeft, matched, pairMap, leftIds, alreadyWon, onWin]
  );

  const handleClose = () => {
    setPhase("ready");
    setSelectedLeft(null);
    setMatched(new Set());
    setFeedback(null);
    onClose();
  };

  const matchedRights = useMemo(() => {
    const s = new Set<string>();
    for (const l of matched) {
      const r = pairMap[l];
      if (r) s.add(r);
    }
    return s;
  }, [matched, pairMap]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[420px] bg-[#0c0c14] border-2 border-game-border p-4">
        <div className="space-y-4 text-center">
          {phase === "ready" && (
            <div className="space-y-3 py-4">
              <h2 className="pixel-font text-lg text-accent">WIRE MATCH</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Connect each left terminal to its matching right end. Wrong
                pairs reset the selection.
              </p>
              {alreadyWon && (
                <p className="text-xs text-green-400 pixel-font">
                  Already matched
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
              <h2 className="pixel-font text-sm text-accent">MATCH WIRES</h2>
              <p
                className="pixel-font text-xs text-muted-foreground"
                aria-live="polite"
              >
                {feedback ??
                  (selectedLeft
                    ? `Left: ${selectedLeft.toUpperCase()} — pick right`
                    : "Pick a left terminal")}
              </p>
              <div className="grid grid-cols-2 gap-4 text-left">
                <div
                  className="space-y-2"
                  role="group"
                  aria-label="Left terminals"
                >
                  {leftIds.map((id) => {
                    const done = matched.has(id);
                    const selected = selectedLeft === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        disabled={done}
                        onClick={() => pickLeft(id)}
                        className={`w-full min-h-[44px] px-2 border-2 pixel-font text-xs ${
                          done
                            ? "border-green-500/50 text-green-400 opacity-70"
                            : selected
                              ? "border-accent bg-accent/20 text-accent"
                              : "border-game-border bg-secondary/40 hover:bg-accent/15 text-foreground"
                        }`}
                      >
                        {id.toUpperCase()}
                        {done ? " ✓" : ""}
                      </button>
                    );
                  })}
                </div>
                <div
                  className="space-y-2"
                  role="group"
                  aria-label="Right terminals"
                >
                  {rightOrder.map((id) => {
                    const done = matchedRights.has(id);
                    return (
                      <button
                        key={id}
                        type="button"
                        disabled={done || !selectedLeft}
                        onClick={() => pickRight(id)}
                        className={`w-full min-h-[44px] px-2 border-2 pixel-font text-xs ${
                          done
                            ? "border-green-500/50 text-green-400 opacity-70"
                            : "border-game-border bg-secondary/40 hover:bg-accent/15 text-foreground disabled:opacity-40"
                        }`}
                      >
                        {id.toUpperCase()}
                        {done ? " ✓" : ""}
                      </button>
                    );
                  })}
                </div>
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
              <h2 className="pixel-font text-lg text-green-400">MATCHED</h2>
              <p className="text-xs text-muted-foreground">
                All wires connected correctly.
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
