import type { RefObject } from "react";
import type {
  JsonPackHotspot,
  JsonPackWalkbox,
} from "@/engine/jsonPack";
import { isMissingOrPlaceholderArt } from "@/engine/packDoctor";
import { isSafeMediaUrl } from "@/engine/security";
import type { StagePct } from "@/studio/stagePointer";

export interface PackStageViewportProps {
  stageRef: RefObject<HTMLDivElement | null>;
  stageBackground: string;
  roomName: string;
  roomId: string;
  roomImage: string | undefined;
  entryPoint: { x: number; y: number } | undefined;
  canvasMode: "hotspots" | "walkboxes";
  hotspots: JsonPackHotspot[];
  walkboxes: JsonPackWalkbox[];
  selectedHotspot: string | null;
  selectedWalkbox: string | null;
  placeEntry: boolean;
  drawing: { x0: number; y0: number; x1: number; y1: number } | null;
  pctFromEvent: (e: { clientX: number; clientY: number }) => StagePct;
  onStageMouseDown: (p: StagePct) => void;
  onDrawingMove: (p: StagePct) => void;
  onDrawingEnd: () => void;
  onDrawingCancel: () => void;
  onSelectHotspot: (id: string) => void;
  onSelectWalkbox: (id: string) => void;
}

/**
 * Stage draw / hit surface — background, walkboxes, hotspots, entry/approach markers.
 */
export function PackStageViewport({
  stageRef,
  stageBackground,
  roomName,
  roomId,
  roomImage,
  entryPoint,
  canvasMode,
  hotspots,
  walkboxes,
  selectedHotspot,
  selectedWalkbox,
  placeEntry,
  drawing,
  pctFromEvent,
  onStageMouseDown,
  onDrawingMove,
  onDrawingEnd,
  onDrawingCancel,
  onSelectHotspot,
  onSelectWalkbox,
}: PackStageViewportProps) {
  return (
    <div
      ref={stageRef}
      className="relative w-full aspect-video border border-border bg-black/40 select-none touch-none overflow-hidden"
      onMouseDown={(e) => {
        onStageMouseDown(pctFromEvent(e));
      }}
      onMouseMove={(e) => {
        if (!drawing) return;
        onDrawingMove(pctFromEvent(e));
      }}
      onMouseUp={() => {
        onDrawingEnd();
      }}
      onMouseLeave={() => onDrawingCancel()}
    >
      <img
        src={stageBackground}
        alt=""
        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        draggable={false}
      />
      {isMissingOrPlaceholderArt(roomImage) && (
        <div className="absolute top-2 left-2 right-2 z-10 pointer-events-none">
          <div className="inline-block max-w-full border border-accent/70 bg-black/70 px-2 py-1 text-[10px] text-accent">
            Missing art — placeholder for “{roomName || roomId}”. Upload above
            or open Ship checklist.
          </div>
        </div>
      )}
      {walkboxes.map((w) => (
        <button
          key={w.id}
          type="button"
          className={`absolute border border-dashed ${
            canvasMode === "walkboxes"
              ? w.id === selectedWalkbox
                ? "border-primary bg-primary/25"
                : "border-primary/50 bg-primary/10"
              : "border-primary/20 bg-primary/5 pointer-events-none"
          }`}
          style={{
            left: `${w.x}%`,
            top: `${w.y}%`,
            width: `${w.width}%`,
            height: `${w.height}%`,
          }}
          onClick={(e) => {
            if (canvasMode !== "walkboxes") return;
            e.stopPropagation();
            onSelectWalkbox(w.id);
          }}
          title={w.id}
        />
      ))}
      {hotspots.map((h) => {
        const skinKey = String(h.initialState ?? 0);
        const skin = h.stateOverlays?.[skinKey];
        return (
          <button
            key={h.id}
            type="button"
            className={`absolute border-2 overflow-hidden ${
              canvasMode !== "hotspots"
                ? "border-accent/20 bg-transparent pointer-events-none"
                : h.id === selectedHotspot
                  ? "border-accent bg-accent/20"
                  : "border-primary/70 bg-primary/10"
            }`}
            style={{
              left: `${h.x}%`,
              top: `${h.y}%`,
              width: `${h.width}%`,
              height: `${h.height}%`,
            }}
            onClick={(e) => {
              if (canvasMode !== "hotspots") return;
              e.stopPropagation();
              onSelectHotspot(h.id);
            }}
          >
            {skin && isSafeMediaUrl(skin) && (
              <img
                src={skin}
                alt=""
                className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                draggable={false}
              />
            )}
          </button>
        );
      })}
      {(entryPoint || placeEntry) && (
        <div
          className="absolute w-3 h-3 -ml-1.5 -mt-1.5 rounded-full border-2 border-accent bg-accent/80 pointer-events-none"
          style={{
            left: `${entryPoint?.x ?? 50}%`,
            top: `${entryPoint?.y ?? 75}%`,
          }}
          title="Entry point"
        />
      )}
      {hotspots.map((h) => {
        const ap = h.approach;
        if (!ap && h.id !== selectedHotspot) return null;
        const x = ap?.x ?? h.x + h.width / 2;
        const y = ap?.y ?? Math.min(95, h.y + h.height);
        return (
          <div
            key={`ap-${h.id}`}
            className={`absolute w-2.5 h-2.5 -ml-1 -mt-1 rotate-45 border pointer-events-none ${
              h.id === selectedHotspot
                ? "border-primary bg-primary/80"
                : "border-primary/50 bg-primary/30"
            }`}
            style={{ left: `${x}%`, top: `${y}%` }}
            title={`Approach: ${h.id}`}
          />
        );
      })}
      {drawing && (
        <div
          className="absolute border border-dashed border-accent/80 bg-accent/10 pointer-events-none"
          style={{
            left: `${Math.min(drawing.x0, drawing.x1)}%`,
            top: `${Math.min(drawing.y0, drawing.y1)}%`,
            width: `${Math.abs(drawing.x1 - drawing.x0)}%`,
            height: `${Math.abs(drawing.y1 - drawing.y0)}%`,
          }}
        />
      )}
    </div>
  );
}
