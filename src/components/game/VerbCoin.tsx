import { useEffect, useRef } from "react";
import { useGame } from "@/contexts/GameContext";
import type { Hotspot, VerbId } from "@/engine";
import { soundFX } from "@/utils/soundEffects";
import { uiText, uiTextOr } from "@/engine/uiStrings";

interface VerbCoinProps {
  hotspot: Hotspot;
  x: number;
  y: number;
  onClose: () => void;
  onDialogueOpen?: () => void;
}

const FACES: { verb: VerbId; label: string; angle: number }[] = [
  { verb: "look", label: "Look", angle: -90 },
  { verb: "talk", label: "Talk", angle: 30 },
  { verb: "use", label: "Use", angle: 150 },
];

/**
 * CMI-style verb coin — three faces around the click point.
 */
export function VerbCoin({
  hotspot,
  x,
  y,
  onClose,
  onDialogueOpen,
}: VerbCoinProps) {
  const { setSelectedVerb, executeSentence, inputLocked } = useGame();

  const coinRef = useRef<HTMLDivElement>(null);

  // Keyboard: focus the first usable face; Escape closes; arrows cycle
  useEffect(() => {
    const first = coinRef.current?.querySelector<HTMLButtonElement>(
      'button[role="menuitem"]:not(:disabled)'
    );
    first?.focus();
  }, []);

  const closeAndReturnFocus = () => {
    onClose();
    // Put focus back on the thing the coin was opened for
    requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>(`[data-hotspot="${CSS.escape(hotspot.id)}"]`)
        ?.focus();
    });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      closeAndReturnFocus();
      return;
    }
    const dir =
      e.key === "ArrowRight" || e.key === "ArrowDown"
        ? 1
        : e.key === "ArrowLeft" || e.key === "ArrowUp"
          ? -1
          : 0;
    if (!dir) return;
    e.preventDefault();
    const faces = [
      ...(coinRef.current?.querySelectorAll<HTMLButtonElement>(
        'button[role="menuitem"]:not(:disabled)'
      ) ?? []),
    ];
    if (!faces.length) return;
    const at = faces.indexOf(document.activeElement as HTMLButtonElement);
    faces[(at + dir + faces.length) % faces.length]?.focus();
  };

  if (inputLocked) return null;

  const pick = (verb: VerbId) => {
    soundFX.verbSelect();
    setSelectedVerb(verb);
    executeSentence(hotspot, { onDialogueOpen });
    onClose();
  };

  return (
    <div
      className="absolute z-40 pointer-events-auto"
      style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)" }}
      role="menu"
      ref={coinRef}
      onKeyDown={onKeyDown}
      aria-label={uiText("ui.a11y.verb_choices", { name: hotspot.name })}
    >
      <div className="relative w-28 h-28">
        <div className="absolute inset-0 rounded-full border-2 border-game-border bg-game-ui/95 shadow-lg" />
        <button
          type="button"
          className="absolute inset-[34%] rounded-full border border-border bg-background/80 text-[10px] pixel-font text-muted-foreground"
          onClick={closeAndReturnFocus}
          aria-label={uiText("ui.common.cancel")}
        >
          ✕
        </button>
        {FACES.map((face) => {
          const rad = (face.angle * Math.PI) / 180;
          const r = 38;
          const cx = 50 + Math.cos(rad) * r;
          const cy = 50 + Math.sin(rad) * r;
          const allowed =
            !hotspot.verbs?.length || hotspot.verbs.includes(face.verb);
          return (
            <button
              key={face.verb}
              type="button"
              disabled={!allowed}
              role="menuitem"
              className={`absolute w-11 h-11 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 pixel-font text-[10px] ${
                allowed
                  ? "border-accent bg-secondary/90 text-accent hover:bg-accent/20"
                  : "border-border bg-muted/40 text-muted-foreground opacity-40"
              }`}
              style={{ left: `${cx}%`, top: `${cy}%` }}
              onClick={() => allowed && pick(face.verb)}
            >
              {uiTextOr(`ui.verb.short.${face.verb}`, face.label)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
