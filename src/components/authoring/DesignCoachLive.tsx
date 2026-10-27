import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  analyzeGameDefinition,
  filterSuggestions,
} from "@/authoring/designCoach";
import type { GameDefinition } from "@/engine/definition";
import { recipeHref } from "@/engine/validationHelp";
import {
  dismissSuggestion,
  loadDesignCoachPrefs,
  setDesignCoachEnabled,
  type DesignCoachPrefs,
} from "@/studio/designCoachPrefs";

export interface DesignCoachLiveProps {
  definition: GameDefinition;
}

/**
 * Compact coach inside Author mode — same dismiss/off prefs as Pack studio.
 */
export function DesignCoachLive({ definition }: DesignCoachLiveProps) {
  const [prefs, setPrefs] = useState<DesignCoachPrefs>(() =>
    loadDesignCoachPrefs()
  );
  const [open, setOpen] = useState(true);

  const visible = useMemo(() => {
    if (!prefs.enabled) return [];
    const result = analyzeGameDefinition(definition);
    return filterSuggestions(result, {
      dismissed: prefs.dismissed,
      phaseFocus: prefs.phaseFocus,
    }).slice(0, 4);
  }, [definition, prefs]);

  if (!prefs.enabled) {
    return (
      <div className="mt-2 border border-yellow-500/30 bg-black/70 p-2 text-[10px] text-yellow-100/90">
        <button
          type="button"
          className="underline text-yellow-300"
          onClick={() => setPrefs(setDesignCoachEnabled(true))}
        >
          Design coach off — turn on
        </button>
      </div>
    );
  }

  if (!visible.length) return null;

  return (
    <div className="mt-2 border border-yellow-500/40 bg-black/80 p-2 text-[10px] text-yellow-50 space-y-1.5 max-h-40 overflow-y-auto">
      <div className="flex justify-between gap-2 items-center">
        <button
          type="button"
          className="font-bold text-yellow-300 uppercase tracking-wide"
          onClick={() => setOpen((o) => !o)}
        >
          Design tips {open ? "▾" : "▸"}
        </button>
        <button
          type="button"
          className="text-yellow-200/70 hover:text-yellow-100"
          onClick={() => setPrefs(setDesignCoachEnabled(false))}
          title="Turn design coach off"
        >
          Off
        </button>
      </div>
      {open &&
        visible.map((s) => (
          <div key={s.id} className="border-t border-yellow-500/20 pt-1">
            <div className="flex justify-between gap-2">
              <span className="text-yellow-100">{s.title}</span>
              <button
                type="button"
                className="shrink-0 text-yellow-200/60"
                onClick={() => setPrefs(dismissSuggestion(s.id))}
              >
                ✕
              </button>
            </div>
            <p className="text-yellow-100/70 leading-snug">{s.body}</p>
            {s.recipeId && (
              <Link
                to={recipeHref(s.recipeId)}
                className="text-cyan-300 underline"
              >
                Recipe
              </Link>
            )}
          </div>
        ))}
    </div>
  );
}
