import { useGame } from "@/contexts/GameContext";

/**
 * Classic SCUMM sentence preview: "Look at Door", "Use Key with Lock".
 */
export const SentenceLine = () => {
  const { sentenceLine, inputLocked } = useGame();

  if (inputLocked) return null;

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
