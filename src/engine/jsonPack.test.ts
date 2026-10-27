import { describe, expect, it } from "vitest";
import {
  compileJsonDialogue,
  createEmptyJsonPack,
  createGameFromJson,
  parseJsonPack,
  validateJsonPack,
} from "./jsonPack";
import { createGame } from "./createGame";

describe("json pack", () => {
  it("createEmptyJsonPack validates and compiles", () => {
    const doc = createEmptyJsonPack({ id: "demo", title: "Demo" });
    const v = validateJsonPack(doc);
    expect(v.ok).toBe(true);
    const def = createGameFromJson(doc);
    expect(def.id).toBe("demo");
    expect(def.rooms.start).toBeTruthy();
    expect(createGame(def).validate().ok).toBe(true);
  });

  it("compiles pickup hotspot + gated link", () => {
    const doc = createEmptyJsonPack({
      id: "two-room",
      title: "Two Room",
      startRoom: "a",
      rooms: {
        a: {
          id: "a",
          name: "A",
          image: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
          hotspots: [
            {
              id: "key",
              name: "Key",
              x: 10,
              y: 10,
              width: 10,
              height: 10,
              kind: "pickup",
              itemId: "brass_key",
              itemName: "Brass Key",
              lookText: "A shiny key.",
            },
          ],
        },
        b: {
          id: "b",
          name: "B",
          image: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
          hotspots: [],
        },
      },
      links: [
        {
          from: "a",
          to: "b",
          direction: "east",
          fromLabel: "Door",
          toLabel: "Back",
          requireFlag: "got_brass_key",
          blockedMessage: "Locked.",
        },
      ],
    });

    expect(validateJsonPack(doc).ok).toBe(true);
    const def = createGameFromJson(doc);
    expect(def.rooms.a.exits?.length).toBe(1);
    expect(def.rooms.b.exits?.length).toBe(1);
    expect(def.rooms.a.exits![0].blocked).toBeTypeOf("function");

    const game = createGame(def);
    let state = game.createInitialState();
    expect(def.rooms.a.exits![0].blocked!(state)).toBe(true);
    const key = def.rooms.a.hotspots.find((h) => h.id === "key")!;
    const result = game.doSentence(key, "look", state, null);
    state = game.applyPatch(state, result.patch ?? {});
    expect(state.flags.got_brass_key).toBe(true);
    expect(state.inventory.some((i) => i.id === "brass_key")).toBe(true);
    expect(def.rooms.a.exits![0].blocked!(state)).toBe(false);
  });

  it("rejects bad schema", () => {
    expect(() => parseJsonPack({ schemaVersion: 99 })).toThrow(/schemaVersion/);
  });

  it("flags missing startRoom", () => {
    const doc = createEmptyJsonPack();
    doc.startRoom = "missing";
    expect(validateJsonPack(doc).ok).toBe(false);
  });

  it("applies catalog item icons to pickups and itemIcons map", () => {
    const icon =
      "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
    const doc = createEmptyJsonPack({
      id: "items-pack",
      title: "Items",
      startRoom: "a",
      rooms: {
        a: {
          id: "a",
          name: "A",
          image: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
          hotspots: [
            {
              id: "coin",
              name: "Coin",
              x: 10,
              y: 10,
              width: 8,
              height: 8,
              kind: "pickup",
              itemId: "gold_coin",
            },
          ],
        },
      },
      items: {
        gold_coin: {
          id: "gold_coin",
          name: "Gold coin",
          description: "Shiny.",
          icon,
        },
      },
    });
    expect(validateJsonPack(doc).ok).toBe(true);
    const def = createGameFromJson(doc);
    expect(def.itemIcons?.gold_coin).toBe(icon);
    const game = createGame(def);
    let state = game.createInitialState();
    const hs = def.rooms.a.hotspots[0]!;
    const result = game.doSentence(hs, "use", state, null);
    state = game.applyPatch(state, result.patch ?? {});
    expect(state.inventory[0]?.icon).toBe(icon);
    expect(state.inventory[0]?.name).toBe("Gold coin");
  });

  it("compiles lite dialogue with branches and END", () => {
    const tree = compileJsonDialogue({
      speaker: "Tony",
      lines: [
        {
          id: "hi",
          text: "Hey.",
          choices: [
            { text: "Ask", nextId: "ask" },
            { text: "Leave", nextId: "END" },
          ],
        },
        {
          id: "ask",
          text: "What do you want?",
          choices: [{ text: "Bye", nextId: "END" }],
        },
      ],
    });
    expect(tree.startNode).toBe("hi");
    expect(tree.nodes.hi.choices[0].nextNode).toBe("ask");
    expect(tree.nodes.hi.choices[1].nextNode).toBe("END");
    expect(tree.nodes.ask.speaker).toBe("Tony");

    const doc = createEmptyJsonPack({
      id: "talk-pack",
      title: "Talk",
      startRoom: "a",
      rooms: {
        a: {
          id: "a",
          name: "A",
          image: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
          hotspots: [
            {
              id: "npc",
              name: "Tony",
              x: 20,
              y: 20,
              width: 10,
              height: 20,
              kind: "character",
              actorId: "tony",
              dialogue: {
                speaker: "Tony",
                lines: [
                  {
                    id: "hi",
                    text: "Hey.",
                    choices: [{ text: "Bye", nextId: "END" }],
                  },
                ],
              },
            },
          ],
        },
      },
    });
    const def = createGameFromJson(doc);
    expect(def.actors.tony).toBeTruthy();
    expect(def.rooms.a.hotspots[0].dialogue?.startNode).toBe("hi");
    expect(def.mapGroups?.World).toContain("a");
  });

  it("honors mapGroups and mapFastTravel", () => {
    const doc = createEmptyJsonPack({
      id: "map-pack",
      title: "Map",
      mapGroups: { Town: ["start"] },
      mapFastTravel: { enabled: false },
    });
    const def = createGameFromJson(doc);
    expect(def.mapGroups).toEqual({ Town: ["start"] });
    expect(def.mapFastTravel).toEqual({ enabled: false });
  });
});
