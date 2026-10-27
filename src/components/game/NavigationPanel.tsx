import { useGame } from "@/contexts/GameContext";
import { Button } from "@/components/ui/button";
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  ArrowUpLeft,
  ArrowDownRight,
  ArrowDownLeft,
  ArrowUpFromLine,
  ArrowDownToLine,
} from "lucide-react";
import { soundFX } from "@/utils/soundEffects";
import { haptics } from "@/utils/haptics";
import { useMemo } from "react";

export const NavigationPanel = () => {
  const { gameState, runtime, inputLocked, travelThroughExit, showMessage } =
    useGame();
  const location = runtime.getRoom(gameState.currentLocation);

  const exits = useMemo(() => {
    if (!location) return [];
    return location.exits.filter((exit) => {
      const blocked = exit.blocked?.(gameState);
      if (blocked && exit.showWhenBlocked === false) return false;
      return true;
    });
  }, [location, gameState]);

  if (!location) return null;

  const handleNavigation = (exit: (typeof location.exits)[number]) => {
    if (inputLocked) return;
    if (exit.blocked?.(gameState)) {
      showMessage(exit.blockedMessage ?? "You can't go that way right now.");
      haptics.warning();
      soundFX.error();
      return;
    }
    const ok = travelThroughExit(exit);
    if (!ok) {
      haptics.warning();
      return;
    }
    soundFX.doorOpen();
  };

  const getDirectionIcon = (direction: string) => {
    switch (direction) {
      case "north":
        return <ArrowUp className="w-4 h-4 shrink-0" />;
      case "south":
        return <ArrowDown className="w-4 h-4 shrink-0" />;
      case "east":
        return <ArrowRight className="w-4 h-4 shrink-0" />;
      case "west":
        return <ArrowLeft className="w-4 h-4 shrink-0" />;
      case "northeast":
        return <ArrowUpRight className="w-4 h-4 shrink-0" />;
      case "northwest":
        return <ArrowUpLeft className="w-4 h-4 shrink-0" />;
      case "southeast":
        return <ArrowDownRight className="w-4 h-4 shrink-0" />;
      case "southwest":
        return <ArrowDownLeft className="w-4 h-4 shrink-0" />;
      case "up":
        return <ArrowUpFromLine className="w-4 h-4 shrink-0" />;
      case "down":
        return <ArrowDownToLine className="w-4 h-4 shrink-0" />;
      default:
        return <ArrowRight className="w-4 h-4 shrink-0" />;
    }
  };

  if (exits.length === 0) {
    return (
      <div className="bg-game-ui border-2 border-game-border p-2 md:p-4">
        <h3 className="pixel-font text-accent mb-1 text-sm md:text-base">
          Exits
        </h3>
        <p className="text-xs text-muted-foreground">
          No doors from here — explore hotspots in the room.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-game-ui border-2 border-game-border p-2 md:p-4">
      <h3 className="pixel-font text-accent mb-2 md:mb-3 text-sm md:text-base">
        Exits
      </h3>
      <div className="grid grid-cols-2 gap-1 md:gap-2">
        {exits.map((exit) => {
          const blocked = !!exit.blocked?.(gameState);
          const label =
            blocked && exit.lockedLabel ? exit.lockedLabel : exit.label;
          return (
            <Button
              key={`${exit.direction}-${exit.to}`}
              onClick={() => handleNavigation(exit)}
              variant="outline"
              size="sm"
              disabled={inputLocked}
              className={`pixel-font text-[10px] md:text-xs bg-secondary/50 hover:bg-primary/20 active:bg-primary/30 flex items-center gap-1 md:gap-2 min-h-[48px] touch-manipulation tap-feedback ${
                blocked ? "opacity-60" : ""
              }`}
            >
              {getDirectionIcon(exit.direction)}
              <span className="truncate text-left">
                {label}
                {blocked ? " · sealed" : ""}
              </span>
            </Button>
          );
        })}
      </div>
    </div>
  );
};
