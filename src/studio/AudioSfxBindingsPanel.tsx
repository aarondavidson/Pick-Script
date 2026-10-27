import {
  BUILTIN_SFX_KEYS,
  type DraftCustomSfx,
  type DraftSfxBinding,
} from "@/authoring/audioPresets";
import { suggestId } from "@/authoring/codegen";

export interface AudioSfxBindingsPanelProps {
  bindings: DraftSfxBinding[];
  bindHotspot: string;
  bindWhen: "interact" | "useWith";
  bindKey: string;
  customSfx: DraftCustomSfx[];
  customKey: string;
  customFile: string;
  packHotspots: Array<{ id: string; name: string; roomId: string }>;
  onBindHotspotChange: (v: string) => void;
  onBindWhenChange: (v: "interact" | "useWith") => void;
  onBindKeyChange: (v: string) => void;
  onCustomKeyChange: (v: string) => void;
  onCustomFileChange: (v: string) => void;
  onAddBinding: () => void;
  onRemoveBinding: (hotspotId: string, when: "interact" | "useWith") => void;
  onAddCustomSfx: () => void;
  onRemoveCustomSfx: (key: string) => void;
  onPreviewSfx: (key: string) => void;
  onCopyBindings: () => void;
}

/**
 * SFX library + interaction bindings — extracted from AudioTool.
 */
export function AudioSfxBindingsPanel({
  bindings,
  bindHotspot,
  bindWhen,
  bindKey,
  customSfx,
  customKey,
  customFile,
  packHotspots,
  onBindHotspotChange,
  onBindWhenChange,
  onBindKeyChange,
  onCustomKeyChange,
  onCustomFileChange,
  onAddBinding,
  onRemoveBinding,
  onAddCustomSfx,
  onRemoveCustomSfx,
  onPreviewSfx,
  onCopyBindings,
}: AudioSfxBindingsPanelProps) {
  return (
    <>
      <section className="border border-game-border bg-game-ui/90 p-4 space-y-3">
        <h3 className="pixel-font text-sm text-accent">SFX library</h3>
        <p className="text-xs text-muted-foreground">
          Built-ins work with no files. Custom keys need MP3 under{" "}
          <code className="text-accent">assets/sfx/</code> for TS packs.
        </p>
        <ul className="text-xs space-y-1 max-h-40 overflow-y-auto">
          {BUILTIN_SFX_KEYS.map((s) => (
            <li
              key={s.key}
              className="flex justify-between gap-2 border border-border/60 px-2 py-1.5"
            >
              <span>
                <code className="text-accent">{s.key}</code>{" "}
                <span className="text-muted-foreground">{s.hint}</span>
              </span>
              <button
                type="button"
                className="text-primary shrink-0"
                onClick={() => onPreviewSfx(s.key)}
              >
                ▶
              </button>
            </li>
          ))}
        </ul>
        <div className="grid grid-cols-2 gap-2 border-t border-border pt-3">
          <label className="block text-xs space-y-1">
            <span className="text-muted-foreground">Custom key</span>
            <input
              className="w-full bg-background border border-border px-2 py-2 min-h-[40px]"
              value={customKey}
              onChange={(e) => {
                onCustomKeyChange(e.target.value);
                onCustomFileChange(
                  `${suggestId(e.target.value, "sfx").replace(/_/g, "-")}.mp3`
                );
              }}
            />
          </label>
          <label className="block text-xs space-y-1">
            <span className="text-muted-foreground">Filename</span>
            <input
              className="w-full bg-background border border-border px-2 py-2 min-h-[40px]"
              value={customFile}
              onChange={(e) => onCustomFileChange(e.target.value)}
            />
          </label>
        </div>
        <button
          type="button"
          onClick={onAddCustomSfx}
          className="pixel-font text-xs min-h-[40px] px-3 border border-game-border"
        >
          Add custom SFX key
        </button>
        {customSfx.length > 0 && (
          <ul className="text-xs space-y-1">
            {customSfx.map((s) => (
              <li key={s.key} className="flex justify-between px-1">
                <span>
                  {s.key} → assets/sfx/{s.filename}
                </span>
                <button
                  type="button"
                  className="text-destructive"
                  onClick={() => onRemoveCustomSfx(s.key)}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border border-game-border bg-game-ui/90 p-4 space-y-3">
        <h3 className="pixel-font text-sm text-accent">
          Interaction SFX bindings
        </h3>
        <p className="text-xs text-muted-foreground">
          Bind sounds to hotspot ids from the pack draft. Apply writes{" "}
          <code className="text-accent">interactSound</code> /{" "}
          <code className="text-accent">useWithSound</code>.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-xs space-y-1 col-span-2">
            <span className="text-muted-foreground">Hotspot</span>
            {packHotspots.length ? (
              <select
                className="w-full bg-background border border-border px-2 py-2 min-h-[40px]"
                value={bindHotspot}
                onChange={(e) => onBindHotspotChange(e.target.value)}
              >
                {packHotspots.map((h) => (
                  <option key={`${h.roomId}-${h.id}`} value={h.id}>
                    {h.name} ({h.id})
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="w-full bg-background border border-border px-2 py-2 min-h-[40px]"
                value={bindHotspot}
                onChange={(e) => onBindHotspotChange(e.target.value)}
              />
            )}
          </label>
          <label className="block text-xs space-y-1">
            <span className="text-muted-foreground">When</span>
            <select
              className="w-full bg-background border border-border px-2 py-2 min-h-[40px]"
              value={bindWhen}
              onChange={(e) =>
                onBindWhenChange(e.target.value as "interact" | "useWith")
              }
            >
              <option value="interact">Interact (verb)</option>
              <option value="useWith">Use-with item</option>
            </select>
          </label>
          <label className="block text-xs space-y-1">
            <span className="text-muted-foreground">Sound key</span>
            <select
              className="w-full bg-background border border-border px-2 py-2 min-h-[40px]"
              value={bindKey}
              onChange={(e) => onBindKeyChange(e.target.value)}
            >
              {BUILTIN_SFX_KEYS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.key}
                </option>
              ))}
              {customSfx.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.key} (custom)
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onAddBinding}
            className="pixel-font text-xs min-h-[40px] px-3 border-2 border-accent text-accent"
          >
            Bind sound
          </button>
          <button
            type="button"
            onClick={() => onPreviewSfx(bindKey)}
            className="pixel-font text-xs min-h-[40px] px-3 border border-game-border"
          >
            Preview SFX
          </button>
        </div>
        <ul className="text-xs space-y-1 max-h-32 overflow-y-auto">
          {bindings.map((b) => (
            <li
              key={`${b.hotspotId}-${b.when}`}
              className="flex justify-between border border-border/60 px-2 py-1.5"
            >
              <span>
                {b.hotspotId} · {b.when} →{" "}
                <code className="text-accent">{b.soundKey}</code>
              </span>
              <button
                type="button"
                className="text-destructive"
                onClick={() => onRemoveBinding(b.hotspotId, b.when)}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          disabled={!bindings.length}
          onClick={onCopyBindings}
          className="pixel-font text-xs min-h-[40px] w-full border border-accent text-accent disabled:opacity-40"
        >
          Copy hotspot sound fields
        </button>
      </section>
    </>
  );
}
