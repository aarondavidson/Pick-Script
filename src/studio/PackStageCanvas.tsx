import { useRef, useState, type RefObject } from "react";
import { suggestId } from "@/authoring/codegen";
import {
  type JsonPackDocument,
  type JsonPackHotspot,
  type JsonPackHotspotKind,
  type JsonPackRegion,
  type JsonPackWalkbox,
} from "@/engine/jsonPack";
import {
  isMissingOrPlaceholderArt,
  missingArtPlaceholderDataUrl,
} from "@/engine/packDoctor";
import { isSafeMediaUrl } from "@/engine/security";
import { toast } from "@/hooks/use-toast";
import { PackHotspotInspector } from "@/studio/PackHotspotInspector";
import { PackStageViewport } from "@/studio/PackStageViewport";
import { PackWalkboxRegionPanel } from "@/studio/PackWalkboxRegionPanel";
import { setRoomHotspots, updateRoom } from "@/studio/packDraft";
import { usePctFromEvent, type StagePct } from "@/studio/stagePointer";

export interface PackStageCanvasProps {
  doc: JsonPackDocument;
  roomId: string;
  guided: boolean;
  selectedHotspot: string | null;
  canvasMode: "hotspots" | "walkboxes";
  /** Owned by PackTool so Setup / Coach can scroll to stage */
  sectionRef: RefObject<HTMLElement | null>;
  onChange: (doc: JsonPackDocument) => void;
  onSelectHotspot: (id: string | null) => void;
  onCanvasModeChange: (mode: "hotspots" | "walkboxes") => void;
  onOpenIntentWizard: (hotspotId: string | null) => void;
}

/**
 * Hotspot / walkbox / region drawing stage — composer over viewport + panels.
 */
export function PackStageCanvas({
  doc,
  roomId,
  guided,
  selectedHotspot,
  canvasMode,
  sectionRef,
  onChange,
  onSelectHotspot,
  onCanvasModeChange,
  onOpenIntentWizard,
}: PackStageCanvasProps) {
  const [drawing, setDrawing] = useState<{
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  } | null>(null);
  const [hsKind, setHsKind] = useState<JsonPackHotspotKind>("pickup");
  const [hsName, setHsName] = useState("New hotspot");
  const [selectedWalkbox, setSelectedWalkbox] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [placeEntry, setPlaceEntry] = useState(false);
  const [placeApproach, setPlaceApproach] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const pctFromEvent = usePctFromEvent(stageRef);

  const room = doc.rooms[roomId];
  const hotspots = room?.hotspots ?? [];
  const walkboxes: JsonPackWalkbox[] = room?.walkboxes?.length
    ? room.walkboxes
    : [{ id: "floor", x: 5, y: 55, width: 90, height: 40 }];
  const regions: JsonPackRegion[] = room?.regions ?? [];
  const selected = hotspots.find((h) => h.id === selectedHotspot) ?? null;
  const selectedWb = walkboxes.find((w) => w.id === selectedWalkbox) ?? null;
  const selectedRg = regions.find((r) => r.id === selectedRegion) ?? null;

  const stageBackground =
    room?.image &&
    isSafeMediaUrl(room.image) &&
    !isMissingOrPlaceholderArt(room.image)
      ? room.image
      : missingArtPlaceholderDataUrl(room?.name || roomId);

  const setWalkboxes = (next: JsonPackWalkbox[]) => {
    onChange(updateRoom(doc, roomId, { walkboxes: next }));
  };

  const setRegions = (next: JsonPackRegion[]) => {
    onChange(updateRoom(doc, roomId, { regions: next }));
  };

  const finishDrawWalkbox = (box: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  }) => {
    const x = Math.min(box.x0, box.x1);
    const y = Math.min(box.y0, box.y1);
    const width = Math.abs(box.x1 - box.x0);
    const height = Math.abs(box.y1 - box.y0);
    if (width < 2 || height < 2) return;
    const baseId = suggestId(`walk_${walkboxes.length + 1}`, "floor");
    const id = walkboxes.some((w) => w.id === baseId)
      ? `${baseId}_${walkboxes.length}`
      : baseId;
    const next = [...walkboxes, { id, x, y, width, height }];
    setWalkboxes(next);
    setSelectedWalkbox(id);
    toast({ title: "Walkbox added", description: id });
  };

  const finishDraw = (box: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  }) => {
    if (canvasMode === "walkboxes") {
      finishDrawWalkbox(box);
      return;
    }
    const x = Math.min(box.x0, box.x1);
    const y = Math.min(box.y0, box.y1);
    const width = Math.abs(box.x1 - box.x0);
    const height = Math.abs(box.y1 - box.y0);
    if (width < 2 || height < 2) return;
    const baseId = suggestId(hsName, `hotspot_${hotspots.length + 1}`);
    const id = hotspots.some((h) => h.id === baseId)
      ? `${baseId}_${hotspots.length}`
      : baseId;
    const itemId =
      hsKind === "pickup" ? suggestId(hsName, "item") : undefined;
    const draft: JsonPackHotspot = {
      id,
      name: hsName,
      x,
      y,
      width,
      height,
      kind: hsKind,
      verbs: hsKind === "character" ? ["look", "talk"] : ["look", "use"],
      itemId,
      itemName: hsKind === "pickup" ? hsName : undefined,
      itemDescription: hsKind === "pickup" ? hsName : undefined,
      actorId: hsKind === "character" ? suggestId(hsName, "actor") : undefined,
      lookText: `You see the ${hsName}.`,
      dialogue:
        hsKind === "character"
          ? {
              speaker: hsName,
              lines: [
                {
                  id: "hello",
                  text: `Hi — I'm ${hsName}.`,
                  choices: [{ text: "Bye", nextId: "END" }],
                },
              ],
            }
          : undefined,
    };
    let next = setRoomHotspots(doc, roomId, [...hotspots, draft]);
    if (itemId) {
      next = {
        ...next,
        items: {
          ...(next.items ?? {}),
          [itemId]: {
            id: itemId,
            name: hsName,
            description: hsName,
            ...(next.items?.[itemId]?.icon
              ? { icon: next.items[itemId]!.icon }
              : {}),
          },
        },
      };
    }
    onChange(next);
    onSelectHotspot(id);
    if (guided) {
      onOpenIntentWizard(id);
    }
  };

  const patchHotspot = (patch: Partial<JsonPackHotspot>) => {
    if (!selectedHotspot) return;
    onChange(
      setRoomHotspots(
        doc,
        roomId,
        hotspots.map((h) =>
          h.id === selectedHotspot ? { ...h, ...patch } : h
        )
      )
    );
  };

  const onStageMouseDown = (p: StagePct) => {
    if (!room) return;
    if (placeEntry && canvasMode === "walkboxes") {
      onChange(
        updateRoom(doc, roomId, {
          entryPoint: {
            x: Number(p.x.toFixed(1)),
            y: Number(p.y.toFixed(1)),
          },
        })
      );
      setPlaceEntry(false);
      toast({
        title: "Entry point set",
        description: `${p.x.toFixed(0)}%, ${p.y.toFixed(0)}%`,
      });
      return;
    }
    if (placeApproach && canvasMode === "hotspots" && selectedHotspot) {
      const next = setRoomHotspots(
        doc,
        roomId,
        hotspots.map((h) =>
          h.id === selectedHotspot
            ? {
                ...h,
                approach: {
                  x: Number(p.x.toFixed(1)),
                  y: Number(p.y.toFixed(1)),
                },
              }
            : h
        )
      );
      onChange(next);
      setPlaceApproach(false);
      toast({
        title: "Approach point set",
        description: `${selectedHotspot} @ ${p.x.toFixed(0)}%, ${p.y.toFixed(0)}%`,
      });
      return;
    }
    setDrawing({ x0: p.x, y0: p.y, x1: p.x, y1: p.y });
  };

  return (
    <section
      ref={sectionRef}
      className="border border-game-border bg-game-ui/90 p-4 space-y-3"
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h3 className="pixel-font text-sm text-accent">
          Stage — {room?.name || roomId}
        </h3>
        <div className="flex flex-wrap gap-2 items-end">
          <div className="flex border border-game-border">
            <button
              type="button"
              className={`pixel-font text-[10px] min-h-[36px] px-2 ${
                canvasMode === "hotspots"
                  ? "bg-accent/15 text-accent"
                  : "text-muted-foreground"
              }`}
              onClick={() => {
                onCanvasModeChange("hotspots");
                setPlaceEntry(false);
              }}
            >
              Hotspots
            </button>
            <button
              type="button"
              className={`pixel-font text-[10px] min-h-[36px] px-2 border-l border-game-border ${
                canvasMode === "walkboxes"
                  ? "bg-accent/15 text-accent"
                  : "text-muted-foreground"
              }`}
              onClick={() => {
                onCanvasModeChange("walkboxes");
                setPlaceEntry(false);
              }}
            >
              Walkboxes
            </button>
          </div>
          {canvasMode === "hotspots" && !guided && (
            <label className="block text-xs space-y-1">
              <span className="text-muted-foreground">Kind</span>
              <select
                className="bg-background border border-border px-2 py-2 min-h-[36px]"
                value={hsKind}
                onChange={(e) =>
                  setHsKind(e.target.value as JsonPackHotspotKind)
                }
              >
                <option value="pickup">pickup</option>
                <option value="interact">interact</option>
                <option value="use-with-target">use-with</option>
                <option value="character">character</option>
              </select>
            </label>
          )}
          {canvasMode === "hotspots" && (
            <label className="block text-xs space-y-1">
              <span className="text-muted-foreground">Name</span>
              <input
                className="bg-background border border-border px-2 py-2 min-h-[36px] w-36"
                value={hsName}
                onChange={(e) => setHsName(e.target.value)}
              />
            </label>
          )}
          {canvasMode === "hotspots" && (
            <button
              type="button"
              className="pixel-font text-[10px] min-h-[36px] px-2 border border-accent text-accent"
              onClick={() => onOpenIntentWizard(selectedHotspot)}
            >
              Intent wizard
            </button>
          )}
          {canvasMode === "walkboxes" && (
            <button
              type="button"
              className={`pixel-font text-[10px] min-h-[36px] px-2 border ${
                placeEntry
                  ? "border-primary text-primary"
                  : "border-game-border"
              }`}
              onClick={() => {
                setPlaceEntry((v) => !v);
                setPlaceApproach(false);
              }}
            >
              {placeEntry ? "Click stage for entry…" : "Set entry point"}
            </button>
          )}
          {canvasMode === "hotspots" && selected && (
            <button
              type="button"
              className={`pixel-font text-[10px] min-h-[36px] px-2 border ${
                placeApproach
                  ? "border-primary text-primary"
                  : "border-game-border"
              }`}
              onClick={() => {
                setPlaceApproach((v) => !v);
                setPlaceEntry(false);
              }}
            >
              {placeApproach
                ? "Click stage for approach…"
                : "Set approach point"}
            </button>
          )}
          <span className="text-[10px] text-muted-foreground pb-2">
            {canvasMode === "walkboxes"
              ? "Drag to draw walkable floor"
              : guided
                ? "Drag to draw — Intent Wizard opens next"
                : "Drag on stage to draw (works with missing-art placeholder)"}
          </span>
        </div>
      </div>
      <PackStageViewport
        stageRef={stageRef}
        stageBackground={stageBackground}
        roomName={room?.name || roomId}
        roomId={roomId}
        roomImage={room?.image}
        entryPoint={room?.entryPoint}
        canvasMode={canvasMode}
        hotspots={hotspots}
        walkboxes={walkboxes}
        selectedHotspot={selectedHotspot}
        selectedWalkbox={selectedWalkbox}
        placeEntry={placeEntry}
        drawing={drawing}
        pctFromEvent={pctFromEvent}
        onStageMouseDown={onStageMouseDown}
        onDrawingMove={(p) => {
          if (!drawing) return;
          setDrawing({ ...drawing, x1: p.x, y1: p.y });
        }}
        onDrawingEnd={() => {
          if (!drawing) return;
          finishDraw(drawing);
          setDrawing(null);
        }}
        onDrawingCancel={() => setDrawing(null)}
        onSelectHotspot={onSelectHotspot}
        onSelectWalkbox={setSelectedWalkbox}
      />
      {canvasMode === "walkboxes" && (
        <PackWalkboxRegionPanel
          walkboxes={walkboxes}
          regions={regions}
          selectedWalkbox={selectedWalkbox}
          selectedRegion={selectedRegion}
          selectedWb={selectedWb}
          selectedRg={selectedRg}
          onSelectWalkbox={setSelectedWalkbox}
          onSelectRegion={setSelectedRegion}
          onSetWalkboxes={setWalkboxes}
          onSetRegions={setRegions}
        />
      )}
      {selected && selectedHotspot && (
        <PackHotspotInspector
          doc={doc}
          roomId={roomId}
          guided={guided}
          selected={selected}
          selectedHotspot={selectedHotspot}
          hotspots={hotspots}
          onChange={onChange}
          onSelectHotspot={onSelectHotspot}
          patchHotspot={patchHotspot}
        />
      )}
    </section>
  );
}
