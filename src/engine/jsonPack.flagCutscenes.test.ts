import { describe, expect, it } from "vitest";
import {
  createEmptyJsonPack,
  createGameFromJson,
} from "@/engine/jsonPack";

describe("jsonPack flagCutscenes + transitions", () => {
  it("compiles flagCutscenes and room transitions", () => {
    const pack = createEmptyJsonPack({
      id: "fc",
      title: "FC",
      cutscenes: {
        intro: {
          id: "intro",
          title: "Intro",
          steps: [{ op: "message", text: "Hello" }],
        },
      },
      flagCutscenes: { play_intro: "intro" },
      defaultTransition: { kind: "slide-left", durationMs: 200 },
      rooms: {
        start: {
          id: "start",
          name: "Start",
          image: "",
          transitionIn: { kind: "fade", durationMs: 300 },
          transitionOut: { kind: "none" },
        },
      },
    });
    const def = createGameFromJson(pack);
    expect(def.flagCutscenes?.play_intro).toBe("intro");
    expect(def.defaultTransition?.kind).toBe("slide-left");
    expect(def.rooms.start?.transitionIn?.kind).toBe("fade");
    expect(def.rooms.start?.transitionOut?.kind).toBe("none");
  });
});
