import { useGame } from "@/contexts/GameContext";
import { Button } from "@/components/ui/button";
import type { VerbId } from "@/engine";
import { soundFX } from "@/utils/soundEffects";
import { haptics } from "@/utils/haptics";
import { useEffect, useMemo, useState } from "react";
import { EnhancedInventory } from "@/components/game/EnhancedInventory";
import { useIsMobile } from "@/hooks/use-mobile";

/** Presentation icons — engine provides labels/shortcuts via GameDefinition.verbs */
const VERB_ICONS: Partial<Record<VerbId, string>> = {
  look: "👁️",
  talk: "💬",
  use: "🤚",
  pickup: "👆",
  open: "🚪",
  push: "👉",
  pull: "👈",
  give: "🎁",
};

export const VerbPanelEnhanced = () => {
  const {
    selectedVerb,
    setSelectedVerb,
    verbs: verbDefs,
    inputLocked,
    verbMode,
  } = useGame();
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const isMobile = useIsMobile();
  const coinMode = verbMode === "coin";

  const verbs = useMemo(
    () =>
      verbDefs.map((v, index) => ({
        type: v.id,
        label: `${VERB_ICONS[v.id] ?? ""} ${v.label}`.trim(),
        shortLabel: VERB_ICONS[v.id] ?? v.shortLabel,
        key: v.shortcut ?? String(index + 1),
      })),
    [verbDefs]
  );

  const inventoryKey = String(verbs.length + 1);

  useEffect(() => {
    if (isMobile || inputLocked) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      const key = e.key;
      const verb = verbs.find((v) => v.key === key);

      if (verb) {
        e.preventDefault();
        setSelectedVerb(verb.type);
        soundFX.verbSelect();
      }

      if (key === inventoryKey) {
        e.preventDefault();
        setInventoryOpen(true);
        soundFX.click();
      }

      if (key === "Escape" && selectedVerb) {
        e.preventDefault();
        setSelectedVerb(null);
        soundFX.click();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [
    setSelectedVerb,
    selectedVerb,
    isMobile,
    verbs,
    inputLocked,
    inventoryKey,
  ]);

  const cols =
    verbs.length <= 2
      ? "grid-cols-3 md:grid-cols-3"
      : "grid-cols-4 md:grid-cols-2";

  return (
    <div className="bg-game-ui border-2 border-game-border p-2 md:p-4">
      <h3 className="pixel-font text-accent mb-2 md:mb-3 text-sm md:text-base">
        {coinMode ? "Verb coin" : "Actions"}
      </h3>
      {coinMode && (
        <p className="text-[11px] text-muted-foreground mb-2 leading-relaxed">
          Click a hotspot to open the Look / Talk / Use coin. Inventory still
          arms Use-with.
        </p>
      )}
      <div className={`grid ${cols} gap-1 md:gap-2`}>
        {verbs.map((verb) => (
          <Button
            key={verb.type}
            onClick={() => {
              if (inputLocked) return;
              setSelectedVerb(verb.type);
              soundFX.verbSelect();
              haptics.selection();
            }}
            variant={selectedVerb === verb.type ? "default" : "outline"}
            size="sm"
            disabled={inputLocked}
            className={`pixel-font text-xs relative min-h-[44px] touch-manipulation tap-feedback ${
              selectedVerb === verb.type
                ? "bg-accent text-accent-foreground hover:bg-accent/90"
                : "bg-secondary/50 hover:bg-game-verb/20 active:bg-game-verb/30"
            }`}
          >
            <span className="md:hidden">{verb.shortLabel}</span>
            <span className="hidden md:inline">{verb.label}</span>
            {!isMobile && (
              <span className="absolute top-0 right-1 text-[10px] opacity-50">
                {verb.key}
              </span>
            )}
          </Button>
        ))}
        <Button
          onClick={() => {
            setInventoryOpen(true);
            soundFX.click();
            haptics.light();
          }}
          variant="outline"
          size="sm"
          className="pixel-font text-xs relative bg-secondary/50 hover:bg-game-verb/20 active:bg-game-verb/30 min-h-[44px] touch-manipulation tap-feedback"
        >
          <span className="md:hidden">🎒</span>
          <span className="hidden md:inline">🎒 Inventory</span>
          {!isMobile && (
            <span className="absolute top-0 right-1 text-[10px] opacity-50">
              {inventoryKey}
            </span>
          )}
        </Button>
      </div>
      {!isMobile && (
        <p className="text-xs text-muted-foreground mt-3 text-center">
          Press 1-{inventoryKey} or ESC
        </p>
      )}

      <EnhancedInventory
        open={inventoryOpen}
        onClose={() => setInventoryOpen(false)}
      />
    </div>
  );
};
