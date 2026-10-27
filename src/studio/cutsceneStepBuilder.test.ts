import { describe, expect, it } from "vitest";
import { compilePackCutscenes } from "@/engine/jsonPackCutscenes";
import {
  buildCutsceneStepFromForm,
  moveCutsceneStep,
  type CutsceneStepForm,
} from "@/studio/cutsceneStepBuilder";
import type { JsonPackCutsceneStep } from "@/engine/jsonPack";

describe("buildCutsceneStepFromForm → compilePackCutscenes", () => {
  it("compiles a UI-built timeline of richer steps", () => {
    const forms: CutsceneStepForm[] = [
      { op: "label", labelName: "start" },
      {
        op: "message",
        msg: "The door creaks.",
        speaker: "Narrator",
        juicePreset: "light",
      },
      { op: "wait", waitMs: 400, juicePreset: "medium" },
      {
        op: "walk",
        walkX: 30,
        walkY: 70,
        waitForWalk: true,
      },
      {
        op: "sayLine",
        sayText: "Anyone home?",
        sayActorId: "player",
        waitForSpeech: true,
        sayLipSyncKey: "line_anyone",
      },
      {
        op: "camera",
        cameraPanX: 55,
        cameraPanY: 40,
        cameraZoom: 1.25,
        cameraFollow: "player",
      },
      {
        op: "parallel",
        parallelWalkX: 60,
        parallelWalkY: 72,
        parallelSayText: "Coming through.",
        parallelSayActorId: "player",
      },
      { op: "goto", gotoLabel: "start" },
    ];

    const steps = forms
      .map((f) => buildCutsceneStepFromForm(f))
      .filter((s): s is JsonPackCutsceneStep => s != null);

    expect(steps).toHaveLength(forms.length);

    const cutscenes = compilePackCutscenes({
      beat: { id: "beat", steps },
    });
    const lines = cutscenes.beat!.lines;

    expect(lines[0]?.label).toBe("start");
    expect(lines[1]?.text).toBe("The door creaks.");
    expect(lines[1]?.juice).toBeTruthy();
    expect(lines[2]?.durationMs).toBe(400);
    expect(lines[2]?.juice).toBeTruthy();
    expect(lines[3]?.walkTo).toMatchObject({ x: 30, y: 70 });
    expect(lines[3]?.waitForWalk).toBe(true);
    expect(lines[4]?.sayLine?.text).toBe("Anyone home?");
    expect(lines[4]?.sayLine?.lipSyncKey).toBe("line_anyone");
    expect(lines[4]?.waitForSpeech).toBe(true);
    expect(lines[5]?.camera).toMatchObject({
      pan: { x: 55, y: 40 },
      zoom: 1.25,
      follow: "player",
    });
    expect(lines[6]?.walkTo).toMatchObject({ x: 60, y: 72 });
    expect(lines[6]?.sayLine?.text).toBe("Coming through.");
    expect(lines[6]?.waitForWalk).toBe(true);
    expect(lines[6]?.waitForSpeech).toBe(true);
    expect(lines[7]?.goto).toBe("start");
  });

  it("reorders steps without dropping entries", () => {
    const steps: JsonPackCutsceneStep[] = [
      { op: "wait", ms: 100 },
      { op: "wait", ms: 200 },
      { op: "wait", ms: 300 },
    ];
    expect(moveCutsceneStep(steps, 0, 1).map((s) => (s as { ms: number }).ms)).toEqual([
      200, 100, 300,
    ]);
  });
});
