/**
 * Starter pack templates for the New Game Wizard + Pack starter gallery.
 * Seeds JsonPackDocument (not TypeScript recipes).
 */

import {
  createEmptyJsonPack,
  type JsonPackDocument,
  type JsonPackHotspot,
} from "@/engine/jsonPack";
import { suggestId } from "@/authoring/codegen";
import {
  applyGetItemKit,
  applyLockedExitKit,
  applyUseWithKit,
} from "@/authoring/puzzleKits";

export type PackTemplateId =
  | "blank"
  | "key-door"
  | "two-room"
  | "talk-gate"
  | "combine-craft"
  | "look-scenery"
  | "map-hub"
  | "give-item"
  | "short-mystery";

export interface PackTemplateMeta {
  id: PackTemplateId;
  title: string;
  blurb: string;
  /** Genre tag for gallery filters */
  genre: string;
}

export const PACK_TEMPLATES: PackTemplateMeta[] = [
  {
    id: "blank",
    title: "Blank room",
    blurb: "One empty room — upload art and draw hotspots.",
    genre: "scratch",
  },
  {
    id: "key-door",
    title: "Key → chest",
    blurb: "Pickup a key and unlock a chest (classic micro-puzzle).",
    genre: "inventory",
  },
  {
    id: "two-room",
    title: "Two rooms + locked exit",
    blurb: "Start room, hallway, and a door that needs a flag.",
    genre: "exploration",
  },
  {
    id: "talk-gate",
    title: "Talk gate",
    blurb: "NPC dialogue sets a flag that unlocks the exit.",
    genre: "dialogue",
  },
  {
    id: "combine-craft",
    title: "Combine craft",
    blurb: "Two pickups combine into a tool that opens a door.",
    genre: "inventory",
  },
  {
    id: "look-scenery",
    title: "Look scenery",
    blurb: "Teach Look — three scenery hotspots with flavor text.",
    genre: "tutorial",
  },
  {
    id: "map-hub",
    title: "Map hub (3 rooms)",
    blurb: "Hub + two wings with map groups for fast travel practice.",
    genre: "exploration",
  },
  {
    id: "give-item",
    title: "Give item to NPC",
    blurb: "Find a gift, use it on a character, earn a key flag.",
    genre: "dialogue",
  },
  {
    id: "short-mystery",
    title: "Short mystery (harbor)",
    blurb:
      "Hub + three wings + locked climax — key pickup, hint thread, music cues.",
    genre: "mystery",
  },
];

export interface CreateFromTemplateOpts {
  id: string;
  title: string;
  subtitle?: string;
  templateId: PackTemplateId;
}

function withStartMeta(doc: JsonPackDocument): JsonPackDocument {
  const start = doc.rooms[doc.startRoom]!;
  return {
    ...doc,
    rooms: {
      ...doc.rooms,
      [start.id]: {
        ...start,
        name: "Starting Room",
        description: "Your adventure begins here.",
        music: "home",
      },
    },
  };
}

function addRoom(
  doc: JsonPackDocument,
  id: string,
  name: string,
  description: string,
  music = "home"
): JsonPackDocument {
  return {
    ...doc,
    rooms: {
      ...doc.rooms,
      [id]: {
        id,
        name,
        description,
        image: "",
        music,
        hotspots: [],
      },
    },
  };
}

function putCharacter(
  doc: JsonPackDocument,
  roomId: string,
  hotspot: JsonPackHotspot
): JsonPackDocument {
  const room = doc.rooms[roomId];
  if (!room) return doc;
  return {
    ...doc,
    rooms: {
      ...doc.rooms,
      [roomId]: {
        ...room,
        hotspots: [...(room.hotspots ?? []), hotspot],
      },
    },
  };
}

/** Build a playable starter pack from a template + title/id. */
export function createPackFromTemplate(
  opts: CreateFromTemplateOpts
): JsonPackDocument {
  const packId = suggestId(opts.id, "my-pack");
  const title = opts.title.trim() || "Untitled Pack";
  let doc = createEmptyJsonPack({
    id: packId,
    title,
    subtitle: opts.subtitle?.trim() || undefined,
    verbMode: "coin",
  });
  doc = withStartMeta(doc);
  const startId = doc.startRoom;

  if (opts.templateId === "blank") {
    return doc;
  }

  if (opts.templateId === "key-door") {
    const withDesk = applyGetItemKit(doc, startId, {
      hotspotId: "desk",
      hotspotName: "Desk",
      x: 18,
      y: 42,
      width: 22,
      height: 28,
      itemId: "brass_key",
      itemName: "Brass Key",
      itemDescription: "Opens the chest.",
      lookText: "A sticky note: “Key in the drawer.”",
      pickupMessage: "You pocket the brass key.",
    });
    const unlocked = applyUseWithKit(withDesk, startId, {
      hotspotId: "chest",
      hotspotName: "Chest",
      x: 58,
      y: 48,
      width: 20,
      height: 26,
      lookText: "A locked wooden chest.",
      itemId: "brass_key",
      successMessage: "The key turns. Inside: a silver locket.",
      alreadyFlag: "chest_open",
      alreadyMessage: "The chest is already open.",
      setFlag: "chest_open",
      consumeItem: true,
      giveItem: {
        id: "locket",
        name: "Silver Locket",
        description: "You did it.",
      },
      fallbackMessage: "That doesn't fit the lock.",
    });
    return {
      ...unlocked,
      quests: [
        {
          id: "open_chest",
          title: "The locked chest",
          description: "Something valuable is sealed inside.",
          objectives: ["Find the brass key", "Open the chest"],
          objectiveFlags: ["got_brass_key", "chest_open"],
          completeFlag: "chest_open",
        },
      ],
      hints: [
        {
          id: "chest_hint",
          title: "Locked chest",
          tiers: [
            "Desks often hide keys.",
            "Look at the desk, then take what’s inside.",
            "Use the Brass Key with the Chest.",
          ],
          untilFlag: "chest_open",
        },
      ],
    };
  }

  if (opts.templateId === "two-room") {
    const hallwayId = "hallway";
    doc = addRoom(
      doc,
      hallwayId,
      "Hallway",
      "A short corridor. Freedom waits beyond."
    );
    doc = {
      ...doc,
      mapGroups: { Home: [startId, hallwayId] },
    };
    doc = applyGetItemKit(doc, startId, {
      hotspotId: "sticky_note",
      hotspotName: "Sticky note",
      x: 40,
      y: 30,
      width: 14,
      height: 12,
      itemId: "hall_pass",
      itemName: "Hall Pass",
      itemDescription: "Lets you through the hall door.",
      lookText: "“Door unlocks when you take this.”",
      pickupMessage: "You peel off the sticky note.",
    });
    const linked = applyLockedExitKit(doc, {
      from: startId,
      to: hallwayId,
      direction: "east",
      fromLabel: "Hallway",
      toLabel: "Starting Room",
      requireFlag: "got_hall_pass",
      blockedMessage: "The hall door is locked. Take the sticky note.",
    });
    return {
      ...linked,
      quests: [
        {
          id: "reach_hall",
          title: "Reach the hallway",
          description: "Get past the locked hall door.",
          objectives: ["Take the sticky note (hall pass)"],
          objectiveFlags: ["got_hall_pass"],
          completeFlag: "got_hall_pass",
        },
      ],
      hints: [
        {
          id: "hall_hint",
          title: "Hall door",
          tiers: [
            "Something on the wall looks peelable.",
            "Take the sticky note — it’s your hall pass.",
            "With the note taken, the east exit unlocks.",
          ],
          untilFlag: "got_hall_pass",
        },
      ],
    };
  }

  if (opts.templateId === "talk-gate") {
    const streetId = "street";
    doc = addRoom(doc, streetId, "Street", "Outside at last.");
    doc = putCharacter(doc, startId, {
      id: "guard",
      name: "Guard",
      x: 55,
      y: 38,
      width: 14,
      height: 36,
      kind: "character",
      verbs: ["look", "talk"],
      actorId: "guard",
      lookText: "A bored guard blocks the door.",
      approach: { x: 50, y: 78 },
      dialogue: {
        speaker: "Guard",
        lines: [
          {
            id: "hello",
            text: "Passphrase?",
            choices: [
              {
                text: "Open sesame",
                nextId: "ok",
                setFlag: "guard_convinced",
                choiceId: "sesame",
              },
              { text: "Never mind", nextId: "END", choiceId: "bye" },
            ],
          },
          {
            id: "ok",
            text: "Fine. Door’s unlocked.",
            choices: [{ text: "Thanks", nextId: "END" }],
          },
        ],
      },
    });
    return applyLockedExitKit(doc, {
      from: startId,
      to: streetId,
      direction: "east",
      fromLabel: "Street",
      toLabel: "Starting Room",
      requireFlag: "guard_convinced",
      blockedMessage: "The guard won’t budge. Try talking.",
    });
  }

  if (opts.templateId === "combine-craft") {
    doc = applyGetItemKit(doc, startId, {
      hotspotId: "stick_pile",
      hotspotName: "Stick",
      x: 16,
      y: 50,
      width: 12,
      height: 16,
      itemId: "stick",
      itemName: "Stick",
      itemDescription: "A sturdy stick.",
      lookText: "Could be half of a tool.",
      pickupMessage: "You take the stick.",
    });
    doc = applyGetItemKit(doc, startId, {
      hotspotId: "twine_spool",
      hotspotName: "Twine",
      x: 34,
      y: 52,
      width: 12,
      height: 14,
      itemId: "twine",
      itemName: "Twine",
      itemDescription: "Rough twine.",
      lookText: "Good for binding.",
      pickupMessage: "You pocket the twine.",
    });
    doc = {
      ...doc,
      combinations: {
        "stick+twine": {
          items: ["stick", "twine"],
          result: {
            id: "grappling_hook",
            name: "Grappling Hook",
            description: "Improvised, but it works.",
          },
          successMessage: "You lash the twine to the stick — a grappling hook!",
        },
      },
    };
    const roofId = "roof";
    doc = addRoom(doc, roofId, "Roof", "Wind and sky.");
    return applyLockedExitKit(doc, {
      from: startId,
      to: roofId,
      direction: "up",
      fromLabel: "Climb up",
      toLabel: "Climb down",
      requireItem: "grappling_hook",
      blockedMessage: "Too high. Craft a grappling hook (combine stick + twine).",
    });
  }

  if (opts.templateId === "look-scenery") {
    const scenery: JsonPackHotspot[] = [
      {
        id: "painting",
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
        id: "window",
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
        id: "rug",
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
    const room = doc.rooms[startId]!;
    return {
      ...doc,
      rooms: {
        ...doc.rooms,
        [startId]: { ...room, hotspots: scenery },
      },
    };
  }

  if (opts.templateId === "map-hub") {
    const leftId = "west_wing";
    const rightId = "east_wing";
    doc = addRoom(doc, leftId, "West Wing", "Quiet shelves.");
    doc = addRoom(doc, rightId, "East Wing", "Sunlit hall.");
    doc = {
      ...doc,
      mapGroups: { Manor: [startId, leftId, rightId] },
      mapFastTravel: { enabled: true, requireVisited: true },
    };
    doc = applyLockedExitKit(doc, {
      from: startId,
      to: leftId,
      direction: "west",
      fromLabel: "West Wing",
      toLabel: "Hub",
    });
    doc = applyLockedExitKit(doc, {
      from: startId,
      to: rightId,
      direction: "east",
      fromLabel: "East Wing",
      toLabel: "Hub",
    });
    doc = applyGetItemKit(doc, leftId, {
      hotspotId: "ledger",
      hotspotName: "Ledger",
      x: 40,
      y: 48,
      width: 16,
      height: 14,
      itemId: "ledger",
      itemName: "Ledger",
      itemDescription: "Names and dates.",
      lookText: "A dusty ledger on a stand.",
      pickupMessage: "You tuck the ledger under your arm.",
    });
    return doc;
  }

  if (opts.templateId === "give-item") {
    // Pickup gift → use on NPC → flag unlocks exit
    const gardenId = "garden";
    doc = addRoom(doc, gardenId, "Garden", "Fresh air.");
    doc = applyGetItemKit(doc, startId, {
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
    doc = putCharacter(doc, startId, {
      id: "gardener",
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
    });
    return applyLockedExitKit(doc, {
      from: startId,
      to: gardenId,
      direction: "south",
      fromLabel: "Garden",
      toLabel: "Inside",
      requireFlag: "garden_open",
      blockedMessage: "The garden gate is locked. Help the gardener.",
    });
  }

  if (opts.templateId === "short-mystery") {
    // Harbor-sized: hub + 3 wings + locked climax, key pickup, hint thread
    const pierId = "north_pier";
    const alleyId = "market_alley";
    const boatId = "boathouse";
    const climaxId = "lighthouse";

    const start = doc.rooms[startId]!;
    doc = {
      ...doc,
      verbMode: "coin",
      audio: {
        defaultMusic: "harbor",
        music: {
          harbor: "noir",
          pier: "calm",
          alley: "eerie",
          boats: "underground",
          beacon: "noir",
        },
        ambient: { harbor: "wind", pier: "wind", boats: "drip" },
      },
      rooms: {
        ...doc.rooms,
        [startId]: {
          ...start,
          name: "Harbor Square",
          description:
            "Fog pools between the bollards. Three paths branch off; the lighthouse waits east.",
          music: "harbor",
          particles: "fog",
        },
      },
    };

    doc = addRoom(
      doc,
      pierId,
      "North Pier",
      "Wet planks and gull cries. A notice board flaps in the wind.",
      "pier"
    );
    doc = addRoom(
      doc,
      alleyId,
      "Market Alley",
      "Closed stalls. Someone chalked a lighthouse on the bricks.",
      "alley"
    );
    doc = addRoom(
      doc,
      boatId,
      "Boathouse",
      "Tar, rope, and a workbench that still holds secrets.",
      "boats"
    );
    doc = addRoom(
      doc,
      climaxId,
      "Lighthouse",
      "The lantern room. Whatever was taken from the harbor ends here.",
      "beacon"
    );

    doc = {
      ...doc,
      mapGroups: {
        Harbor: [startId, pierId, alleyId, boatId, climaxId],
      },
      mapFastTravel: { enabled: true, requireVisited: true },
    };

    // Open wings from the hub
    doc = applyLockedExitKit(doc, {
      from: startId,
      to: pierId,
      direction: "north",
      fromLabel: "North Pier",
      toLabel: "Harbor Square",
    });
    doc = applyLockedExitKit(doc, {
      from: startId,
      to: alleyId,
      direction: "west",
      fromLabel: "Market Alley",
      toLabel: "Harbor Square",
    });
    doc = applyLockedExitKit(doc, {
      from: startId,
      to: boatId,
      direction: "south",
      fromLabel: "Boathouse",
      toLabel: "Harbor Square",
    });

    // Flavor look hotspot in the alley (exploration beat)
    const alley = doc.rooms[alleyId]!;
    doc = {
      ...doc,
      rooms: {
        ...doc.rooms,
        [alleyId]: {
          ...alley,
          hotspots: [
            ...(alley.hotspots ?? []),
            {
              id: "chalk_mark",
              name: "Chalk mark",
              x: 42,
              y: 38,
              width: 16,
              height: 20,
              kind: "interact",
              verbs: ["look"],
              lookText:
                "A rough lighthouse. Under it: “KEY STILL IN THE BOATS.”",
            },
          ],
        },
      },
    };

    // Key pickup in the boathouse
    doc = applyGetItemKit(doc, boatId, {
      hotspotId: "workbench",
      hotspotName: "Workbench",
      x: 48,
      y: 44,
      width: 22,
      height: 24,
      itemId: "harbor_key",
      itemName: "Harbor Key",
      itemDescription: "Heavy iron. Fits the lighthouse gate.",
      lookText: "Tools, a stained rag… and a key under the vise.",
      pickupMessage: "You pocket the harbor key.",
    });

    // Locked climax exit
    doc = applyLockedExitKit(doc, {
      from: startId,
      to: climaxId,
      direction: "east",
      fromLabel: "Lighthouse",
      toLabel: "Harbor Square",
      requireFlag: "got_harbor_key",
      blockedMessage:
        "The lighthouse gate is locked. Search the harbor for a key.",
    });

    return {
      ...doc,
      quests: [
        {
          id: "reach_lighthouse",
          title: "Open the lighthouse",
          description: "Something was moved from the harbor into the beacon.",
          objectives: [
            "Explore the three wings",
            "Find the harbor key",
            "Enter the lighthouse",
          ],
          objectiveFlags: ["got_harbor_key"],
          completeFlag: "got_harbor_key",
        },
      ],
      hints: [
        {
          id: "harbor_key_hint",
          title: "Lighthouse gate",
          tiers: [
            "Three paths leave the square — look for writing.",
            "The alley chalk points at the boats.",
            "Take the Harbor Key from the boathouse workbench, then go east.",
          ],
          untilFlag: "got_harbor_key",
        },
      ],
    };
  }

  return doc;
}

/** Serialize a starter for download / packUrl demos (no real art yet). */
export function exportTemplatePackJson(
  templateId: PackTemplateId,
  opts?: { id?: string; title?: string }
): string {
  const meta = PACK_TEMPLATES.find((t) => t.id === templateId);
  const doc = createPackFromTemplate({
    id: opts?.id || `starter-${templateId}`,
    title: opts?.title || meta?.title || templateId,
    templateId,
  });
  return `${JSON.stringify(doc, null, 2)}\n`;
}
