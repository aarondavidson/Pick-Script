import { useGame } from "@/contexts/GameContext";

/**
 * Classic SCUMM sentence preview: "Look at Door", "Use Key with Lock".
 *
 * `overlay` (phones) floats over the bottom of the scene and only exists
 * while there is a sentence — no permanently empty row under the scene.
 */
export const SentenceLine = ({ overlay = false }: { overlay?: boolean }) => {
  const { sentenceLine, inputLocked } = useGame();

  if (inputLocked) return null;

  if (overlay) {
    if (!sentenceLine) return null;
    return (
      <div
        className="absolute bottom-1 left-1/2 -translate-x-1/2 z-10 max-w-[92%] pointer-events-none bg-game-ui/90 border border-game-border px-2.5 py-1"
        aria-live="polite"
      >
        <p className="pixel-font text-accent text-xs tracking-wide truncate">
          {sentenceLine}
        </p>
      </div>
    );
  }

  return (
    <div
      className="bg-game-ui border-2 border-game-border px-3 py-2 text-center min-h-[2.25rem] flex items-center justify-center"
      aria-live="polite"
    >
      <p className="pixel-font text-accent text-xs md:text-sm tracking-wide">
        {sentenceLine || "\u00a0"}
      </p>
    </div>
  );
};
