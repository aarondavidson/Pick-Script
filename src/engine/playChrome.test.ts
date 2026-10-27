import { describe, expect, it } from "vitest";
import type { GameDefinition } from "./definition";
import { resolvePlayChrome } from "./playChrome";

function stub(partial?: Partial<GameDefinition>): GameDefinition {
  return {
    id: "t",
    title: "T",
    version: "1.0.0",
    startRoom: "r",
    rooms: {
      r: {
        id: "r",
        name: "R",
        description: "",
        image: "data:,",
        hotspots: [],
        exits: [],
      },
    },
    combinations: {},
    achievements: [],
    quests: [],
    ...partial,
  };
}

describe("resolvePlayChrome", () => {
  it("defaults extras on when home is requested", () => {
    const c = resolvePlayChrome(stub(), { showHomeLink: true });
    expect(c).toEqual({
      home: true,
      journal: true,
      quests: true,
      map: false, // single room → map policy off
      achievements: true,
      hints: true,
    });
  });

  it("enables map when the pack has multiple rooms", () => {
    const c = resolvePlayChrome(
      stub({
        rooms: {
          a: {
            id: "a",
            name: "A",
            description: "",
            image: "data:,",
            hotspots: [],
            exits: [],
          },
          b: {
            id: "b",
            name: "B",
            description: "",
            image: "data:,",
            hotspots: [],
            exits: [],
          },
        },
      }),
      { showHomeLink: false }
    );
    expect(c.map).toBe(true);
    expect(c.home).toBe(false);
  });

  it("honors shell.chrome hide flags", () => {
    const c = resolvePlayChrome(
      stub({
        mapFastTravel: { enabled: true },
        rooms: {
          a: {
            id: "a",
            name: "A",
            description: "",
            image: "data:,",
            hotspots: [],
            exits: [],
          },
          b: {
            id: "b",
            name: "B",
            description: "",
            image: "data:,",
            hotspots: [],
            exits: [],
          },
        },
        shell: {
          chrome: {
            hideJournal: true,
            hideQuests: true,
            hideMap: true,
            hideAchievements: true,
            hideHints: true,
            hideHome: true,
          },
        },
      }),
      { showHomeLink: true }
    );
    expect(c).toEqual({
      home: false,
      journal: false,
      quests: false,
      map: false,
      achievements: false,
      hints: false,
    });
  });

  it("hides map when mapFastTravel is false even without chrome flag", () => {
    const c = resolvePlayChrome(
      stub({
        mapFastTravel: false,
        rooms: {
          a: {
            id: "a",
            name: "A",
            description: "",
            image: "data:,",
            hotspots: [],
            exits: [],
          },
          b: {
            id: "b",
            name: "B",
            description: "",
            image: "data:,",
            hotspots: [],
            exits: [],
          },
        },
      })
    );
    expect(c.map).toBe(false);
  });
});
