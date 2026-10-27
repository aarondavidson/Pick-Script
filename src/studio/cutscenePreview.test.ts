import { describe, expect, it } from "vitest";
import {
  previewStepDurationMs,
  summarizeCutscenePreviewStep,
} from "./cutscenePreview";

describe("cutscenePreview", () => {
  it("summarizes text, walk, camera, and wait", () => {
    expect(
      summarizeCutscenePreviewStep({
        op: "message",
        text: "Hello",
        speaker: "Narrator",
      })
    ).toMatchObject({
      op: "message",
      text: "Hello",
      line: "Narrator: Hello",
    });

    expect(
      summarizeCutscenePreviewStep({ op: "wait", ms: 800 })
    ).toMatchObject({ op: "wait", waitMs: 800, line: "Wait 800ms" });

    expect(
      summarizeCutscenePreviewStep({ op: "walk", x: 40, y: 75 })
    ).toMatchObject({
      op: "walk",
      walk: "40, 75",
    });

    expect(
      summarizeCutscenePreviewStep({
        op: "camera",
        pan: { x: 50, y: 30 },
        zoom: 1.2,
        follow: "player",
      })
    ).toMatchObject({
      op: "camera",
      camera: "pan 50,30 · zoom 1.2 · follow player",
    });
  });

  it("estimates preview durations", () => {
    expect(previewStepDurationMs({ op: "wait", ms: 1200 })).toBe(1200);
    expect(previewStepDurationMs({ op: "wait", ms: 99999 })).toBe(8000);
    expect(
      previewStepDurationMs({ op: "message", text: "Hi" })
    ).toBeGreaterThanOrEqual(900);
    expect(
      previewStepDurationMs({ op: "walk", x: 10, y: 10, waitForWalk: false })
    ).toBe(400);
  });
});
