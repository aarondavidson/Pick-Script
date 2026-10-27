import { useState, useRef, useCallback, useMemo } from "react";
import { Hotspot } from "@/engine";
import { useDebug } from "@/contexts/DebugContext";
import { useGame } from "@/contexts/GameContext";
import { toast } from "@/hooks/use-toast";
import { useHotspotOverrides } from "@/hooks/useHotspotOverrides";
import { useAuthorDraftHotspots } from "@/hooks/useAuthorDraftHotspots";
import {
  formatAllHotspotCoords,
  formatFlagsSnippet,
  formatHotspotCoordSnippet,
  formatHotspotObjectSnippet,
  listExitRows,
  listTrueFlags,
} from "@/authoring/roomAuthorInfo";
import {
  hotspotsToSidecarOverlays,
  upsertSidecarRoom,
  clearPackSidecar,
} from "@/engine/packSidecar";
import { AuthorModePanel } from "@/components/game/AuthorModePanel";
import { useHotspotDragDraw } from "@/components/game/useHotspotDragDraw";

interface HotspotDebugOverlayProps {
  hotspots: Hotspot[];
  locationId: string;
}

const getHotspotColor = (hotspot: Hotspot): string => {
  if (hotspot.dialogue) return "rgba(255, 200, 50, 0.4)";
  if (hotspot.item) return "rgba(50, 255, 100, 0.4)";
  if (hotspot.verbs.includes("open")) return "rgba(100, 150, 255, 0.4)";
  return "rgba(255, 100, 150, 0.4)";
};

const getBorderColor = (hotspot: Hotspot): string => {
  if (hotspot.dialogue) return "rgb(255, 200, 50)";
  if (hotspot.item) return "rgb(50, 255, 100)";
  if (hotspot.verbs.includes("open")) return "rgb(100, 150, 255)";
  return "rgb(255, 100, 150)";
};

/**
 * Author mode overlay (Ctrl+Shift+H) — edit hotspot %, copy snippets, inspect flags/exits.
 */
export const HotspotDebugOverlay = ({
  hotspots,
  locationId,
}: HotspotDebugOverlayProps) => {
  const { debugMode, setDebugMode } = useDebug();
  const { runtime, gameState, definition } = useGame();
  const [editingHotspot, setEditingHotspot] = useState<string | null>(null);

  const {
    getOverride,
    setOverride,
    clearLocationOverrides,
    clearAllOverrides,
    getModifiedCount,
    getTotalModifiedCount,
    overrides,
  } = useHotspotOverrides(locationId);

  const { drafts, addDraft, clearDrafts, updateDraft, removeDraft } =
    useAuthorDraftHotspots(locationId);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const getHotspotData = useCallback(
    (hotspot: Hotspot) => {
      const override = getOverride(hotspot.id);
      return {
        x: override?.x ?? hotspot.x,
        y: override?.y ?? hotspot.y,
        width: override?.width ?? hotspot.width,
        height: override?.height ?? hotspot.height,
      };
    },
    [getOverride]
  );

  const {
    addMode,
    drawBox,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    handleContainerMouseDown,
    toggleAddMode,
  } = useHotspotDragDraw({
    containerRef,
    hotspots,
    getHotspotData,
    setOverride,
    addDraft,
    draftsLength: drafts.length,
    onDraftCreated: setSelectedDraftId,
  });

  const room = runtime.getRoom(locationId);
  const trueFlags = useMemo(() => listTrueFlags(gameState), [gameState]);
  const exitRows = useMemo(
    () => (room ? listExitRows(room, gameState) : []),
    [room, gameState]
  );

  const copyHotspotToClipboard = (hotspot: Hotspot) => {
    const data = getHotspotData(hotspot);
    navigator.clipboard.writeText(
      formatHotspotCoordSnippet(hotspot, data, locationId)
    );
    toast({
      title: "Copied coords",
      description: `"${hotspot.name}" % box`,
    });
  };

  const copyHotspotObject = (hotspot: Hotspot) => {
    const data = getHotspotData(hotspot);
    navigator.clipboard.writeText(formatHotspotObjectSnippet(hotspot, data));
    toast({
      title: "Copied hotspot object",
      description: `Paste into rooms.${locationId}.hotspots`,
    });
  };

  const copyAllModifiedToClipboard = () => {
    navigator.clipboard.writeText(
      formatAllHotspotCoords(locationId, hotspots, getHotspotData)
    );
    toast({
      title: "Copied all hotspots",
      description: `${hotspots.length} coord blocks`,
    });
  };

  const copyFlags = () => {
    navigator.clipboard.writeText(formatFlagsSnippet(gameState));
    toast({
      title: "Copied flags + inventory",
      description: `${trueFlags.length} true flag(s)`,
    });
  };

  const exportRoomResource = () => {
    const roomOverrides = overrides[locationId] ?? {};
    const exported = runtime.exportRoom(locationId, roomOverrides);
    if (!exported) {
      toast({ title: "Export failed", description: "Room not found" });
      return;
    }
    const json = runtime.formatRoomExport(exported);
    navigator.clipboard.writeText(json);
    toast({
      title: "Room resource exported",
      description: `${exported.objects.length} objects · ${exported.BOXD.length} boxes`,
    });
  };

  const saveSidecarOverlays = () => {
    const merged = hotspots.map((h) => {
      const o = getOverride(h.id);
      return o
        ? { ...h, x: o.x, y: o.y, width: o.width, height: o.height }
        : h;
    });
    upsertSidecarRoom(
      definition.id,
      locationId,
      hotspotsToSidecarOverlays(merged)
    );
    toast({
      title: "Sidecar saved",
      description: `${merged.length} hotspot(s) for ${definition.id}/${locationId}. Reload play to apply.`,
    });
  };

  const clearSidecar = () => {
    clearPackSidecar(definition.id);
    toast({
      title: "Sidecar cleared",
      description: definition.id,
    });
  };

  if (!debugMode) return null;

  const modifiedCount = getModifiedCount();
  const totalModified = getTotalModifiedCount();
  const selectedDraft =
    drafts.find((d) => d.id === selectedDraftId) ?? null;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-50 pointer-events-auto"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleContainerMouseDown}
    >
      <AuthorModePanel
        locationId={locationId}
        definition={definition}
        gameState={gameState}
        trueFlags={trueFlags}
        exitRows={exitRows}
        modifiedCount={modifiedCount}
        totalModified={totalModified}
        addMode={addMode}
        drafts={drafts}
        selectedDraft={selectedDraft}
        onToggleAddMode={toggleAddMode}
        onSelectDraftId={setSelectedDraftId}
        onUpdateDraft={updateDraft}
        onRemoveDraft={removeDraft}
        onClearDrafts={clearDrafts}
        onCopyFlags={copyFlags}
        onExportRoomResource={exportRoomResource}
        onSaveSidecar={saveSidecarOverlays}
        onClearSidecar={clearSidecar}
        onCopyAllModified={copyAllModifiedToClipboard}
        onResetLocation={() => {
          clearLocationOverrides();
          toast({
            title: "Reset location",
            description: "Hotspots reset to pack coords",
          });
        }}
        onResetAll={() => {
          clearAllOverrides();
          toast({
            title: "Reset all",
            description: "All locations reset",
          });
        }}
        onClose={() => setDebugMode(false)}
      />

      {drafts.map((d) => (
        <button
          key={`draft-${d.id}`}
          type="button"
          data-author-hotspot
          className={`absolute border-2 ${
            selectedDraftId === d.id
              ? "border-violet-200 bg-violet-400/40"
              : "border-violet-400 bg-violet-400/30"
          }`}
          style={{
            left: `${d.x}%`,
            top: `${d.y}%`,
            width: `${d.width}%`,
            height: `${d.height}%`,
          }}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedDraftId(d.id);
            setEditingHotspot(null);
          }}
        >
          <div className="absolute -top-5 left-0 bg-black/90 text-violet-300 px-1 text-[10px] font-mono whitespace-nowrap pointer-events-none">
            + {d.name}
            {d.kind === "pickup" && d.itemId ? ` · ${d.itemId}` : ""}
          </div>
        </button>
      ))}

      {drawBox && (
        <div
          className="absolute border-2 border-dashed border-yellow-300 bg-yellow-300/20 pointer-events-none"
          style={{
            left: `${Math.min(drawBox.x0, drawBox.x1)}%`,
            top: `${Math.min(drawBox.y0, drawBox.y1)}%`,
            width: `${Math.abs(drawBox.x1 - drawBox.x0)}%`,
            height: `${Math.abs(drawBox.y1 - drawBox.y0)}%`,
          }}
        />
      )}

      {hotspots.map((hotspot) => {
        const data = getHotspotData(hotspot);
        const isEditing = editingHotspot === hotspot.id;
        const isModified = !!getOverride(hotspot.id);
        const borderColor = getBorderColor(hotspot);
        const bgColor = getHotspotColor(hotspot);

        return (
          <div
            key={`author-${hotspot.id}`}
            data-author-hotspot
            className="absolute cursor-move"
            style={{
              left: `${data.x}%`,
              top: `${data.y}%`,
              width: `${data.width}%`,
              height: `${data.height}%`,
              backgroundColor: bgColor,
              border: `2px ${isEditing ? "solid" : "dashed"} ${borderColor}`,
              boxShadow: isEditing
                ? `0 0 10px ${borderColor}`
                : isModified
                  ? `0 0 5px rgba(0,255,0,0.5)`
                  : "none",
            }}
            onMouseDown={(e) => {
              handleMouseDown(e, hotspot, "move");
              setEditingHotspot(hotspot.id);
            }}
            onClick={(e) => {
              e.stopPropagation();
              setEditingHotspot(hotspot.id);
            }}
          >
            <div
              className="absolute -top-5 left-0 bg-black/90 text-white px-1 py-0.5 text-[10px] font-mono whitespace-nowrap rounded flex items-center gap-1"
              style={{ color: borderColor }}
            >
              {isModified && <span className="text-green-400">●</span>}
              {hotspot.name}
            </div>

            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-black/80 text-white text-[9px] font-mono px-1 py-0.5 rounded text-center">
                <div>
                  {data.x.toFixed(1)}, {data.y.toFixed(1)}
                </div>
                <div>
                  {data.width.toFixed(1)} × {data.height.toFixed(1)}
                </div>
              </div>
            </div>

            <div
              className="absolute bottom-0 right-0 w-3 h-3 bg-white border border-black cursor-se-resize"
              onMouseDown={(e) => {
                handleMouseDown(e, hotspot, "resize");
                setEditingHotspot(hotspot.id);
              }}
            />

            {isEditing && (
              <div className="absolute -bottom-7 left-0 flex gap-1">
                <button
                  type="button"
                  className="bg-blue-600 text-white text-[10px] px-1.5 py-1 rounded hover:bg-blue-500 min-h-[28px]"
                  onClick={(e) => {
                    e.stopPropagation();
                    copyHotspotToClipboard(hotspot);
                  }}
                >
                  Copy %
                </button>
                <button
                  type="button"
                  className="bg-violet-600 text-white text-[10px] px-1.5 py-1 rounded hover:bg-violet-500 min-h-[28px]"
                  onClick={(e) => {
                    e.stopPropagation();
                    copyHotspotObject(hotspot);
                  }}
                >
                  Copy object
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
