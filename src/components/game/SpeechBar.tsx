import { useState } from "react";
import { useGame } from "@/contexts/GameContext";
import { mouthShapeClass } from "@/engine/speech";
import { cssPlayUrlValue, safeCssColor, safePlayMediaUrl } from "@/engine/security";
import { useMouthShape } from "@/hooks/useMouthShape";
import {
  getCaptionsEnabled,
  getTextScale,
  textScaleClass,
} from "@/utils/playPrefs";

/**
 * First-class speech UI: portrait + line + click-to-skip.
 * Actor bubbles still render above sprites; this bar appears when a portrait exists
 * or when speech has no on-screen actor.
 */
export const SpeechBar = () => {
  const { currentSpeech, skipSpeech, runtime, inputLocked } = useGame();
  const [captionsOn] = useState(() => getCaptionsEnabled());
  const [textScale] = useState(() => getTextScale());
  const mouthShape = useMouthShape(currentSpeech);

  if (!currentSpeech || inputLocked) return null;

  const def = currentSpeech.actorId
    ? runtime.getActorDef(currentSpeech.actorId)
    : null;
  const portrait = safePlayMediaUrl(currentSpeech.portrait ?? def?.portrait);
  const name = def?.name;
  const talkColor = safeCssColor(def?.talkColor) ?? "#f5e6a8";
  const showBar = !!portrait || !currentSpeech.actorId;

  if (!showBar) {
    return (
      <button
        type="button"
        className="fixed inset-0 z-[60] cursor-default bg-transparent"
        aria-label="Skip speech"
        onClick={skipSpeech}
      />
    );
  }

  if (!captionsOn && !portrait) {
    return (
      <button
        type="button"
        className="fixed inset-0 z-[60] cursor-default bg-transparent"
        aria-label="Skip speech"
        onClick={skipSpeech}
      />
    );
  }

  const portraitBg = portrait ? cssPlayUrlValue(portrait) : undefined;
  const lineText = currentSpeech.text;

  return (
    <button
      type="button"
      className="fixed bottom-20 md:bottom-24 left-1/2 -translate-x-1/2 z-[60] w-[min(36rem,calc(100%-1.5rem))] bg-game-ui/95 border-2 border-primary px-3 py-2 md:px-4 md:py-3 flex gap-3 items-start text-left shadow-lg animate-in fade-in slide-in-from-bottom-2"
      onClick={skipSpeech}
      aria-label="Speech — click to skip"
    >
      {(portrait || def) && (
        <div
          className={`speech-portrait shrink-0 w-14 h-14 md:w-16 md:h-16 border-2 bg-cover bg-center rounded-sm relative ${mouthShapeClass(mouthShape)}`}
          style={{
            borderColor: talkColor,
            backgroundImage: portraitBg,
            backgroundColor: talkColor,
          }}
          data-portrait={portrait || undefined}
          data-mouth-shape={mouthShape}
        />
      )}
      <div className="min-w-0 flex-1">
        {name && (
          <p
            className="pixel-font text-xs md:text-sm mb-1"
            style={{ color: talkColor }}
          >
            {name}
          </p>
        )}
        {captionsOn && (
          <p
            className={`pixel-font text-foreground leading-relaxed ${textScaleClass(textScale)}`}
          >
            {lineText}
          </p>
        )}
        {currentSpeech.skippable && (
          <p className="text-[10px] text-muted-foreground mt-1 pixel-font">
            Click / Space to skip
            {!captionsOn ? " · captions off" : ""}
          </p>
        )}
      </div>
    </button>
  );
};
