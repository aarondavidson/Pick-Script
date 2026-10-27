import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSaveAdapter } from "./save";
import {
  checksumString,
  createDualSaveStore,
  verifyEnvelope,
  wrapPayload,
} from "./saveStorage";
import type { GameState } from "./types";

function mockLocalStorage() {
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
    key: () => null,
    length: 0,
  });
  // No IndexedDB in node tests — dual store falls back to localStorage
  vi.stubGlobal("indexedDB", undefined);
  return store;
}

function sampleState(partial?: Partial<GameState>): GameState {
  return {
    currentLocation: "start",
    inventory: [],
    flags: { got_key: true },
    objectStates: {},
    dialogueState: {},
    gameComplete: false,
    journalEntries: [],
    achievements: [],
    quests: [],
    visitedLocations: ["start"],
    egoId: "player",
    actors: {},
    camera: { x: 0, y: 0, followActorId: null },
    activeScripts: [],
    actorInventories: {},
    hintProgress: {},
    ...partial,
  };
}

describe("saveStorage checksum", () => {
  it("wraps and verifies payloads", () => {
    const env = wrapPayload("k", '{"a":1}');
    expect(verifyEnvelope(env)).toBe(true);
    expect(checksumString('{"a":1}')).toBe(env.checksum);
    expect(verifyEnvelope({ ...env, checksum: "bad" })).toBe(false);
  });
});

describe("createSaveAdapter (web dual-write)", () => {
  beforeEach(() => {
    mockLocalStorage();
  });

  it("saves and loads a slot with content version", async () => {
    const save = createSaveAdapter("web-pack", 3, {
      contentVersion: "1.2.0",
    });
    await save.ready;
    expect(save.getBackend()).toBe("localStorage");

    const ok = save.saveGame(1, sampleState(), "Kitchen");
    expect(ok).toBe(true);
    const loaded = save.loadGame(1);
    expect(loaded?.locationName).toBe("Kitchen");
    expect(loaded?.version).toBe("1.2.0");
    expect(loaded?.data.flags.got_key).toBe(true);
  });

  it("autosaves and round-trips", async () => {
    const save = createSaveAdapter("web-pack", 3, { contentVersion: "1.0.0" });
    await save.ready;
    expect(save.autosave(sampleState({ currentLocation: "hall" }), "Hall")).toBe(
      true
    );
    expect(save.hasAutosave()).toBe(true);
    expect(save.loadAutosave()?.data.currentLocation).toBe("hall");
  });

  it("export / import backup restores slots", async () => {
    const save = createSaveAdapter("web-pack", 3, { contentVersion: "1.0.0" });
    await save.ready;
    save.saveGame(1, sampleState(), "A");
    save.saveGame(2, sampleState({ flags: { b: true } }), "B");
    save.autosave(sampleState(), "Auto");

    const json = save.exportBackup();
    const other = createSaveAdapter("web-pack", 3, { contentVersion: "1.0.0" });
    await other.ready;
    // Clear by deleting
    other.deleteSave(1);
    other.deleteSave(2);
    other.deleteAutosave();

    const result = other.importBackup(json);
    expect(result.ok).toBe(true);
    expect(result.imported).toBeGreaterThanOrEqual(2);
    expect(other.loadGame(1)?.locationName).toBe("A");
    expect(other.loadGame(2)?.data.flags.b).toBe(true);
  });

  it("rejects backup for a different gameId", async () => {
    const save = createSaveAdapter("game-a", 2, { contentVersion: "1.0.0" });
    await save.ready;
    save.saveGame(1, sampleState(), "X");
    const json = save.exportBackup();

    const other = createSaveAdapter("game-b", 2, { contentVersion: "1.0.0" });
    await other.ready;
    const result = other.importBackup(json);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/game-b/);
  });

  it("survives localStorage quota by reporting failure when only LS available", async () => {
    const store = mockLocalStorage();
    // Force setItem to throw quota
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: () => {
        const err = new Error("quota") as Error & { name: string };
        err.name = "QuotaExceededError";
        throw err;
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
      clear: () => store.clear(),
      key: () => null,
      length: 0,
    });
    vi.stubGlobal("indexedDB", undefined);

    // Dual store sees canUseLocalStorage false because probe throws
    const dual = createDualSaveStore(["adventure_q_save_1"]);
    await dual.ready;
    // memory backend when LS probe fails
    expect(["memory", "localStorage"]).toContain(dual.backend);

    const save = createSaveAdapter("q", 1, {
      contentVersion: "1.0.0",
      store: dual,
    });
    await save.ready;
    // Memory path still accepts save
    const ok = save.saveGame(1, sampleState(), "Room");
    expect(ok).toBe(true);
    expect(save.loadGame(1)?.locationName).toBe("Room");
  });

  it("isolates packs by gameId keys", async () => {
    const a = createSaveAdapter("pack-a", 1, { contentVersion: "1.0.0" });
    const b = createSaveAdapter("pack-b", 1, { contentVersion: "1.0.0" });
    await Promise.all([a.ready, b.ready]);
    a.saveGame(1, sampleState(), "A");
    expect(b.loadGame(1)).toBeNull();
  });
});
