/**
 * Shared prop / NPC library (item 13) — drop reusable hotspots into a room.
 */

import { suggestId } from "@/authoring/codegen";
import type {
  JsonPackDocument,
  JsonPackHotspot,
  JsonPackItem,
} from "@/engine/jsonPack";

export type PropLibraryKind = "npc" | "prop" | "pickup";

export interface PropLibraryEntry {
  id: string;
  kind: PropLibraryKind;
  title: string;
  blurb: string;
  /** Default hotspot geometry */
  width: number;
  height: number;
  /** Simple SVG icon/portrait data URL */
  art: string;
  /** Build hotspot (+ optional catalog item) for room placement */
  build: (ctx: {
    hotspotId: string;
    x: number;
    y: number;
  }) => { hotspot: JsonPackHotspot; item?: JsonPackItem };
}

function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}

function svgDataUrl(svg: string): string {
  // Must be base64 — isSafeMediaUrl rejects charset=utf-8 / percent-encoded SVG.
  return `data:image/svg+xml;base64,${utf8ToBase64(svg)}`;
}

const GUARD_ART = svgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="128" height="192" viewBox="0 0 128 192">
  <rect width="128" height="192" fill="#1a2430"/>
  <ellipse cx="64" cy="48" rx="28" ry="32" fill="#c4a574"/>
  <rect x="36" y="78" width="56" height="70" rx="6" fill="#2f4a6a"/>
  <rect x="28" y="78" width="16" height="50" fill="#2f4a6a"/>
  <rect x="84" y="78" width="16" height="50" fill="#2f4a6a"/>
  <rect x="40" y="148" width="18" height="36" fill="#1e2a38"/>
  <rect x="70" y="148" width="18" height="36" fill="#1e2a38"/>
  <rect x="40" y="20" width="48" height="14" fill="#3d5a40"/>
  <text x="64" y="188" text-anchor="middle" fill="#9ab" font-size="14" font-family="monospace">GUARD</text>
</svg>`);

const MERCHANT_ART = svgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="128" height="192" viewBox="0 0 128 192">
  <rect width="128" height="192" fill="#241c18"/>
  <ellipse cx="64" cy="50" rx="26" ry="30" fill="#d4b896"/>
  <rect x="34" y="80" width="60" height="72" rx="8" fill="#8b3a2a"/>
  <circle cx="64" cy="110" r="14" fill="#e0b84a"/>
  <rect x="42" y="152" width="16" height="32" fill="#3a2a22"/>
  <rect x="70" y="152" width="16" height="32" fill="#3a2a22"/>
  <text x="64" y="188" text-anchor="middle" fill="#c9a" font-size="12" font-family="monospace">TRADER</text>
</svg>`);

const CHEST_ART = svgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="160" height="120" viewBox="0 0 160 120">
  <rect width="160" height="120" fill="#1a1510"/>
  <rect x="20" y="40" width="120" height="60" rx="4" fill="#6b4226"/>
  <rect x="20" y="40" width="120" height="18" fill="#8a5a32"/>
  <rect x="70" y="58" width="20" height="16" fill="#d4af37"/>
  <text x="80" y="112" text-anchor="middle" fill="#c9a87c" font-size="14" font-family="monospace">CHEST</text>
</svg>`);

const DESK_ART = svgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="160" height="120" viewBox="0 0 160 120">
  <rect width="160" height="120" fill="#121820"/>
  <rect x="16" y="50" width="128" height="40" fill="#4a3424"/>
  <rect x="24" y="90" width="12" height="20" fill="#3a2818"/>
  <rect x="124" y="90" width="12" height="20" fill="#3a2818"/>
  <rect x="50" y="56" width="36" height="22" fill="#2a2218" stroke="#c4a574" stroke-width="2"/>
  <text x="80" y="30" text-anchor="middle" fill="#8af" font-size="14" font-family="monospace">DESK</text>
</svg>`);

const KEY_ART = svgDataUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="#1a1a1e"/>
  <circle cx="22" cy="22" r="10" fill="none" stroke="#d4af37" stroke-width="4"/>
  <rect x="30" y="20" width="26" height="6" fill="#d4af37"/>
  <rect x="48" y="20" width="4" height="14" fill="#d4af37"/>
  <rect x="40" y="20" width="4" height="10" fill="#d4af37"/>
</svg>`);

export const PROP_LIBRARY: PropLibraryEntry[] = [
  {
    id: "npc-guard",
    kind: "npc",
    title: "Guard",
    blurb: "Talk-gate NPC with passphrase choice → sets guard_ok.",
    width: 12,
    height: 32,
    art: GUARD_ART,
    build: ({ hotspotId, x, y }) => ({
      hotspot: {
        id: hotspotId,
        name: "Guard",
        x,
        y,
        width: 12,
        height: 32,
        kind: "character",
        verbs: ["look", "talk"],
        actorId: hotspotId,
        lookText: "A tired guard. They want a passphrase.",
        approach: { x: x - 4, y: y + 28 },
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
                  setFlag: "guard_ok",
                  choiceId: "sesame",
                },
                { text: "Never mind", nextId: "END" },
              ],
            },
            {
              id: "ok",
              text: "Fine. On your way.",
              choices: [{ text: "Thanks", nextId: "END" }],
            },
          ],
        },
      },
    }),
  },
  {
    id: "npc-trader",
    kind: "npc",
    title: "Trader",
    blurb: "NPC who wants an item (use-with) and sets trader_paid.",
    width: 12,
    height: 32,
    art: MERCHANT_ART,
    build: ({ hotspotId, x, y }) => ({
      hotspot: {
        id: hotspotId,
        name: "Trader",
        x,
        y,
        width: 12,
        height: 32,
        kind: "character",
        verbs: ["look", "talk", "use"],
        actorId: hotspotId,
        lookText: "A trader with sharp eyes. They trade favors for relics.",
        approach: { x: x - 4, y: y + 28 },
        dialogue: {
          speaker: "Trader",
          lines: [
            {
              id: "hello",
              text: "Bring me something shiny and I'll open the pier.",
              choices: [{ text: "I'll look", nextId: "END" }],
            },
          ],
        },
        useWith: [
          {
            itemId: "relic_coin",
            message: "A fair trade. The pier gate is yours.",
            setFlag: "trader_paid",
            alreadyFlag: "trader_paid",
            alreadyMessage: "We already dealt.",
            consumeItem: true,
          },
        ],
        fallbackUseWithMessage: "That's not what I want.",
      },
    }),
  },
  {
    id: "prop-chest",
    kind: "prop",
    title: "Locked chest",
    blurb: "Use-with target for brass_key → sets chest_open, gives relic_coin.",
    width: 18,
    height: 22,
    art: CHEST_ART,
    build: ({ hotspotId, x, y }) => ({
      hotspot: {
        id: hotspotId,
        name: "Chest",
        x,
        y,
        width: 18,
        height: 22,
        kind: "use-with-target",
        lookText: "A locked sea chest.",
        useWith: [
          {
            itemId: "brass_key",
            message: "The lock gives. Inside: an old coin.",
            setFlag: "chest_open",
            alreadyFlag: "chest_open",
            alreadyMessage: "Empty now.",
            consumeItem: true,
            giveItem: {
              id: "relic_coin",
              name: "Relic Coin",
              description: "Warm metal. A trader might want this.",
              icon: KEY_ART,
            },
          },
        ],
        fallbackUseWithMessage: "That doesn't fit.",
        stateOverlays: { "0": CHEST_ART, "1": CHEST_ART },
        initialState: 0,
      },
      item: {
        id: "relic_coin",
        name: "Relic Coin",
        description: "Warm metal. A trader might want this.",
        icon: KEY_ART,
      },
    }),
  },
  {
    id: "prop-desk",
    kind: "pickup",
    title: "Desk (key)",
    blurb: "Pickup hotspot that grants brass_key.",
    width: 20,
    height: 24,
    art: DESK_ART,
    build: ({ hotspotId, x, y }) => ({
      hotspot: {
        id: hotspotId,
        name: "Desk",
        x,
        y,
        width: 20,
        height: 24,
        kind: "pickup",
        itemId: "brass_key",
        itemName: "Brass Key",
        itemDescription: "Opens a sea chest.",
        itemIcon: KEY_ART,
        lookText: "A sticky note: key in the drawer.",
        useText: "You pocket the brass key.",
        verbs: ["look", "use"],
      },
      item: {
        id: "brass_key",
        name: "Brass Key",
        description: "Opens a sea chest.",
        icon: KEY_ART,
      },
    }),
  },
];

export function propLibraryById(id: string): PropLibraryEntry | undefined {
  return PROP_LIBRARY.find((e) => e.id === id);
}

export interface PlacePropOpts {
  entryId: string;
  roomId: string;
  x?: number;
  y?: number;
}

/** Place a library entry into a room (unique hotspot id). */
export function placePropFromLibrary(
  doc: JsonPackDocument,
  opts: PlacePropOpts
): { doc: JsonPackDocument; message: string } {
  const entry = propLibraryById(opts.entryId);
  const room = doc.rooms[opts.roomId];
  if (!entry || !room) {
    return { doc, message: "Unknown prop or room." };
  }
  const baseId = suggestId(entry.id.replace(/^npc-|^prop-/, ""), entry.kind);
  let hotspotId = baseId;
  if ((room.hotspots ?? []).some((h) => h.id === hotspotId)) {
    hotspotId = `${baseId}_${(room.hotspots ?? []).length}`;
  }
  const x = opts.x ?? 40;
  const y = opts.y ?? 42;
  const built = entry.build({ hotspotId, x, y });
  let next: JsonPackDocument = {
    ...doc,
    rooms: {
      ...doc.rooms,
      [opts.roomId]: {
        ...room,
        hotspots: [...(room.hotspots ?? []), built.hotspot],
      },
    },
  };
  if (built.item) {
    next = {
      ...next,
      items: {
        ...(next.items ?? {}),
        [built.item.id]: {
          ...(next.items?.[built.item.id] ?? {}),
          ...built.item,
        },
      },
      initialFlags: {
        ...(next.initialFlags ?? {}),
        [`got_${built.item.id}`]: false,
      },
    };
  }
  if (built.hotspot.dialogue || built.hotspot.useWith) {
    const flags: Record<string, boolean> = { ...(next.initialFlags ?? {}) };
    for (const c of built.hotspot.dialogue?.lines?.flatMap((l) => l.choices ?? []) ?? []) {
      if (c.setFlag) flags[c.setFlag] = false;
    }
    for (const r of built.hotspot.useWith ?? []) {
      if (r.setFlag) flags[r.setFlag] = false;
      if (r.alreadyFlag) flags[r.alreadyFlag] = false;
    }
    next = { ...next, initialFlags: flags };
  }
  return {
    doc: next,
    message: `Placed ${entry.title} (${hotspotId}) in ${room.name || opts.roomId}.`,
  };
}
