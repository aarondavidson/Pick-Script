import { describe, expect, it } from "vitest";
import { createEmptyJsonPack, validateJsonPack } from "@/engine/jsonPack";
import { applyGenrePreset } from "@/authoring/genrePresets";
import { applyCutsceneTemplate } from "@/authoring/cutsceneTemplates";
import { placePropFromLibrary } from "@/authoring/propLibrary";

describe("studio accelerators 11–13", () => {
  it("applies genre verb presets", () => {
    let doc = createEmptyJsonPack({
      id: "t",
      title: "T",
      startRoom: "start",
    });
    doc = applyGenrePreset(doc, "desktop-comedy");
    expect(doc.verbMode).toBe("classic");
    doc = applyGenrePreset(doc, "minimal");
    expect(doc.verbMode).toBe("simple");
  });

  it("sunny adventure seeds bright atmosphere, not noir", () => {
    let doc = createEmptyJsonPack({
      id: "sunny",
      title: "Sunny",
      startRoom: "plaza",
    });
    doc = {
      ...doc,
      rooms: {
        plaza: {
          id: "plaza",
          name: "Plaza",
          description: "Bright.",
          image: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
          hotspots: [],
        },
      },
    };
    doc = applyGenrePreset(doc, "sunny-adventure");
    expect(doc.verbMode).toBe("coin");
    expect(doc.rooms.plaza?.particles).toBe("sparkle");
    expect(doc.audio?.music?.plaza).toBe("calm");
    expect(doc.subtitle?.toLowerCase()).toContain("sunny");
  });

  it("places prop library desk + chest and validates", () => {
    let doc = createEmptyJsonPack({
      id: "lib",
      title: "Lib",
      startRoom: "r",
    });
    doc = {
      ...doc,
      rooms: {
        r: {
          id: "r",
          name: "Room",
          description: "Test",
          image: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
          hotspots: [],
        },
      },
    };
    doc = placePropFromLibrary(doc, {
      entryId: "prop-desk",
      roomId: "r",
      x: 20,
      y: 40,
    }).doc;
    doc = placePropFromLibrary(doc, {
      entryId: "prop-chest",
      roomId: "r",
      x: 50,
      y: 40,
    }).doc;
    doc = placePropFromLibrary(doc, {
      entryId: "npc-trader",
      roomId: "r",
      x: 70,
      y: 30,
    }).doc;
    expect(doc.rooms.r!.hotspots!.length).toBe(3);
    expect(doc.items?.brass_key).toBeTruthy();
    expect(validateJsonPack(doc).ok).toBe(true);
  });

  it("cutscene escape template gates exit", () => {
    let doc = createEmptyJsonPack({
      id: "cut",
      title: "Cut",
      startRoom: "a",
    });
    doc = {
      ...doc,
      rooms: {
        a: {
          id: "a",
          name: "A",
          description: "A",
          image: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
          hotspots: [],
        },
        b: {
          id: "b",
          name: "B",
          description: "B",
          image: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
          hotspots: [],
        },
      },
    };
    const result = applyCutsceneTemplate(doc, {
      templateId: "escape",
      roomId: "a",
      exitTo: "b",
      setFlag: "path_open",
    });
    expect(result.cutsceneId).toBeTruthy();
    expect(result.doc.cutscenes?.[result.cutsceneId]).toBeTruthy();
    expect(
      result.doc.links?.some(
        (l) => l.from === "a" && l.to === "b" && l.requireFlag === "path_open"
      )
    ).toBe(true);
    expect(validateJsonPack(result.doc).ok).toBe(true);
  });
});
