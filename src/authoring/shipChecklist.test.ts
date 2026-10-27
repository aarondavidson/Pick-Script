import { describe, expect, it } from "vitest";
import { createEmptyJsonPack } from "@/engine/jsonPack";
import { applyGetItemKit, applyLockedExitKit } from "@/authoring/puzzleKits";
import { buildShipChecklist } from "@/authoring/shipChecklist";

const TINY =
  "data:image/gif;base64,R0lGODlhAQABAAAAACw=";

describe("buildShipChecklist", () => {
  it("marks ready for a minimal valid pack with art + hotspot + puzzle", () => {
    let doc = createEmptyJsonPack({
      id: "ship-ready",
      title: "Ship Ready",
      verbMode: "coin",
    });
    const startId = doc.startRoom;
    doc = {
      ...doc,
      rooms: {
        ...doc.rooms,
        [startId]: {
          ...doc.rooms[startId]!,
          image: TINY,
          music: "home",
          description: "A finished starter room.",
        },
      },
      audio: {
        defaultMusic: "home",
        music: { home: "calm" },
        ambient: {},
      },
    };
    doc = applyGetItemKit(doc, startId, {
      hotspotId: "key_desk",
      hotspotName: "Desk",
      x: 20,
      y: 40,
      width: 18,
      height: 22,
      itemId: "brass_key",
      itemName: "Brass Key",
      itemDescription: "Opens the exit.",
      lookText: "A key in the drawer.",
      pickupMessage: "You take the brass key.",
    });
    const hallId = "hall";
    doc = {
      ...doc,
      rooms: {
        ...doc.rooms,
        [hallId]: {
          id: hallId,
          name: "Hall",
          description: "Beyond the door.",
          image: TINY,
          music: "home",
          hotspots: [],
        },
      },
    };
    doc = applyLockedExitKit(doc, {
      from: startId,
      to: hallId,
      direction: "east",
      fromLabel: "Hall",
      toLabel: "Start",
      requireFlag: "got_brass_key",
      blockedMessage: "The door needs the brass key.",
    });

    const report = buildShipChecklist(doc);
    expect(report.doctor.ok).toBe(true);
    expect(report.playtestReady).toBe(true);
    expect(report.ready).toBe(true);
    expect(report.blockers).toHaveLength(0);
    expect(report.playtest.every((i) => i.done)).toBe(true);
  });

  it("lists playtest gaps as blockers when art is missing", () => {
    const doc = createEmptyJsonPack({
      id: "ship-empty",
      title: "Empty",
    });
    const report = buildShipChecklist(doc);
    expect(report.ready).toBe(false);
    expect(report.blockers.some((b) => b.id === "playtest:room-art")).toBe(
      true
    );
    expect(report.blockers.some((b) => b.id === "playtest:hotspot")).toBe(
      true
    );
  });
});
