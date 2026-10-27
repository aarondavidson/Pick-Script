import { describe, expect, it } from "vitest";
import { createEmptyJsonPack, createGameFromJson } from "./jsonPack";
import { diagnosePack } from "./packDoctor";

describe("pack juice + consume metadata", () => {
  it("compiles interactJuice, action juice, and consumesItems", () => {
    const doc = createEmptyJsonPack({ id: "j", title: "J" });
    doc.rooms = {
      r: {
        id: "r",
        name: "R",
        image: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
        hotspots: [
          {
            id: "chest",
            name: "Chest",
            x: 40,
            y: 40,
            width: 12,
            height: 14,
            kind: "use-with-target",
            lookText: "A chest.",
            interactJuice: "medium",
            useWithJuice: "success",
            useWith: [
              {
                itemId: "key",
                message: "Click.",
                consumeItem: true,
                setFlag: "open",
              },
            ],
            actions: [{ op: "juice", preset: "heavy" }],
            actionVerbs: ["use"],
          },
        ],
      },
    };
    doc.items = {
      key: { id: "key", name: "Key", description: "Brass." },
    };
    doc.startRoom = "r";
    const game = createGameFromJson(doc);
    const hs = game.rooms.r!.hotspots.find((h) => h.id === "chest")!;
    expect(hs.interactJuice).toBe("medium");
    expect(hs.useWithJuice).toBe("success");
    expect(hs.consumesItems).toContain("key");
    expect(hs.actionJuices?.length).toBeGreaterThan(0);
  });

  it("packDoctor flags dry feel hotspots", () => {
    const doc = createEmptyJsonPack({ id: "dry", title: "Dry" });
    doc.rooms = {
      a: {
        id: "a",
        name: "A",
        image: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
        hotspots: [
          {
            id: "lever",
            name: "Lever",
            x: 20,
            y: 40,
            width: 10,
            height: 12,
            kind: "interact",
            useText: "You pull it.",
          },
        ],
      },
    };
    doc.startRoom = "a";
    const report = diagnosePack(doc);
    expect(report.findings.some((f) => f.id === "feel:dry:a/lever")).toBe(true);
  });

});
