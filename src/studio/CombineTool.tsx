import { useState } from "react";
import {
  formatCombinationsObject,
  suggestId,
  type DraftCombination,
} from "@/authoring/codegen";
import { applyCombinesToPackDraft } from "@/studio/packApplyBridge";
import { toastError, toastOk } from "@/studio/toastError";

/**
 * Design inventory item combinations during pack building.
 */
export function CombineTool() {
  const [itemA, setItemA] = useState("ducttape");
  const [itemB, setItemB] = useState("rubberchicken");
  const [resultName, setResultName] = useState("Taped Rubber Chicken");
  const [resultId, setResultId] = useState("tapedrubberchicken");
  const [resultDescription, setResultDescription] = useState(
    "A rubber chicken reinforced with duct tape."
  );
  const [successMessage, setSuccessMessage] = useState(
    "You tape the chicken. Somehow this feels useful."
  );
  const [recipes, setRecipes] = useState<DraftCombination[]>([]);

  const addRecipe = () => {
    const a = suggestId(itemA, "item_a");
    const b = suggestId(itemB, "item_b");
    if (a === b) {
      toastError(
        "Need two different items",
        "Item A and B must be different ids."
      );
      return;
    }
    const draft: DraftCombination = {
      itemA: a,
      itemB: b,
      resultId: suggestId(resultId || resultName, "result"),
      resultName: resultName.trim() || "Combined item",
      resultDescription: resultDescription.trim() || resultName,
      successMessage: successMessage.trim() || undefined,
    };
    setRecipes((prev) => {
      const without = prev.filter(
        (r) =>
          !(
            (r.itemA === a && r.itemB === b) ||
            (r.itemA === b && r.itemB === a)
          )
      );
      return [...without, draft];
    });
    toastOk("Recipe added", `${a} + ${b}`);
  };

  const copyExport = async () => {
    const code = formatCombinationsObject(recipes);
    await navigator.clipboard.writeText(code);
    toastOk("Copied combinations", "Paste onto GameDefinition.combinations");
  };

  const applyToPack = async () => {
    if (!recipes.length) return;
    try {
      await applyCombinesToPackDraft(recipes);
      toastOk(
        "Applied to pack draft",
        `${recipes.length} recipe(s) → Pack combinations. Open Pack tab.`
      );
    } catch (e) {
      toastError("Apply failed", e);
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <section className="border border-game-border bg-game-ui/90 p-4 space-y-3">
        <h3 className="pixel-font text-sm text-accent">New recipe</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Players combine two inventory items in the inventory UI. Match the
          item ids you use in pickup hotspots.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs space-y-1">
            <span className="pixel-font text-muted-foreground">Item A id</span>
            <input
              className="w-full bg-background border border-border px-2 py-2 min-h-[40px]"
              value={itemA}
              onChange={(e) => setItemA(e.target.value)}
            />
          </label>
          <label className="block text-xs space-y-1">
            <span className="pixel-font text-muted-foreground">Item B id</span>
            <input
              className="w-full bg-background border border-border px-2 py-2 min-h-[40px]"
              value={itemB}
              onChange={(e) => setItemB(e.target.value)}
            />
          </label>
        </div>
        <label className="block text-xs space-y-1">
          <span className="pixel-font text-muted-foreground">Result name</span>
          <input
            className="w-full bg-background border border-border px-2 py-2 min-h-[40px]"
            value={resultName}
            onChange={(e) => {
              setResultName(e.target.value);
              setResultId(suggestId(e.target.value, "result"));
            }}
          />
        </label>
        <label className="block text-xs space-y-1">
          <span className="pixel-font text-muted-foreground">Result id</span>
          <input
            className="w-full bg-background border border-border px-2 py-2 min-h-[40px]"
            value={resultId}
            onChange={(e) => setResultId(e.target.value)}
          />
        </label>
        <label className="block text-xs space-y-1">
          <span className="pixel-font text-muted-foreground">Description</span>
          <textarea
            className="w-full bg-background border border-border px-2 py-2 min-h-[70px]"
            value={resultDescription}
            onChange={(e) => setResultDescription(e.target.value)}
          />
        </label>
        <label className="block text-xs space-y-1">
          <span className="pixel-font text-muted-foreground">
            Success message (optional)
          </span>
          <input
            className="w-full bg-background border border-border px-2 py-2 min-h-[40px]"
            value={successMessage}
            onChange={(e) => setSuccessMessage(e.target.value)}
          />
        </label>
        <button
          type="button"
          onClick={addRecipe}
          className="pixel-font text-xs min-h-[44px] w-full border-2 border-accent text-accent hover:bg-accent/10"
        >
          Add to recipe list
        </button>
      </section>

      <section className="border border-game-border bg-game-ui/90 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="pixel-font text-sm text-accent">
            Recipes ({recipes.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!recipes.length}
              onClick={() => void applyToPack()}
              className="pixel-font text-xs min-h-[40px] px-3 border-2 border-primary text-primary disabled:opacity-40"
            >
              Apply to pack
            </button>
            <button
              type="button"
              disabled={!recipes.length}
              onClick={() => void copyExport()}
              className="pixel-font text-xs min-h-[40px] px-3 border border-accent text-accent disabled:opacity-40"
            >
              Copy TypeScript
            </button>
          </div>
        </div>
        {recipes.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No recipes yet. Add one on the left — e.g. rope + hook → grappling
            hook.
          </p>
        ) : (
          <ul className="space-y-2 text-xs">
            {recipes.map((r) => (
              <li
                key={`${r.itemA}+${r.itemB}`}
                className="border border-border p-2 flex justify-between gap-2"
              >
                <div>
                  <p className="text-accent pixel-font">
                    {r.itemA} + {r.itemB}
                  </p>
                  <p className="text-muted-foreground">
                    → {r.resultName}{" "}
                    <code className="text-primary">({r.resultId})</code>
                  </p>
                </div>
                <button
                  type="button"
                  className="text-destructive shrink-0"
                  onClick={() =>
                    setRecipes((prev) =>
                      prev.filter(
                        (x) =>
                          !(x.itemA === r.itemA && x.itemB === r.itemB)
                      )
                    )
                  }
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
        <pre className="bg-black/40 border border-game-border p-3 text-[10px] md:text-xs text-accent/90 overflow-x-auto max-h-64">
          {recipes.length
            ? formatCombinationsObject(recipes)
            : "combinations: {},"}
        </pre>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Also create result art in the <strong className="font-normal text-foreground">Pixels</strong>{" "}
          tab (Inventory item preset), then Vite-import as{" "}
          <code className="text-accent">icon</code> on the result.
        </p>
      </section>
    </div>
  );
}
