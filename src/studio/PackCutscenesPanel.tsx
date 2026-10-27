import { useEffect, useState } from "react";
import { suggestId } from "@/authoring/codegen";
import { BUILTIN_SFX_KEYS } from "@/authoring/audioPresets";
import {
  CUTSCENE_TEMPLATES,
  applyCutsceneTemplate,
  type CutsceneTemplateId,
} from "@/authoring/cutsceneTemplates";
import { JUICE_PRESETS, type JuicePresetId } from "@/engine/juice";
import type {
  JsonPackCutscene,
  JsonPackCutsceneStep,
  JsonPackDocument,
} from "@/engine/jsonPack";
import { toastFail, toastOk } from "@/studio/toastError";
import {
  buildCutsceneStepFromForm,
  moveCutsceneStep,
  type CutsceneStepFormOp,
} from "@/studio/cutsceneStepBuilder";
import {
  previewStepDurationMs,
  summarizeCutscenePreviewStep,
} from "@/studio/cutscenePreview";

export interface PackCutscenesPanelProps {
  doc: JsonPackDocument;
  roomId?: string;
  onChange: (doc: JsonPackDocument) => void;
}

const STEP_OPS: { value: CutsceneStepFormOp; label: string }[] = [
  { value: "message", label: "Message" },
  { value: "wait", label: "Wait (ms)" },
  { value: "walk", label: "Walk to %" },
  { value: "sound", label: "Sound" },
  { value: "setFlag", label: "Set flag" },
  { value: "music", label: "Music cue" },
  { value: "sayLine", label: "Say line (bubble)" },
  { value: "camera", label: "Camera" },
  { value: "label", label: "Label" },
  { value: "goto", label: "Goto label" },
  { value: "parallel", label: "Parallel (walk + say)" },
];

/**
 * Cutscene list: form-built message / wait / walk / camera / parallel steps.
 */
export function PackCutscenesPanel({
  doc,
  roomId,
  onChange,
}: PackCutscenesPanelProps) {
  const cutscenes = doc.cutscenes ?? {};
  const ids = Object.keys(cutscenes);
  const [selectedId, setSelectedId] = useState<string | null>(ids[0] ?? null);
  const [newName, setNewName] = useState("intro");
  const [stepOp, setStepOp] = useState<CutsceneStepFormOp>("message");
  const [msg, setMsg] = useState("Something stirs in the dark…");
  const [speaker, setSpeaker] = useState("");
  const [waitMs, setWaitMs] = useState(800);
  const [walkX, setWalkX] = useState(50);
  const [walkY, setWalkY] = useState(75);
  const [waitForWalk, setWaitForWalk] = useState(true);
  const [soundKey, setSoundKey] = useState("creak");
  const [flagStep, setFlagStep] = useState("cutscene_done");
  const [musicStepKey, setMusicStepKey] = useState(
    doc.audio?.defaultMusic || "home"
  );
  const [sayText, setSayText] = useState("Hmm…");
  const [sayActorId, setSayActorId] = useState("player");
  const [sayVoiceKey, setSayVoiceKey] = useState("");
  const [sayLipSyncKey, setSayLipSyncKey] = useState("");
  const [waitForSpeech, setWaitForSpeech] = useState(true);
  const [juicePreset, setJuicePreset] = useState<JuicePresetId | "">("");
  const [cameraPanX, setCameraPanX] = useState(50);
  const [cameraPanY, setCameraPanY] = useState(50);
  const [cameraZoom, setCameraZoom] = useState(1);
  const [cameraFollow, setCameraFollow] = useState("");
  const [labelName, setLabelName] = useState("beat_a");
  const [gotoLabel, setGotoLabel] = useState("beat_a");
  const [parallelWalkX, setParallelWalkX] = useState(40);
  const [parallelWalkY, setParallelWalkY] = useState(75);
  const [parallelSayText, setParallelSayText] = useState("On my way.");
  const [parallelSayActorId, setParallelSayActorId] = useState("player");
  const [templateId, setTemplateId] =
    useState<CutsceneTemplateId>("intro-enter");
  const [escapeTo, setEscapeTo] = useState(
    Object.keys(doc.rooms).find((id) => id !== (roomId || doc.startRoom)) || ""
  );
  const [flagTrigger, setFlagTrigger] = useState("play_intro");
  const [flagCutsceneId, setFlagCutsceneId] = useState(ids[0] ?? "intro");
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewPlaying, setPreviewPlaying] = useState(false);

  const selected = selectedId ? cutscenes[selectedId] : null;
  const flagCutscenes = doc.flagCutscenes ?? {};
  const previewSteps = selected?.steps ?? [];
  const previewMax = Math.max(0, previewSteps.length - 1);
  const previewStep = previewSteps[previewIndex];
  const previewSummary = previewStep
    ? summarizeCutscenePreviewStep(previewStep)
    : null;

  useEffect(() => {
    setPreviewIndex(0);
    setPreviewPlaying(false);
  }, [selectedId]);

  useEffect(() => {
    if (previewIndex > previewMax) setPreviewIndex(previewMax);
  }, [previewMax, previewIndex]);

  // Lightweight auto-advance: linger per step duration, no game runtime.
  useEffect(() => {
    if (!previewPlaying || previewSteps.length === 0) return;
    const step = previewSteps[previewIndex];
    if (!step) {
      setPreviewPlaying(false);
      return;
    }
    const ms = Math.max(200, previewStepDurationMs(step));
    const timer = setTimeout(() => {
      if (previewIndex >= previewSteps.length - 1) {
        setPreviewPlaying(false);
        return;
      }
      setPreviewIndex((i) => i + 1);
    }, ms);
    return () => clearTimeout(timer);
  }, [previewPlaying, previewIndex, previewSteps.length, selectedId]);

  const setCutscenes = (next: Record<string, JsonPackCutscene>) => {
    onChange({ ...doc, cutscenes: next });
  };

  const addCutscene = () => {
    const id = suggestId(newName, `cutscene_${ids.length + 1}`);
    if (cutscenes[id]) {
      toastFail("Id exists");
      return;
    }
    setCutscenes({
      ...cutscenes,
      [id]: { id, title: newName.trim() || id, skippable: true, steps: [] },
    });
    setSelectedId(id);
  };

  const patchSelected = (patch: Partial<JsonPackCutscene>) => {
    if (!selectedId || !selected) return;
    setCutscenes({
      ...cutscenes,
      [selectedId]: { ...selected, ...patch, id: selectedId },
    });
  };

  const addStep = () => {
    if (!selected || !selectedId) return;
    const step = buildCutsceneStepFromForm({
      op: stepOp,
      msg,
      speaker,
      waitMs,
      walkX,
      walkY,
      waitForWalk,
      soundKey,
      musicKey: musicStepKey,
      flag: flagStep,
      sayText,
      sayActorId,
      sayVoiceKey,
      sayLipSyncKey,
      waitForSpeech,
      juicePreset,
      cameraPanX,
      cameraPanY,
      cameraZoom,
      cameraFollow,
      labelName,
      gotoLabel,
      parallelWalkX,
      parallelWalkY,
      parallelSayText,
      parallelSayActorId,
    });
    if (!step) {
      toastFail("Incomplete step", "Fill required fields for this op.");
      return;
    }
    patchSelected({ steps: [...(selected.steps ?? []), step] });
  };

  const showJuice =
    stepOp === "message" || stepOp === "wait" || stepOp === "sayLine";

  return (
    <section className="border border-game-border bg-game-ui/90 p-4 space-y-3">
      <div>
        <h3 className="pixel-font text-sm text-accent">Cutscenes</h3>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          Timeline form: message / wait / walk / say / camera / parallel /
          label. Trigger with action{" "}
          <code className="text-accent">{`{ "op": "cutscene", "id": "…" }`}</code>
          , a one-shot <strong className="font-normal text-foreground">flag</strong>{" "}
          below, or play from the cheats panel. Flag triggers clear the flag after
          firing — use dedicated keys like <code className="text-accent">play_intro</code>,
          not puzzle flags.
        </p>
      </div>

      <div className="border border-border/60 p-3 space-y-2">
        <p className="pixel-font text-[10px] text-accent">Flag → cutscene</p>
        <ul className="text-xs space-y-1 max-h-24 overflow-y-auto">
          {Object.keys(flagCutscenes).length === 0 && (
            <li className="text-muted-foreground">None yet.</li>
          )}
          {Object.entries(flagCutscenes).map(([flag, cid]) => (
            <li
              key={flag}
              className="flex justify-between gap-2 border border-border/40 px-2 py-1"
            >
              <span>
                <code className="text-accent">{flag}</code> → {cid}
              </span>
              <button
                type="button"
                className="text-destructive"
                onClick={() => {
                  const next = { ...flagCutscenes };
                  delete next[flag];
                  onChange({
                    ...doc,
                    flagCutscenes: Object.keys(next).length ? next : undefined,
                  });
                }}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
        <div className="grid sm:grid-cols-2 gap-2">
          <label className="block text-xs space-y-1">
            <span className="text-muted-foreground">Flag</span>
            <input
              className="w-full bg-background border border-border px-2 py-2 font-mono text-[11px]"
              value={flagTrigger}
              onChange={(e) => setFlagTrigger(e.target.value)}
              placeholder="play_intro"
            />
          </label>
          <label className="block text-xs space-y-1">
            <span className="text-muted-foreground">Cutscene</span>
            <select
              className="w-full bg-background border border-border px-2 py-2 min-h-[36px]"
              value={flagCutsceneId}
              onChange={(e) => setFlagCutsceneId(e.target.value)}
            >
              {ids.length === 0 && <option value="">Add a cutscene first</option>}
              {ids.map((id) => (
                <option key={id} value={id}>
                  {cutscenes[id]?.title || id}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button
          type="button"
          className="pixel-font text-[10px] min-h-[36px] px-2 border border-accent text-accent"
          disabled={!flagTrigger.trim() || !flagCutsceneId}
          onClick={() => {
            const flag = flagTrigger.trim();
            if (!flag || !flagCutsceneId) return;
            onChange({
              ...doc,
              flagCutscenes: { ...flagCutscenes, [flag]: flagCutsceneId },
              initialFlags: {
                ...(doc.initialFlags ?? {}),
                [flag]: doc.initialFlags?.[flag] ?? false,
              },
            });
            toastOk("Flag trigger added", `${flag} → ${flagCutsceneId}`);
          }}
        >
          Bind flag
        </button>
      </div>

      <div className="border border-border/60 p-3 space-y-2">
        <p className="pixel-font text-[10px] text-accent">From template</p>
        <select
          className="w-full bg-background border border-border px-2 py-2 text-xs min-h-[36px]"
          value={templateId}
          onChange={(e) =>
            setTemplateId(e.target.value as CutsceneTemplateId)
          }
        >
          {CUTSCENE_TEMPLATES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title} — {t.blurb}
            </option>
          ))}
        </select>
        {templateId === "escape" && (
          <select
            className="w-full bg-background border border-border px-2 py-2 text-xs"
            value={escapeTo}
            onChange={(e) => setEscapeTo(e.target.value)}
          >
            <option value="">Exit unlocks → (pick room)</option>
            {Object.keys(doc.rooms)
              .filter((id) => id !== (roomId || doc.startRoom))
              .map((id) => (
                <option key={id} value={id}>
                  {doc.rooms[id]?.name || id}
                </option>
              ))}
          </select>
        )}
        <button
          type="button"
          className="pixel-font text-[10px] min-h-[36px] px-2 border-2 border-accent text-accent"
          onClick={() => {
            const result = applyCutsceneTemplate(doc, {
              templateId,
              roomId: roomId || doc.startRoom,
              exitTo: escapeTo || undefined,
              line: msg.trim() || undefined,
              speaker: speaker.trim() || undefined,
              walkX,
              walkY,
            });
            onChange(result.doc);
            setSelectedId(result.cutsceneId);
            toastOk("Cutscene template applied", result.message);
          }}
        >
          Apply template
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {ids.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setSelectedId(id)}
            className={`pixel-font text-[10px] min-h-[36px] px-2 border ${
              id === selectedId
                ? "border-accent text-accent"
                : "border-game-border"
            }`}
          >
            {cutscenes[id]?.title || id}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          className="flex-1 bg-background border border-border px-2 py-2 min-h-[40px] text-xs"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Cutscene id"
        />
        <button
          type="button"
          onClick={addCutscene}
          className="pixel-font text-xs min-h-[40px] px-3 border-2 border-accent text-accent"
        >
          Add
        </button>
      </div>

      {selected && selectedId && (
        <div className="space-y-3 border-t border-border pt-3">
          <div className="flex flex-wrap justify-between gap-2">
            <label className="block text-xs space-y-1 flex-1">
              <span className="text-muted-foreground">Title</span>
              <input
                className="w-full bg-background border border-border px-2 py-2"
                value={selected.title || ""}
                onChange={(e) => patchSelected({ title: e.target.value })}
              />
            </label>
            <label className="flex items-end gap-2 text-xs pb-2">
              <input
                type="checkbox"
                checked={selected.skippable !== false}
                onChange={(e) => patchSelected({ skippable: e.target.checked })}
              />
              Skippable
            </label>
            <button
              type="button"
              className="text-xs text-destructive self-end min-h-[36px]"
              onClick={() => {
                const next = { ...cutscenes };
                delete next[selectedId];
                setCutscenes(next);
                setSelectedId(Object.keys(next)[0] ?? null);
              }}
            >
              Delete
            </button>
          </div>

          <ol className="space-y-1 text-xs max-h-40 overflow-y-auto">
            {(selected.steps ?? []).length === 0 && (
              <li className="text-muted-foreground">No steps yet.</li>
            )}
            {(selected.steps ?? []).map((s, i) => (
              <li
                key={i}
                className={`flex justify-between gap-2 border px-2 py-1 ${
                  i === previewIndex
                    ? "border-accent bg-accent/10"
                    : "border-border/40"
                }`}
              >
                <button
                  type="button"
                  className="text-left flex-1 min-w-0"
                  onClick={() => {
                    setPreviewPlaying(false);
                    setPreviewIndex(i);
                  }}
                  title="Preview this step"
                >
                  <span className="text-accent">{s.op}</span>
                  {" · "}
                  {summarizeStep(s)}
                </button>
                <span className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    className="text-muted-foreground disabled:opacity-30"
                    disabled={i === 0}
                    title="Move up"
                    onClick={() =>
                      patchSelected({
                        steps: moveCutsceneStep(
                          selected.steps ?? [],
                          i,
                          -1
                        ),
                      })
                    }
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="text-muted-foreground disabled:opacity-30"
                    disabled={i === (selected.steps ?? []).length - 1}
                    title="Move down"
                    onClick={() =>
                      patchSelected({
                        steps: moveCutsceneStep(
                          selected.steps ?? [],
                          i,
                          1
                        ),
                      })
                    }
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="text-destructive"
                    onClick={() =>
                      patchSelected({
                        steps: (selected.steps ?? []).filter((_, j) => j !== i),
                      })
                    }
                  >
                    ✕
                  </button>
                </span>
              </li>
            ))}
          </ol>

          {previewSteps.length > 0 && (
            <div className="border border-accent/40 bg-black/20 p-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="pixel-font text-[10px] text-accent">
                  Preview scrubber
                </p>
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    className="pixel-font text-[9px] min-h-[28px] px-2 border border-game-border disabled:opacity-40"
                    disabled={previewIndex <= 0}
                    onClick={() => {
                      setPreviewPlaying(false);
                      setPreviewIndex((i) => Math.max(0, i - 1));
                    }}
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    className="pixel-font text-[9px] min-h-[28px] px-2 border border-game-border disabled:opacity-40"
                    disabled={previewIndex >= previewMax}
                    onClick={() => {
                      setPreviewPlaying(false);
                      setPreviewIndex((i) => Math.min(previewMax, i + 1));
                    }}
                  >
                    Next
                  </button>
                  <button
                    type="button"
                    className={`pixel-font text-[9px] min-h-[28px] px-2 border ${
                      previewPlaying
                        ? "border-accent text-accent bg-accent/15"
                        : "border-accent text-accent"
                    }`}
                    onClick={() => {
                      if (previewPlaying) {
                        setPreviewPlaying(false);
                        return;
                      }
                      if (previewIndex >= previewMax) setPreviewIndex(0);
                      setPreviewPlaying(true);
                    }}
                  >
                    {previewPlaying ? "Stop" : "Play preview"}
                  </button>
                </div>
              </div>
              <label className="block text-[10px] space-y-1">
                <span className="text-muted-foreground">
                  Step {previewIndex + 1} / {previewSteps.length}
                </span>
                <input
                  type="range"
                  className="w-full"
                  min={0}
                  max={previewMax}
                  value={Math.min(previewIndex, previewMax)}
                  onChange={(e) => {
                    setPreviewPlaying(false);
                    setPreviewIndex(Number(e.target.value) || 0);
                  }}
                />
              </label>
              {previewSummary && (
                <div className="text-xs space-y-1 border border-border/50 px-2 py-2 bg-background/40">
                  <p>
                    <span className="pixel-font text-[10px] text-accent">
                      {previewSummary.op}
                    </span>{" "}
                    <span className="text-foreground/90">
                      {previewSummary.line}
                    </span>
                  </p>
                  <ul className="text-[11px] text-muted-foreground space-y-0.5">
                    {previewSummary.text != null && (
                      <li>
                        Text:{" "}
                        <span className="text-foreground/80">
                          {previewSummary.text}
                        </span>
                      </li>
                    )}
                    {previewSummary.walk != null && (
                      <li>
                        Walk:{" "}
                        <span className="text-foreground/80">
                          {previewSummary.walk}
                        </span>
                      </li>
                    )}
                    {previewSummary.camera != null && (
                      <li>
                        Camera:{" "}
                        <span className="text-foreground/80">
                          {previewSummary.camera}
                        </span>
                      </li>
                    )}
                    {previewSummary.waitMs != null && (
                      <li>
                        Wait:{" "}
                        <span className="text-foreground/80">
                          {previewSummary.waitMs}ms
                        </span>
                      </li>
                    )}
                  </ul>
                  <p className="text-[10px] text-muted-foreground">
                    Lightweight strip only — no full game runtime.
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-2 border border-border/60 p-3">
            <label className="block text-xs space-y-1 sm:col-span-2">
              <span className="text-muted-foreground">Add step</span>
              <select
                className="w-full bg-background border border-border px-2 py-2 min-h-[36px]"
                value={stepOp}
                onChange={(e) =>
                  setStepOp(e.target.value as CutsceneStepFormOp)
                }
              >
                {STEP_OPS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            {stepOp === "message" && (
              <>
                <label className="block text-xs space-y-1 sm:col-span-2">
                  <span className="text-muted-foreground">Text</span>
                  <input
                    className="w-full bg-background border border-border px-2 py-2"
                    value={msg}
                    onChange={(e) => setMsg(e.target.value)}
                  />
                </label>
                <label className="block text-xs space-y-1 sm:col-span-2">
                  <span className="text-muted-foreground">Speaker</span>
                  <input
                    className="w-full bg-background border border-border px-2 py-2"
                    value={speaker}
                    onChange={(e) => setSpeaker(e.target.value)}
                  />
                </label>
              </>
            )}
            {stepOp === "wait" && (
              <label className="block text-xs space-y-1 sm:col-span-2">
                <span className="text-muted-foreground">Milliseconds</span>
                <input
                  type="number"
                  className="w-full bg-background border border-border px-2 py-2"
                  value={waitMs}
                  onChange={(e) => setWaitMs(Number(e.target.value) || 0)}
                />
              </label>
            )}
            {stepOp === "walk" && (
              <>
                <label className="block text-xs space-y-1">
                  <span className="text-muted-foreground">X %</span>
                  <input
                    type="number"
                    className="w-full bg-background border border-border px-2 py-2"
                    value={walkX}
                    onChange={(e) => setWalkX(Number(e.target.value) || 0)}
                  />
                </label>
                <label className="block text-xs space-y-1">
                  <span className="text-muted-foreground">Y %</span>
                  <input
                    type="number"
                    className="w-full bg-background border border-border px-2 py-2"
                    value={walkY}
                    onChange={(e) => setWalkY(Number(e.target.value) || 0)}
                  />
                </label>
                <label className="flex items-center gap-2 text-xs sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={waitForWalk}
                    onChange={(e) => setWaitForWalk(e.target.checked)}
                  />
                  Wait for walk to finish
                </label>
              </>
            )}
            {stepOp === "sound" && (
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
            {stepOp === "setFlag" && (
              <label className="block text-xs space-y-1 sm:col-span-2">
                <span className="text-muted-foreground">Flag to set true</span>
                <input
                  className="w-full bg-background border border-border px-2 py-2 font-mono text-[11px]"
                  value={flagStep}
                  onChange={(e) => setFlagStep(e.target.value)}
                />
              </label>
            )}
            {stepOp === "music" && (
              <label className="block text-xs space-y-1 sm:col-span-2">
                <span className="text-muted-foreground">Music cue key</span>
                <input
                  className="w-full bg-background border border-border px-2 py-2 font-mono text-[11px]"
                  value={musicStepKey}
                  onChange={(e) => setMusicStepKey(e.target.value)}
                  list="pack-music-cues"
                />
                <datalist id="pack-music-cues">
                  {Object.keys(doc.audio?.music ?? {}).map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </label>
            )}
            {stepOp === "sayLine" && (
              <>
                <label className="block text-xs space-y-1 sm:col-span-2">
                  <span className="text-muted-foreground">Line</span>
                  <input
                    className="w-full bg-background border border-border px-2 py-2"
                    value={sayText}
                    onChange={(e) => setSayText(e.target.value)}
                  />
                </label>
                <label className="block text-xs space-y-1">
                  <span className="text-muted-foreground">Actor id</span>
                  <input
                    className="w-full bg-background border border-border px-2 py-2 font-mono text-[11px]"
                    value={sayActorId}
                    onChange={(e) => setSayActorId(e.target.value)}
                  />
                </label>
                <label className="block text-xs space-y-1">
                  <span className="text-muted-foreground">Voice key</span>
                  <input
                    className="w-full bg-background border border-border px-2 py-2 font-mono text-[11px]"
                    value={sayVoiceKey}
                    onChange={(e) => setSayVoiceKey(e.target.value)}
                    placeholder="optional pack audio.voice key"
                  />
                </label>
                <label className="flex items-center gap-2 text-xs sm:col-span-2">
                  <input
                    type="checkbox"
                    checked={waitForSpeech}
                    onChange={(e) => setWaitForSpeech(e.target.checked)}
                  />
                  Wait for speech to finish
                </label>
                <label className="block text-xs space-y-1 sm:col-span-2">
                  <span className="text-muted-foreground">
                    Lip-sync / mouth cues key (optional)
                  </span>
                  <input
                    className="w-full bg-background border border-border px-2 py-2 font-mono text-[11px]"
                    value={sayLipSyncKey}
                    onChange={(e) => setSayLipSyncKey(e.target.value)}
                    placeholder="e.g. lip.intro.line1 — mouth cue JSON stays in pack data"
                  />
                  <span className="text-[10px] text-muted-foreground leading-relaxed">
                    Note: Rhubarb mouth cue timelines are authored on dialogue /
                    VO tooling; this field stores a lipSyncKey pass-through for
                    the sayLine beat.
                  </span>
                </label>
              </>
            )}
            {stepOp === "camera" && (
              <>
                <label className="block text-xs space-y-1">
                  <span className="text-muted-foreground">Pan X %</span>
                  <input
                    type="number"
                    className="w-full bg-background border border-border px-2 py-2"
                    value={cameraPanX}
                    onChange={(e) =>
                      setCameraPanX(Number(e.target.value) || 0)
                    }
                  />
                </label>
                <label className="block text-xs space-y-1">
                  <span className="text-muted-foreground">Pan Y %</span>
                  <input
                    type="number"
                    className="w-full bg-background border border-border px-2 py-2"
                    value={cameraPanY}
                    onChange={(e) =>
                      setCameraPanY(Number(e.target.value) || 0)
                    }
                  />
                </label>
                <label className="block text-xs space-y-1">
                  <span className="text-muted-foreground">Zoom</span>
                  <input
                    type="number"
                    step="0.05"
                    className="w-full bg-background border border-border px-2 py-2"
                    value={cameraZoom}
                    onChange={(e) =>
                      setCameraZoom(Number(e.target.value) || 1)
                    }
                  />
                </label>
                <label className="block text-xs space-y-1">
                  <span className="text-muted-foreground">
                    Follow actor id
                  </span>
                  <input
                    className="w-full bg-background border border-border px-2 py-2 font-mono text-[11px]"
                    value={cameraFollow}
                    onChange={(e) => setCameraFollow(e.target.value)}
                    placeholder="player — or null / - to clear"
                  />
                </label>
              </>
            )}
            {stepOp === "label" && (
              <label className="block text-xs space-y-1 sm:col-span-2">
                <span className="text-muted-foreground">Label name</span>
                <input
                  className="w-full bg-background border border-border px-2 py-2 font-mono text-[11px]"
                  value={labelName}
                  onChange={(e) => setLabelName(e.target.value)}
                />
              </label>
            )}
            {stepOp === "goto" && (
              <label className="block text-xs space-y-1 sm:col-span-2">
                <span className="text-muted-foreground">Goto label</span>
                <input
                  className="w-full bg-background border border-border px-2 py-2 font-mono text-[11px]"
                  value={gotoLabel}
                  onChange={(e) => setGotoLabel(e.target.value)}
                />
              </label>
            )}
            {stepOp === "parallel" && (
              <>
                <label className="block text-xs space-y-1">
                  <span className="text-muted-foreground">Walk X %</span>
                  <input
                    type="number"
                    className="w-full bg-background border border-border px-2 py-2"
                    value={parallelWalkX}
                    onChange={(e) =>
                      setParallelWalkX(Number(e.target.value) || 0)
                    }
                  />
                </label>
                <label className="block text-xs space-y-1">
                  <span className="text-muted-foreground">Walk Y %</span>
                  <input
                    type="number"
                    className="w-full bg-background border border-border px-2 py-2"
                    value={parallelWalkY}
                    onChange={(e) =>
                      setParallelWalkY(Number(e.target.value) || 0)
                    }
                  />
                </label>
                <label className="block text-xs space-y-1 sm:col-span-2">
                  <span className="text-muted-foreground">Say line</span>
                  <input
                    className="w-full bg-background border border-border px-2 py-2"
                    value={parallelSayText}
                    onChange={(e) => setParallelSayText(e.target.value)}
                  />
                </label>
                <label className="block text-xs space-y-1 sm:col-span-2">
                  <span className="text-muted-foreground">Say actor id</span>
                  <input
                    className="w-full bg-background border border-border px-2 py-2 font-mono text-[11px]"
                    value={parallelSayActorId}
                    onChange={(e) => setParallelSayActorId(e.target.value)}
                  />
                </label>
              </>
            )}
            {showJuice && (
              <label className="block text-xs space-y-1 sm:col-span-2">
                <span className="text-muted-foreground">
                  Juice preset (optional)
                </span>
                <select
                  className="w-full bg-background border border-border px-2 py-2 min-h-[36px]"
                  value={juicePreset}
                  onChange={(e) =>
                    setJuicePreset(
                      (e.target.value || "") as JuicePresetId | ""
                    )
                  }
                >
                  <option value="">None</option>
                  {JUICE_PRESETS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button
              type="button"
              onClick={addStep}
              className="pixel-font text-[10px] min-h-[36px] px-3 border border-accent text-accent sm:col-span-2"
            >
              Add step
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function summarizeStep(s: JsonPackCutsceneStep): string {
  switch (s.op) {
    case "message":
      return s.text.slice(0, 48);
    case "wait":
      return `${s.ms}ms${s.juice ? " · juice" : ""}`;
    case "walk":
      return `${s.x},${s.y}${s.waitForWalk === false ? " · no-wait" : ""}`;
    case "sound":
      return s.key;
    case "setFlag":
      return s.flag;
    case "music":
      return s.key;
    case "sayLine":
      return s.text.slice(0, 48);
    case "camera": {
      const bits: string[] = [];
      if (s.pan) bits.push(`pan ${s.pan.x},${s.pan.y}`);
      if (s.zoom != null) bits.push(`z${s.zoom}`);
      if (s.follow !== undefined)
        bits.push(s.follow === null ? "unfollow" : `→${s.follow}`);
      return bits.join(" · ") || "camera";
    }
    case "label":
      return s.name;
    case "goto":
      return s.label;
    case "parallel": {
      const bits: string[] = [];
      if (s.walk) bits.push(`walk ${s.walk.x},${s.walk.y}`);
      if (s.sayLine?.text) bits.push(s.sayLine.text.slice(0, 32));
      return bits.join(" + ") || "parallel";
    }
    case "juice":
      return s.preset || "juice";
    default:
      return "";
  }
}
