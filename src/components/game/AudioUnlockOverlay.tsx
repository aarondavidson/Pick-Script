import { useState, useEffect } from "react";
import { Volume2 } from "lucide-react";
import { soundFX } from "@/utils/soundEffects";
import { useGame } from "@/contexts/GameContext";

interface AudioUnlockOverlayProps {
  onUnlock: () => void;
}

export const AudioUnlockOverlay = ({ onUnlock }: AudioUnlockOverlayProps) => {
  const { definition } = useGame();
  const [isVisible, setIsVisible] = useState(true);

  const handleUnlock = () => {
    void soundFX.unlock();
    soundFX.click();
    setIsVisible(false);
    onUnlock();
  };

  const handleInteraction = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    handleUnlock();
  };

  useEffect(() => {
    const handleKeyDown = () => handleUnlock();
    window.addEventListener("keydown", handleKeyDown, { once: true });
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- unlock once
  }, []);

  if (!isVisible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm touch-manipulation"
      style={{
        paddingTop: "var(--sat)",
        paddingBottom: "var(--sab)",
      }}
      onClick={handleInteraction}
      onTouchEnd={handleInteraction}
    >
      <div className="text-center space-y-6 p-8 max-w-sm">
        <div className="mx-auto w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
          <Volume2 className="w-10 h-10 text-primary" />
        </div>
        <h2 className="pixel-font text-2xl text-accent">{definition.title}</h2>
        <p className="text-muted-foreground text-sm">
          Tap anywhere to enable audio and begin
        </p>
        <p className="text-xs text-muted-foreground/70 pixel-font">
          Web · iOS · point-and-click
        </p>
      </div>
    </div>
  );
};
