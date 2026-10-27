import type { JsonPackDialogue } from "@/engine/jsonPack";

export interface DialogueGraphEditorProps {
  lines: JsonPackDialogue["lines"];
  focusId: string | null;
  onSelect: (id: string) => void;
  onAddLinkedLine?: (fromId: string) => void;
}

/**
 * Visual talk tree — nodes + edges; broken nextIds highlighted.
 */
export function DialogueGraphEditor({
  lines,
  focusId,
  onSelect,
  onAddLinkedLine,
}: DialogueGraphEditorProps) {
  const ids = new Set(lines.map((l) => l.id));
  const n = Math.max(lines.length, 1);
  const nodes = lines.map((line, i) => {
    // Left-to-right columns with slight vertical stagger
    const col = i % 4;
    const row = Math.floor(i / 4);
    return {
      id: line.id,
      x: 14 + col * 22,
      y: 22 + row * 28,
      label: line.id.slice(0, 12),
      preview: line.text.slice(0, 18),
    };
  });

  const edges: Array<{
    from: string;
    to: string;
    label: string;
    broken: boolean;
  }> = [];
  for (const line of lines) {
    for (const c of line.choices ?? []) {
      const raw = c.nextId?.trim() || "END";
      const broken = raw !== "END" && !ids.has(raw);
      edges.push({
        from: line.id,
        to: raw,
        label: (c.text || "…").slice(0, 14),
        broken,
      });
    }
    if (!(line.choices ?? []).length) {
      const idx = lines.findIndex((l) => l.id === line.id);
      const next = lines[idx + 1];
      if (next) {
        edges.push({
          from: line.id,
          to: next.id,
          label: "…",
          broken: false,
        });
      }
    }
  }

  const endNode = { x: 92, y: 88 };
  const pos = (id: string) =>
    id === "END" ? endNode : nodes.find((n) => n.id === id);

  return (
    <div className="space-y-1">
      <div className="relative w-full aspect-[2/1] border border-border bg-black/30 overflow-hidden">
        <p className="absolute top-1 left-2 text-[9px] text-muted-foreground z-10">
          Dialogue graph · click a node to edit
        </p>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
          <defs>
            <marker
              id="dlg-arrow"
              markerWidth="4"
              markerHeight="4"
              refX="3"
              refY="2"
              orient="auto"
            >
              <path d="M0,0 L4,2 L0,4 Z" fill="hsl(45 50% 55%)" />
            </marker>
            <marker
              id="dlg-arrow-bad"
              markerWidth="4"
              markerHeight="4"
              refX="3"
              refY="2"
              orient="auto"
            >
              <path d="M0,0 L4,2 L0,4 Z" fill="hsl(0 70% 55%)" />
            </marker>
          </defs>
          {edges.map((e, i) => {
            const a = pos(e.from);
            const b = pos(e.to);
            if (!a || !b) {
              // broken: draw to a red X
              const from = pos(e.from);
              if (!from) return null;
              return (
                <g key={`${e.from}-${e.to}-${i}`}>
                  <line
                    x1={from.x}
                    y1={from.y}
                    x2={from.x + 12}
                    y2={from.y - 10}
                    stroke="hsl(0 70% 50%)"
                    strokeWidth="0.6"
                    strokeDasharray="1.5 1"
                    markerEnd="url(#dlg-arrow-bad)"
                  />
                  <text
                    x={from.x + 14}
                    y={from.y - 11}
                    fill="hsl(0 70% 60%)"
                    fontSize="2.5"
                  >
                    missing:{e.to}
                  </text>
                </g>
              );
            }
            return (
              <g key={`${e.from}-${e.to}-${i}`}>
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={
                    e.broken ? "hsl(0 70% 50%)" : "hsl(45 50% 50% / 0.55)"
                  }
                  strokeWidth="0.5"
                  strokeDasharray={e.broken ? "1.5 1" : undefined}
                  markerEnd={
                    e.broken ? "url(#dlg-arrow-bad)" : "url(#dlg-arrow)"
                  }
                />
              </g>
            );
          })}
          {nodes.map((node) => (
            <g
              key={node.id}
              className="cursor-pointer"
              onClick={() => onSelect(node.id)}
            >
              <rect
                x={node.x - 8}
                y={node.y - 5}
                width="16"
                height="10"
                rx="1"
                fill={
                  node.id === focusId ? "hsl(45 80% 35%)" : "hsl(220 20% 18%)"
                }
                stroke="hsl(45 40% 60%)"
                strokeWidth="0.4"
              />
              <text
                x={node.x}
                y={node.y - 0.5}
                textAnchor="middle"
                fill="hsl(40 20% 90%)"
                fontSize="2.4"
              >
                {node.label}
              </text>
              <text
                x={node.x}
                y={node.y + 3}
                textAnchor="middle"
                fill="hsl(40 10% 70%)"
                fontSize="1.8"
              >
                {node.preview}
              </text>
            </g>
          ))}
          <rect
            x={endNode.x - 6}
            y={endNode.y - 4}
            width="12"
            height="8"
            rx="1"
            fill="hsl(0 40% 22%)"
            stroke="hsl(0 60% 55%)"
            strokeWidth="0.4"
          />
          <text
            x={endNode.x}
            y={endNode.y + 1}
            textAnchor="middle"
            fill="hsl(0 60% 70%)"
            fontSize="3"
          >
            END
          </text>
        </svg>
      </div>
      {focusId && onAddLinkedLine && (
        <button
          type="button"
          className="pixel-font text-[10px] min-h-[32px] px-2 border border-game-border"
          onClick={() => onAddLinkedLine(focusId)}
        >
          Add line linked from {focusId}
        </button>
      )}
      {n === 0 && (
        <p className="text-[10px] text-muted-foreground">No lines yet.</p>
      )}
    </div>
  );
}
