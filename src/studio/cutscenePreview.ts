/**
 * Lightweight cutscene step summaries + preview timing (Studio scrubber).
 * No AdventureProvider / runtime — pure helpers only.
 */

import type { JsonPackCutsceneStep } from "@/engine/jsonPack";

export interface CutscenePreviewSummary {
  op: string;
  /** One-line human summary */
  line: string;
  /** Highlight fields for the scrubber card */
  text?: string;
  walk?: string;
  camera?: string;
  waitMs?: number;
}

/** Estimate how long the lightweight auto-preview should linger on a step. */
export function previewStepDurationMs(step: JsonPackCutsceneStep): number {
  switch (step.op) {
    case "wait":
      return Math.max(0, Math.min(step.ms, 8000));
    case "message":
    case "sayLine": {
      const len = step.text?.length ?? 0;
      return Math.min(4000, Math.max(900, 40 * len));
    }
    case "walk":
      return step.waitForWalk === false ? 400 : 1200;
    case "camera":
      return step.pan?.durationMs
        ? Math.min(4000, Math.max(400, step.pan.durationMs))
        : 700;
    case "parallel":
      return 1400;
    case "label":
    case "goto":
      return 350;
    default:
      return 600;
  }
}

/** Summarize a pack cutscene step for the Studio preview strip. */
export function summarizeCutscenePreviewStep(
  step: JsonPackCutsceneStep
): CutscenePreviewSummary {
  switch (step.op) {
    case "message":
      return {
        op: "message",
        line: step.speaker
          ? `${step.speaker}: ${step.text}`
          : step.text,
        text: step.text,
      };
    case "wait":
      return {
        op: "wait",
        line: `Wait ${step.ms}ms`,
        waitMs: step.ms,
      };
    case "walk":
      return {
        op: "walk",
        line: `Walk to ${step.x}%, ${step.y}%`,
        walk: `${step.x}, ${step.y}${
          step.waitForWalk === false ? " (no wait)" : ""
        }`,
      };
    case "camera": {
      const bits: string[] = [];
      if (step.pan) bits.push(`pan ${step.pan.x},${step.pan.y}`);
      if (step.zoom != null) bits.push(`zoom ${step.zoom}`);
      if (step.follow !== undefined) {
        bits.push(step.follow === null ? "unfollow" : `follow ${step.follow}`);
      }
      const camera = bits.join(" · ") || "camera";
      return { op: "camera", line: camera, camera };
    }
    case "sayLine":
      return {
        op: "sayLine",
        line: step.text,
        text: step.text,
      };
    case "sound":
      return { op: "sound", line: `Sound ${step.key}` };
    case "music":
      return { op: "music", line: `Music ${step.key}` };
    case "setFlag":
      return { op: "setFlag", line: `Flag ${step.flag}` };
    case "label":
      return { op: "label", line: `Label ${step.name}` };
    case "goto":
      return { op: "goto", line: `Goto ${step.label}` };
    case "parallel": {
      const bits: string[] = [];
      if (step.walk) bits.push(`walk ${step.walk.x},${step.walk.y}`);
      if (step.sayLine?.text) bits.push(step.sayLine.text);
      return {
        op: "parallel",
        line: bits.join(" + ") || "parallel",
        text: step.sayLine?.text,
        walk: step.walk
          ? `${step.walk.x}, ${step.walk.y}`
          : undefined,
      };
    }
    case "juice":
      return { op: "juice", line: step.preset || "juice" };
    default:
      return { op: "unknown", line: "" };
  }
}
