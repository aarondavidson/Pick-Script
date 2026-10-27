/**
 * Build JsonPackCutsceneStep values from Studio form fields.
 * Used by PackCutscenesPanel and compile-focused tests.
 */

import type { JuicePresetId } from "@/engine/juice";
import type { JsonPackCutsceneStep } from "@/engine/jsonPack";

export type CutsceneStepFormOp = JsonPackCutsceneStep["op"];

export interface CutsceneStepForm {
  op: CutsceneStepFormOp;
  /** message */
  msg?: string;
  speaker?: string;
  /** wait */
  waitMs?: number;
  /** walk */
  walkX?: number;
  walkY?: number;
  walkActorId?: string;
  waitForWalk?: boolean;
  /** sound / music / setFlag */
  soundKey?: string;
  musicKey?: string;
  flag?: string;
  /** sayLine */
  sayText?: string;
  sayActorId?: string;
  sayVoiceKey?: string;
  sayLipSyncKey?: string;
  waitForSpeech?: boolean;
  /** juice on message / wait / sayLine */
  juicePreset?: JuicePresetId | "";
  /** camera */
  cameraPanX?: number;
  cameraPanY?: number;
  cameraZoom?: number;
  cameraFollow?: string;
  /** label / goto */
  labelName?: string;
  gotoLabel?: string;
  /** parallel (walk + say simplified) */
  parallelWalkX?: number;
  parallelWalkY?: number;
  parallelSayText?: string;
  parallelSayActorId?: string;
}

function juiceField(
  preset: JuicePresetId | "" | undefined
): { juice: JuicePresetId } | Record<string, never> {
  return preset ? { juice: preset } : {};
}

/**
 * Convert Studio form state → a single pack cutscene step, or null if incomplete.
 */
export function buildCutsceneStepFromForm(
  form: CutsceneStepForm
): JsonPackCutsceneStep | null {
  switch (form.op) {
    case "message": {
      const text = form.msg?.trim();
      if (!text) return null;
      return {
        op: "message",
        text,
        speaker: form.speaker?.trim() || undefined,
        ...juiceField(form.juicePreset),
      };
    }
    case "wait":
      return {
        op: "wait",
        ms: Math.max(0, form.waitMs ?? 0),
        ...juiceField(form.juicePreset),
      };
    case "walk":
      return {
        op: "walk",
        x: form.walkX ?? 50,
        y: form.walkY ?? 75,
        actorId: form.walkActorId?.trim() || undefined,
        waitForWalk: form.waitForWalk !== false,
      };
    case "sound": {
      const key = form.soundKey?.trim();
      if (!key) return null;
      return { op: "sound", key };
    }
    case "setFlag": {
      const flag = form.flag?.trim();
      if (!flag) return null;
      return { op: "setFlag", flag, value: true };
    }
    case "music": {
      const key = form.musicKey?.trim();
      if (!key) return null;
      return { op: "music", key };
    }
    case "sayLine": {
      const text = form.sayText?.trim();
      if (!text) return null;
      return {
        op: "sayLine",
        text,
        actorId: form.sayActorId?.trim() || undefined,
        ...(form.sayVoiceKey?.trim()
          ? { voiceKey: form.sayVoiceKey.trim() }
          : {}),
        ...(form.sayLipSyncKey?.trim()
          ? { lipSyncKey: form.sayLipSyncKey.trim() }
          : {}),
        waitForSpeech: form.waitForSpeech !== false,
        ...juiceField(form.juicePreset),
      };
    }
    case "camera": {
      const hasPan =
        typeof form.cameraPanX === "number" &&
        typeof form.cameraPanY === "number" &&
        Number.isFinite(form.cameraPanX) &&
        Number.isFinite(form.cameraPanY);
      const hasZoom =
        typeof form.cameraZoom === "number" &&
        Number.isFinite(form.cameraZoom) &&
        form.cameraZoom > 0;
      const followRaw = form.cameraFollow?.trim();
      const hasFollow = !!followRaw;
      if (!hasPan && !hasZoom && !hasFollow) return null;
      return {
        op: "camera",
        ...(hasPan
          ? { pan: { x: form.cameraPanX!, y: form.cameraPanY! } }
          : {}),
        ...(hasZoom ? { zoom: form.cameraZoom } : {}),
        ...(hasFollow
          ? {
              follow:
                followRaw === "null" || followRaw === "-"
                  ? null
                  : followRaw,
            }
          : {}),
      };
    }
    case "label": {
      const name = form.labelName?.trim();
      if (!name) return null;
      return { op: "label", name };
    }
    case "goto": {
      const label = form.gotoLabel?.trim();
      if (!label) return null;
      return { op: "goto", label };
    }
    case "parallel": {
      const sayText = form.parallelSayText?.trim();
      const hasWalk =
        typeof form.parallelWalkX === "number" &&
        typeof form.parallelWalkY === "number" &&
        Number.isFinite(form.parallelWalkX) &&
        Number.isFinite(form.parallelWalkY);
      if (!hasWalk && !sayText) return null;
      return {
        op: "parallel",
        ...(hasWalk
          ? {
              walk: {
                x: form.parallelWalkX!,
                y: form.parallelWalkY!,
              },
            }
          : {}),
        ...(sayText
          ? {
              sayLine: {
                text: sayText,
                actorId: form.parallelSayActorId?.trim() || undefined,
              },
            }
          : {}),
      };
    }
    case "juice": {
      const preset = form.juicePreset;
      if (!preset) return null;
      return { op: "juice", preset };
    }
    default:
      return null;
  }
}

/** Reorder a step list (used by the timeline UI). */
export function moveCutsceneStep(
  steps: JsonPackCutsceneStep[],
  index: number,
  delta: -1 | 1
): JsonPackCutsceneStep[] {
  const j = index + delta;
  if (j < 0 || j >= steps.length) return steps;
  const next = steps.slice();
  const tmp = next[index]!;
  next[index] = next[j]!;
  next[j] = tmp;
  return next;
}
