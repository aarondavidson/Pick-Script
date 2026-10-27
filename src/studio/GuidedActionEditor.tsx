import { useState } from "react";
import { suggestId } from "@/authoring/codegen";
import type { PackAction } from "@/engine/packActions";
import { sanitizePackActions } from "@/engine/packActions";
import { safeJsonParse } from "@/engine/security";
import { BUILTIN_SFX_KEYS } from "@/authoring/audioPresets";
import { HAPTIC_STYLES, type HapticStyle } from "@/engine/haptics";
import { JUICE_PRESETS, type JuicePresetId } from "@/engine/juice";

/** Max nested GuidedActionEditor depth for if then/else (0 = root). */
export const GUIDED_ACTION_MAX_DEPTH = 2;

export interface GuidedActionEditorProps {
  actions: PackAction[] | undefined;
  onChange: (actions: PackAction[]) => void;
  /** When false, hide raw JSON fallback */
  guided?: boolean;
  /** Nest depth for if then/else editors (root = 0). */
  depth?: number;
}

const OP_LABELS: Record<PackAction["op"], string> = {
  message: "Show message",
  say: "Character says",
  setFlag: "Set flag",
  clearFlag: "Clear flag",
  giveItem: "Give item",
  takeItem: "Take item",
  setObjectState: "Set object state",
  sound: "Play sound",
  haptic: "Haptic buzz",
  juice: "Juice (shake/flash)",
  cutscene: "Cutscene",
  requireItem: "Require item",
  setWalkFloor: "Set walk floor",
  if: "If (flag / item)",
};

/**
 * Form builder for PackAction[] — Guided default; Advanced can edit raw JSON.
 */
export function GuidedActionEditor({
  actions,
  onChange,
  guided = true,
  depth = 0,
}: GuidedActionEditorProps) {
  const list = sanitizePackActions(actions);
  const [op, setOp] = useState<PackAction["op"]>("message");
  const [text, setText] = useState("");
  const [flag, setFlag] = useState("");
  const [itemId, setItemId] = useState("");
  const [itemName, setItemName] = useState("");
  const [objectId, setObjectId] = useState("");
  const [stateVal, setStateVal] = useState(1);
  const [soundKey, setSoundKey] = useState("click");
  const [hapticStyle, setHapticStyle] = useState<HapticStyle>("medium");
  const [juicePreset, setJuicePreset] = useState<JuicePresetId>("medium");
  const [failMessage, setFailMessage] = useState("");
  const [ifThenMessage, setIfThenMessage] = useState("");
  const [walkFloor, setWalkFloor] = useState(0);
  const [raw, setRaw] = useState("");
  const [showRaw, setShowRaw] = useState(false);

  const canNest = depth < GUIDED_ACTION_MAX_DEPTH;
  const allowIfOp = depth < GUIDED_ACTION_MAX_DEPTH;

  const replaceAt = (i: number, next: PackAction) => {
    const copy = [...list];
    copy[i] = next;
    onChange(copy);
  };

  const add = () => {
    let next: PackAction | null = null;
    switch (effectiveOp) {
      case "message":
        if (!text.trim()) return;
        next = { op: "message", text: text.trim() };
        break;
      case "say":
        if (!text.trim()) return;
        next = { op: "say", text: text.trim() };
        break;
      case "setFlag":
        if (!flag.trim()) return;
        next = { op: "setFlag", flag: suggestId(flag, "flag"), value: true };
        break;
      case "clearFlag":
        if (!flag.trim()) return;
        next = { op: "clearFlag", flag: suggestId(flag, "flag") };
        break;
      case "giveItem":
        if (!itemId.trim() && !itemName.trim()) return;
        next = {
          op: "giveItem",
          item: {
            id: suggestId(itemId || itemName, "item"),
            name: itemName.trim() || itemId,
            description: itemName.trim() || itemId,
          },
        };
        break;
      case "takeItem":
        if (!itemId.trim()) return;
        next = { op: "takeItem", itemId: suggestId(itemId, "item") };
        break;
      case "setObjectState":
        if (!objectId.trim()) return;
        next = {
          op: "setObjectState",
          objectId: suggestId(objectId, "object"),
          value: stateVal,
        };
        break;
      case "sound":
        next = { op: "sound", key: soundKey };
        break;
      case "haptic":
        next = { op: "haptic", style: hapticStyle };
        break;
      case "juice":
        next = { op: "juice", preset: juicePreset };
        break;
      case "cutscene":
        if (!text.trim()) return;
        next = { op: "cutscene", id: suggestId(text, "cutscene") };
        break;
      case "requireItem":
        if (!itemId.trim()) return;
        next = {
          op: "requireItem",
          itemId: suggestId(itemId, "item"),
          ...(failMessage.trim()
            ? { failMessage: failMessage.trim() }
            : {}),
        };
        break;
      case "setWalkFloor":
        next = {
          op: "setWalkFloor",
          floor: Math.min(8, Math.max(0, Math.floor(walkFloor))),
        };
        break;
      case "if": {
        if (!allowIfOp) return;
        if (!flag.trim() && !itemId.trim()) return;
        const thenActions: PackAction[] = ifThenMessage.trim()
          ? [{ op: "message", text: ifThenMessage.trim() }]
          : [];
        next = {
          op: "if",
          ...(flag.trim() ? { flag: suggestId(flag, "flag") } : {}),
          ...(itemId.trim() ? { hasItem: suggestId(itemId, "item") } : {}),
          then: thenActions,
          else: [],
        };
        break;
      }
      default:
        break;
    }
    if (next) {
      onChange([...list, next]);
      setText("");
      setFailMessage("");
      setIfThenMessage("");
    }
  };

  const removeAt = (i: number) => {
    onChange(list.filter((_, idx) => idx !== i));
  };

  const moveAt = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    const next = [...list];
    const tmp = next[i]!;
    next[i] = next[j]!;
    next[j] = tmp;
    onChange(next);
  };

  const opChoices = (Object.keys(OP_LABELS) as PackAction["op"][]).filter(
    (k) => allowIfOp || k !== "if"
  );
  const effectiveOp = opChoices.includes(op) ? op : "message";

  return (
    <div
      className={`space-y-2 border border-border/60 px-3 py-2 ${
        depth > 0 ? "bg-background/40" : ""
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="pixel-font text-[10px] text-accent">
          {depth === 0 ? "ActionList" : `Nested actions (depth ${depth})`}
        </p>
        {!guided && depth === 0 && (
          <button
            type="button"
            className="text-[10px] text-muted-foreground underline"
            onClick={() => {
              setShowRaw((v) => !v);
              setRaw(JSON.stringify(list, null, 2));
            }}
          >
            {showRaw ? "Hide raw JSON" : "Edit raw JSON"}
          </button>
        )}
      </div>
      {depth === 0 && (
        <p className="text-[10px] text-muted-foreground">
          Runs top → bottom (like Visionaire ActionLists)
        </p>
      )}

      {showRaw && !guided && depth === 0 ? (
        <div className="space-y-2">
          <textarea
            className="w-full bg-background border border-border px-2 py-2 text-[10px] font-mono min-h-[100px]"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
          />
          <button
            type="button"
            className="pixel-font text-[10px] min-h-[36px] px-2 border border-accent text-accent"
            onClick={() => {
              try {
                onChange(sanitizePackActions(safeJsonParse(raw)));
              } catch {
                /* ignore parse errors */
              }
            }}
          >
            Apply JSON
          </button>
        </div>
      ) : (
        <>
          <ul className="space-y-2 text-xs">
            {list.length === 0 && (
              <li className="text-muted-foreground">No actions yet.</li>
            )}
            {list.map((a, i) => (
              <li
                key={`${a.op}-${i}`}
                className="border border-border/50 bg-muted/20 px-2 py-2 space-y-2"
              >
                <div className="flex justify-between gap-2 items-start">
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    <span className="pixel-font text-[9px] shrink-0 border border-accent/60 text-accent px-1.5 py-0.5 uppercase tracking-wide">
                      {a.op}
                    </span>
                    <span className="text-muted-foreground truncate">
                      {OP_LABELS[a.op]}
                      {a.op !== "requireItem" && a.op !== "if"
                        ? ` · ${summarize(a)}`
                        : ""}
                    </span>
                  </div>
                  <span className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      className="text-muted-foreground disabled:opacity-30"
                      disabled={i === 0}
                      title="Move up"
                      onClick={() => moveAt(i, -1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="text-muted-foreground disabled:opacity-30"
                      disabled={i === list.length - 1}
                      title="Move down"
                      onClick={() => moveAt(i, 1)}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="text-destructive"
                      onClick={() => removeAt(i)}
                    >
                      ✕
                    </button>
                  </span>
                </div>

                {a.op === "requireItem" && (
                  <div className="grid sm:grid-cols-2 gap-2 pl-0.5">
                    <label className="block text-[11px] space-y-0.5">
                      <span className="text-muted-foreground">Item id</span>
                      <input
                        className="w-full bg-background border border-border px-2 py-1.5"
                        defaultValue={a.itemId}
                        key={`req-item-${i}-${a.itemId}`}
                        onBlur={(e) => {
                          const next = suggestId(e.target.value, "item");
                          if (next !== a.itemId) {
                            replaceAt(i, { ...a, itemId: next });
                          }
                        }}
                      />
                    </label>
                    <label className="block text-[11px] space-y-0.5">
                      <span className="text-muted-foreground">
                        Fail message
                      </span>
                      <input
                        className="w-full bg-background border border-border px-2 py-1.5"
                        value={a.failMessage ?? ""}
                        placeholder="You need that item."
                        onChange={(e) => {
                          const fail = e.target.value;
                          replaceAt(i, {
                            op: "requireItem",
                            itemId: a.itemId,
                            ...(fail.trim()
                              ? { failMessage: fail.trim() }
                              : {}),
                          });
                        }}
                      />
                    </label>
                  </div>
                )}

                {a.op === "if" && (
                  <div className="space-y-2 pl-0.5">
                    <div className="grid sm:grid-cols-2 gap-2">
                      <label className="block text-[11px] space-y-0.5">
                        <span className="text-muted-foreground">
                          Flag (optional)
                        </span>
                        <input
                          className="w-full bg-background border border-border px-2 py-1.5"
                          defaultValue={a.flag ?? ""}
                          key={`if-flag-${i}-${a.flag ?? ""}`}
                          onBlur={(e) => {
                            const v = e.target.value.trim();
                            const flag = v ? suggestId(v, "flag") : undefined;
                            if (!flag && !a.hasItem && !a.equals) return;
                            replaceAt(i, { ...a, flag });
                          }}
                        />
                      </label>
                      <label className="block text-[11px] space-y-0.5">
                        <span className="text-muted-foreground">
                          hasItem (optional)
                        </span>
                        <input
                          className="w-full bg-background border border-border px-2 py-1.5"
                          defaultValue={a.hasItem ?? ""}
                          key={`if-item-${i}-${a.hasItem ?? ""}`}
                          onBlur={(e) => {
                            const v = e.target.value.trim();
                            const hasItem = v
                              ? suggestId(v, "item")
                              : undefined;
                            if (!hasItem && !a.flag && !a.equals) return;
                            replaceAt(i, { ...a, hasItem });
                          }}
                        />
                      </label>
                    </div>
                    {canNest ? (
                      <>
                        <div className="space-y-1">
                          <p className="pixel-font text-[9px] text-accent">
                            then[]
                          </p>
                          <GuidedActionEditor
                            actions={a.then}
                            guided={guided}
                            depth={depth + 1}
                            onChange={(then) =>
                              replaceAt(i, { ...a, then })
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <p className="pixel-font text-[9px] text-accent">
                            else[]
                          </p>
                          <GuidedActionEditor
                            actions={a.else ?? []}
                            guided={guided}
                            depth={depth + 1}
                            onChange={(elseActions) =>
                              replaceAt(i, {
                                ...a,
                                else: elseActions.length
                                  ? elseActions
                                  : undefined,
                              })
                            }
                          />
                        </div>
                      </>
                    ) : (
                      <p className="text-[10px] text-muted-foreground">
                        Nesting limit reached — then/else:{" "}
                        {a.then?.length ?? 0}/{a.else?.length ?? 0} steps
                        (edit via raw JSON for deeper chains).
                      </p>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
          <div className="grid sm:grid-cols-2 gap-2 border-t border-border pt-2">
            <label className="block text-xs space-y-1 sm:col-span-2">
              <span className="text-muted-foreground">Add step</span>
              <select
                className="w-full bg-background border border-border px-2 py-2 min-h-[36px]"
                value={effectiveOp}
                onChange={(e) => setOp(e.target.value as PackAction["op"])}
              >
                {opChoices.map((k) => (
                  <option key={k} value={k}>
                    {OP_LABELS[k]}
                  </option>
                ))}
              </select>
            </label>
            {(effectiveOp === "message" ||
              effectiveOp === "say" ||
              effectiveOp === "cutscene") && (
              <label className="block text-xs space-y-1 sm:col-span-2">
                <span className="text-muted-foreground">
                  {effectiveOp === "cutscene" ? "Cutscene id" : "Text"}
                </span>
                <input
                  className="w-full bg-background border border-border px-2 py-2"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
              </label>
            )}
            {(effectiveOp === "setFlag" || effectiveOp === "clearFlag") && (
              <label className="block text-xs space-y-1 sm:col-span-2">
                <span className="text-muted-foreground">Flag</span>
                <input
                  className="w-full bg-background border border-border px-2 py-2"
                  value={flag}
                  onChange={(e) => setFlag(e.target.value)}
                />
              </label>
            )}
            {effectiveOp === "giveItem" && (
              <>
                <label className="block text-xs space-y-1">
                  <span className="text-muted-foreground">Item id</span>
                  <input
                    className="w-full bg-background border border-border px-2 py-2"
                    value={itemId}
                    onChange={(e) => setItemId(e.target.value)}
                  />
                </label>
                <label className="block text-xs space-y-1">
                  <span className="text-muted-foreground">Name</span>
                  <input
                    className="w-full bg-background border border-border px-2 py-2"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                  />
                </label>
              </>
            )}
            {(effectiveOp === "takeItem" ||
              effectiveOp === "requireItem") && (
              <label className="block text-xs space-y-1 sm:col-span-2">
                <span className="text-muted-foreground">Item id</span>
                <input
                  className="w-full bg-background border border-border px-2 py-2"
                  value={itemId}
                  onChange={(e) => setItemId(e.target.value)}
                />
              </label>
            )}
            {effectiveOp === "requireItem" && (
              <label className="block text-xs space-y-1 sm:col-span-2">
                <span className="text-muted-foreground">Fail message</span>
                <input
                  className="w-full bg-background border border-border px-2 py-2"
                  value={failMessage}
                  onChange={(e) => setFailMessage(e.target.value)}
                  placeholder="You need that item."
                />
              </label>
            )}
            {effectiveOp === "setWalkFloor" && (
              <label className="block text-xs space-y-1">
                <span className="text-muted-foreground">Floor (0–8)</span>
                <input
                  type="number"
                  min={0}
                  max={8}
                  className="w-full bg-background border border-border px-2 py-2"
                  value={walkFloor}
                  onChange={(e) => setWalkFloor(Number(e.target.value) || 0)}
                />
              </label>
            )}
            {effectiveOp === "if" && allowIfOp && (
              <>
                <label className="block text-xs space-y-1">
                  <span className="text-muted-foreground">Flag (optional)</span>
                  <input
                    className="w-full bg-background border border-border px-2 py-2"
                    value={flag}
                    onChange={(e) => setFlag(e.target.value)}
                  />
                </label>
                <label className="block text-xs space-y-1">
                  <span className="text-muted-foreground">
                    hasItem (optional)
                  </span>
                  <input
                    className="w-full bg-background border border-border px-2 py-2"
                    value={itemId}
                    onChange={(e) => setItemId(e.target.value)}
                  />
                </label>
                <label className="block text-xs space-y-1 sm:col-span-2">
                  <span className="text-muted-foreground">
                    Then message (optional)
                  </span>
                  <input
                    className="w-full bg-background border border-border px-2 py-2"
                    value={ifThenMessage}
                    onChange={(e) => setIfThenMessage(e.target.value)}
                    placeholder="Runs when condition passes"
                  />
                </label>
                <p className="text-[10px] text-muted-foreground sm:col-span-2">
                  After adding, edit then[] / else[] nested lists on the card.
                </p>
              </>
            )}
            {effectiveOp === "setObjectState" && (
              <>
                <label className="block text-xs space-y-1">
                  <span className="text-muted-foreground">Object id</span>
                  <input
                    className="w-full bg-background border border-border px-2 py-2"
                    value={objectId}
                    onChange={(e) => setObjectId(e.target.value)}
                  />
                </label>
                <label className="block text-xs space-y-1">
                  <span className="text-muted-foreground">State</span>
                  <input
                    type="number"
                    className="w-full bg-background border border-border px-2 py-2"
                    value={stateVal}
                    onChange={(e) => setStateVal(Number(e.target.value) || 0)}
                  />
                </label>
              </>
            )}
            {effectiveOp === "sound" && (
              <label className="block text-xs space-y-1 sm:col-span-2">
                <span className="text-muted-foreground">Sound key</span>
                <select
                  className="w-full bg-background border border-border px-2 py-2"
                  value={soundKey}
                  onChange={(e) => setSoundKey(e.target.value)}
                >
                  {BUILTIN_SFX_KEYS.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.key}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {effectiveOp === "haptic" && (
              <label className="block text-xs space-y-1 sm:col-span-2">
                <span className="text-muted-foreground">Haptic style</span>
                <select
                  className="w-full bg-background border border-border px-2 py-2"
                  value={hapticStyle}
                  onChange={(e) =>
                    setHapticStyle(e.target.value as HapticStyle)
                  }
                >
                  {HAPTIC_STYLES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {effectiveOp === "juice" && (
              <label className="block text-xs space-y-1 sm:col-span-2">
                <span className="text-muted-foreground">Juice preset</span>
                <select
                  className="w-full bg-background border border-border px-2 py-2"
                  value={juicePreset}
                  onChange={(e) =>
                    setJuicePreset(e.target.value as JuicePresetId)
                  }
                >
                  {JUICE_PRESETS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <button
            type="button"
            onClick={add}
            className="pixel-font text-[10px] min-h-[36px] px-3 border border-accent text-accent"
          >
            Add action
          </button>
        </>
      )}
    </div>
  );
}

function summarize(a: PackAction): string {
  switch (a.op) {
    case "message":
    case "say":
      return a.text.slice(0, 40);
    case "setFlag":
      return `${a.flag}=${a.value !== false}`;
    case "clearFlag":
      return a.flag;
    case "giveItem":
      return a.item.name || a.item.id;
    case "takeItem":
      return a.itemId;
    case "setObjectState":
      return `${a.objectId}→${a.value}`;
    case "sound":
      return a.key;
    case "haptic":
      return a.style;
    case "juice":
      return a.preset ?? [a.shake, a.flash, a.burst].filter(Boolean).join("/");
    case "cutscene":
      return a.id;
    case "requireItem":
      return a.failMessage
        ? `${a.itemId} · ${a.failMessage.slice(0, 24)}`
        : a.itemId;
    case "setWalkFloor":
      return `floor ${a.floor}`;
    case "if": {
      const parts = [
        a.flag ? `flag=${a.flag}` : "",
        a.hasItem ? `has=${a.hasItem}` : "",
        a.equals ? `eq=${a.equals.var}` : "",
        `then=${a.then?.length ?? 0}`,
        a.else?.length ? `else=${a.else.length}` : "",
      ].filter(Boolean);
      return parts.join(" ");
    }
    default:
      return "";
  }
}
