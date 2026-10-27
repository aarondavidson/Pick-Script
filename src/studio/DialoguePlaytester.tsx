import { useMemo, useState } from "react";
import type { JsonPackDialogue, JsonPackHotspot } from "@/engine/jsonPack";

export interface DialoguePlaytesterProps {
  hotspot: JsonPackHotspot | null;
  /** Exit labels that read flags (for consequence hints) */
  exitGates?: Array<{ flag: string; label: string }>;
}

/**
 * Click through a talk tree without walking the room — shows flags flipping.
 */
export function DialoguePlaytester({
  hotspot,
  exitGates = [],
}: DialoguePlaytesterProps) {
  const dialogue: JsonPackDialogue | null = hotspot?.dialogue ?? null;
  const lines = dialogue?.lines ?? [];
  const [lineId, setLineId] = useState<string | null>(null);
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [log, setLog] = useState<string[]>([]);
  const [inventory, setInventory] = useState<string[]>([]);

  const startId = lines[0]?.id ?? null;
  const currentId = lineId ?? startId;
  const current = lines.find((l) => l.id === currentId) ?? null;

  const unlockedExits = useMemo(
    () =>
      exitGates.filter((g) => flags[g.flag]).map((g) => g.label),
    [exitGates, flags]
  );

  if (!hotspot || hotspot.kind !== "character") {
    return (
      <div className="border border-border/50 px-2 py-2 text-[11px] text-muted-foreground">
        Select a character hotspot to playtest dialogue.
      </div>
    );
  }

  if (!lines.length) {
    return (
      <div className="border border-border/50 px-2 py-2 text-[11px] text-muted-foreground">
        No dialogue lines — add a starter line first.
      </div>
    );
  }

  const reset = () => {
    setLineId(startId);
    setFlags({});
    setInventory([]);
    setLog(["Session reset"]);
  };

  const pick = (choice: NonNullable<(typeof lines)[0]["choices"]>[number]) => {
    const nextFlags = { ...flags };
    if (choice.setFlag) nextFlags[choice.setFlag] = true;
    if (choice.clearFlag) nextFlags[choice.clearFlag] = false;
    let nextInv = [...inventory];
    if (choice.giveItemId && !nextInv.includes(choice.giveItemId)) {
      nextInv = [...nextInv, choice.giveItemId];
    }
    setFlags(nextFlags);
    setInventory(nextInv);
    const parts = [`Chose “${choice.text}”`];
    if (choice.setFlag) parts.push(`set ${choice.setFlag}`);
    if (choice.clearFlag) parts.push(`clear ${choice.clearFlag}`);
    if (choice.giveItemId) parts.push(`+${choice.giveItemId}`);
    setLog((prev) => [...prev, parts.join(" · ")]);
    const next = choice.nextId?.trim() || "END";
    if (next === "END") {
      setLineId(null);
      setLog((prev) => [...prev, "END"]);
    } else {
      setLineId(next);
    }
  };

  const visibleChoices = (current?.choices ?? []).filter((c) => {
    if (!c.requireFlag) return true;
    return !!flags[c.requireFlag];
  });

  return (
    <div className="border border-accent/40 bg-black/20 p-3 space-y-2 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="pixel-font text-[10px] text-accent">
          Dialogue playtester — {hotspot.name}
        </span>
        <button
          type="button"
          className="pixel-font text-[9px] min-h-[28px] px-2 border border-game-border"
          onClick={reset}
        >
          Reset
        </button>
      </div>
      {current ? (
        <>
          <p className="text-foreground leading-relaxed">
            <span className="text-muted-foreground">
              {dialogue?.speaker || hotspot.name}:
            </span>{" "}
            {current.text}
          </p>
          <ul className="space-y-1">
            {visibleChoices.map((c, i) => (
              <li key={i}>
                <button
                  type="button"
                  className="w-full text-left border border-game-border px-2 py-1.5 min-h-[36px] hover:bg-accent/10"
                  onClick={() => pick(c)}
                >
                  → {c.text}
                  {c.setFlag ? (
                    <span className="text-accent"> · set {c.setFlag}</span>
                  ) : null}
                  {c.giveItemId ? (
                    <span className="text-primary"> · +{c.giveItemId}</span>
                  ) : null}
                </button>
              </li>
            ))}
            {!visibleChoices.length && (
              <li className="text-muted-foreground">No visible choices.</li>
            )}
          </ul>
        </>
      ) : (
        <p className="text-muted-foreground">Conversation ended. Reset to replay.</p>
      )}
      <div className="text-[10px] text-muted-foreground space-y-0.5">
        <div>
          Flags:{" "}
          {Object.keys(flags).filter((k) => flags[k]).join(", ") || "(none)"}
        </div>
        <div>Inventory: {inventory.join(", ") || "(empty)"}</div>
        {unlockedExits.length > 0 && (
          <div className="text-primary">
            Unlocks: {unlockedExits.join(", ")}
          </div>
        )}
      </div>
      <ul className="max-h-20 overflow-y-auto text-[10px] text-muted-foreground">
        {log.slice(-8).map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    </div>
  );
}
