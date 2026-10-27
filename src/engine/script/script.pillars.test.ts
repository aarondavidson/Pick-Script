import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  integerScaleFactor,
  pixelBackgroundStyle,
  resolveCursorState,
  getFlag,
  setFlag,
  getVar,
  setVar,
  findWalkPath,
  createSaveAdapter,
  DEFAULT_NATIVE_SIZE,
} from "./index";
import type { GameState } from "../types";

function bareState(partial: Partial<GameState> = {}): GameState {
  return {
    currentLocation: "start",
    inventory: [],
    flags: {},
    objectStates: {},
    dialogueState: {},
    gameComplete: false,
    journalEntries: [],
    achievements: [],
    quests: [],
    visitedLocations: ["start"],
    egoId: "player",
    actors: {},
    camera: { x: 50, y: 50, followActorId: null },
    activeScripts: [],
    actorInventories: {},
    hintProgress: {},
    ...partial,
  };
}

function stubLocalStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
  });
  return store;
}

describe("S.C.R.I.P.T. pillars", () => {
  beforeEach(() => {
    stubLocalStorage();
  });

  it("pixel scaler: integer factor and crisp CSS", () => {
    expect(DEFAULT_NATIVE_SIZE).toEqual({ width: 640, height: 360 });
    expect(integerScaleFactor(1280, 720)).toBe(2);
    expect(integerScaleFactor(700, 400)).toBe(1);
    expect(pixelBackgroundStyle({ crisp: true }).imageRendering).toBe(
      "pixelated"
    );
    expect(pixelBackgroundStyle({}).imageRendering).toBe("auto");
  });

  it("cursor machine: verb, item, locked", () => {
    expect(
      resolveCursorState({
        selectedVerb: "look",
        selectedCombineItem: null,
      }).mode
    ).toBe("look");

    const item = {
      id: "key",
      name: "Key",
      description: "A key",
    };
    const withItem = resolveCursorState({
      selectedVerb: "use",
      selectedCombineItem: item,
    });
    expect(withItem.mode).toBe("item");
    expect(withItem.label).toMatch(/Key/);

    expect(
      resolveCursorState({
        selectedVerb: null,
        selectedCombineItem: null,
        inputLocked: true,
      }).mode
    ).toBe("locked");
  });

  it("state store: flags and vars", () => {
    let state = bareState();
    const flagPatch = setFlag(state, "gotKey", true);
    state = { ...state, flags: flagPatch.flags! };
    expect(getFlag(state, "gotKey")).toBe(true);

    const varPatch = setVar(state, "score", 3);
    state = { ...state, vars: varPatch.vars };
    expect(getVar(state, "score")).toBe(3);
  });

  it("walkmasks: path through adjacent boxes", () => {
    const boxes = [
      { id: "a", x: 0, y: 50, width: 40, height: 40 },
      { id: "b", x: 40, y: 50, width: 40, height: 40 },
    ];
    const path = findWalkPath({ x: 10, y: 70 }, { x: 70, y: 70 }, boxes);
    expect(path.length).toBeGreaterThan(0);
    expect(path[path.length - 1].x).toBeCloseTo(70, 0);
  });

  it("save system: adapter creates slots", () => {
    const save = createSaveAdapter("script-pillar-test", 2, {
      contentVersion: "1.0.0",
    });
    const state = bareState({ flags: { a: true } });
    save.saveGame(1, state, "slot1");
    const loaded = save.loadGame(1);
    expect(loaded?.data.flags.a).toBe(true);
  });
});
