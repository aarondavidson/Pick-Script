/**
 * One-click Apply: puzzle recipe id → mutate JsonPackDocument via kits.
 */

import {
  applyGetItemKit,
  applyLockedExitKit,
  applyUseWithKit,
} from "@/authoring/puzzleKits";
import { addRoom, updateRoom } from "@/studio/packDraft";
import {
  DEFAULT_MINIGAME_WIN_FLAGS,
  sanitizeMinigameConfig,
} from "@/engine/jsonPackSpecials";
import type {
  JsonPackDocument,
  JsonPackHotspot,
  JsonPackRegion,
  JsonPackRoomTimer,
} from "@/engine/jsonPack";

export type ApplyRecipeResult =
  | { ok: true; doc: JsonPackDocument; message: string }
  | { ok: false; message: string };

const APPLYABLE = [
  "get-item",
  "use-with",
  "locked-exit",
  "combine-items",
  "talk-gate",
  "look-scenery",
  "give-item",
  "region-trigger",
  "timer-beat",
  "sequence-lock",
  "slider-puzzle",
  "dial-lock",
  "wire-match",
] as const;

export type ApplyableRecipeId = (typeof APPLYABLE)[number];

export function isApplyableRecipeId(id: string): id is ApplyableRecipeId {
  return (APPLYABLE as readonly string[]).includes(id);
}

export function listApplyableRecipeIds(): ApplyableRecipeId[] {
  return [...APPLYABLE];
}

/**
 * Apply a recipe pattern into the current pack draft (current start room).
 */
export function applyRecipeToPack(
  doc: JsonPackDocument,
  recipeId: string,
  roomId?: string
): ApplyRecipeResult {
  const start = roomId && doc.rooms[roomId] ? roomId : doc.startRoom;
  if (!doc.rooms[start]) {
    return { ok: false, message: "No valid room to apply into." };
  }

  switch (recipeId) {
    case "get-item": {
      const next = applyGetItemKit(doc, start, {
        hotspotName: "Drawer",
        x: 20,
        y: 40,
        width: 18,
        height: 22,
        itemId: "brass_key",
        itemName: "Brass Key",
        itemDescription: "Opens something nearby.",
        lookText: "A drawer that might hold a key.",
        pickupMessage: "You take the brass key.",
      });
      return {
        ok: true,
        doc: next,
        message: "Added pickup hotspot “Drawer” + brass_key.",
      };
    }
    case "use-with": {
      const keyId =
        Object.keys(doc.items ?? {}).find((id) => /key/i.test(id)) ||
        "brass_key";
      let base = doc;
      if (!doc.items?.[keyId]) {
        base = applyGetItemKit(doc, start, {
          hotspotName: "Key spot",
          x: 18,
          y: 42,
          width: 14,
          height: 16,
          itemId: keyId,
          itemName: "Brass Key",
          pickupMessage: "You take the key.",
        });
      }
      const next = applyUseWithKit(base, start, {
        hotspotName: "Chest",
        x: 58,
        y: 48,
        width: 20,
        height: 26,
        lookText: "A locked chest.",
        itemId: keyId,
        successMessage: "It opens.",
        alreadyFlag: "chest_open",
        setFlag: "chest_open",
        consumeItem: true,
        giveItem: {
          id: "locket",
          name: "Locket",
          description: "Shiny.",
        },
        fallbackMessage: "That doesn't fit.",
      });
      return {
        ok: true,
        doc: next,
        message: `Wired use-with: ${keyId} → Chest.`,
      };
    }
    case "locked-exit": {
      const hallId = "hallway";
      let next = doc.rooms[hallId]
        ? doc
        : addRoom(doc, "Hallway");
      // addRoom generates id from name — find newest or use hallway
      const toId = next.rooms[hallId]
        ? hallId
        : Object.keys(next.rooms).find((id) => !doc.rooms[id]) || hallId;
      if (!next.rooms[toId]) {
        next = {
          ...next,
          rooms: {
            ...next.rooms,
            [hallId]: {
              id: hallId,
              name: "Hallway",
              description: "Beyond the locked door.",
              image: "",
              music: "home",
              hotspots: [],
            },
          },
        };
      }
      const target = next.rooms[hallId] ? hallId : toId;
      next = applyGetItemKit(next, start, {
        hotspotName: "Pass note",
        x: 40,
        y: 30,
        width: 12,
        height: 12,
        itemId: "hall_pass",
        itemName: "Hall Pass",
        pickupMessage: "You take the pass.",
      });
      next = applyLockedExitKit(next, {
        from: start,
        to: target,
        direction: "east",
        fromLabel: next.rooms[target]?.name || "Hallway",
        toLabel: next.rooms[start]?.name || "Start",
        requireFlag: "got_hall_pass",
        blockedMessage: "Locked. Take the pass note first.",
      });
      return {
        ok: true,
        doc: next,
        message: `Locked exit → ${target} (needs got_hall_pass).`,
      };
    }
    case "combine-items": {
      let next = applyGetItemKit(doc, start, {
        hotspotName: "Stick",
        x: 16,
        y: 50,
        width: 12,
        height: 14,
        itemId: "stick",
        itemName: "Stick",
        pickupMessage: "You take a stick.",
      });
      next = applyGetItemKit(next, start, {
        hotspotName: "Twine",
        x: 32,
        y: 52,
        width: 12,
        height: 14,
        itemId: "twine",
        itemName: "Twine",
        pickupMessage: "You take twine.",
      });
      next = {
        ...next,
        combinations: {
          ...(next.combinations ?? {}),
          "stick+twine": {
            items: ["stick", "twine"],
            result: {
              id: "rope_tool",
              name: "Rope Tool",
              description: "Bound together.",
            },
            successMessage: "You bind stick and twine.",
          },
        },
      };
      return {
        ok: true,
        doc: next,
        message: "Added stick + twine combine → rope_tool.",
      };
    }
    case "talk-gate": {
      const streetId = "street";
      let next: JsonPackDocument = doc.rooms[streetId]
        ? doc
        : {
            ...doc,
            rooms: {
              ...doc.rooms,
              [streetId]: {
                id: streetId,
                name: "Street",
                description: "Outside.",
                image: "",
                music: "home",
                hotspots: [],
              },
            },
          };
      const room = next.rooms[start]!;
      next = {
        ...next,
        rooms: {
          ...next.rooms,
          [start]: {
            ...room,
            hotspots: [
              ...(room.hotspots ?? []),
              {
                id: uniqueHotspotId(room.hotspots, "guard"),
                name: "Guard",
                x: 55,
                y: 38,
                width: 14,
                height: 36,
                kind: "character",
                verbs: ["look", "talk"],
                actorId: "guard",
                lookText: "Blocks the way.",
                dialogue: {
                  speaker: "Guard",
                  lines: [
                    {
                      id: "hello",
                      text: "Say the word.",
                      choices: [
                        {
                          text: "Open sesame",
                          nextId: "END",
                          setFlag: "guard_convinced",
                          choiceId: "sesame",
                        },
                        { text: "Bye", nextId: "END" },
                      ],
                    },
                  ],
                },
              },
            ],
          },
        },
      };
      next = applyLockedExitKit(next, {
        from: start,
        to: streetId,
        direction: "east",
        fromLabel: "Street",
        toLabel: room.name || "Start",
        requireFlag: "guard_convinced",
        blockedMessage: "The guard won't move. Try talking.",
      });
      return {
        ok: true,
        doc: next,
        message: "Talk-gate: Guard sets guard_convinced → Street.",
      };
    }
    case "look-scenery": {
      const room = doc.rooms[start]!;
      const existing = room.hotspots ?? [];
      const scenery: JsonPackHotspot[] = [
        {
          id: uniqueHotspotId(existing, "painting"),
          name: "Painting",
          x: 12,
          y: 22,
          width: 18,
          height: 28,
          kind: "interact",
          verbs: ["look"],
          lookText: "A stormy seascape. Someone underlined the lighthouse.",
        },
        {
          id: uniqueHotspotId(existing, "window"),
          name: "Window",
          x: 70,
          y: 20,
          width: 16,
          height: 30,
          kind: "interact",
          verbs: ["look"],
          lookText: "Rain streaks the glass. The street below is empty.",
        },
        {
          id: uniqueHotspotId(existing, "rug"),
          name: "Rug",
          x: 30,
          y: 70,
          width: 40,
          height: 18,
          kind: "interact",
          verbs: ["look", "use"],
          lookText: "A worn rug. Nothing under it… yet.",
          useText: "You straighten the fringe. Still nothing.",
        },
      ];
      // Avoid collisions when painting/window/rug all get unique* suffixes
      const used = new Set(existing.map((h) => h.id));
      const sceneryUnique = scenery.map((h, i) => {
        let id = h.id;
        while (used.has(id)) id = `${h.id}_${i}`;
        used.add(id);
        return { ...h, id };
      });
      const next = updateRoom(doc, start, {
        hotspots: [...existing, ...sceneryUnique],
      });
      return {
        ok: true,
        doc: next,
        message: "Added 3 look-scenery hotspots (painting, window, rug).",
      };
    }
    case "give-item": {
      // Pickup via kit; character give uses useWith on a character hotspot
      // (same pattern as packTemplates give-item — kits cover pickup only).
      let next = applyGetItemKit(doc, start, {
        hotspotId: "flower_vase",
        hotspotName: "Flower",
        x: 22,
        y: 48,
        width: 12,
        height: 18,
        itemId: "flower",
        itemName: "Flower",
        itemDescription: "A wilting but sincere gift.",
        lookText: "Someone left a flower for the gardener.",
        pickupMessage: "You take the flower.",
      });
      const room = next.rooms[start]!;
      const gardener: JsonPackHotspot = {
        id: uniqueHotspotId(room.hotspots, "gardener"),
        name: "Gardener",
        x: 60,
        y: 40,
        width: 14,
        height: 34,
        kind: "character",
        verbs: ["look", "talk", "use"],
        actorId: "gardener",
        lookText: "She eyes the empty vase on the windowsill.",
        approach: { x: 54, y: 78 },
        dialogue: {
          speaker: "Gardener",
          lines: [
            {
              id: "hello",
              text: "Bring me something living and I’ll open the garden.",
              choices: [{ text: "I’ll look around", nextId: "END" }],
            },
          ],
        },
        useWith: [
          {
            itemId: "flower",
            message: "She smiles. “The garden gate is open.”",
            setFlag: "garden_open",
            alreadyFlag: "garden_open",
            alreadyMessage: "She’s already tending the flower.",
            consumeItem: true,
          },
        ],
        fallbackUseWithMessage: "She only wants a flower.",
      };
      next = updateRoom(next, start, {
        hotspots: [...(room.hotspots ?? []), gardener],
      });
      next = {
        ...next,
        initialFlags: {
          ...(next.initialFlags ?? {}),
          garden_open: next.initialFlags?.garden_open ?? false,
        },
      };
      return {
        ok: true,
        doc: next,
        message: "Give-item: Flower pickup + Gardener use-with → garden_open.",
      };
    }
    case "region-trigger": {
      const room = doc.rooms[start]!;
      const regions = room.regions ?? [];
      const region: JsonPackRegion = {
        id: uniqueRegionId(regions, "entry_pad"),
        x: 35,
        y: 55,
        width: 30,
        height: 20,
        onEnterFlag: "stepped_pad",
        message: "Your foot finds a soft click under the floorboards.",
      };
      const next = updateRoom(doc, start, {
        regions: [...regions, region],
      });
      const withFlag: JsonPackDocument = {
        ...next,
        initialFlags: {
          ...(next.initialFlags ?? {}),
          stepped_pad: next.initialFlags?.stepped_pad ?? false,
        },
      };
      return {
        ok: true,
        doc: withFlag,
        message: `Region “${region.id}” sets stepped_pad on enter.`,
      };
    }
    case "timer-beat": {
      const room = doc.rooms[start]!;
      const timers = room.timers ?? [];
      const timer: JsonPackRoomTimer = {
        id: uniqueTimerId(timers, "room_beat"),
        afterMs: 5000,
        once: true,
        message: "A distant bell tolls. Something shifted while you waited.",
      };
      const next = updateRoom(doc, start, {
        timers: [...timers, timer],
      });
      return {
        ok: true,
        doc: next,
        message: `Timer “${timer.id}” fires once after 5s in this room.`,
      };
    }
    case "sequence-lock": {
      return applyMinigameHotspot(doc, start, {
        preferredId: "sequence_lock",
        name: "Sequence Lock",
        lookText: "A panel of pads. Press them in the right order.",
        minigameId: "sequence-lock",
        config: {
          sequence: ["a", "b", "c", "d"],
          winFlag: DEFAULT_MINIGAME_WIN_FLAGS["sequence-lock"],
        },
        x: 42,
        y: 38,
      });
    }
    case "slider-puzzle": {
      return applyMinigameHotspot(doc, start, {
        preferredId: "slider_puzzle",
        name: "Slider Puzzle",
        lookText: "Colored sliders — line them up to open the way.",
        minigameId: "slider-puzzle",
        config: {
          order: ["b", "r", "g"],
          target: ["r", "g", "b"],
          winFlag: DEFAULT_MINIGAME_WIN_FLAGS["slider-puzzle"],
        },
        x: 48,
        y: 40,
      });
    }
    case "dial-lock": {
      return applyMinigameHotspot(doc, start, {
        preferredId: "dial_lock",
        name: "Dial Lock",
        lookText: "Three dials. Spin them to the right combo.",
        minigameId: "dial-lock",
        config: {
          positions: 10,
          target: [3, 7, 1],
          winFlag: DEFAULT_MINIGAME_WIN_FLAGS["dial-lock"],
        },
        x: 36,
        y: 42,
      });
    }
    case "wire-match": {
      return applyMinigameHotspot(doc, start, {
        preferredId: "wire_match",
        name: "Wire Panel",
        lookText: "Loose wires — match each left terminal to the right.",
        minigameId: "wire-match",
        config: {
          pairs: [
            ["a", "1"],
            ["b", "2"],
            ["c", "3"],
          ],
          winFlag: DEFAULT_MINIGAME_WIN_FLAGS["wire-match"],
        },
        x: 54,
        y: 36,
      });
    }
    default:
      return {
        ok: false,
        message: `Recipe “${recipeId}” is copy-paste only (TS snippet). Use get-item, use-with, locked-exit, combine-items, talk-gate, look-scenery, give-item, region-trigger, timer-beat, sequence-lock, slider-puzzle, dial-lock, or wire-match for Apply.`,
      };
  }
}

function applyMinigameHotspot(
  doc: JsonPackDocument,
  roomId: string,
  opts: {
    preferredId: string;
    name: string;
    lookText: string;
    minigameId: string;
    config: Record<string, unknown>;
    x: number;
    y: number;
  }
): ApplyRecipeResult {
  const room = doc.rooms[roomId];
  if (!room) {
    return { ok: false, message: "No valid room to apply into." };
  }
  const config = sanitizeMinigameConfig(opts.minigameId, opts.config);
  if (config === null) {
    return {
      ok: false,
      message: `Invalid ${opts.minigameId} config.`,
    };
  }
  const winFlag =
    (typeof config?.winFlag === "string" && config.winFlag) ||
    DEFAULT_MINIGAME_WIN_FLAGS[opts.minigameId] ||
    "minigame_won";
  const hotspot: JsonPackHotspot = {
    id: uniqueHotspotId(room.hotspots, opts.preferredId),
    name: opts.name,
    x: opts.x,
    y: opts.y,
    width: 18,
    height: 22,
    kind: "interact",
    verbs: ["look", "use"],
    lookText: opts.lookText,
    special: {
      kind: "minigame",
      minigameId: opts.minigameId,
      interceptVerbs: ["look", "use"],
      ...(config ? { config } : {}),
    },
  };
  const next = updateRoom(doc, roomId, {
    hotspots: [...(room.hotspots ?? []), hotspot],
  });
  const withFlag: JsonPackDocument = {
    ...next,
    initialFlags: {
      ...(next.initialFlags ?? {}),
      [winFlag]: next.initialFlags?.[winFlag] ?? false,
    },
  };
  return {
    ok: true,
    doc: withFlag,
    message: `Added ${opts.minigameId} hotspot “${hotspot.name}” (win → ${winFlag}).`,
  };
}

function uniqueHotspotId(
  hotspots: JsonPackHotspot[] | undefined,
  preferred: string
): string {
  const list = hotspots ?? [];
  if (!list.some((h) => h.id === preferred)) return preferred;
  return `${preferred}_${list.length}`;
}

function uniqueRegionId(
  regions: JsonPackRegion[],
  preferred: string
): string {
  if (!regions.some((r) => r.id === preferred)) return preferred;
  return `${preferred}_${regions.length}`;
}

function uniqueTimerId(
  timers: JsonPackRoomTimer[],
  preferred: string
): string {
  if (!timers.some((t) => t.id === preferred)) return preferred;
  return `${preferred}_${timers.length}`;
}
