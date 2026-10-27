import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { JournalDialog } from "@/components/game/JournalDialog";
import { QuestLog } from "@/components/game/QuestLog";
import { MapDialog } from "@/components/game/MapDialog";
import { AchievementsDialog } from "@/components/game/AchievementsDialog";
import { HintDialog } from "@/components/game/HintDialog";
import { SettingsMenu } from "@/components/game/SettingsMenu";
import type { PlayChromeFlags } from "@/engine/playChrome";

type ExtraPanel =
  | "journal"
  | "quests"
  | "map"
  | "achievements"
  | "hints"
  | "settings"
  | null;

/**
 * Phone play chrome — one Menu control (extras + Settings).
 * Opens a bottom sheet; each row opens the matching dialog after the sheet closes.
 */
export function PlayMobileMenu({
  homeLabel,
  chrome,
  onSaveClick,
  onLoadClick,
}: {
  homeLabel: string;
  chrome: PlayChromeFlags;
  onSaveClick: () => void;
  onLoadClick: () => void;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [panel, setPanel] = useState<ExtraPanel>(null);

  const openPanel = (id: ExtraPanel) => {
    setSheetOpen(false);
    // Let the sheet finish closing before mounting the dialog (iOS focus).
    window.setTimeout(() => setPanel(id), 180);
  };

  return (
    <>
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="pixel-font bg-secondary/50 hover:bg-accent/20 min-h-[36px] h-9 px-2.5 shrink-0"
            aria-label="Game menu"
          >
            <Menu className="w-4 h-4" />
            <span className="sr-only">Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent
          side="bottom"
          className="bg-game-ui border-t-2 border-game-border rounded-t-lg"
          style={{
            paddingLeft:
              "max(1rem, var(--sal, env(safe-area-inset-left, 0px)))",
            paddingRight:
              "max(1rem, var(--sar, env(safe-area-inset-right, 0px)))",
            paddingBottom:
              "max(1.25rem, var(--sab, env(safe-area-inset-bottom, 0px)))",
            paddingTop: "max(0.75rem, var(--sat, env(safe-area-inset-top, 0px)))",
          }}
        >
          <SheetHeader className="mb-3 text-left">
            <SheetTitle className="pixel-font text-accent text-lg">
              Menu
            </SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col gap-2" aria-label="Game extras">
            {chrome.home && (
              <Link
                to="/"
                className="pixel-font text-sm min-h-[44px] inline-flex items-center border border-game-border px-3 hover:bg-secondary/40"
                onClick={() => setSheetOpen(false)}
              >
                ← {homeLabel}
              </Link>
            )}
            {chrome.journal && (
              <MenuRow onClick={() => openPanel("journal")}>Journal</MenuRow>
            )}
            {chrome.quests && (
              <MenuRow onClick={() => openPanel("quests")}>Quests</MenuRow>
            )}
            {chrome.map && (
              <MenuRow onClick={() => openPanel("map")}>Map</MenuRow>
            )}
            {chrome.achievements && (
              <MenuRow onClick={() => openPanel("achievements")}>
                Achievements
              </MenuRow>
            )}
            {chrome.hints && (
              <MenuRow onClick={() => openPanel("hints")}>Hints</MenuRow>
            )}
            <MenuRow onClick={() => openPanel("settings")}>Settings</MenuRow>
          </nav>
        </SheetContent>
      </Sheet>

      {/* Controlled dialogs — no toolbar triggers */}
      <HiddenHost>
        {chrome.journal && (
          <JournalDialog
            open={panel === "journal"}
            onOpenChange={(o) => !o && setPanel(null)}
            hideTrigger
          />
        )}
        {chrome.quests && (
          <QuestLog
            open={panel === "quests"}
            onOpenChange={(o) => !o && setPanel(null)}
            hideTrigger
          />
        )}
        {chrome.map && (
          <MapDialog
            open={panel === "map"}
            onOpenChange={(o) => !o && setPanel(null)}
            hideTrigger
          />
        )}
        {chrome.achievements && (
          <AchievementsDialog
            open={panel === "achievements"}
            onOpenChange={(o) => !o && setPanel(null)}
            hideTrigger
          />
        )}
        {chrome.hints && (
          <HintDialog
            open={panel === "hints"}
            onOpenChange={(o) => !o && setPanel(null)}
            hideTrigger
          />
        )}
        <SettingsMenu
          open={panel === "settings"}
          onOpenChange={(o) => !o && setPanel(null)}
          hideTrigger
          onSaveClick={onSaveClick}
          onLoadClick={onLoadClick}
        />
      </HiddenHost>
    </>
  );
}

function MenuRow({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="pixel-font text-sm min-h-[44px] w-full text-left border border-game-border px-3 text-foreground hover:bg-accent/10 hover:border-accent/50"
    >
      {children}
    </button>
  );
}

/** Keep dialog portals mounted without affecting layout. */
function HiddenHost({ children }: { children: ReactNode }) {
  return <div className="contents">{children}</div>;
}
