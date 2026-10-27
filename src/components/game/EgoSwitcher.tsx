import { useGame } from "@/contexts/GameContext";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";

/** New Kid / multi-ego control — only renders when 2+ playable actors. */
export const EgoSwitcher = () => {
  const {
    playableActors,
    gameState,
    switchToEgo,
    runtime,
    inputLocked,
  } = useGame();

  if (playableActors.length < 2) return null;

  return (
    <div className="flex items-center gap-1">
      <Users className="w-3.5 h-3.5 text-muted-foreground hidden md:block" />
      {playableActors.map((id) => {
        const def = runtime.getActorDef(id);
        const name = def?.name ?? id;
        const active = gameState.egoId === id;
        return (
          <Button
            key={id}
            variant={active ? "default" : "outline"}
            size="sm"
            disabled={inputLocked || active}
            className={`pixel-font text-xs min-h-[36px] ${
              active
                ? "bg-accent text-accent-foreground"
                : "bg-secondary/50 hover:bg-accent/20"
            }`}
            onClick={() => switchToEgo(id)}
          >
            {name}
          </Button>
        );
      })}
    </div>
  );
};
