import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import type { AdventureRuntime } from "../createGame";
import type { GameState } from "../types";
import { applyStatePatch } from "../state";
import { setActorAnimState } from "../actors";
import { pruneSpeech, type SpeechLine } from "../speech";

export interface UseSpeechHostArgs {
  runtime: AdventureRuntime;
  setGameState: Dispatch<SetStateAction<GameState>>;
  /** Updated by cutscene host — avoids ordering deps with useTravel. */
  cutsceneActiveRef: MutableRefObject<boolean>;
  onVoice?: (
    voiceKey: string
  ) => void | Promise<number | null | undefined>;
}

/**
 * Speech bar queue / skip / voice playback / VO duration extend.
 */
export function useSpeechHost({
  runtime,
  setGameState,
  cutsceneActiveRef,
  onVoice,
}: UseSpeechHostArgs) {
  const [sayLines, setSayLines] = useState<SpeechLine[]>([]);

  const extendSpeechFromVoice = useCallback(
    (line: SpeechLine, durationMs: number) => {
      if (!durationMs || durationMs < 200) return;
      const until = performance.now() + durationMs + 80;
      setSayLines((prev) =>
        prev.map((l) => (l.id === line.id ? { ...l, until } : l))
      );
      if (line.scriptId) {
        setGameState((prev) => {
          const scripts = prev.activeScripts ?? [];
          let changed = false;
          const nextScripts = scripts.map((s) => {
            if (s.id !== line.scriptId) return s;
            if ((s.waitUntil ?? 0) >= until) return s;
            changed = true;
            return { ...s, waitUntil: until };
          });
          return changed
            ? applyStatePatch(prev, { activeScripts: nextScripts })
            : prev;
        });
      }
    },
    [setGameState]
  );

  const fireVoice = useCallback(
    (line: SpeechLine) => {
      if (!line.voiceKey || !onVoice) return;
      const result = onVoice(line.voiceKey);
      if (result && typeof (result as Promise<unknown>).then === "function") {
        void (result as Promise<number | null | undefined>).then((ms) => {
          if (typeof ms === "number" && ms > 0) {
            extendSpeechFromVoice(line, ms);
          }
        });
      }
    },
    [onVoice, extendSpeechFromVoice]
  );
  const fireVoiceRef = useRef(fireVoice);
  fireVoiceRef.current = fireVoice;

  const skipSpeech = useCallback(() => {
    const now = performance.now();
    const live = pruneSpeech(sayLines, now);
    const skippable = live.filter((l) => l.skippable);
    if (!skippable.length) return;

    const scriptIds = skippable
      .map((l) => l.scriptId)
      .filter((id): id is string => !!id);

    setSayLines([]);
    setGameState((prev) =>
      runtime.skipScriptSpeechWaits(
        prev,
        now,
        scriptIds.length ? scriptIds : undefined
      )
    );
  }, [sayLines, runtime, setGameState]);

  const enqueueSpeech = useCallback(
    (line: SpeechLine) => {
      const now = performance.now();
      setSayLines((prev) => [...pruneSpeech(prev, now), line]);
      if (line.actorId) {
        setGameState((prev) =>
          applyStatePatch(prev, setActorAnimState(prev, line.actorId!, "talk"))
        );
      }
      fireVoice(line);
    },
    [fireVoice, setGameState]
  );

  const playVoice = useCallback(
    (voiceKey: string) => {
      if (voiceKey?.trim()) void onVoice?.(voiceKey.trim());
    },
    [onVoice]
  );

  const currentSpeech = sayLines.length
    ? sayLines[sayLines.length - 1]
    : null;

  // Click / Space skips active speech
  useEffect(() => {
    if (!currentSpeech?.skippable) return;
    const onKey = (e: KeyboardEvent) => {
      if (cutsceneActiveRef.current) return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        skipSpeech();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [currentSpeech, cutsceneActiveRef, skipSpeech]);

  return {
    sayLines,
    setSayLines,
    currentSpeech,
    skipSpeech,
    enqueueSpeech,
    playVoice,
    fireVoiceRef: fireVoiceRef as MutableRefObject<(line: SpeechLine) => void>,
  };
}
