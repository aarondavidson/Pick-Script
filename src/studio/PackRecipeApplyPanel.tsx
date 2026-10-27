import {
  RECIPES,
  recipeById,
} from "@/authoring/recipes";
import {
  applyRecipeToPack,
  isApplyableRecipeId,
  listApplyableRecipeIds,
  type ApplyableRecipeId,
} from "@/authoring/applyRecipeToPack";
import type { JsonPackDocument } from "@/engine/jsonPack";
import { toastError, toastOk } from "@/studio/toastError";
import { recipesGalleryHref } from "@/engine/validationHelp";
import { Link } from "react-router-dom";

export interface PackRecipeApplyPanelProps {
  doc: JsonPackDocument;
  roomId: string;
  onChange: (doc: JsonPackDocument) => void;
}

/** Labels for applyable recipes (covers ids not yet on /recipes). */
const APPLY_LABELS: Record<
  ApplyableRecipeId,
  { title: string; summary: string }
> = {
  "get-item": {
    title: "Get an item",
    summary: "Pickup hotspot + inventory item + got_ flag.",
  },
  "use-with": {
    title: "Use item with hotspot",
    summary: "Key → chest style use-with rule (consumes item).",
  },
  "locked-exit": {
    title: "Locked exit",
    summary: "Pass note + gated link to a hallway.",
  },
  "combine-items": {
    title: "Combine items",
    summary: "Stick + twine craft into a rope tool.",
  },
  "talk-gate": {
    title: "Talk gate",
    summary: "Guard dialogue sets a flag that unlocks the street.",
  },
  "look-scenery": {
    title: "Look scenery",
    summary: "Three interact hotspots with lookText (painting, window, rug).",
  },
  "give-item": {
    title: "Give item to NPC",
    summary: "Flower pickup + Gardener use-with sets garden_open.",
  },
  "region-trigger": {
    title: "Region trigger",
    summary: "Walk-in region with onEnterFlag + message.",
  },
  "timer-beat": {
    title: "Timer beat",
    summary: "Room timer: once after 5s, shows a message.",
  },
  "sequence-lock": {
    title: "Sequence lock",
    summary: "Minigame hotspot: press pads in order (default a→d).",
  },
  "slider-puzzle": {
    title: "Slider puzzle",
    summary: "Minigame hotspot: rearrange sliders to the target order.",
  },
  "dial-lock": {
    title: "Dial lock",
    summary: "Minigame hotspot: spin dials to the target combo.",
  },
  "wire-match": {
    title: "Wire match",
    summary: "Minigame hotspot: connect left terminals to matching rights.",
  },
};

/**
 * One-click Apply for puzzle recipes into the current pack draft.
 */
export function PackRecipeApplyPanel({
  doc,
  roomId,
  onChange,
}: PackRecipeApplyPanelProps) {
  const applyable = listApplyableRecipeIds();

  const apply = (id: string) => {
    const result = applyRecipeToPack(doc, id, roomId);
    if (!result.ok) {
      toastError("Cannot apply", result.message);
      return;
    }
    onChange(result.doc);
    toastOk("Recipe applied", result.message);
  };

  return (
    <section className="border border-game-border bg-game-ui/90 p-4 space-y-3">
      <div>
        <h3 className="pixel-font text-sm text-accent">Apply recipes</h3>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          Drop a puzzle pattern into this room — no copy-paste. Full snippets
          still live on{" "}
          <Link to={recipesGalleryHref()} className="text-primary underline">
            /pick/recipes
          </Link>
          .
        </p>
      </div>
      <ul className="space-y-2">
        {applyable.map((id) => {
          const labels = APPLY_LABELS[id];
          const meta = recipeById(id) || RECIPES.find((r) => r.id === id);
          return (
            <li
              key={id}
              className="flex flex-wrap items-center justify-between gap-2 border border-border/60 px-2 py-2"
            >
              <div className="min-w-0 flex-1">
                <div className="pixel-font text-[11px] text-foreground">
                  {labels.title || meta?.title || id}
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {labels.summary || meta?.summary}
                </p>
              </div>
              <button
                type="button"
                className="pixel-font text-[10px] min-h-[36px] px-2 border-2 border-accent text-accent shrink-0"
                onClick={() => apply(id)}
              >
                Apply
              </button>
            </li>
          );
        })}
      </ul>
      <p className="text-[10px] text-muted-foreground">
        Other recipes ({RECIPES.filter((r) => !isApplyableRecipeId(r.id)).length})
        remain copy-snippet only.
      </p>
    </section>
  );
}
