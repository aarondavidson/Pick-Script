import { useGame } from "@/contexts/GameContext";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { uiText } from "@/engine/uiStrings";

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
            {uiText("ui.consume.title")}
          </DialogTitle>
        </DialogHeader>
        {pendingConsumeConfirm && (
          <p className="text-sm text-foreground">
            {uiText("ui.consume.body", {
              item: pendingConsumeConfirm.item.name,
              target: pendingConsumeConfirm.hotspot.name,
            })}
          </p>
        )}
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            className="pixel-font text-xs min-h-[44px]"
            onClick={() => cancelConsume()}
          >
            {uiText("ui.common.cancel")}
          </Button>
          <Button
            className="pixel-font text-xs min-h-[44px]"
            onClick={() => confirmConsume()}
          >
            {uiText("ui.consume.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
