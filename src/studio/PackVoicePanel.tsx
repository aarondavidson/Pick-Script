import { useMemo, useRef, useState } from "react";
import type { JsonPackDocument } from "@/engine/jsonPack";
import { extractPackStrings } from "@/engine/lineCatalog";
import { MAX_INLINE_AUDIO_CHARS, isSafeAudioUrl } from "@/engine/security";
import { toastFail, toastOk } from "@/studio/toastError";

export interface PackVoicePanelProps {
  doc: JsonPackDocument;
  onChange: (doc: JsonPackDocument) => void;
}

const MAX_ROWS = 150;

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

/**
 * Voice acting: attach a recording to each spoken line.
 * Lines come from the pack's dialogue and cutscene speech; each has a voice
 * key, and a clip stored under that key plays when the line is spoken.
 */
export function PackVoicePanel({ doc, onChange }: PackVoicePanelProps) {
  const [filter, setFilter] = useState("");
  const [onlyMissing, setOnlyMissing] = useState(false);
  const playing = useRef<HTMLAudioElement | null>(null);
  const voice = useMemo(() => doc.audio?.voice ?? {}, [doc.audio?.voice]);

  const lines = useMemo(
    () => extractPackStrings(doc).filter((r) => !!r.voiceKey),
    [doc]
  );
  const voiced = lines.filter((r) => !!voice[r.voiceKey!]).length;
  const q = filter.trim().toLowerCase();
  const shown = lines.filter(
    (r) =>
      (!onlyMissing || !voice[r.voiceKey!]) &&
      (!q ||
        r.text.toLowerCase().includes(q) ||
        r.voiceKey!.toLowerCase().includes(q))
  );

  const setClip = (key: string, url: string | null) => {
    const next = { ...voice };
    if (url) next[key] = url;
    else delete next[key];
    onChange({
      ...doc,
      audio: {
        ...(doc.audio ?? {}),
        voice: Object.keys(next).length ? next : undefined,
      },
    });
  };

  const upload = async (key: string, file: File) => {
    if (!file.type.startsWith("audio/")) {
      toastFail("Not an audio file", "Use MP3, OGG, WAV or M4A.");
      return;
    }
    let url = "";
    try {
      url = await readAsDataUrl(file);
    } catch {
      toastFail("Could not read that file");
      return;
    }
    if (url.length > MAX_INLINE_AUDIO_CHARS) {
      toastFail(
        "Recording too large",
        "Keep each line under about 1.5 MB — export as MP3 or OGG, mono, 96 kbps."
      );
      return;
    }
    if (!isSafeAudioUrl(url)) {
      toastFail("Unsupported audio format", "Use MP3, OGG, WAV or M4A.");
      return;
    }
    setClip(key, url);
    toastOk("Voice line added");
  };

  const play = (url: string) => {
    playing.current?.pause();
    const audio = new Audio(url);
    playing.current = audio;
    void audio.play().catch(() => toastFail("Could not play that recording"));
  };

  return (
    <section className="border border-game-border bg-game-ui/90 p-4 space-y-3">
      <div>
        <h3 className="pixel-font text-sm text-accent">Voice acting</h3>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          Add a recording to any spoken line. It plays when the line is said,
          the music dips under it, and skipping the line stops it. Lines
          without a recording stay text-only.
        </p>
      </div>

      {lines.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No spoken lines yet. Add dialogue to a character, or a “say” step to
          a cutscene, and they appear here.
        </p>
      ) : (
        <>
          <p className="text-xs" data-testid="voice-progress">
            <span className="text-accent">{voiced}</span> of {lines.length}{" "}
            lines have a recording.
          </p>
          <div className="flex flex-wrap gap-2 items-center">
            <input
              className="flex-1 min-w-[10rem] bg-background border border-border px-2 py-2 min-h-[40px] text-xs"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search lines…"
              aria-label="Search lines"
            />
            <label className="text-xs flex items-center gap-2 min-h-[40px]">
              <input
                type="checkbox"
                checked={onlyMissing}
                onChange={(e) => setOnlyMissing(e.target.checked)}
              />
              Only lines without a recording
            </label>
          </div>
          <ul className="space-y-2 max-h-[22rem] overflow-y-auto pr-1">
            {shown.slice(0, MAX_ROWS).map((row) => {
              const key = row.voiceKey!;
              const url = voice[key];
              return (
                <li
                  key={row.lineId}
                  className="border border-border/60 p-2 space-y-1.5"
                >
                  <p className="text-xs leading-snug">“{row.text}”</p>
                  <p className="text-[10px] text-muted-foreground font-mono break-all">
                    {key}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <label className="pixel-font text-[11px] min-h-[36px] px-3 border border-accent text-accent inline-flex items-center cursor-pointer">
                      {url ? "Replace recording" : "Add recording"}
                      <input
                        type="file"
                        accept="audio/*"
                        className="sr-only"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          e.target.value = "";
                          if (file) void upload(key, file);
                        }}
                      />
                    </label>
                    {url && (
                      <>
                        <button
                          type="button"
                          className="pixel-font text-[11px] min-h-[36px] px-3 border border-game-border"
                          onClick={() => play(url)}
                        >
                          Play
                        </button>
                        <button
                          type="button"
                          className="pixel-font text-[11px] min-h-[36px] px-3 border border-destructive/50 text-destructive"
                          onClick={() => setClip(key, null)}
                        >
                          Remove
                        </button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          {shown.length > MAX_ROWS && (
            <p className="text-[10px] text-muted-foreground">
              Showing the first {MAX_ROWS} of {shown.length} — search to narrow
              it down.
            </p>
          )}
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Recordings make a game large. Share a voiced game with{" "}
            <strong className="font-normal text-foreground">
              Download for web hosting
            </strong>{" "}
            (recordings become separate files) rather than the single
            .pack.json. For a translated voice track, add entries named{" "}
            <code className="text-accent">key@locale</code> (for example{" "}
            <code className="text-accent">…hello@es</code>) to the pack’s voice
            list.
          </p>
        </>
      )}
    </section>
  );
}
