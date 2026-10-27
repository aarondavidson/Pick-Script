import { type Hotspot as HotspotType, type VerbId, getObjectState } from "@/engine";
import { useGame } from "@/contexts/GameContext";
import { useState, useEffect, useCallback } from "react";
import { haptics } from "@/utils/haptics";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import { isSafePlayMediaUrl } from "@/engine/security";
import { sceneAnimClassName, useFrameCycle } from "@/hooks/useFrameCycle";

interface HotspotProps {
  hotspot: HotspotType;
  onDialogueOpen?: () => void;
  /** When set (coin mode), open verb coin instead of immediate execute */
  onVerbCoinRequest?: (
    hotspot: HotspotType,
    onDialogueOpen?: () => void
  ) => void;
  /** Hold-to-reveal: force outline visible (Thimbleweed-style) */
  forceReveal?: boolean;
}

const verbCursors: Record<VerbId, string> = {
  look: "👁️",
  talk: "💬",
  use: "🤚",
  pickup: "👆",
  open: "🚪",
  push: "👉",
  pull: "👈",
  give: "🎁",
};

export const Hotspot = ({
  hotspot,
  onDialogueOpen,
  onVerbCoinRequest,
  forceReveal = false,
}: HotspotProps) => {
  const {
    selectedVerb,
    selectedCombineItem,
    executeSentence,
    setHoveredTargetName,
    inputLocked,
    sentenceLine,
    gameState,
    stuckAssistHotspotId,
  } = useGame();
  const [isHovered, setIsHovered] = useState(false);
  const [animationClass, setAnimationClass] = useState("");
  const [clickFeedback, setClickFeedback] = useState(false);
  const [isTouching, setIsTouching] = useState(false);
  const isMobile = useIsMobile();

  /** Pack-agnostic: actor flags or dialogue-bearing NPCs */
  const isCharacter = !!(
    hotspot.isActor ||
    hotspot.actorId ||
    hotspot.dialogue
  );

  const objectState = getObjectState(
    gameState,
    hotspot.id,
    hotspot.initialState ?? 0
  );
  const overlayRaw = hotspot.stateOverlays?.[objectState];
  const stateOverlay = isSafePlayMediaUrl(overlayRaw) ? overlayRaw : undefined;
  const safeFrames = (hotspot.frames ?? []).filter((u) => isSafePlayMediaUrl(u));
  const frameOverlay = useFrameCycle(safeFrames, hotspot.fps ?? 4);
  const overlayImage = frameOverlay || stateOverlay;
  const overlayAnimCls = sceneAnimClassName(hotspot.animClass);

  useEffect(() => {
    if (!isCharacter) return;
    const animations = ["character-gesturing", ""];
    const randomAnim = Math.random() > 0.7 ? animations[0] : animations[1];
    setAnimationClass(randomAnim);
    const interval = setInterval(() => {
      const newAnim = Math.random() > 0.7 ? animations[0] : animations[1];
      setAnimationClass(newAnim);
    }, 5000);
    return () => clearInterval(interval);
  }, [isCharacter]);

  const handleInteraction = useCallback(() => {
    if (inputLocked) return;

    if (onVerbCoinRequest && !selectedVerb && !selectedCombineItem) {
      onVerbCoinRequest(hotspot, onDialogueOpen);
      return;
    }

    if (!selectedVerb && !selectedCombineItem) return;

    executeSentence(hotspot, {
      onDialogueOpen,
    });
  }, [
    inputLocked,
    hotspot,
    onDialogueOpen,
    executeSentence,
    onVerbCoinRequest,
    selectedVerb,
    selectedCombineItem,
  ]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (inputLocked) return;
    e.preventDefault();
    setIsTouching(true);
    setIsHovered(true);
    setClickFeedback(true);
    setHoveredTargetName(hotspot.name);
    haptics.light();
  }, [inputLocked, hotspot.name, setHoveredTargetName]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    setIsTouching(false);
    setClickFeedback(false);
    haptics.medium();
    handleInteraction();
    setTimeout(() => {
      setIsHovered(false);
      setHoveredTargetName(null);
    }, 200);
  }, [handleInteraction, setHoveredTargetName]);

  const handleTouchCancel = useCallback(() => {
    setIsTouching(false);
    setIsHovered(false);
    setClickFeedback(false);
    setHoveredTargetName(null);
  }, [setHoveredTargetName]);

  const handleMouseEnter = useCallback(() => {
    if (inputLocked) return;
    if (!isMobile) {
      setIsHovered(true);
      setHoveredTargetName(hotspot.name);
    }
  }, [isMobile, inputLocked, hotspot.name, setHoveredTargetName]);

  const handleMouseLeave = useCallback(() => {
    if (!isMobile) {
      setIsHovered(false);
      setHoveredTargetName(null);
    }
  }, [isMobile, setHoveredTargetName]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (isTouching || inputLocked) return;
    handleInteraction();
  }, [isTouching, inputLocked, handleInteraction]);

  const handleTouchMove = useCallback((_e: React.TouchEvent) => {
    setIsHovered(true);
  }, []);

  const isActive = isHovered || isTouching || forceReveal;
  const stuckPulse = stuckAssistHotspotId === hotspot.id;
  const characterClasses = isCharacter ? `character-animated ${animationClass}`.trim() : "";
  const displayVerb = selectedVerb ?? (selectedCombineItem ? "use" : null);

  return (
    <TooltipProvider delayDuration={isMobile ? 0 : 300}>
      <Tooltip open={isActive && !isMobile && !inputLocked && !forceReveal}>
        <TooltipTrigger asChild>
          <div
            data-hotspot={hotspot.id}
            data-stuck-pulse={stuckPulse || undefined}
            className={`absolute cursor-pointer transition-all duration-200 touch-manipulation ${characterClasses} ${
              clickFeedback ? "scale-95" : "scale-100"
            } ${isActive ? "hotspot-active" : "hotspot-idle"} ${
              stuckPulse ? "hotspot-stuck-pulse" : ""
            } ${
              forceReveal && !isHovered && !isTouching ? "hotspot-reveal-all" : ""
            } ${
              inputLocked ? "pointer-events-none opacity-50" : ""
            }`}
            style={{
              left: `${hotspot.x}%`,
              top: `${hotspot.y}%`,
              width: `${hotspot.width}%`,
              height: `${hotspot.height}%`,
              minWidth: isMobile ? '44px' : undefined,
              minHeight: isMobile ? '44px' : undefined,
              border: isActive
                ? '3px solid hsl(var(--game-hotspot))'
                : '2px dashed hsla(var(--game-hotspot), 0.3)',
              borderRadius: '4px',
              background: isActive
                ? 'hsla(var(--game-hotspot), 0.25)'
                : 'hsla(var(--game-hotspot), 0.05)',
              boxShadow: isActive
                ? '0 0 20px rgba(91, 185, 189, 0.6), inset 0 0 10px rgba(91, 185, 189, 0.2)'
                : 'none',
            }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={handleClick}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchCancel}
            onTouchMove={handleTouchMove}
          >
            {overlayImage && (
              <img
                src={overlayImage}
                alt=""
                className={`absolute inset-0 w-full h-full object-contain pointer-events-none ${overlayAnimCls}`.trim()}
                draggable={false}
                data-object-state={objectState}
                data-anim-frames={safeFrames.length || undefined}
              />
            )}
            {displayVerb && isActive && (
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-2xl pointer-events-none animate-in fade-in zoom-in duration-200">
                {verbCursors[displayVerb]}
              </div>
            )}
            {isMobile && isActive && (
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap pixel-font text-xs bg-card/90 px-2 py-1 rounded border border-game-border text-accent pointer-events-none">
                {sentenceLine || hotspot.name}
              </div>
            )}
          </div>
        </TooltipTrigger>
        {!isMobile && isActive && (
          <TooltipContent
            side="top"
            className="pixel-font bg-card border-2 border-game-border text-accent"
          >
            {sentenceLine || hotspot.name}
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
};
