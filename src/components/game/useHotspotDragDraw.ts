import { useCallback, useState, type RefObject } from "react";
import {
  suggestId,
  type DraftHotspot,
} from "@/authoring/codegen";
import type { Hotspot } from "@/engine";
import { toast } from "@/hooks/use-toast";
import { usePctFromEvent } from "@/studio/stagePointer";

type HotspotBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type DragState = {
  hotspotId: string;
  mode: "move" | "resize";
  startX: number;
  startY: number;
  startHotspotX: number;
  startHotspotY: number;
  startWidth: number;
  startHeight: number;
};

export interface UseHotspotDragDrawArgs {
  containerRef: RefObject<HTMLElement | null>;
  hotspots: Hotspot[];
  getHotspotData: (hotspot: Hotspot) => HotspotBox;
  setOverride: (
    hotspotId: string,
    box: HotspotBox
  ) => void;
  addDraft: (draft: DraftHotspot) => void;
  draftsLength: number;
  onDraftCreated: (id: string) => void;
}

/**
 * Author-mode move/resize + draw-new-hotspot pointer logic.
 */
export function useHotspotDragDraw({
  containerRef,
  hotspots,
  getHotspotData,
  setOverride,
  addDraft,
  draftsLength,
  onDraftCreated,
}: UseHotspotDragDrawArgs) {
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [addMode, setAddMode] = useState(false);
  const [drawBox, setDrawBox] = useState<{
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  } | null>(null);

  const pctFromEvent = usePctFromEvent(containerRef);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, hotspot: Hotspot, mode: "move" | "resize") => {
      e.preventDefault();
      e.stopPropagation();
      const data = getHotspotData(hotspot);
      setDragState({
        hotspotId: hotspot.id,
        mode,
        startX: e.clientX,
        startY: e.clientY,
        startHotspotX: data.x,
        startHotspotY: data.y,
        startWidth: data.width,
        startHeight: data.height,
      });
    },
    [getHotspotData]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (addMode && drawBox) {
        const p = pctFromEvent(e);
        setDrawBox({ ...drawBox, x1: p.x, y1: p.y });
        return;
      }
      if (!dragState || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const deltaXPercent = ((e.clientX - dragState.startX) / rect.width) * 100;
      const deltaYPercent =
        ((e.clientY - dragState.startY) / rect.height) * 100;

      const hotspot = hotspots.find((h) => h.id === dragState.hotspotId);
      if (!hotspot) return;

      if (dragState.mode === "move") {
        setOverride(dragState.hotspotId, {
          x: Math.max(
            0,
            Math.min(100, dragState.startHotspotX + deltaXPercent)
          ),
          y: Math.max(
            0,
            Math.min(100, dragState.startHotspotY + deltaYPercent)
          ),
          width: getHotspotData(hotspot).width,
          height: getHotspotData(hotspot).height,
        });
      } else {
        setOverride(dragState.hotspotId, {
          x: getHotspotData(hotspot).x,
          y: getHotspotData(hotspot).y,
          width: Math.max(2, dragState.startWidth + deltaXPercent),
          height: Math.max(2, dragState.startHeight + deltaYPercent),
        });
      }
    },
    [
      addMode,
      drawBox,
      pctFromEvent,
      dragState,
      containerRef,
      hotspots,
      setOverride,
      getHotspotData,
    ]
  );

  const finishNewHotspot = useCallback(
    (box: { x0: number; y0: number; x1: number; y1: number }) => {
      const x = Math.min(box.x0, box.x1);
      const y = Math.min(box.y0, box.y1);
      const width = Math.abs(box.x1 - box.x0);
      const height = Math.abs(box.y1 - box.y0);
      if (width < 2 || height < 2) return;
      const n = draftsLength + 1;
      const draft: DraftHotspot = {
        id: suggestId(`new_area_${n}`, `new_area_${n}`),
        name: `New area ${n}`,
        x,
        y,
        width,
        height,
        verbs: ["look", "use"],
        kind: "pickup",
        itemId: suggestId(`item_${n}`, `item_${n}`),
        itemName: `Item ${n}`,
        itemDescription: `Item ${n}`,
        lookText: "Something you can take.",
      };
      addDraft(draft);
      onDraftCreated(draft.id);
      setAddMode(false);
      toast({
        title: "Draft hotspot added",
        description: "Edit kind / item id in the Author panel, then copy TS",
      });
    },
    [addDraft, draftsLength, onDraftCreated]
  );

  const handleMouseUp = useCallback(() => {
    if (addMode && drawBox) {
      finishNewHotspot(drawBox);
      setDrawBox(null);
      return;
    }
    setDragState(null);
  }, [addMode, drawBox, finishNewHotspot]);

  const handleMouseLeave = useCallback(() => {
    if (addMode && drawBox) {
      finishNewHotspot(drawBox);
      setDrawBox(null);
    }
    setDragState(null);
  }, [addMode, drawBox, finishNewHotspot]);

  const handleContainerMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!addMode) return;
      if ((e.target as HTMLElement).closest("[data-author-hotspot]")) return;
      const p = pctFromEvent(e);
      setDrawBox({ x0: p.x, y0: p.y, x1: p.x, y1: p.y });
    },
    [addMode, pctFromEvent]
  );

  const toggleAddMode = useCallback(() => {
    setAddMode((v) => !v);
    setDrawBox(null);
  }, []);

  return {
    addMode,
    drawBox,
    dragState,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    handleContainerMouseDown,
    toggleAddMode,
  };
}
