import { useGame } from "@/contexts/GameContext";
import { Button } from "@/components/ui/button";
import { Lightbulb } from "lucide-react";

/**
 * Soft "Need a hint?" prompt after idle time or a streak of failed interacts.
 */
export function StuckAssistBanner() {
  const {
    stuckAssistOffer,
    acceptStuckAssist,
    dismissStuckAssist,
    activeHints,
  } = useGame();

  if (!stuckAssistOffer) return null;
  const next = activeHints.find((h) => !h.exhausted);
  if (!next) return null;

  return (
    <div
      className="fixed bottom-[max(1rem,var(--sab))] left-1/2 z-[88] w-[min(92vw,22rem)] -translate-x-1/2 border-2 border-accent bg-game-ui p-3 shadow-none"
      role="status"
    >
      <div className="flex items-start gap-2">
        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="pixel-font text-sm text-accent">Need a hint?</p>
          <p className="text-xs text-muted-foreground">
            Next clue for “{next.title}” ({next.revealed}/{next.total}).
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              className="pixel-font text-xs min-h-[44px]"
              onClick={() => acceptStuckAssist()}
            >
              Show hint
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="pixel-font text-xs min-h-[44px]"
              onClick={() => dismissStuckAssist()}
            >
              Not now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
