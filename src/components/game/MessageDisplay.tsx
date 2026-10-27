import { useGame } from "@/contexts/GameContext";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export const MessageDisplay = () => {
  const { currentMessage } = useGame();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (currentMessage) {
      setVisible(true);
    }
  }, [currentMessage]);

  if (!currentMessage || !visible) return null;

  const handleDismiss = () => {
    setVisible(false);
  };

  return (
    <div 
      className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 w-[calc(100%-2rem)] md:w-auto max-w-2xl safe-top"
      onClick={handleDismiss}
    >
      <div className="bg-game-ui border-2 border-primary px-4 md:px-6 py-3 rounded shadow-lg relative touch-manipulation">
        <p className="pixel-font text-foreground text-xs md:text-sm pr-8 leading-relaxed">{currentMessage}</p>
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-1 right-1 h-8 w-8 md:h-6 md:w-6 hover:bg-destructive/20 touch-manipulation"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
