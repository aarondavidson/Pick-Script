import { useEffect, useRef, useState } from "react";
import {
  formatHotspotsArray,
  suggestId,
  type DraftHotspot,
  type HotspotKind,
} from "@/authoring/codegen";
import { BUILTIN_SFX_KEYS } from "@/authoring/audioPresets";
import { soundFX } from "@/utils/soundEffects";
import { createImageObjectUrl, safeMediaUrl } from "@/engine/security";
import { applyHotspotsToPackDraft } from "@/studio/packApplyBridge";
import { listPackRoomIds } from "@/studio/packArtBridge";
import { usePctFromEvent } from "@/studio/stagePointer";
import { toastError, toastOk } from "@/studio/toastError";

/**
 * Draw interactive areas on a room background and export hotspot TS.
 */
export function HotspotTool() {
  const [bgUrl, setBgUrl] = useState<string | null>(null);
  const [hotspots, setHotspots] = useState<DraftHotspot[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [packRooms, setPackRooms] = useState<Array<{ id: string; name: string }>>(
    []
  );
  const [targetRoomId, setTargetRoomId] = useState("");
  const [drawing, setDrawing] = useState<{
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  } | null>(null);
  const [kind, setKind] = useState<HotspotKind>("pickup");
  const [name, setName] = useState("New hotspot");
  const stageRef = useRef<HTMLDivElement>(null);

  const selected = hotspots.find((h) => h.id === selectedId) ?? null;

  useEffect(() => {
    void listPackRoomIds()
      .then((rooms) => {
        setPackRooms(rooms);
        setTargetRoomId((prev) => prev || rooms[0]?.id || "");
      })
      .catch(() => setPackRooms([]));
  }, []);

  const applyToPack = async () => {
    if (!hotspots.length) return;
    try {
      const next = await applyHotspotsToPackDraft({
        roomId: targetRoomId || undefined,
        hotspots,
      });
      toastOk(
        "Applied to pack draft",
        `${hotspots.length} hotspot(s) → room “${targetRoomId || next.startRoom}”. Open Pack tab.`
      );
    } catch (e) {
      toastError("Apply failed", e);
    }
  };

  const pctFromEvent = usePctFromEvent(stageRef);

  const onBg = (file: File | null) => {
    if (!file) return;
    try {
      const url = createImageObjectUrl(file);
      if (bgUrl) URL.revokeObjectURL(bgUrl);
      setBgUrl(url);
    } catch (e) {
      toastError("Image rejected", e);
    }
  };

  const finishDraw = (box: { x0: number; y0: number; x1: number; y1: number }) => {
    const x = Math.min(box.x0, box.x1);
    const y = Math.min(box.y0, box.y1);
    const width = Math.abs(box.x1 - box.x0);
    const height = Math.abs(box.y1 - box.y0);
    if (width < 2 || height < 2) return;
    const id = suggestId(name, `hotspot_${hotspots.length + 1}`);
    const draft: DraftHotspot = {
      id: hotspots.some((h) => h.id === id) ? `${id}_${hotspots.length}` : id,
      name,
      x,
      y,
      width,
      height,
      verbs: kind === "character" ? ["look", "talk"] : ["look", "use"],
      kind,
      itemId: kind === "pickup" ? suggestId(name, "item") : undefined,
      itemName: kind === "pickup" ? name : undefined,
      itemDescription: kind === "pickup" ? name : undefined,
      actorId: kind === "character" ? suggestId(name, "actor") : undefined,
      lookText: `You see the ${name}.`,
    };
    setHotspots((prev) => [...prev, draft]);
    setSelectedId(draft.id);
    toastOk("Hotspot added", draft.name);
  };

  const updateSelected = (patch: Partial<DraftHotspot>) => {
    if (!selectedId) return;
    setHotspots((prev) =>
      prev.map((h) => (h.id === selectedId ? { ...h, ...patch } : h))
    );
  };

  const copyExport = async () => {
    const code = formatHotspotsArray(hotspots);
    await navigator.clipboard.writeText(code);
    toastOk("Copied hotspots", "Paste into rooms.<id> in manifest.ts");
  };

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify({ hotspots }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "hotspots-draft.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid lg:grid-cols-[1fr_280px] gap-4">
      <section className="space-y-3">
        <div className="flex flex-wrap gap-2 items-end">
          <label className="pixel-font text-xs min-h-[44px] px-4 border border-game-border bg-secondary/40 hover:bg-secondary/60 inline-flex items-center cursor-pointer">
            Upload room background
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onBg(e.target.files?.[0] ?? null)}
            />
          </label>
          <label className="block text-xs space-y-1">
            <span className="pixel-font text-muted-foreground">Kind</span>
            <select
              className="bg-background border border-border px-2 py-2 min-h-[40px] text-sm"
              value={kind}
              onChange={(e) => setKind(e.target.value as HotspotKind)}
            >
              <option value="pickup">Pickup → inventory</option>
              <option value="interact">Look / interact</option>
              <option value="use-with-target">Use-with target</option>
              <option value="character">Character / NPC</option>
            </select>
          </label>
          <label className="block text-xs space-y-1 flex-1 min-w-[140px]">
            <span className="pixel-font text-muted-foreground">Name</span>
            <input
              className="w-full bg-background border border-border px-2 py-2 min-h-[40px] text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
        </div>
        <p className="text-xs text-muted-foreground">
          Drag on the image to create an interactive area (room %). Then edit
          fields and copy TypeScript into your pack.
        </p>
        <div
          ref={stageRef}
          className="relative aspect-video bg-black/50 border border-game-border overflow-hidden select-none touch-none"
          onMouseDown={(e) => {
            if (!bgUrl) return;
            const p = pctFromEvent(e);
            setDrawing({ x0: p.x, y0: p.y, x1: p.x, y1: p.y });
          }}
          onMouseMove={(e) => {
            if (!drawing) return;
            const p = pctFromEvent(e);
            setDrawing({ ...drawing, x1: p.x, y1: p.y });
          }}
          onMouseUp={() => {
            if (drawing) finishDraw(drawing);
            setDrawing(null);
          }}
          onMouseLeave={() => {
            if (drawing) finishDraw(drawing);
            setDrawing(null);
          }}
        >
          {safeMediaUrl(bgUrl) ? (
            <img
              src={safeMediaUrl(bgUrl)!}
              alt="Room"
              className="absolute inset-0 w-full h-full object-contain pointer-events-none"
              draggable={false}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
              Upload a 16:9 room background to start
            </div>
          )}
          {hotspots.map((h) => (
            <button
              type="button"
              key={h.id}
              className={`absolute border-2 ${
                h.id === selectedId
                  ? "border-accent bg-accent/25"
                  : "border-primary/80 bg-primary/15"
              }`}
              style={{
                left: `${h.x}%`,
                top: `${h.y}%`,
                width: `${h.width}%`,
                height: `${h.height}%`,
              }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedId(h.id);
              }}
            >
              <span className="absolute -top-5 left-0 text-[10px] pixel-font bg-black/80 px-1 text-accent whitespace-nowrap">
                {h.name}
              </span>
            </button>
          ))}
          {drawing && (
            <div
              className="absolute border-2 border-dashed border-yellow-400 bg-yellow-400/20 pointer-events-none"
              style={{
                left: `${Math.min(drawing.x0, drawing.x1)}%`,
                top: `${Math.min(drawing.y0, drawing.y1)}%`,
                width: `${Math.abs(drawing.x1 - drawing.x0)}%`,
                height: `${Math.abs(drawing.y1 - drawing.y0)}%`,
              }}
            />
          )}
        </div>
      </section>

      <aside className="border border-game-border bg-game-ui/90 p-3 space-y-3 text-sm">
        <h3 className="pixel-font text-xs text-accent">Hotspots ({hotspots.length})</h3>
        <ul className="space-y-1 max-h-40 overflow-y-auto text-xs">
          {hotspots.map((h) => (
            <li key={h.id}>
              <button
                type="button"
                className={`w-full text-left px-2 py-1.5 border ${
                  h.id === selectedId
                    ? "border-accent text-accent"
                    : "border-transparent hover:bg-secondary/40"
                }`}
                onClick={() => setSelectedId(h.id)}
              >
                {h.name}{" "}
                <span className="text-muted-foreground">({h.kind})</span>
              </button>
            </li>
          ))}
        </ul>
        {selected && (
          <div className="space-y-2 border-t border-border pt-2">
            <label className="block text-xs space-y-1">
              <span className="text-muted-foreground">Id</span>
              <input
                className="w-full bg-background border border-border px-2 py-1.5"
                value={selected.id}
                onChange={(e) => updateSelected({ id: suggestId(e.target.value, selected.id) })}
              />
            </label>
            <label className="block text-xs space-y-1">
              <span className="text-muted-foreground">Name</span>
              <input
                className="w-full bg-background border border-border px-2 py-1.5"
                value={selected.name}
                onChange={(e) => updateSelected({ name: e.target.value })}
              />
            </label>
            {selected.kind === "pickup" && (
              <>
                <label className="block text-xs space-y-1">
                  <span className="text-muted-foreground">Item id</span>
                  <input
                    className="w-full bg-background border border-border px-2 py-1.5"
                    value={selected.itemId || ""}
                    onChange={(e) =>
                      updateSelected({ itemId: suggestId(e.target.value, "item") })
                    }
                  />
                </label>
                <label className="block text-xs space-y-1">
                  <span className="text-muted-foreground">Item name</span>
                  <input
                    className="w-full bg-background border border-border px-2 py-1.5"
                    value={selected.itemName || ""}
                    onChange={(e) => updateSelected({ itemName: e.target.value })}
                  />
                </label>
              </>
            )}
            <label className="block text-xs space-y-1">
              <span className="text-muted-foreground">Look text</span>
              <textarea
                className="w-full bg-background border border-border px-2 py-1.5 min-h-[60px]"
                value={selected.lookText || ""}
                onChange={(e) => updateSelected({ lookText: e.target.value })}
              />
            </label>
            <label className="block text-xs space-y-1">
              <span className="text-muted-foreground">
                Interact SFX{" "}
                {selected.kind === "pickup" && (
                  <span className="text-[10px]">(optional; pickup auto)</span>
                )}
              </span>
              <div className="flex gap-1">
                <select
                  className="flex-1 bg-background border border-border px-2 py-1.5"
                  value={selected.interactSound || ""}
                  onChange={(e) =>
                    updateSelected({
                      interactSound: e.target.value || undefined,
                    })
                  }
                >
                  <option value="">— none —</option>
                  {BUILTIN_SFX_KEYS.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.key}
                    </option>
                  ))}
                </select>
                {selected.interactSound && (
                  <button
                    type="button"
                    className="px-2 border border-border text-primary"
                    onClick={() => {
                      void soundFX.unlock().then(() =>
                        soundFX.playKey(selected.interactSound!)
                      );
                    }}
                  >
                    ▶
                  </button>
                )}
              </div>
            </label>
            {selected.kind === "use-with-target" && (
              <label className="block text-xs space-y-1">
                <span className="text-muted-foreground">Use-with SFX</span>
                <select
                  className="w-full bg-background border border-border px-2 py-1.5"
                  value={selected.useWithSound || ""}
                  onChange={(e) =>
                    updateSelected({
                      useWithSound: e.target.value || undefined,
                    })
                  }
                >
                  <option value="">— none —</option>
                  {BUILTIN_SFX_KEYS.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.key}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <p className="text-[10px] text-muted-foreground font-mono">
              {selected.x.toFixed(1)}, {selected.y.toFixed(1)} ·{" "}
              {selected.width.toFixed(1)}×{selected.height.toFixed(1)}
            </p>
            <button
              type="button"
              className="pixel-font text-xs w-full min-h-[36px] border border-destructive/60 text-destructive"
              onClick={() => {
                setHotspots((prev) => prev.filter((h) => h.id !== selected.id));
                setSelectedId(null);
              }}
            >
              Delete hotspot
            </button>
          </div>
        )}
        <div className="flex flex-col gap-2 border-t border-border pt-2">
          {packRooms.length > 0 && (
            <label className="block text-xs space-y-1">
              <span className="pixel-font text-muted-foreground">
                Pack room
              </span>
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
            disabled={!hotspots.length}
            onClick={() => void applyToPack()}
            className="pixel-font text-xs min-h-[44px] border-2 border-primary text-primary hover:bg-primary/10 disabled:opacity-40"
          >
            Apply to pack draft
          </button>
          <button
            type="button"
            disabled={!hotspots.length}
            onClick={() => void copyExport()}
            className="pixel-font text-xs min-h-[40px] border-2 border-accent text-accent hover:bg-accent/10 disabled:opacity-40"
          >
            Copy TypeScript
          </button>
          <button
            type="button"
            disabled={!hotspots.length}
            onClick={downloadJson}
            className="pixel-font text-xs min-h-[40px] border border-game-border hover:bg-secondary/40 disabled:opacity-40"
          >
            Download JSON draft
          </button>
        </div>
      </aside>
    </div>
  );
}
