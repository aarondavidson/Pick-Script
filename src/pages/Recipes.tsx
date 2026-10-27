import { Link, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { RECIPES, type Recipe } from "@/authoring/recipes";
import {
  applyRecipeToPack,
  isApplyableRecipeId,
} from "@/authoring/applyRecipeToPack";
import {
  loadPackDraftAsync,
  savePackDraftAsync,
} from "@/studio/packDraftIdb";
import { toast } from "@/hooks/use-toast";
import { PICK, SCRIPT } from "@/product/branding";

/**
 * In-app puzzle recipe gallery — complements Attic Study + new-pack.
 * Deep links: /recipes#recipe-<id>
 */
const Recipes = () => {
  const [filter, setFilter] = useState<"all" | "new" | "mid">("all");
  const location = useLocation();
  const list =
    filter === "all" ? RECIPES : RECIPES.filter((r) => r.level === filter);

  useEffect(() => {
    const hash = location.hash.replace(/^#/, "");
    if (!hash.startsWith("recipe-")) return;
    const el = document.getElementById(hash);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      el.classList.add("ring-2", "ring-accent");
      const t = window.setTimeout(() => {
        el.classList.remove("ring-2", "ring-accent");
      }, 2200);
      return () => window.clearTimeout(t);
    }
  }, [location.hash, list]);

  return (
    <div className="min-h-screen relative text-foreground overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 40% at 20% 0%, hsl(28 40% 22% / 0.4), transparent 55%), linear-gradient(165deg, hsl(222 28% 7%), hsl(220 18% 10%))",
        }}
      />
      <div className="relative z-10 max-w-3xl mx-auto px-4 py-8 md:py-12">
        <header className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <p className="pixel-font text-xs text-muted-foreground uppercase tracking-widest mb-2">
              {PICK.acronym} · for {SCRIPT.acronym} packs
            </p>
            <h1 className="pixel-font text-2xl md:text-4xl text-accent mb-2">
              Puzzle recipes
            </h1>
            <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
              Copy-paste patterns between Attic Study and a full title. Keep{" "}
              <code className="text-accent">npm run verify</code> green after
              each paste.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 self-start">
            <Link
              to="/"
              className="pixel-font text-xs border border-game-border px-3 py-2 hover:bg-secondary/40 min-h-[44px] inline-flex items-center"
            >
              ← Launcher
            </Link>
            <Link
              to="/pick"
              className="pixel-font text-xs border border-game-border px-3 py-2 hover:bg-secondary/40 min-h-[44px] inline-flex items-center"
            >
              {PICK.acronym}
            </Link>
          </div>
        </header>

        <div className="mb-6 flex flex-wrap gap-2">
          {(
            [
              ["all", "All"],
              ["new", "New"],
              ["mid", "Mid"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={`pixel-font text-xs min-h-[40px] px-3 border ${
                filter === id
                  ? "border-accent bg-accent/15 text-accent"
                  : "border-game-border text-muted-foreground hover:bg-secondary/30"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
          In play: <kbd className="text-accent">Ctrl</kbd>+
          <kbd className="text-accent">Shift</kbd>+
          <kbd className="text-accent">H</kbd> opens{" "}
          <strong className="text-foreground font-normal">
            {PICK.acronym} Author
          </strong>{" "}
          — drag hotspots, copy %, see flags/exits. Also: Settings →{" "}
          {PICK.acronym} Author.
        </p>

        <ul className="space-y-6">
          {list.map((recipe) => (
            <li key={recipe.id}>
              <RecipeCard recipe={recipe} />
            </li>
          ))}
        </ul>

        <footer className="mt-10 text-xs text-muted-foreground leading-relaxed border-t border-game-border/50 pt-6">
          Full walkthrough:{" "}
          <code className="text-accent">
            src/games/attic-study/WALKTHROUGH.md
          </code>
          . Markdown mirror: <code className="text-accent">docs/RECIPES.md</code>
          . Scaffold:{" "}
          <code className="text-accent">npm run new-pack -- my-game</code>.
          <br />
          © 2025–2026 Aaron Davidson · GPL-3.0-only · see{" "}
          <code className="text-accent">COPYRIGHT</code>
        </footer>
      </div>
    </div>
  );
};

function RecipeCard({ recipe }: { recipe: Recipe }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(recipe.snippet);
      toast({
        title: "Snippet copied",
        description: recipe.title,
      });
    } catch {
      toast({
        title: "Copy failed",
        description: "Select the code block and copy manually.",
        variant: "destructive",
      });
    }
  };

  const applyToDraft = () => {
    if (!isApplyableRecipeId(recipe.id)) {
      toast({
        title: "Copy-paste only",
        description: "This recipe has no JSON Apply yet — copy the snippet.",
        variant: "destructive",
      });
      return;
    }
    void (async () => {
      const draft = await loadPackDraftAsync();
      const result = applyRecipeToPack(draft, recipe.id);
      if (!result.ok) {
        toast({
          title: "Apply failed",
          description: result.message,
          variant: "destructive",
        });
        return;
      }
      try {
        await savePackDraftAsync(result.doc);
      } catch (err) {
        toast({
          title: "Save failed",
          description:
            err instanceof Error ? err.message : "Could not persist draft.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Applied to Studio draft",
        description: `${result.message} Open /pick Pack to continue.`,
      });
    })();
  };

  return (
    <article
      id={`recipe-${recipe.id}`}
      className="border border-game-border bg-game-ui/90 p-4 md:p-5 scroll-mt-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
        <h2 className="pixel-font text-base md:text-lg text-accent">
          {recipe.title}
        </h2>
        <span className="pixel-font text-[10px] uppercase tracking-widest text-muted-foreground">
          {recipe.level === "new" ? "New" : "Mid"}
        </span>
      </div>
      <p className="text-sm text-muted-foreground mb-2 leading-relaxed">
        {recipe.summary}
      </p>
      <p className="text-[11px] text-primary/90 mb-3 font-mono break-all">
        {recipe.seeAlso}
      </p>
      <div className="flex flex-wrap justify-end gap-2 mb-2">
        {isApplyableRecipeId(recipe.id) && (
          <button
            type="button"
            onClick={applyToDraft}
            className="pixel-font text-xs min-h-[40px] px-3 border-2 border-accent text-accent hover:bg-accent/10"
          >
            Apply to draft
          </button>
        )}
        <button
          type="button"
          onClick={() => void copy()}
          className="pixel-font text-xs min-h-[40px] px-3 border border-accent text-accent hover:bg-accent/10"
        >
          Copy snippet
        </button>
      </div>
      <pre className="bg-black/40 border border-game-border p-3 text-[11px] md:text-xs text-accent/95 overflow-x-auto leading-relaxed whitespace-pre">
        {recipe.snippet}
      </pre>
    </article>
  );
}

export default Recipes;
