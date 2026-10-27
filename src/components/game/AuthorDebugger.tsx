import { useMemo, useState } from "react";
import { useGame } from "@/contexts/GameContext";
import { useDebug } from "@/contexts/DebugContext";
import {
  buildPuzzleGraphFromGameDefinition,
  PUZZLE_NODE_KIND_ORDER,
  type PuzzleGraphNode,
  type PuzzleNodeKind,
} from "@/engine/puzzleGraph";
import { toast } from "@/hooks/use-toast";

const KIND_SHORT: Record<PuzzleNodeKind, string> = {
  room: "R",
  hotspot: "H",
  item: "I",
  flag: "F",
  exit: "E",
  region: "Rg",
  timer: "T",
  hint: "Hn",
};

/**
 * Author debugger — sentence/travel log + flag watch + read-only puzzle graph.
 */
export function AuthorDebugger() {
  const { debugMode, authoringAvailable } = useDebug();
  const { actionLog, gameState, sentenceLine, definition } = useGame();
  const [watch, setWatch] = useState("got_");
  const [open, setOpen] = useState(true);
  const [graphOpen, setGraphOpen] = useState(false);

  const watchedFlags = useMemo(() => {
    const prefix = watch.trim();
    return Object.entries(gameState.flags)
      .filter(([k, v]) => v && (!prefix || k.includes(prefix)))
      .slice(0, 24);
  }, [gameState.flags, watch]);

  const graph = useMemo(
    () => buildPuzzleGraphFromGameDefinition(definition, { maxNodes: 80, maxEdges: 160 }),
    [definition]
  );

  const softLockCount = useMemo(
    () => graph.nodes.filter((n) => n.softLock).length,
    [graph.nodes]
  );

  const nodesByKind = useMemo(() => {
    const map = new Map<PuzzleNodeKind, PuzzleGraphNode[]>();
    for (const k of PUZZLE_NODE_KIND_ORDER) map.set(k, []);
    for (const n of graph.nodes) {
      const list = map.get(n.kind) ?? [];
      list.push(n);
      map.set(n.kind, list);
    }
    return map;
  }, [graph.nodes]);

  const onNodeClick = (n: PuzzleGraphNode) => {
    const text = n.hotspotId || n.label || n.id;
    void navigator.clipboard.writeText(text).then(
      () => {
        toast({
          title: "Copied",
          description: text,
        });
      },
      () => {
        toast({
          title: n.kind,
          description: text,
        });
      }
    );
  };

  if (!authoringAvailable || !debugMode) return null;

  return (
    <div className="fixed bottom-2 right-2 z-[80] w-[min(100%,280px)] pointer-events-auto">
      <div className="border-2 border-game-border bg-game-ui/95 shadow-lg text-[11px]">
        <button
          type="button"
          className="w-full flex justify-between items-center px-2 py-1.5 pixel-font text-accent border-b border-game-border"
          onClick={() => setOpen((o) => !o)}
        >
          <span>Author debugger</span>
          <span>{open ? "−" : "+"}</span>
        </button>
        {open && (
          <div className="p-2 space-y-2 max-h-80 overflow-y-auto">
            <div>
              <div className="text-muted-foreground mb-0.5">Sentence</div>
              <div className="pixel-font text-foreground min-h-[1.25rem]">
                {sentenceLine || "—"}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground mb-0.5">Action log</div>
              <ul className="space-y-0.5 font-mono text-[10px] max-h-28 overflow-y-auto">
                {actionLog.length === 0 && (
                  <li className="text-muted-foreground">No actions yet</li>
                )}
                {[...actionLog].reverse().map((line, i) => (
                  <li key={`${i}-${line}`} className="text-foreground/90">
                    {line}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <label className="block text-muted-foreground mb-0.5">
                Flag watch
                <input
                  className="mt-0.5 w-full bg-background border border-border px-1.5 py-1"
                  value={watch}
                  onChange={(e) => setWatch(e.target.value)}
                  placeholder="filter…"
                />
              </label>
              <ul className="mt-1 space-y-0.5 font-mono text-[10px]">
                {watchedFlags.length === 0 && (
                  <li className="text-muted-foreground">No matching flags</li>
                )}
                {watchedFlags.map(([k]) => (
                  <li key={k} className="text-accent">
                    {k}
                  </li>
                ))}
              </ul>
            </div>
            <div className="text-muted-foreground">
              Room: {gameState.currentLocation} · Obj states:{" "}
              {Object.keys(gameState.objectStates ?? {}).length}
            </div>

            <div
              className="border-t border-game-border pt-2"
              data-testid="author-puzzle-graph"
            >
              <button
                type="button"
                className="w-full flex justify-between items-center pixel-font text-[10px] text-accent"
                onClick={() => setGraphOpen((o) => !o)}
              >
                <span>Puzzle graph</span>
                <span className="text-muted-foreground font-sans normal-case">
                  {graph.nodes.length}n · {graph.edges.length}e
                  {softLockCount > 0 ? ` · ${softLockCount} soft` : ""}{" "}
                  {graphOpen ? "−" : "+"}
                </span>
              </button>
              {graphOpen && (
                <div className="mt-1.5 space-y-1.5">
                  <p className="text-[9px] text-muted-foreground leading-snug">
                    Read-only from live pack. Soft-locks in red. Click copies
                    hotspot id / label.
                  </p>
                  <div className="max-h-36 overflow-y-auto space-y-1">
                    {PUZZLE_NODE_KIND_ORDER.map((kind) => {
                      const list = nodesByKind.get(kind) ?? [];
                      if (!list.length) return null;
                      return (
                        <div key={kind}>
                          <div className="text-[9px] text-muted-foreground uppercase tracking-wide">
                            {kind} ({list.length})
                          </div>
                          <ul className="space-y-0.5">
                            {list.slice(0, 12).map((n) => (
                              <li key={n.id}>
                                <button
                                  type="button"
                                  data-testid={`author-puzzle-node-${n.id}`}
                                  className={`w-full text-left font-mono text-[10px] px-1 py-0.5 truncate ${
                                    n.softLock
                                      ? "text-destructive bg-destructive/10"
                                      : "text-foreground/90 hover:bg-secondary/40"
                                  }`}
                                  title={n.id}
                                  onClick={() => onNodeClick(n)}
                                >
                                  <span className="opacity-60">
                                    {KIND_SHORT[kind]}
                                  </span>{" "}
                                  {n.label}
                                  {n.softLock ? " · never set" : ""}
                                </button>
                              </li>
                            ))}
                            {list.length > 12 && (
                              <li className="text-[9px] text-muted-foreground px-1">
                                +{list.length - 12} more
                              </li>
                            )}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
