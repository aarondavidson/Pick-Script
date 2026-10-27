import { describe, expect, it } from "vitest";
import {
  MAX_CUTSCENE_LINE_VISITS,
  advanceCutscene,
  cutsceneLineReadyToAdvance,
  findCutsceneLabelIndex,
  sanitizeCutsceneLabel,
  startCutscene,
  type CutsceneDef,
} from "./cutscene";
import { compilePackCutscenes } from "./jsonPackCutscenes";

describe("cutscene goto / labels", () => {
  it("sanitizeCutsceneLabel rejects unsafe keys", () => {
    expect(sanitizeCutsceneLabel("loop_a")).toBe("loop_a");
    expect(sanitizeCutsceneLabel("__proto__")).toBeUndefined();
    expect(sanitizeCutsceneLabel("")).toBeUndefined();
  });

  it("advanceCutscene jumps to goto label", () => {
    const def: CutsceneDef = {
      id: "loop",
      lines: [
        { text: "Hi", label: "start" },
        { text: "Again", goto: "start" },
        { text: "Done" },
      ],
    };
    let rt = startCutscene(def);
    expect(rt.lineIndex).toBe(0);
    rt = advanceCutscene(rt)!;
    expect(rt.lineIndex).toBe(1);
    rt = advanceCutscene(rt)!;
    expect(rt.lineIndex).toBe(0);
    expect(findCutsceneLabelIndex(def, "start")).toBe(0);
  });

  it("ends a self-goto loop after the visit cap", () => {
    const def: CutsceneDef = {
      id: "spin",
      skippable: false,
      lines: [{ text: "", durationMs: 1, label: "loop", goto: "loop" }],
    };
    let rt = startCutscene(def);
    for (let i = 0; i < MAX_CUTSCENE_LINE_VISITS; i++) {
      const next = advanceCutscene(rt);
      expect(next).not.toBeNull();
      rt = next!;
      expect(rt.lineIndex).toBe(0);
    }
    expect(advanceCutscene(rt)).toBeNull();
  });

  it("unknown goto falls through to next line", () => {
    const def: CutsceneDef = {
      id: "miss",
      lines: [
        { text: "A", goto: "missing" },
        { text: "B" },
      ],
    };
    const next = advanceCutscene(startCutscene(def));
    expect(next?.lineIndex).toBe(1);
  });
});

describe("cutscene wait readiness", () => {
  it("waits for speech and walk before ready", () => {
    const line = {
      text: "",
      durationMs: 100,
      waitForSpeech: true,
      waitForWalk: true,
      walkTo: { x: 10, y: 10 },
      sayLine: { text: "Hey", durationMs: 500 },
    };
    expect(
      cutsceneLineReadyToAdvance(line, {
        durationElapsed: false,
        speechDone: false,
        walkDone: false,
      })
    ).toBe(false);
    expect(
      cutsceneLineReadyToAdvance(line, {
        durationElapsed: true,
        speechDone: false,
        walkDone: true,
      })
    ).toBe(false);
    expect(
      cutsceneLineReadyToAdvance(line, {
        durationElapsed: true,
        speechDone: true,
        walkDone: false,
      })
    ).toBe(false);
    expect(
      cutsceneLineReadyToAdvance(line, {
        durationElapsed: true,
        speechDone: true,
        walkDone: true,
      })
    ).toBe(true);
  });

  it("duration-only lines advance when elapsed", () => {
    const line = { text: "", durationMs: 200 };
    expect(
      cutsceneLineReadyToAdvance(line, {
        durationElapsed: false,
        speechDone: true,
        walkDone: true,
      })
    ).toBe(false);
    expect(
      cutsceneLineReadyToAdvance(line, {
        durationElapsed: true,
        speechDone: true,
        walkDone: true,
      })
    ).toBe(true);
  });

  it("player-click lines (no duration/waits) never auto-ready", () => {
    expect(
      cutsceneLineReadyToAdvance(
        { text: "Click me" },
        { durationElapsed: true, speechDone: true, walkDone: true }
      )
    ).toBe(false);
  });
});

describe("compilePackCutscenes timeline sync", () => {
  it("wires waitForWalk / waitForSpeech and parallel + goto/label", () => {
    const cutscenes = compilePackCutscenes({
      beat: {
        id: "beat",
        steps: [
          { op: "label", name: "intro" },
          {
            op: "parallel",
            walk: { x: 20, y: 70 },
            sayLine: { text: "Moving!", durationMs: 1000 },
          },
          { op: "walk", x: 40, y: 70 },
          { op: "sayLine", text: "Stopped." },
          { op: "goto", label: "intro" },
        ],
      },
    });
    const lines = cutscenes.beat!.lines;
    expect(lines[0]?.label).toBe("intro");
    expect(lines[1]?.walkTo).toEqual({ x: 20, y: 70, actorId: undefined });
    expect(lines[1]?.sayLine?.text).toBe("Moving!");
    expect(lines[1]?.waitForWalk).toBe(true);
    expect(lines[1]?.waitForSpeech).toBe(true);
    expect(lines[2]?.waitForWalk).toBe(true);
    expect(lines[3]?.waitForSpeech).toBe(true);
    expect(lines[4]?.goto).toBe("intro");
  });
});
