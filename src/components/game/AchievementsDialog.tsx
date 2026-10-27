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
import { Trophy, Lock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import type { PlayDialogChromeProps } from "@/components/game/playDialogChrome";

export const AchievementsDialog = ({
  open: openProp,
  onOpenChange,
  hideTrigger = false,
}: PlayDialogChromeProps = {}) => {
  const { gameState } = useGame();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const controlled = openProp !== undefined;
  const open = controlled ? openProp : uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;

  const unlockedCount = gameState.achievements.filter((a) => a.unlocked).length;
  const totalCount = gameState.achievements.length;
  const progressPercent =
    totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="pixel-font bg-secondary/50 hover:bg-accent/20"
          >
            <Trophy className="w-4 h-4 mr-2" />
            Achievements
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-2xl bg-card border-2 border-game-border">
        <DialogHeader>
          <DialogTitle className="pixel-font text-accent text-xl">
            Achievements
          </DialogTitle>
          <div className="mt-2">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-muted-foreground">
                {unlockedCount} / {totalCount} Unlocked
              </span>
              <span className="text-sm text-accent pixel-font">
                {progressPercent.toFixed(0)}%
              </span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-accent transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {gameState.achievements.map((achievement) => (
              <div
                key={achievement.id}
                className={`p-4 border rounded transition-all ${
                  achievement.unlocked
                    ? "bg-secondary/30 border-accent/50"
                    : "bg-muted/10 border-border/30 opacity-50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded flex items-center justify-center shrink-0 ${
                      achievement.unlocked ? "bg-accent/20" : "bg-muted/20"
                    }`}
                  >
                    {achievement.unlocked ? (
                      <Trophy className="w-5 h-5 text-accent" />
                    ) : (
                      <Lock className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4
                      className={`pixel-font mb-1 ${
                        achievement.unlocked
                          ? "text-accent"
                          : "text-muted-foreground"
                      }`}
                    >
                      {achievement.title}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {achievement.unlocked ? achievement.description : "???"}
                    </p>
                    {achievement.unlocked && achievement.timestamp && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Unlocked{" "}
                        {formatDistanceToNow(achievement.timestamp, {
                          addSuffix: true,
                        })}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
