import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  PACK_TEMPLATES,
  createPackFromTemplate,
  type PackTemplateId,
} from "@/authoring/packTemplates";
import {
  BLEND_LAYERS,
  blendPacks,
  formatBlendReport,
  type BlendConflictPolicy,
  type BlendLayer,
} from "@/engine/blendPacks";
import {
  parseJsonPack,
  type JsonPackDocument,
} from "@/engine/jsonPack";
import { safeJsonParse } from "@/engine/security";
import {
  ensureLibrarySeeded,
  getActiveLibraryId,
  listPackLibrary,
  peekLibraryDraft,
  type PackLibraryEntry,
} from "@/studio/packLibrary";
import { toastError, toastOk } from "@/studio/toastError";

export interface PackBlendPanelProps {
  doc: JsonPackDocument;
  onChange: (doc: JsonPackDocument) => void;
}

type DonorSource = "file" | "library" | "starter";

const LAYER_LABELS: Record<BlendLayer, string> = {
  rooms: "Rooms",
  items: "Items",
  actors: "Actors",
  links: "Links",
  audio: "Audio",
  combinations: "Combinations",
  quests: "Quests",
  hints: "Hints",
  cutscenes: "Cutscenes",
  achievements: "Achievements",
  flags: "Flags",
  i18n: "i18n",
  map: "Map groups",
};

/**
 * Merge another pack into the current draft — rooms, items, audio, quests…
 * Keeps base id/title/startRoom; remaps colliding donor ids.
 */
export function PackBlendPanel({ doc, onChange }: PackBlendPanelProps) {
  const [source, setSource] = useState<DonorSource>("starter");
  const [entries, setEntries] = useState<PackLibraryEntry[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [libraryId, setLibraryId] = useState("");
  const [starterId, setStarterId] = useState<PackTemplateId>("map-hub");
  const [donor, setDonor] = useState<JsonPackDocument | null>(null);
  const [donorLabel, setDonorLabel] = useState("");
  const [layers, setLayers] = useState<BlendLayer[]>([...BLEND_LAYERS]);
  const [policy, setPolicy] = useState<BlendConflictPolicy>("rename");
  const [keepStartRoom, setKeepStartRoom] = useState(true);
  const [lastReport, setLastReport] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const refreshLibrary = useCallback(() => {
    setEntries(listPackLibrary());
    setActiveId(getActiveLibraryId());
  }, []);

  useEffect(() => {
    void ensureLibrarySeeded().then(refreshLibrary);
  }, [refreshLibrary]);

  const libraryChoices = useMemo(
    () => entries.filter((e) => e.id !== activeId),
    [entries, activeId]
  );

  const toggleLayer = (layer: BlendLayer) => {
    setLayers((prev) =>
      prev.includes(layer)
        ? prev.filter((l) => l !== layer)
        : [...prev, layer]
    );
  };

  const loadFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result ?? "");
        const parsed = safeJsonParse<unknown>(text);
        if (!parsed) throw new Error("Invalid JSON");
        const pack = parseJsonPack(parsed);
        setDonor(pack);
        setDonorLabel(`${pack.title || pack.id} (.pack.json)`);
        toastOk("Donor loaded", pack.id);
      } catch (err) {
        toastError(
          "Cannot read pack",
          err instanceof Error ? err : "Bad file"
        );
      }
    };
    reader.readAsText(file);
  };

  const loadLibrary = async () => {
    if (!libraryId) {
      toastError("Pick a draft", "Select a library slot to blend from.");
      return;
    }
    const pack = await peekLibraryDraft(libraryId);
    if (!pack) {
      toastError("Draft missing", "That library slot could not be loaded.");
      return;
    }
    setDonor(pack);
    const meta = entries.find((e) => e.id === libraryId);
    setDonorLabel(meta?.name || pack.title || pack.id);
    toastOk("Donor loaded", pack.id);
  };

  const loadStarter = () => {
    const meta = PACK_TEMPLATES.find((t) => t.id === starterId);
    const pack = createPackFromTemplate({
      id: `blend-${starterId}`,
      title: meta?.title || starterId,
      templateId: starterId,
    });
    setDonor(pack);
    setDonorLabel(`${meta?.title || starterId} (starter)`);
    toastOk("Donor loaded", starterId);
  };

  const blend = () => {
    if (!donor) {
      toastError(
        "No donor",
        "Load a file, library draft, or starter first."
      );
      return;
    }
    if (!layers.length) {
      toastError("No layers", "Select at least one layer to blend.");
      return;
    }
    try {
      const { pack, report } = blendPacks(doc, donor, {
        layers,
        onConflict: policy,
        keepStartRoom,
      });
      onChange(pack);
      const text = formatBlendReport(report);
      setLastReport(text);
      toastOk(
        "Packs blended",
        `+${report.added.rooms.length} rooms, +${report.added.items.length} items, +${report.added.links} links`
      );
    } catch (err) {
      toastError(
        "Blend failed",
        err instanceof Error ? err : "Unknown error"
      );
    }
  };

  return (
    <section className="border border-game-border bg-game-ui/90 p-4 space-y-3">
      <div>
        <h3 className="pixel-font text-sm text-accent">Blend packs</h3>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          Pull rooms, items, audio, quests, and more from another pack into this
          draft. Base id, title, and start room stay put; colliding donor ids
          rename by default.
        </p>
      </div>

      <div className="flex flex-wrap gap-1">
        {(
          [
            ["starter", "Starter kit"],
            ["library", "Library draft"],
            ["file", "Import file"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setSource(id)}
            className={`pixel-font text-[10px] min-h-[32px] px-2 border ${
              source === id
                ? "border-accent text-accent"
                : "border-game-border text-muted-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {source === "starter" && (
        <div className="flex flex-wrap gap-2 items-end">
          <label className="flex-1 min-w-[160px] space-y-1">
            <span className="text-[10px] text-muted-foreground">Starter</span>
            <select
              className="w-full bg-background border border-border px-2 py-2 min-h-[40px] text-xs"
              value={starterId}
              onChange={(e) => setStarterId(e.target.value as PackTemplateId)}
            >
              {PACK_TEMPLATES.filter((t) => t.id !== "blank").map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="pixel-font text-xs min-h-[40px] px-3 border border-game-border"
            onClick={loadStarter}
          >
            Load donor
          </button>
        </div>
      )}

      {source === "library" && (
        <div className="flex flex-wrap gap-2 items-end">
          <label className="flex-1 min-w-[160px] space-y-1">
            <span className="text-[10px] text-muted-foreground">
              Other draft
            </span>
            <select
              className="w-full bg-background border border-border px-2 py-2 min-h-[40px] text-xs"
              value={libraryId}
              onChange={(e) => setLibraryId(e.target.value)}
            >
              <option value="">— select —</option>
              {libraryChoices.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.packId})
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="pixel-font text-xs min-h-[40px] px-3 border border-game-border"
            onClick={() => void loadLibrary()}
          >
            Load donor
          </button>
        </div>
      )}

      {source === "file" && (
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) loadFile(f);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            className="pixel-font text-xs min-h-[40px] px-3 border border-game-border"
            onClick={() => fileRef.current?.click()}
          >
            Choose .pack.json
          </button>
        </div>
      )}

      {donor && (
        <p className="text-[11px] text-foreground">
          Donor ready: <span className="text-accent">{donorLabel}</span> ·{" "}
          {Object.keys(donor.rooms).length} rooms ·{" "}
          {Object.keys(donor.items ?? {}).length} items
        </p>
      )}

      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
          <span className="text-[10px] text-muted-foreground">Layers</span>
          <div className="flex gap-2">
            <button
              type="button"
              className="text-[10px] underline text-muted-foreground"
              onClick={() => setLayers([...BLEND_LAYERS])}
            >
              All
            </button>
            <button
              type="button"
              className="text-[10px] underline text-muted-foreground"
              onClick={() => setLayers([])}
            >
              None
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          {BLEND_LAYERS.map((layer) => (
            <button
              key={layer}
              type="button"
              onClick={() => toggleLayer(layer)}
              className={`pixel-font text-[10px] min-h-[28px] px-2 border ${
                layers.includes(layer)
                  ? "border-accent/70 text-accent"
                  : "border-border/60 text-muted-foreground"
              }`}
            >
              {LAYER_LABELS[layer]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <label className="space-y-1">
          <span className="text-[10px] text-muted-foreground">On conflict</span>
          <select
            className="block bg-background border border-border px-2 py-2 min-h-[40px] text-xs"
            value={policy}
            onChange={(e) =>
              setPolicy(e.target.value as BlendConflictPolicy)
            }
          >
            <option value="rename">Rename donor ids</option>
            <option value="skip">Skip collisions</option>
            <option value="overwrite">Overwrite base</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs text-muted-foreground min-h-[40px]">
          <input
            type="checkbox"
            checked={keepStartRoom}
            onChange={(e) => setKeepStartRoom(e.target.checked)}
          />
          Keep start room
        </label>
        <button
          type="button"
          className="pixel-font text-xs min-h-[40px] px-4 border-2 border-accent text-accent ml-auto"
          onClick={blend}
          disabled={!donor || !layers.length}
        >
          Blend into draft
        </button>
      </div>

      {lastReport && (
        <pre className="text-[10px] text-muted-foreground whitespace-pre-wrap border border-border/50 bg-background/50 p-2 max-h-32 overflow-y-auto">
          {lastReport}
        </pre>
      )}
    </section>
  );
}
