import { useEffect, useRef } from "react";
import { useGame } from "@/contexts/GameContext";
import { useMusic } from "@/contexts/MusicContext";
import { Button } from "@/components/ui/button";
import { soundFX } from "@/utils/soundEffects";
import { packAudioPlayer } from "@/utils/packAudioPlayer";
import { createSpeechLine } from "@/engine/speech";
import { panTo, setCameraFollow, zoomTo } from "@/engine/camera";

/**
 * Engine-driven cutscene presentation: locks input, starts line effects.
 * Auto-advance / waitForSpeech / waitForWalk / durationMs sync lives in
 * useCutsceneHost. A single line may start walkTo + sayLine together.
 */
export const CutsceneOverlay = () => {
  const {
    cutscene,
    cutsceneLine,
    advanceCutsceneLine,
    skipActiveCutscene,
    walkEgoTo,
    definition,
    updateGameState,
    enqueueSpeech,
    gameState,
    runtime,
    playJuice,
  } = useGame();
  const { setMusicCue } = useMusic();
  const lineKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!cutscene?.active || !cutsceneLine) return;
    const key = `${cutscene.def.id}:${cutscene.lineIndex}`;
    if (lineKeyRef.current === key) return;
    lineKeyRef.current = key;

    if (cutsceneLine.setFlag?.flag) {
      updateGameState({
        flags: {
          [cutsceneLine.setFlag.flag]: cutsceneLine.setFlag.value !== false,
        },
      });
    }

    if (cutsceneLine.juice) {
      playJuice(cutsceneLine.juice);
    }

    if (cutsceneLine.music?.trim()) {
      setMusicCue(cutsceneLine.music.trim(), definition.audio);
    }

    if (cutsceneLine.sayLine?.text?.trim()) {
      const actorId =
        cutsceneLine.sayLine.actorId?.trim() ||
        gameState.egoId ||
        definition.egoId ||
        "player";
      const actorDef = definition.actors?.[actorId];
      const durationMs = cutsceneLine.sayLine.durationMs ?? 2800;
      const voiceKey = cutsceneLine.sayLine.voiceKey?.trim();
      enqueueSpeech(
        createSpeechLine({
          actorId,
          text: cutsceneLine.sayLine.text.trim(),
          until: performance.now() + durationMs,
          portrait: actorDef?.portrait,
          voiceKey: voiceKey || undefined,
          skippable: true,
        })
      );
    }

    if (cutsceneLine.sound) {
      const soundKey = cutsceneLine.sound;
      const url = definition.audio?.sfx?.[soundKey];
      void (async () => {
        await soundFX.unlock();
        await packAudioPlayer.unlock();
        if (url) {
          const id = await packAudioPlayer.play(url, {
            key: soundKey,
            channel: "cutscene",
          });
          if (id != null) return;
        }
        soundFX.playKey(soundKey);
      })();
    }

    // Parallel: start walk alongside sayLine when both are on this line
    if (cutsceneLine.walkTo) {
      walkEgoTo(cutsceneLine.walkTo.x, cutsceneLine.walkTo.y);
    }

    if (cutsceneLine.camera) {
      const room = runtime.getRoom(gameState.currentLocation);
      const roomSize = runtime.getRoomSize(room);
      updateGameState({
        camera: (() => {
          let cam = gameState.camera;
          const c = cutsceneLine.camera!;
          if (c.follow !== undefined) {
            cam = setCameraFollow(cam, c.follow);
          }
          if (c.pan) {
            cam = panTo(
              cam,
              c.pan.x,
              c.pan.y,
              roomSize,
              c.pan.durationMs ?? 0
            );
          }
          if (typeof c.zoom === "number") {
            cam = zoomTo(cam, c.zoom, roomSize, c.zoomDurationMs ?? 0);
          }
          return cam;
        })(),
      });
    }
  }, [
    cutscene,
    cutsceneLine,
    walkEgoTo,
    definition.audio,
    definition.actors,
    definition.egoId,
    updateGameState,
    enqueueSpeech,
    setMusicCue,
    playJuice,
    gameState.egoId,
    gameState.camera,
    gameState.currentLocation,
    runtime,
  ]);

  useEffect(() => {
    if (!cutscene?.active) lineKeyRef.current = null;
  }, [cutscene?.active]);

  if (!cutscene?.active || !cutsceneLine) return null;

  const skippable = cutscene.def.skippable !== false;
  const silent =
    !cutsceneLine.text?.trim() &&
    !cutsceneLine.subtext?.trim() &&
    !cutsceneLine.speaker;

  // Wait / walk / sound / flag / music / sayLine beats: lock input, minimal chrome
  if (silent) {
    return (
      <div
        className="fixed inset-0 z-[100] bg-black/40"
        role="dialog"
        aria-modal="true"
        aria-label="Cutscene beat"
        onClick={advanceCutsceneLine}
      />
    );
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/80 p-4 md:p-8"
      onClick={advanceCutsceneLine}
      role="dialog"
      aria-modal="true"
      aria-label="Cutscene"
    >
      <div
        className="w-full max-w-2xl bg-game-ui border-2 border-primary p-4 md:p-6 shadow-lg animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {cutsceneLine.speaker && (
          <p className="pixel-font text-primary text-xs md:text-sm mb-2">
            {cutsceneLine.speaker}
          </p>
        )}
        <p className="pixel-font text-foreground text-sm md:text-base leading-relaxed">
          {cutsceneLine.text}
        </p>
        {cutsceneLine.subtext && (
          <p className="text-xs md:text-sm text-muted-foreground mt-2">
            {cutsceneLine.subtext}
          </p>
        )}
        <div className="flex items-center justify-between gap-2 mt-4">
          <p className="text-[10px] md:text-xs text-muted-foreground pixel-font">
            Click / Space / Enter to continue
            {skippable ? " · Esc to skip" : ""}
          </p>
          <div className="flex gap-2">
            {skippable && (
              <Button
                variant="outline"
                size="sm"
                className="pixel-font text-xs"
                onClick={skipActiveCutscene}
              >
                Skip
              </Button>
            )}
            <Button
              size="sm"
              className="pixel-font text-xs"
              onClick={advanceCutsceneLine}
            >
              Continue
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
