import { useGame } from "@/contexts/GameContext";

/**
 * Full-viewport room transition (fade / slide).
 */
export const RoomTransitionOverlay = () => {
  const { roomTransition } = useGame();
  if (!roomTransition || roomTransition.phase === "idle") return null;

  const { phase, kind, durationMs } = roomTransition;
  const ms = Math.max(120, durationMs);

  return (
    <div
      className={`room-transition room-transition-${kind} room-transition-${phase}`}
      style={{
        ["--rt-ms" as string]: `${ms}ms`,
      }}
      aria-hidden
    />
  );
};
