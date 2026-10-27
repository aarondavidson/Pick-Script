import { useGame } from "@/contexts/GameContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Lightbulb } from "lucide-react";
import { useEffect, useState } from "react";
import type { PlayDialogChromeProps } from "@/components/game/playDialogChrome";

/**
 * Progressive in-game hints. Shows revealed tiers plus “Reveal next”.
 * Opens with H when the dialog is available (full play / preview with hints).
 */
export const HintDialog = ({
  open: openProp,
  onOpenChange,
  hideTrigger = false,
}: PlayDialogChromeProps = {}) => {
  const { activeHints, revealHint, definition, gameState } = useGame();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const controlled = openProp !== undefined;
  const open = controlled ? openProp : uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;
  const [lastReveal, setLastReveal] = useState<string | null>(null);

  const hintDefs = definition.hints ?? [];
  const hasHints = hintDefs.length > 0;

  useEffect(() => {
    if (!hasHints) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "h" && e.key !== "H") return;
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      setOpen((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hasHints]);

  if (!hasHints) return null;

  const hintsUsed = Number(gameState.vars?.hintsUsed ?? 0);
  const availableCount = activeHints.filter((h) => !h.exhausted).length;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setLastReveal(null);
      }}
    >
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="pixel-font bg-secondary/50 hover:bg-accent/20 relative"
            title="Hints (H)"
          >
            <Lightbulb className="w-4 h-4 mr-1" />
            Hints
            {availableCount > 0 && (
              <span className="ml-1 text-[10px] text-accent">
                {availableCount}
              </span>
            )}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="bg-game-ui border-2 border-game-border max-w-lg">
        <DialogHeader>
          <DialogTitle className="pixel-font text-xl text-accent">
            Hints
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Progressive clues — each reveal is clearer. Press{" "}
          <kbd className="text-foreground">H</kbd> anytime.
          {hintsUsed > 0 ? ` (${hintsUsed} used)` : ""}
        </p>
        <ScrollArea className="max-h-[50vh] pr-2">
          {activeHints.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No hints available right now. Keep exploring — or you already
              solved this thread.
            </p>
          ) : (
            <div className="space-y-3">
              {activeHints.map((hint) => {
                const def = hintDefs.find((d) => d.id === hint.id);
                const revealedTiers =
                  def?.tiers.slice(0, hint.revealed) ?? [];
                return (
                  <div
                    key={hint.id}
                    className="border border-game-border p-3 bg-secondary/20 space-y-2"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="pixel-font text-sm text-foreground">
                        {hint.title}
                      </h3>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {hint.revealed}/{hint.total}
                      </span>
                    </div>
                    {revealedTiers.length > 0 && (
                      <ol className="list-decimal list-inside space-y-1.5 text-sm text-foreground/90">
                        {revealedTiers.map((tier, i) => (
                          <li key={i}>{tier}</li>
                        ))}
                      </ol>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={hint.exhausted}
                      className="pixel-font text-xs w-full"
                      onClick={() => {
                        const text = revealHint(hint.id);
                        if (text) setLastReveal(text);
                      }}
                    >
                      {hint.exhausted
                        ? "No more clues"
                        : hint.revealed === 0
                          ? "Reveal first hint"
                          : "Reveal next hint"}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
        {lastReveal && (
          <div className="border border-accent/40 bg-accent/10 p-3 mt-2">
            <p className="text-[10px] pixel-font text-primary mb-1">Latest</p>
            <p className="text-sm text-foreground">{lastReveal}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
