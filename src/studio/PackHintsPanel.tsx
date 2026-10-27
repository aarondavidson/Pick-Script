import { useState } from "react";
import { suggestId } from "@/authoring/codegen";
import type { JsonPackDocument, JsonPackHint } from "@/engine/jsonPack";

export interface PackHintsPanelProps {
  doc: JsonPackDocument;
  onChange: (doc: JsonPackDocument) => void;
}

/**
 * Progressive hint threads for JSON packs (untilFlag / requireFlag).
 */
export function PackHintsPanel({ doc, onChange }: PackHintsPanelProps) {
  const hints = doc.hints ?? [];
  const [title, setTitle] = useState("The desk");
  const [tier1, setTier1] = useState("Something glints nearby.");
  const [tier2, setTier2] = useState("Try looking at the desk.");
  const [tier3, setTier3] = useState("Use the desk to take the key.");
  const [untilFlag, setUntilFlag] = useState("got_brass_key");
  const [requireFlag, setRequireFlag] = useState("");

  const setHints = (next: JsonPackHint[]) => {
    onChange({ ...doc, hints: next });
  };

  const add = () => {
    const id = suggestId(title, `hint_${hints.length + 1}`);
    const unique = hints.some((h) => h.id === id)
      ? `${id}_${hints.length}`
      : id;
    const tiers = [tier1, tier2, tier3].map((t) => t.trim()).filter(Boolean);
    if (!tiers.length) return;
    setHints([
      ...hints,
      {
        id: unique,
        title: title.trim() || unique,
        tiers,
        untilFlag: untilFlag.trim() || undefined,
        requireFlag: requireFlag.trim() || undefined,
      },
    ]);
  };

  return (
    <section className="border border-game-border bg-game-ui/90 p-4 space-y-3">
      <div>
        <h3 className="pixel-font text-sm text-accent">Hints</h3>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          Progressive tiers (vague → spoilery). Hide with{" "}
          <code className="text-accent">untilFlag</code> when the puzzle is
          solved.
        </p>
      </div>

      <ul className="space-y-2 max-h-40 overflow-y-auto text-xs">
        {hints.length === 0 && (
          <li className="text-muted-foreground">No hints yet.</li>
        )}
        {hints.map((h) => (
          <li
            key={h.id}
            className="border border-border/50 px-2 py-1.5 flex justify-between gap-2"
          >
            <span>
              <span className="text-accent">{h.title}</span>
              {" · "}
              {h.tiers.length} tier(s)
              {h.untilFlag ? ` · until ${h.untilFlag}` : ""}
              {h.requireFlag ? ` · need ${h.requireFlag}` : ""}
            </span>
            <button
              type="button"
              className="text-destructive shrink-0"
              onClick={() => setHints(hints.filter((x) => x.id !== h.id))}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      <div className="grid sm:grid-cols-2 gap-2 border-t border-border pt-3">
        <label className="block text-xs space-y-1 sm:col-span-2">
          <span className="text-muted-foreground">Title</span>
          <input
            className="w-full bg-background border border-border px-2 py-2 min-h-[40px]"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="block text-xs space-y-1 sm:col-span-2">
          <span className="text-muted-foreground">Tier 1 (vague)</span>
          <input
            className="w-full bg-background border border-border px-2 py-2"
            value={tier1}
            onChange={(e) => setTier1(e.target.value)}
          />
        </label>
        <label className="block text-xs space-y-1 sm:col-span-2">
          <span className="text-muted-foreground">Tier 2</span>
          <input
            className="w-full bg-background border border-border px-2 py-2"
            value={tier2}
            onChange={(e) => setTier2(e.target.value)}
          />
        </label>
        <label className="block text-xs space-y-1 sm:col-span-2">
          <span className="text-muted-foreground">Tier 3 (spoiler)</span>
          <input
            className="w-full bg-background border border-border px-2 py-2"
            value={tier3}
            onChange={(e) => setTier3(e.target.value)}
          />
        </label>
        <label className="block text-xs space-y-1">
          <span className="text-muted-foreground">Until flag (solved)</span>
          <input
            className="w-full bg-background border border-border px-2 py-2"
            value={untilFlag}
            onChange={(e) =>
              setUntilFlag(suggestId(e.target.value, "flag") || "")
            }
            placeholder="got_brass_key"
          />
        </label>
        <label className="block text-xs space-y-1">
          <span className="text-muted-foreground">Require flag (optional)</span>
          <input
            className="w-full bg-background border border-border px-2 py-2"
            value={requireFlag}
            onChange={(e) => setRequireFlag(e.target.value)}
            placeholder="met_npc"
          />
        </label>
      </div>
      <button
        type="button"
        onClick={add}
        className="pixel-font text-xs min-h-[40px] px-3 border-2 border-accent text-accent"
      >
        Add hint thread
      </button>
    </section>
  );
}
