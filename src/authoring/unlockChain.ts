/**
 * Unlock chain wizard — wire source (talk / pickup / use-with / combine)
 * to a target (exit / hotspot alreadyFlag / dialogue require).
 */

import { suggestId } from "@/authoring/codegen";
import type { JsonPackDocument, JsonPackLink } from "@/engine/jsonPack";
import type { VerbId } from "@/engine/types";
import { upsertLink } from "@/studio/packDraft";

export type UnlockSourceKind =
  | "dialogue_choice"
  | "pickup"
  | "use_with"
  | "combine";

export type UnlockTargetKind = "exit" | "hotspot_flag" | "none";

export interface UnlockChainInput {
  flag: string;
  source: UnlockSourceKind;
  /** dialogue: room + hotspot + lineId (optional — uses first line) */
  roomId: string;
  hotspotId?: string;
  choiceText?: string;
  /** pickup / use-with extras */
  itemId?: string;
  itemName?: string;
  target: UnlockTargetKind;
  /** exit target */
  exitTo?: string;
  exitDirection?: string;
  blockedMessage?: string;
  /** hotspot that should check alreadyFlag / look gated — optional */
  targetHotspotId?: string;
}

export function applyUnlockChain(
  doc: JsonPackDocument,
  input: UnlockChainInput
): { doc: JsonPackDocument; message: string } {
  const flag = suggestId(input.flag || "unlocked", "unlocked");
  const roomId =
    input.roomId && doc.rooms[input.roomId] ? input.roomId : doc.startRoom;
  const room = doc.rooms[roomId];
  if (!room) {
    return { doc, message: "Room missing" };
  }

  let next: JsonPackDocument = {
    ...doc,
    initialFlags: { ...(doc.initialFlags ?? {}), [flag]: false },
  };

  if (input.source === "dialogue_choice") {
    const hsId = input.hotspotId;
    const hotspots = (room.hotspots ?? []).map((h) => {
      if (hsId && h.id !== hsId) return h;
      if (!hsId && h.kind !== "character") return h;
      if (h.kind !== "character" && hsId !== h.id) return h;
      const lines = h.dialogue?.lines?.length
        ? h.dialogue.lines
        : [
            {
              id: "hello",
              text: `${h.name} listens.`,
              choices: [] as Array<{
                text: string;
                nextId?: string;
                setFlag?: string;
                choiceId?: string;
              }>,
            },
          ];
      const line0 = { ...lines[0]! };
      const choices = [
        ...(line0.choices ?? []),
        {
          text: input.choiceText?.trim() || "That helps — thanks.",
          nextId: "END",
          setFlag: flag,
          choiceId: suggestId("unlock", "unlock"),
        },
      ].slice(0, 4);
      line0.choices = choices;
      return {
        ...h,
        kind: "character" as const,
        verbs: (h.verbs?.length ? h.verbs : ["look", "talk"]) as VerbId[],
        dialogue: {
          speaker: h.dialogue?.speaker || h.name,
          lines: [line0, ...lines.slice(1)],
        },
      };
    });
    // If no character matched, create one
    const hasChar = hotspots.some(
      (h) => h.kind === "character" && (!hsId || h.id === hsId)
    );
    let list = hotspots;
    if (!hasChar) {
      list = [
        ...hotspots,
        {
          id: suggestId("npc", "npc"),
          name: "NPC",
          x: 50,
          y: 40,
          width: 14,
          height: 34,
          kind: "character",
          verbs: ["look", "talk"] as VerbId[],
          lookText: "Someone who can help.",
          dialogue: {
            speaker: "NPC",
            lines: [
              {
                id: "hello",
                text: "I might know something.",
                choices: [
                  {
                    text: input.choiceText?.trim() || "Tell me the secret",
                    nextId: "END",
                    setFlag: flag,
                    choiceId: "unlock",
                  },
                ],
              },
            ],
          },
        },
      ];
    }
    next = {
      ...next,
      rooms: { ...next.rooms, [roomId]: { ...room, hotspots: list } },
    };
  }

  if (input.source === "pickup") {
    const itemId = suggestId(input.itemId || input.itemName || "token", "item");
    const got = `got_${itemId}`;
    // Use got_* as the chain flag when author left default — else also set custom flag via useText path
    const chainFlag = input.flag?.trim() ? flag : got;
    const hotspots = [
      ...(room.hotspots ?? []),
      {
        id: suggestId("pickup", "pickup"),
        name: input.itemName || "Token",
        x: 30,
        y: 45,
        width: 14,
        height: 16,
        kind: "pickup" as const,
        itemId,
        itemName: input.itemName || "Token",
        itemDescription: "Useful later.",
        lookText: "Looks important.",
        useText: "You take it.",
        verbs: ["look", "use"] as VerbId[],
      },
    ];
    next = {
      ...next,
      initialFlags: {
        ...(next.initialFlags ?? {}),
        [got]: false,
        [chainFlag]: false,
      },
      items: {
        ...(next.items ?? {}),
        [itemId]: {
          id: itemId,
          name: input.itemName || "Token",
          description: "Useful later.",
        },
      },
      rooms: { ...next.rooms, [roomId]: { ...room, hotspots } },
    };
    // For exit target, prefer got_item unless custom flag requested with dialogue
    if (!input.flag?.trim()) {
      return finishTarget(next, { ...input, flag: got }, got, roomId);
    }
  }

  if (input.source === "use_with") {
    const itemId = suggestId(input.itemId || "key", "item");
    const hotspots = (room.hotspots ?? []).map((h) => {
      if (input.hotspotId && h.id !== input.hotspotId) return h;
      if (!input.hotspotId && h.kind !== "use-with-target" && h.kind !== "interact")
        return h;
      return {
        ...h,
        kind: "use-with-target" as const,
        useWith: [
          ...(h.useWith ?? []),
          {
            itemId,
            message: "It works!",
            setFlag: flag,
            alreadyFlag: flag,
            alreadyMessage: "Already done.",
            consumeItem: true,
          },
        ],
      };
    });
    next = {
      ...next,
      rooms: { ...next.rooms, [roomId]: { ...room, hotspots } },
    };
  }

  if (input.source === "combine") {
    const a = suggestId("part_a", "part_a");
    const b = suggestId("part_b", "part_b");
    const result = suggestId("tool", "tool");
    next = {
      ...next,
      combinations: {
        ...(next.combinations ?? {}),
        [`${a}+${b}`]: {
          items: [a, b],
          result: {
            id: result,
            name: "Improvised tool",
            description: "Opens the way.",
          },
          successMessage: "Combined!",
        },
      },
      items: {
        ...(next.items ?? {}),
        [a]: { id: a, name: "Part A" },
        [b]: { id: b, name: "Part B" },
        [result]: { id: result, name: "Improvised tool" },
      },
    };
    // Exit gated on item instead of flag when combining
    if (input.target === "exit" && input.exitTo) {
      const link: JsonPackLink = {
        from: roomId,
        to: input.exitTo,
        direction: input.exitDirection || "east",
        fromLabel: next.rooms[input.exitTo]?.name || input.exitTo,
        toLabel: next.rooms[roomId]?.name || roomId,
        requireItem: result,
        blockedMessage:
          input.blockedMessage ||
          "You need the improvised tool (combine Part A + Part B).",
      };
      next = upsertLink(next, link);
      return {
        doc: next,
        message: `Combine ${a}+${b} → ${result}; exit gated on item.`,
      };
    }
  }

  return finishTarget(next, input, flag, roomId);
}

function finishTarget(
  doc: JsonPackDocument,
  input: UnlockChainInput,
  flag: string,
  roomId: string
): { doc: JsonPackDocument; message: string } {
  let next = doc;
  if (input.target === "exit" && input.exitTo && next.rooms[input.exitTo]) {
    const link: JsonPackLink = {
      from: roomId,
      to: input.exitTo,
      direction: input.exitDirection || "east",
      fromLabel: next.rooms[input.exitTo]?.name || input.exitTo,
      toLabel: next.rooms[roomId]?.name || roomId,
      requireFlag: flag,
      blockedMessage:
        input.blockedMessage || `Need ${flag} before you can go this way.`,
    };
    next = upsertLink(next, link);
    return {
      doc: next,
      message: `Unlock chain: source sets ${flag} → exit ${roomId}→${input.exitTo}.`,
    };
  }
  if (input.target === "hotspot_flag" && input.targetHotspotId) {
    const room = next.rooms[roomId]!;
    const hotspots = (room.hotspots ?? []).map((h) => {
      if (h.id !== input.targetHotspotId) return h;
      return {
        ...h,
        lookText:
          h.lookText ||
          `Something changes when ${flag} is true.`,
        // stash gate note in useText for authors
        useText: h.useText || `(Reads flag ${flag})`,
      };
    });
    next = {
      ...next,
      rooms: { ...next.rooms, [roomId]: { ...room, hotspots } },
    };
    return {
      doc: next,
      message: `Flag ${flag} wired; target hotspot annotated.`,
    };
  }
  return {
    doc: next,
    message: `Source wired to set ${flag}. Link an exit in the map graph or Unlock wizard target.`,
  };
}
