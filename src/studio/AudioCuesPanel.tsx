import {
  AMBIENT_IDS,
  MUSIC_PRESET_HINTS,
  MUSIC_PRESET_IDS,
  type AmbientId,
  type DraftMusicCue,
  type MusicPresetId,
} from "@/authoring/audioPresets";

export interface AudioCuesPanelProps {
  cues: DraftMusicCue[];
  cueName: string;
  cuePreset: MusicPresetId;
  cueAmbient: AmbientId;
  cueFileSrc: string;
  onCueNameChange: (v: string) => void;
  onCuePresetChange: (v: MusicPresetId) => void;
  onCueAmbientChange: (v: AmbientId) => void;
  onCueFileSrcChange: (v: string) => void;
  onAddCue: () => void;
  onRemoveCue: (cue: string) => void;
  onPreviewMusic: (preset: MusicPresetId, fileSrc?: string) => void;
}

/**
 * Music cue editor — extracted from AudioTool.
 */
export function AudioCuesPanel({
  cues,
  cueName,
  cuePreset,
  cueAmbient,
  cueFileSrc,
  onCueNameChange,
  onCuePresetChange,
  onCueAmbientChange,
  onCueFileSrcChange,
  onAddCue,
  onRemoveCue,
  onPreviewMusic,
}: AudioCuesPanelProps) {
  return (
    <section className="border border-game-border bg-game-ui/90 p-4 space-y-3">
      <h3 className="pixel-font text-sm text-accent">Music cues</h3>
      <p className="text-xs text-muted-foreground">
        Named cues map to synth presets or{" "}
        <strong className="font-normal text-foreground">file beds</strong> (
        <code className="text-accent">/audio/loop.mp3</code>). Rooms reference
        a cue via <code className="text-accent">music</code>.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-xs space-y-1 col-span-2 sm:col-span-1">
          <span className="text-muted-foreground">Cue id</span>
          <input
            className="w-full bg-background border border-border px-2 py-2 min-h-[40px]"
            value={cueName}
            onChange={(e) => onCueNameChange(e.target.value)}
          />
        </label>
        <label className="block text-xs space-y-1">
          <span className="text-muted-foreground">Preset / fallback</span>
          <select
            className="w-full bg-background border border-border px-2 py-2 min-h-[40px]"
            value={cuePreset}
            onChange={(e) =>
              onCuePresetChange(e.target.value as MusicPresetId)
            }
          >
            {MUSIC_PRESET_IDS.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs space-y-1 col-span-2">
          <span className="text-muted-foreground">
            File bed URL (optional)
          </span>
          <input
            className="w-full bg-background border border-border px-2 py-2 min-h-[40px] font-mono text-[11px]"
            value={cueFileSrc}
            onChange={(e) => onCueFileSrcChange(e.target.value)}
            placeholder="/audio/my-loop.mp3"
          />
        </label>
        <label className="block text-xs space-y-1 col-span-2">
          <span className="text-muted-foreground">Ambient bed</span>
          <select
            className="w-full bg-background border border-border px-2 py-2 min-h-[40px]"
            value={cueAmbient}
            onChange={(e) => onCueAmbientChange(e.target.value as AmbientId)}
          >
            {AMBIENT_IDS.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
          <span className="text-[10px] text-muted-foreground">
            {MUSIC_PRESET_HINTS[cuePreset]}
          </span>
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onAddCue}
          className="pixel-font text-xs min-h-[40px] px-3 border-2 border-accent text-accent"
        >
          Add cue
        </button>
        <button
          type="button"
          onClick={() => onPreviewMusic(cuePreset, cueFileSrc || undefined)}
          className="pixel-font text-xs min-h-[40px] px-3 border border-game-border"
        >
          Preview
        </button>
      </div>
      <ul className="text-xs space-y-1 max-h-36 overflow-y-auto">
        {cues.map((c) => (
          <li
            key={c.cue}
            className="flex justify-between gap-2 border border-border/60 px-2 py-1.5"
          >
            <span>
              <span className="text-accent">{c.cue}</span> →{" "}
              {c.fileSrc ? `file ${c.fileSrc}` : c.preset}
              {c.ambient !== "none" ? ` + ${c.ambient}` : ""}
            </span>
            <span className="flex gap-2 shrink-0">
              <button
                type="button"
                className="text-primary"
                onClick={() => onPreviewMusic(c.preset, c.fileSrc)}
              >
                ▶
              </button>
              <button
                type="button"
                className="text-destructive"
                onClick={() => onRemoveCue(c.cue)}
              >
                ✕
              </button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
