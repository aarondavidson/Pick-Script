import { suggestId } from "@/authoring/codegen";
import type { JsonPackRegion, JsonPackWalkbox } from "@/engine/jsonPack";
import { sanitizePackActions } from "@/engine/packActions";
import { safeJsonParse } from "@/engine/security";
import { toast } from "@/hooks/use-toast";

export interface PackWalkboxRegionPanelProps {
  walkboxes: JsonPackWalkbox[];
  regions: JsonPackRegion[];
  selectedWalkbox: string | null;
  selectedRegion: string | null;
  selectedWb: JsonPackWalkbox | null;
  selectedRg: JsonPackRegion | null;
  onSelectWalkbox: (id: string | null) => void;
  onSelectRegion: (id: string | null) => void;
  onSetWalkboxes: (next: JsonPackWalkbox[]) => void;
  onSetRegions: (next: JsonPackRegion[]) => void;
}

/**
 * Walkbox inspector + region list/editor — extracted from PackStageCanvas.
 */
export function PackWalkboxRegionPanel({
  walkboxes,
  regions,
  selectedWalkbox,
  selectedRegion,
  selectedWb,
  selectedRg,
  onSelectWalkbox,
  onSelectRegion,
  onSetWalkboxes,
  onSetRegions,
}: PackWalkboxRegionPanelProps) {
  return (
    <>
      {selectedWb && (
        <div className="flex flex-wrap gap-2 items-end border-t border-border pt-3">
          <label className="block text-xs space-y-1">
            <span className="text-muted-foreground">Walkbox id</span>
            <input
              className="bg-background border border-border px-2 py-1.5 w-32"
              value={selectedWb.id}
              onChange={(e) => {
                const id = suggestId(e.target.value, "floor");
                onSetWalkboxes(
                  walkboxes.map((w) =>
                    w.id === selectedWalkbox ? { ...w, id } : w
                  )
                );
                onSelectWalkbox(id);
              }}
            />
          </label>
          <label className="block text-xs space-y-1 min-w-[140px]">
            <span className="text-muted-foreground">
              Depth scale{" "}
              <span className="text-accent font-mono">
                {(selectedWb.scale ?? 1).toFixed(2)}
              </span>
            </span>
            <input
              type="range"
              min={0.7}
              max={1.2}
              step={0.01}
              className="w-full accent-primary"
              value={selectedWb.scale ?? 1}
              onChange={(e) => {
                const scale = Math.max(
                  0.7,
                  Math.min(1.2, Number(e.target.value) || 1)
                );
                onSetWalkboxes(
                  walkboxes.map((w) =>
                    w.id === selectedWalkbox ? { ...w, scale } : w
                  )
                );
              }}
            />
            <span className="text-[10px] text-muted-foreground">
              Far (&lt;1) → near (&gt;1). Actors scale by feet Y.
              Optional <code className="text-accent">points</code> polygon
              (JSON) uses point-in-polygon; AABB stays for adjacency.
            </span>
          </label>
          <label className="block text-xs space-y-1">
            <span className="text-muted-foreground">Floor (0–8)</span>
            <input
              type="number"
              min={0}
              max={8}
              className="bg-background border border-border px-2 py-1.5 w-20"
              value={selectedWb.floor ?? 0}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (!Number.isFinite(n)) return;
                const floor = Math.min(8, Math.max(0, Math.floor(n)));
                onSetWalkboxes(
                  walkboxes.map((w) =>
                    w.id === selectedWalkbox
                      ? { ...w, floor: floor === 0 ? undefined : floor }
                      : w
                  )
                );
              }}
            />
          </label>
          <label className="block text-xs space-y-1 min-w-[160px]">
            <span className="text-muted-foreground">Links (ids)</span>
            <input
              className="bg-background border border-border px-2 py-1.5 w-44"
              placeholder="box_a, box_b"
              value={(selectedWb.links ?? []).join(", ")}
              onChange={(e) => {
                const links = e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .slice(0, 64);
                onSetWalkboxes(
                  walkboxes.map((w) =>
                    w.id === selectedWalkbox
                      ? {
                          ...w,
                          links: links.length ? links : undefined,
                        }
                      : w
                  )
                );
              }}
            />
          </label>
          <label className="block text-xs space-y-1">
            <span className="text-muted-foreground">Transition → floor</span>
            <input
              type="number"
              min={0}
              max={8}
              className="bg-background border border-border px-2 py-1.5 w-20"
              placeholder="—"
              value={selectedWb.floorTransition?.toFloor ?? ""}
              onChange={(e) => {
                const raw = e.target.value.trim();
                if (!raw) {
                  onSetWalkboxes(
                    walkboxes.map((w) =>
                      w.id === selectedWalkbox
                        ? { ...w, floorTransition: undefined }
                        : w
                    )
                  );
                  return;
                }
                const n = Number(raw);
                if (!Number.isFinite(n)) return;
                const toFloor = Math.min(8, Math.max(0, Math.floor(n)));
                onSetWalkboxes(
                  walkboxes.map((w) =>
                    w.id === selectedWalkbox
                      ? { ...w, floorTransition: { toFloor } }
                      : w
                  )
                );
              }}
            />
          </label>
          <p className="w-full text-[10px] text-muted-foreground">
            Multi-floor: pathfinding uses{" "}
            <code className="text-accent">vars.walkFloor</code> (or room{" "}
            <code className="text-accent">activeFloor</code>).{" "}
            <code className="text-accent">links</code> override AABB neighbors.
            Arrive on a box with transition → auto-sets walk floor; or use
            PackAction <code className="text-accent">setWalkFloor</code> on a
            ladder hotspot.
          </p>
          <button
            type="button"
            className="pixel-font text-[10px] min-h-[36px] px-2 border border-game-border"
            onClick={() => {
              const base = selectedWb;
              onSetWalkboxes([
                {
                  id: "far",
                  x: base.x,
                  y: Math.max(40, base.y - 8),
                  width: base.width,
                  height: Math.max(12, base.height * 0.45),
                  scale: 0.85,
                },
                {
                  id: "near",
                  x: base.x,
                  y: Math.min(88, base.y + base.height * 0.35),
                  width: base.width,
                  height: Math.max(14, base.height * 0.55),
                  scale: 1.05,
                },
              ]);
              onSelectWalkbox("near");
              toast({
                title: "Near / far walkboxes",
                description: "Depth scale 0.85 → 1.05",
              });
            }}
          >
            Near/far pair
          </button>
          <button
            type="button"
            className="text-xs text-destructive min-h-[36px]"
            disabled={walkboxes.length <= 1}
            onClick={() => {
              if (walkboxes.length <= 1) return;
              onSetWalkboxes(walkboxes.filter((w) => w.id !== selectedWb.id));
              onSelectWalkbox(null);
            }}
          >
            Delete walkbox
          </button>
          <button
            type="button"
            className="pixel-font text-[10px] min-h-[36px] px-2 border border-game-border"
            onClick={() => {
              onSetWalkboxes([
                { id: "floor", x: 5, y: 55, width: 90, height: 40, scale: 1 },
              ]);
              onSelectWalkbox("floor");
            }}
          >
            Reset default floor
          </button>
        </div>
      )}
      <div className="space-y-2 border-t border-border pt-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="pixel-font text-[10px] text-accent">Regions</p>
          <button
            type="button"
            className="pixel-font text-[10px] min-h-[36px] px-2 border border-accent text-accent"
            onClick={() => {
              const baseId = suggestId(
                `region_${regions.length + 1}`,
                "region"
              );
              const id = regions.some((r) => r.id === baseId)
                ? `${baseId}_${regions.length}`
                : baseId;
              const next: JsonPackRegion[] = [
                ...regions,
                {
                  id,
                  x: 5,
                  y: 55,
                  width: 90,
                  height: 40,
                  setFlag: "",
                },
              ];
              onSetRegions(next);
              onSelectRegion(id);
              toast({
                title: "Region added",
                description: `${id} (full-floor default)`,
              });
            }}
          >
            Add full-floor region
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Enter/exit triggers (AGS/Escoria) — separate from walkboxes. Edit id,
          flags, ActionLists, and bounds.
        </p>
        {regions.length === 0 && (
          <p className="text-xs text-muted-foreground">No regions yet.</p>
        )}
        <ul className="space-y-1 text-xs">
          {regions.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                className={`w-full text-left px-2 py-1 border ${
                  r.id === selectedRegion
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border/50"
                }`}
                onClick={() => onSelectRegion(r.id)}
              >
                {r.id}
                {r.setFlag ? ` · setFlag=${r.setFlag}` : ""}
              </button>
            </li>
          ))}
        </ul>
        {selectedRg && (
          <div className="flex flex-wrap gap-2 items-end">
            <label className="block text-xs space-y-1">
              <span className="text-muted-foreground">Region id</span>
              <input
                className="bg-background border border-border px-2 py-1.5 w-32"
                value={selectedRg.id}
                onChange={(e) => {
                  const id = suggestId(e.target.value, "region");
                  onSetRegions(
                    regions.map((r) =>
                      r.id === selectedRegion ? { ...r, id } : r
                    )
                  );
                  onSelectRegion(id);
                }}
              />
            </label>
            <label className="block text-xs space-y-1">
              <span className="text-muted-foreground">setFlag</span>
              <input
                className="bg-background border border-border px-2 py-1.5 w-36"
                value={selectedRg.setFlag ?? ""}
                onChange={(e) => {
                  const setFlag = e.target.value.trim();
                  onSetRegions(
                    regions.map((r) =>
                      r.id === selectedRegion
                        ? { ...r, setFlag: setFlag || undefined }
                        : r
                    )
                  );
                }}
              />
            </label>
            <label className="block text-xs space-y-1">
              <span className="text-muted-foreground">onEnterFlag</span>
              <input
                className="bg-background border border-border px-2 py-1.5 w-36"
                value={selectedRg.onEnterFlag ?? ""}
                onChange={(e) => {
                  const onEnterFlag = e.target.value.trim();
                  onSetRegions(
                    regions.map((r) =>
                      r.id === selectedRegion
                        ? { ...r, onEnterFlag: onEnterFlag || undefined }
                        : r
                    )
                  );
                }}
              />
            </label>
            <label className="block text-xs space-y-1">
              <span className="text-muted-foreground">onExitFlag</span>
              <input
                className="bg-background border border-border px-2 py-1.5 w-36"
                value={selectedRg.onExitFlag ?? ""}
                onChange={(e) => {
                  const onExitFlag = e.target.value.trim();
                  onSetRegions(
                    regions.map((r) =>
                      r.id === selectedRegion
                        ? { ...r, onExitFlag: onExitFlag || undefined }
                        : r
                    )
                  );
                }}
              />
            </label>
            <label className="block text-xs space-y-1 min-w-[220px] flex-1">
              <span className="text-muted-foreground">
                onEnterActions (JSON)
              </span>
              <textarea
                className="w-full bg-background border border-border px-2 py-1.5 text-[10px] font-mono min-h-[52px]"
                defaultValue={
                  selectedRg.onEnterActions?.length
                    ? JSON.stringify(selectedRg.onEnterActions)
                    : ""
                }
                key={`enter-${selectedRg.id}-${selectedRg.onEnterActions?.length ?? 0}`}
                onBlur={(e) => {
                  const raw = e.target.value.trim();
                  if (!raw) {
                    onSetRegions(
                      regions.map((r) =>
                        r.id === selectedRegion
                          ? { ...r, onEnterActions: undefined }
                          : r
                      )
                    );
                    return;
                  }
                  try {
                    const parsed = sanitizePackActions(safeJsonParse(raw));
                    onSetRegions(
                      regions.map((r) =>
                        r.id === selectedRegion
                          ? {
                              ...r,
                              onEnterActions: parsed.length
                                ? parsed
                                : undefined,
                            }
                          : r
                      )
                    );
                  } catch {
                    /* ignore invalid JSON */
                  }
                }}
              />
            </label>
            <label className="block text-xs space-y-1 min-w-[220px] flex-1">
              <span className="text-muted-foreground">
                onExitActions (JSON)
              </span>
              <textarea
                className="w-full bg-background border border-border px-2 py-1.5 text-[10px] font-mono min-h-[52px]"
                defaultValue={
                  selectedRg.onExitActions?.length
                    ? JSON.stringify(selectedRg.onExitActions)
                    : ""
                }
                key={`exit-${selectedRg.id}-${selectedRg.onExitActions?.length ?? 0}`}
                onBlur={(e) => {
                  const raw = e.target.value.trim();
                  if (!raw) {
                    onSetRegions(
                      regions.map((r) =>
                        r.id === selectedRegion
                          ? { ...r, onExitActions: undefined }
                          : r
                      )
                    );
                    return;
                  }
                  try {
                    const parsed = sanitizePackActions(safeJsonParse(raw));
                    onSetRegions(
                      regions.map((r) =>
                        r.id === selectedRegion
                          ? {
                              ...r,
                              onExitActions: parsed.length
                                ? parsed
                                : undefined,
                            }
                          : r
                      )
                    );
                  } catch {
                    /* ignore invalid JSON */
                  }
                }}
              />
            </label>
            {(["x", "y", "width", "height"] as const).map((key) => (
              <label key={key} className="block text-xs space-y-1">
                <span className="text-muted-foreground">{key}</span>
                <input
                  type="number"
                  className="bg-background border border-border px-2 py-1.5 w-20"
                  value={selectedRg[key]}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (!Number.isFinite(n)) return;
                    onSetRegions(
                      regions.map((r) =>
                        r.id === selectedRegion ? { ...r, [key]: n } : r
                      )
                    );
                  }}
                />
              </label>
            ))}
            <button
              type="button"
              className="text-xs text-destructive min-h-[36px]"
              onClick={() => {
                onSetRegions(regions.filter((r) => r.id !== selectedRg.id));
                onSelectRegion(null);
              }}
            >
              Delete region
            </button>
          </div>
        )}
      </div>
    </>
  );
}
