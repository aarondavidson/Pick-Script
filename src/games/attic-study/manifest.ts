import type { GameDefinition } from "@/engine";
import { untilFlagHint } from "@/engine/hints";
import { atticStudyAudio } from "./audio";
import atticImg from "./assets/attic.jpg";
import keyIcon from "./assets/items/key.jpg";
import locketIcon from "./assets/items/locket.jpg";

const ATTIC_KEY = {
  id: "attic_key",
  name: "Brass Key",
  description: "A small brass key from the desk drawer.",
  icon: keyIcon,
};

const LOCKET = {
  id: "locket",
  name: "Silver Locket",
  description: "A warm silver locket from inside the chest. You did it.",
  icon: locketIcon,
};

/**
 * Attic Study — one room, two puzzles.
 *
 * Puzzle 1: Look/Use the desk → get the brass key
 * Puzzle 2: Use the key on the chest → get the locket (win)
 *
 * Walkthrough for builders: ./WALKTHROUGH.md
 */
export const atticStudyGame: GameDefinition = {
  id: "attic-study",
  title: "Attic Study",
  subtitle: "One room · two puzzles",
  version: "1.0.0",
  startRoom: "attic",
  egoId: "player",
  verbMode: "simple",
  autosave: true,
  /** S.C.R.I.P.T. pixel scaler — teaching pack art is low-res friendly */
  presentation: { crispPixels: true, nativeSize: { width: 640, height: 360 } },
  /** One-room pack — Map button stays hidden */
  mapFastTravel: false,
  audio: atticStudyAudio,
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
    untilFlagHint(
      "open_chest",
      "The chest",
      [
        "The chest wants a key.",
        "Select Use, click the Brass Key in inventory, then click the chest.",
        "Use Brass Key with Chest.",
      ],
      "chestOpen"
    ),
  ],
  rooms: {
    attic: {
      id: "attic",
      name: "Attic Study",
      description:
        "Dust, warm lamp light, a desk on the left and a locked chest on the right.",
      image: atticImg,
      music: "attic",
      roomSize: { width: 100, height: 100 },
      entryPoint: { x: 48, y: 78 },
      walkboxes: [{ id: "floor", x: 8, y: 62, width: 84, height: 28, scale: 1 }],
      localScripts: {
        settle: {
          id: "settle",
          commands: [
            { op: "delay", ms: 400 },
            { op: "sound", key: "creak" },
          ],
        },
      },
      autoScripts: ["settle"],
      hotspots: [
        {
          id: "desk",
          name: "Desk",
          x: 8,
          y: 42,
          width: 32,
          height: 28,
          verbs: ["look", "use"],
          approach: { x: 28, y: 72 },
          responses: {
            look: (state) =>
              state.flags.gotKey
                ? "The drawer hangs open. You already took the key."
                : "A sticky note on the desk: “Key in the drawer.” You slide it open.",
            use: (state) =>
              state.flags.gotKey
                ? "Nothing else in the drawer."
                : "You open the drawer and take a brass key.",
          },
          onInteract: (verb, state) => {
            if (verb !== "look" && verb !== "use") return {};
            if (state.flags.gotKey) return {};
            if (state.inventory.some((i) => i.id === "attic_key")) {
              return { flags: { ...state.flags, gotKey: true } };
            }
            return {
              flags: { ...state.flags, gotKey: true },
              inventory: [...state.inventory, { ...ATTIC_KEY }],
            };
          },
        },
        {
          id: "chest",
          name: "Chest",
          x: 58,
          y: 48,
          width: 28,
          height: 30,
          verbs: ["look", "use"],
          approach: { x: 62, y: 74 },
          responses: {
            look: (state) =>
              state.flags.chestOpen
                ? "The chest is open. Dust motes dance in the lamp light."
                : "A heavy wooden chest. The lock looks brass-friendly.",
            use: (state) =>
              state.flags.chestOpen
                ? "Already open."
                : "It needs a key. Try using an inventory item on it.",
          },
          useWithResponses: {
            attic_key: (state) =>
              state.flags.chestOpen
                ? "The chest is already open."
                : "The key turns. Inside: a silver locket.",
            "*": "That doesn't fit the lock.",
          },
          onUseWith: (itemId, state) => {
            if (itemId !== "attic_key") return {};
            if (state.flags.chestOpen) return {};
            const withoutKey = state.inventory.filter(
              (i) => i.id !== "attic_key"
            );
            const hasLocket = withoutKey.some((i) => i.id === "locket");
            return {
              flags: { ...state.flags, chestOpen: true },
              inventory: hasLocket
                ? withoutKey
                : [...withoutKey, { ...LOCKET }],
              achievements: state.achievements.map((a) =>
                a.id === "attic_solved"
                  ? { ...a, unlocked: true, timestamp: Date.now() }
                  : a
              ),
              quests: state.quests.map((q) =>
                q.id === "attic_mystery"
                  ? {
                      ...q,
                      completedObjectives: [0, 1],
                      completed: true,
                    }
                  : q
              ),
            };
          },
        },
        {
          id: "lamp",
          name: "Lamp",
          x: 38,
          y: 28,
          width: 12,
          height: 18,
          verbs: ["look"],
          skipWalkTo: true,
          responses: {
            look: "A warm attic lamp. It hums softly with the room.",
          },
        },
      ],
      exits: [],
    },
  },
  actors: {
    player: {
      id: "player",
      name: "You",
      isEgo: true,
      canControl: true,
      talkColor: "#f5e6a8",
      sprite: "actor-ego",
    },
  },
  initialActors: {
    player: {
      id: "player",
      roomId: "attic",
      x: 48,
      y: 78,
      facing: "right",
      visible: true,
    },
  },
  namedScripts: {},
  defaultTransition: { kind: "fade", durationMs: 280 },
  defaultSpeechDurationMs: 2200,
  combinations: {},
  achievements: [
    {
      id: "attic_solved",
      title: "Dust & Brass",
      description: "Open the attic chest",
    },
  ],
  quests: [
    {
      id: "attic_mystery",
      title: "What's in the chest?",
      description: "Find a key and open the locked chest.",
      objectives: ["Take the key from the desk", "Unlock the chest"],
    },
  ],
  initialFlags: {},
  initialObjectStates: {},
  defaultVerbResponses: {
    look: "Nothing special.",
    use: "That doesn't help.",
    useWith: "That doesn't work here.",
  },
  cutscenes: {},
};

export default atticStudyGame;
