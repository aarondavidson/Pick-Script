import { describe, expect, it } from "vitest";
import { createEmptyJsonPack } from "./jsonPack";
import {
  diagnosePack,
  formatPackDoctorReport,
  isMissingOrPlaceholderArt,
  missingArtPlaceholderDataUrl,
} from "./packDoctor";
import { createPackFromTemplate } from "@/authoring/packTemplates";

describe("packDoctor", () => {
  it("flags missing room art clearly", () => {
    const doc = createEmptyJsonPack({ id: "t", title: "T" });
    const report = diagnosePack(doc);
    expect(report.summary.missingRoomArt).toBeGreaterThanOrEqual(1);
    const art = report.findings.find((f) => f.id.startsWith("art:room:"));
    expect(art?.title).toMatch(/Room art missing/i);
    expect(art?.fix).toMatch(/Upload|Pixels/i);
  });

  it("flags dead exits to unknown rooms", () => {
    const doc = createEmptyJsonPack({ id: "t", title: "T" });
    doc.links = [
      {
        from: "start",
        to: "nowhere",
        fromLabel: "Gone",
        toLabel: "Back",
        direction: "east",
      },
    ];
    const report = diagnosePack(doc);
    expect(report.summary.deadExits).toBeGreaterThanOrEqual(1);
    expect(report.ok).toBe(false);
    expect(
      report.findings.some((f) => /destination missing/i.test(f.title))
    ).toBe(true);
  });

  it("flags silent hotspots and missing item icons", () => {
    const doc = createEmptyJsonPack({ id: "t", title: "T" });
    doc.rooms.start!.image = "data:image/gif;base64,R0lGODlhAQABAAAAACw=";
    doc.rooms.start!.hotspots = [
      {
        id: "rock",
        name: "Rock",
        x: 10,
        y: 10,
        width: 12,
        height: 12,
        kind: "interact",
      },
    ];
    doc.items = {
      pebble: { id: "pebble", name: "Pebble" },
    };
    const report = diagnosePack(doc);
    expect(report.summary.silentHotspots).toBeGreaterThanOrEqual(1);
    expect(report.summary.missingItemIcons).toBeGreaterThanOrEqual(1);
  });

  it("placeholder detector + SVG label", () => {
    expect(isMissingOrPlaceholderArt("")).toBe(true);
    expect(isMissingOrPlaceholderArt("data:image/svg+xml,x")).toBe(true);
    const url = missingArtPlaceholderDataUrl("Attic");
    expect(url.startsWith("data:image/svg+xml")).toBe(true);
    expect(decodeURIComponent(url)).toContain("MISSING ART");
    expect(decodeURIComponent(url)).toContain("Attic");
  });

  it("formats a CLI-friendly report", () => {
    const doc = createPackFromTemplate({
      id: "key-door-doc",
      title: "Key Door",
      templateId: "key-door",
    });
    const report = diagnosePack(doc);
    const text = formatPackDoctorReport(report);
    expect(text).toContain("Pack doctor");
    expect(text).toContain("missing room art");
  });

  it("flags missing quests, flat walkboxes, and CSS-only characters", () => {
    const doc = createEmptyJsonPack({ id: "feel", title: "Feel" });
    doc.rooms = {
      a: {
        id: "a",
        name: "A",
        image: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
        walkboxes: [{ id: "floor", x: 5, y: 55, width: 90, height: 40 }],
        hotspots: [
          {
            id: "npc",
            name: "NPC",
            x: 40,
            y: 40,
            width: 12,
            height: 20,
            kind: "character",
            dialogue: {
              lines: [{ id: "hi", text: "Hi", choices: [{ text: "Bye", nextId: "END" }] }],
            },
          },
        ],
      },
      b: {
        id: "b",
        name: "B",
        image: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
        walkboxes: [{ id: "floor", x: 5, y: 55, width: 90, height: 40, scale: 1 }],
      },
    };
    doc.links = [
      { from: "a", to: "b", fromLabel: "East", toLabel: "West", direction: "east" },
    ];
    const report = diagnosePack(doc);
    expect(report.findings.some((f) => f.id === "quest:missing")).toBe(true);
    expect(report.findings.some((f) => f.id === "walkbox:flat:a")).toBe(true);
    expect(
      report.findings.some((f) => f.id === "costume:missing:a/npc")
    ).toBe(true);
    expect(report.findings.some((f) => f.id === "costume:missing:player")).toBe(
      true
    );
  });
});
