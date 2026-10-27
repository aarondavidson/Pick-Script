import { useMemo } from "react";
import {
  buildPlaytestChecklist,
  playtestProgress,
} from "@/authoring/playtestChecklist";
import type { JsonPackDocument } from "@/engine/jsonPack";

export interface PlaytestChecklistProps {
  doc: JsonPackDocument;
}

/**
 * Auto-derived playtest readiness for Guided Pack.
 */
export function PlaytestChecklist({ doc }: PlaytestChecklistProps) {
  const items = useMemo(() => buildPlaytestChecklist(doc), [doc]);
  const { done, total, ready } = playtestProgress(items);

  return (
    <section className="border border-game-border bg-game-ui/90 p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="pixel-font text-sm text-accent">Playtest checklist</h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Auto-checked from your draft — finish these before Publish.
          </p>
        </div>
        <span
          className={`pixel-font text-[10px] px-2 py-1 border ${
            ready
              ? "border-primary text-primary"
              : "border-game-border text-muted-foreground"
          }`}
        >
          {done}/{total}
          {ready ? " · ready" : ""}
        </span>
      </div>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex gap-2 text-xs border border-border/50 px-2 py-1.5"
          >
            <span
              className={
                item.done ? "text-primary" : "text-muted-foreground"
              }
              aria-hidden
            >
              {item.done ? "✓" : "○"}
            </span>
            <div>
              <span className={item.done ? "text-foreground" : "text-muted-foreground"}>
                {item.label}
              </span>
              {!item.done && item.hint && (
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                  {item.hint}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
