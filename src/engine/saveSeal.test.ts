import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSaveAdapter } from "./save";
import { createEmptyJsonPack, createGameFromJson } from "./jsonPack";
import { createInitialState } from "./state";
import { sanitizePlayState } from "./stateIntegrity";
import {
  __setSaveIntegrityKeyTestOverride,
  sealTag,
} from "./deployLock";

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
}

describe("sealed saves", () => {
  beforeEach(() => {
    stubLocalStorage();
  });

  afterEach(() => {
    __setSaveIntegrityKeyTestOverride(null);
    vi.unstubAllGlobals();
  });

  it("writes sealed envelope and rejects tampered payload", () => {
    __setSaveIntegrityKeyTestOverride("unit-test-key");
    const def = createGameFromJson(
      createEmptyJsonPack({ id: "seal-game", title: "Seal" })
    );
    const adapter = createSaveAdapter("seal-game", 3, {
      contentVersion: def.version,
      sanitizeState: (s) => sanitizePlayState(s, def),
    });
    const state = createInitialState(def);
    adapter.saveGame(1, state, "Start");

    const raw = localStorage.getItem("adventure_seal-game_save_1");
    expect(raw).toBeTruthy();
    const sealed = JSON.parse(raw!);
    expect(sealed.format).toBe("adventure-save-sealed-v1");
    expect(sealed.tag).toBe(sealTag(sealed.payload, "unit-test-key"));

    const loaded = adapter.loadGame(1);
    expect(loaded?.data.currentLocation).toBe(def.startRoom);

    sealed.payload = sealed.payload.replace(
      `"currentLocation":"${def.startRoom}"`,
      `"currentLocation":"hacked"`
    );
    localStorage.setItem("adventure_seal-game_save_1", JSON.stringify(sealed));
    // New adapter rehydrates from localStorage (in-memory cache would still be clean)
    const adapter2 = createSaveAdapter("seal-game", 3, {
      contentVersion: def.version,
      sanitizeState: (s) => sanitizePlayState(s, def),
    });
    expect(adapter2.loadGame(1)).toBeNull();
  });

  it("sanitizeState clamps forged room on load", () => {
    const def = createGameFromJson(
      createEmptyJsonPack({ id: "clamp", title: "Clamp" })
    );
    const adapter = createSaveAdapter("clamp", 3, {
      contentVersion: def.version,
      sanitizeState: (s) => sanitizePlayState(s, def),
    });
    const state = createInitialState(def);
    adapter.saveGame(1, { ...state, currentLocation: "nope" }, "X");
    const loaded = adapter.loadGame(1);
    expect(loaded?.data.currentLocation).toBe(def.startRoom);
  });
});
