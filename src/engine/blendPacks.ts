/**
 * Blend / merge JSON packs — compose rooms, items, audio, quests, etc.
 * Tone × place × content: keep the base identity; pull slices from a donor.
 */

import type { MusicCueRef } from "./audio";
import type {
  JsonPackDocument,
  JsonPackHotspot,
  JsonPackLink,
  JsonPackRoom,
} from "./jsonPack";
import { parseJsonPack } from "./jsonPack";
import { mergeCredits } from "./credits";

export const BLEND_LAYERS = [
  "rooms",
  "items",
  "actors",
  "links",
  "audio",
  "combinations",
  "quests",
  "hints",
  "cutscenes",
  "achievements",
  "flags",
  "i18n",
  "map",
] as const;

export type BlendLayer = (typeof BLEND_LAYERS)[number];

export type BlendConflictPolicy = "skip" | "rename" | "overwrite";

export interface BlendPackOptions {
  /** Which slices to take from the donor (default: all) */
  layers?: BlendLayer[];
  /** How to handle id collisions (default: rename) */
  onConflict?: BlendConflictPolicy;
  /** Prefix for renamed ids (default: donor.id + "_") */
  renamePrefix?: string;
  /** Keep base startRoom (default true) */
  keepStartRoom?: boolean;
  /** Copy donor verbMode onto base (default false) */
  takeVerbMode?: boolean;
}

export interface BlendPackReport {
  ok: boolean;
  donorId: string;
  added: {
    rooms: string[];
    items: string[];
    actors: string[];
    links: number;
    combinations: string[];
    quests: string[];
    hints: string[];
    cutscenes: string[];
    achievements: string[];
    flags: string[];
  };
  /** donor id → final id in blended pack */
  renamed: Record<string, string>;
  skipped: string[];
  warnings: string[];
}

const ALL_LAYERS: BlendLayer[] = [...BLEND_LAYERS];

function wants(layers: BlendLayer[], layer: BlendLayer): boolean {
  return layers.includes(layer);
}

function safeId(raw: string, fallback: string): string {
  const t = raw.trim().replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 48);
  return t || fallback;
}

/**
 * Merge `donor` into `base`. Base pack id/title/version stay unless overwritten
 * by explicit options. Returns a new document + report (pure).
 */
export function blendPacks(
  base: JsonPackDocument,
  donor: JsonPackDocument,
  opts: BlendPackOptions = {}
): { pack: JsonPackDocument; report: BlendPackReport } {
  const basePack = parseJsonPack(base);
  const donorPack = parseJsonPack(donor);
  const layers = opts.layers?.length ? opts.layers : ALL_LAYERS;
  const policy = opts.onConflict ?? "rename";
  const prefix = safeId(
    opts.renamePrefix ?? `${donorPack.id}_`,
    "blend_"
  );
  const keepStart = opts.keepStartRoom !== false;

  const renamed: Record<string, string> = {};
  const skipped: string[] = [];
  const warnings: string[] = [];
  const added = {
    rooms: [] as string[],
    items: [] as string[],
    actors: [] as string[],
    links: 0,
    combinations: [] as string[],
    quests: [] as string[],
    hints: [] as string[],
    cutscenes: [] as string[],
    achievements: [] as string[],
    flags: [] as string[],
  };

  const resolveId = (
    id: string,
    existing: Set<string>,
    kind: string
  ): string | null => {
    if (!existing.has(id)) return id;
    if (policy === "skip") {
      skipped.push(`${kind}:${id}`);
      return null;
    }
    if (policy === "overwrite") return id;
    let next = `${prefix}${id}`;
    let n = 2;
    while (existing.has(next)) {
      next = `${prefix}${id}_${n++}`;
    }
    renamed[`${kind}:${id}`] = next;
    return next;
  };

  // --- items ---
  const items = { ...(basePack.items ?? {}) };
  const itemMap = new Map<string, string>(); // donor → final
  if (wants(layers, "items")) {
    const existing = new Set(Object.keys(items));
    for (const [id, item] of Object.entries(donorPack.items ?? {})) {
      const next = resolveId(id, existing, "item");
      if (!next) continue;
      items[next] = { ...item, id: next };
      itemMap.set(id, next);
      existing.add(next);
      if (!added.items.includes(next)) added.items.push(next);
    }
  } else {
    for (const id of Object.keys(donorPack.items ?? {})) {
      itemMap.set(id, id);
    }
  }

  // --- actors ---
  const actors = { ...(basePack.actors ?? {}) };
  const actorMap = new Map<string, string>();
  if (wants(layers, "actors")) {
    const existing = new Set(Object.keys(actors));
    for (const [id, actor] of Object.entries(donorPack.actors ?? {})) {
      const next = resolveId(id, existing, "actor");
      if (!next) continue;
      actors[next] = { ...actor, id: next };
      actorMap.set(id, next);
      existing.add(next);
      added.actors.push(next);
    }
  } else {
    for (const id of Object.keys(donorPack.actors ?? {})) {
      actorMap.set(id, id);
    }
  }

  // --- rooms ---
  const rooms = { ...basePack.rooms };
  const roomMap = new Map<string, string>();
  if (wants(layers, "rooms")) {
    const existing = new Set(Object.keys(rooms));
    for (const [id, room] of Object.entries(donorPack.rooms ?? {})) {
      const next = resolveId(id, existing, "room");
      if (!next) continue;
      rooms[next] = remapRoom(room, id, next, itemMap, actorMap);
      roomMap.set(id, next);
      existing.add(next);
      added.rooms.push(next);
    }
  }

  // --- links ---
  let links = [...(basePack.links ?? [])];
  if (wants(layers, "links")) {
    for (const link of donorPack.links ?? []) {
      const from = roomMap.get(link.from) ?? link.from;
      const to = roomMap.get(link.to) ?? link.to;
      if (!rooms[from] || !rooms[to]) {
        warnings.push(
          `Skipped link ${link.from}→${link.to} (room missing after blend)`
        );
        continue;
      }
      const requireItem = link.requireItem
        ? itemMap.get(link.requireItem) ?? link.requireItem
        : undefined;
      const blended: JsonPackLink = {
        ...link,
        from,
        to,
        ...(requireItem ? { requireItem } : {}),
      };
      const dup = links.some(
        (l) =>
          l.from === blended.from &&
          l.to === blended.to &&
          (l.direction ?? "") === (blended.direction ?? "")
      );
      if (dup && policy === "skip") {
        skipped.push(`link:${from}→${to}`);
        continue;
      }
      if (dup && policy === "rename") {
        // still add — parallel gates ok
      }
      if (dup && policy === "overwrite") {
        links = links.filter(
          (l) =>
            !(
              l.from === blended.from &&
              l.to === blended.to &&
              (l.direction ?? "") === (blended.direction ?? "")
            )
        );
      }
      links.push(blended);
      added.links += 1;
    }
  }

  // --- audio ---
  let audio = basePack.audio ? { ...basePack.audio } : undefined;
  if (wants(layers, "audio") && donorPack.audio) {
    audio = {
      ...audio,
      defaultMusic: audio?.defaultMusic ?? donorPack.audio.defaultMusic,
      music: {
        ...(audio?.music ?? {}),
        ...remapAudioKeys(donorPack.audio.music, roomMap),
      },
      ambient: {
        ...(audio?.ambient ?? {}),
        ...(donorPack.audio.ambient ?? {}),
      },
      sfx: { ...(audio?.sfx ?? {}), ...(donorPack.audio.sfx ?? {}) },
      voice: { ...(audio?.voice ?? {}), ...(donorPack.audio.voice ?? {}) },
    };
  }

  // --- combinations ---
  const combinations = { ...(basePack.combinations ?? {}) };
  if (wants(layers, "combinations")) {
    const existing = new Set(Object.keys(combinations));
    for (const [key, combo] of Object.entries(donorPack.combinations ?? {})) {
      const nextKey = resolveId(key, existing, "combo");
      if (!nextKey) continue;
      const itemsRemapped: [string, string] = [
        itemMap.get(combo.items[0]) ?? combo.items[0],
        itemMap.get(combo.items[1]) ?? combo.items[1],
      ];
      const result = combo.result
        ? {
            ...combo.result,
            id: itemMap.get(combo.result.id) ?? combo.result.id,
          }
        : combo.result;
      combinations[nextKey] = { ...combo, items: itemsRemapped, result };
      existing.add(nextKey);
      added.combinations.push(nextKey);
    }
  }

  // --- quests / hints / cutscenes / achievements ---
  const quests = [...(basePack.quests ?? [])];
  if (wants(layers, "quests")) {
    const existing = new Set(quests.map((q) => q.id));
    for (const q of donorPack.quests ?? []) {
      const next = resolveId(q.id, existing, "quest");
      if (!next) continue;
      quests.push({ ...q, id: next });
      existing.add(next);
      added.quests.push(next);
    }
  }

  const hints = [...(basePack.hints ?? [])];
  if (wants(layers, "hints")) {
    const existing = new Set(hints.map((h) => h.id));
    for (const h of donorPack.hints ?? []) {
      const next = resolveId(h.id, existing, "hint");
      if (!next) continue;
      hints.push({ ...h, id: next });
      existing.add(next);
      added.hints.push(next);
    }
  }

  const cutscenes = { ...(basePack.cutscenes ?? {}) };
  if (wants(layers, "cutscenes")) {
    const existing = new Set(Object.keys(cutscenes));
    for (const [id, cs] of Object.entries(donorPack.cutscenes ?? {})) {
      const next = resolveId(id, existing, "cutscene");
      if (!next) continue;
      cutscenes[next] = cs;
      existing.add(next);
      added.cutscenes.push(next);
    }
  }

  const achievements = [...(basePack.achievements ?? [])];
  if (wants(layers, "achievements")) {
    const existing = new Set(achievements.map((a) => a.id));
    for (const a of donorPack.achievements ?? []) {
      const next = resolveId(a.id, existing, "achievement");
      if (!next) continue;
      achievements.push({ ...a, id: next });
      existing.add(next);
      added.achievements.push(next);
    }
  }

  // --- flags ---
  const initialFlags = { ...(basePack.initialFlags ?? {}) };
  if (wants(layers, "flags")) {
    for (const [flag, val] of Object.entries(donorPack.initialFlags ?? {})) {
      if (flag in initialFlags && policy === "skip") {
        skipped.push(`flag:${flag}`);
        continue;
      }
      initialFlags[flag] = val;
      if (!added.flags.includes(flag)) added.flags.push(flag);
    }
  }

  // --- i18n ---
  let i18n = basePack.i18n;
  if (wants(layers, "i18n") && donorPack.i18n?.messages) {
    const messages = { ...(i18n?.messages ?? {}) };
    for (const [loc, cat] of Object.entries(donorPack.i18n.messages)) {
      messages[loc] = { ...(messages[loc] ?? {}), ...cat };
    }
    i18n = {
      defaultLocale:
        i18n?.defaultLocale ?? donorPack.i18n.defaultLocale ?? "en",
      messages,
    };
  }

  // --- map ---
  let mapGroups = basePack.mapGroups ? { ...basePack.mapGroups } : undefined;
  let mapFastTravel = basePack.mapFastTravel;
  if (wants(layers, "map")) {
    if (donorPack.mapGroups) {
      mapGroups = { ...(mapGroups ?? {}) };
      for (const [group, roomIds] of Object.entries(donorPack.mapGroups)) {
        const mapped = roomIds
          .map((id) => roomMap.get(id) ?? id)
          .filter((id) => !!rooms[id]);
        const prev = mapGroups[group] ?? [];
        mapGroups[group] = [...new Set([...prev, ...mapped])];
      }
    }
    if (donorPack.mapFastTravel != null && mapFastTravel == null) {
      mapFastTravel = donorPack.mapFastTravel;
    }
  }

  // flagCutscenes — remap cutscene ids if renamed
  let flagCutscenes = basePack.flagCutscenes
    ? { ...basePack.flagCutscenes }
    : undefined;
  if (donorPack.flagCutscenes && wants(layers, "cutscenes")) {
    flagCutscenes = { ...(flagCutscenes ?? {}) };
    for (const [flag, csId] of Object.entries(donorPack.flagCutscenes)) {
      const mapped = renamed[`cutscene:${csId}`] ?? csId;
      if (policy === "skip" && flagCutscenes[flag] && flagCutscenes[flag] !== mapped) {
        skipped.push(`flagCutscene:${flag}`);
        continue;
      }
      flagCutscenes[flag] = mapped;
    }
  }

  const pack: JsonPackDocument = {
    ...basePack,
    // Donor art comes along, so its credits must too
    credits: mergeCredits(basePack.credits, donorPack.credits),
    rooms,
    items,
    actors: Object.keys(actors).length ? actors : basePack.actors,
    links,
    audio,
    combinations,
    quests,
    hints,
    cutscenes,
    achievements,
    initialFlags,
    i18n,
    mapGroups,
    mapFastTravel,
    flagCutscenes,
    startRoom: keepStart
      ? basePack.startRoom
      : roomMap.get(donorPack.startRoom) ?? basePack.startRoom,
    verbMode: opts.takeVerbMode ? donorPack.verbMode : basePack.verbMode,
    stuckAssist: basePack.stuckAssist ?? donorPack.stuckAssist,
  };

  if (
    !added.rooms.length &&
    !added.items.length &&
    !added.links &&
    skipped.length &&
    policy === "skip"
  ) {
    warnings.push("Nothing blended — all donor ids collided and were skipped.");
  }

  return {
    pack: parseJsonPack(pack),
    report: {
      ok: true,
      donorId: donorPack.id,
      added,
      renamed,
      skipped,
      warnings,
    },
  };
}

function remapAudioKeys(
  music: Record<string, MusicCueRef> | undefined,
  roomMap: Map<string, string>
): Record<string, MusicCueRef> {
  if (!music) return {};
  const out: Record<string, MusicCueRef> = {};
  for (const [cue, preset] of Object.entries(music)) {
    const key = roomMap.get(cue) ?? cue;
    out[key] = preset;
  }
  return out;
}

function remapRoom(
  room: JsonPackRoom,
  oldId: string,
  newId: string,
  itemMap: Map<string, string>,
  actorMap: Map<string, string>
): JsonPackRoom {
  const hotspots = (room.hotspots ?? []).map((h) =>
    remapHotspot(h, itemMap, actorMap)
  );
  const music =
    room.music && room.music === oldId && oldId !== newId
      ? newId
      : room.music;
  return {
    ...room,
    id: newId,
    hotspots,
    ...(music ? { music } : {}),
  };
}

function remapHotspot(
  h: JsonPackHotspot,
  itemMap: Map<string, string>,
  actorMap: Map<string, string>
): JsonPackHotspot {
  const itemId = h.itemId ? itemMap.get(h.itemId) ?? h.itemId : h.itemId;
  const actorId = h.actorId
    ? actorMap.get(h.actorId) ?? h.actorId
    : h.actorId;
  const useWith = h.useWith?.map((rule) => ({
    ...rule,
    itemId: itemMap.get(rule.itemId) ?? rule.itemId,
    giveItem: rule.giveItem
      ? {
          ...rule.giveItem,
          id: itemMap.get(rule.giveItem.id) ?? rule.giveItem.id,
        }
      : rule.giveItem,
  }));
  const dialogue = h.dialogue
    ? {
        ...h.dialogue,
        lines: h.dialogue.lines.map((line) => ({
          ...line,
          choices: line.choices?.map((c) => ({
            ...c,
            giveItemId: c.giveItemId
              ? itemMap.get(c.giveItemId) ?? c.giveItemId
              : c.giveItemId,
          })),
        })),
      }
    : h.dialogue;
  const actions = h.actions?.map((a) => {
    if (a.op === "giveItem" && a.item) {
      return {
        ...a,
        item: {
          ...a.item,
          id: itemMap.get(a.item.id) ?? a.item.id,
        },
      };
    }
    if (a.op === "takeItem") {
      return {
        ...a,
        itemId: itemMap.get(a.itemId) ?? a.itemId,
      };
    }
    return a;
  });
  return {
    ...h,
    ...(itemId ? { itemId } : {}),
    ...(actorId ? { actorId } : {}),
    ...(useWith ? { useWith } : {}),
    ...(dialogue ? { dialogue } : {}),
    ...(actions ? { actions } : {}),
  };
}

/** Blend several donors in order onto base. */
export function blendPacksMany(
  base: JsonPackDocument,
  donors: JsonPackDocument[],
  opts?: BlendPackOptions
): { pack: JsonPackDocument; reports: BlendPackReport[] } {
  let pack = base;
  const reports: BlendPackReport[] = [];
  for (const donor of donors) {
    const result = blendPacks(pack, donor, opts);
    pack = result.pack;
    reports.push(result.report);
  }
  return { pack, reports };
}

export function formatBlendReport(report: BlendPackReport): string {
  const lines = [
    `Blended donor "${report.donorId}"`,
    `  rooms +${report.added.rooms.length}: ${report.added.rooms.join(", ") || "—"}`,
    `  items +${report.added.items.length}: ${report.added.items.join(", ") || "—"}`,
    `  links +${report.added.links}`,
    `  quests +${report.added.quests.length}, hints +${report.added.hints.length}, cutscenes +${report.added.cutscenes.length}`,
  ];
  const renames = Object.entries(report.renamed).filter(([k]) =>
    k.includes(":")
  );
  if (renames.length) {
    lines.push(
      `  renamed: ${renames.map(([a, b]) => `${a}→${b}`).join(", ")}`
    );
  }
  if (report.skipped.length) {
    lines.push(`  skipped: ${report.skipped.join(", ")}`);
  }
  if (report.warnings.length) {
    lines.push(...report.warnings.map((w) => `  warn: ${w}`));
  }
  return lines.join("\n");
}
