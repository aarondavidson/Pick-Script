import { describe, expect, it } from "vitest";
import { createEmptyJsonPack, createGameFromJson } from "./jsonPack";
import { blendPacks, blendPacksMany, formatBlendReport } from "./blendPacks";
import { applyGenrePreset } from "@/authoring/genrePresets";
import { applySettingKit } from "@/authoring/settingKits";

function roomPack(
  id: string,
  roomId: string,
  opts?: { item?: string; linkTo?: string }
) {
  let doc = createEmptyJsonPack({
    id,
    title: id,
    startRoom: roomId,
  });
  doc = {
    ...doc,
    rooms: {
      [roomId]: {
        id: roomId,
        name: roomId,
        description: `${roomId} desc`,
        image: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
        music: roomId,
        hotspots: opts?.item
          ? [
              {
                id: "pickup",
                name: "Thing",
                x: 40,
                y: 40,
                width: 10,
                height: 10,
                kind: "pickup",
                itemId: opts.item,
                itemName: "Thing",
              },
            ]
          : [],
      },
    },
    items: opts?.item
      ? {
          [opts.item]: {
            id: opts.item,
            name: "Thing",
            description: "A thing",
          },
        }
      : {},
    audio: {
      music: { [roomId]: "calm" },
    },
    links: opts?.linkTo
      ? [
          {
            from: roomId,
            to: opts.linkTo,
            direction: "east",
            fromLabel: "East",
            toLabel: "West",
          },
        ]
      : [],
  };
  return doc;
}

describe("blendPacks", () => {
  it("merges donor rooms and items into base without clobbering startRoom", () => {
    const base = roomPack("base", "plaza");
    const donor = roomPack("forest-kit", "grove", { item: "leaf" });
    const { pack, report } = blendPacks(base, donor);
    expect(pack.id).toBe("base");
    expect(pack.startRoom).toBe("plaza");
    expect(pack.rooms.plaza).toBeTruthy();
    expect(pack.rooms.grove).toBeTruthy();
    expect(pack.items?.leaf).toBeTruthy();
    expect(report.added.rooms).toContain("grove");
    expect(report.added.items).toContain("leaf");
    expect(() => createGameFromJson(pack)).not.toThrow();
  });

  it("renames colliding room ids and remaps links", () => {
    const base = roomPack("base", "dock");
    const donor = roomPack("water", "dock", { item: "rope" });
    // donor also has pier + link
    donor.rooms.pier = {
      id: "pier",
      name: "Pier",
      description: "Wet wood.",
      image: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
      hotspots: [],
    };
    donor.links = [
      {
        from: "dock",
        to: "pier",
        direction: "north",
        fromLabel: "Pier",
        toLabel: "Dock",
      },
    ];
    const { pack, report } = blendPacks(base, donor, { onConflict: "rename" });
    expect(pack.rooms.dock).toBeTruthy(); // base kept
    expect(pack.rooms.water_dock || pack.rooms["water_dock"]).toBeTruthy();
    const renamedDock = report.renamed["room:dock"];
    expect(renamedDock).toBeTruthy();
    expect(pack.rooms[renamedDock!]).toBeTruthy();
    expect(pack.rooms.pier).toBeTruthy();
    expect(
      pack.links?.some((l) => l.from === renamedDock && l.to === "pier")
    ).toBe(true);
  });

  it("can skip collisions", () => {
    const base = roomPack("base", "dock");
    const donor = roomPack("other", "dock");
    const { pack, report } = blendPacks(base, donor, { onConflict: "skip" });
    expect(Object.keys(pack.rooms)).toEqual(["dock"]);
    expect(report.skipped).toContain("room:dock");
  });

  it("blends tone + place then content packs", () => {
    let base = createEmptyJsonPack({
      id: "sunny-cal",
      title: "Sunny Cal",
      startRoom: "beach",
    });
    base = {
      ...base,
      rooms: {
        beach: {
          id: "beach",
          name: "Beach",
          description: "A new room.",
          image: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
          hotspots: [],
        },
      },
    };
    base = applyGenrePreset(base, "sunny-adventure");
    base = applySettingKit(base, "california");
    const office = roomPack("office-kit", "cubicle");
    office.rooms.cubicle!.description = "Fluorescent calm.";
    const { pack } = blendPacks(base, office);
    expect(pack.rooms.beach?.particles).toBe("sparkle");
    expect(pack.rooms.cubicle).toBeTruthy();
    expect(pack.verbMode).toBe("coin");
  });

  it("blendPacksMany stacks donors", () => {
    const base = roomPack("base", "hub");
    const a = roomPack("a", "forest");
    const b = roomPack("b", "station");
    const { pack, reports } = blendPacksMany(base, [a, b]);
    expect(pack.rooms.hub && pack.rooms.forest && pack.rooms.station).toBeTruthy();
    expect(reports).toHaveLength(2);
    expect(formatBlendReport(reports[0]!)).toContain("forest");
  });

  it("selective layers: audio-only blend", () => {
    const base = roomPack("base", "plaza");
    const donor = roomPack("cyber", "alley");
    donor.audio = {
      music: { alley: "underground", plaza: "noir" },
      sfx: { zap: "/audio/zap.mp3" },
    };
    const { pack } = blendPacks(base, donor, { layers: ["audio"] });
    expect(pack.rooms.alley).toBeUndefined();
    expect(pack.audio?.music?.plaza).toBe("noir");
    expect(pack.audio?.sfx?.zap).toBeTruthy();
  });
});
