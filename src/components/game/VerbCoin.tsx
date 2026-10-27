import { useGame } from "@/contexts/GameContext";
import type { Hotspot, VerbId } from "@/engine";
import { soundFX } from "@/utils/soundEffects";

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
      aria-label="Verb coin"
    >
      <div className="relative w-28 h-28">
        <div className="absolute inset-0 rounded-full border-2 border-game-border bg-game-ui/95 shadow-lg" />
        <button
          type="button"
          className="absolute inset-[34%] rounded-full border border-border bg-background/80 text-[10px] pixel-font text-muted-foreground"
          onClick={onClose}
          aria-label="Cancel"
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
              {face.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
