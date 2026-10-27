/**
 * Harbor Fog pack feature regressions — kept next to the pack so engine-only
 * and title-only trees do not import harbor-fog from src/engine/*.test.ts.
 */
import { describe, expect, it } from "vitest";
import { createGameFromJson, validateJsonPack } from "@/engine/jsonPack";
import { buildHarborFogPack } from "./buildPack";
import { harborFogGame } from "./manifest";

describe("Harbor Fog pack features", () => {
  it("ships play_intro → intro and room transitions", () => {
    const def = createGameFromJson(buildHarborFogPack());
    expect(def.flagCutscenes?.play_intro).toBe("intro");
    expect(def.cutscenes?.intro).toBeTruthy();
    expect(def.rooms.lighthouse?.transitionIn?.kind).toBe("fade");
  });

  it("wires beacon + chest haptics", () => {
    const def = createGameFromJson(buildHarborFogPack());
    const beacon = def.rooms.lighthouse!.hotspots!.find((h) => h.id === "beacon");
    expect(beacon?.interactHaptic).toBe("success");
    expect(beacon?.actionHaptics).toContain("success");
    const chest = def.rooms.warehouse!.hotspots!.find(
      (h) => h.id === "chest" || h.name === "Chest"
    );
    expect(chest?.useWithHaptic).toBe("success");
  });

  it("wires juice + stuckAssist", () => {
    const pack = buildHarborFogPack();
    expect(pack.stuckAssist).toBeTruthy();
    const game = createGameFromJson(pack);
    expect(game.stuckAssist).toBeTruthy();
    const beacon = game.rooms.lighthouse?.hotspots.find((h) => h.id === "beacon");
    expect(beacon?.interactJuice).toBe("success");
    expect(beacon?.actionJuices?.length).toBeGreaterThan(0);
  });

  it("night rooms use stars + animated glows", () => {
    const pack = buildHarborFogPack();
    expect(pack.rooms.docks?.particles).toBe("stars");
    expect(pack.rooms.lighthouse?.particles).toBe("stars");
    expect(pack.rooms.warehouse?.particles).toBe("dust");
    const window = pack.rooms.docks!.hotspots!.find(
      (h) => h.id === "shack_window"
    )!;
    expect(window.frames?.length).toBe(2);
    const beacon = pack.rooms.lighthouse!.hotspots!.find(
      (h) => h.id === "beacon"
    )!;
    expect(beacon.frames?.length).toBe(2);
    expect(validateJsonPack(pack).ok).toBe(true);
  });

  it("compiles player + NPC bitmap sprites", () => {
    const game = createGameFromJson(buildHarborFogPack());
    expect(game.actors.player?.sprite).toMatch(/\/actors\/player|data:|\.jpg/);
    expect(game.actors.harbor_master?.sprite).toBeTruthy();
    expect(game.actors.trader?.sprite).toBeTruthy();
    const master = game.rooms.watch_office!.hotspots!.find(
      (h) => h.id === "harbor_master"
    )!;
    expect(master.stateOverlays?.[0]).toBeTruthy();
  });

  it("manifest shell stays generic (no custom ending)", () => {
    expect(typeof harborFogGame.shell?.complete).not.toBe("function");
  });
});
