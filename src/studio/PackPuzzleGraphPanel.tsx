/**
 * Studio puzzle dependency graph — columns by node kind + light gated-link edit.
 */

import { useMemo, useState } from "react";
import type { JsonPackDocument } from "@/engine/jsonPack";
import {
  blockedGatePathEdgeIds,
  buildPuzzleGraph,
  gatedExitsForSoftLockFlag,
  PUZZLE_NODE_KIND_ORDER,
  type PuzzleGraphNode,
  type PuzzleNodeKind,
} from "@/engine/puzzleGraph";
import { applyLockedExitKit } from "@/authoring/puzzleKits";
import { applyUnlockChain } from "@/authoring/unlockChain";
import { upsertLink } from "@/studio/packDraft";
import { toastFail, toastOk } from "@/studio/toastError";

export interface PackPuzzleGraphPanelProps {
  doc: JsonPackDocument;
  onChange: (doc: JsonPackDocument) => void;
  onFocusRoom?: (roomId: string) => void;
  onFocusHotspot?: (roomId: string, hotspotId: string) => void;
}

const KIND_LABEL: Record<PuzzleNodeKind, string> = {
  room: "Rooms",
  hotspot: "Hotspots",
  item: "Items",
  flag: "Flags",
  exit: "Exits",
  region: "Regions",
  timer: "Timers",
  hint: "Hints",
};

const KIND_TINT: Record<PuzzleNodeKind, string> = {
  room: "border-primary/40",
  hotspot: "border-accent/40",
  item: "border-emerald-600/40",
  flag: "border-amber-600/40",
  exit: "border-sky-600/40",
  region: "border-violet-600/40",
  timer: "border-orange-600/40",
  hint: "border-pink-600/40",
};

/**
 * Read-only graph viz (columns by type) + light edit: gated exit edge,
 * suggest unlock via locked-exit kit / unlock chain.
 */
export function PackPuzzleGraphPanel({
  doc,
  onChange,
  onFocusRoom,
  onFocusHotspot,
}: PackPuzzleGraphPanelProps) {
  const graph = useMemo(() => buildPuzzleGraph(doc), [doc]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showEdit, setShowEdit] = useState(false);

  const roomIds = Object.keys(doc.rooms);
  const [fromRoom, setFromRoom] = useState(doc.startRoom);
  const [toRoom, setToRoom] = useState(
    roomIds.find((id) => id !== doc.startRoom) || ""
  );
  const [requireFlag, setRequireFlag] = useState("path_open");

  const byKind = useMemo(() => {
    const map = new Map<PuzzleNodeKind, PuzzleGraphNode[]>();
    for (const k of PUZZLE_NODE_KIND_ORDER) map.set(k, []);
    for (const n of graph.nodes) {
      const list = map.get(n.kind) ?? [];
      list.push(n);
      map.set(n.kind, list);
    }
    return map;
  }, [graph.nodes]);

  const selected = graph.nodes.find((n) => n.id === selectedId) ?? null;
  const softLockCount = graph.nodes.filter((n) => n.softLock).length;

  /** Highlight edges on soft-lock → gated-exit paths (selected soft flag, or all). */
  const blockedPathEdges = useMemo(() => {
    const ids = new Set<string>();
    const flags =
      selected?.kind === "flag" && selected.softLock
        ? [selected.label]
        : graph.nodes.filter((n) => n.softLock).map((n) => n.label);
    for (const flag of flags) {
      for (const id of blockedGatePathEdgeIds(graph, flag)) ids.add(id);
    }
    return ids;
  }, [graph, selected]);

  const focusNode = (n: PuzzleGraphNode) => {
    setSelectedId(n.id);
    if (n.roomId && n.hotspotId) {
      onFocusHotspot?.(n.roomId, n.hotspotId);
    } else if (n.roomId) {
      onFocusRoom?.(n.roomId);
    } else if (n.kind === "room") {
      const roomId = n.id.replace(/^room:/, "");
      onFocusRoom?.(roomId);
    } else if (n.kind === "exit") {
      const m = /^exit:([^→]+)→/.exec(n.id);
      if (m?.[1]) onFocusRoom?.(m[1]);
    }
  };

  const relatedEdges = selected
    ? graph.edges.filter(
        (e) => e.from === selected.id || e.to === selected.id
      )
    : [];

  const addGatedLink = () => {
    if (!toRoom || fromRoom === toRoom || !doc.rooms[toRoom]) {
      toastFail("Pick two different rooms");
      return;
    }
    const flag = requireFlag.trim();
    if (!flag) {
      toastFail("Require flag is empty");
      return;
    }
    const next = upsertLink(doc, {
      from: fromRoom,
      to: toRoom,
      direction: "east",
      fromLabel: doc.rooms[toRoom]?.name || toRoom,
      toLabel: doc.rooms[fromRoom]?.name || fromRoom,
      requireFlag: flag,
      blockedMessage: `Need ${flag} before you can go this way.`,
    });
    onChange({
      ...next,
      initialFlags: {
        ...(next.initialFlags ?? {}),
        [flag]: next.initialFlags?.[flag] ?? false,
      },
    });
    toastOk("Gated exit added", `${fromRoom} → ${toRoom} needs ${flag}`);
  };

  const suggestUnlock = (mode: "locked-exit" | "unlock-chain") => {
    if (!toRoom || fromRoom === toRoom || !doc.rooms[toRoom]) {
      toastFail("Pick from-room and to-room first");
      return;
    }
    const flag = requireFlag.trim() || "path_open";
    if (mode === "locked-exit") {
      const next = applyLockedExitKit(doc, {
        from: fromRoom,
        to: toRoom,
        requireFlag: flag,
        fromLabel: doc.rooms[toRoom]?.name || toRoom,
        toLabel: doc.rooms[fromRoom]?.name || fromRoom,
        blockedMessage: `Need ${flag} before you can go this way.`,
      });
      onChange(next);
      toastOk("Suggest unlock applied", `locked-exit kit: ${fromRoom} → ${toRoom} (${flag})`);
      return;
    }
    const result = applyUnlockChain(doc, {
      flag,
      source: "pickup",
      roomId: fromRoom,
      itemName: "Key",
      target: "exit",
      exitTo: toRoom,
      blockedMessage: `Need ${flag} before you can go this way.`,
    });
    onChange(result.doc);
    toastOk("Suggest unlock applied", result.message);
  };

  /**
   * One-click soft-lock fix: unlock-chain (pickup → flag) wired to the
   * gated exit that reads this never-set flag. Falls back to locked-exit
   * kit when rooms exist but chain wiring is partial.
   */
  const fixSoftLock = (n: PuzzleGraphNode) => {
    if (n.kind !== "flag" || !n.softLock) return;
    const flag = n.label.trim();
    if (!flag) return;

    const gated = gatedExitsForSoftLockFlag(graph, flag);
    const primary = gated[0];
    const roomId =
      (primary && doc.rooms[primary.from] && primary.from) ||
      doc.startRoom;
    const exitTo =
      primary && doc.rooms[primary.to] ? primary.to : undefined;

    if (exitTo) {
      const result = applyUnlockChain(doc, {
        flag,
        source: "pickup",
        roomId,
        itemName: "Key",
        target: "exit",
        exitTo,
        blockedMessage: `Need ${flag} before you can go this way.`,
      });
      onChange(result.doc);
      toastOk("Soft-lock fixed", result.message);
      return;
    }

    // No gated exit on the graph — still drop a pickup that sets the flag.
    const result = applyUnlockChain(doc, {
      flag,
      source: "pickup",
      roomId,
      itemName: "Key",
      target: "none",
    });
    onChange(result.doc);
    toastOk("Soft-lock fixed", result.message);
  };

  return (
    <section
      id="pack-puzzle-graph"
      className="border border-game-border bg-game-ui/90 p-4 space-y-3"
      data-testid="pack-puzzle-graph"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="pixel-font text-sm text-accent">Puzzle graph</h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Dependency view: pickups, use-with, flags, gated exits, hints,
            timers, regions. Soft-lock flags (never set) show in red — use{" "}
            <span className="text-destructive">Fix this</span> for a one-click
            unlock chain. Blocked gate paths highlight when a soft-lock is
            selected. Tap a node to focus its room/hotspot.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[10px]">
          <span className="pixel-font text-muted-foreground">
            {graph.nodes.length} nodes · {graph.edges.length} edges
            {graph.truncated ? " · truncated" : ""}
            {softLockCount > 0 ? ` · ${softLockCount} soft-lock` : ""}
          </span>
          <button
            type="button"
            className="pixel-font min-h-[36px] px-2 border-2 border-accent text-accent"
            onClick={() => setShowEdit((o) => !o)}
          >
            {showEdit ? "Hide edit" : "Edit edges"}
          </button>
        </div>
      </div>

      <div
        className="overflow-x-auto -mx-1 px-1 pb-1"
        data-testid="puzzle-graph-scroll"
      >
        <div className="flex gap-2 min-w-min">
          {PUZZLE_NODE_KIND_ORDER.map((kind) => {
            const list = byKind.get(kind) ?? [];
            if (list.length === 0) return null;
            return (
              <div
                key={kind}
                className={`shrink-0 w-[140px] sm:w-[160px] border ${KIND_TINT[kind]} bg-black/20`}
              >
                <div className="pixel-font text-[10px] px-2 py-1.5 border-b border-border/50 text-muted-foreground sticky top-0 bg-game-ui/95">
                  {KIND_LABEL[kind]}{" "}
                  <span className="opacity-70">({list.length})</span>
                </div>
                <ul className="max-h-56 overflow-y-auto p-1 space-y-0.5">
                  {list.map((n) => {
                    const active = n.id === selectedId;
                    const soft = !!n.softLock;
                    return (
                      <li key={n.id}>
                        <button
                          type="button"
                          data-testid={`puzzle-node-${n.id}`}
                          onClick={() => focusNode(n)}
                          className={`w-full text-left text-[11px] px-1.5 py-1 leading-snug border transition-colors ${
                            soft
                              ? "border-destructive/70 text-destructive bg-destructive/10"
                              : active
                                ? "border-accent bg-accent/10 text-foreground"
                                : "border-transparent hover:bg-secondary/30 text-foreground/90"
                          }`}
                          title={n.id}
                        >
                          <span className="line-clamp-2">{n.label}</span>
                          {soft && (
                            <span className="block text-[9px] uppercase tracking-wide mt-0.5">
                              never set
                            </span>
                          )}
                        </button>
                        {soft && n.kind === "flag" && (
                          <button
                            type="button"
                            data-testid={`puzzle-fix-${n.id}`}
                            className="mt-0.5 w-full pixel-font text-[9px] min-h-[28px] px-1 border border-destructive/50 text-destructive hover:bg-destructive/15"
                            onClick={(e) => {
                              e.stopPropagation();
                              fixSoftLock(n);
                            }}
                          >
                            Fix this
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      {selected && (
        <div className="border border-border/60 px-3 py-2 text-xs space-y-1">
          <div className="flex flex-wrap justify-between gap-2">
            <span className="pixel-font text-[11px] text-accent">
              {selected.kind}: {selected.label}
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">
              {selected.id}
            </span>
          </div>
          {relatedEdges.length === 0 ? (
            <p className="text-muted-foreground">No edges on this node.</p>
          ) : (
            <ul className="space-y-0.5 max-h-28 overflow-y-auto">
              {relatedEdges.slice(0, 24).map((e) => {
                const onBlockedPath = blockedPathEdges.has(e.id);
                return (
                  <li
                    key={e.id}
                    className={`text-[11px] ${
                      onBlockedPath
                        ? "text-destructive font-medium"
                        : "text-muted-foreground"
                    }`}
                    data-blocked-path={onBlockedPath ? "true" : undefined}
                  >
                    <span
                      className={
                        onBlockedPath
                          ? "text-destructive"
                          : "text-foreground/80"
                      }
                    >
                      {e.kind}
                    </span>
                    {onBlockedPath ? " · blocked path" : ""}
                    {": "}
                    {e.from === selected.id ? "→ " : "← "}
                    <button
                      type="button"
                      className="underline text-primary"
                      onClick={() => {
                        const otherId =
                          e.from === selected.id ? e.to : e.from;
                        const other = graph.nodes.find(
                          (n) => n.id === otherId
                        );
                        if (other) focusNode(other);
                      }}
                    >
                      {e.from === selected.id ? e.to : e.from}
                    </button>
                    {e.label ? ` (${e.label})` : ""}
                  </li>
                );
              })}
            </ul>
          )}
          {selected.softLock && selected.kind === "flag" && (
            <button
              type="button"
              data-testid="puzzle-fix-selected"
              className="pixel-font text-[10px] min-h-[32px] px-2 border-2 border-destructive text-destructive"
              onClick={() => fixSoftLock(selected)}
            >
              Fix this
            </button>
          )}
        </div>
      )}

      {showEdit && (
        <div
          className="border border-accent/30 px-3 py-3 space-y-3"
          data-testid="puzzle-graph-edit"
        >
          <h4 className="pixel-font text-[11px] text-accent">
            Add gated exit edge
          </h4>
          <div className="flex flex-wrap gap-2 items-end">
            <label className="text-xs space-y-1">
              <span className="text-muted-foreground">From room</span>
              <select
                className="block bg-background border border-border px-2 py-1.5 min-h-[36px]"
                value={fromRoom}
                onChange={(e) => setFromRoom(e.target.value)}
              >
                {roomIds.map((id) => (
                  <option key={id} value={id}>
                    {doc.rooms[id]?.name || id}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs space-y-1">
              <span className="text-muted-foreground">To room</span>
              <select
                className="block bg-background border border-border px-2 py-1.5 min-h-[36px]"
                value={toRoom}
                onChange={(e) => setToRoom(e.target.value)}
              >
                {roomIds.map((id) => (
                  <option key={id} value={id}>
                    {doc.rooms[id]?.name || id}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs space-y-1">
              <span className="text-muted-foreground">Require flag</span>
              <input
                className="block bg-background border border-border px-2 py-1.5 min-h-[36px] min-w-[140px]"
                value={requireFlag}
                onChange={(e) => setRequireFlag(e.target.value)}
                placeholder="path_open"
              />
            </label>
            <button
              type="button"
              className="pixel-font text-[10px] min-h-[36px] px-2 border-2 border-accent text-accent"
              onClick={addGatedLink}
            >
              Add gated link
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="pixel-font text-[10px] min-h-[36px] px-2 border border-game-border"
              onClick={() => suggestUnlock("locked-exit")}
            >
              Suggest unlock (locked-exit kit)
            </button>
            <button
              type="button"
              className="pixel-font text-[10px] min-h-[36px] px-2 border border-game-border"
              onClick={() => suggestUnlock("unlock-chain")}
            >
              Suggest unlock (pickup → exit chain)
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Locked-exit only gates the link. Unlock-chain also drops a pickup
            that sets the flag (same helpers as Unlock chain wizard).
          </p>
        </div>
      )}
    </section>
  );
}
