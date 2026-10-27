/**
 * Puzzle recipe gallery — copy-paste patterns for pack authors.
 * Shown at /recipes and mirrored in docs/RECIPES.md.
 */

export interface Recipe {
  id: string;
  title: string;
  level: "new" | "mid";
  summary: string;
  seeAlso: string;
  snippet: string;
}

export const RECIPES: Recipe[] = [
  {
    id: "get-item",
    title: "Get an item from a hotspot",
    level: "new",
    summary:
      "Look/Use a hotspot → add inventory item + set a flag. Attic Study desk.",
    seeAlso: "src/games/attic-study/manifest.ts (desk)",
    snippet: `onInteract: (verb, state) => {
  if (verb !== "look" && verb !== "use") return {};
  if (state.flags.gotKey) return {};
  return {
    flags: { ...state.flags, gotKey: true },
    inventory: [
      ...state.inventory,
      {
        id: "attic_key",
        name: "Brass Key",
        description: "Opens the chest.",
        // icon: keyIcon,  // Vite-import PNG/JPG
      },
    ],
  };
},`,
  },
  {
    id: "use-with",
    title: "Use inventory item with hotspot",
    level: "new",
    summary:
      "Select Use → click item → click hotspot. onUseWith + useWithResponses. Attic chest.",
    seeAlso: "src/games/attic-study/manifest.ts (chest)",
    snippet: `useWithResponses: {
  attic_key: "The key turns. Inside: a silver locket.",
  "*": "That doesn't fit the lock.",
},
onUseWith: (itemId, state) => {
  if (itemId !== "attic_key" || state.flags.chestOpen) return {};
  return {
    flags: { ...state.flags, chestOpen: true },
    inventory: [
      ...state.inventory.filter((i) => i.id !== "attic_key"),
      { id: "locket", name: "Silver Locket", description: "You did it." },
    ],
  };
},`,
  },
  {
    id: "locked-exit",
    title: "Locked exit (blocked door)",
    level: "new",
    summary:
      "linkRooms with forwardBlocked until a flag is set. Template hall door.",
    seeAlso: "src/games/_template/manifest.ts (hallLink)",
    snippet: `import { linkRooms } from "@/engine";

const hallLink = linkRooms("start", "hallway", {
  direction: "east",
  fromLabel: "Hallway",
  toLabel: "Starting Room",
  forwardBlocked: (state) => !state.flags.gotKey,
  forwardBlockedMessage: "The hall door is locked. Look at the sticky note.",
});

// rooms.start.exits = [hallLink.forward];
// rooms.hallway.exits = [hallLink.back];`,
  },
  {
    id: "flag-responses",
    title: "Flag-gated Look / Use text",
    level: "new",
    summary:
      "responses as functions of state so copy changes after the puzzle advances.",
    seeAlso: "src/games/attic-study/manifest.ts (desk/chest responses)",
    snippet: `responses: {
  look: (state) =>
    state.flags.gotKey
      ? "The drawer hangs open. You already took the key."
      : "A sticky note: “Key in the drawer.” You slide it open.",
  use: (state) =>
    state.flags.gotKey
      ? "Nothing else in the drawer."
      : "You open the drawer and take a brass key.",
},`,
  },
  {
    id: "hints",
    title: "Progressive hints (untilFlagHint)",
    level: "new",
    summary:
      "Three-tier hints that disappear once a flag is true. Host Hint UI reveals tiers.",
    seeAlso: "src/engine/hints.ts · attic-study hints",
    snippet: `import { untilFlagHint } from "@/engine/hints";

hints: [
  untilFlagHint(
    "find_key",
    "The desk",
    [
      "Something glints in the desk drawer.",
      "Look at or Use the desk.",
      "Look at the desk to take the brass key.",
    ],
    "gotKey"
  ),
],`,
  },
  {
    id: "combine-items",
    title: "Combine two inventory items",
    level: "mid",
    summary:
      "definition.combinations — player picks two items in inventory UI. Studio can Apply into the pack draft.",
    seeAlso: "src/games/_template/manifest.ts (combinations)",
    snippet: `combinations: {
  "ducttape+rubberchicken": {
    items: ["ducttape", "rubberchicken"],
    result: {
      id: "tapedrubberchicken",
      name: "Taped Rubber Chicken",
      description: "Reinforced with duct tape.",
    },
  },
},`,
  },
  {
    id: "talk-gate",
    title: "Talk choice unlocks an exit",
    level: "new",
    summary:
      "Dialogue choice setFlag → linkRooms requireFlag. Studio Apply wires Guard + Street.",
    seeAlso: "Pack → Unlock chain · Dialogue setFlag",
    snippet: `// Choice:
{ text: "Open sesame", nextId: "END", setFlag: "guard_convinced" }

// Exit:
linkRooms("start", "street", {
  direction: "east",
  forwardBlocked: (state) => !state.flags.guard_convinced,
  forwardBlockedMessage: "The guard won't move.",
});`,
  },
  {
    id: "map-travel",
    title: "Map fast travel between rooms",
    level: "mid",
    summary:
      "mapGroups + mapFastTravel after the player has visited rooms. Template House.",
    seeAlso: "src/engine/SHELL.md · _template manifest",
    snippet: `mapGroups: {
  House: ["start", "hallway"],
},
mapFastTravel: { enabled: true, requireVisited: true },
// One-room packs: mapFastTravel: false  (hides Map button)`,
  },
  {
    id: "json-pack",
    title: "JSON pack → TypeScript (Studio handoff)",
    level: "new",
    summary:
      "Build in Studio Pack tab, download .pack.json or Copy TS pack (createGameFromJson + asset stubs).",
    seeAlso: "src/engine/jsonPack.ts · /studio Pack tab · formatJsonPackAsManifestTs",
    snippet: `import { createGameFromJson } from "@/engine/jsonPack";
import startImg from "./assets/start.jpg";

const packDocument = {
  schemaVersion: 1,
  id: "my-game",
  title: "My Game",
  version: "0.1.0",
  startRoom: "start",
  verbMode: "simple",
  rooms: {
    start: {
      id: "start",
      name: "Start",
      image: startImg,
      hotspots: [/* from Studio */],
    },
  },
  links: [],
};

export const myGame = createGameFromJson(packDocument);
// Register in src/games/registry.ts`,
  },
];

export function recipeById(id: string): Recipe | undefined {
  return RECIPES.find((r) => r.id === id);
}
