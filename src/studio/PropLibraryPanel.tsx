import { useState } from "react";
import type { JsonPackDocument } from "@/engine/jsonPack";
import {
  PROP_LIBRARY,
  placePropFromLibrary,
  type PropLibraryKind,
} from "@/authoring/propLibrary";
import { toast } from "@/hooks/use-toast";

export interface PropLibraryPanelProps {
  doc: JsonPackDocument;
  roomId: string;
  onChange: (doc: JsonPackDocument) => void;
}

/**
 * Drop shared NPCs / props into the current room.
 */
export function PropLibraryPanel({
  doc,
  roomId,
  onChange,
}: PropLibraryPanelProps) {
  const [filter, setFilter] = useState<PropLibraryKind | "all">("all");
  const list =
    filter === "all"
      ? PROP_LIBRARY
      : PROP_LIBRARY.filter((e) => e.kind === filter);

  return (
    <section className="border border-game-border bg-game-ui/90 p-4 space-y-3">
      <div>
        <h3 className="pixel-font text-sm text-accent">Prop / NPC library</h3>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          Reusable characters and props (GPL project art stubs). Place into{" "}
          <strong className="font-normal text-foreground">
            {doc.rooms[roomId]?.name || roomId}
          </strong>
          .
        </p>
      </div>
      <div className="flex flex-wrap gap-1">
        {(["all", "npc", "prop", "pickup"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setFilter(k)}
            className={`pixel-font text-[10px] min-h-[32px] px-2 border ${
              filter === k
                ? "border-accent text-accent"
                : "border-game-border text-muted-foreground"
            }`}
          >
            {k}
          </button>
        ))}
      </div>
      <ul className="grid sm:grid-cols-2 gap-2">
        {list.map((e) => (
          <li
            key={e.id}
            className="border border-border/60 px-2 py-2 flex gap-2 items-start"
          >
            <img
              src={e.art}
              alt=""
              className="w-12 h-12 object-contain bg-black/40 border border-border shrink-0"
            />
            <div className="min-w-0 flex-1 space-y-1">
              <div className="pixel-font text-[11px] text-foreground">
                {e.title}
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                {e.blurb}
              </p>
              <button
                type="button"
                className="pixel-font text-[10px] min-h-[32px] px-2 border-2 border-accent text-accent"
                onClick={() => {
                  const result = placePropFromLibrary(doc, {
                    entryId: e.id,
                    roomId,
                  });
                  onChange(result.doc);
                  toast({
                    title: "Placed from library",
                    description: result.message,
                  });
                }}
              >
                Place in room
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
