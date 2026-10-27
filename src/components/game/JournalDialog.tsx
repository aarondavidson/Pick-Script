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
import { BookOpen, Eye } from "lucide-react";
import { useState } from "react";
import type { PlayDialogChromeProps } from "@/components/game/playDialogChrome";

export const JournalDialog = ({
  open: openProp,
  onOpenChange,
  hideTrigger = false,
}: PlayDialogChromeProps = {}) => {
  const { gameState, runtime } = useGame();
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const controlled = openProp !== undefined;
  const open = controlled ? openProp : uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;

  const sortedEntries = [...gameState.journalEntries].sort(
    (a, b) => b.timestamp - a.timestamp
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Journal
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="pixel-font text-2xl">Journal</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          {sortedEntries.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p>
                Your journal is empty. Examine things in the world to record
                your findings.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedEntries.map((entry) => {
                const locationName =
                  runtime.getRoom(entry.location)?.name || "Unknown Location";
                const isExpanded = expandedEntry === entry.id;

                return (
                  <div
                    key={entry.id}
                    className="border-2 border-primary/20 rounded-lg p-4 bg-card"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="pixel-font text-lg text-accent">
                        {entry.title}
                      </h3>
                      <span className="text-xs text-muted-foreground">
                        {locationName}
                      </span>
                    </div>

                    {isExpanded ? (
                      <div className="space-y-2">
                        <p className="text-sm text-foreground whitespace-pre-wrap">
                          {entry.content}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedEntry(null)}
                          className="text-xs"
                        >
                          Close
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setExpandedEntry(entry.id)}
                        className="gap-2 mt-2"
                      >
                        <Eye className="h-3 w-3" />
                        Read Entry
                      </Button>
                    )}

                    <div className="mt-2 text-xs text-muted-foreground">
                      {new Date(entry.timestamp).toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
