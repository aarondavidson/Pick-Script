import { useState } from "react";
import type { JsonPackDocument } from "@/engine/jsonPack";
import {
  applyUnlockChain,
  type UnlockSourceKind,
  type UnlockTargetKind,
} from "@/authoring/unlockChain";
import { toast } from "@/hooks/use-toast";

export interface UnlockChainWizardProps {
  doc: JsonPackDocument;
  roomId: string;
  onChange: (doc: JsonPackDocument) => void;
}

/**
 * One flow: source that sets a flag/item → target exit (or annotate hotspot).
 */
export function UnlockChainWizard({
  doc,
  roomId,
  onChange,
}: UnlockChainWizardProps) {
  const [open, setOpen] = useState(false);
  const [flag, setFlag] = useState("path_open");
  const [source, setSource] = useState<UnlockSourceKind>("dialogue_choice");
  const [target, setTarget] = useState<UnlockTargetKind>("exit");
  const [exitTo, setExitTo] = useState(
    Object.keys(doc.rooms).find((id) => id !== roomId) || ""
  );
  const [choiceText, setChoiceText] = useState("I understand — thanks");
  const [blockedMessage, setBlockedMessage] = useState("");
  const characters = (doc.rooms[roomId]?.hotspots ?? []).filter(
    (h) => h.kind === "character"
  );
  const [hotspotId, setHotspotId] = useState(characters[0]?.id || "");

  const apply = () => {
    const result = applyUnlockChain(doc, {
      flag,
      source,
      roomId,
      hotspotId: hotspotId || undefined,
      choiceText,
      target,
      exitTo: exitTo || undefined,
      blockedMessage: blockedMessage || undefined,
    });
    onChange(result.doc);
    toast({ title: "Unlock chain applied", description: result.message });
    setOpen(false);
  };

  const roomIds = Object.keys(doc.rooms);

  return (
    <section className="border border-game-border bg-game-ui/90 p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="pixel-font text-sm text-accent">Unlock chain</h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Wire talk / pickup / use-with / combine → exit gate in one step so
            flags don’t get half-connected.
          </p>
        </div>
        <button
          type="button"
          className="pixel-font text-[10px] min-h-[36px] px-2 border-2 border-accent text-accent"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "Close" : "Open wizard"}
        </button>
      </div>
      {open && (
        <div className="space-y-3 border border-border/60 p-3">
          <label className="block text-xs space-y-1">
            <span className="text-muted-foreground">Flag id</span>
            <input
              className="w-full bg-background border border-border px-2 py-2 min-h-[40px]"
              value={flag}
              onChange={(e) => setFlag(e.target.value)}
            />
          </label>
          <label className="block text-xs space-y-1">
            <span className="text-muted-foreground">Source (sets unlock)</span>
            <select
              className="w-full bg-background border border-border px-2 py-2 min-h-[40px]"
              value={source}
              onChange={(e) => setSource(e.target.value as UnlockSourceKind)}
            >
              <option value="dialogue_choice">Talk choice (setFlag)</option>
              <option value="pickup">Pickup item (got_item)</option>
              <option value="use_with">Use-with on hotspot</option>
              <option value="combine">Combine two parts → item gate</option>
            </select>
          </label>
          {source === "dialogue_choice" && (
            <>
              <label className="block text-xs space-y-1">
                <span className="text-muted-foreground">Character hotspot</span>
                <select
                  className="w-full bg-background border border-border px-2 py-2"
                  value={hotspotId}
                  onChange={(e) => setHotspotId(e.target.value)}
                >
                  <option value="">Create NPC if needed</option>
                  {characters.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs space-y-1">
                <span className="text-muted-foreground">Choice text</span>
                <input
                  className="w-full bg-background border border-border px-2 py-2"
                  value={choiceText}
                  onChange={(e) => setChoiceText(e.target.value)}
                />
              </label>
            </>
          )}
          <label className="block text-xs space-y-1">
            <span className="text-muted-foreground">Target</span>
            <select
              className="w-full bg-background border border-border px-2 py-2 min-h-[40px]"
              value={target}
              onChange={(e) => setTarget(e.target.value as UnlockTargetKind)}
            >
              <option value="exit">Gate an exit</option>
              <option value="none">Only set the flag (wire exit later)</option>
            </select>
          </label>
          {target === "exit" && (
            <>
              <label className="block text-xs space-y-1">
                <span className="text-muted-foreground">Exit to room</span>
                <select
                  className="w-full bg-background border border-border px-2 py-2"
                  value={exitTo}
                  onChange={(e) => setExitTo(e.target.value)}
                >
                  {roomIds
                    .filter((id) => id !== roomId)
                    .map((id) => (
                      <option key={id} value={id}>
                        {doc.rooms[id]?.name || id}
                      </option>
                    ))}
                </select>
              </label>
              <label className="block text-xs space-y-1">
                <span className="text-muted-foreground">Blocked message</span>
                <input
                  className="w-full bg-background border border-border px-2 py-2"
                  value={blockedMessage}
                  onChange={(e) => setBlockedMessage(e.target.value)}
                  placeholder="You can't go that way yet…"
                />
              </label>
            </>
          )}
          <button
            type="button"
            className="pixel-font text-xs min-h-[40px] px-3 border-2 border-accent text-accent"
            onClick={apply}
            disabled={target === "exit" && !exitTo}
          >
            Apply unlock chain
          </button>
        </div>
      )}
    </section>
  );
}
