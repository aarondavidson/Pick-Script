import { describe, expect, it } from "vitest";
import { compilePackCutscenes } from "./jsonPack";

describe("compilePackCutscenes richer ops", () => {
  it("compiles setFlag, music, and sayLine steps", () => {
    const cutscenes = compilePackCutscenes({
      beat: {
        id: "beat",
        steps: [
          { op: "music", key: "beacon" },
          { op: "sayLine", text: "Almost there.", actorId: "player" },
          { op: "setFlag", flag: "reached_beacon", value: true },
          { op: "message", text: "The fog lifts." },
        ],
      },
    });
    const lines = cutscenes.beat!.lines;
    expect(lines[0]?.music).toBe("beacon");
    expect(lines[1]?.sayLine?.text).toBe("Almost there.");
    expect(lines[1]?.sayLine?.actorId).toBe("player");
    expect(lines[2]?.setFlag).toEqual({
      flag: "reached_beacon",
      value: true,
    });
    expect(lines[3]?.text).toBe("The fog lifts.");
  });

  it("compiles camera pan/zoom/follow steps", () => {
    const cutscenes = compilePackCutscenes({
      cam: {
        id: "cam",
        steps: [
          {
            op: "camera",
            pan: { x: 80, y: 40, durationMs: 400 },
            zoom: 1.5,
            follow: null,
          },
        ],
      },
    });
    expect(cutscenes.cam!.lines[0]?.camera).toEqual({
      pan: { x: 80, y: 40, durationMs: 400 },
      zoom: 1.5,
      follow: null,
    });
  });
});
