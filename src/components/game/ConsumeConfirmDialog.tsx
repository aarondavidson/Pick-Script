import { useGame } from "@/contexts/GameContext";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * Warn before irreversible inventory consumes (use-with consumeItem / takeItem).
 */
export function ConsumeConfirmDialog() {
  const { pendingConsumeConfirm, confirmConsume, cancelConsume } = useGame();
  const open = !!pendingConsumeConfirm;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) cancelConsume();
      }}
    >
      <DialogContent className="bg-game-ui border-2 border-game-border max-w-md">
        <DialogHeader>
          <DialogTitle className="pixel-font text-accent">
            Use this item?
          </DialogTitle>
        </DialogHeader>
        {pendingConsumeConfirm && (
          <p className="text-sm text-foreground">
            Using{" "}
            <span className="text-accent pixel-font">
              {pendingConsumeConfirm.item.name}
            </span>{" "}
            with{" "}
            <span className="text-accent pixel-font">
              {pendingConsumeConfirm.hotspot.name}
            </span>{" "}
            will remove it from your inventory. This can’t be undone without
            loading a save.
          </p>
        )}
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            className="pixel-font text-xs min-h-[44px]"
            onClick={() => cancelConsume()}
          >
            Cancel
          </Button>
          <Button
            className="pixel-font text-xs min-h-[44px]"
            onClick={() => confirmConsume()}
          >
            Use it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
