import { useGame } from "@/contexts/GameContext";
import { getCurrentObjective } from "@/engine/currentObjective";

/**
 * Always-visible current sub-goal (first incomplete objective on the first
 * active quest). Hidden when the pack has no quests or all are complete.
 */
export function CurrentObjectiveBar() {
  const { gameState } = useGame();
  const objective = getCurrentObjective(gameState);

  if (!objective) return null;

  return (
    <div
      className="bg-game-ui/95 border border-game-border md:border-2 px-2.5 py-1.5 md:px-3 md:py-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 md:gap-x-3 md:gap-y-1"
      role="status"
      aria-live="polite"
      data-testid="current-objective"
    >
      <span className="pixel-font text-[9px] md:text-[10px] uppercase tracking-widest text-primary shrink-0">
        Objective
      </span>
      <span className="text-xs md:text-sm text-foreground min-w-0">
        {objective.awaitingComplete ? (
          <>
            <span className="text-muted-foreground">{objective.questTitle}</span>
            <span className="text-muted-foreground"> — wrap up</span>
          </>
        ) : (
          <>
            <span className="text-accent">{objective.text}</span>
            {objective.total > 1 && (
              <span className="text-muted-foreground text-[10px] md:text-xs ml-1.5 md:ml-2">
                ({objective.step}/{objective.total}
                <span className="hidden sm:inline">
                  {" "}
                  · {objective.questTitle}
                </span>
                )
              </span>
            )}
            {objective.total <= 1 && (
              <span className="text-muted-foreground text-[10px] md:text-xs ml-1.5 md:ml-2 hidden sm:inline">
                ({objective.questTitle})
              </span>
            )}
          </>
        )}
      </span>
    </div>
  );
}
