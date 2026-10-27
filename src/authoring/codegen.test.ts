import { describe, expect, it } from "vitest";
import {
  combinationKey,
  formatCombinationDraft,
  formatCombinationsObject,
  formatHotspotDraft,
  formatHotspotsArray,
  formatPackAudioModule,
  formatRoomMusicAssignments,
  formatSfxBindingPatches,
  overlayToHotspot,
  suggestId,
} from "./codegen";

describe("suggestId", () => {
  it("slugs names", () => {
    expect(suggestId("Brass Key")).toBe("brass_key");
  });
});

describe("formatHotspotDraft", () => {
  it("emits pickup with inventory grant", () => {
    const s = formatHotspotDraft({
      id: "key",
      name: "Key",
      x: 10,
      y: 20,
      width: 15,
      height: 12,
      verbs: ["look", "use"],
      kind: "pickup",
      itemId: "brass_key",
      itemName: "Brass Key",
      itemDescription: "Shiny.",
    });
    expect(s).toContain('id: "key"');
    expect(s).toContain("got_brass_key");
    expect(s).toContain('id: "brass_key"');
    expect(s).toContain("inventory:");
  });

  it("emits character hotspot", () => {
    const s = formatHotspotDraft({
      id: "npc_bob",
      name: "Bob",
      x: 40,
      y: 50,
      width: 10,
      height: 20,
      verbs: ["look", "talk"],
      kind: "character",
      actorId: "bob",
    });
    expect(s).toContain("isActor: true");
    expect(s).toContain('actorId: "bob"');
  });
});

describe("formatCombinationDraft", () => {
  it("uses a+b key", () => {
    expect(combinationKey("tape", "chicken")).toBe("tape+chicken");
    const s = formatCombinationDraft({
      itemA: "tape",
      itemB: "chicken",
      resultId: "taped_chicken",
      resultName: "Taped Chicken",
      resultDescription: "Sticky.",
    });
    expect(s).toContain('"tape+chicken"');
    expect(s).toContain('id: "taped_chicken"');
  });
});

describe("formatHotspotsArray / combinations", () => {
  it("wraps multiple entries", () => {
    const arr = formatHotspotsArray([
      {
        id: "lamp",
        name: "Lamp",
        x: 1,
        y: 2,
        width: 3,
        height: 4,
        verbs: ["look"],
        kind: "interact",
      },
    ]);
    expect(arr.startsWith("hotspots: [")).toBe(true);
    const combos = formatCombinationsObject([
      {
        itemA: "a",
        itemB: "b",
        resultId: "c",
        resultName: "C",
        resultDescription: "d",
      },
    ]);
    expect(combos).toContain("combinations:");
  });
});

describe("overlayToHotspot", () => {
  it("maps pickup overlays", () => {
    const h = overlayToHotspot({
      id: "gem",
      name: "Gem",
      x: 5,
      y: 6,
      width: 8,
      height: 8,
      role: "pickup",
      itemId: "gem",
    });
    expect(h.kind).toBe("pickup");
    expect(h.itemId).toBe("gem");
  });
});

describe("audio codegen", () => {
  it("includes interactSound on hotspot drafts", () => {
    const s = formatHotspotDraft({
      id: "lamp",
      name: "Lamp",
      x: 1,
      y: 2,
      width: 3,
      height: 4,
      verbs: ["look"],
      kind: "interact",
      interactSound: "creak",
    });
    expect(s).toContain('interactSound: "creak"');
  });

  it("emits PackAudio module with cues and custom sfx", () => {
    const s = formatPackAudioModule({
      cues: [{ cue: "attic", preset: "noir", ambient: "hum" }],
      customSfx: [{ key: "chest_open", filename: "chest-open.mp3" }],
    });
    expect(s).toContain("PackAudio");
    expect(s).toContain('"attic": "noir"');
    expect(s).toContain('"attic": "hum"');
    expect(s).toContain("chest-open.mp3");
  });

  it("formats room music and sfx bindings", () => {
    expect(
      formatRoomMusicAssignments([{ roomId: "attic", musicCue: "attic" }])
    ).toContain('music: "attic"');
    expect(
      formatSfxBindingPatches([
        { hotspotId: "desk", when: "interact", soundKey: "creak" },
      ])
    ).toContain('interactSound: "creak"');
  });
});
