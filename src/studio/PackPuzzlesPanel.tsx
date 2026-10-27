import { useMemo, useState } from "react";
import { combinationKey, suggestId } from "@/authoring/codegen";
import type {
  JsonPackDocument,
  JsonPackHotspot,
  JsonPackUseWithRule,
} from "@/engine/jsonPack";
import { toast } from "@/hooks/use-toast";

export interface PackPuzzlesPanelProps {
  doc: JsonPackDocument;
  roomId: string;
  onChange: (doc: JsonPackDocument) => void;
}

/**
 * Declarative use-with rules + inventory combinations for the Pack draft.
 */
export function PackPuzzlesPanel({
  doc,
  roomId,
  onChange,
}: PackPuzzlesPanelProps) {
  const room = doc.rooms[roomId];
  const targets = useMemo(
    () =>
      (room?.hotspots ?? []).filter(
        (h) =>
          h.kind === "use-with-target" || (h.useWith && h.useWith.length > 0)
      ),
    [room]
  );

  const [targetId, setTargetId] = useState("");
  const [ruleItem, setRuleItem] = useState("key");
  const [ruleMsg, setRuleMsg] = useState("It works!");
  const [ruleFlag, setRuleFlag] = useState("puzzle_done");
  const [ruleConsume, setRuleConsume] = useState(true);
  const [giveId, setGiveId] = useState("");
  const [giveName, setGiveName] = useState("");

  const [combA, setCombA] = useState("item_a");
  const [combB, setCombB] = useState("item_b");
  const [combResultId, setCombResultId] = useState("item_c");
  const [combResultName, setCombResultName] = useState("Combined item");
  const [combMsg, setCombMsg] = useState("You combine them.");

  const effectiveTarget =
    targetId || targets[0]?.id || room?.hotspots?.[0]?.id || "";

  const patchHotspot = (hotspotId: string, patch: Partial<JsonPackHotspot>) => {
    if (!room) return;
    const hotspots = (room.hotspots ?? []).map((h) =>
      h.id === hotspotId ? { ...h, ...patch } : h
    );
    onChange({
      ...doc,
      rooms: {
        ...doc.rooms,
        [roomId]: { ...room, hotspots },
      },
    });
  };

  const addUseWithRule = () => {
    if (!room || !effectiveTarget) {
      toast({
        title: "Need a hotspot",
        description: "Draw a use-with target first",
        variant: "destructive",
      });
      return;
    }
    const hs = room.hotspots?.find((h) => h.id === effectiveTarget);
    if (!hs) return;
    const itemId = suggestId(ruleItem, "item");
    const rule: JsonPackUseWithRule = {
      itemId,
      message: ruleMsg.trim() || "It works!",
      setFlag: ruleFlag.trim() || undefined,
      alreadyFlag: ruleFlag.trim() || undefined,
      alreadyMessage: "You already did that.",
      consumeItem: ruleConsume,
      giveItem: giveId.trim()
        ? {
            id: suggestId(giveId, "loot"),
            name: giveName.trim() || giveId,
            description: giveName.trim() || giveId,
          }
        : undefined,
    };
    const useWith = [
      ...(hs.useWith ?? []).filter((r) => r.itemId !== itemId),
      rule,
    ];
    patchHotspot(effectiveTarget, {
      kind: hs.kind === "pickup" ? hs.kind : "use-with-target",
      useWith,
    });
    toast({
      title: "Use-with rule added",
      description: `${itemId} → ${effectiveTarget}`,
    });
  };

  const addCombination = () => {
    const a = suggestId(combA, "a");
    const b = suggestId(combB, "b");
    const resultId = suggestId(combResultId, "result");
    const key = combinationKey(a, b);
    onChange({
      ...doc,
      combinations: {
        ...(doc.combinations ?? {}),
        [key]: {
          items: [a, b],
          result: {
            id: resultId,
            name: combResultName.trim() || resultId,
            description: combResultName.trim() || resultId,
          },
          successMessage: combMsg.trim() || undefined,
        },
      },
    });
    toast({ title: "Combination added", description: key });
  };

  const combos = Object.entries(doc.combinations ?? {});

  return (
    <section className="border border-game-border bg-game-ui/90 p-4 space-y-4">
      <div>
        <h3 className="pixel-font text-sm text-accent">Puzzles</h3>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          Declarative use-with (item → hotspot) and inventory A+B recipes — no
          TypeScript required.
        </p>
      </div>

      <div className="space-y-2 border border-border/60 p-3">
        <h4 className="pixel-font text-[11px] text-accent">Use-with rule</h4>
        <div className="grid sm:grid-cols-2 gap-2">
          <label className="block text-xs space-y-1">
            <span className="text-muted-foreground">Target hotspot</span>
            <select
              className="w-full bg-background border border-border px-2 py-2 min-h-[40px]"
              value={effectiveTarget}
              onChange={(e) => setTargetId(e.target.value)}
            >
              {(room?.hotspots ?? []).map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} ({h.id})
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs space-y-1">
            <span className="text-muted-foreground">Item id</span>
            <input
              className="w-full bg-background border border-border px-2 py-2 min-h-[40px]"
              value={ruleItem}
              onChange={(e) => setRuleItem(e.target.value)}
            />
          </label>
          <label className="block text-xs space-y-1 sm:col-span-2">
            <span className="text-muted-foreground">Success message</span>
            <input
              className="w-full bg-background border border-border px-2 py-2 min-h-[40px]"
              value={ruleMsg}
              onChange={(e) => setRuleMsg(e.target.value)}
            />
          </label>
          <label className="block text-xs space-y-1">
            <span className="text-muted-foreground">Set flag</span>
            <input
              className="w-full bg-background border border-border px-2 py-2 min-h-[40px]"
              value={ruleFlag}
              onChange={(e) => setRuleFlag(e.target.value)}
              placeholder="chest_open"
            />
          </label>
          <label className="flex items-center gap-2 text-xs pt-6">
            <input
              type="checkbox"
              checked={ruleConsume}
              onChange={(e) => setRuleConsume(e.target.checked)}
            />
            Consume item
          </label>
          <label className="block text-xs space-y-1">
            <span className="text-muted-foreground">Give item id (optional)</span>
            <input
              className="w-full bg-background border border-border px-2 py-2 min-h-[40px]"
              value={giveId}
              onChange={(e) => setGiveId(e.target.value)}
            />
          </label>
          <label className="block text-xs space-y-1">
            <span className="text-muted-foreground">Give item name</span>
            <input
              className="w-full bg-background border border-border px-2 py-2 min-h-[40px]"
              value={giveName}
              onChange={(e) => setGiveName(e.target.value)}
            />
          </label>
        </div>
        <button
          type="button"
          onClick={addUseWithRule}
          className="pixel-font text-xs min-h-[40px] px-3 border-2 border-accent text-accent"
        >
          Add use-with rule
        </button>
        <ul className="text-xs space-y-1 max-h-28 overflow-y-auto">
          {(room?.hotspots ?? []).flatMap((h) =>
            (h.useWith ?? []).map((r) => (
              <li
                key={`${h.id}-${r.itemId}`}
                className="flex justify-between border border-border/50 px-2 py-1"
              >
                <span>
                  {r.itemId} → {h.id}
                  {r.setFlag ? ` · flag:${r.setFlag}` : ""}
                  {r.giveItem ? ` · +${r.giveItem.id}` : ""}
                </span>
                <button
                  type="button"
                  className="text-destructive"
                  onClick={() =>
                    patchHotspot(h.id, {
                      useWith: (h.useWith ?? []).filter(
                        (x) => x.itemId !== r.itemId
                      ),
                    })
                  }
                >
                  ✕
                </button>
              </li>
            ))
          )}
        </ul>
      </div>

      <div className="space-y-2 border border-border/60 p-3">
        <h4 className="pixel-font text-[11px] text-accent">
          Inventory combine
        </h4>
        <div className="grid sm:grid-cols-2 gap-2">
          <label className="block text-xs space-y-1">
            <span className="text-muted-foreground">Item A</span>
            <input
              className="w-full bg-background border border-border px-2 py-2 min-h-[40px]"
              value={combA}
              onChange={(e) => setCombA(e.target.value)}
            />
          </label>
          <label className="block text-xs space-y-1">
            <span className="text-muted-foreground">Item B</span>
            <input
              className="w-full bg-background border border-border px-2 py-2 min-h-[40px]"
              value={combB}
              onChange={(e) => setCombB(e.target.value)}
            />
          </label>
          <label className="block text-xs space-y-1">
            <span className="text-muted-foreground">Result id</span>
            <input
              className="w-full bg-background border border-border px-2 py-2 min-h-[40px]"
              value={combResultId}
              onChange={(e) => setCombResultId(e.target.value)}
            />
          </label>
          <label className="block text-xs space-y-1">
            <span className="text-muted-foreground">Result name</span>
            <input
              className="w-full bg-background border border-border px-2 py-2 min-h-[40px]"
              value={combResultName}
              onChange={(e) => setCombResultName(e.target.value)}
            />
          </label>
          <label className="block text-xs space-y-1 sm:col-span-2">
            <span className="text-muted-foreground">Success message</span>
            <input
              className="w-full bg-background border border-border px-2 py-2 min-h-[40px]"
              value={combMsg}
              onChange={(e) => setCombMsg(e.target.value)}
            />
          </label>
        </div>
        <button
          type="button"
          onClick={addCombination}
          className="pixel-font text-xs min-h-[40px] px-3 border-2 border-accent text-accent"
        >
          Add combination
        </button>
        <ul className="text-xs space-y-1">
          {combos.map(([key, c]) => (
            <li
              key={key}
              className="flex justify-between border border-border/50 px-2 py-1"
            >
              <span>
                {c.items[0]} + {c.items[1]} → {c.result.id}
              </span>
              <button
                type="button"
                className="text-destructive"
                onClick={() => {
                  const next = { ...(doc.combinations ?? {}) };
                  delete next[key];
                  onChange({ ...doc, combinations: next });
                }}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
