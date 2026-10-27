import React, { useCallback, useEffect } from "react";
import {
  AdventureProvider,
  useAdventure,
  type AdventureContextValue,
  type GameDefinition,
} from "@/engine";
import { resolveRoomMusicKey } from "@/engine/audio";
import { soundFX } from "@/utils/soundEffects";
import { packAudioPlayer } from "@/utils/packAudioPlayer";
import { haptics } from "@/utils/haptics";
import { useMusic } from "@/contexts/MusicContext";

/**
 * Duck synth music while dialogue / VO is on screen.
 * Must render inside AdventureProvider.
 */
const SpeechMusicDuck: React.FC = () => {
  const { currentSpeech } = useAdventure();
  const { duckMusic, restoreMusic } = useMusic();
  useEffect(() => {
    if (currentSpeech) duckMusic(0.28);
    else restoreMusic();
  }, [currentSpeech, duckMusic, restoreMusic]);
  return null;
};

async function playPackOrBuiltin(
  key: string,
  url: string | undefined,
  channel?: string
): Promise<void> {
  if (url) {
    const id = await packAudioPlayer.play(url, { key, channel });
    if (id != null) return;
  }
  soundFX.playKey(key);
}

/**
 * Host for the portable adventure engine.
 * Pass any GameDefinition — used by the multi-game launcher.
 */
export const GameProvider: React.FC<{
  definition: GameDefinition;
  children: React.ReactNode;
}> = ({ definition, children }) => {
  const music = useMusic();

  const playRoomMusic = useCallback(
    (roomId: string) => {
      const room = definition.rooms[roomId];
      const key = resolveRoomMusicKey(
        roomId,
        room?.music,
        definition.audio
      );
      music.setMusicCue(key, definition.audio);
    },
    [definition, music]
  );

  const onRoomChange = useCallback(
    (roomId: string) => {
      playRoomMusic(roomId);
    },
    [playRoomMusic]
  );

  const onMusic = useCallback(
    (key: string) => {
      music.setMusicCue(key, definition.audio);
    },
    [music, definition.audio]
  );

  const onSound = useCallback(
    (event: {
      kind: "play" | "stop";
      key?: string;
      channel?: string;
    }) => {
      if (event.kind === "stop") {
        packAudioPlayer.stop({
          key: event.key,
          channel: event.channel,
        });
        return;
      }
      if (!event.key) return;
      const url = definition.audio?.sfx?.[event.key];
      void playPackOrBuiltin(event.key, url, event.channel);
    },
    [definition.audio]
  );

  const onVoice = useCallback(
    async (key: string): Promise<number | undefined> => {
      music.duckMusic(0.22);
      const url = definition.audio?.voice?.[key];
      if (url) {
        const durationMs = await packAudioPlayer.durationMs(url);
        const id = await packAudioPlayer.play(url, {
          key,
          channel: "voice",
        });
        if (id != null) {
          return durationMs ?? undefined;
        }
      }
      soundFX.playKey(key.startsWith("tony") ? "verb" : "click");
      return undefined;
    },
    [definition.audio, music]
  );

  const onHaptic = useCallback(
    (style: Parameters<typeof haptics.play>[0]) => {
      void haptics.play(style);
    },
    []
  );

  return (
    <AdventureProvider
      definition={definition}
      onRoomChange={onRoomChange}
      onMusic={onMusic}
      onSound={onSound}
      onVoice={onVoice}
      onHaptic={onHaptic}
      sfx={{
        click: () => {
          void haptics.selection();
          soundFX.click();
        },
        pickup: () => {
          void haptics.heavy();
          void playPackOrBuiltin(
            "pickup",
            definition.audio?.sfx?.pickup,
            "ui"
          );
        },
        success: () => {
          void haptics.success();
          void playPackOrBuiltin(
            "success",
            definition.audio?.sfx?.success,
            "ui"
          );
        },
        error: () => {
          void haptics.error();
          void playPackOrBuiltin(
            "error",
            definition.audio?.sfx?.error,
            "ui"
          );
        },
      }}
    >
      <SpeechMusicDuck />
      {children}
    </AdventureProvider>
  );
};

/** Backward-compatible hook — same shape as pre-engine GameContext */
export const useGame = (): AdventureContextValue => useAdventure();

export type { AdventureContextValue as GameContextType };
