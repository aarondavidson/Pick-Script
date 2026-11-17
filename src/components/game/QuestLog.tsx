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
import { BookOpen, CheckCircle2, Circle } from "lucide-react";
import { useState } from "react";
import type { PlayDialogChromeProps } from "@/components/game/playDialogChrome";
import { uiText } from "@/engine/uiStrings";

export const QuestLog = ({
  open: openProp,
  onOpenChange,
  hideTrigger = false,
}: PlayDialogChromeProps = {}) => {
  const { gameState } = useGame();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const controlled = openProp !== undefined;
  const open = controlled ? openProp : uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;

  const activeQuests = gameState.quests.filter((q) => !q.completed);
  const completedQuests = gameState.quests.filter((q) => q.completed);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="pixel-font bg-secondary/50 hover:bg-accent/20"
          >
            <BookOpen className="w-4 h-4 mr-2" />
            {uiText("ui.menu.quests")}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-2xl bg-card border-2 border-game-border">
        <DialogHeader>
          <DialogTitle className="pixel-font text-accent text-xl">
            {uiText("ui.quests.log")}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[400px] pr-4">
          {activeQuests.length === 0 && completedQuests.length === 0 && (
            <p className="text-muted-foreground text-center py-8">
              {uiText("ui.quests.empty")}
            </p>
          )}

          {activeQuests.length > 0 && (
            <div className="mb-6">
              <h3 className="pixel-font text-primary text-lg mb-3">
                {uiText("ui.quests.active")}
              </h3>
              {activeQuests.map((quest) => (
                <div
                  key={quest.id}
                  className="mb-4 p-4 bg-secondary/30 border border-border rounded"
                >
                  <h4 className="pixel-font text-accent mb-2">{quest.title}</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    {quest.description}
                  </p>
                  <div className="space-y-2">
                    {quest.objectives.map((objective, index) => {
                      const isCompleted =
                        quest.completedObjectives.includes(index);
                      return (
                        <div key={index} className="flex items-start gap-2">
                          {isCompleted ? (
                            <CheckCircle2 className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                          ) : (
                            <Circle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                          )}
                          <span
                            className={`text-sm ${
                              isCompleted
                                ? "line-through text-muted-foreground"
                                : "text-foreground"
                            }`}
                          >
                            {objective}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {completedQuests.length > 0 && (
            <div>
              <h3 className="pixel-font text-muted-foreground text-lg mb-3">
                {uiText("ui.quests.completed")}
              </h3>
              {completedQuests.map((quest) => (
                <div
                  key={quest.id}
                  className="mb-3 p-3 bg-muted/20 border border-border rounded opacity-60"
                >
                  <h4 className="pixel-font text-muted-foreground mb-1">
                    {quest.title}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {quest.description}
                  </p>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
