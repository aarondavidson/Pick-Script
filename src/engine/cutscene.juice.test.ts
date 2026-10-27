import { describe, expect, it } from "vitest";
import { compilePackCutscenes } from "./jsonPackCutscenes";
import { sanitizeJuiceCue } from "./juice";
import type { CutsceneLine } from "./cutscene";

describe("cutscene line juice", () => {
  it("compiles dedicated juice step onto CutsceneLine", () => {
    const cutscenes = compilePackCutscenes({
      hit: {
        id: "hit",
        steps: [
          { op: "juice", preset: "heavy" },
          { op: "message", text: "Boom.", juice: "success" },
        ],
      },
    });
    const lines = cutscenes.hit!.lines;
    expect(lines[0]?.juice).toEqual(sanitizeJuiceCue("heavy"));
    expect(lines[1]?.text).toBe("Boom.");
    expect(lines[1]?.juice).toEqual(sanitizeJuiceCue("success"));
  });

  it("CutsceneLine accepts JuiceCue | JuicePresetId", () => {
    const line: CutsceneLine = {
      text: "",
      juice: "pickup",
    };
    expect(sanitizeJuiceCue(line.juice)?.burst).toBe("pickup");
  });
});
