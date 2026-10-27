import { Link } from "react-router-dom";
import { useMemo, useRef, useState } from "react";
import type { GameCatalogEntry } from "@/games/registry";
import { listPlayableGames } from "@/games/resolveGame";
import {
  installPack,
  listInstalledCatalogEntries,
  uninstallPack,
} from "@/studio/installedPacks";
import { parseJsonPack } from "@/engine/jsonPack";
import { safeJsonParse, STORAGE_LIMITS } from "@/engine/security";
import { isAuthoringEnabled, isStudioBuildEnabled } from "@/studio/studioAccess";
import { getProductConfig } from "@/product/productConfig";
import {
  ENGINE_LAYER_BLURB,
  ENGINE_LAYER_LOCKUP,
  PICK,
  SCRIPT,
  SCRIPT_POWERED_CREDIT,
} from "@/product/branding";
import {
  FIRST_GAME_FUNNEL_STEPS,
  FirstGameFunnel,
} from "@/studio/FirstGameFunnel";

const GUIDED_STEPS = FIRST_GAME_FUNNEL_STEPS;

/**
 * Product-aware home:
 * - engine → multi-pack catalog + studio
 * - title products → branded single-game splash
 */
const Launcher = () => {
  const product = getProductConfig();
  const [installTick, setInstallTick] = useState(0);
  const [importError, setImportError] = useState<string | null>(null);
  const [importOk, setImportOk] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const catalog = useMemo(() => listPlayableGames(), [installTick]);
  const installedOnly = useMemo(
    () =>
      product.isTitleProduct ? [] : listInstalledCatalogEntries(),
    [installTick, product.isTitleProduct]
  );

  const featuredId = product.featuredGameId ?? product.defaultGameId;
  const featured =
    (featuredId ? catalog.find((g) => g.id === featuredId) : null) ??
    catalog[0];
  const rest = catalog.filter((g) => g.id !== featured?.id);

  const onImportPack = async (file: File | null) => {
    setImportError(null);
    setImportOk(null);
    if (!file) return;
    try {
      const text = await file.text();
      if (text.length > STORAGE_LIMITS.maxInstalledPackChars) {
        throw new Error("Pack file too large for browser install");
      }
      const doc = parseJsonPack(safeJsonParse(text));
      const installed = installPack(doc);
      setInstallTick((n) => n + 1);
      setImportOk(installed.id);
    } catch (e) {
      setImportError(e instanceof Error ? e.message : String(e));
    }
  };

  if (product.isTitleProduct && featured) {
    return (
      <TitleProductHome
        productBrand={product.brandName}
        tagline={product.tagline}
        game={featured}
      />
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden text-foreground">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 15% -10%, hsl(28 45% 28% / 0.55), transparent 55%), radial-gradient(ellipse 70% 45% at 90% 110%, hsl(200 35% 22% / 0.4), transparent 50%), linear-gradient(165deg, hsl(222 28% 7%) 0%, hsl(220 22% 11%) 45%, hsl(210 18% 9%) 100%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.07] pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, hsl(0 0% 100% / 0.04) 2px, hsl(0 0% 100% / 0.04) 3px)",
        }}
      />

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-10 md:py-16">
        <header className="mb-8 md:mb-10 text-center">
          <p
            className="pixel-font text-lg md:text-2xl text-primary tracking-[0.12em] mb-2"
            aria-label={`${PICK.expansion} and ${SCRIPT.expansion}`}
          >
            {ENGINE_LAYER_LOCKUP}
          </p>
          <p className="text-[11px] md:text-xs text-muted-foreground/90 mb-3 tracking-wide">
            {ENGINE_LAYER_BLURB}
          </p>
          <h1 className="pixel-font text-3xl md:text-5xl text-accent tracking-wide mb-3">
            {product.brandName}
          </h1>
          <p className="text-sm md:text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
            {product.tagline}
          </p>
        </header>

        {product.showStudioChrome && isStudioBuildEnabled() && (
          <div className="mb-8 space-y-3">
            <FirstGameFunnel variant="launcher" />
            <p className="text-[11px] text-muted-foreground leading-relaxed px-1">
              {PICK.expansion} — visual editor. {SCRIPT.acronym} runs packs
              (inventory, verbs, use-with, saves, map). Free &amp; open source.
              Path: {GUIDED_STEPS.join(" → ")}. Advanced patterns in{" "}
              <Link to="/pick/recipes" className="text-primary underline">
                Recipes
              </Link>
              .{" "}
              {!isAuthoringEnabled() && (
                <Link to="/pick" className="text-primary underline">
                  Unlock {PICK.acronym} →
                </Link>
              )}
            </p>
          </div>
        )}

        {featured && (
          <FeaturedCard
            game={featured}
            eyebrow={
              featured.id === "attic-study"
                ? "Start here · teaching pack"
                : "Featured pack"
            }
          />
        )}

        {rest.length > 0 && (
          <section className="mt-8" aria-label="More games">
            <h2 className="pixel-font text-xs text-muted-foreground uppercase tracking-widest mb-3">
              More packs
            </h2>
            <ul className="space-y-3">
              {rest.map((game) => (
                <li key={game.id}>
                  <Link
                    to={`/play/${game.id}`}
                    className="block border border-game-border/80 bg-game-ui/70 hover:border-accent/60 hover:bg-primary/10 transition-colors px-4 py-3"
                  >
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <span className="pixel-font text-base text-accent">
                        {game.title}
                      </span>
                      <span className="text-[10px] text-muted-foreground pixel-font">
                        v{game.version}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {game.blurb}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {product.showPackImport && (
          <section
            className="mt-8 border border-primary/40 bg-game-ui/70 px-4 py-4 space-y-3"
            aria-label="Import pack"
          >
            <h2 className="pixel-font text-xs text-primary uppercase tracking-widest">
              Import .pack.json
            </h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Play a shared {SCRIPT.acronym} pack in this browser — no{" "}
              {PICK.acronym} install needed. Use a unique pack id (shipped
              titles stay locked on public builds).
            </p>
            <button
              type="button"
              className="pixel-font text-sm min-h-[44px] px-4 border-2 border-accent text-accent hover:bg-accent/10"
              onClick={() => importRef.current?.click()}
            >
              Choose .pack.json
            </button>
            <input
              ref={importRef}
              type="file"
              accept="application/json,.json,.pack.json"
              className="hidden"
              onChange={(e) => void onImportPack(e.target.files?.[0] ?? null)}
            />
            {importOk && (
              <p className="text-xs text-primary">
                Installed —{" "}
                <Link
                  to={`/play/${importOk}`}
                  className="underline text-accent"
                >
                  Play /play/{importOk}
                </Link>
              </p>
            )}
            {importError && (
              <p className="text-xs text-destructive">{importError}</p>
            )}
          </section>
        )}

        {installedOnly.length > 0 && (
          <section className="mt-8" aria-label="Studio installs">
            <h2 className="pixel-font text-xs text-muted-foreground uppercase tracking-widest mb-3">
              Installed packs
            </h2>
            <ul className="space-y-3">
              {installedOnly.map((game) => (
                <li
                  key={`installed-${game.id}`}
                  className="border border-primary/40 bg-game-ui/70 px-4 py-3"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
                    <Link
                      to={`/play/${game.id}`}
                      className="pixel-font text-base text-accent hover:underline"
                    >
                      {game.title}
                    </Link>
                    <button
                      type="button"
                      className="text-[10px] text-destructive pixel-font"
                      onClick={() => {
                        uninstallPack(game.id);
                        setInstallTick((n) => n + 1);
                      }}
                    >
                      Remove
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {game.blurb} · /play/{game.id}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {product.showStudioChrome && !isStudioBuildEnabled() && (
          <section
            className="mt-10 pt-8 border-t border-game-border/50"
            aria-label="Authoring note"
          >
            <h2 className="pixel-font text-lg text-accent mb-2">
              {PICK.acronym} authoring
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              This public build hides {PICK.acronym}. Edit locally with{" "}
              <code className="text-accent">npm run dev</code> or a private
              preview (<code className="text-accent">VITE_ENABLE_STUDIO</code>
              ). Import .pack.json above still works for playing shared packs.
            </p>
          </section>
        )}

        <footer className="mt-12 pt-6 border-t border-game-border/40 text-center text-[11px] text-muted-foreground leading-relaxed">
          <p>
            © 2025–2026 Aaron Davidson · {product.brandName}
            {!product.isTitleProduct && (
              <>
                {" "}
                · {PICK.short}/{SCRIPT.short}
              </>
            )}{" "}
            · <span className="text-accent/90">GPL-3.0-only</span>
          </p>
          <p className="mt-1">
            Keep copyright notices when you fork or ship — see{" "}
            <code className="text-accent/80">COPYRIGHT</code>
          </p>
        </footer>
      </div>
    </div>
  );
};

function TitleProductHome({
  productBrand,
  tagline,
  game,
}: {
  productBrand: string;
  tagline: string;
  game: GameCatalogEntry;
}) {
  return (
    <div className="min-h-screen relative overflow-hidden text-foreground">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 90% 60% at 50% -20%, hsl(28 40% 24% / 0.65), transparent 55%), linear-gradient(180deg, hsl(222 28% 6%) 0%, hsl(220 22% 10%) 50%, hsl(210 20% 8%) 100%)",
        }}
      />
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-16">
        <p className="pixel-font text-[10px] text-primary uppercase tracking-[0.25em] mb-4">
          {SCRIPT.acronym} pack · point-and-click
        </p>
        <h1 className="pixel-font text-4xl md:text-6xl text-accent tracking-wide text-center mb-4 max-w-xl leading-tight">
          {productBrand}
        </h1>
        <p className="text-sm md:text-base text-muted-foreground text-center max-w-md leading-relaxed mb-8">
          {tagline}
        </p>
        <Link
          to={`/play/${game.id}`}
          className="pixel-font text-base md:text-lg min-h-[48px] inline-flex items-center border-2 border-accent px-8 py-3 text-accent hover:bg-accent/15 transition-colors"
        >
          Play →
        </Link>
        <p className="mt-10 text-[11px] text-muted-foreground/80 text-center">
          {SCRIPT_POWERED_CREDIT} · v{game.version}
        </p>
      </div>
    </div>
  );
}

function FeaturedCard({
  game,
  eyebrow,
}: {
  game: GameCatalogEntry;
  eyebrow: string;
}) {
  return (
    <Link
      to={`/play/${game.id}`}
      className="block border-2 border-accent/80 bg-game-ui/95 hover:bg-accent/10 transition-colors p-5 md:p-6"
    >
      <p className="pixel-font text-[10px] md:text-xs text-primary uppercase tracking-[0.2em] mb-2">
        {eyebrow}
      </p>
      <div className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-1 mb-2">
        <h2 className="pixel-font text-xl md:text-2xl text-accent">
          {game.title}
        </h2>
        <span className="text-xs text-muted-foreground pixel-font">
          v{game.version}
        </span>
      </div>
      {game.subtitle && (
        <p className="text-sm text-primary/90 mb-2">{game.subtitle}</p>
      )}
      <p className="text-sm text-muted-foreground leading-relaxed mb-4">
        {game.blurb}
      </p>
      <span className="pixel-font text-sm text-accent">Play →</span>
    </Link>
  );
}

export default Launcher;
