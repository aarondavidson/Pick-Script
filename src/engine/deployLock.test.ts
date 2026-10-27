import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __setStrictPlayTestOverride,
  isStrictPlayEnabled,
  sealTag,
  verifySealTag,
} from "./deployLock";
import {
  canFastTravelTo,
  collectKnownItemIds,
  sanitizePlayState,
} from "./stateIntegrity";
import { createEmptyJsonPack, createGameFromJson } from "./jsonPack";
import { createGame } from "./createGame";
import { createInitialState } from "./state";
import { applySidecarToDefinition, savePackSidecar } from "./packSidecar";

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

describe("deployLock / seal", () => {
  afterEach(() => {
    __setStrictPlayTestOverride(null);
  });

  it("defaults off under vitest (authoring-friendly)", () => {
    expect(isStrictPlayEnabled()).toBe(false);
  });

  it("honors test override", () => {
    __setStrictPlayTestOverride(true);
    expect(isStrictPlayEnabled()).toBe(true);
    __setStrictPlayTestOverride(false);
    expect(isStrictPlayEnabled()).toBe(false);
  });

  it("sealTag verifies and rejects tampering", () => {
    const secret = "test-secret";
    const payload = '{"slot":1,"data":{}}';
    const tag = sealTag(payload, secret);
    expect(verifySealTag(payload, tag, secret)).toBe(true);
    expect(verifySealTag(payload + "x", tag, secret)).toBe(false);
    expect(verifySealTag(payload, tag, "other")).toBe(false);
  });
});

describe("stateIntegrity", () => {
  it("clamps unknown rooms and drops junk inventory", () => {
    const def = createGameFromJson(
      createEmptyJsonPack({ id: "lock", title: "Lock" })
    );
    const state = createInitialState(def);
    const dirty = {
      ...state,
      currentLocation: "not_a_room",
      visitedLocations: ["start", "hacked_room"],
      inventory: [
        { id: "ok", name: "Ok", description: "fine" },
        { id: "__proto__", name: "bad", description: "x" },
        { id: "no-name" } as never,
      ],
    };
    const clean = sanitizePlayState(dirty, def);
    expect(clean.currentLocation).toBe(def.startRoom);
    expect(clean.visitedLocations).toEqual([def.startRoom]);
    expect(clean.inventory.map((i) => i.id)).toEqual(["ok"]);
  });

  it("collectKnownItemIds finds catalog / combination items", () => {
    const pack = createEmptyJsonPack({ id: "items", title: "Items" });
    pack.items = {
      brass_key: { id: "brass_key", name: "Key", description: "shiny" },
    };
    pack.combinations = {
      "a+b": {
        items: ["a", "b"],
        result: { id: "fused", name: "Fused", description: "merged" },
        successMessage: "ok",
      },
    };
    const def = createGameFromJson(pack);
    const known = collectKnownItemIds(def);
    expect(known.has("brass_key") || known.has("fused")).toBe(true);
    expect(known.has("fused")).toBe(true);
  });

  it("canFastTravelTo respects visited policy", () => {
    const pack = createEmptyJsonPack({ id: "map", title: "Map" });
    pack.rooms.other = {
      id: "other",
      name: "Other",
      description: "Elsewhere",
      image: "",
      hotspots: [],
    };
    pack.mapFastTravel = { enabled: true, requireVisited: true };
    const def = createGameFromJson(pack);
    const state = createInitialState(def);
    expect(canFastTravelTo(def, state, "other")).toBe(false);
    const visited = {
      ...state,
      visitedLocations: [def.startRoom, "other"],
    };
    expect(canFastTravelTo(def, visited, "other")).toBe(true);
  });
});

describe("strict play integrations", () => {
  beforeEach(() => {
    stubLocalStorage();
  });

  afterEach(() => {
    __setStrictPlayTestOverride(null);
    vi.unstubAllGlobals();
  });

  it("ignores localStorage sidecars when strict", () => {
    const def = createGameFromJson(
      createEmptyJsonPack({ id: "side", title: "Side" })
    );
    savePackSidecar({
      gameId: "side",
      updatedAt: Date.now(),
      rooms: {
        start: {
          hotspots: [
            { id: "ghost", x: 1, y: 1, width: 5, height: 5, name: "Ghost" },
          ],
        },
      },
    });

    __setStrictPlayTestOverride(false);
    // Without matching hotspot id, overlay is a no-op on geometry of existing;
    // presence of sidecar should still be loadable when not strict.
    const open = applySidecarToDefinition(def);
    expect(open).toBeTruthy();

    __setStrictPlayTestOverride(true);
    const locked = applySidecarToDefinition(def);
    expect(locked).toBe(def);
  });

  it("freezes definition rooms under strict createGame", () => {
    __setStrictPlayTestOverride(true);
    const game = createGame(
      createGameFromJson(createEmptyJsonPack({ id: "fz", title: "Fz" }))
    );
    expect(Object.isFrozen(game.definition)).toBe(true);
    expect(Object.isFrozen(game.definition.rooms)).toBe(true);
  });
});
