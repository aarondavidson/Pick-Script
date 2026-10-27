import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  analyzeJsonPack,
  filterSuggestions,
  type DesignSuggestion,
} from "@/authoring/designCoach";
import type { JsonPackDocument } from "@/engine/jsonPack";
import { recipeHref, studioTabHref } from "@/engine/validationHelp";
import {
  clearDismissedSuggestions,
  dismissSuggestion,
  loadDesignCoachPrefs,
  setDesignCoachEnabled,
  setDesignCoachPhaseFocus,
  type DesignCoachPrefs,
} from "@/studio/designCoachPrefs";

export interface DesignCoachPanelProps {
  doc: JsonPackDocument;
  /** Guided: hide recipe links; show Apply */
  guided?: boolean;
  onApply?: (suggestion: DesignSuggestion) => void;
}

/**
 * Non-blocking design tips for the Pack draft — dismiss one, or turn the coach off.
 */
export function DesignCoachPanel({
  doc,
  guided = false,
  onApply,
}: DesignCoachPanelProps) {
  const [prefs, setPrefs] = useState<DesignCoachPrefs>(() =>
    loadDesignCoachPrefs()
  );

  const result = useMemo(() => analyzeJsonPack(doc), [doc]);
  const visible = useMemo(
    () =>
      filterSuggestions(result, {
        dismissed: prefs.dismissed,
        phaseFocus: prefs.phaseFocus,
      }),
    [result, prefs.dismissed, prefs.phaseFocus]
  );

  if (!prefs.enabled) {
    return (
      <section className="border border-game-border/60 bg-game-ui/50 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Design coach is off — tips stay out of your way.
        </p>
        <button
          type="button"
          className="pixel-font text-[10px] min-h-[36px] px-3 border border-accent text-accent"
          onClick={() => setPrefs(setDesignCoachEnabled(true))}
        >
          Turn coach on
        </button>
      </section>
    );
  }

  return (
    <section className="border border-game-border bg-game-ui/90 p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="pixel-font text-sm text-accent">Design coach</h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Optional tips for function and feel. Never blocks export — dismiss
            any tip or turn the coach off.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <input
              type="checkbox"
              checked={prefs.phaseFocus}
              onChange={(e) =>
                setPrefs(setDesignCoachPhaseFocus(e.target.checked))
              }
            />
            Focus current phase
          </label>
          <button
            type="button"
            className="pixel-font text-[10px] min-h-[36px] px-2 border border-game-border"
            onClick={() => setPrefs(clearDismissedSuggestions())}
          >
            Restore dismissed
          </button>
          <button
            type="button"
            className="pixel-font text-[10px] min-h-[36px] px-2 border border-destructive/40 text-destructive"
            onClick={() => setPrefs(setDesignCoachEnabled(false))}
          >
            Turn off
          </button>
        </div>
      </div>

      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
        Phase · {result.phase}
        {visible.length === 0 ? " · all clear" : ` · ${visible.length} tip(s)`}
      </p>

      {visible.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No active tips
          {prefs.dismissed.length
            ? ` (${prefs.dismissed.length} dismissed)`
            : ""}
          . Keep building — the coach rechecks as the draft grows.
        </p>
      ) : (
        <ul className="space-y-2">
          {visible.map((s) => (
            <SuggestionRow
              key={s.id}
              suggestion={s}
              guided={guided}
              onDismiss={() => setPrefs(dismissSuggestion(s.id))}
              onApply={onApply ? () => onApply(s) : undefined}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function SuggestionRow({
  suggestion,
  guided,
  onDismiss,
  onApply,
}: {
  suggestion: DesignSuggestion;
  guided: boolean;
  onDismiss: () => void;
  onApply?: () => void;
}) {
  return (
    <li className="border border-border/60 px-3 py-2 space-y-1.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground mr-2">
            {suggestion.severity} · {suggestion.phase}
          </span>
          <span className="text-xs text-foreground">{suggestion.title}</span>
        </div>
        <button
          type="button"
          className="text-[10px] text-muted-foreground hover:text-foreground shrink-0"
          onClick={onDismiss}
          title="Dismiss this tip"
        >
          Dismiss
        </button>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        {suggestion.body}
      </p>
      <div className="flex flex-wrap gap-2 text-[11px] items-center">
        {onApply && (
          <button
            type="button"
            className="pixel-font text-[10px] min-h-[32px] px-2 border border-accent text-accent"
            onClick={onApply}
          >
            Apply
          </button>
        )}
        {suggestion.studioTab && (
          <Link
            to={studioTabHref(suggestion.studioTab)}
            className="text-primary underline"
          >
            Studio → {suggestion.studioTab}
          </Link>
        )}
        {!guided && suggestion.recipeId && (
          <Link
            to={recipeHref(suggestion.recipeId)}
            className="text-accent underline"
          >
            Recipe: {suggestion.recipeId}
          </Link>
        )}
      </div>
    </li>
  );
}
