import { useGame } from "@/contexts/GameContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { GameItem } from "@/engine";
import { soundFX } from "@/utils/soundEffects";
import { resolveItemIcon } from "@/utils/itemIcon";

interface InventoryDialogProps {
  open: boolean;
  onClose: () => void;
}

export const InventoryDialog = ({ open, onClose }: InventoryDialogProps) => {
  const { 
    gameState,
    definition,
    selectedVerb, 
    setSelectedVerb, 
    showMessage,
    combineItems,
    selectedCombineItem,
    setSelectedCombineItem
  } = useGame();
  const [selectedItem, setSelectedItem] = useState<GameItem | null>(null);
  const [combineMode, setCombineMode] = useState(false);

  const handleItemClick = (item: GameItem) => {
    soundFX.click();

    // Combine mode
    if (combineMode) {
      if (!selectedCombineItem) {
        setSelectedCombineItem(item);
        showMessage(`Selected ${item.name}. Click another item to combine.`);
      } else if (selectedCombineItem.id === item.id) {
        setSelectedCombineItem(null);
        showMessage(`Deselected ${item.name}.`);
      } else {
        combineItems(selectedCombineItem, item);
        setSelectedCombineItem(null);
        setCombineMode(false);
      }
      return;
    }

    // Look at item description
    if (selectedVerb === "look") {
      showMessage(item.description);
      setSelectedVerb(null);
      setSelectedItem(null);
      return;
    }

    // Default / Use: arm use-with on a world hotspot
    if (selectedCombineItem?.id === item.id) {
      setSelectedCombineItem(null);
      setSelectedVerb(null);
      showMessage(`Deselected ${item.name}.`);
      return;
    }
    setSelectedCombineItem(item);
    setSelectedVerb("use");
    setSelectedItem(item);
    showMessage(`Use ${item.name} with… (click something in the room)`);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-game-ui border-2 border-game-border max-w-2xl">
        <DialogHeader>
          <DialogTitle className="pixel-font text-accent text-xl flex items-center justify-between">
            <span>Inventory</span>
            <Button
              variant={combineMode ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setCombineMode(!combineMode);
                setSelectedCombineItem(null);
                showMessage(combineMode ? "Combine mode off" : "Combine mode on - select two items");
              }}
              className="pixel-font text-xs"
            >
              {combineMode ? "Cancel Combine" : "Combine Items"}
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="h-[400px] pr-4">
          {gameState.inventory.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground pixel-font">Your inventory is empty</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-4">
              {gameState.inventory.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={`
                    relative aspect-square cursor-pointer 
                    bg-secondary/30 border-2 border-border rounded-lg
                    hover:border-accent hover:bg-secondary/50 
                    transition-all duration-200
                    ${selectedItem?.id === item.id ? 'border-accent ring-2 ring-accent' : ''}
                    ${selectedCombineItem?.id === item.id ? 'border-primary ring-2 ring-primary' : ''}
                    ${selectedVerb || combineMode ? 'hover:scale-105' : ''}
                    p-2 flex flex-col items-center justify-center gap-2
                  `}
                >
                  <div className="w-full h-full flex items-center justify-center">
                    <img
                      src={resolveItemIcon(item, definition.itemIcons)}
                      alt={item.name}
                      className="max-w-full max-h-full object-contain pixelated"
                      style={{ imageRendering: 'pixelated' }}
                    />
                  </div>
                  <p className="pixel-font text-[10px] text-foreground text-center leading-tight">
                    {item.name}
                  </p>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="text-center pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground pixel-font">
            {combineMode
              ? selectedCombineItem
                ? `Click another item to combine with ${selectedCombineItem.name}`
                : 'Click an item to start combining'
              : selectedVerb 
                ? `Click an item to ${selectedVerb} it` 
                : 'Select a verb first, then click an item to interact'}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
