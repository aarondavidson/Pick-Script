import { Button } from "@/components/ui/button";
import { MusicControls } from "@/components/game/MusicControls";
import { CreditsList } from "@/components/game/CreditsList";
import { Save, FolderOpen, Settings, RotateCcw } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";
import { useGame } from "@/contexts/GameContext";
import { useDebug } from "@/contexts/DebugContext";
import type { VerbMode } from "@/engine/verbs";
import { listLocales } from "@/engine/i18n";
import {
  getReduceMotionOverride,
  setReduceMotionOverride,
  prefersReducedMotion,
} from "@/engine/juice";
import {
  getCaptionsEnabled,
  setCaptionsEnabled,
  getTextScale,
  setTextScale,
  type TextScale,
} from "@/utils/playPrefs";
import { PICK } from "@/product/branding";
import type { PlayDialogChromeProps } from "@/components/game/playDialogChrome";
import { uiText } from "@/engine/uiStrings";

interface SettingsMenuProps extends PlayDialogChromeProps {
  onSaveClick: () => void;
  onLoadClick: () => void;
}

export const SettingsMenu = ({
  onSaveClick,
  onLoadClick,
  open: openProp,
  onOpenChange,
  hideTrigger = false,
}: SettingsMenuProps) => {
  const {
    verbMode,
    setVerbMode,
    loadAutosave,
    runtime,
    locale,
    setLocale,
    definition,
  } = useGame();
  const { debugMode, setDebugMode, authoringAvailable } = useDebug();
  const hasAutosave = runtime.save.hasAutosave();
  const locales = listLocales(definition.i18n);
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(() =>
    getReduceMotionOverride()
  );
  const reduceMotionActive =
    reduceMotion === null ? prefersReducedMotion() : reduceMotion;
  const [captions, setCaptions] = useState(() => getCaptionsEnabled());
  const [textScale, setTextScaleState] = useState<TextScale>(() =>
    getTextScale()
  );
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const controlled = openProp !== undefined;
  const open = controlled ? !!openProp : uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;

  const modes: { id: VerbMode; label: string }[] = [
    { id: "classic", label: uiText("ui.settings.verbs_classic") },
    { id: "simple", label: uiText("ui.settings.verbs_simple") },
    { id: "coin", label: uiText("ui.settings.verbs_coin") },
  ];

  const closeThen = (fn: () => void) => {
    setOpen(false);
    fn();
  };

  const body = (
    <div className="space-y-4">
      <div>
        <h3 className="pixel-font text-accent mb-2 text-sm">{uiText("ui.settings.audio")}</h3>
        <MusicControls />
      </div>

      <div className="border-t border-game-border pt-3">
        <h3 className="pixel-font text-accent mb-2 text-sm">{uiText("ui.settings.verb_mode")}</h3>
        <div className="flex flex-col gap-1">
          {modes.map((m) => (
            <Button
              key={m.id}
              variant={verbMode === m.id ? "default" : "outline"}
              size="sm"
              className={`pixel-font w-full justify-start text-xs ${
                verbMode === m.id
                  ? "bg-accent text-accent-foreground"
                  : "bg-secondary/50 hover:bg-accent/20"
              }`}
              onClick={() => setVerbMode(m.id)}
            >
              {m.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="border-t border-game-border pt-3">
        <h3 className="pixel-font text-accent mb-2 text-sm">{uiText("ui.settings.captions")}</h3>
        <Button
          variant={captions ? "default" : "outline"}
          size="sm"
          className={`pixel-font w-full justify-start text-xs ${
            captions
              ? "bg-accent text-accent-foreground"
              : "bg-secondary/50 hover:bg-accent/20"
          }`}
          onClick={() => {
            const next = !captions;
            setCaptionsEnabled(next);
            setCaptions(next);
          }}
        >
          {captions ? uiText("ui.settings.captions_on") : uiText("ui.settings.captions_off")}
        </Button>
        <p className="text-[10px] text-muted-foreground mt-1.5 mb-2">
          {uiText("ui.settings.captions_help")}
        </p>
        <h3 className="pixel-font text-accent mb-2 text-sm">{uiText("ui.settings.text_size")}</h3>
        <div className="flex gap-1">
          {(["sm", "md", "lg"] as TextScale[]).map((s) => (
            <Button
              key={s}
              variant={textScale === s ? "default" : "outline"}
              size="sm"
              className={`pixel-font flex-1 text-xs ${
                textScale === s
                  ? "bg-accent text-accent-foreground"
                  : "bg-secondary/50"
              }`}
              onClick={() => {
                setTextScale(s);
                setTextScaleState(s);
              }}
            >
              {s.toUpperCase()}
            </Button>
          ))}
        </div>
      </div>

      <div className="border-t border-game-border pt-3">
        <h3 className="pixel-font text-accent mb-2 text-sm">{uiText("ui.settings.motion")}</h3>
        <Button
          variant={reduceMotionActive ? "default" : "outline"}
          size="sm"
          className={`pixel-font w-full justify-start text-xs ${
            reduceMotionActive
              ? "bg-accent text-accent-foreground"
              : "bg-secondary/50 hover:bg-accent/20"
          }`}
          onClick={() => {
            const next = !reduceMotionActive;
            setReduceMotionOverride(next);
            setReduceMotion(next);
          }}
        >
          {reduceMotionActive ? uiText("ui.settings.motion_reduced") : uiText("ui.settings.motion_reduce")}
        </Button>
        <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">
          {uiText("ui.settings.motion_help")}
        </p>
      </div>

      {locales.length > 1 && (
        <div className="border-t border-game-border pt-3">
          <h3 className="pixel-font text-accent mb-2 text-sm">{uiText("ui.settings.language")}</h3>
          <div className="flex flex-col gap-1">
            {locales.map((id) => (
              <Button
                key={id}
                variant={locale === id ? "default" : "outline"}
                size="sm"
                className={`pixel-font w-full justify-start text-xs ${
                  locale === id
                    ? "bg-accent text-accent-foreground"
                    : "bg-secondary/50 hover:bg-accent/20"
                }`}
                onClick={() => setLocale(id)}
              >
                {id.toUpperCase()}
              </Button>
            ))}
          </div>
        </div>
      )}

      {authoringAvailable && (
        <div className="border-t border-game-border pt-3">
          <h3 className="pixel-font text-accent mb-2 text-sm">
            {PICK.acronym} authoring
          </h3>
          <Button
            variant={debugMode ? "default" : "outline"}
            size="sm"
            className={`pixel-font w-full justify-start text-xs ${
              debugMode
                ? "bg-accent text-accent-foreground"
                : "bg-secondary/50 hover:bg-accent/20"
            }`}
            onClick={() => setDebugMode(!debugMode)}
          >
            {debugMode
              ? `${PICK.acronym} Author on`
              : `${PICK.acronym} Author mode`}
          </Button>
          <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">
            Hotspot % edit, copy snippets, flags/exits. Shortcut: Ctrl+Shift+H.{" "}
            {PICK.acronym}: /pick or /studio
          </p>
        </div>
      )}

      <div className="border-t border-game-border pt-3">
        <h3 className="pixel-font text-accent mb-2 text-sm">{uiText("ui.settings.game")}</h3>
        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            size="sm"
            className="pixel-font bg-secondary/50 hover:bg-accent/20 w-full justify-start"
            onClick={() => closeThen(onSaveClick)}
          >
            <Save className="w-4 h-4 mr-2" />
            {uiText("ui.save.save_game")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="pixel-font bg-secondary/50 hover:bg-accent/20 w-full justify-start"
            onClick={() => closeThen(onLoadClick)}
          >
            <FolderOpen className="w-4 h-4 mr-2" />
            {uiText("ui.save.load_game")}
          </Button>
          {hasAutosave && (
            <Button
              variant="outline"
              size="sm"
              className="pixel-font bg-secondary/50 hover:bg-accent/20 w-full justify-start"
              onClick={() => {
                setOpen(false);
                loadAutosave();
              }}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              {uiText("ui.save.restore_autosave")}
            </Button>
          )}
        </div>
      </div>

      {definition.credits && definition.credits.length > 0 && (
        <div className="border-t border-game-border pt-3">
          <h3 className="pixel-font text-accent mb-2 text-sm">{uiText("ui.common.credits")}</h3>
          <div className="text-xs text-muted-foreground max-h-32 overflow-y-auto">
            <CreditsList credits={definition.credits} />
          </div>
        </div>
      )}
    </div>
  );

  // Mobile Menu sheet: full-screen dialog (Popover needs an anchor).
  if (hideTrigger) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto bg-game-ui border-2 border-game-border">
          <DialogHeader>
            <DialogTitle className="pixel-font text-accent text-lg">
              {uiText("ui.menu.settings")}
            </DialogTitle>
          </DialogHeader>
          {body}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="pixel-font bg-secondary/50 hover:bg-accent/20 min-h-[40px]"
          aria-label={uiText("ui.menu.settings")}
        >
          <Settings className="w-4 h-4 md:mr-1" />
          <span className="hidden md:inline">{uiText("ui.menu.settings")}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 bg-game-ui border-2 border-game-border p-4">
        {body}
      </PopoverContent>
    </Popover>
  );
};
