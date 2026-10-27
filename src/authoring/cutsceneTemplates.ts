/**
 * Cutscene templates — enter → walk → line → unlock (item 12).
 */

import { suggestId } from "@/authoring/codegen";
import type {
  JsonPackCutscene,
  JsonPackDocument,
  JsonPackLink,
} from "@/engine/jsonPack";
import { upsertLink } from "@/studio/packDraft";

export type CutsceneTemplateId =
  | "intro-enter"
  | "discovery"
  | "escape";

export interface CutsceneTemplateMeta {
  id: CutsceneTemplateId;
  title: string;
  blurb: string;
}

export const CUTSCENE_TEMPLATES: CutsceneTemplateMeta[] = [
  {
    id: "intro-enter",
    title: "Intro — enter room",
    blurb: "Wait → walk forward → opening line. Good for start.",
  },
  {
    id: "discovery",
    title: "Discovery beat",
    blurb: "Walk to a point → react line → optional setFlag.",
  },
  {
    id: "escape",
    title: "Escape / unlock exit",
    blurb: "Line → setFlag → gate an exit so the path opens after the beat.",
  },
];

export interface ApplyCutsceneTemplateOpts {
  templateId: CutsceneTemplateId;
  cutsceneId?: string;
  title?: string;
  roomId?: string;
  /** Discovery / escape line */
  line?: string;
  speaker?: string;
  walkX?: number;
  walkY?: number;
  setFlag?: string;
  /** Escape: exit destination room id */
  exitTo?: string;
  exitDirection?: string;
  blockedMessage?: string;
}

export function applyCutsceneTemplate(
  doc: JsonPackDocument,
  opts: ApplyCutsceneTemplateOpts
): { doc: JsonPackDocument; cutsceneId: string; message: string } {
  const roomId =
    opts.roomId && doc.rooms[opts.roomId] ? opts.roomId : doc.startRoom;
  const id = suggestId(
    opts.cutsceneId || opts.templateId,
    `cutscene_${Object.keys(doc.cutscenes ?? {}).length + 1}`
  );
  const title = opts.title?.trim() || CUTSCENE_TEMPLATES.find((t) => t.id === opts.templateId)?.title || id;
  const walkX = opts.walkX ?? 48;
  const walkY = opts.walkY ?? 72;
  const line =
    opts.line?.trim() ||
    (opts.templateId === "escape"
      ? "The way ahead is clear."
      : opts.templateId === "discovery"
        ? "Something here doesn't belong…"
        : "You step into the scene.");
  const speaker = opts.speaker?.trim();
  const flag = opts.setFlag?.trim() || (opts.templateId === "escape" ? "path_open" : undefined);

  let steps: JsonPackCutscene["steps"] = [];
  if (opts.templateId === "intro-enter") {
    steps = [
      { op: "wait", ms: 400 },
      { op: "walk", x: walkX, y: walkY },
      { op: "message", text: line, speaker },
    ];
  } else if (opts.templateId === "discovery") {
    steps = [
      { op: "walk", x: walkX, y: walkY },
      { op: "sound", key: "creak" },
      { op: "message", text: line, speaker },
    ];
  } else {
    // escape
    steps = [
      { op: "message", text: line, speaker },
      { op: "wait", ms: 500 },
      { op: "walk", x: walkX, y: walkY },
    ];
  }

  const cutscene: JsonPackCutscene = {
    id,
    title,
    skippable: true,
    steps,
  };

  let next: JsonPackDocument = {
    ...doc,
    cutscenes: { ...(doc.cutscenes ?? {}), [id]: cutscene },
  };

  if (flag) {
    next = {
      ...next,
      initialFlags: { ...(next.initialFlags ?? {}), [flag]: false },
    };
    // Append a message that authors can pair with an action; for escape, gate exit
  }

  if (opts.templateId === "escape" && flag && opts.exitTo && next.rooms[opts.exitTo]) {
    const link: JsonPackLink = {
      from: roomId,
      to: opts.exitTo,
      direction: opts.exitDirection || "east",
      fromLabel: next.rooms[opts.exitTo]?.name || opts.exitTo,
      toLabel: next.rooms[roomId]?.name || roomId,
      requireFlag: flag,
      blockedMessage:
        opts.blockedMessage ||
        "Not yet — finish the escape beat (or set the flag in cheats).",
    };
    next = upsertLink(next, link);
    // Store flag on cutscene via a trailing note in title for authors
    next = {
      ...next,
      cutscenes: {
        ...next.cutscenes,
        [id]: {
          ...cutscene,
          title: `${title} (sets ${flag} via Unlock / action)`,
        },
      },
    };
    // Add a one-shot interact hotspot that plays cutscene + sets flag — practical unlock
    const room = next.rooms[roomId]!;
    const triggerId = suggestId("escape_trigger", "escape_trigger");
    next = {
      ...next,
      rooms: {
        ...next.rooms,
        [roomId]: {
          ...room,
          hotspots: [
            ...(room.hotspots ?? []),
            {
              id: triggerId,
              name: "Escape moment",
              x: 70,
              y: 60,
              width: 16,
              height: 18,
              kind: "interact",
              lookText: "When you're ready, Use this to resolve the beat.",
              useText: "You steel yourself.",
              actions: [
                { op: "cutscene", id },
                { op: "setFlag", flag, value: true },
                { op: "message", text: "The path opens." },
              ],
              actionVerbs: ["use"],
            },
          ],
        },
      },
    };
    return {
      doc: next,
      cutsceneId: id,
      message: `Escape cutscene “${id}” + trigger hotspot + exit gated on ${flag}.`,
    };
  }

  return {
    doc: next,
    cutsceneId: id,
    message: `Cutscene “${id}” added (${opts.templateId}).`,
  };
}
