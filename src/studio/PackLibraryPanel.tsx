import { useCallback, useEffect, useState } from "react";
import type { JsonPackDocument } from "@/engine/jsonPack";
import {
  createLibraryDraft,
  deleteLibraryDraft,
  duplicateLibraryDraft,
  ensureLibrarySeeded,
  getActiveLibraryId,
  listPackLibrary,
  saveDraftToLibrary,
  switchToLibraryDraft,
  type PackLibraryEntry,
} from "@/studio/packLibrary";
import { toast } from "@/hooks/use-toast";

export interface PackLibraryPanelProps {
  doc: JsonPackDocument;
  onLoad: (doc: JsonPackDocument) => void;
}

/**
 * Named draft library — save, switch, duplicate, recover.
 */
export function PackLibraryPanel({ doc, onLoad }: PackLibraryPanelProps) {
  const [entries, setEntries] = useState<PackLibraryEntry[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [name, setName] = useState("");

  const refresh = useCallback(() => {
    setEntries(listPackLibrary());
    setActiveId(getActiveLibraryId());
  }, []);

  useEffect(() => {
    void ensureLibrarySeeded().then(refresh);
  }, [refresh]);

  return (
    <section className="border border-game-border bg-game-ui/90 p-4 space-y-3">
      <div>
        <h3 className="pixel-font text-sm text-accent">Draft library</h3>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          Named drafts so Publish / Reset does not clobber another idea.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <input
          className="flex-1 min-w-[140px] bg-background border border-border px-2 py-2 min-h-[40px] text-xs"
          placeholder="Draft name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          type="button"
          className="pixel-font text-xs min-h-[40px] px-3 border-2 border-accent text-accent"
          onClick={() => {
            void saveDraftToLibrary(doc, name || doc.title).then((e) => {
              refresh();
              toast({ title: "Draft saved", description: e.name });
            });
          }}
        >
          Save
        </button>
        <button
          type="button"
          className="pixel-font text-xs min-h-[40px] px-3 border border-game-border"
          onClick={() => {
            void createLibraryDraft(doc, name || `${doc.title} (new)`).then(
              (e) => {
                refresh();
                onLoad(doc);
                toast({ title: "New slot", description: e.name });
              }
            );
          }}
        >
          New slot
        </button>
        <button
          type="button"
          className="pixel-font text-xs min-h-[40px] px-3 border border-game-border"
          onClick={() => {
            void duplicateLibraryDraft(doc).then(async (e) => {
              const loaded = await switchToLibraryDraft(e.id);
              refresh();
              if (loaded) onLoad(loaded);
              toast({ title: "Duplicated", description: e.name });
            });
          }}
        >
          Duplicate
        </button>
      </div>
      {entries.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No saved drafts yet — Save creates the first slot.
        </p>
      ) : (
        <ul className="space-y-1 max-h-40 overflow-y-auto text-xs">
          {entries.map((e) => (
            <li
              key={e.id}
              className={`flex flex-wrap items-center justify-between gap-2 border px-2 py-1.5 ${
                e.id === activeId
                  ? "border-accent/60 bg-accent/10"
                  : "border-border/60"
              }`}
            >
              <button
                type="button"
                className="text-left flex-1 min-w-0"
                onClick={() => {
                  void switchToLibraryDraft(e.id).then((loaded) => {
                    refresh();
                    if (loaded) {
                      onLoad(loaded);
                      toast({ title: "Switched draft", description: e.name });
                    }
                  });
                }}
              >
                <span className="text-foreground block truncate">{e.name}</span>
                <span className="text-[10px] text-muted-foreground">
                  {e.title} · {new Date(e.updatedAt).toLocaleString()}
                </span>
              </button>
              <button
                type="button"
                className="text-destructive shrink-0"
                onClick={() => {
                  if (!window.confirm(`Delete draft “${e.name}”?`)) return;
                  void deleteLibraryDraft(e.id).then(refresh);
                }}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
