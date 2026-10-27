/**
 * Design coach Apply patches — mutate JsonPackDocument from suggestion ids.
 */

import {
  applyGetItemKit,
  applyLockedExitKit,
  applyUseWithKit,
} from "@/authoring/puzzleKits";
import type { JsonPackDocument } from "@/engine/jsonPack";
import { addRoom, upsertLink } from "@/studio/packDraft";
import { MUSIC_PRESET_IDS } from "@/authoring/audioPresets";

export type CoachApplyResult =
  | { kind: "doc"; doc: JsonPackDocument; message: string }
  | { kind: "focus"; focus: CoachFocus; message: string }
  | { kind: "none"; message: string };

export type CoachFocus =
  | "room-art"
  | "hotspot-draw"
  | "intent-get-item"
  | "intent-use-with"
  | "intent-locked-exit"
  | "audio"
  | "pixels"
  | "dialogue"
  | "subtitle"
  | "publish"
  | "download"
  | "polish";

/** Try to apply a coach suggestion; returns doc patch and/or UI focus. */
export function applyCoachSuggestion(
  doc: JsonPackDocument,
  suggestionId: string,
  roomId?: string
): CoachApplyResult {
  const start = roomId && doc.rooms[roomId] ? roomId : doc.startRoom;
  const room = doc.rooms[start];
  const hs = room?.hotspots ?? [];

  switch (suggestionId) {
    case "pack-upload-room-art":
      return {
        kind: "focus",
        focus: "room-art",
        message: "Upload a room image on the Pack room panel.",
      };

    case "pack-draw-hotspot":
      return {
        kind: "focus",
        focus: "hotspot-draw",
        message: "Drag on the room image to draw a hotspot.",
      };

    case "pack-add-pickup":
      return {
        kind: "focus",
        focus: "intent-get-item",
        message: "Draw a hotspot, then choose Get an item in the Intent Wizard.",
      };

    case "pack-first-puzzle": {
      const pickup = hs.find((h) => h.kind === "pickup" && h.itemId);
      const target = hs.find(
        (h) => h.kind === "use-with-target" || h.kind === "interact"
      );
      if (pickup?.itemId && target) {
        const next = applyUseWithKit(doc, start, {
          existingHotspotId: target.id,
          hotspotName: target.name,
          x: target.x,
          y: target.y,
          width: target.width,
          height: target.height,
          lookText: target.lookText,
          itemId: pickup.itemId,
          successMessage: "It works!",
          alreadyFlag: "puzzle_done",
          setFlag: "puzzle_done",
          consumeItem: true,
        });
        return {
          kind: "doc",
          doc: next,
          message: `Wired ${pickup.itemId} → ${target.name}.`,
        };
      }
      return {
        kind: "focus",
        focus: "intent-use-with",
        message: "Need a pickup and a target — open the Use-with intent.",
      };
    }

    case "pack-second-room": {
      if (Object.keys(doc.rooms).length > 1) {
        return { kind: "none", message: "You already have multiple rooms." };
      }
      let next = addRoom(doc, "Hallway");
      const added = Object.keys(next.rooms).find((k) => !doc.rooms[k]);
      if (!added) {
        return { kind: "none", message: "Could not add room." };
      }
      next = upsertLink(next, {
        from: start,
        to: added,
        direction: "east",
        fromLabel: next.rooms[added]?.name || "Hallway",
        toLabel: next.rooms[start]?.name || "Start",
      });
      return {
        kind: "doc",
        doc: next,
        message: "Added Hallway and linked it east.",
      };
    }

    case "pack-gated-exit": {
      const links = doc.links ?? [];
      const open = links.find((l) => !l.requireFlag && !l.requireItem);
      if (open) {
        const next = applyLockedExitKit(doc, {
          from: open.from,
          to: open.to,
          direction: open.direction,
          fromLabel: open.fromLabel,
          toLabel: open.toLabel,
          requireFlag: "got_key",
          blockedMessage: "You can't go that way yet.",
        });
        return {
          kind: "doc",
          doc: next,
          message: "Gated exit with flag got_key.",
        };
      }
      return {
        kind: "focus",
        focus: "intent-locked-exit",
        message: "Link two rooms first, then gate the exit.",
      };
    }

    case "pack-room-music": {
      if (!room) return { kind: "none", message: "No room selected." };
      const cue = "home";
      const preset = (
        MUSIC_PRESET_IDS as readonly string[]
      ).includes("calm")
        ? "calm"
        : MUSIC_PRESET_IDS[0];
      const next: JsonPackDocument = {
        ...doc,
        rooms: {
          ...doc.rooms,
          [start]: { ...room, music: cue },
        },
        audio: {
          defaultMusic: doc.audio?.defaultMusic || cue,
          music: { ...(doc.audio?.music ?? {}), [cue]: preset },
          ambient: { ...(doc.audio?.ambient ?? {}) },
          sfx: doc.audio?.sfx,
        },
      };
      return {
        kind: "doc",
        doc: next,
        message: `Assigned music cue “${cue}” on this room.`,
      };
    }

    case "pack-item-icons":
      return {
        kind: "focus",
        focus: "pixels",
        message: "Generate an item icon in Pixels, then Send to pack.",
      };

    case "pack-character-dialogue":
      return {
        kind: "focus",
        focus: "dialogue",
        message: "Open Dialogue below and add a line + choices.",
      };

    case "pack-subtitle": {
      const next = {
        ...doc,
        subtitle: doc.subtitle?.trim() || "A short adventure",
      };
      return {
        kind: "doc",
        doc: next,
        message: "Added a placeholder subtitle — edit it in Pack meta.",
      };
    }

    case "pack-enable-map": {
      return {
        kind: "doc",
        doc: {
          ...doc,
          mapFastTravel: { enabled: true, requireVisited: true },
        },
        message: "Enabled map fast-travel (visited rooms only).",
      };
    }

    case "pack-map-groups": {
      const ids = Object.keys(doc.rooms);
      return {
        kind: "doc",
        doc: {
          ...doc,
          mapGroups: { World: ids },
        },
        message: "Grouped all rooms under “World”.",
      };
    }

    case "pack-look-text": {
      if (!room) return { kind: "none", message: "No room." };
      const hotspots = hs.map((h) =>
        h.lookText?.trim()
          ? h
          : { ...h, lookText: `You see the ${h.name}.` }
      );
      return {
        kind: "doc",
        doc: {
          ...doc,
          rooms: {
            ...doc.rooms,
            [start]: { ...room, hotspots },
          },
        },
        message: "Filled missing Look text on this room’s hotspots.",
      };
    }

    case "pack-tiny-hotspots": {
      if (!room) return { kind: "none", message: "No room." };
      const hotspots = hs.map((h) => ({
        ...h,
        width: Math.max(h.width, 6),
        height: Math.max(h.height, 6),
      }));
      return {
        kind: "doc",
        doc: {
          ...doc,
          rooms: {
            ...doc.rooms,
            [start]: { ...room, hotspots },
          },
        },
        message: "Enlarged tiny hotspots to at least 6%.",
      };
    }

    case "pack-classic-verbs-early":
    case "pack-touch-verb-default": {
      return {
        kind: "doc",
        doc: { ...doc, verbMode: "coin" },
        message: "Switched to coin (radial) verb mode for touch-friendly play.",
      };
    }

    case "pack-progressive-hints": {
      if ((doc.hints?.length ?? 0) > 0) {
        return { kind: "none", message: "Hints already exist." };
      }
      const flag =
        hs.find((h) => h.useWith?.some((r) => r.setFlag))?.useWith?.[0]
          ?.setFlag ||
        hs.find((h) => h.kind === "pickup" && h.itemId)?.itemId;
      const until = flag
        ? flag.startsWith("got_")
          ? flag
          : `got_${flag}`
        : "puzzle_done";
      return {
        kind: "doc",
        doc: {
          ...doc,
          hints: [
            {
              id: "main_hint",
              title: "Stuck?",
              tiers: [
                "Try Looking at everything in the room.",
                "Pick up anything that isn’t nailed down.",
                "Use inventory items with the stubborn hotspot.",
              ],
              untilFlag: until,
            },
          ],
        },
        message: "Added a 3-tier progressive hint thread (edit in Pack → Hints).",
      };
    }

    case "pack-current-objective": {
      if ((doc.quests?.length ?? 0) > 0) {
        return { kind: "none", message: "A quest already exists." };
      }
      return {
        kind: "doc",
        doc: {
          ...doc,
          quests: [
            {
              id: "main_quest",
              title: "Your goal",
              description: "Finish the first puzzle.",
              objectives: ["Explore the room", "Solve the first puzzle"],
              objectiveFlags: ["explored", "puzzle_done"],
              completeFlag: "puzzle_done",
            },
          ],
        },
        message:
          "Added a starter quest — wire objectiveFlags to your puzzle flags so the HUD advances.",
      };
    }

    case "pack-publish-local": {
      return {
        kind: "focus",
        focus: "publish",
        message: "Publish installs in this browser — then Play from the banner.",
      };
    }

    case "pack-share-import": {
      return {
        kind: "focus",
        focus: "download",
        message: "Download .pack.json, then Import on any launcher home page.",
      };
    }

    case "pack-size-limit": {
      return {
        kind: "focus",
        focus: "room-art",
        message: "Re-upload a smaller room image (uploads auto-compress).",
      };
    }

    case "pack-quests-achievements": {
      return {
        kind: "focus",
        focus: "polish",
        message: "Open Polish for quests, hints, and progress.",
      };
    }

    default:
      // Seed a get-item stub when recipe-linked tips have no better apply
      if (suggestionId.includes("pickup") || suggestionId === "get-item") {
        const next = applyGetItemKit(doc, start, {
          hotspotName: "Desk",
          x: 20,
          y: 40,
          width: 18,
          height: 22,
          itemName: "Key",
        });
        return {
          kind: "doc",
          doc: next,
          message: "Added a sample pickup hotspot.",
        };
      }
      return {
        kind: "none",
        message: "No automatic Apply for this tip — follow the link.",
      };
  }
}
