import { Suspense, lazy, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  getStudioSecret,
  isAuthoringEnabled,
  isStudioBuildEnabled,
  lockStudio,
  tryUnlockFromSearch,
  unlockStudio,
} from "@/studio/studioAccess";
import {
  loadStudioMode,
  saveStudioMode,
  type StudioMode,
} from "@/studio/studioModePrefs";
import { toast } from "@/hooks/use-toast";
import { PICK, SCRIPT } from "@/product/branding";
import { FirstGameFunnel } from "@/studio/FirstGameFunnel";

const PackTool = lazy(() =>
  import("@/studio/PackTool").then((m) => ({ default: m.PackTool }))
);
const PixelTool = lazy(() =>
  import("@/studio/PixelTool").then((m) => ({ default: m.PixelTool }))
);
const HotspotTool = lazy(() =>
  import("@/studio/HotspotTool").then((m) => ({ default: m.HotspotTool }))
);
const SceneTool = lazy(() =>
  import("@/studio/SceneTool").then((m) => ({ default: m.SceneTool }))
);
const AudioTool = lazy(() =>
  import("@/studio/AudioTool").then((m) => ({ default: m.AudioTool }))
);
const CombineTool = lazy(() =>
  import("@/studio/CombineTool").then((m) => ({ default: m.CombineTool }))
);

type StudioTab =
  | "pack"
  | "pixels"
  | "hotspots"
  | "scene"
  | "combines"
  | "audio";

const PRIMARY_TABS: { id: StudioTab; label: string; blurb: string }[] = [
  {
    id: "pack",
    label: "Pack",
    blurb: "Rooms, links, export playable .pack.json",
  },
  {
    id: "pixels",
    label: "Pixels",
    blurb: "Backgrounds, characters, inventory icons",
  },
  {
    id: "audio",
    label: "Audio",
    blurb: "Location music + interact SFX → pack draft",
  },
];

const ADVANCED_TABS: { id: StudioTab; label: string; blurb: string }[] = [
  {
    id: "hotspots",
    label: "Hotspots",
    blurb: "Draw interactive areas → TS export",
  },
  {
    id: "scene",
    label: "Scene",
    blurb: "Overlay art → pickup / characters",
  },
  {
    id: "combines",
    label: "Combines",
    blurb: "Inventory A + B → result recipes",
  },
];

const ALL_TABS = [...PRIMARY_TABS, ...ADVANCED_TABS];

/**
 * Pack builder workshop — art, hotspots, scene overlays, item combines.
 * Gated so public production builds cannot author.
 */
const Studio = () => {
  const [params, setParams] = useSearchParams();
  const [unlocked, setUnlocked] = useState(() => isAuthoringEnabled());
  const [passphrase, setPassphrase] = useState("");
  const [mode, setMode] = useState<StudioMode>(() => loadStudioMode());
  const [showMore, setShowMore] = useState(false);
  const guided = mode === "guided";

  useEffect(() => {
    if (tryUnlockFromSearch(window.location.search)) {
      setUnlocked(true);
      // Drop unlock token from the URL after consuming
      if (params.has("unlock")) {
        const next = new URLSearchParams(params);
        next.delete("unlock");
        setParams(next, { replace: true });
      }
    }
  }, [params, setParams]);

  const raw = params.get("tab") as StudioTab | null;
  const tab: StudioTab =
    raw && ALL_TABS.some((t) => t.id === raw) ? raw : "pack";

  useEffect(() => {
    if (
      guided &&
      ADVANCED_TABS.some((t) => t.id === tab) &&
      !showMore
    ) {
      setShowMore(true);
    }
  }, [guided, tab, showMore]);

  const setTab = (id: StudioTab) => {
    setParams(id === "pack" ? {} : { tab: id });
  };

  if (!isStudioBuildEnabled()) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center gap-4 p-6">
        <h1 className="pixel-font text-xl text-accent">
          {PICK.acronym} unavailable
        </h1>
        <p className="text-sm text-muted-foreground max-w-md text-center leading-relaxed">
          {PICK.acronym} authoring tools are not included in this build. Edit
          locally with <code className="text-accent">npm run dev</code>, or
          deploy a private preview with{" "}
          <code className="text-accent">VITE_ENABLE_STUDIO=true</code>.
        </p>
        <Link to="/" className="pixel-font text-sm text-primary underline">
          ← Launcher
        </Link>
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center gap-4 p-6">
        <h1 className="pixel-font text-xl text-accent">
          Unlock {PICK.acronym}
        </h1>
        <p className="text-sm text-muted-foreground max-w-md text-center leading-relaxed">
          Enter the {PICK.acronym} passphrase (from your{" "}
          <code className="text-accent">VITE_STUDIO_SECRET</code>). Players on
          builds without the studio flag never see this.
        </p>
        <form
          className="flex flex-col sm:flex-row gap-2 w-full max-w-sm"
          onSubmit={(e) => {
            e.preventDefault();
            if (unlockStudio(passphrase)) {
              setUnlocked(true);
              toast({ title: `${PICK.acronym} unlocked` });
            } else {
              toast({
                title: "Wrong passphrase",
                variant: "destructive",
              });
            }
          }}
        >
          <input
            type="password"
            autoComplete="current-password"
            className="flex-1 bg-background border border-border px-3 py-2 min-h-[44px] text-sm"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            placeholder="Passphrase"
          />
          <button
            type="submit"
            className="pixel-font text-xs min-h-[44px] px-4 border-2 border-accent text-accent"
          >
            Unlock
          </button>
        </form>
        <Link to="/" className="pixel-font text-sm text-primary underline">
          ← Launcher
        </Link>
      </div>
    );
  }

  const visibleTabs = guided
    ? [...PRIMARY_TABS, ...(showMore ? ADVANCED_TABS : [])]
    : ALL_TABS;

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <div
        className="absolute inset-0 pointer-events-none opacity-80"
        style={{
          background:
            "radial-gradient(ellipse 70% 40% at 10% 0%, hsl(28 40% 22% / 0.45), transparent 50%), linear-gradient(180deg, hsl(222 28% 7%), hsl(220 18% 10%))",
        }}
      />
      <div className="relative z-10 max-w-5xl mx-auto px-4 py-8 md:py-12">
        <header className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <p className="pixel-font text-xs text-muted-foreground uppercase tracking-widest mb-2">
              {PICK.expansion} · for {SCRIPT.acronym}
            </p>
            <h1 className="pixel-font text-2xl md:text-4xl text-accent mb-2">
              {PICK.acronym}
            </h1>
            <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
              {guided ? (
                <>
                  Visual editor for {SCRIPT.acronym} packs. Guided mode keeps you
                  on Pack → Pixels → Audio. Finish a playable loop, then Publish
                  — no Copy TS required.
                </>
              ) : (
                <>
                  {PICK.role}. Assemble a self-contained {SCRIPT.short} pack
                  (rooms, art, hotspots, items, dialogue, map/audio) — download{" "}
                  <code className="text-accent">.pack.json</code> or play the
                  draft.
                </>
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 self-start">
            <div className="flex border border-game-border">
              <button
                type="button"
                onClick={() => setMode(saveStudioMode("guided"))}
                className={`pixel-font text-[10px] min-h-[44px] px-3 ${
                  guided ? "bg-accent/15 text-accent" : "text-muted-foreground"
                }`}
              >
                Guided
              </button>
              <button
                type="button"
                onClick={() => setMode(saveStudioMode("advanced"))}
                className={`pixel-font text-[10px] min-h-[44px] px-3 border-l border-game-border ${
                  !guided ? "bg-accent/15 text-accent" : "text-muted-foreground"
                }`}
              >
                Advanced
              </button>
            </div>
            <Link
              to="/"
              className="pixel-font text-xs border border-game-border px-3 py-2 hover:bg-secondary/40 min-h-[44px] inline-flex items-center"
            >
              ← Launcher
            </Link>
            {!guided && (
              <Link
                to="/pick/recipes"
                className="pixel-font text-xs border border-game-border px-3 py-2 hover:bg-secondary/40 min-h-[44px] inline-flex items-center"
              >
                Recipes
              </Link>
            )}
            {getStudioSecret() ? (
              <button
                type="button"
                onClick={() => {
                  lockStudio();
                  setUnlocked(false);
                  toast({ title: `${PICK.acronym} locked` });
                }}
                className="pixel-font text-xs border border-destructive/50 text-destructive px-3 py-2 min-h-[44px]"
              >
                Lock
              </button>
            ) : null}
          </div>
        </header>

        <div className="mb-6">
          <FirstGameFunnel variant="studio" />
        </div>

        <nav
          className="mb-6 flex flex-wrap gap-2"
          aria-label="Studio tools"
        >
          {visibleTabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`pixel-font text-xs min-h-[44px] px-3 border text-left ${
                tab === t.id
                  ? "border-accent bg-accent/15 text-accent"
                  : "border-game-border text-muted-foreground hover:bg-secondary/30"
              }`}
            >
              <span className="block">{t.label}</span>
              <span className="block text-[10px] font-sans normal-case tracking-normal opacity-80 mt-0.5">
                {t.blurb}
              </span>
            </button>
          ))}
          {guided && !showMore && (
            <button
              type="button"
              onClick={() => setShowMore(true)}
              className="pixel-font text-xs min-h-[44px] px-3 border border-dashed border-game-border text-muted-foreground"
            >
              More tools…
            </button>
          )}
        </nav>

        {tab === "pack" && <PackTool />}
        {tab === "pixels" && <PixelTool />}
        {tab === "hotspots" && <HotspotTool />}
        {tab === "scene" && <SceneTool />}
        {tab === "audio" && <AudioTool />}
        {tab === "combines" && <CombineTool />}

        <footer className="mt-10 text-xs text-muted-foreground leading-relaxed">
          In play: {PICK.acronym} Author (<kbd className="text-accent">Ctrl</kbd>
          +<kbd className="text-accent">Shift</kbd>+
          <kbd className="text-accent">H</kbd>) edits hotspot % on live{" "}
          {SCRIPT.acronym} rooms (same unlock). Docs:{" "}
          <code className="text-accent">docs/STUDIO.md</code> ·{" "}
          <code className="text-accent">docs/PICK-SCRIPT.md</code>.
          <br />
          © 2025–2026 Aaron Davidson · GPL-3.0-only · see{" "}
          <code className="text-accent">COPYRIGHT</code>
        </footer>
      </div>
    </div>
  );
};

export default Studio;
