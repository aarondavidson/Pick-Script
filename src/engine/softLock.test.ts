import { describe, expect, it } from "vitest";
import { createPackFromTemplate } from "@/authoring/packTemplates";
import { analyzeSoftLock } from "./softLock";
import { diagnosePack } from "./packDoctor";
import { createEmptyJsonPack } from "./jsonPack";

describe("softLock", () => {
  it("marks destination reachable after talk-gate unlock in BFS", () => {
    const doc = createPackFromTemplate({
      id: "tg",
      title: "TG",
      templateId: "talk-gate",
    });
    for (const id of Object.keys(doc.rooms)) {
      doc.rooms[id] = {
        ...doc.rooms[id]!,
        image: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
      };
    }
    const report = analyzeSoftLock(doc);
    expect(report.reachableRooms).toContain("street");
    expect(report.settableFlags).toContain("guard_convinced");
  });

  it("flags never-set exit gates via pack doctor", () => {
    const doc = createEmptyJsonPack({ id: "x", title: "X" });
    doc.rooms.start!.image = "data:image/gif;base64,R0lGODlhAQABAAAAACw=";
    doc.rooms.hall = {
      id: "hall",
      name: "Hall",
      image: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
      hotspots: [],
    };
    doc.links = [
      {
        from: "start",
        to: "hall",
        fromLabel: "Hall",
        toLabel: "Start",
        direction: "east",
        requireFlag: "magic_word",
        blockedMessage: "Nope",
      },
    ];
    const report = diagnosePack(doc);
    expect(report.summary.flagsNeverSet).toBeGreaterThanOrEqual(1);
    expect(report.ok).toBe(false);
  });
});
