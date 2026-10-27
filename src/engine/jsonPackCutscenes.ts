/**
 * Compile JSON pack cutscenes and hints.
 */

import type { CutsceneDef, CutsceneLine } from "./cutscene";
import {
  clampCutsceneDurationMs,
  sanitizeCutsceneLabel,
} from "./cutscene";
import { clampCameraDurationMs } from "./camera";
import type { HintDef } from "./hints";
import { sanitizeJuiceCue } from "./juice";
import { isSafeIdentifierKey } from "./security";
import type {
  JsonPackCutscene,
  JsonPackCutsceneStep,
  JsonPackHint,
} from "./jsonPackTypes";

const MAX_CUTSCENE_STEPS = 1024;

function safeToken(raw: unknown, max = 64): string | undefined {
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  return isSafeIdentifierKey(trimmed, max) ? trimmed : undefined;
}

function finiteCoord(raw: unknown, fallback: number): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(1000, Math.max(-1000, n));
}

function stepJuice(
  step: JsonPackCutsceneStep
): Pick<CutsceneLine, "juice"> {
  if (!("juice" in step) && step.op !== "juice") return {};
  const raw =
    step.op === "juice"
      ? step
      : "juice" in step
        ? step.juice
        : undefined;
  const juice = sanitizeJuiceCue(raw);
  return juice ? { juice } : {};
}

function syncFields(
  step: JsonPackCutsceneStep
): Pick<CutsceneLine, "label" | "goto" | "waitForSpeech" | "waitForWalk"> {
  const label =
    step.op === "label"
      ? sanitizeCutsceneLabel(step.name)
      : sanitizeCutsceneLabel(
          "label" in step && step.op !== "goto" ? step.label : undefined
        );
  const goto =
    step.op === "goto"
      ? sanitizeCutsceneLabel(step.label)
      : sanitizeCutsceneLabel("goto" in step ? step.goto : undefined);
  return {
    ...(label ? { label } : {}),
    ...(goto ? { goto } : {}),
    ...("waitForSpeech" in step && step.waitForSpeech
      ? { waitForSpeech: true }
      : {}),
    ...("waitForWalk" in step && step.waitForWalk
      ? { waitForWalk: true }
      : {}),
  };
}

/** Compile declarative cutscene steps → CutsceneDef lines. */
export function compilePackCutscenes(
  raw: Record<string, JsonPackCutscene>
): Record<string, CutsceneDef> {
  const out: Record<string, CutsceneDef> = {};
  for (const [key, cs] of Object.entries(raw)) {
    if (!cs || typeof cs !== "object") continue;
    const id = safeToken(cs.id || key);
    if (!id) continue;
    const lines: CutsceneLine[] = [];
    for (const step of (cs.steps ?? []).slice(0, MAX_CUTSCENE_STEPS)) {
      if (!step || typeof step !== "object" || !("op" in step)) continue;
      const sync = syncFields(step);
      switch (step.op) {
        case "message":
          if (!step.text?.trim()) break;
          lines.push({
            text: step.text.trim().slice(0, 4_000),
            speaker:
              typeof step.speaker === "string"
                ? step.speaker.trim().slice(0, 80)
                : undefined,
            ...(typeof step.durationMs === "number"
              ? { durationMs: clampCutsceneDurationMs(step.durationMs) }
              : {}),
            ...stepJuice(step),
            ...sync,
          });
          break;
        case "wait":
          lines.push({
            text: "",
            durationMs: clampCutsceneDurationMs(step.ms),
            ...stepJuice(step),
            ...sync,
          });
          break;
        case "juice": {
          const juice = sanitizeJuiceCue(step);
          if (!juice) break;
          lines.push({
            text: "",
            durationMs:
              typeof step.durationMs === "number" &&
              Number.isFinite(step.durationMs)
                ? Math.max(0, Math.min(4000, step.durationMs))
                : 80,
            juice,
            ...sync,
          });
          break;
        }
        case "walk":
          lines.push({
            text: "",
            durationMs: 900,
            walkTo: {
              x: finiteCoord(step.x, 50),
              y: finiteCoord(step.y, 75),
              actorId: safeToken(step.actorId),
            },
            waitForWalk: step.waitForWalk !== false,
            ...sync,
          });
          break;
        case "sound": {
          const soundKey = safeToken(step.key);
          if (!soundKey) break;
          lines.push({
            text: "",
            durationMs: 200,
            sound: soundKey,
            ...sync,
          });
          break;
        }
        case "setFlag": {
          const flag = safeToken(step.flag);
          if (!flag) break;
          lines.push({
            text: "",
            durationMs: 50,
            setFlag: { flag, value: step.value !== false },
            ...sync,
          });
          break;
        }
        case "music": {
          const musicKey = safeToken(step.key);
          if (!musicKey) break;
          lines.push({
            text: "",
            durationMs: 80,
            music: musicKey,
            ...sync,
          });
          break;
        }
        case "sayLine": {
          const text = step.text?.trim();
          if (!text) break;
          const durationMs =
            typeof step.durationMs === "number" &&
            Number.isFinite(step.durationMs)
              ? Math.max(400, Math.min(12000, step.durationMs))
              : 2800;
          const voiceKey = step.voiceKey?.trim();
          const lipSyncKey = step.lipSyncKey?.trim();
          lines.push({
            text: "",
            durationMs,
            speaker:
              typeof step.speaker === "string"
                ? step.speaker.trim().slice(0, 80)
                : undefined,
            waitForSpeech: step.waitForSpeech !== false,
            sayLine: {
              text: text.slice(0, 4_000),
              actorId: safeToken(step.actorId),
              durationMs,
              ...(voiceKey ? { voiceKey } : {}),
              ...(step.mouthCues?.length
                ? { mouthCues: step.mouthCues.slice(0, 64) }
                : {}),
              ...(lipSyncKey ? { lipSyncKey } : {}),
            },
            ...stepJuice(step),
            ...sync,
          });
          break;
        }
        case "camera": {
          const pan = step.pan;
          const hasPan =
            pan &&
            typeof pan.x === "number" &&
            typeof pan.y === "number" &&
            Number.isFinite(pan.x) &&
            Number.isFinite(pan.y);
          const hasZoom =
            typeof step.zoom === "number" && Number.isFinite(step.zoom);
          const follow =
            step.follow === undefined
              ? undefined
              : step.follow === null
                ? null
                : safeToken(step.follow) ?? null;
          const hasFollow = follow !== undefined;
          if (!hasPan && !hasZoom && !hasFollow) break;
          const beatMs = clampCutsceneDurationMs(
            (typeof pan?.durationMs === "number" && pan.durationMs) ||
              (typeof step.zoomDurationMs === "number" &&
                step.zoomDurationMs) ||
              400,
            400
          );
          lines.push({
            text: "",
            durationMs: Math.max(80, beatMs),
            camera: {
              ...(hasPan
                ? {
                    pan: {
                      x: pan!.x,
                      y: pan!.y,
                      ...(typeof pan!.durationMs === "number"
                        ? {
                            durationMs: clampCameraDurationMs(pan!.durationMs),
                          }
                        : {}),
                    },
                  }
                : {}),
              ...(hasZoom ? { zoom: step.zoom } : {}),
              ...(typeof step.zoomDurationMs === "number"
                ? {
                    zoomDurationMs: clampCameraDurationMs(
                      step.zoomDurationMs
                    ),
                  }
                : {}),
              ...(hasFollow ? { follow } : {}),
            },
            ...sync,
          });
          break;
        }
        case "parallel": {
          const sayText = step.sayLine?.text?.trim();
          const hasWalk = !!step.walk;
          if (!hasWalk && !sayText) break;
          const durationMs =
            typeof step.durationMs === "number" &&
            Number.isFinite(step.durationMs)
              ? Math.max(0, Math.min(12000, step.durationMs))
              : sayText
                ? typeof step.sayLine?.durationMs === "number"
                  ? Math.max(
                      400,
                      Math.min(12000, step.sayLine.durationMs)
                    )
                  : 2800
                : 900;
          const voiceKey = step.sayLine?.voiceKey?.trim();
          const lipSyncKey = step.sayLine?.lipSyncKey?.trim();
          lines.push({
            text: "",
            durationMs,
            speaker: step.sayLine?.speaker,
            ...(hasWalk
              ? {
                  walkTo: {
                    x: finiteCoord(step.walk!.x, 50),
                    y: finiteCoord(step.walk!.y, 75),
                    actorId: safeToken(step.walk!.actorId),
                  },
                  waitForWalk: true,
                }
              : {}),
            ...(sayText
              ? {
                  waitForSpeech: true,
                  sayLine: {
                    text: sayText.slice(0, 4_000),
                    actorId: safeToken(step.sayLine?.actorId),
                    durationMs,
                    ...(voiceKey ? { voiceKey } : {}),
                    ...(step.sayLine?.mouthCues?.length
                      ? { mouthCues: step.sayLine.mouthCues.slice(0, 64) }
                      : {}),
                    ...(lipSyncKey ? { lipSyncKey } : {}),
                  },
                }
              : {}),
            ...stepJuice(step),
            ...sync,
          });
          break;
        }
        case "label": {
          const name = sanitizeCutsceneLabel(step.name);
          if (!name) break;
          lines.push({ text: "", durationMs: 0, label: name });
          break;
        }
        case "goto": {
          const target = sanitizeCutsceneLabel(step.label);
          if (!target) break;
          lines.push({ text: "", durationMs: 0, goto: target });
          break;
        }
        default:
          break;
      }
    }
    if (!lines.length) {
      lines.push({ text: "…" });
    }
    out[id] = {
      id,
      lines,
      skippable: cs.skippable !== false,
    };
  }
  return out;
}

/** Compile JSON hints → HintDef with flag conditions. */
export function compilePackHints(hints: JsonPackHint[]): HintDef[] {
  return hints
    .filter((h) => h?.id?.trim() && h.title?.trim() && h.tiers?.length)
    .map((h) => {
      const id = h.id.trim();
      const until = h.untilFlag?.trim();
      const require = h.requireFlag?.trim();
      const hotspotId = h.hotspotId?.trim();
      return {
        id,
        title: h.title.trim(),
        tiers: h.tiers.map((t) => String(t)).filter(Boolean).slice(0, 5),
        condition: (state) => {
          if (require && !state.flags[require]) return false;
          if (until && state.flags[until]) return false;
          return true;
        },
        completed: until
          ? (state) => !!state.flags[until]
          : undefined,
        ...(hotspotId ? { hotspotId } : {}),
      };
    });
}
