import { useGame } from "@/contexts/GameContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Backpack, Sparkles } from "lucide-react";
import { useState } from "react";
import { resolveItemIcon } from "@/utils/itemIcon";
import { soundFX } from "@/utils/soundEffects";
import type { GameItem } from "@/engine";

interface EnhancedInventoryProps {
  open?: boolean;
  onClose?: () => void;
}

export const EnhancedInventory = ({ open, onClose }: EnhancedInventoryProps = {}) => {
  const {
    gameState,
    definition,
    selectedCombineItem,
    setSelectedCombineItem,
    selectedVerb,
    setSelectedVerb,
    combineItems,
    showMessage,
  } = useGame();
  const [internalOpen, setInternalOpen] = useState(false);
  const [combineMode, setCombineMode] = useState(false);

  // Use prop if provided, otherwise use internal state
  const dialogOpen = open !== undefined ? open : internalOpen;
  const setDialogOpen = (value: boolean) => {
    if (open !== undefined && onClose && !value) {
      onClose();
    } else {
      setInternalOpen(value);
    }
  };

  const closeDialog = () => setDialogOpen(false);

  /** Default: pick an item to Use with a world hotspot. Optional combine mode for item+item. */
  const handleItemClick = (item: GameItem) => {
    soundFX.click();

    if (combineMode) {
      if (!selectedCombineItem) {
        setSelectedCombineItem(item);
        showMessage(`Selected ${item.name}. Click another item to combine.`);
        return;
      }
      if (selectedCombineItem.id === item.id) {
        setSelectedCombineItem(null);
        showMessage(`Deselected ${item.name}.`);
        return;
      }
      combineItems(selectedCombineItem, item);
      setSelectedCombineItem(null);
      setCombineMode(false);
      return;
    }

    // Use/Give with world object: select item, arm verb, close inventory
    if (selectedCombineItem?.id === item.id) {
      setSelectedCombineItem(null);
      setSelectedVerb(null);
      showMessage(`Deselected ${item.name}.`);
      return;
    }

    setSelectedCombineItem(item);
    if (selectedVerb === "give") {
      showMessage(`Give ${item.name} to… (click someone in the room)`);
    } else {
      setSelectedVerb("use");
      showMessage(`Use ${item.name} with… (click something in the room)`);
    }
    closeDialog();
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {open === undefined && (
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="pixel-font bg-secondary/50 hover:bg-accent/20 relative">
            <Backpack className="w-4 h-4 mr-2" />
            Inventory
            {gameState.inventory.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-accent text-accent-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center pixel-font">
                {gameState.inventory.length}
              </span>
            )}
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-2xl bg-card border-2 border-game-border">
        <DialogHeader>
          <DialogTitle className="pixel-font text-accent text-xl flex items-center justify-between gap-2">
            <span>Inventory</span>
            <Button
              variant={combineMode ? "default" : "outline"}
              size="sm"
              className="pixel-font text-xs"
              onClick={() => {
                setCombineMode(!combineMode);
                setSelectedCombineItem(null);
                showMessage(
                  combineMode
                    ? "Combine mode off"
                    : "Combine mode — select two items"
                );
              }}
            >
              {combineMode ? "Cancel combine" : "Combine items"}
            </Button>
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {combineMode
              ? "Select two items to combine."
              : "Click an item, then click something in the room to use it with."}
          </p>
        </DialogHeader>

        <ScrollArea className="h-[400px] pr-4">
          {gameState.inventory.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Backpack className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p>Your inventory is empty.</p>
              <p className="text-sm mt-2">Explore to find items!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {gameState.inventory.map((item) => {
                const isSelected = selectedCombineItem?.id === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className={`p-4 border-2 rounded text-left transition-all ${
                      isSelected
                        ? "border-accent bg-accent/20 shadow-lg"
                        : "border-border bg-secondary/30 hover:bg-secondary/50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-muted/50 rounded flex items-center justify-center overflow-hidden">
                        <img
                          src={resolveItemIcon(item, definition.itemIcons)}
                          alt={item.name}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className={`pixel-font mb-1 ${isSelected ? "text-accent" : "text-foreground"}`}>
                          {item.name}
                        </h4>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {item.description}
                        </p>
                        {item.combineHint && (
                          <div className="mt-2 flex items-center gap-1 text-xs text-accent">
                            <Sparkles className="w-3 h-3" />
                            <span>{item.combineHint}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {selectedCombineItem && (
          <div className="mt-4 p-3 bg-accent/10 border border-accent rounded">
            <p className="text-sm pixel-font text-accent">
              Selected: {selectedCombineItem.name}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {combineMode
                ? "Click another item to combine, or click again to deselect"
                : "Click a hotspot in the room (or reopen inventory to change)"}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
