import { type GameDefinition, linkRooms } from "@/engine";
import { untilFlagHint } from "@/engine/hints";
import { msg } from "@/engine/i18n";
/**
 * Sample room art — replace with your own **1920×1080** JPG (16:9).
 * Prefer pack-local `./assets/` (Harbor Fog / Attic Study style).
 * Specs: `src/engine/ASSETS.md`.
 */
import startRoomImg from "./assets/start.jpg";

/** Bidirectional door — attach `forward` / `back` to each room's exits. */
const hallLink = linkRooms("start", "hallway", {
  direction: "east",
  fromLabel: "Hallway",
  toLabel: "Starting Room",
  forwardBlocked: (state) => !state.flags.gotKey,
  forwardBlockedMessage: "The hall door is locked. Look at the sticky note.",
});

/**
 * Starter pack for a new adventure.
 *
 * Prefer: `npm run new-pack -- my-game --title "My Game"`
 * (copies this folder, rewrites ids, registers in `registry.ts`).
 *
 * Demonstrates one tiny puzzle (look note → key → unlock hall), multi-ego,
 * hints, autosave, pack audio cues, map fast-travel, and bilingual messages.
 */
export const templateGame: GameDefinition = {
  id: "template-adventure",
  title: "Untitled Adventure",
  subtitle: "A point-and-click starter pack",
  version: "0.1.0",
  startRoom: "start",
  egoId: "player",
  playableActors: ["player", "buddy"],
  verbMode: "simple",
  autosave: true,
  mapGroups: {
    House: ["start", "hallway"],
  },
  mapFastTravel: { enabled: true, requireVisited: true },
  audio: {
    defaultMusic: "home",
    music: {
      home: "calm",
      hall: "ambient",
    },
    ambient: {
      home: "none",
      hall: "hum",
    },
  },
  i18n: {
    defaultLocale: "en",
    messages: {
      en: {
        "hotspot.note.look":
          "A sticky note: “Key under the note. Hall door is locked.” You pocket a brass key.",
        "hotspot.note.look.done": "The note says the hall door is locked. You have the key.",
        "hotspot.note.use.first": "You lift the note — a brass key was stuck underneath. You pocket it.",
        "hotspot.note.use": "You already took the key. Head east when ready.",
        "room.start.desc": "Replace this room with your own content.",
        "exit.hall.blocked": "The hall door is locked. Look at the sticky note.",
      },
      es: {
        "hotspot.note.look":
          "Una nota: “La llave está debajo. La puerta del pasillo está cerrada.” Guardas una llave.",
        "hotspot.note.look.done": "La nota dice que el pasillo está cerrado. Ya tienes la llave.",
        "hotspot.note.use.first": "Levantas la nota: había una llave pegada debajo. La guardas.",
        "hotspot.note.use": "Ya tienes la llave. Sal por el este cuando quieras.",
        "room.start.desc": "Reemplaza esta sala con tu propio contenido.",
        "exit.hall.blocked":
          "La puerta del pasillo está cerrada. Mira la nota adhesiva.",
      },
    },
  },
  hints: [
    untilFlagHint(
      "read_note",
      "First steps",
      [
        "Something on the desk catches your eye.",
        "Look at the sticky note.",
        "Look at the sticky note to get the key, then go east.",
      ],
      "gotKey"
    ),
  ],
  rooms: {
    start: {
      id: "start",
      name: "Starting Room",
      description: "Replace this room with your own content.",
      image: startRoomImg,
      music: "home",
      roomSize: { width: 100, height: 100 },
      entryPoint: { x: 50, y: 75 },
      walkboxes: [{ id: "floor", x: 10, y: 60, width: 80, height: 30 }],
      localScripts: {
        hum: {
          id: "hum",
          loop: true,
          commands: [
            { op: "delay", ms: 10000 },
            { op: "sound", key: "click" },
          ],
        },
      },
      autoScripts: ["hum"],
      hotspots: [
        {
          id: "note",
          name: "Sticky Note",
          x: 40,
          y: 40,
          width: 20,
          height: 15,
          verbs: ["look", "use"],
          // State-gated + translatable: before / after the key is taken
          responses: {
            look: (state) =>
              state.flags.gotKey
                ? msg("hotspot.note.look.done", "You already have the key.")
                : msg("hotspot.note.look", "A sticky note mentions a key. You take it."),
            use: (state) =>
              state.flags.gotKey
                ? msg("hotspot.note.use", "You already took the key.")
                : msg("hotspot.note.use.first", "You find a key under the note. You take it."),
          },
          onInteract: (verb, state) => {
            if (verb !== "look" && verb !== "use") return {};
            if (state.flags.gotKey) return {};
            const hasKey = state.inventory.some((i) => i.id === "starter_key");
            if (hasKey) {
              return { flags: { ...state.flags, gotKey: true, lookedAtNote: true } };
            }
            return {
              flags: { ...state.flags, gotKey: true, lookedAtNote: true },
              inventory: [
                ...state.inventory,
                {
                  id: "starter_key",
                  name: "Brass Key",
                  description: "Opens the hall door.",
                },
              ],
            };
          },
        },
      ],
      exits: [hallLink.forward],
    },
    hallway: {
      id: "hallway",
      name: "Hallway",
      description: "A short hall — buddy waits here. Swap ego in the UI to control them.",
      // Same placeholder art — swap for a second 1920×1080 import when you have it.
      image: startRoomImg,
      music: "hall",
      roomSize: { width: 100, height: 100 },
      entryPoint: { x: 30, y: 75 },
      walkboxes: [{ id: "floor", x: 10, y: 60, width: 80, height: 30 }],
      hotspots: [],
      exits: [hallLink.back],
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
    buddy: {
      id: "buddy",
      name: "Buddy",
      canControl: true,
      talkColor: "#7ec8e3",
      sprite: "npc-sprite-tony",
    },
  },
  initialActors: {
    player: {
      id: "player",
      roomId: "start",
      x: 50,
      y: 75,
      facing: "right",
      visible: true,
    },
    buddy: {
      id: "buddy",
      roomId: "hallway",
      x: 55,
      y: 75,
      facing: "left",
      visible: true,
    },
  },
  namedScripts: {},
  defaultTransition: { kind: "fade", durationMs: 300 },
  defaultSpeechDurationMs: 2000,
  combinations: {},
  achievements: [
    {
      id: "first_look",
      title: "Curious",
      description: "Look at the sticky note and take the key",
    },
  ],
  quests: [
    {
      id: "begin",
      title: "Begin the adventure",
      description: "Unlock the hall and meet Buddy.",
      objectives: ["Look at the sticky note", "Enter the hallway"],
    },
  ],
  initialFlags: { introSeen: true },
  initialObjectStates: {},
  defaultVerbResponses: {
    look: "Nothing interesting.",
    useWith: "That combination does nothing.",
  },
  cutscenes: {},
};

export default templateGame;
