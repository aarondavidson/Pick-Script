import { describe, expect, it, vi } from "vitest";
import { createGame } from "./createGame";
import type { GameDefinition } from "./definition";
import { MAX_SCRIPT_COMMANDS_PER_TICK, startScript, tickScripts } from "./scriptRunner";
import { templateGame } from "@/games/_template/manifest";

const pack: GameDefinition = {
  ...templateGame,
  namedScripts: {
    // Loops forever with no wait/breakHere
    spin: { id: "spin", loop: true, commands: [{ op: "patch", patch: {} }] },
    polite: {
      id: "polite",
      loop: true,
      commands: [{ op: "patch", patch: {} }, { op: "breakHere" }],
    },
  },
};

describe("tickScripts runaway guard", () => {
  it("caps commands per frame and warns once in dev", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const initial = createGame(pack).createInitialState();
    let state = startScript(initial, "spin", pack).state;
    state = tickScripts(state, pack, 0, 16).state;
    state = tickScripts(state, pack, 16, 16).state;

    // Still active (yielded, not killed) and warned only once
    expect(state.activeScripts?.some((s) => s.id === "spin")).toBe(true);
    const runaway = warn.mock.calls.filter((c) => String(c[0]).includes('"spin"'));
    expect(runaway).toHaveLength(1);
    expect(String(runaway[0][0])).toContain(String(MAX_SCRIPT_COMMANDS_PER_TICK));
    warn.mockRestore();
  });

  it("does not warn for loops that yield", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const initial = createGame(pack).createInitialState();
    const state = startScript(initial, "polite", pack).state;
    tickScripts(state, pack, 0, 16);
    expect(warn.mock.calls.some((c) => String(c[0]).includes('"polite"'))).toBe(false);
    warn.mockRestore();
  });
});
