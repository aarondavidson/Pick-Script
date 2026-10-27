import { beforeEach, describe, expect, it, vi } from "vitest";
import { createGame, linkRooms, validateGameDefinition } from "./index";
import type { GameDefinition } from "./definition";
import { atticStudyGame } from "@/games/attic-study/manifest";
import { templateGame } from "@/games/_template/manifest";

/** Minimal pack for shell / migrate / specials — no product title import. */
function stubPack(overrides: Partial<GameDefinition> = {}): GameDefinition {
  return {
    id: "stub-pack",
    title: "Stub",
    version: "1.0.0",
    startRoom: "start",
    rooms: {
      start: {
        id: "start",
        name: "Start",
        description: "Start",
        image: "",
        music: "home",
        hotspots: [],
        exits: [],
      },
    },
    combinations: {},
    achievements: [],
    quests: [],
    ...overrides,
  };
}

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
  return store;
}

describe("validateGameDefinition", () => {
  it("accepts the template pack", () => {
    const result = validateGameDefinition(templateGame);
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("accepts Attic Study", () => {
    const result = validateGameDefinition(atticStudyGame);
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("rejects a missing startRoom", () => {
    const result = validateGameDefinition({
      ...templateGame,
      startRoom: "nope",
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("startRoom"))).toBe(true);
  });

  it("rejects exits to unknown rooms", () => {
    const result = validateGameDefinition({
      ...templateGame,
      rooms: {
        ...templateGame.rooms,
        start: {
          ...templateGame.rooms.start,
          exits: [{ direction: "north", to: "void", label: "Nowhere" }],
        },
      },
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("void"))).toBe(true);
  });
});

describe("createGame smoke", () => {
  beforeEach(() => {
    mockLocalStorage();
  });

  it("boots template, travels, and isolates saves", () => {
    const runtime = createGame(templateGame);
    let state = runtime.createInitialState();
    expect(state.currentLocation).toBe("start");

    const room = runtime.getRoom(state.currentLocation);
    expect(room?.name).toBeTruthy();

    const note = runtime
      .getVisibleHotspots("start", state)
      .find((h) => h.id === "note");
    expect(note).toBeTruthy();

    const interact = runtime.doSentence(note!, "look", state);
    expect(interact.blocked).toBeFalsy();
    if (interact.patch) {
      state = runtime.applyPatch(state, interact.patch);
    }
    expect(state.flags.lookedAtNote).toBe(true);
    expect(state.flags.gotKey).toBe(true);
    expect(state.inventory.some((i) => i.id === "starter_key")).toBe(true);

    const exit = room!.exits.find((e) => e.to === "hallway");
    expect(exit).toBeTruthy();
    expect(exit!.blocked?.(runtime.createInitialState())).toBe(true);
    expect(exit!.blocked?.(state)).toBe(false);
    const travel = runtime.travel(state, exit!);
    expect(travel.ok).toBe(true);
    expect(travel.nextState?.currentLocation).toBe("hallway");
    state = travel.nextState!;

    runtime.save.saveGame(1, state, "Hallway");
    const loaded = runtime.save.loadGame(1);
    expect(loaded?.gameId).toBe(templateGame.id);
    expect(loaded?.data.currentLocation).toBe("hallway");

    // Isolation: different pack ids must not share save slots
    const other = createGame(stubPack({ id: "other-pack" }));
    expect(other.save.loadGame(1)).toBeNull();
  });

  it("migrates legacy save keys only when the pack sets legacySaveKeyPrefix", () => {
    // Write a real slot, then move it under the old key name
    const source = createGame(stubPack({ id: "legacy-title" }));
    source.save.saveGame(1, source.createInitialState(), "Hallway");
    const raw = localStorage.getItem("adventure_legacy-title_save_1");
    expect(raw).toBeTruthy();
    localStorage.removeItem("adventure_legacy-title_save_1");
    localStorage.setItem("oldtitle_save_1", raw!);

    const opted = createGame(
      stubPack({ id: "legacy-title", legacySaveKeyPrefix: "oldtitle_save_" })
    );
    expect(opted.save.loadGame(1)).not.toBeNull();

    const other = createGame(stubPack({ id: "no-legacy" }));
    expect(other.save.loadGame(1)).toBeNull();
    expect(atticStudyGame.legacySaveKeyPrefix).toBeUndefined();
  });

  it("resolves pack specials by hotspot id", () => {
    const runtime = createGame(
      stubPack({
        specials: {
          arcade_machine: {
            interceptVerbs: ["use"],
            run: () => ({
              modality: { type: "minigame", minigameId: "pixel-invaders" },
            }),
          },
        },
      })
    );
    const arcade = {
      id: "arcade_machine",
      name: "Arcade",
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      verbs: ["use" as const],
      responses: {},
    };
    const special = runtime.resolveSpecial(arcade);
    expect(special?.interceptVerbs).toContain("use");
    const out = special!.run({
      hotspot: arcade,
      verb: "use",
      state: runtime.createInitialState(),
    });
    expect(out?.modality).toEqual({
      type: "minigame",
      minigameId: "pixel-invaders",
    });
  });

  it("writes content version on save and loads it back", () => {
    const runtime = createGame(templateGame);
    const state = runtime.createInitialState();
    runtime.save.saveGame(1, state, "Start");
    const loaded = runtime.save.loadGame(1);
    expect(loaded?.version).toBe(templateGame.version);
    expect(loaded?.incompatible).toBeFalsy();
  });

  it("marks major-mismatched saves incompatible", () => {
    const runtime = createGame({ ...templateGame, version: "2.0.0" });
    // Manually plant an old major save
    localStorage.setItem(
      `adventure_${templateGame.id}_save_1`,
      JSON.stringify({
        slot: 1,
        gameId: templateGame.id,
        data: runtime.createInitialState(),
        timestamp: Date.now(),
        locationName: "Start",
        version: "1.0.0",
      })
    );
    const loaded = runtime.save.loadGame(1);
    expect(loaded?.incompatible).toBe(true);
  });

  it("localizes hotspot responses via msg() + setLocale", () => {
    const runtime = createGame(templateGame);
    const state = runtime.createInitialState();
    const note = runtime
      .getVisibleHotspots("start", state)
      .find((h) => h.id === "note")!;

    runtime.setLocale("en");
    const en = runtime.doSentence(note, "look", state);
    expect(en.message).toContain("brass key");

    runtime.setLocale("es");
    const es = runtime.doSentence(note, "look", state);
    expect(es.message).toContain("llave");
  });

  it("applies pack Room.music cues from definition", () => {
    const runtime = createGame(
      stubPack({
        audio: {
          defaultMusic: "home",
          music: { home: "calm", warehouse: "warehouse", sewer: "sewer" },
          ambient: {},
        },
        rooms: {
          start: {
            id: "start",
            name: "Start",
            description: "Start",
            image: "",
            music: "home",
            hotspots: [],
            exits: [],
          },
          warehouse: {
            id: "warehouse",
            name: "Warehouse",
            description: "Warehouse",
            image: "",
            music: "warehouse",
            hotspots: [],
            exits: [],
          },
          sewer: {
            id: "sewer",
            name: "Sewer",
            description: "Sewer",
            image: "",
            music: "sewer",
            hotspots: [],
            exits: [],
          },
        },
      })
    );
    expect(runtime.getRoom("start")?.music).toBe("home");
    expect(runtime.getRoom("warehouse")?.music).toBe("warehouse");
    expect(runtime.getRoom("sewer")?.music).toBe("sewer");
    expect(runtime.definition.audio?.music?.home).toBe("calm");
  });

  it("solves Attic Study desk → key → chest", () => {
    const runtime = createGame(atticStudyGame);
    let state = runtime.createInitialState();
    expect(state.currentLocation).toBe("attic");
    expect(runtime.getRoom("attic")?.music).toBe("attic");
    expect(atticStudyGame.audio?.sfx?.pickup).toBeTruthy();

    const desk = runtime
      .getVisibleHotspots("attic", state)
      .find((h) => h.id === "desk")!;
    const look = runtime.doSentence(desk, "look", state);
    expect(look.blocked).toBeFalsy();
    state = runtime.applyPatch(state, look.patch ?? {});
    expect(state.flags.gotKey).toBe(true);
    const key = state.inventory.find((i) => i.id === "attic_key");
    expect(key?.icon).toBeTruthy();

    const chest = runtime
      .getVisibleHotspots("attic", state)
      .find((h) => h.id === "chest")!;
    const open = runtime.doSentence(chest, "use", state, key);
    expect(open.blocked).toBeFalsy();
    state = runtime.applyPatch(state, open.patch ?? {});
    expect(state.flags.chestOpen).toBe(true);
    expect(state.inventory.some((i) => i.id === "locket")).toBe(true);
    expect(
      state.achievements.find((a) => a.id === "attic_solved")?.unlocked
    ).toBe(true);
  });

  it("Attic Study save/load round-trips inventory and flags", () => {
    const runtime = createGame(atticStudyGame);
    let state = runtime.createInitialState();
    const desk = runtime
      .getVisibleHotspots("attic", state)
      .find((h) => h.id === "desk")!;
    state = runtime.applyPatch(
      state,
      runtime.doSentence(desk, "look", state).patch ?? {}
    );
    runtime.save.saveGame(1, state, "Attic");
    const loaded = runtime.save.loadGame(1);
    expect(loaded?.incompatible).toBeFalsy();
    expect(loaded?.data.flags.gotKey).toBe(true);
    expect(loaded?.data.inventory.some((i) => i.id === "attic_key")).toBe(
      true
    );
    expect(loaded?.version).toBe(atticStudyGame.version);
  });

  it("pack owns itemIcons (host does not hardcode)", () => {
    const withIcons = stubPack({
      itemIcons: {
        brass_key: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
        note: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
      },
    });
    expect(withIcons.itemIcons?.brass_key).toBeTruthy();
    expect(Object.keys(withIcons.itemIcons ?? {}).length).toBe(2);
    // Attic puts icons on inventory items themselves
    const runtime = createGame(atticStudyGame);
    const state = runtime.createInitialState();
    const desk = runtime
      .getVisibleHotspots("attic", state)
      .find((h) => h.id === "desk")!;
    const next = runtime.applyPatch(
      state,
      runtime.doSentence(desk, "look", state).patch ?? {}
    );
    expect(next.inventory.find((i) => i.id === "attic_key")?.icon).toBeTruthy();
  });

  it("linkRooms builds bidirectional exits with optional gate", () => {
    const { forward, back } = linkRooms("a", "b", {
      direction: "east",
      fromLabel: "To B",
      toLabel: "To A",
      forwardBlocked: (s) => !s.flags.open,
    });
    expect(forward.to).toBe("b");
    expect(back.to).toBe("a");
    expect(back.direction).toBe("west");
    expect(
      forward.blocked?.({
        flags: {},
      } as never)
    ).toBe(true);
    expect(
      forward.blocked?.({
        flags: { open: true },
      } as never)
    ).toBe(false);
  });
});
