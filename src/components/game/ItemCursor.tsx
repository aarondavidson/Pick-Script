import { useEffect, useState } from "react";
import { useGame } from "@/contexts/GameContext";
import { resolveItemIcon } from "@/utils/itemIcon";
import { resolveCursorState } from "@/engine/script";

/**
 * S.C.R.I.P.T. cursor state machine — inventory item-as-cursor follows the pointer.
 * On touch / coarse pointers, lifts above the finger so the item stays visible.
 */
export function ItemCursor() {
  const {
    selectedCombineItem,
    selectedVerb,
    definition,
    inputLocked,
  } = useGame();
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [lift, setLift] = useState(false);

  const cursor = resolveCursorState({
    selectedVerb,
    selectedCombineItem,
    inputLocked,
  });

  useEffect(() => {
    if (cursor.mode !== "item" || !cursor.item) {
      setPos(null);
      document.body.style.cursor = "";
      return;
    }
    const coarse =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(pointer: coarse)").matches;

    document.body.style.cursor = cursor.cssCursor;
    const onMove = (e: PointerEvent) => {
      const isTouch = e.pointerType === "touch" || coarse;
      setLift(isTouch);
      setPos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("pointermove", onMove);
    // Seed position on select for touch (no move yet)
    if (coarse) {
      setLift(true);
    }
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.body.style.cursor = "";
    };
  }, [cursor.mode, cursor.item, cursor.cssCursor]);

  // Non-item verb cursors — light CSS hint on body
  useEffect(() => {
    if (cursor.mode === "item" || cursor.mode === "walk" || cursor.mode === "default") {
      return;
    }
    document.body.style.cursor = cursor.cssCursor;
    return () => {
      document.body.style.cursor = "";
    };
  }, [cursor.mode, cursor.cssCursor]);

  if (cursor.mode !== "item" || !cursor.item || !pos) return null;

  const icon = resolveItemIcon(cursor.item, definition.itemIcons);
  // Mobile port practice: lift glyph above the occluding finger (~56px)
  const liftPx = lift ? 56 : 0;

  return (
    <div
      className="fixed z-[90] pointer-events-none"
      style={{
        left: pos.x,
        top: pos.y - liftPx,
        transform: "translate(-50%, -50%)",
      }}
      aria-hidden
      data-lift={lift ? "true" : undefined}
      title={cursor.label}
    >
      <div className="relative flex items-center justify-center">
        <span
          className="absolute w-5 h-5 border border-accent/80 rounded-sm"
          style={{ boxShadow: "0 0 0 1px rgba(0,0,0,0.45)" }}
        />
        <span className="absolute w-px h-7 bg-accent/70" />
        <span className="absolute h-px w-7 bg-accent/70" />
        <img
          src={icon}
          alt=""
          className="w-8 h-8 object-contain ml-5 mt-5 drop-shadow"
          draggable={false}
        />
      </div>
    </div>
  );
}
