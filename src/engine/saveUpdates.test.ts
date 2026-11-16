/**
 * Saves across pack + engine updates: migration order, failed migrators,
 * new content reconciliation, and stale-copy hydration.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createGame } from "./createGame";
import { createEmptyJsonPack, createGameFromJson } from "./jsonPack";
import { createSaveAdapter } from "./save";
import { createDualSaveStore, payloadTimestamp } from "./saveStorage";
import { createInitialState } from "./state";
import { reconcileStateWithDefinition } from "./stateIntegrity";
import { ENGINE_VERSION } from "./version";
import type { GameDefinition } from "./definition";
import type { GameState } from "./types";

let ls: Map<string, string>;

beforeEach(() => {
  ls = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => ls.get(k) ?? null,
    setItem: (k: string, v: string) => {
      ls.set(k, v);
    },
    removeItem: (k: string) => {
      ls.delete(k);
    },
  });
  vi.stubGlobal("indexedDB", undefined);
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function pack(version: string, extra?: Partial<GameDefinition>): GameDefinition {
  const def = createGameFromJson(
    createEmptyJsonPack({
      id: "update-game",
      title: "Update",
      version,
      rooms: {
        start: { id: "start", name: "Start", image: "", hotspots: [] },
        basement: { id: "basement", name: "Basement", image: "", hotspots: [] },
      },
    })
  );
  return { ...def, ...extra };
}

/** Write a v1.0.0 save whose state the current pack would not produce. */
function writeOldSave(state: Partial<GameState>) {
  const v1 = pack("1.0.0");
  ls.set(
    "adventure_update-game_save_1",
    JSON.stringify({
      slot: 1,
      gameId: "update-game",
      data: { ...createInitialState(v1), ...state },
      timestamp: 1000,
      locationName: "Old",
      version: "1.0.0",
    })
  );
}

describe("save migration across pack updates", () => {
  it("runs migrateSave before clamping, so renamed rooms can be mapped", () => {
    writeOldSave({
      currentLocation: "cellar",
      visitedLocations: ["start", "cellar"],
    });
    const seen: string[] = [];
    const runtime = createGame(
      pack("1.1.0", {
        migrateSave: (state) => {
          seen.push(state.currentLocation);
          const rename = (id: string) => (id === "cellar" ? "basement" : id);
          return {
            ...state,
            currentLocation: rename(state.currentLocation),
            visitedLocations: state.visitedLocations.map(rename),
          };
        },
      })
    );
    const slot = runtime.save.loadGame(1);
    expect(seen).toEqual(["cellar"]);
    expect(slot?.incompatible).toBeFalsy();
    expect(slot?.data.currentLocation).toBe("basement");
    expect(slot?.data.visitedLocations).toEqual(["start", "basement"]);
    expect(slot?.version).toBe("1.1.0");
  });

  it("still clamps what the migrator returns", () => {
    writeOldSave({});
    const runtime = createGame(
      pack("1.1.0", {
        migrateSave: (state) => ({ ...state, currentLocation: "nowhere" }),
      })
    );
    expect(runtime.save.loadGame(1)?.data.currentLocation).toBe("start");
  });

  it("keeps the slot visible but unloadable when migrateSave throws", () => {
    writeOldSave({});
    const runtime = createGame(
      pack("1.1.0", {
        migrateSave: () => {
          throw new Error("boom");
        },
      })
    );
    const slot = runtime.save.loadGame(1);
    expect(slot).not.toBeNull();
    expect(slot?.incompatible).toBe(true);
    expect(runtime.save.hasSaves()).toBe(true);
  });

  it("rejects saves whose gameId does not match, even malformed ids", () => {
    const adapter = createSaveAdapter("update-game", 3);
    for (const gameId of ["other-game", "not a safe id!", 42]) {
      ls.set(
        "adventure_update-game_save_1",
        JSON.stringify({ gameId, data: createInitialState(pack("1.0.0")) })
      );
      expect(createSaveAdapter("update-game", 3).loadGame(1)).toBeNull();
    }
    expect(adapter.saveSlots).toBe(3);
  });

  it("rejects saves whose data is not an object", () => {
    for (const data of ["text", [1, 2], 7]) {
      ls.set(
        "adventure_update-game_save_1",
        JSON.stringify({ gameId: "update-game", data })
      );
      expect(createSaveAdapter("update-game", 3).loadGame(1)).toBeNull();
    }
  });

  it("stamps the engine version on written saves", () => {
    const runtime = createGame(pack("1.0.0"));
    runtime.save.saveGame(1, runtime.createInitialState(), "Start");
    const raw = JSON.parse(ls.get("adventure_update-game_save_1")!);
    expect(raw.engineVersion).toBe(ENGINE_VERSION);
    expect(raw.version).toBe("1.0.0");
  });
});

describe("reconcileStateWithDefinition", () => {
  const withProgress = (version: string, extraAch = false) =>
    pack(version, {
      achievements: [
        { id: "first", title: "First steps", description: "Start", icon: "⭐" },
        ...(extraAch
          ? [{ id: "new", title: "New one", description: "Added", icon: "🎉" }]
          : []),
      ],
      quests: [
        {
          id: "main",
          title: extraAch ? "Main quest (reworded)" : "Main quest",
          description: "Do it",
          objectives: ["a", "b"],
        },
      ],
    } as Partial<GameDefinition>);

  it("adds achievements from a pack update and keeps progress", () => {
    const v1 = withProgress("1.0.0");
    const old = createInitialState(v1);
    old.achievements[0] = { ...old.achievements[0], unlocked: true, timestamp: 5 };
    old.quests[0] = { ...old.quests[0], completedObjectives: [0, 9] };

    const next = reconcileStateWithDefinition(old, withProgress("1.1.0", true));
    expect(next.achievements.map((a) => a.id)).toEqual(["first", "new"]);
    expect(next.achievements[0]).toMatchObject({ unlocked: true, timestamp: 5 });
    expect(next.achievements[1].unlocked).toBe(false);
    expect(next.quests[0].title).toBe("Main quest (reworded)");
    // out-of-range objective index is dropped
    expect(next.quests[0].completedObjectives).toEqual([0]);
  });

  it("fills initial flags the save has never seen without overriding", () => {
    const v2 = pack("1.1.0", {
      initialFlags: { lights_on: true, door_open: true },
    });
    const old = { ...createInitialState(pack("1.0.0")), flags: { door_open: false } };
    const next = reconcileStateWithDefinition(old, v2);
    expect(next.flags).toEqual({ lights_on: true, door_open: false });
  });

  it("adds instances for new actors and repairs a removed ego", () => {
    const v2 = pack("1.1.0", {
      egoId: "hero",
      actors: {
        hero: { id: "hero", name: "Hero" },
        cat: { id: "cat", name: "Cat" },
      },
    } as Partial<GameDefinition>);
    const old = { ...createInitialState(pack("1.0.0")), egoId: "ghost", actors: {} };
    const next = reconcileStateWithDefinition(old, v2);
    expect(Object.keys(next.actors)).toEqual(
      expect.arrayContaining(["cat", "hero"])
    );
    expect(next.egoId).toBe("hero");
  });

  it("is applied when a save is loaded through the runtime", () => {
    const v1 = withProgress("1.0.0");
    ls.set(
      "adventure_update-game_save_1",
      JSON.stringify({
        slot: 1,
        gameId: "update-game",
        data: createInitialState(v1),
        timestamp: 1,
        locationName: "Start",
        version: "1.0.0",
      })
    );
    const slot = createGame(withProgress("1.1.0", true)).save.loadGame(1);
    expect(slot?.data.achievements.map((a) => a.id)).toEqual(["first", "new"]);
  });
});

describe("dual store hydration", () => {
  /** Minimal in-memory IndexedDB — enough for saveStorage's get/put/delete. */
  function fakeIndexedDb(rows: Map<string, unknown>) {
    const request = <T,>(result: T) => {
      const req: { result: T; onsuccess?: () => void; onerror?: () => void } = {
        result,
      };
      queueMicrotask(() => req.onsuccess?.());
      return req;
    };
    const db = {
      objectStoreNames: { contains: () => true },
      transaction: () => {
        const tx: { oncomplete?: () => void; objectStore: () => unknown } = {
          objectStore: () => ({
            get: (key: string) => request(rows.get(key)),
            put: (row: { key: string }) => {
              rows.set(row.key, row);
              queueMicrotask(() => tx.oncomplete?.());
            },
            delete: (key: string) => {
              rows.delete(key);
              queueMicrotask(() => tx.oncomplete?.());
            },
          }),
        };
        return tx;
      },
    };
    return { open: () => request(db) };
  }

  const slot = (timestamp: number, room: string) =>
    JSON.stringify({ gameId: "g", timestamp, data: { currentLocation: room } });

  it("reads timestamps from plain and sealed payloads", () => {
    expect(payloadTimestamp(slot(42, "a"))).toBe(42);
    expect(
      payloadTimestamp(JSON.stringify({ payload: slot(7, "a"), tag: "seal_x" }))
    ).toBe(7);
    expect(payloadTimestamp("not json")).toBe(0);
  });

  it("prefers a newer IndexedDB save over a stale localStorage copy", async () => {
    const { wrapPayload } = await import("./saveStorage");
    ls.set("k", slot(100, "old-room"));
    const rows = new Map<string, unknown>([
      ["k", wrapPayload("k", slot(200, "new-room"))],
    ]);
    vi.stubGlobal("indexedDB", fakeIndexedDb(rows));

    const store = createDualSaveStore(["k"]);
    await store.ready;
    expect(store.backend).toBe("indexeddb");
    expect(store.getSync("k")).toContain("new-room");
    expect(ls.get("k")).toContain("new-room");
  });

  it("repairs IndexedDB when localStorage holds the newer save", async () => {
    const { wrapPayload } = await import("./saveStorage");
    ls.set("k", slot(300, "newest-room"));
    const rows = new Map<string, unknown>([
      ["k", wrapPayload("k", slot(200, "older-room"))],
    ]);
    vi.stubGlobal("indexedDB", fakeIndexedDb(rows));

    const store = createDualSaveStore(["k"]);
    await store.ready;
    expect(store.getSync("k")).toContain("newest-room");
    expect((rows.get("k") as { payload: string }).payload).toContain(
      "newest-room"
    );
  });
});

describe("durable save mirror (native storage)", () => {
  function memoryMirror(seed: Record<string, string> = {}) {
    const rows = new Map(Object.entries(seed));
    return {
      rows,
      mirror: {
        name: "device",
        get: async (k: string) => rows.get(k) ?? null,
        set: async (k: string, v: string) => {
          rows.set(k, v);
        },
        remove: async (k: string) => {
          rows.delete(k);
        },
      },
    };
  }
  const slotJson = (timestamp: number, room: string) =>
    JSON.stringify({ gameId: "g", timestamp, data: { currentLocation: room } });

  afterEach(async () => {
    const { setSaveMirror } = await import("./saveStorage");
    setSaveMirror(null);
  });

  it("restores saves from the mirror after web storage was wiped", async () => {
    const { setSaveMirror } = await import("./saveStorage");
    const { mirror } = memoryMirror({ k: slotJson(500, "kept-room") });
    setSaveMirror(mirror);
    const store = createDualSaveStore(["k"]); // localStorage is empty
    expect(store.getSync("k")).toBeNull();
    await store.ready;
    expect(store.getSync("k")).toContain("kept-room");
    expect(ls.get("k")).toContain("kept-room");
    expect(store.mirrorName).toBe("device");
  });

  it("writes saves and deletes through, and repairs a stale mirror", async () => {
    const { setSaveMirror } = await import("./saveStorage");
    const { mirror, rows } = memoryMirror({ k: slotJson(100, "old-room") });
    ls.set("k", slotJson(900, "newer-room"));
    setSaveMirror(mirror);
    const store = createDualSaveStore(["k", "k2"]);
    await store.ready;
    expect(store.getSync("k")).toContain("newer-room");
    expect(rows.get("k")).toContain("newer-room");

    store.set("k2", slotJson(950, "second"));
    await store.flush();
    expect(rows.get("k2")).toContain("second");

    store.remove("k2");
    await store.flush();
    expect(rows.has("k2")).toBe(false);
  });

  it("still saves when the mirror throws", async () => {
    const { setSaveMirror } = await import("./saveStorage");
    setSaveMirror({
      get: async () => {
        throw new Error("plugin missing");
      },
      set: async () => {
        throw new Error("plugin missing");
      },
      remove: async () => {},
    });
    const store = createDualSaveStore(["k"]);
    await store.ready;
    expect(store.set("k", slotJson(1, "a")).ok).toBe(true);
    await store.flush();
    expect(store.getSync("k")).toContain('"a"');
    expect(store.lastError).toContain("plugin missing");
  });

  it("adapts a Capacitor-Preferences-shaped plugin", async () => {
    const { createKeyValueSaveMirror } = await import("./saveStorage");
    const bag = new Map<string, string>();
    const m = createKeyValueSaveMirror({
      get: async ({ key }) => ({ value: bag.get(key) ?? null }),
      set: async ({ key, value }) => void bag.set(key, value),
      remove: async ({ key }) => void bag.delete(key),
    });
    await m.set("a", "1");
    expect(await m.get("a")).toBe("1");
    await m.remove("a");
    expect(await m.get("a")).toBeNull();
  });
});
