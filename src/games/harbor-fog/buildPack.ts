/**
 * Harbor Fog — 5 rooms, 2 NPCs, 2 puzzles (~5–10 min).
 * Built with the same JSON-pack kits / library patterns as Studio.
 * Room / item art: imported JPGs under ./assets (see art.ts).
 */

import type { JsonPackDocument } from "@/engine/jsonPack";
import { createEmptyJsonPack } from "@/engine/jsonPack";
import { ensureDialogueVoiceKeys } from "@/engine/lineCatalog";
import { applyGenrePreset } from "@/authoring/genrePresets";
import { applyCutsceneTemplate } from "@/authoring/cutsceneTemplates";
import { placePropFromLibrary } from "@/authoring/propLibrary";
import { applyLockedExitKit } from "@/authoring/puzzleKits";
import { upsertLink } from "@/studio/packDraft";
import { harborArt } from "./art";

export function buildHarborFogPack(): JsonPackDocument {
  let doc = createEmptyJsonPack({
    id: "harbor-fog",
    title: "Harbor Fog",
    subtitle: "A short dockside mystery",
    version: "1.0.0",
    verbMode: "coin",
    startRoom: "docks",
  });
  doc = applyGenrePreset(doc, "mobile-mystery");

  // Rooms
  doc = {
    ...doc,
    rooms: {
      docks: {
        id: "docks",
        name: "Harbor Docks",
        description: "Fog beads on the ropes. Somewhere a bell tolls.",
        image: harborArt.docks,
        music: "docks",
        particles: "stars",
        hotspots: [
          {
            id: "ropes",
            name: "Mooring ropes",
            x: 18,
            y: 55,
            width: 14,
            height: 20,
            kind: "interact",
            lookText:
              "Salt-stiff ropes. One knot is newer — someone was here recently.",
            useText: "You don't need more rope.",
            interactSound: "creak",
            interactHaptic: "medium",
            interactJuice: "medium",
          },
          {
            id: "water",
            name: "Black water",
            x: 55,
            y: 72,
            width: 30,
            height: 18,
            kind: "interact",
            lookText: "The harbor swallows light. Best not to fall in.",
          },
          {
            id: "shack_window",
            name: "Shack window",
            x: 72,
            y: 38,
            width: 10,
            height: 12,
            kind: "interact",
            lookText: "A warm lamp fights the fog from inside.",
            useText: "Locked from this side — try the Watch Office.",
            frames: [...harborArt.windowGlowFrames],
            fps: 3,
            animClass: "flicker",
          },
        ],
        walkboxes: [
          { id: "far", x: 5, y: 52, width: 90, height: 16, scale: 0.88 },
          { id: "near", x: 5, y: 68, width: 90, height: 24, scale: 1.06 },
        ],
        entryPoint: { x: 50, y: 78 },
      },
      warehouse: {
        id: "warehouse",
        name: "Warehouse",
        description: "Crates, dust, and a chest that wants a key.",
        image: harborArt.warehouse,
        music: "warehouse",
        particles: "dust",
        hotspots: [],
        walkboxes: [
          { id: "far", x: 8, y: 56, width: 84, height: 14, scale: 0.9 },
          { id: "near", x: 8, y: 70, width: 84, height: 22, scale: 1.05 },
        ],
        entryPoint: { x: 20, y: 78 },
      },
      watch_office: {
        id: "watch_office",
        name: "Watch Office",
        description: "The Harbor Master's den.",
        image: harborArt.watchOffice,
        music: "office",
        particles: "fog",
        hotspots: [],
        walkboxes: [
          { id: "far", x: 10, y: 58, width: 80, height: 14, scale: 0.92 },
          { id: "near", x: 10, y: 72, width: 80, height: 20, scale: 1.04 },
        ],
        entryPoint: { x: 30, y: 78 },
      },
      pier_alley: {
        id: "pier_alley",
        name: "Pier Alley",
        description: "A narrow cut where traders wait.",
        image: harborArt.pierAlley,
        music: "alley",
        particles: "stars",
        hotspots: [],
        walkboxes: [
          { id: "far", x: 30, y: 58, width: 40, height: 14, scale: 0.9 },
          { id: "near", x: 30, y: 72, width: 40, height: 20, scale: 1.05 },
        ],
        entryPoint: { x: 50, y: 80 },
      },
      lighthouse: {
        id: "lighthouse",
        name: "Lighthouse",
        description: "The fog thins. You made it.",
        image: harborArt.lighthouse,
        music: "beacon",
        particles: "stars",
        hotspots: [
          {
            id: "beacon",
            name: "Beacon",
            x: 42,
            y: 12,
            width: 16,
            height: 22,
            kind: "interact",
            lookText:
              "The light cuts the fog. Whatever chased you stays on the docks.",
            useText: "You let the warmth settle in your bones. End of the line.",
            frames: [...harborArt.beaconGlowFrames],
            fps: 2,
            animClass: "pulse",
            interactSound: "success",
            interactHaptic: "success",
            interactJuice: "success",
            actionVerbs: ["use", "look"],
            actions: [
              {
                op: "message",
                text: "You let the warmth settle in your bones. End of the line.",
              },
              { op: "setFlag", flag: "reached_beacon", value: true },
              { op: "sound", key: "success" },
              { op: "haptic", style: "success" },
              { op: "juice", preset: "success" },
            ],
          }
        ],
        walkboxes: [
          { id: "floor", x: 20, y: 70, width: 60, height: 22, scale: 1.05 },
        ],
        entryPoint: { x: 50, y: 82 },
        transitionIn: { kind: "fade", durationMs: 420 },
      },
    },
    links: [],
    mapGroups: {
      Harbor: ["docks", "warehouse", "watch_office", "pier_alley", "lighthouse"],
    },
    mapFastTravel: { enabled: true, requireVisited: true },
    initialFlags: {
      dock_pass: false,
      chest_open: false,
      trader_paid: false,
      reached_beacon: false,
      play_intro: true,
    },
    items: {},
    stuckAssist: { enabled: true, idleMs: 60_000, failedInteracts: 4 },
    hints: [
      {
        id: "get_pass",
        title: "Warehouse door",
        tiers: [
          "Someone in the Watch Office controls the warehouse.",
          "Talk to the Harbor Master.",
          "Choose the passphrase “Tide turns at dusk.”",
        ],
        untilFlag: "dock_pass",
      },
      {
        id: "chest_puzzle",
        title: "The chest",
        tiers: [
          "Desks hide keys.",
          "Look at / Use the warehouse desk.",
          "Use the Brass Key on the Chest.",
        ],
        untilFlag: "chest_open",
        requireFlag: "dock_pass",
      },
      {
        id: "trader_deal",
        title: "The trader",
        tiers: [
          "The alley trader wants something shiny.",
          "Open the chest for a Relic Coin.",
          "Use the Relic Coin on the Trader.",
        ],
        untilFlag: "trader_paid",
      },
    ],
    quests: [
      {
        id: "beacon",
        title: "Reach the lighthouse",
        description: "Cut through fog, bargains, and a locked warehouse.",
        objectives: [
          "Get a warehouse pass from the Harbor Master",
          "Open the warehouse chest",
          "Trade the relic coin for the pier path",
          "Reach the lighthouse",
        ],
        objectiveFlags: [
          "dock_pass",
          "chest_open",
          "trader_paid",
          "reached_beacon",
        ],
        completeFlag: "reached_beacon",
      },
    ],
    achievements: [
      {
        id: "passphrase",
        title: "Tide turns",
        description: "Spoke the dock passphrase.",
        unlockFlag: "dock_pass",
      },
      {
        id: "relic",
        title: "Pocket relic",
        description: "Pried a coin from the chest.",
        unlockFlag: "chest_open",
      },
      {
        id: "deal",
        title: "Fair trade",
        description: "Paid the alley trader.",
        unlockFlag: "trader_paid",
      },
    ],
  };

  // Open links: docks ↔ office, docks ↔ alley
  doc = upsertLink(doc, {
    from: "docks",
    to: "watch_office",
    direction: "east",
    fromLabel: "Watch Office",
    toLabel: "Docks",
  });
  doc = upsertLink(doc, {
    from: "docks",
    to: "pier_alley",
    direction: "west",
    fromLabel: "Pier Alley",
    toLabel: "Docks",
  });

  // Gated: docks → warehouse needs dock_pass
  doc = applyLockedExitKit(doc, {
    from: "docks",
    to: "warehouse",
    direction: "north",
    fromLabel: "Warehouse",
    toLabel: "Docks",
    requireFlag: "dock_pass",
    blockedMessage: "Locked. The Harbor Master has the pass.",
  });

  // Gated: pier → lighthouse needs trader_paid
  doc = applyLockedExitKit(doc, {
    from: "pier_alley",
    to: "lighthouse",
    direction: "north",
    fromLabel: "Lighthouse path",
    toLabel: "Alley",
    requireFlag: "trader_paid",
    blockedMessage: "The trader blocks the path. Make a deal.",
  });

  // Harbor Master NPC (custom dialogue — dock_pass)
  // Positioned over the seated figure in watch-office art (right of desk).
  {
    const room = doc.rooms.watch_office!;
    doc = {
      ...doc,
      rooms: {
        ...doc.rooms,
        watch_office: {
          ...room,
          hotspots: [
            {
              id: "harbor_master",
              name: "Harbor Master",
              x: 52,
              y: 38,
              width: 16,
              height: 38,
              kind: "character",
              verbs: ["look", "talk"],
              actorId: "harbor_master",
              sprite: harborArt.harborMaster,
              portrait: harborArt.harborMaster,
              talkColor: "#9ab8c8",
              lookText: "Oilskin coat, sharper eyes. They run this dock.",
              approach: { x: 52, y: 76 },
              dialogue: {
                speaker: "Harbor Master",
                lines: [
                  {
                    id: "hello",
                    text: "Warehouse is sealed. Passphrase?",
                    voiceKey: "voice.watch_office.harbor_master.hello",
                    choices: [
                      {
                        text: "Tide turns at dusk",
                        nextId: "ok",
                        setFlag: "dock_pass",
                        choiceId: "pass",
                      },
                      {
                        text: "Open sesame",
                        nextId: "nope",
                        choiceId: "wrong",
                      },
                      { text: "Never mind", nextId: "END" },
                    ],
                  },
                  {
                    id: "ok",
                    text: "Correct. Warehouse is yours — don't steal the light oil.",
                    voiceKey: "voice.watch_office.harbor_master.ok",
                    choices: [{ text: "Understood", nextId: "END" }],
                  },
                  {
                    id: "nope",
                    text: "Cute. Wrong harbor.",
                    voiceKey: "voice.watch_office.harbor_master.nope",
                    choices: [{ text: "Sorry", nextId: "END" }],
                  },
                ],
              },
            },
            {
              id: "ledger",
              name: "Ledger",
              x: 38,
              y: 52,
              width: 14,
              height: 12,
              kind: "interact",
              lookText:
                "Today's note: “Passphrase rotates — dusk tide.” Handy.",
            },
          ],
        },
      },
    };
  }

  // Desk + chest via library — aligned to warehouse art (desk left, chest right).
  let placed = placePropFromLibrary(doc, {
    entryId: "prop-desk",
    roomId: "warehouse",
    x: 14,
    y: 40,
  });
  doc = placed.doc;
  placed = placePropFromLibrary(doc, {
    entryId: "prop-chest",
    roomId: "warehouse",
    x: 62,
    y: 52,
  });
  doc = placed.doc;

  // Fix item icons to harbor art
  doc = {
    ...doc,
    items: {
      ...(doc.items ?? {}),
      brass_key: {
        id: "brass_key",
        name: "Brass Key",
        description: "Opens the warehouse chest.",
        icon: harborArt.key,
      },
      relic_coin: {
        id: "relic_coin",
        name: "Relic Coin",
        description: "A trader on the pier would kill for this — or trade.",
        icon: harborArt.coin,
      },
    },
  };

  // Trader NPC via library — mid-alley stall in pier-alley art.
  placed = placePropFromLibrary(doc, {
    entryId: "npc-trader",
    roomId: "pier_alley",
    x: 46,
    y: 40,
  });
  doc = placed.doc;
  {
    const alley = doc.rooms.pier_alley!;
    doc = {
      ...doc,
      rooms: {
        ...doc.rooms,
        pier_alley: {
          ...alley,
          hotspots: (alley.hotspots ?? []).map((h) =>
            h.name === "Trader" || h.id.startsWith("trader")
              ? {
                  ...h,
                  actorId: h.actorId || "trader",
                  sprite: harborArt.trader,
                  portrait: harborArt.trader,
                  talkColor: "#e0b84a",
                  width: 14,
                  height: 36,
                }
              : h
          ),
        },
      },
    };
  }

  // Intro cutscene
  const cut = applyCutsceneTemplate(doc, {
    templateId: "intro-enter",
    cutsceneId: "intro",
    title: "Fog on the docks",
    roomId: "docks",
    line: "Fog swallows the harbor. Get to the lighthouse — but not without help.",
    walkX: 50,
    walkY: 76,
  });
  doc = cut.doc;

  // Per-room music + ambient beds (synth presets via MusicContext).
  // Bitmap costumes for ego + NPCs.
  // Intro fires once via flagCutscenes (clears play_intro).
  doc = {
    ...doc,
    flagCutscenes: {
      ...(doc.flagCutscenes ?? {}),
      play_intro: "intro",
    },
    actors: {
      player: {
        name: "You",
        isEgo: true,
        canControl: true,
        sprite: harborArt.player,
        portrait: harborArt.player,
        talkColor: "#f5e6a8",
      },
      harbor_master: {
        name: "Harbor Master",
        sprite: harborArt.harborMaster,
        portrait: harborArt.harborMaster,
        talkColor: "#9ab8c8",
      },
      trader: {
        name: "Trader",
        sprite: harborArt.trader,
        portrait: harborArt.trader,
        talkColor: "#e0b84a",
      },
    },
    audio: {
      defaultMusic: "docks",
      music: {
        docks: "noir",
        office: "calm",
        warehouse: "eerie",
        alley: "underground",
        beacon: "ambient",
      },
      ambient: {
        docks: "rain",
        office: "hum",
        warehouse: "drip",
        alley: "wind",
        beacon: "none",
      },
    },
  };

  // Desk/chest interact + use-with SFX (built-in oscillator keys).
  {
    const wh = doc.rooms.warehouse!;
    doc = {
      ...doc,
      rooms: {
        ...doc.rooms,
        warehouse: {
          ...wh,
          hotspots: (wh.hotspots ?? []).map((h) => {
            if (h.id === "desk" || h.name === "Desk") {
              return {
                ...h,
                interactSound: "pickup",
                interactJuice: "pickup",
              };
            }
            if (h.id === "chest" || h.name === "Chest") {
              return {
                ...h,
                interactSound: "creak",
                interactHaptic: "medium",
                interactJuice: "medium",
                useWithSound: "success",
                useWithHaptic: "success",
                useWithJuice: "success",
              };
            }
            return h;
          }),
        },
      },
    };
  }

  return ensureDialogueVoiceKeys(doc);
}
