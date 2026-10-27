import { useMemo, useState } from "react";
import { suggestId } from "@/authoring/codegen";
import type { JsonPackDocument, JsonPackItem } from "@/engine/jsonPack";
import { fileToDataUrl } from "@/studio/packDraft";
import { isSafeMediaUrl } from "@/engine/security";
import { toastError, toastOk } from "@/studio/toastError";

export interface PackItemsPanelProps {
  doc: JsonPackDocument;
  onChange: (doc: JsonPackDocument) => void;
}

/** Collect pickup item ids referenced by hotspots. */
export function collectPickupItems(doc: JsonPackDocument): JsonPackItem[] {
  const out: JsonPackItem[] = [];
  const seen = new Set<string>();
  for (const room of Object.values(doc.rooms)) {
    for (const h of room.hotspots ?? []) {
      if (h.kind !== "pickup" || !h.itemId) continue;
      if (seen.has(h.itemId)) continue;
      seen.add(h.itemId);
      const catalog = doc.items?.[h.itemId];
      out.push({
        id: h.itemId,
        name: h.itemName || catalog?.name || h.name,
        description:
          h.itemDescription || catalog?.description || h.itemName || h.name,
        icon: h.itemIcon || catalog?.icon,
      });
    }
  }
  return out;
}

/**
 * Shared item catalog — icons + names for pickups / combines.
 * Icons travel as data URLs inside the pack (no asset path hunting).
 */
export function PackItemsPanel({ doc, onChange }: PackItemsPanelProps) {
  const items = useMemo(
    () => Object.values(doc.items ?? {}).sort((a, b) => a.id.localeCompare(b.id)),
    [doc.items]
  );

  const [newId, setNewId] = useState("brass_key");
  const [newName, setNewName] = useState("Brass key");
  const [newDesc, setNewDesc] = useState("");

  const upsertItem = (item: JsonPackItem) => {
    onChange({
      ...doc,
      items: { ...(doc.items ?? {}), [item.id]: item },
    });
  };

  const removeItem = (id: string) => {
    const next = { ...(doc.items ?? {}) };
    delete next[id];
    onChange({ ...doc, items: next });
  };

  const syncFromPickups = () => {
    const fromHotspots = collectPickupItems(doc);
    if (!fromHotspots.length) {
      toastError("No pickups yet", "Draw a pickup hotspot first");
      return;
    }
    const itemsMap = { ...(doc.items ?? {}) };
    for (const item of fromHotspots) {
      const prev = itemsMap[item.id];
      itemsMap[item.id] = {
        id: item.id,
        name: item.name,
        description: item.description || prev?.description,
        icon: prev?.icon || item.icon,
      };
    }
    onChange({ ...doc, items: itemsMap });
    toastOk("Synced from pickups", `${fromHotspots.length} item(s)`);
  };

  const addItem = () => {
    const id = suggestId(newId, "item");
    upsertItem({
      id,
      name: newName.trim() || id,
      description: newDesc.trim() || newName.trim() || id,
    });
    toastOk("Item added", id);
  };

  const onIcon = async (itemId: string, file: File | null) => {
    if (!file) return;
    let dataUrl: string;
    try {
      dataUrl = await fileToDataUrl(file);
    } catch (e) {
      toastError("Image rejected", e);
      return;
    }
    const prev = doc.items?.[itemId];
    if (!prev) return;
    // Mirror onto matching pickup hotspots so draft stays consistent
    const rooms = { ...doc.rooms };
    for (const [rid, room] of Object.entries(rooms)) {
      const hotspots = (room.hotspots ?? []).map((h) =>
        h.kind === "pickup" && h.itemId === itemId
          ? { ...h, itemIcon: dataUrl }
          : h
      );
      rooms[rid] = { ...room, hotspots };
    }
    onChange({
      ...doc,
      items: { ...(doc.items ?? {}), [itemId]: { ...prev, icon: dataUrl } },
      rooms,
    });
    toastOk("Icon embedded", itemId);
  };

  return (
    <section className="border border-game-border bg-game-ui/90 p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="pixel-font text-sm text-accent">Items</h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Catalog icons and names for inventory. Pickup hotspots prefer these
            defaults; icons ship inside the{" "}
            <code className="text-accent">.pack.json</code>.
          </p>
        </div>
        <button
          type="button"
          onClick={syncFromPickups}
          className="pixel-font text-xs min-h-[36px] px-3 border border-game-border"
        >
          Sync from pickups
        </button>
      </div>

      <div className="grid sm:grid-cols-3 gap-2 border border-border/60 p-3">
        <label className="block text-xs space-y-1">
          <span className="text-muted-foreground">Id</span>
          <input
            className="w-full bg-background border border-border px-2 py-2 min-h-[40px]"
            value={newId}
            onChange={(e) => setNewId(e.target.value)}
          />
        </label>
        <label className="block text-xs space-y-1">
          <span className="text-muted-foreground">Name</span>
          <input
            className="w-full bg-background border border-border px-2 py-2 min-h-[40px]"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
        </label>
        <label className="block text-xs space-y-1">
          <span className="text-muted-foreground">Description</span>
          <input
            className="w-full bg-background border border-border px-2 py-2 min-h-[40px]"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Optional"
          />
        </label>
        <button
          type="button"
          onClick={addItem}
          className="pixel-font text-xs min-h-[40px] px-3 border-2 border-accent text-accent sm:col-span-3"
        >
          Add item
        </button>
      </div>

      <ul className="space-y-2 max-h-72 overflow-y-auto">
        {items.length === 0 && (
          <li className="text-xs text-muted-foreground">
            No catalog items yet — sync from pickups or add one.
          </li>
        )}
        {items.map((item) => (
          <li
            key={item.id}
            className="border border-border/60 p-2 grid sm:grid-cols-[48px_1fr_auto] gap-2 items-start"
          >
            <div className="w-12 h-12 border border-border bg-black/30 flex items-center justify-center overflow-hidden">
              {item.icon && isSafeMediaUrl(item.icon) ? (
                <img
                  src={item.icon}
                  alt=""
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="text-[9px] text-muted-foreground">?</span>
              )}
            </div>
            <div className="space-y-1 min-w-0">
              <div className="text-xs font-medium truncate">
                {item.name}{" "}
                <span className="text-muted-foreground">({item.id})</span>
              </div>
              <input
                className="w-full bg-background border border-border px-2 py-1 text-xs"
                value={item.name}
                onChange={(e) =>
                  upsertItem({ ...item, name: e.target.value })
                }
              />
              <input
                className="w-full bg-background border border-border px-2 py-1 text-xs"
                value={item.description || ""}
                onChange={(e) =>
                  upsertItem({ ...item, description: e.target.value })
                }
                placeholder="Description"
              />
              <label className="block text-[10px] text-muted-foreground space-y-1">
                <span>Icon image</span>
                <input
                  type="file"
                  accept="image/*"
                  className="w-full text-[10px]"
                  onChange={(e) =>
                    void onIcon(item.id, e.target.files?.[0] ?? null)
                  }
                />
              </label>
            </div>
            <button
              type="button"
              className="text-xs text-destructive"
              onClick={() => removeItem(item.id)}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
