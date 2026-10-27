import { useMemo, useState } from "react";
import type { JsonPackDocument, JsonPackLink } from "@/engine/jsonPack";
import { toast } from "@/hooks/use-toast";
import { removeLink, upsertLink } from "@/studio/packDraft";

const DIRECTIONS = [
  "north",
  "south",
  "east",
  "west",
  "up",
  "down",
  "in",
  "out",
] as const;

export interface PackLinksPanelProps {
  doc: JsonPackDocument;
  roomId: string;
  onChange: (doc: JsonPackDocument) => void;
  onSelectRoom: (id: string) => void;
}

/**
 * Room link graph + exit form — extracted from PackTool.
 */
export function PackLinksPanel({
  doc,
  roomId,
  onChange,
  onSelectRoom,
}: PackLinksPanelProps) {
  const [linkFrom, setLinkFrom] = useState("");
  const [linkTo, setLinkTo] = useState("");
  const [linkDir, setLinkDir] = useState<string>("east");
  const [linkFromLabel, setLinkFromLabel] = useState("");
  const [linkToLabel, setLinkToLabel] = useState("");
  const [linkFlag, setLinkFlag] = useState("");
  const [linkLockedLabel, setLinkLockedLabel] = useState("");
  const [linkShowWhenBlocked, setLinkShowWhenBlocked] = useState(true);
  const [linkItem, setLinkItem] = useState("");

  const roomIds = Object.keys(doc.rooms);

  const graphNodes = useMemo(() => {
    const n = roomIds.length || 1;
    return roomIds.map((id, i) => {
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      return {
        id,
        x: 50 + Math.cos(angle) * 34,
        y: 50 + Math.sin(angle) * 34,
      };
    });
  }, [roomIds]);

  const addLink = () => {
    const from = linkFrom || roomIds[0];
    const to = linkTo || roomIds[1];
    if (!from || !to || from === to) {
      toast({
        title: "Need two rooms",
        description: "Add another room before linking",
        variant: "destructive",
      });
      return;
    }
    const fromName = doc.rooms[from]?.name || from;
    const toName = doc.rooms[to]?.name || to;
    const gated = !!(linkFlag.trim() || linkItem.trim());
    const link: JsonPackLink = {
      from,
      to,
      direction: linkDir,
      fromLabel: linkFromLabel.trim() || toName,
      toLabel: linkToLabel.trim() || fromName,
      requireFlag: linkFlag.trim() || undefined,
      requireItem: linkItem.trim() || undefined,
      blockedMessage: gated ? "You can't go that way yet." : undefined,
      ...(gated
        ? {
            showWhenBlocked: linkShowWhenBlocked,
            lockedLabel: linkLockedLabel.trim() || undefined,
          }
        : {}),
    };
    onChange(upsertLink(doc, link));
    toast({ title: "Rooms linked", description: `${from} ↔ ${to}` });
  };

  return (
    <section className="border border-game-border bg-game-ui/90 p-4 space-y-3">
      <h3 className="pixel-font text-sm text-accent">Room links</h3>
      <p className="text-xs text-muted-foreground">
        Bidirectional exits via <code className="text-accent">linkRooms</code>
        . Optional flag gate on the forward direction.
      </p>
      <div className="relative w-full aspect-[4/3] border border-border bg-black/30 overflow-hidden">
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
          {(doc.links ?? []).map((l) => {
            const a = graphNodes.find((n) => n.id === l.from);
            const b = graphNodes.find((n) => n.id === l.to);
            if (!a || !b) return null;
            return (
              <line
                key={`${l.from}-${l.to}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="hsl(45 70% 55% / 0.7)"
                strokeWidth="0.6"
              />
            );
          })}
          {graphNodes.map((n) => (
            <g key={n.id}>
              <circle
                cx={n.x}
                cy={n.y}
                r="6"
                fill={
                  n.id === roomId ? "hsl(45 80% 45%)" : "hsl(220 20% 22%)"
                }
                stroke="hsl(45 40% 60%)"
                strokeWidth="0.4"
                className="cursor-pointer"
                onClick={() => onSelectRoom(n.id)}
              />
              <text
                x={n.x}
                y={n.y + 10}
                textAnchor="middle"
                fill="hsl(40 20% 80%)"
                fontSize="3.2"
              >
                {(doc.rooms[n.id]?.name || n.id).slice(0, 12)}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-xs space-y-1">
          <span className="text-muted-foreground">From</span>
          <select
            className="w-full bg-background border border-border px-2 py-2"
            value={linkFrom || roomIds[0] || ""}
            onChange={(e) => setLinkFrom(e.target.value)}
          >
            {roomIds.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs space-y-1">
          <span className="text-muted-foreground">To</span>
          <select
            className="w-full bg-background border border-border px-2 py-2"
            value={linkTo || roomIds[1] || roomIds[0] || ""}
            onChange={(e) => setLinkTo(e.target.value)}
          >
            {roomIds.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs space-y-1">
          <span className="text-muted-foreground">Direction</span>
          <select
            className="w-full bg-background border border-border px-2 py-2"
            value={linkDir}
            onChange={(e) => setLinkDir(e.target.value)}
          >
            {DIRECTIONS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs space-y-1">
          <span className="text-muted-foreground">Require flag</span>
          <input
            className="w-full bg-background border border-border px-2 py-2"
            value={linkFlag}
            onChange={(e) => setLinkFlag(e.target.value)}
            placeholder="got_key"
          />
        </label>
        <label className="block text-xs space-y-1">
          <span className="text-muted-foreground">Require item</span>
          <input
            className="w-full bg-background border border-border px-2 py-2"
            value={linkItem}
            onChange={(e) => setLinkItem(e.target.value)}
            placeholder="brass_key"
          />
        </label>
        <label className="block text-xs space-y-1">
          <span className="text-muted-foreground">
            Locked label (doorway while sealed)
          </span>
          <input
            className="w-full bg-background border border-border px-2 py-2"
            value={linkLockedLabel}
            onChange={(e) => setLinkLockedLabel(e.target.value)}
            placeholder="Sealed tunnel"
            disabled={!linkFlag.trim() && !linkItem.trim()}
          />
        </label>
        <label className="flex items-center gap-2 text-xs col-span-full">
          <input
            type="checkbox"
            checked={linkShowWhenBlocked}
            disabled={!linkFlag.trim() && !linkItem.trim()}
            onChange={(e) => setLinkShowWhenBlocked(e.target.checked)}
          />
          Show exit while locked (see the doorway, can’t enter yet)
        </label>
        <label className="block text-xs space-y-1">
          <span className="text-muted-foreground">From label</span>
          <input
            className="w-full bg-background border border-border px-2 py-2"
            value={linkFromLabel}
            onChange={(e) => setLinkFromLabel(e.target.value)}
            placeholder="To Kitchen"
          />
        </label>
        <label className="block text-xs space-y-1">
          <span className="text-muted-foreground">Back label</span>
          <input
            className="w-full bg-background border border-border px-2 py-2"
            value={linkToLabel}
            onChange={(e) => setLinkToLabel(e.target.value)}
            placeholder="Back"
          />
        </label>
      </div>
      <button
        type="button"
        onClick={addLink}
        className="pixel-font text-xs min-h-[40px] px-3 border-2 border-accent text-accent"
      >
        Link rooms
      </button>
      <ul className="text-xs space-y-1 max-h-28 overflow-y-auto">
        {(doc.links ?? []).map((l) => (
          <li
            key={`${l.from}-${l.to}`}
            className="flex justify-between border border-border/60 px-2 py-1"
          >
            <span>
              {l.from} → {l.to}{" "}
              <span className="text-muted-foreground">({l.direction})</span>
              {l.requireFlag ? ` · flag:${l.requireFlag}` : ""}
              {l.requireItem ? ` · item:${l.requireItem}` : ""}
              {l.lockedLabel ? ` · “${l.lockedLabel}”` : ""}
              {l.showWhenBlocked === false ? " · hidden when locked" : ""}
            </span>
            <button
              type="button"
              className="text-destructive"
              onClick={() => onChange(removeLink(doc, l.from, l.to))}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
