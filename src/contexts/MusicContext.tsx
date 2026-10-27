import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import {
  AmbientMusicEngine,
  getAmbientSFXForLocation,
  getThemeByPreset,
  type AmbientSFXType,
} from "@/utils/musicEngine";
import type { PackAudio } from "@/engine/audio";
import { resolveAmbientKey, resolveMusicCue } from "@/engine/audio";
import {
  resumeSharedAudioIfSuspended,
  unlockSharedAudioContext,
} from "@/utils/audioContext";
import { soundFX } from "@/utils/soundEffects";
import { packAudioPlayer } from "@/utils/packAudioPlayer";
import { safeJsonParse } from "@/engine/security";

const STORAGE_KEY = "adventure_audio_prefs";

interface AudioPrefs {
  volume: number;
  sfxVolume: number;
  muted: boolean;
}

function clamp01(n: number, fallback: number): number {
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(1, n));
}

function loadPrefs(): AudioPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { volume: 0.5, sfxVolume: 0.85, muted: false };
    const parsed = safeJsonParse<Partial<AudioPrefs>>(raw);
    return {
      volume: clamp01(
        typeof parsed.volume === "number" ? parsed.volume : 0.5,
        0.5
      ),
      sfxVolume: clamp01(
        typeof parsed.sfxVolume === "number" ? parsed.sfxVolume : 0.85,
        0.85
      ),
      muted: !!parsed.muted,
    };
  } catch {
    return { volume: 0.5, sfxVolume: 0.85, muted: false };
  }
}

function savePrefs(prefs: AudioPrefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

interface MusicContextType {
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  sfxVolume: number;
  isUnlocked: boolean;
  togglePlay: () => void;
  toggleMute: () => void;
  setVolume: (volume: number) => void;
  setSfxVolume: (volume: number) => void;
  /** @deprecated use setMusicCue with pack audio */
  setLocation: (location: string) => void;
  /** Play a pack music key (Room.music / opcode), resolving via PackAudio */
  setMusicCue: (musicKey: string, audio?: PackAudio) => void;
  unlockAudio: () => Promise<void>;
  /** Duck music/ambient for speech or VO (restore with restoreMusic). */
  duckMusic: (factor?: number) => void;
  restoreMusic: () => void;
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);

interface MusicProviderProps {
  children: React.ReactNode;
  initialLocation?: string;
}

function resolveAmbient(
  musicKey: string,
  audio?: PackAudio
): AmbientSFXType {
  const fromPack = resolveAmbientKey(musicKey, audio);
  if (
    fromPack === "rain" ||
    fromPack === "crowd" ||
    fromPack === "drip" ||
    fromPack === "wind" ||
    fromPack === "hum" ||
    fromPack === "static" ||
    fromPack === "none"
  ) {
    return fromPack;
  }
  return getAmbientSFXForLocation(musicKey);
}

export const MusicProvider: React.FC<MusicProviderProps> = ({
  children,
  initialLocation = "bedroom",
}) => {
  const prefs = loadPrefs();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(prefs.muted);
  const [volume, setVolumeState] = useState(prefs.volume);
  const [sfxVolume, setSfxVolumeState] = useState(prefs.sfxVolume);
  const [musicKey, setMusicKey] = useState(initialLocation);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const engineRef = useRef<AmbientMusicEngine | null>(null);
  const packAudioRef = useRef<PackAudio | undefined>(undefined);
  const duckFactorRef = useRef(1);
  const fileBedKeyRef = useRef<string | null>(null);

  const persist = useCallback(
    (next: Partial<AudioPrefs>) => {
      savePrefs({
        volume: next.volume ?? volume,
        sfxVolume: next.sfxVolume ?? sfxVolume,
        muted: next.muted ?? isMuted,
      });
    },
    [volume, sfxVolume, isMuted]
  );

  const unlockAudio = useCallback(async (): Promise<void> => {
    if (isUnlocked) return;
    try {
      await unlockSharedAudioContext();
      await soundFX.unlock();
      await packAudioPlayer.unlock();
      const sfxLevel = isMuted ? 0 : sfxVolume;
      soundFX.setVolume(sfxLevel);
      packAudioPlayer.setVolume(sfxLevel);
      packAudioPlayer.setMusicVolume(isMuted ? 0 : volume);
      setIsUnlocked(true);
      setIsPlaying(true);
    } catch (e) {
      console.warn("Failed to unlock audio:", e);
      setIsUnlocked(true);
    }
  }, [isUnlocked, sfxVolume, isMuted, volume]);

  useEffect(() => {
    if (!isPlaying || isMuted || !isUnlocked) {
      if (engineRef.current) {
        engineRef.current.stop();
        engineRef.current = null;
      }
      packAudioPlayer.stop({ channel: "music" });
      fileBedKeyRef.current = null;
      return;
    }

    const cue = resolveMusicCue(musicKey, packAudioRef.current);
    const ambientLoc = resolveAmbient(musicKey, packAudioRef.current);

    if (cue.kind === "file") {
      // File bed owns music; keep light ambient synth if requested
      if (engineRef.current) {
        engineRef.current.stop();
        engineRef.current = null;
      }
      const bedKey = `${musicKey}|${cue.src}`;
      if (fileBedKeyRef.current !== bedKey) {
        fileBedKeyRef.current = bedKey;
        void packAudioPlayer.play(cue.src, {
          key: musicKey,
          channel: "music",
          loop: cue.loop,
          gain: cue.gain,
        }).then((id) => {
          if (id == null && cue.fallbackPreset) {
            // Fall back to synth if decode fails
            fileBedKeyRef.current = null;
            const theme = getThemeByPreset(cue.fallbackPreset);
            const engine = new AmbientMusicEngine(theme);
            engine.start(volume, ambientLoc);
            engineRef.current = engine;
            if (duckFactorRef.current < 1) {
              engine.setDuckFactor(duckFactorRef.current, 0.05);
            }
          }
        });
      }
      return;
    }

    // Synth path
    packAudioPlayer.stop({ channel: "music" });
    fileBedKeyRef.current = null;
    const theme = getThemeByPreset(cue.preset);

    if (engineRef.current) {
      engineRef.current.crossfadeTo(theme);
      engineRef.current.setAmbientLocation(ambientLoc);
    } else {
      const engine = new AmbientMusicEngine(theme);
      engine.start(volume, ambientLoc);
      engineRef.current = engine;
    }

    return () => {
      /* keep engine across cue changes */
    };
  }, [isPlaying, isMuted, isUnlocked, musicKey, volume]);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setVolume(volume);
      if (duckFactorRef.current < 1) {
        engineRef.current.setDuckFactor(duckFactorRef.current, 0.05);
      }
    }
    packAudioPlayer.setMusicVolume(isMuted || !isPlaying ? 0 : volume);
  }, [volume, isMuted, isPlaying]);

  useEffect(() => {
    const level = isMuted ? 0 : sfxVolume;
    soundFX.setVolume(level);
    packAudioPlayer.setVolume(level);
  }, [sfxVolume, isMuted]);

  const duckMusic = useCallback((factor = 0.28) => {
    duckFactorRef.current = factor;
    engineRef.current?.setDuckFactor(factor, 0.22);
    packAudioPlayer.setMusicDuckFactor(factor);
  }, []);

  const restoreMusic = useCallback(() => {
    duckFactorRef.current = 1;
    engineRef.current?.setDuckFactor(1, 0.45);
    packAudioPlayer.setMusicDuckFactor(1);
  }, []);

  useEffect(() => {
    return () => {
      if (engineRef.current) {
        engineRef.current.stop();
        engineRef.current = null;
      }
      packAudioPlayer.stop({ channel: "music" });
    };
  }, []);

  // iOS / Capacitor WKWebView: AudioContext suspends when the app backgrounds.
  // visibilitychange + pageshow/focus cover web and native shell resume
  // (Capacitor appStateChange is equivalent — no @capacitor/app required).
  useEffect(() => {
    if (!isUnlocked) return;

    const resume = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }
      void resumeSharedAudioIfSuspended();
    };

    const onVis = () => {
      if (document.visibilityState === "visible") resume();
    };

    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pageshow", resume);
    window.addEventListener("focus", resume);

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pageshow", resume);
      window.removeEventListener("focus", resume);
    };
  }, [isUnlocked]);

  const togglePlay = () => setIsPlaying((p) => !p);
  const toggleMute = () => {
    setIsMuted((m) => {
      const next = !m;
      persist({ muted: next });
      return next;
    });
  };
  const setVolume = (newVolume: number) => {
    setVolumeState(newVolume);
    persist({ volume: newVolume });
  };
  const setSfxVolume = (newVolume: number) => {
    setSfxVolumeState(newVolume);
    persist({ sfxVolume: newVolume });
  };
  const setLocation = (location: string) => setMusicKey(location);
  const setMusicCue = useCallback((key: string, audio?: PackAudio) => {
    packAudioRef.current = audio;
    setMusicKey(key);
  }, []);

  return (
    <MusicContext.Provider
      value={{
        isPlaying,
        isMuted,
        volume,
        sfxVolume,
        isUnlocked,
        togglePlay,
        toggleMute,
        setVolume,
        setSfxVolume,
        setLocation,
        setMusicCue,
        unlockAudio,
        duckMusic,
        restoreMusic,
      }}
    >
      {children}
    </MusicContext.Provider>
  );
};

export const useMusic = () => {
  const context = useContext(MusicContext);
  if (!context) {
    throw new Error("useMusic must be used within MusicProvider");
  }
  return context;
};
