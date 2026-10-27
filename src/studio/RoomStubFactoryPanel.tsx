import { useState } from "react";
import type { JsonPackDocument } from "@/engine/jsonPack";
import { applyRoomStubFactory } from "@/authoring/roomStubFactory";
import { toastOk } from "@/studio/toastError";

export interface RoomStubFactoryPanelProps {
  doc: JsonPackDocument;
  onChange: (doc: JsonPackDocument) => void;
}

/**
 * Add N stub rooms with placeholder art + cardinal / line exits.
 */
export function RoomStubFactoryPanel({
  doc,
  onChange,
}: RoomStubFactoryPanelProps) {
  const [count, setCount] = useState(4);
  const [layout, setLayout] = useState<"line" | "cross">("line");
  const [prefix, setPrefix] = useState("Room");

  const run = () => {
    const next = applyRoomStubFactory(doc, {
      count,
      layout,
      namePrefix: prefix,
      mapGroupName: "Stubs",
    });
    onChange(next);
    toastOk("Stub rooms added", `${count} rooms (${layout}) with MISSING ART placeholders — see Ship checklist.`);
  };

  return (
    <section className="border border-game-border bg-game-ui/90 p-4 space-y-3">
      <div>
        <h3 className="pixel-font text-sm text-accent">Room stub factory</h3>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          Instant navigation skeleton — walk between locations before puzzles
          or final art exist.
        </p>
      </div>
      <div className="grid sm:grid-cols-3 gap-2">
        <label className="text-xs space-y-1">
          <span className="text-muted-foreground">Count</span>
          <input
            type="number"
            min={1}
            max={8}
            className="w-full bg-background border border-border px-2 py-2 min-h-[40px]"
            value={count}
            onChange={(e) => setCount(Number(e.target.value) || 1)}
          />
        </label>
        <label className="text-xs space-y-1">
          <span className="text-muted-foreground">Layout</span>
          <select
            className="w-full bg-background border border-border px-2 py-2 min-h-[40px]"
            value={layout}
            onChange={(e) =>
              setLayout(e.target.value === "cross" ? "cross" : "line")
            }
          >
            <option value="line">Line (east chain)</option>
            <option value="cross">Cross (N/E/S/W from start)</option>
          </select>
        </label>
        <label className="text-xs space-y-1">
          <span className="text-muted-foreground">Name prefix</span>
          <input
            className="w-full bg-background border border-border px-2 py-2 min-h-[40px]"
            value={prefix}
            onChange={(e) => setPrefix(e.target.value)}
          />
        </label>
      </div>
      <button
        type="button"
        className="pixel-font text-xs min-h-[40px] px-3 border-2 border-accent text-accent"
        onClick={run}
      >
        Add stub rooms
      </button>
    </section>
  );
}
