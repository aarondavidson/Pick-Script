import { useState } from "react";
import { fileToDataUrl } from "@/studio/packDraft";
import { toast } from "@/hooks/use-toast";

export interface GuidedStateEditorProps {
  initialState?: number;
  stateOverlays?: Record<string, string>;
  onChange: (patch: {
    initialState?: number;
    stateOverlays?: Record<string, string>;
  }) => void;
}

/**
 * Guided UI for hotspot initialState + stateOverlays.
 */
export function GuidedStateEditor({
  initialState = 0,
  stateOverlays = {},
  onChange,
}: GuidedStateEditorProps) {
  const [newState, setNewState] = useState(1);
  const keys = Object.keys(stateOverlays).sort(
    (a, b) => Number(a) - Number(b)
  );

  const onOverlayFile = async (stateKey: string, file: File | null) => {
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      onChange({
        initialState,
        stateOverlays: { ...stateOverlays, [stateKey]: dataUrl },
      });
      toast({ title: `State ${stateKey} overlay set` });
    } catch (e) {
      toast({
        title: "Image rejected",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-2 border border-border/60 px-3 py-2">
      <p className="pixel-font text-[10px] text-accent">
        Hotspot state skins
      </p>
      <p className="text-[10px] text-muted-foreground leading-relaxed">
        State 0 = closed/default, state 1 = open/used. Upload overlay art per
        state so the prop changes when the puzzle advances.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="pixel-font text-[9px] min-h-[32px] px-2 border border-game-border"
          onClick={() => {
            onChange({
              initialState: 0,
              stateOverlays: {
                "0": stateOverlays["0"] ?? "",
                "1": stateOverlays["1"] ?? "",
              },
            });
          }}
        >
          Preset closed→open (0/1)
        </button>
      </div>
      <label className="block text-xs space-y-1">
        <span className="text-muted-foreground">Initial state</span>
        <input
          type="number"
          min={0}
          className="w-full bg-background border border-border px-2 py-2 min-h-[36px]"
          value={initialState}
          onChange={(e) =>
            onChange({
              initialState: Math.max(0, Number(e.target.value) || 0),
              stateOverlays,
            })
          }
        />
      </label>
      <ul className="space-y-1 text-xs">
        {keys.map((k) => (
          <li
            key={k}
            className="flex flex-wrap items-center justify-between gap-2 border border-border/40 px-2 py-1.5"
          >
            <span>
              State {k}
              {stateOverlays[k] ? (
                <span className="text-primary ml-2">has art</span>
              ) : (
                <span className="text-muted-foreground ml-2">no art</span>
              )}
            </span>
            <span className="flex gap-2">
              <label className="text-accent underline cursor-pointer">
                Upload
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) =>
                    void onOverlayFile(k, e.target.files?.[0] ?? null)
                  }
                />
              </label>
              <button
                type="button"
                className="text-destructive"
                onClick={() => {
                  const next = { ...stateOverlays };
                  delete next[k];
                  onChange({ initialState, stateOverlays: next });
                }}
              >
                ✕
              </button>
            </span>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2 items-end">
        <label className="block text-xs space-y-1">
          <span className="text-muted-foreground">Add state #</span>
          <input
            type="number"
            min={1}
            className="w-20 bg-background border border-border px-2 py-2 min-h-[36px]"
            value={newState}
            onChange={(e) => setNewState(Math.max(1, Number(e.target.value) || 1))}
          />
        </label>
        <button
          type="button"
          className="pixel-font text-[10px] min-h-[36px] px-3 border border-accent text-accent"
          onClick={() => {
            const key = String(newState);
            if (stateOverlays[key] !== undefined) return;
            onChange({
              initialState,
              stateOverlays: { ...stateOverlays, [key]: "" },
            });
          }}
        >
          Add state slot
        </button>
      </div>
    </div>
  );
}
