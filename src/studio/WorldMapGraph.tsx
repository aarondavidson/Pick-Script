import { useMemo, useState } from "react";
import type { JsonPackDocument, JsonPackLink } from "@/engine/jsonPack";
import { upsertLink, removeLink } from "@/studio/packDraft";
import { toast } from "@/hooks/use-toast";

export interface WorldMapGraphProps {
  doc: JsonPackDocument;
  onChange: (doc: JsonPackDocument) => void;
  onSelectRoom?: (roomId: string) => void;
}

/**
 * Visual room graph — nodes + exit edges with gate editing.
 */
export function WorldMapGraph({
  doc,
  onChange,
  onSelectRoom,
}: WorldMapGraphProps) {
  const roomIds = Object.keys(doc.rooms);
  const links = doc.links ?? [];
  const [selected, setSelected] = useState<string | null>(null);
  const [linkFrom, setLinkFrom] = useState(doc.startRoom);
  const [linkTo, setLinkTo] = useState(roomIds.find((id) => id !== doc.startRoom) || "");
  const [drawingFrom, setDrawingFrom] = useState<string | null>(null);

  const nodes = useMemo(() => {
    const n = Math.max(roomIds.length, 1);
    return roomIds.map((id, i) => {
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      const r = n <= 4 ? 28 : 34;
      return {
        id,
        x: 50 + Math.cos(angle) * r,
        y: 50 + Math.sin(angle) * r,
        name: doc.rooms[id]?.name || id,
      };
    });
  }, [roomIds, doc.rooms]);

  const selectedLink = links.find(
    (l) => `${l.from}→${l.to}` === selected
  );

  const patchLink = (patch: Partial<JsonPackLink>) => {
    if (!selectedLink) return;
    onChange(
      upsertLink(doc, {
        ...selectedLink,
        ...patch,
      })
    );
  };

  const addEdge = (from: string, to: string) => {
    if (from === to || !doc.rooms[to]) return;
    onChange(
      upsertLink(doc, {
        from,
        to,
        direction: "east",
        fromLabel: doc.rooms[to]?.name || to,
        toLabel: doc.rooms[from]?.name || from,
      })
    );
    setSelected(`${from}→${to}`);
    setDrawingFrom(null);
    toast({ title: "Exit linked", description: `${from} → ${to}` });
  };

  return (
    <section
      id="world-map-graph"
      className="border border-game-border bg-game-ui/90 p-4 space-y-3"
    >
      <div>
        <h3 className="pixel-font text-sm text-accent">World map graph</h3>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          Click a room to focus it. Click one room then another to draw an exit.
          Select an edge to set flag/item gates.
        </p>
      </div>

      <div className="relative w-full aspect-[2/1] border border-border bg-black/30 overflow-hidden">
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
          {links.map((l) => {
            const a = nodes.find((n) => n.id === l.from);
            const b = nodes.find((n) => n.id === l.to);
            if (!a || !b) return null;
            const key = `${l.from}→${l.to}`;
            const gated = !!(l.requireFlag || l.requireItem);
            const active = selected === key;
            return (
              <g
                key={key}
                className="cursor-pointer"
                onClick={() => setSelected(key)}
              >
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={
                    active
                      ? "hsl(45 80% 55%)"
                      : gated
                        ? "hsl(15 70% 50%)"
                        : "hsl(45 40% 45% / 0.7)"
                  }
                  strokeWidth={active ? 1.2 : 0.7}
                  strokeDasharray={gated ? "2 1.2" : undefined}
                />
              </g>
            );
          })}
          {nodes.map((n) => (
            <g
              key={n.id}
              className="cursor-pointer"
              onClick={() => {
                onSelectRoom?.(n.id);
                if (drawingFrom && drawingFrom !== n.id) {
                  addEdge(drawingFrom, n.id);
                  return;
                }
                setDrawingFrom(n.id);
                toast({
                  title: "Link from " + (doc.rooms[n.id]?.name || n.id),
                  description: "Click another room to connect",
                });
              }}
            >
              <circle
                cx={n.x}
                cy={n.y}
                r="7"
                fill={
                  n.id === doc.startRoom
                    ? "hsl(45 70% 30%)"
                    : drawingFrom === n.id
                      ? "hsl(160 40% 28%)"
                      : "hsl(220 20% 18%)"
                }
                stroke="hsl(45 40% 60%)"
                strokeWidth="0.5"
              />
              <text
                x={n.x}
                y={n.y + 11}
                textAnchor="middle"
                fill="hsl(40 20% 85%)"
                fontSize="3"
              >
                {n.name.slice(0, 10)}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div className="flex flex-wrap gap-2 items-end">
        <label className="text-xs space-y-1">
          <span className="text-muted-foreground">From</span>
          <select
            className="block bg-background border border-border px-2 py-1.5 min-h-[36px]"
            value={linkFrom}
            onChange={(e) => setLinkFrom(e.target.value)}
          >
            {roomIds.map((id) => (
              <option key={id} value={id}>
                {doc.rooms[id]?.name || id}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs space-y-1">
          <span className="text-muted-foreground">To</span>
          <select
            className="block bg-background border border-border px-2 py-1.5 min-h-[36px]"
            value={linkTo}
            onChange={(e) => setLinkTo(e.target.value)}
          >
            {roomIds.map((id) => (
              <option key={id} value={id}>
                {doc.rooms[id]?.name || id}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="pixel-font text-[10px] min-h-[36px] px-2 border-2 border-accent text-accent"
          disabled={!linkTo || linkFrom === linkTo}
          onClick={() => addEdge(linkFrom, linkTo)}
        >
          Add exit
        </button>
        <button
          type="button"
          className="pixel-font text-[10px] min-h-[36px] px-2 border border-game-border"
          onClick={() => setDrawingFrom(null)}
        >
          Cancel draw
        </button>
      </div>

      {selectedLink && (
        <div className="border border-border/60 p-3 space-y-2 text-xs">
          <div className="flex justify-between gap-2">
            <span className="pixel-font text-[11px] text-accent">
              Exit {selectedLink.from} → {selectedLink.to}
            </span>
            <button
              type="button"
              className="text-destructive"
              onClick={() => {
                onChange(
                  removeLink(doc, selectedLink.from, selectedLink.to)
                );
                setSelected(null);
              }}
            >
              Delete
            </button>
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            <label className="space-y-1">
              <span className="text-muted-foreground">Require flag</span>
              <input
                className="w-full bg-background border border-border px-2 py-1.5"
                value={selectedLink.requireFlag || ""}
                onChange={(e) =>
                  patchLink({
                    requireFlag: e.target.value.trim() || undefined,
                  })
                }
                placeholder="guard_convinced"
              />
            </label>
            <label className="space-y-1">
              <span className="text-muted-foreground">Require item</span>
              <input
                className="w-full bg-background border border-border px-2 py-1.5"
                value={selectedLink.requireItem || ""}
                onChange={(e) =>
                  patchLink({
                    requireItem: e.target.value.trim() || undefined,
                  })
                }
                placeholder="brass_key"
              />
            </label>
            <label className="space-y-1 sm:col-span-2">
              <span className="text-muted-foreground">Blocked message</span>
              <input
                className="w-full bg-background border border-border px-2 py-1.5"
                value={selectedLink.blockedMessage || ""}
                onChange={(e) =>
                  patchLink({
                    blockedMessage: e.target.value.trim() || undefined,
                  })
                }
                placeholder="Why can't they leave yet?"
              />
            </label>
            <label className="space-y-1">
              <span className="text-muted-foreground">From label</span>
              <input
                className="w-full bg-background border border-border px-2 py-1.5"
                value={selectedLink.fromLabel}
                onChange={(e) => patchLink({ fromLabel: e.target.value })}
              />
            </label>
            <label className="space-y-1">
              <span className="text-muted-foreground">Direction</span>
              <select
                className="w-full bg-background border border-border px-2 py-1.5"
                value={selectedLink.direction || "east"}
                onChange={(e) => patchLink({ direction: e.target.value })}
              >
                {["north", "south", "east", "west", "up", "down", "in", "out"].map(
                  (d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  )
                )}
              </select>
            </label>
          </div>
        </div>
      )}
    </section>
  );
}
