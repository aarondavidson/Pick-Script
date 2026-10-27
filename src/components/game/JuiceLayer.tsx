import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useGame } from "@/contexts/GameContext";
import { shakeTrauma, type JuiceBurst } from "@/engine/juice";

/**
 * Renders event juice (shake / flash / burst) from AdventureProvider.activeJuice.
 * Ambient room particles live elsewhere — this is feedback for player actions.
 */
export function JuiceLayer() {
  const { activeJuice, clearJuice } = useGame();
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [flashAlpha, setFlashAlpha] = useState(0);
  const [flashColor, setFlashColor] = useState("rgba(255,255,255,0.55)");
  const [bursts, setBursts] = useState<
    { id: number; kind: JuiceBurst; x: number; y: number }[]
  >([]);
  const rafRef = useRef(0);
  const idRef = useRef(0);

  useEffect(() => {
    if (!activeJuice) return;

    const trauma0 = shakeTrauma(activeJuice.shake);
    const start = performance.now();
    const duration = Math.max(180, 120 + trauma0 * 400 + activeJuice.hitStopMs);

    if (activeJuice.flash !== "none") {
      setFlashColor(
        activeJuice.flash === "warm"
          ? "rgba(255, 210, 140, 0.45)"
          : activeJuice.flash === "cool"
            ? "rgba(140, 190, 255, 0.4)"
            : "rgba(255,255,255,0.5)"
      );
      setFlashAlpha(0.55);
    }

    if (activeJuice.burst !== "none") {
      const id = ++idRef.current;
      setBursts((prev) => [
        ...prev.slice(-4),
        {
          id,
          kind: activeJuice.burst,
          x: 50 + (Math.random() * 20 - 10),
          y: 45 + (Math.random() * 16 - 8),
        },
      ]);
      window.setTimeout(() => {
        setBursts((prev) => prev.filter((b) => b.id !== id));
      }, 520);
    }

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const decay = (1 - t) * (1 - t);
      const trauma = trauma0 * decay;
      if (trauma > 0.01) {
        const amp = trauma * trauma * 14;
        setOffset({
          x: (Math.random() * 2 - 1) * amp,
          y: (Math.random() * 2 - 1) * amp,
        });
      } else {
        setOffset({ x: 0, y: 0 });
      }
      if (activeJuice.flash !== "none") {
        setFlashAlpha(0.55 * (1 - t));
      }
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setOffset({ x: 0, y: 0 });
        setFlashAlpha(0);
        clearJuice();
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [activeJuice, clearJuice]);

  // Apply shake to the game stage container via CSS variable on body/root
  useEffect(() => {
    const root = document.querySelector(".game-container") as HTMLElement | null;
    if (!root) return;
    root.style.transform =
      offset.x || offset.y
        ? `translate(${offset.x.toFixed(1)}px, ${offset.y.toFixed(1)}px)`
        : "";
    return () => {
      root.style.transform = "";
    };
  }, [offset]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[85]" aria-hidden>
      {flashAlpha > 0.02 && (
        <div
          className="absolute inset-0"
          style={{
            background: flashColor,
            opacity: flashAlpha,
          }}
        />
      )}
      {bursts.map((b) => (
        <div
          key={b.id}
          className="absolute juice-burst"
          data-kind={b.kind}
          style={{
            left: `${b.x}%`,
            top: `${b.y}%`,
          }}
        >
          {Array.from({ length: b.kind === "stars" ? 8 : 6 }).map((_, i) => (
            <span
              key={i}
              className="juice-spark"
              style={
                {
                  "--i": i,
                  "--n": b.kind === "stars" ? 8 : 6,
                } as CSSProperties
              }
            />
          ))}
        </div>
      ))}
    </div>
  );
}
