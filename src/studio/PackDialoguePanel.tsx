import { useEffect, useRef, useState } from "react";
import { suggestId } from "@/authoring/codegen";
import type {
  JsonPackDialogue,
  JsonPackDocument,
  JsonPackHotspot,
} from "@/engine/jsonPack";
import { applyTranslateStub, dialogueLineId } from "@/engine/lineCatalog";
import type { DialogueOptionMode } from "@/engine/types";
import { toastFail, toastOk } from "@/studio/toastError";
import { DialogueGraphEditor } from "@/studio/DialogueGraphEditor";
import { DialoguePlaytester } from "@/studio/DialoguePlaytester";
import { parseRhubarbMouthCues } from "@/studio/rhubarbImport";
import { StringsExportBar } from "@/studio/StringsExportBar";

export interface PackDialoguePanelProps {
  doc: JsonPackDocument;
  roomId: string;
  /** Prefer this character hotspot when present */
  hotspotId?: string | null;
  onChange: (doc: JsonPackDocument) => void;
  onSelectHotspot?: (id: string) => void;
}

const MAX_CHOICES = 4;
const STUB_LOCALES = ["es", "fr", "de", "pt", "it", "ja", "zh"];

/**
 * Lite talk tree for character hotspots — linear lines + up to 3 choices.
 */
export function PackDialoguePanel({
  doc,
  roomId,
  hotspotId,
  onChange,
  onSelectHotspot,
}: PackDialoguePanelProps) {
  const room = doc.rooms[roomId];
  const characters = (room?.hotspots ?? []).filter(
    (h) => h.kind === "character"
  );
  const characterIds = characters.map((c) => c.id).join(",");
  const [localId, setLocalId] = useState<string | null>(null);

  useEffect(() => {
    const ids = characterIds ? characterIds.split(",") : [];
    if (hotspotId && ids.includes(hotspotId)) {
      setLocalId(hotspotId);
      return;
    }
    setLocalId((prev) => (prev && ids.includes(prev) ? prev : ids[0] ?? null));
  }, [hotspotId, characterIds]);

  const selectedId = localId;
  const hotspot = characters.find((h) => h.id === selectedId) ?? null;
  const dialogue: JsonPackDialogue = hotspot?.dialogue ?? {
    speaker: hotspot?.name,
    lines: [],
  };

  const [lineText, setLineText] = useState("Hey there.");
  const [choiceA, setChoiceA] = useState("Tell me more");
  const [choiceB, setChoiceB] = useState("Bye");
  const [choiceANext, setChoiceANext] = useState("");
  const [choiceBNext, setChoiceBNext] = useState("END");
  const [choiceAMode, setChoiceAMode] =
    useState<DialogueOptionMode>("normal");
  const [choiceBMode, setChoiceBMode] =
    useState<DialogueOptionMode>("normal");
  const [choiceAFlag, setChoiceAFlag] = useState("");
  const [choiceBFlag, setChoiceBFlag] = useState("");
  const [choiceASetFlag, setChoiceASetFlag] = useState("");
  const [choiceBSetFlag, setChoiceBSetFlag] = useState("");
  const [choiceAClearFlag, setChoiceAClearFlag] = useState("");
  const [choiceBClearFlag, setChoiceBClearFlag] = useState("");
  const [choiceAGiveItem, setChoiceAGiveItem] = useState("");
  const [choiceBGiveItem, setChoiceBGiveItem] = useState("");
  const [graphFocus, setGraphFocus] = useState<string | null>(null);
  const [stubLocale, setStubLocale] = useState("es");

  const OPTION_MODES: { id: DialogueOptionMode; label: string }[] = [
    { id: "normal", label: "Normal — always shown" },
    { id: "once", label: "Once — hide after pick (this talk)" },
    { id: "onceGame", label: "Once — hide for whole game" },
    { id: "offForever", label: "Off forever — remove after pick" },
  ];

  if (!characters.length) {
    return (
      <section className="border border-game-border bg-game-ui/90 p-4 space-y-2">
        <h3 className="pixel-font text-sm text-accent">Dialogue</h3>
        <p className="text-xs text-muted-foreground">
          Draw a{" "}
          <span className="text-foreground">character</span> hotspot to author a
          lite talk tree (Talk verb).
        </p>
      </section>
    );
  }

  const patchHotspot = (patch: Partial<JsonPackHotspot>) => {
    if (!room || !selectedId) return;
    const hotspots = (room.hotspots ?? []).map((h) =>
      h.id === selectedId ? { ...h, ...patch } : h
    );
    onChange({
      ...doc,
      rooms: {
        ...doc.rooms,
        [roomId]: { ...room, hotspots },
      },
    });
  };

  const setDialogue = (next: JsonPackDialogue) => {
    patchHotspot({ dialogue: next });
  };

  const lineIds = dialogue.lines.map((l) => l.id);
  const previewLine =
    dialogue.lines.find((l) => l.id === graphFocus) ?? dialogue.lines[0];
  const localePreviewKey =
    selectedId && previewLine
      ? dialogueLineId(roomId, selectedId, previewLine.id)
      : undefined;

  const addLine = () => {
    const id = suggestId(`line_${dialogue.lines.length + 1}`, "line");
    const unique = dialogue.lines.some((l) => l.id === id)
      ? `${id}_${dialogue.lines.length}`
      : id;
    const choices: NonNullable<JsonPackDialogue["lines"][0]["choices"]> = [];
    if (choiceA.trim()) {
      choices.push({
        text: choiceA.trim(),
        nextId: choiceANext.trim() || undefined,
        optionMode: choiceAMode === "normal" ? undefined : choiceAMode,
        requireFlag: choiceAFlag.trim() || undefined,
        setFlag: choiceASetFlag.trim() || undefined,
        clearFlag: choiceAClearFlag.trim() || undefined,
        giveItemId: choiceAGiveItem.trim() || undefined,
      });
    }
    if (choiceB.trim()) {
      choices.push({
        text: choiceB.trim(),
        nextId: choiceBNext.trim() || "END",
        optionMode: choiceBMode === "normal" ? undefined : choiceBMode,
        requireFlag: choiceBFlag.trim() || undefined,
        setFlag: choiceBSetFlag.trim() || undefined,
        clearFlag: choiceBClearFlag.trim() || undefined,
        giveItemId: choiceBGiveItem.trim() || undefined,
      });
    }
    setDialogue({
      speaker: dialogue.speaker || hotspot?.name,
      lines: [
        ...dialogue.lines,
        {
          id: unique,
          text: lineText.trim() || "…",
          choices: choices.length ? choices.slice(0, MAX_CHOICES) : undefined,
        },
      ],
    });
    toastOk("Line added", unique);
  };

  const ensureStarter = () => {
    if (dialogue.lines.length) return;
    setDialogue({
      speaker: hotspot?.name || "NPC",
      lines: [
        {
          id: "hello",
          text: `Hi — I'm ${hotspot?.name || "someone"}.`,
          choices: [
            { text: "Nice to meet you", nextId: "END" },
            { text: "Bye", nextId: "END" },
          ],
        },
      ],
    });
    toastOk("Starter dialogue", "Edit lines below");
  };

  return (
    <section className="border border-game-border bg-game-ui/90 p-4 space-y-3">
      <div>
        <h3 className="pixel-font text-sm text-accent">Dialogue</h3>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          Branching talk graph (max {MAX_CHOICES} choices). Jump with{" "}
          <code className="text-accent">nextId</code>; gate with require-flag.{" "}
          <code className="text-accent">END</code> closes.
        </p>
      </div>

      <StringsExportBar
        doc={doc}
        onChange={onChange}
        previewKey={localePreviewKey}
        previewFallback={previewLine?.text}
      />

      <label className="block text-xs space-y-1">
        <span className="text-muted-foreground">Character hotspot</span>
        <select
          className="w-full bg-background border border-border px-2 py-2 min-h-[40px]"
          value={selectedId || ""}
          onChange={(e) => {
            setLocalId(e.target.value);
            onSelectHotspot?.(e.target.value);
          }}
        >
          {characters.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name} ({h.id})
            </option>
          ))}
        </select>
      </label>

      {hotspot && (
        <>
          <ChoiceConsequences
            dialogue={dialogue}
            links={doc.links ?? []}
            roomId={roomId}
            roomNames={Object.fromEntries(
              Object.entries(doc.rooms).map(([id, r]) => [id, r.name || id])
            )}
          />

          <DialoguePlaytester
            hotspot={hotspot}
            exitGates={(doc.links ?? [])
              .filter((l) => l.requireFlag)
              .map((l) => ({
                flag: l.requireFlag!,
                label: `${l.from}→${l.to} (${roomNamesSafe(doc, l.to)})`,
              }))}
          />

          <label className="block text-xs space-y-1">
            <span className="text-muted-foreground">Speaker</span>
            <input
              className="w-full bg-background border border-border px-2 py-2 min-h-[40px]"
              value={dialogue.speaker || ""}
              onChange={(e) =>
                setDialogue({ ...dialogue, speaker: e.target.value })
              }
            />
          </label>

          {!dialogue.lines.length && (
            <button
              type="button"
              onClick={ensureStarter}
              className="pixel-font text-xs min-h-[40px] px-3 border border-accent text-accent"
            >
              Add starter line
            </button>
          )}

          {dialogue.lines.length > 0 && (
            <DialogueGraphEditor
              lines={dialogue.lines}
              focusId={graphFocus}
              onSelect={(id) => setGraphFocus(id)}
              onAddLinkedLine={(fromId) => {
                const id = suggestId(
                  `line_${dialogue.lines.length + 1}`,
                  "line"
                );
                const unique = dialogue.lines.some((l) => l.id === id)
                  ? `${id}_${dialogue.lines.length}`
                  : id;
                const lines = dialogue.lines.map((l) => {
                  if (l.id !== fromId) return l;
                  const choices = [
                    ...(l.choices ?? []).filter((c) => c.nextId !== "END"),
                    {
                      text: "Continue",
                      nextId: unique,
                    },
                  ].slice(0, MAX_CHOICES);
                  return { ...l, choices };
                });
                setDialogue({
                  ...dialogue,
                  lines: [
                    ...lines,
                    {
                      id: unique,
                      text: "…",
                      choices: [{ text: "Bye", nextId: "END" }],
                    },
                  ],
                });
                setGraphFocus(unique);
                toastOk("Linked line added", unique);
              }}
            />
          )}

          <ul className="space-y-2 max-h-48 overflow-y-auto">
            {dialogue.lines.map((line, idx) => (
              <li
                key={line.id}
                className="border border-border/50 p-2 space-y-1 text-xs"
              >
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{line.id}</span>
                  <button
                    type="button"
                    className="text-destructive"
                    onClick={() =>
                      setDialogue({
                        ...dialogue,
                        lines: dialogue.lines.filter((l) => l.id !== line.id),
                      })
                    }
                  >
                    ✕
                  </button>
                </div>
                <textarea
                  className="w-full bg-background border border-border px-2 py-1 min-h-[52px]"
                  value={line.text}
                  onChange={(e) => {
                    const lines = dialogue.lines.map((l, i) =>
                      i === idx ? { ...l, text: e.target.value } : l
                    );
                    setDialogue({ ...dialogue, lines });
                  }}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <span>Locale</span>
                    <select
                      className="bg-background border border-border px-1 py-0.5 text-[10px] min-h-[28px]"
                      value={stubLocale}
                      onChange={(e) => setStubLocale(e.target.value)}
                      aria-label="Stub translation locale"
                    >
                      {STUB_LOCALES.map((id) => (
                        <option key={id} value={id}>
                          {id}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="pixel-font text-[10px] min-h-[28px] px-2 border border-accent text-accent"
                    title={`Fill i18n.${stubLocale} with [TODO ${stubLocale}] …`}
                    onClick={() => {
                      if (!selectedId) return;
                      const key = dialogueLineId(roomId, selectedId, line.id);
                      const next = applyTranslateStub(
                        doc,
                        stubLocale,
                        key,
                        line.text
                      );
                      onChange(next);
                      setGraphFocus(line.id);
                      toastOk("Translate stub", `${key} → i18n.${stubLocale}`);
                    }}
                  >
                    Translate stub
                  </button>
                </div>
                <LineMouthCuesBar
                  cueCount={line.mouthCues?.length ?? 0}
                  onImport={(cues) => {
                    const lines = dialogue.lines.map((l, i) =>
                      i === idx
                        ? {
                            ...l,
                            mouthCues: cues.length ? cues : undefined,
                          }
                        : l
                    );
                    setDialogue({ ...dialogue, lines });
                  }}
                  onClear={() => {
                    const lines = dialogue.lines.map((l, i) => {
                      if (i !== idx) return l;
                      const { mouthCues: _drop, ...rest } = l;
                      return rest;
                    });
                    setDialogue({ ...dialogue, lines });
                  }}
                />
                {(line.choices ?? []).map((c, ci) => (
                  <div
                    key={ci}
                    className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground"
                  >
                    <span>
                      → {c.text}{" "}
                      <span className="text-accent">
                        ({c.nextId || "next / END"})
                      </span>
                      {c.requireFlag ? ` · if ${c.requireFlag}` : ""}
                      {c.setFlag ? ` · set ${c.setFlag}` : ""}
                    </span>
                    <select
                      className="bg-background border border-border px-1 py-0.5 text-[10px]"
                      value={c.nextId || "END"}
                      onChange={(e) => {
                        const nextId = e.target.value;
                        const lines = dialogue.lines.map((l, i) => {
                          if (i !== idx) return l;
                          const choices = (l.choices ?? []).map((ch, j) =>
                            j === ci ? { ...ch, nextId } : ch
                          );
                          return { ...l, choices };
                        });
                        setDialogue({ ...dialogue, lines });
                      }}
                    >
                      {lineIds.map((id) => (
                        <option key={id} value={id}>
                          → {id}
                        </option>
                      ))}
                      <option value="END">END</option>
                    </select>
                    <select
                      className="bg-background border border-border px-1 py-0.5 text-[10px]"
                      value={c.optionMode || "normal"}
                      onChange={(e) => {
                        const mode = e.target.value as DialogueOptionMode;
                        const lines = dialogue.lines.map((l, i) => {
                          if (i !== idx) return l;
                          const choices = (l.choices ?? []).map((ch, j) =>
                            j === ci
                              ? {
                                  ...ch,
                                  optionMode:
                                    mode === "normal" ? undefined : mode,
                                }
                              : ch
                          );
                          return { ...l, choices };
                        });
                        setDialogue({ ...dialogue, lines });
                      }}
                    >
                      {OPTION_MODES.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                    <input
                      className="bg-background border border-border px-1 py-0.5 text-[10px] w-24"
                      placeholder="require flag"
                      value={c.requireFlag || ""}
                      onChange={(e) => {
                        const requireFlag = e.target.value.trim() || undefined;
                        const lines = dialogue.lines.map((l, i) => {
                          if (i !== idx) return l;
                          const choices = (l.choices ?? []).map((ch, j) =>
                            j === ci ? { ...ch, requireFlag } : ch
                          );
                          return { ...l, choices };
                        });
                        setDialogue({ ...dialogue, lines });
                      }}
                    />
                    <input
                      className="bg-background border border-border px-1 py-0.5 text-[10px] w-24"
                      placeholder="set flag"
                      value={c.setFlag || ""}
                      onChange={(e) => {
                        const setFlag = e.target.value.trim() || undefined;
                        const lines = dialogue.lines.map((l, i) => {
                          if (i !== idx) return l;
                          const choices = (l.choices ?? []).map((ch, j) =>
                            j === ci ? { ...ch, setFlag } : ch
                          );
                          return { ...l, choices };
                        });
                        setDialogue({ ...dialogue, lines });
                      }}
                    />
                  </div>
                ))}
              </li>
            ))}
          </ul>

          <div className="border border-border/60 p-3 space-y-2">
            <h4 className="pixel-font text-[11px] text-accent">Add line</h4>
            <label className="block text-xs space-y-1">
              <span className="text-muted-foreground">Text</span>
              <input
                className="w-full bg-background border border-border px-2 py-2 min-h-[40px]"
                value={lineText}
                onChange={(e) => setLineText(e.target.value)}
              />
            </label>
            <div className="grid sm:grid-cols-2 gap-2">
              <label className="block text-xs space-y-1">
                <span className="text-muted-foreground">Choice 1</span>
                <input
                  className="w-full bg-background border border-border px-2 py-2"
                  value={choiceA}
                  onChange={(e) => setChoiceA(e.target.value)}
                />
                <select
                  className="w-full bg-background border border-border px-2 py-2 mt-1"
                  value={choiceANext}
                  onChange={(e) => setChoiceANext(e.target.value)}
                >
                  <option value="">→ next line (or END)</option>
                  {lineIds.map((id) => (
                    <option key={id} value={id}>
                      {id}
                    </option>
                  ))}
                  <option value="END">END</option>
                </select>
                <select
                  className="w-full bg-background border border-border px-2 py-2 mt-1"
                  value={choiceAMode}
                  onChange={(e) =>
                    setChoiceAMode(e.target.value as DialogueOptionMode)
                  }
                >
                  {OPTION_MODES.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <input
                  className="w-full bg-background border border-border px-2 py-2 mt-1"
                  placeholder="Require flag (optional)"
                  value={choiceAFlag}
                  onChange={(e) => setChoiceAFlag(e.target.value)}
                />
                <input
                  className="w-full bg-background border border-border px-2 py-2 mt-1"
                  placeholder="Set flag on pick (talk-gate)"
                  value={choiceASetFlag}
                  onChange={(e) => setChoiceASetFlag(e.target.value)}
                />
                <input
                  className="w-full bg-background border border-border px-2 py-2 mt-1"
                  placeholder="Clear flag (optional)"
                  value={choiceAClearFlag}
                  onChange={(e) => setChoiceAClearFlag(e.target.value)}
                />
                <input
                  className="w-full bg-background border border-border px-2 py-2 mt-1"
                  placeholder="Give item id (optional)"
                  value={choiceAGiveItem}
                  onChange={(e) => setChoiceAGiveItem(e.target.value)}
                />
              </label>
              <label className="block text-xs space-y-1">
                <span className="text-muted-foreground">Choice 2</span>
                <input
                  className="w-full bg-background border border-border px-2 py-2"
                  value={choiceB}
                  onChange={(e) => setChoiceB(e.target.value)}
                />
                <select
                  className="w-full bg-background border border-border px-2 py-2 mt-1"
                  value={choiceBNext}
                  onChange={(e) => setChoiceBNext(e.target.value)}
                >
                  <option value="END">END</option>
                  {lineIds.map((id) => (
                    <option key={id} value={id}>
                      {id}
                    </option>
                  ))}
                </select>
                <select
                  className="w-full bg-background border border-border px-2 py-2 mt-1"
                  value={choiceBMode}
                  onChange={(e) =>
                    setChoiceBMode(e.target.value as DialogueOptionMode)
                  }
                >
                  {OPTION_MODES.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <input
                  className="w-full bg-background border border-border px-2 py-2 mt-1"
                  placeholder="Require flag (optional)"
                  value={choiceBFlag}
                  onChange={(e) => setChoiceBFlag(e.target.value)}
                />
                <input
                  className="w-full bg-background border border-border px-2 py-2 mt-1"
                  placeholder="Set flag on pick (talk-gate)"
                  value={choiceBSetFlag}
                  onChange={(e) => setChoiceBSetFlag(e.target.value)}
                />
                <input
                  className="w-full bg-background border border-border px-2 py-2 mt-1"
                  placeholder="Clear flag (optional)"
                  value={choiceBClearFlag}
                  onChange={(e) => setChoiceBClearFlag(e.target.value)}
                />
                <input
                  className="w-full bg-background border border-border px-2 py-2 mt-1"
                  placeholder="Give item id (optional)"
                  value={choiceBGiveItem}
                  onChange={(e) => setChoiceBGiveItem(e.target.value)}
                />
              </label>
            </div>
            <button
              type="button"
              onClick={addLine}
              className="pixel-font text-xs min-h-[40px] px-3 border-2 border-accent text-accent"
            >
              Add dialogue line
            </button>
          </div>
        </>
      )}
    </section>
  );
}

function roomNamesSafe(
  doc: JsonPackDocument,
  id: string
): string {
  return doc.rooms[id]?.name || id;
}

function LineMouthCuesBar({
  cueCount,
  onImport,
  onClear,
}: {
  cueCount: number;
  onImport: (cues: { t: number; shape: string }[]) => void;
  onClear: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      const cues = parseRhubarbMouthCues(text);
      if (!cues.length) {
        toastFail("Rhubarb import failed", "No valid mouthCues found (need t + value/shape).");
        return;
      }
      onImport(cues);
      toastOk("Mouth cues imported", `${cues.length} cue${cues.length === 1 ? "" : "s"} from Rhubarb JSON`);
    };
    reader.onerror = () => {
      toastFail("Rhubarb import failed", "Could not read file.");
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 text-[10px]">
      <button
        type="button"
        className="pixel-font min-h-[28px] px-2 border border-accent text-accent"
        onClick={() => fileRef.current?.click()}
      >
        Import Rhubarb JSON
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) readFile(f);
          e.target.value = "";
        }}
      />
      {cueCount > 0 ? (
        <>
          <span className="text-muted-foreground">
            {cueCount} mouth cue{cueCount === 1 ? "" : "s"}
          </span>
          <button
            type="button"
            className="text-destructive underline"
            onClick={onClear}
          >
            Clear cues
          </button>
        </>
      ) : (
        <span className="text-muted-foreground">No mouth cues</span>
      )}
    </div>
  );
}

function ChoiceConsequences({
  dialogue,
  links,
  roomId,
  roomNames,
}: {
  dialogue: JsonPackDialogue;
  links: NonNullable<JsonPackDocument["links"]>;
  roomId: string;
  roomNames: Record<string, string>;
}) {
  const rows: Array<{ choice: string; effects: string }> = [];
  for (const line of dialogue.lines) {
    for (const c of line.choices ?? []) {
      const effects: string[] = [];
      if (c.setFlag) {
        effects.push(`set ${c.setFlag}`);
        for (const l of links) {
          if (l.requireFlag === c.setFlag) {
            effects.push(
              `unlocks exit ${l.from}→${roomNames[l.to] || l.to}`
            );
          }
        }
      }
      if (c.clearFlag) effects.push(`clear ${c.clearFlag}`);
      if (c.giveItemId) effects.push(`give ${c.giveItemId}`);
      if (c.requireFlag) effects.push(`needs ${c.requireFlag}`);
      if (!effects.length) continue;
      rows.push({
        choice: `${line.id}: “${c.text}”`,
        effects: effects.join(" · "),
      });
    }
  }
  if (!rows.length) {
    return (
      <p className="text-[11px] text-muted-foreground border border-border/50 px-2 py-1.5">
        Choice consequences appear here when choices set/clear flags or give
        items (and which exits those flags unlock from {roomId}).
      </p>
    );
  }
  return (
    <div className="border border-border/60 px-2 py-2 space-y-1">
      <p className="pixel-font text-[10px] text-accent">Choice consequences</p>
      <ul className="space-y-1 text-[11px]">
        {rows.map((r, i) => (
          <li key={i} className="leading-relaxed">
            <span className="text-foreground">{r.choice}</span>
            <span className="text-muted-foreground"> → {r.effects}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
