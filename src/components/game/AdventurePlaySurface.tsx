import { Suspense, useMemo, useState } from "react";
import { useGame } from "@/contexts/GameContext";
import { useMusic } from "@/contexts/MusicContext";
import { LocationView } from "@/components/game/LocationView";
import { VerbPanelEnhanced } from "@/components/game/VerbPanelEnhanced";
import { NavigationPanel } from "@/components/game/NavigationPanel";
import { SentenceLine } from "@/components/game/SentenceLine";
import { CutsceneOverlay } from "@/components/game/CutsceneOverlay";
import { RoomTransitionOverlay } from "@/components/game/RoomTransitionOverlay";
import { SpeechBar } from "@/components/game/SpeechBar";
import { MessageDisplay } from "@/components/game/MessageDisplay";
import { GameComplete } from "@/components/game/GameComplete";
import { SaveLoadMenu } from "@/components/game/SaveLoadMenu";
import { SettingsMenu } from "@/components/game/SettingsMenu";
import { JournalDialog } from "@/components/game/JournalDialog";
import { QuestLog } from "@/components/game/QuestLog";
import { MapDialog } from "@/components/game/MapDialog";
import { AchievementsDialog } from "@/components/game/AchievementsDialog";
import { HintDialog } from "@/components/game/HintDialog";
import { CurrentObjectiveBar } from "@/components/game/CurrentObjectiveBar";
import { EgoSwitcher } from "@/components/game/EgoSwitcher";
import { AudioUnlockOverlay } from "@/components/game/AudioUnlockOverlay";
import { ItemCursor } from "@/components/game/ItemCursor";
import { JuiceLayer } from "@/components/game/JuiceLayer";
import { StuckAssistBanner } from "@/components/game/StuckAssistBanner";
import { ConsumeConfirmDialog } from "@/components/game/ConsumeConfirmDialog";
import { AuthorDebugger } from "@/components/game/AuthorDebugger";
import { PlayMobileMenu } from "@/components/game/PlayMobileMenu";
import { getShellCanvasFx, getShellIntro } from "./shellUi";
import { resolvePlayChrome } from "@/engine/playChrome";
import {
  PlayLayoutProvider,
  useViewportPlayLayout,
  type PlayLayout,
} from "@/hooks/usePlayLayout";

export type AdventurePlayVariant = "full" | "preview";

export interface AdventurePlaySurfaceProps {
  /** full = /play route; preview = compact studio frame */
  variant?: AdventurePlayVariant;
  /** Called when the player restarts after game complete */
  onRestart?: () => void;
  /**
   * Leave the game (back to a launcher / menu). When omitted there is no
   * home control — right for a single-game site. The play UI itself has no
   * router dependency; the host decides what "home" means.
   */
  onHome?: () => void;
  /** Label for the home control (default "Games") */
  homeLabel?: string;
}

/**
 * Shared adventure UI used by `/play/:id` and the studio live preview.
 */
export function AdventurePlaySurface({
  variant = "full",
  onRestart,
  onHome,
  homeLabel = "Games",
}: AdventurePlaySurfaceProps) {
  const { gameState, definition } = useGame();
  const { isUnlocked, unlockAudio } = useMusic();
  const [saveMenuOpen, setSaveMenuOpen] = useState(false);
  const [loadMenuOpen, setLoadMenuOpen] = useState(false);
  const preview = variant === "preview";
  const viewportLayout = useViewportPlayLayout();
  const layout: PlayLayout = preview ? "preview" : viewportLayout;
  const chrome = useMemo(
    () =>
      resolvePlayChrome(definition, {
        showHomeLink: !!onHome,
      }),
    [definition, onHome],
  );

  const handleRestart = () => {
    if (onRestart) onRestart();
    else window.location.reload();
  };

  if (!isUnlocked) {
    if (preview) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 p-6 min-h-[280px] bg-background border border-game-border">
          <p className="pixel-font text-sm text-accent text-center">
            Tap to unlock audio & start preview
          </p>
          <button
            type="button"
            onClick={() => void unlockAudio()}
            className="pixel-font text-xs min-h-[44px] px-4 border-2 border-accent text-accent hover:bg-accent/10"
          >
            Start preview
          </button>
        </div>
      );
    }
    return <AudioUnlockOverlay onUnlock={() => void unlockAudio()} />;
  }

  const ShellIntro = getShellIntro(definition);
  if (!gameState.flags.introSeen && ShellIntro) {
    return (
      <Suspense fallback={null}>
        <ShellIntro />
      </Suspense>
    );
  }

  const ShellCanvasFx = getShellCanvasFx(definition);

  const overlays = (
    <>
      <MessageDisplay />
      <SpeechBar />
      <ItemCursor />
      <JuiceLayer />
      <StuckAssistBanner />
      <ConsumeConfirmDialog />
      <AuthorDebugger />
      <RoomTransitionOverlay />
      <CutsceneOverlay />

      {gameState.gameComplete && (
        <GameComplete onRestart={handleRestart} gameState={gameState} />
      )}

      <SaveLoadMenu
        open={saveMenuOpen}
        onClose={() => setSaveMenuOpen(false)}
        mode="save"
      />
      <SaveLoadMenu
        open={loadMenuOpen}
        onClose={() => setLoadMenuOpen(false)}
        mode="load"
      />
    </>
  );

  const canvasFx = ShellCanvasFx && (
    <Suspense fallback={null}>
      <ShellCanvasFx />
    </Suspense>
  );

  const phoneMenu = (
    <PlayMobileMenu
      homeLabel={homeLabel}
      onHome={onHome}
      chrome={chrome}
      onSaveClick={() => setSaveMenuOpen(true)}
      onLoadClick={() => setLoadMenuOpen(true)}
    />
  );

  // Sideways phone: the scene takes the full screen height; everything else
  // lives in a narrow rail so nothing sits on top of (or under) the room.
  if (layout === "phone-landscape") {
    return (
      <PlayLayoutProvider value={layout}>
        <div
          className="h-[100dvh] bg-background game-container relative flex overflow-hidden"
          style={{
            paddingTop: "var(--sat, env(safe-area-inset-top, 0px))",
            paddingBottom: "var(--sab, env(safe-area-inset-bottom, 0px))",
            paddingLeft: "var(--sal, env(safe-area-inset-left, 0px))",
            paddingRight: "var(--sar, env(safe-area-inset-right, 0px))",
          }}
          data-play-layout={layout}
        >
          {canvasFx}
          <div className="play-stage-area flex-1 min-w-0 h-full flex items-center justify-center bg-black relative z-10">
            <LocationView />
          </div>
          <aside
            className="w-[clamp(8.5rem,18vw,13rem)] shrink-0 h-full overflow-y-auto overscroll-contain border-l border-game-border bg-game-ui p-1.5 space-y-1.5 relative z-10"
            aria-label="Game controls"
          >
            <div className="flex items-center gap-1">
              <h1 className="pixel-font text-accent text-[11px] truncate flex-1 min-w-0 leading-none">
                {definition.title}
              </h1>
              <EgoSwitcher />
              {phoneMenu}
            </div>
            <CurrentObjectiveBar rail />
            <VerbPanelEnhanced />
            <NavigationPanel />
          </aside>
          {overlays}
        </div>
      </PlayLayoutProvider>
    );
  }

  // Upright phone: slim header, edge-to-edge scene, one compact row of
  // actions and exits — sized to fit one screen without scrolling.
  if (layout === "phone-portrait") {
    return (
      <PlayLayoutProvider value={layout}>
        <div
          className="min-h-[100dvh] bg-background game-container relative"
          style={{
            paddingTop: "var(--sat, env(safe-area-inset-top, 0px))",
            paddingBottom:
              "max(1rem, calc(var(--sab, env(safe-area-inset-bottom, 0px)) + 0.5rem))",
          }}
          data-play-layout={layout}
        >
          {canvasFx}
          <div className="relative z-10">
            <header className="flex items-center gap-1.5 min-h-[44px] px-2">
              <h1 className="pixel-font text-accent text-sm truncate flex-1 min-w-0 leading-none tracking-tight">
                {definition.title}
              </h1>
              <EgoSwitcher />
              {phoneMenu}
            </header>
            <CurrentObjectiveBar />
            <LocationView />
            <div
              className="space-y-1.5 pt-2"
              style={{
                paddingLeft:
                  "max(0.5rem, var(--sal, env(safe-area-inset-left, 0px)))",
                paddingRight:
                  "max(0.5rem, var(--sar, env(safe-area-inset-right, 0px)))",
              }}
            >
              <VerbPanelEnhanced />
              <NavigationPanel />
              <p className="text-[11px] text-muted-foreground/80 text-center pt-2">
                Tip: turn your phone sideways for a bigger scene.
              </p>
            </div>
          </div>
          {overlays}
        </div>
      </PlayLayoutProvider>
    );
  }

  return (
    <PlayLayoutProvider value={layout}>
      <div
        className={
          preview
            ? "bg-background p-1.5 md:p-2 game-container relative h-full overflow-y-auto"
            : "min-h-screen bg-background p-2 md:p-4 game-container relative"
        }
        style={
          preview
            ? undefined
            : {
                // Prefer CSS vars (index.css); fall back to env() for Capacitor /
                // Safari when vars are unset. Desktop env() is 0 — no layout shift.
                paddingTop:
                  "max(0.35rem, var(--sat, env(safe-area-inset-top, 0px)))",
                // Extra bottom room so Safari’s toolbar doesn’t cover Actions
                paddingBottom:
                  "max(4.5rem, calc(var(--sab, env(safe-area-inset-bottom, 0px)) + 3.25rem))",
                paddingLeft:
                  "max(0.5rem, var(--sal, env(safe-area-inset-left, 0px)))",
                paddingRight:
                  "max(0.5rem, var(--sar, env(safe-area-inset-right, 0px)))",
              }
        }
      >
        {/* Pack-opted canvas FX — other packs use Room.particles / AtmosphereLayers */}
        {!preview && ShellCanvasFx && (
          <Suspense fallback={null}>
            <ShellCanvasFx />
          </Suspense>
        )}
        <div
          className={
            preview
              ? "space-y-1.5 relative z-10"
              : "max-w-7xl mx-auto space-y-1 md:space-y-4 relative z-10"
          }
        >
          <header className="bg-game-ui border border-game-border md:border-2 px-1.5 py-1 md:px-2 md:py-1.5 md:p-3">
            {/* Desktop / preview: full toolbar */}
            <div
              className={
                preview
                  ? "flex flex-col md:flex-row justify-between items-center gap-2"
                  : "flex flex-row justify-between items-center gap-2"
              }
            >
              <div className="text-center flex-1 min-w-0">
                <h1
                  className={`pixel-font text-accent truncate ${
                    preview
                      ? "text-sm md:text-base"
                      : "text-xl md:text-3xl mb-1"
                  }`}
                >
                  {definition.title}
                  {preview && (
                    <span className="text-muted-foreground font-sans text-[10px] ml-2">
                      preview
                    </span>
                  )}
                </h1>
                {!preview && definition.subtitle && (
                  <p className="text-xs md:text-sm text-muted-foreground hidden md:block">
                    {definition.subtitle}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-1 md:gap-2 items-center justify-center">
                {chrome.home && onHome && (
                  <button
                    type="button"
                    onClick={onHome}
                    className="pixel-font text-xs border border-game-border px-2 py-1 hover:bg-secondary/40"
                  >
                    {homeLabel}
                  </button>
                )}
                <EgoSwitcher />
                {!preview && chrome.journal && <JournalDialog />}
                {!preview && chrome.quests && <QuestLog />}
                {chrome.map && <MapDialog />}
                {!preview && chrome.achievements && <AchievementsDialog />}
                {chrome.hints && <HintDialog />}
                <SettingsMenu
                  onSaveClick={() => setSaveMenuOpen(true)}
                  onLoadClick={() => setLoadMenuOpen(true)}
                />
              </div>
            </div>
          </header>

          <CurrentObjectiveBar />

          {/* Wide screens: actions + exits sit beside the scene, so the
              whole game fits one screen without scrolling. */}
          <div
            className={
              preview
                ? "space-y-1.5 md:space-y-2"
                : "space-y-2 xl:space-y-0 xl:grid xl:grid-cols-[minmax(0,1fr)_19rem] xl:gap-4 xl:items-start"
            }
          >
            <div className="space-y-1.5 md:space-y-2 min-w-0">
              <LocationView />
              <SentenceLine />
            </div>
            <div className="space-y-1.5 md:space-y-2">
              <VerbPanelEnhanced />
              <NavigationPanel />
            </div>
          </div>

          {!preview && (
            <footer className="bg-game-ui border-2 border-game-border p-2 md:p-3 text-center hidden md:block">
              <p className="text-xs text-muted-foreground pixel-font">
                Inventory: click an item, then a hotspot to use it • Number keys
                for verbs • H for hints • ESC to deselect • Map for fast travel
              </p>
            </footer>
          )}
        </div>

        {overlays}
      </div>
    </PlayLayoutProvider>
  );
}
