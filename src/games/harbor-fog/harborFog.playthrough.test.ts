import { describe, expect, it } from "vitest";
import { createGame, validateGameDefinition } from "@/engine";
import { applyStatePatch } from "@/engine/state";
import { harborFogGame, harborFogPack } from "./manifest";
import { validateJsonPack } from "@/engine/jsonPack";
import { diagnosePack } from "@/engine/packDoctor";
import { analyzeSoftLock } from "@/engine/softLock";

describe("Harbor Fog", () => {
  it("pack validates and compiles", () => {
    expect(validateJsonPack(harborFogPack).ok).toBe(true);
    const v = validateGameDefinition(harborFogGame);
    expect(v.ok).toBe(true);
    expect(harborFogGame.quests.length).toBeGreaterThan(0);
    expect(harborFogGame.quests[0]?.objectiveFlags?.[0]).toBe("dock_pass");
    expect(harborFogGame.achievements.length).toBeGreaterThan(0);
    expect(harborFogGame.flagCutscenes?.play_intro).toBe("intro");
    expect(harborFogGame.rooms.docks?.walkboxes?.some((w) => w.scale)).toBe(
      true
    );
  });

  it("playthrough: talk → key → chest → trader → lighthouse", () => {
    const game = createGame(harborFogGame);
    let state = game.createInitialState();
    expect(state.currentLocation).toBe("docks");

    const master =
      harborFogGame.rooms.watch_office!.hotspots!.find(
        (h) => h.id === "harbor_master"
      )!;
    const pass = master.dialogue!.nodes.hello!.choices!.find(
      (c) => c.choiceId === "pass"
    )!;
    state = applyStatePatch(state, pass.action?.(state) ?? {});
    expect(state.flags.dock_pass).toBe(true);

    state = { ...state, currentLocation: "warehouse" };

    const desk = harborFogGame.rooms.warehouse!.hotspots!.find(
      (h) => h.id === "desk"
    )!;
    state = applyStatePatch(state, desk.onInteract?.("use", state) ?? {});
    expect(state.inventory.some((i) => i.id === "brass_key")).toBe(true);

    const chest = harborFogGame.rooms.warehouse!.hotspots!.find(
      (h) => h.id === "chest"
    )!;
    state = applyStatePatch(
      state,
      chest.onUseWith?.("brass_key", state) ?? {}
    );
    expect(state.flags.chest_open).toBe(true);
    expect(state.inventory.some((i) => i.id === "relic_coin")).toBe(true);

    const trader = harborFogGame.rooms.pier_alley!.hotspots!.find(
      (h) => h.name === "Trader"
    )!;
    state = {
      ...state,
      currentLocation: "pier_alley",
    };
    state = applyStatePatch(
      state,
      trader.onUseWith?.("relic_coin", state) ?? {}
    );
    expect(state.flags.trader_paid).toBe(true);

    const beacon = harborFogGame.rooms.lighthouse!.hotspots!.find(
      (h) => h.id === "beacon"
    )!;
    state = {
      ...state,
      currentLocation: "lighthouse",
    };
    state = applyStatePatch(state, beacon.onInteract?.("use", state) ?? {});
    expect(state.flags.reached_beacon).toBe(true);

    const soft = analyzeSoftLock(harborFogPack);
    expect(soft.reachableRooms).toContain("lighthouse");
    expect(diagnosePack(harborFogPack).summary.flagsNeverSet).toBe(0);
  });
});
