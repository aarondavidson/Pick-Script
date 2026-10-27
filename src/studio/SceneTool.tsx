import { useCallback, useEffect, useRef, useState } from "react";
import {
  formatHotspotsArray,
  overlayToHotspot,
  suggestId,
  type DraftOverlay,
} from "@/authoring/codegen";
import { createImageObjectUrl, safeMediaUrl } from "@/engine/security";
import { applySceneToPackDraft } from "@/studio/packApplyBridge";
import { listPackRoomIds } from "@/studio/packArtBridge";
import { fileToDataUrl } from "@/studio/packDraft";
import { toastError, toastOk } from "@/studio/toastError";

type OverlayRole = DraftOverlay["role"];

async function blobUrlToDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const file = new File([blob], "scene.png", {
      type: blob.type || "image/png",
    });
    return await fileToDataUrl(file);
  } catch {
    return null;
  }
}

/**
 * Place character/item art on a room background; export pickup hotspots
 * so overlays can move into inventory in-game.
 */
export function SceneTool() {
  const [bgUrl, setBgUrl] = useState<string | null>(null);
  const [overlays, setOverlays] = useState<
    Array<DraftOverlay & { src: string }>
  >([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [role, setRole] = useState<OverlayRole>("pickup");
  const [name, setName] = useState("Prop");
  const [drag, setDrag] = useState<{
    id: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);
  const [packRooms, setPackRooms] = useState<Array<{ id: string; name: string }>>(
    []
  );
  const [targetRoomId, setTargetRoomId] = useState("");
  const stageRef = useRef<HTMLDivElement>(null);

  const selected = overlays.find((o) => o.id === selectedId) ?? null;

  useEffect(() => {
    void listPackRoomIds()
      .then((rooms) => {
        setPackRooms(rooms);
        setTargetRoomId((prev) => prev || rooms[0]?.id || "");
      })
      .catch(() => setPackRooms([]));
  }, []);

  const pctDelta = useCallback((dx: number, dy: number) => {
    const el = stageRef.current;
    if (!el) return { dx: 0, dy: 0 };
    const r = el.getBoundingClientRect();
    return { dx: (dx / r.width) * 100, dy: (dy / r.height) * 100 };
  }, []);

  const addOverlayFile = (file: File | null) => {
    if (!file) return;
    let src: string;
    try {
      src = createImageObjectUrl(file);
    } catch (e) {
      toastError("Image rejected", e);
      return;
    }
    const idBase = suggestId(name || file.name.replace(/\.\w+$/, ""), "overlay");
    const id = overlays.some((o) => o.id === idBase)
      ? `${idBase}_${overlays.length}`
      : idBase;
    const defaultSize = role === "character" ? { w: 8, h: 18 } : { w: 10, h: 12 };
    const draft: DraftOverlay & { src: string } = {
      id,
      name: name || id,
      x: 40,
      y: role === "character" ? 55 : 50,
      width: defaultSize.w,
      height: defaultSize.h,
      role,
      itemId: role === "pickup" ? id : undefined,
      itemName: role === "pickup" ? name || id : undefined,
      itemDescription: role === "pickup" ? name || id : undefined,
      assetFile: file.name,
      src,
    };
    setOverlays((prev) => [...prev, draft]);
    setSelectedId(id);
    toastOk(
      "Overlay placed",
      "Drag to position. Export creates hotspot + inventory code."
    );
  };

  const updateSelected = (patch: Partial<DraftOverlay>) => {
    if (!selectedId) return;
    setOverlays((prev) =>
      prev.map((o) => (o.id === selectedId ? { ...o, ...patch } : o))
    );
  };

  const copyHotspots = async () => {
    const drafts = overlays
      .filter((o) => o.role !== "decoration")
      .map((o) => overlayToHotspot(o));
    if (!drafts.length) {
      toastError(
        "Nothing to export",
        "Set overlays to Pickup or Character (not decoration)."
      );
      return;
    }
    await navigator.clipboard.writeText(formatHotspotsArray(drafts));
    toastOk(
      "Copied hotspot TS",
      `${drafts.length} hotspot(s) — pickups grant inventory items`
    );
  };

  const applyToPack = async () => {
    const playable = overlays.filter((o) => o.role !== "decoration");
    if (!playable.length && !bgUrl) {
      toastError(
        "Nothing to apply",
        "Add pickup/character overlays or a room background."
      );
      return;
    }
    try {
      const roomImageDataUrl = bgUrl ? await blobUrlToDataUrl(bgUrl) : null;
      const next = await applySceneToPackDraft({
        roomId: targetRoomId || undefined,
        overlays: playable,
        roomImageDataUrl,
      });
      toastOk(
        "Applied to pack draft",
        `Scene → “${targetRoomId || next.startRoom}”. Open Pack tab.`
      );
    } catch (e) {
      toastError("Apply failed", e);
    }
  };

  return (
    <div className="grid lg:grid-cols-[1fr_280px] gap-4">
      <section className="space-y-3">
        <div className="flex flex-wrap gap-2 items-end">
          <label className="pixel-font text-xs min-h-[44px] px-3 border border-game-border bg-secondary/40 inline-flex items-center cursor-pointer">
            Room background
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try {
                  const url = createImageObjectUrl(f);
                  if (bgUrl) URL.revokeObjectURL(bgUrl);
                  setBgUrl(url);
                } catch (err) {
                  toastError("Image rejected", err);
                }
              }}
            />
          </label>
          <label className="pixel-font text-xs min-h-[44px] px-3 border border-accent/80 text-accent inline-flex items-center cursor-pointer">
            Add character / item art
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => addOverlayFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <label className="block text-xs space-y-1">
            <span className="pixel-font text-muted-foreground">Role</span>
            <select
              className="bg-background border border-border px-2 py-2 min-h-[40px] text-sm"
              value={role}
              onChange={(e) => setRole(e.target.value as OverlayRole)}
            >
              <option value="pickup">Item → inventory</option>
              <option value="character">Character / NPC</option>
              <option value="decoration">Decoration only</option>
            </select>
          </label>
          <label className="block text-xs space-y-1 flex-1 min-w-[120px]">
            <span className="pixel-font text-muted-foreground">Name</span>
            <input
              className="w-full bg-background border border-border px-2 py-2 min-h-[40px] text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Use the <strong className="font-normal text-foreground">Pixels</strong>{" "}
          tab to make room / item / character art, download, then place here.
          Pickup overlays export as hotspots that move the item into inventory.
        </p>
        <div
          ref={stageRef}
          className="relative aspect-video bg-black/50 border border-game-border overflow-hidden select-none"
          onMouseMove={(e) => {
            if (!drag) return;
            const { dx, dy } = pctDelta(
              e.clientX - drag.startX,
              e.clientY - drag.startY
            );
            setOverlays((prev) =>
              prev.map((o) =>
                o.id === drag.id
                  ? {
                      ...o,
                      x: Math.max(0, Math.min(100 - o.width, drag.origX + dx)),
                      y: Math.max(0, Math.min(100 - o.height, drag.origY + dy)),
                    }
                  : o
              )
            );
          }}
          onMouseUp={() => setDrag(null)}
          onMouseLeave={() => setDrag(null)}
        >
          {safeMediaUrl(bgUrl) ? (
            <img
              src={safeMediaUrl(bgUrl)!}
              alt="Background"
              className="absolute inset-0 w-full h-full object-contain pointer-events-none"
              draggable={false}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
              Upload a room background first
            </div>
          )}
          {overlays.map((o) => (
            <div
              key={o.id}
              className={`absolute cursor-move border ${
                o.id === selectedId
                  ? "border-accent"
                  : "border-transparent hover:border-primary/50"
              }`}
              style={{
                left: `${o.x}%`,
                top: `${o.y}%`,
                width: `${o.width}%`,
                height: `${o.height}%`,
                imageRendering: "pixelated",
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setSelectedId(o.id);
                setDrag({
                  id: o.id,
                  startX: e.clientX,
                  startY: e.clientY,
                  origX: o.x,
                  origY: o.y,
                });
              }}
            >
              {safeMediaUrl(o.src) && (
                <img
                  src={safeMediaUrl(o.src)!}
                  alt={o.name}
                  className="w-full h-full object-contain pointer-events-none"
                  draggable={false}
                  style={{ imageRendering: "pixelated" }}
                />
              )}
              <span className="absolute -top-5 left-0 text-[10px] pixel-font bg-black/80 text-accent px-1 whitespace-nowrap">
                {o.name} · {o.role}
              </span>
            </div>
          ))}
        </div>
      </section>

      <aside className="border border-game-border bg-game-ui/90 p-3 space-y-3 text-sm">
        <h3 className="pixel-font text-xs text-accent">
          Overlays ({overlays.length})
        </h3>
        <ul className="space-y-1 max-h-36 overflow-y-auto text-xs">
          {overlays.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                className={`w-full text-left px-2 py-1.5 ${
                  o.id === selectedId ? "bg-accent/15 text-accent" : ""
                }`}
                onClick={() => setSelectedId(o.id)}
              >
                {o.name} ({o.role})
              </button>
            </li>
          ))}
        </ul>
        {selected && (
          <div className="space-y-2 border-t border-border pt-2 text-xs">
            <label className="block space-y-1">
              <span className="text-muted-foreground">Name</span>
              <input
                className="w-full bg-background border border-border px-2 py-1.5"
                value={selected.name}
                onChange={(e) => updateSelected({ name: e.target.value })}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-muted-foreground">Role</span>
              <select
                className="w-full bg-background border border-border px-2 py-1.5"
                value={selected.role}
                onChange={(e) =>
                  updateSelected({ role: e.target.value as OverlayRole })
                }
              >
                <option value="pickup">Item → inventory</option>
                <option value="character">Character</option>
                <option value="decoration">Decoration</option>
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block space-y-1">
                <span className="text-muted-foreground">W %</span>
                <input
                  type="number"
                  min={2}
                  max={80}
                  className="w-full bg-background border border-border px-2 py-1.5"
                  value={Number(selected.width.toFixed(1))}
                  onChange={(e) =>
                    updateSelected({ width: Number(e.target.value) || 8 })
                  }
                />
              </label>
              <label className="block space-y-1">
                <span className="text-muted-foreground">H %</span>
                <input
                  type="number"
                  min={2}
                  max={80}
                  className="w-full bg-background border border-border px-2 py-1.5"
                  value={Number(selected.height.toFixed(1))}
                  onChange={(e) =>
                    updateSelected({ height: Number(e.target.value) || 8 })
                  }
                />
              </label>
            </div>
            {selected.role === "pickup" && (
              <label className="block space-y-1">
                <span className="text-muted-foreground">Item id</span>
                <input
                  className="w-full bg-background border border-border px-2 py-1.5"
                  value={selected.itemId || ""}
                  onChange={(e) =>
                    updateSelected({
                      itemId: suggestId(e.target.value, "item"),
                    })
                  }
                />
              </label>
            )}
            <button
              type="button"
              className="w-full min-h-[36px] border border-destructive/50 text-destructive pixel-font"
              onClick={() => {
                setOverlays((prev) => prev.filter((o) => o.id !== selected.id));
                setSelectedId(null);
              }}
            >
              Remove
            </button>
          </div>
        )}
        {packRooms.length > 0 && (
          <label className="block text-xs space-y-1">
            <span className="pixel-font text-muted-foreground">Pack room</span>
            <select
              className="w-full bg-background border border-border px-2 py-2 min-h-[36px] text-sm"
              value={targetRoomId}
              onChange={(e) => setTargetRoomId(e.target.value)}
            >
              {packRooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.id})
                </option>
              ))}
            </select>
          </label>
        )}
        <button
          type="button"
          disabled={!overlays.length && !bgUrl}
          onClick={() => void applyToPack()}
          className="pixel-font text-xs w-full min-h-[44px] border-2 border-primary text-primary hover:bg-primary/10 disabled:opacity-40"
        >
          Apply to pack draft
        </button>
        <button
          type="button"
          disabled={!overlays.length}
          onClick={() => void copyHotspots()}
          className="pixel-font text-xs w-full min-h-[40px] border-2 border-accent text-accent hover:bg-accent/10 disabled:opacity-40"
        >
          Copy hotspot + inventory TS
        </button>
      </aside>
    </div>
  );
}
