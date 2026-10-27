import { suggestId } from "@/authoring/codegen";
import type {
  JsonPackDocument,
  JsonPackHotspot,
} from "@/engine/jsonPack";
import { sanitizePackActions } from "@/engine/packActions";
import { safeJsonParse } from "@/engine/security";
import { GuidedActionEditor } from "@/studio/GuidedActionEditor";
import { GuidedStateEditor } from "@/studio/GuidedStateEditor";
import { PackSpecialsPanel } from "@/studio/PackSpecialsPanel";
import { setRoomHotspots } from "@/studio/packDraft";

export interface PackHotspotInspectorProps {
  doc: JsonPackDocument;
  roomId: string;
  guided: boolean;
  selected: JsonPackHotspot;
  selectedHotspot: string;
  hotspots: JsonPackHotspot[];
  onChange: (doc: JsonPackDocument) => void;
  onSelectHotspot: (id: string | null) => void;
  patchHotspot: (patch: Partial<JsonPackHotspot>) => void;
}

/**
 * Selected hotspot fields / actions — extracted from PackStageCanvas.
 */
export function PackHotspotInspector({
  doc,
  roomId,
  guided,
  selected,
  selectedHotspot,
  hotspots,
  onChange,
  onSelectHotspot,
  patchHotspot,
}: PackHotspotInspectorProps) {
  return (
    <div className="grid sm:grid-cols-2 gap-2 border-t border-border pt-3">
      <label className="block text-xs space-y-1">
        <span className="text-muted-foreground">Id</span>
        <input
          className="w-full bg-background border border-border px-2 py-1.5"
          value={selected.id}
          onChange={(e) =>
            patchHotspot({ id: suggestId(e.target.value, "hotspot") })
          }
        />
      </label>
      <label className="block text-xs space-y-1">
        <span className="text-muted-foreground">Look text</span>
        <input
          className="w-full bg-background border border-border px-2 py-1.5"
          value={selected.lookText || ""}
          onChange={(e) => patchHotspot({ lookText: e.target.value })}
        />
      </label>
      {selected.kind === "pickup" && (
        <>
          <label className="block text-xs space-y-1">
            <span className="text-muted-foreground">Item id</span>
            <input
              className="w-full bg-background border border-border px-2 py-1.5"
              value={selected.itemId || ""}
              onChange={(e) => {
                const itemId = suggestId(e.target.value, "item");
                const prevId = selected.itemId;
                let next = setRoomHotspots(
                  doc,
                  roomId,
                  hotspots.map((h) =>
                    h.id === selectedHotspot ? { ...h, itemId } : h
                  )
                );
                if (itemId) {
                  const prev = prevId ? next.items?.[prevId] : undefined;
                  next = {
                    ...next,
                    items: {
                      ...(next.items ?? {}),
                      [itemId]: {
                        id: itemId,
                        name:
                          selected.itemName ||
                          prev?.name ||
                          selected.name,
                        description:
                          selected.itemDescription ||
                          prev?.description ||
                          selected.itemName ||
                          selected.name,
                        icon: selected.itemIcon || prev?.icon,
                      },
                    },
                  };
                }
                onChange(next);
              }}
            />
          </label>
          <label className="block text-xs space-y-1">
            <span className="text-muted-foreground">Item name</span>
            <input
              className="w-full bg-background border border-border px-2 py-1.5"
              value={selected.itemName || ""}
              onChange={(e) => {
                const itemName = e.target.value;
                const itemId = selected.itemId;
                let next = setRoomHotspots(
                  doc,
                  roomId,
                  hotspots.map((h) =>
                    h.id === selectedHotspot ? { ...h, itemName } : h
                  )
                );
                if (itemId) {
                  next = {
                    ...next,
                    items: {
                      ...(next.items ?? {}),
                      [itemId]: {
                        id: itemId,
                        name: itemName || itemId,
                        description:
                          next.items?.[itemId]?.description || itemName,
                        icon: next.items?.[itemId]?.icon,
                      },
                    },
                  };
                }
                onChange(next);
              }}
            />
          </label>
        </>
      )}
      <label className="block text-xs space-y-1">
        <span className="text-muted-foreground">Interact SFX</span>
        <input
          className="w-full bg-background border border-border px-2 py-1.5"
          value={selected.interactSound || ""}
          onChange={(e) =>
            patchHotspot({
              interactSound: e.target.value.trim() || undefined,
            })
          }
          placeholder="creak"
        />
      </label>
      <label className="block text-xs space-y-1">
        <span className="text-muted-foreground">Interact haptic</span>
        <select
          className="w-full bg-background border border-border px-2 py-1.5"
          value={selected.interactHaptic || ""}
          onChange={(e) =>
            patchHotspot({
              interactHaptic: (e.target.value || undefined) as
                | typeof selected.interactHaptic
                | undefined,
            })
          }
        >
          <option value="">Auto from SFX</option>
          <option value="light">light</option>
          <option value="medium">medium</option>
          <option value="heavy">heavy</option>
          <option value="success">success</option>
          <option value="warning">warning</option>
          <option value="error">error</option>
          <option value="selection">selection</option>
        </select>
      </label>
      <label className="block text-xs space-y-1">
        <span className="text-muted-foreground">Use-with haptic</span>
        <select
          className="w-full bg-background border border-border px-2 py-1.5"
          value={selected.useWithHaptic || ""}
          onChange={(e) =>
            patchHotspot({
              useWithHaptic: (e.target.value || undefined) as
                | typeof selected.useWithHaptic
                | undefined,
            })
          }
        >
          <option value="">Auto from SFX</option>
          <option value="light">light</option>
          <option value="medium">medium</option>
          <option value="heavy">heavy</option>
          <option value="success">success</option>
          <option value="warning">warning</option>
          <option value="error">error</option>
          <option value="selection">selection</option>
        </select>
      </label>
      <div className="sm:col-span-2">
        <GuidedStateEditor
          initialState={selected.initialState ?? 0}
          stateOverlays={selected.stateOverlays}
          onChange={(patch) =>
            patchHotspot({
              initialState: patch.initialState,
              stateOverlays:
                patch.stateOverlays && Object.keys(patch.stateOverlays).length
                  ? patch.stateOverlays
                  : undefined,
            })
          }
        />
      </div>
      <div className="sm:col-span-2">
        <GuidedActionEditor
          actions={selected.actions}
          guided={guided}
          onChange={(actions) =>
            patchHotspot({
              actions: actions.length ? actions : undefined,
              actionVerbs: selected.actionVerbs ?? ["look", "use"],
            })
          }
        />
      </div>
      <PackSpecialsPanel
        hotspot={selected}
        doc={doc}
        guided={guided}
        onAttach={(special) =>
          patchHotspot({ special: special ?? undefined })
        }
      />
      {!guided && (
        <label className="block text-xs space-y-1 sm:col-span-2">
          <span className="text-muted-foreground">
            Action chain (raw JSON)
          </span>
          <textarea
            className="w-full bg-background border border-border px-2 py-1.5 font-mono text-[11px] min-h-[72px]"
            value={
              selected.actions
                ? JSON.stringify(selected.actions, null, 2)
                : ""
            }
            onChange={(e) => {
              const raw = e.target.value.trim();
              if (!raw) {
                patchHotspot({ actions: undefined });
                return;
              }
              try {
                const parsed = safeJsonParse(raw);
                if (!Array.isArray(parsed)) throw new Error("not array");
                patchHotspot({ actions: sanitizePackActions(parsed) });
              } catch {
                /* keep typing until valid JSON */
              }
            }}
            placeholder='[{"op":"message","text":"It opens."}]'
          />
        </label>
      )}
      <button
        type="button"
        className="text-xs text-destructive self-end min-h-[36px]"
        onClick={() => {
          onChange(
            setRoomHotspots(
              doc,
              roomId,
              hotspots.filter((h) => h.id !== selected.id)
            )
          );
          onSelectHotspot(null);
        }}
      >
        Delete hotspot
      </button>
    </div>
  );
}
