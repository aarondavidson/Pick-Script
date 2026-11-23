import { describe, expect, it } from "vitest";
import {
  MAX_CUTSCENE_LINE_VISITS,
  advanceCutscene,
  cutsceneLineReadyToAdvance,
  findCutsceneLabelIndex,
  flagsSetByRemainingLines,
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

describe("flagsSetByRemainingLines (skipping a cutscene)", () => {
  it("collects the flags later lines set, following goto, with the last value winning", () => {
    const def: CutsceneDef = {
      id: "skippable",
      lines: [
        { text: "one", setFlag: { flag: "already_set" } },
        { text: "two", setFlag: { flag: "door_open" }, goto: "end" },
        { text: "never reached", setFlag: { flag: "unreached" } },
        { text: "three", label: "end", setFlag: { flag: "door_open", value: false } },
        { text: "four", setFlag: { flag: "finale" } },
      ],
    };
    expect(flagsSetByRemainingLines(startCutscene(def))).toEqual({
      door_open: false,
      finale: true,
    });
  });

  it("starts from the line being shown when the player skips", () => {
    const def: CutsceneDef = {
      id: "midway",
      lines: [
        { text: "one", setFlag: { flag: "first" } },
        { text: "two", setFlag: { flag: "second" } },
        { text: "three", setFlag: { flag: "third" } },
      ],
    };
    const atSecondLine = advanceCutscene(startCutscene(def))!;
    expect(flagsSetByRemainingLines(atSecondLine)).toEqual({ third: true });
  });

  it("is empty on the last line", () => {
    const def: CutsceneDef = { id: "short", lines: [{ text: "only", setFlag: { flag: "done" } }] };
    expect(flagsSetByRemainingLines(startCutscene(def))).toEqual({});
  });

  it("ends on a looping cutscene, as playing it would", () => {
    const def: CutsceneDef = {
      id: "loop",
      lines: [
        { text: "a", label: "top" },
        { text: "b", setFlag: { flag: "looped" }, goto: "top" },
      ],
    };
    expect(flagsSetByRemainingLines(startCutscene(def))).toEqual({ looped: true });
  });

  it("picks up setFlag steps from JSON pack cutscenes", () => {
    const cutscenes = compilePackCutscenes({
      gate: {
        id: "gate",
        steps: [
          { op: "message", text: "The gate creaks." },
          { op: "message", text: "It swings open." },
          { op: "setFlag", flag: "gate_open" },
        ],
      },
    });
    expect(flagsSetByRemainingLines(startCutscene(cutscenes.gate!))).toEqual({
      gate_open: true,
    });
  });
});
