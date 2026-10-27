import {
  formatHotspotsArray,
  suggestId,
  type DraftHotspot,
  type HotspotKind,
} from "@/authoring/codegen";
import type { ExitAuthorRow } from "@/authoring/roomAuthorInfo";
import { DesignCoachLive } from "@/components/authoring/DesignCoachLive";
import type { GameDefinition } from "@/engine/definition";
import type { GameState } from "@/engine/types";
import { toast } from "@/hooks/use-toast";
import { studioTabHref } from "@/engine/validationHelp";

export interface AuthorModePanelProps {
  locationId: string;
  definition: GameDefinition;
  gameState: GameState;
  trueFlags: string[];
  exitRows: ExitAuthorRow[];
  modifiedCount: number;
  totalModified: number;
  addMode: boolean;
  drafts: DraftHotspot[];
  selectedDraft: DraftHotspot | null;
  onToggleAddMode: () => void;
  onSelectDraftId: (id: string | null) => void;
  onUpdateDraft: (id: string, patch: Partial<DraftHotspot>) => void;
  onRemoveDraft: (id: string) => void;
  onClearDrafts: () => void;
  onCopyFlags: () => void;
  onExportRoomResource: () => void;
  onSaveSidecar: () => void;
  onClearSidecar: () => void;
  onCopyAllModified: () => void;
  onResetLocation: () => void;
  onResetAll: () => void;
  onClose: () => void;
}

/**
 * Author mode side panel — flags, exits, draft editor, export actions.
 */
export function AuthorModePanel({
  locationId,
  definition,
  gameState,
  trueFlags,
  exitRows,
  modifiedCount,
  totalModified,
  addMode,
  drafts,
  selectedDraft,
  onToggleAddMode,
  onSelectDraftId,
  onUpdateDraft,
  onRemoveDraft,
  onClearDrafts,
  onCopyFlags,
  onExportRoomResource,
  onSaveSidecar,
  onClearSidecar,
  onCopyAllModified,
  onResetLocation,
  onResetAll,
  onClose,
}: AuthorModePanelProps) {
  return (
    <div className="absolute top-2 right-2 bg-black/90 text-white p-3 rounded-lg text-xs font-mono z-[60] max-w-[280px] max-h-[min(90vh,620px)] overflow-y-auto">
      <div className="font-bold mb-1 text-yellow-400">AUTHOR MODE</div>
      <div className="text-gray-300 mb-1">Room: {locationId}</div>
      <div className="text-green-400 mb-1">Changes auto-saved locally</div>
      <DesignCoachLive definition={definition} />
      <div className="text-gray-400 mb-2">
        {modifiedCount > 0 && (
          <span className="text-cyan-400">{modifiedCount} modified here</span>
        )}
        {totalModified > 0 && modifiedCount !== totalModified && (
          <span className="text-gray-500"> ({totalModified} total)</span>
        )}
      </div>

      <div className="mb-2 pt-2 border-t border-gray-600">
        <div className="text-gray-400 mb-1">Flags (true)</div>
        {trueFlags.length === 0 ? (
          <div className="text-gray-500">none yet</div>
        ) : (
          <ul className="text-cyan-300 space-y-0.5 mb-1">
            {trueFlags.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        )}
        <div className="text-gray-500 text-[10px]">
          inv:{" "}
          {gameState.inventory.length
            ? gameState.inventory.map((i) => i.id).join(", ")
            : "—"}
        </div>
      </div>

      {exitRows.length > 0 && (
        <div className="mb-2 pt-2 border-t border-gray-600">
          <div className="text-gray-400 mb-1">Exits</div>
          <ul className="space-y-1 text-[10px]">
            {exitRows.map((ex) => (
              <li key={`${ex.direction}-${ex.to}`}>
                <span className="text-white">{ex.direction}</span> → {ex.to}{" "}
                {ex.blocked ? (
                  <span className="text-orange-400">(blocked)</span>
                ) : (
                  <span className="text-green-400">(open)</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {selectedDraft && (
        <div className="mb-2 pt-2 border-t border-violet-600/60 space-y-1.5">
          <div className="text-violet-300 font-bold">Draft hotspot</div>
          <label className="block text-[10px] text-gray-400">
            Name
            <input
              className="mt-0.5 w-full bg-gray-900 border border-gray-600 px-1.5 py-1 text-white"
              value={selectedDraft.name}
              onChange={(e) =>
                onUpdateDraft(selectedDraft.id, { name: e.target.value })
              }
            />
          </label>
          <label className="block text-[10px] text-gray-400">
            Id
            <input
              className="mt-0.5 w-full bg-gray-900 border border-gray-600 px-1.5 py-1 text-white"
              value={selectedDraft.id}
              onChange={(e) => {
                const nextId = suggestId(e.target.value, "hotspot");
                onUpdateDraft(selectedDraft.id, { id: nextId });
                onSelectDraftId(nextId);
              }}
            />
          </label>
          <label className="block text-[10px] text-gray-400">
            Kind
            <select
              className="mt-0.5 w-full bg-gray-900 border border-gray-600 px-1.5 py-1 text-white"
              value={selectedDraft.kind}
              onChange={(e) => {
                const kind = e.target.value as HotspotKind;
                const patch: Partial<DraftHotspot> = {
                  kind,
                  verbs:
                    kind === "character" ? ["look", "talk"] : ["look", "use"],
                };
                if (kind === "pickup") {
                  patch.itemId =
                    selectedDraft.itemId ||
                    suggestId(selectedDraft.name, "item");
                  patch.itemName =
                    selectedDraft.itemName || selectedDraft.name;
                }
                if (kind === "character") {
                  patch.actorId =
                    selectedDraft.actorId ||
                    suggestId(selectedDraft.name, "actor");
                }
                onUpdateDraft(selectedDraft.id, patch);
              }}
            >
              <option value="pickup">pickup</option>
              <option value="interact">interact</option>
              <option value="use-with-target">use-with</option>
              <option value="character">character</option>
            </select>
          </label>
          {selectedDraft.kind === "pickup" && (
            <>
              <label className="block text-[10px] text-gray-400">
                Item id
                <input
                  className="mt-0.5 w-full bg-gray-900 border border-gray-600 px-1.5 py-1 text-white"
                  value={selectedDraft.itemId || ""}
                  onChange={(e) =>
                    onUpdateDraft(selectedDraft.id, {
                      itemId: suggestId(e.target.value, "item"),
                    })
                  }
                />
              </label>
              <label className="block text-[10px] text-gray-400">
                Item name
                <input
                  className="mt-0.5 w-full bg-gray-900 border border-gray-600 px-1.5 py-1 text-white"
                  value={selectedDraft.itemName || ""}
                  onChange={(e) =>
                    onUpdateDraft(selectedDraft.id, {
                      itemName: e.target.value,
                    })
                  }
                />
              </label>
            </>
          )}
          {selectedDraft.kind === "character" && (
            <label className="block text-[10px] text-gray-400">
              Actor id
              <input
                className="mt-0.5 w-full bg-gray-900 border border-gray-600 px-1.5 py-1 text-white"
                value={selectedDraft.actorId || ""}
                onChange={(e) =>
                  onUpdateDraft(selectedDraft.id, {
                    actorId: suggestId(e.target.value, "actor"),
                  })
                }
              />
            </label>
          )}
          <label className="block text-[10px] text-gray-400">
            Look text
            <textarea
              className="mt-0.5 w-full bg-gray-900 border border-gray-600 px-1.5 py-1 text-white min-h-[48px]"
              value={selectedDraft.lookText || ""}
              onChange={(e) =>
                onUpdateDraft(selectedDraft.id, { lookText: e.target.value })
              }
            />
          </label>
          <div className="flex gap-1 pt-1">
            <button
              type="button"
              className="flex-1 bg-violet-700 hover:bg-violet-600 px-1 py-1.5 rounded text-[10px] min-h-[28px]"
              onClick={() => {
                void navigator.clipboard.writeText(
                  formatHotspotsArray([selectedDraft])
                );
                toast({
                  title: "Copied draft TS",
                  description: selectedDraft.id,
                });
              }}
            >
              Copy this TS
            </button>
            <button
              type="button"
              className="bg-gray-700 hover:bg-gray-600 px-2 py-1.5 rounded text-[10px] min-h-[28px]"
              onClick={() => {
                onRemoveDraft(selectedDraft.id);
                onSelectDraftId(null);
              }}
            >
              Delete
            </button>
          </div>
          <a
            href={studioTabHref("hotspots")}
            className="block text-[10px] text-cyan-400 underline"
          >
            Open Studio → hotspots
          </a>
          <a
            href="/recipes#recipe-get-item"
            className="block text-[10px] text-cyan-400 underline"
          >
            Recipe: get-item
          </a>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={onToggleAddMode}
          className={`px-2 py-1.5 rounded text-xs min-h-[32px] ${
            addMode
              ? "bg-yellow-500 text-black"
              : "bg-yellow-800 hover:bg-yellow-700"
          }`}
        >
          {addMode ? "Drawing… click-drag area" : "Add hotspot (draw)"}
        </button>
        {drafts.length > 0 && (
          <>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(formatHotspotsArray(drafts));
                toast({
                  title: "Copied draft hotspots",
                  description: `${drafts.length} new area(s)`,
                });
              }}
              className="bg-violet-700 hover:bg-violet-600 px-2 py-1.5 rounded text-xs min-h-[32px]"
            >
              Copy new drafts TS ({drafts.length})
            </button>
            <button
              type="button"
              onClick={() => {
                onClearDrafts();
                toast({ title: "Drafts cleared" });
              }}
              className="bg-gray-700 hover:bg-gray-600 px-2 py-1.5 rounded text-xs min-h-[32px]"
            >
              Clear drafts
            </button>
          </>
        )}
        <button
          type="button"
          onClick={onCopyFlags}
          className="bg-cyan-800 hover:bg-cyan-700 px-2 py-1.5 rounded text-xs min-h-[32px]"
        >
          Copy flags / inventory
        </button>
        <button
          type="button"
          onClick={onExportRoomResource}
          className="bg-emerald-700 hover:bg-emerald-600 px-2 py-1.5 rounded text-xs min-h-[32px]"
        >
          Export Room JSON
        </button>
        <button
          type="button"
          onClick={onSaveSidecar}
          className="bg-teal-700 hover:bg-teal-600 px-2 py-1.5 rounded text-xs min-h-[32px]"
        >
          Save TS sidecar overlays
        </button>
        <button
          type="button"
          onClick={onClearSidecar}
          className="bg-teal-900 hover:bg-teal-800 px-2 py-1.5 rounded text-xs min-h-[32px]"
        >
          Clear pack sidecar
        </button>
        <button
          type="button"
          onClick={onCopyAllModified}
          className="bg-blue-600 hover:bg-blue-500 px-2 py-1.5 rounded text-xs min-h-[32px]"
        >
          Copy All Coords
        </button>
        <button
          type="button"
          onClick={onResetLocation}
          className="bg-gray-600 hover:bg-gray-500 px-2 py-1.5 rounded text-xs min-h-[32px]"
        >
          Reset This Location
        </button>
        <button
          type="button"
          onClick={onResetAll}
          className="bg-orange-600 hover:bg-orange-500 px-2 py-1.5 rounded text-xs min-h-[32px]"
        >
          Reset All Locations
        </button>
        <button
          type="button"
          onClick={onClose}
          className="bg-red-600 hover:bg-red-500 px-2 py-1.5 rounded text-xs min-h-[32px]"
        >
          Close Author Mode
        </button>
      </div>

      <div className="mt-3 pt-2 border-t border-gray-600">
        <div className="text-gray-400 mb-1">Legend</div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 bg-yellow-400/60 border border-yellow-400" />{" "}
          Character
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 bg-green-400/60 border border-green-400" />{" "}
          Pickup
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 bg-blue-400/60 border border-blue-400" />{" "}
          Openable
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 bg-pink-400/60 border border-pink-400" />{" "}
          Other
        </div>
      </div>
      <div className="mt-2 pt-2 border-t border-gray-600 text-gray-500 text-[9px]">
        Ctrl+Shift+H · click hotspot → Copy % / Copy object ·{" "}
        <a href="/recipes" className="text-cyan-400 underline">
          recipes
        </a>
      </div>
    </div>
  );
}
