/**
 * Compile a JSON pack document into a playable GameDefinition.
 */

import type { PackAudio } from "./audio";
import { isMusicFileBed } from "./audio";
import type { GameDefinition } from "./definition";
import { linkRooms } from "./exits";
import { isBitmapCostume } from "./actorArt";
import { seedDefaultLocaleCatalog } from "./lineCatalog";
import { compilePackCutscenes, compilePackHints } from "./jsonPackCutscenes";
import { compileHotspot } from "./jsonPackHotspot";
import {
  JSON_PACK_PLACEHOLDER_IMAGE,
  parseJsonPack,
  sanitizeFlagCutscenes,
  sanitizeTransition,
} from "./jsonPackCompile";
import { compilePackSpecials } from "./jsonPackSpecials";
import { sanitizeJuiceCue } from "./juice";
import { sanitizePackActions } from "./packActions";
import { sanitizeRoomTimers } from "./roomTimers";
import { isSafeIdentifierKey, isSafeMediaUrl, isSafePlayMediaUrl } from "./security";
import { clampWalkFloor, sanitizeWalkboxList } from "./walkboxes";
import type {
  Actor,
  ItemCombination,
  Room,
  RoomLayer,
} from "./types";
import type { JsonPackDocument, JsonPackLink } from "./jsonPackTypes";

const PARTICLE_KINDS = new Set([
  "none",
  "rain",
  "dust",
  "sparks",
  "fog",
  "stars",
  "sparkle",
  "fireflies",
]);

function sanitizeParticles(
  raw: Room["particles"] | undefined
): Room["particles"] | undefined {
  if (!raw || !PARTICLE_KINDS.has(raw)) return undefined;
  return raw === "none" ? undefined : raw;
}

function sanitizeRoomLayers(
  raw: RoomLayer[] | undefined
): RoomLayer[] | undefined {
  if (!raw?.length) return undefined;
  const out: RoomLayer[] = [];
  for (const layer of raw) {
    if (!layer || typeof layer !== "object") continue;
    const id = typeof layer.id === "string" ? layer.id.trim() : "";
    const image =
      typeof layer.image === "string" && isSafeMediaUrl(layer.image)
        ? layer.image
        : "";
    const frames = (layer.frames ?? []).filter((u) => isSafeMediaUrl(u));
    if (!id || (!image && !frames.length)) continue;
    const fps =
      typeof layer.fps === "number" && Number.isFinite(layer.fps)
        ? Math.max(1, Math.min(24, layer.fps))
        : undefined;
    const animClass =
      typeof layer.animClass === "string" && layer.animClass.trim()
        ? layer.animClass.trim().slice(0, 40)
        : undefined;
    out.push({
      id: id.slice(0, 64),
      image: image || frames[0]!,
      ...(typeof layer.parallax === "number"
        ? { parallax: Math.max(0, Math.min(2, layer.parallax)) }
        : {}),
      ...(typeof layer.opacity === "number"
        ? { opacity: Math.max(0, Math.min(1, layer.opacity)) }
        : {}),
      ...(typeof layer.depth === "number"
        ? { depth: Math.max(-10, Math.min(10, layer.depth)) }
        : {}),
      ...(frames.length ? { frames } : {}),
      ...(fps != null ? { fps } : {}),
      ...(animClass ? { animClass } : {}),
    });
  }
  return out.length ? out : undefined;
}

/** Drop unsafe media URLs from pack audio maps at compile time. */
function sanitizePackAudio(audio: PackAudio | undefined): PackAudio | undefined {
  if (!audio || typeof audio !== "object") return undefined;
  const music: PackAudio["music"] = {};
  for (const [key, mapped] of Object.entries(audio.music ?? {})) {
    if (!key.trim()) continue;
    if (typeof mapped === "string") {
      const t = mapped.trim();
      if (t) music[key] = t;
      continue;
    }
    if (isMusicFileBed(mapped)) {
      if (!isSafeMediaUrl(mapped.src)) continue;
      music[key] = {
        src: mapped.src.trim(),
        loop: mapped.loop !== false,
        ...(typeof mapped.gain === "number" ? { gain: mapped.gain } : {}),
        ...(mapped.fallbackPreset?.trim()
          ? { fallbackPreset: mapped.fallbackPreset.trim() }
          : {}),
      };
      continue;
    }
    if (mapped && typeof mapped === "object" && "preset" in mapped) {
      const preset = String(mapped.preset || "").trim();
      if (preset) music[key] = { preset, mood: mapped.mood };
    }
  }
  const filterKeyMap = (raw?: Record<string, string>) => {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw ?? {})) {
      if (!k.trim() || typeof v !== "string") continue;
      const t = v.trim();
      // Ambient/preset tokens or safe media URLs
      if (/^[a-z][a-z0-9_-]{0,63}$/i.test(t) || isSafeMediaUrl(t)) {
        out[k] = t;
      }
    }
    return Object.keys(out).length ? out : undefined;
  };
  return {
    ...(audio.defaultMusic?.trim()
      ? { defaultMusic: audio.defaultMusic.trim() }
      : {}),
    ...(Object.keys(music).length ? { music } : {}),
    ambient: filterKeyMap(audio.ambient),
    voice: filterKeyMap(audio.voice),
    sfx: filterKeyMap(audio.sfx),
  };
}

function applyLinks(
  rooms: Record<string, Room>,
  links: JsonPackLink[]
): void {
  for (const link of links) {
    if (!rooms[link.from] || !rooms[link.to]) continue;
    const needsGate = !!(link.requireFlag || link.requireItem);
    const { forward, back } = linkRooms(link.from, link.to, {
      direction: link.direction || "east",
      fromLabel: link.fromLabel,
      toLabel: link.toLabel,
      forwardBlocked: needsGate
        ? (state) => {
            if (link.requireFlag && !state.flags[link.requireFlag]) {
              return true;
            }
            if (
              link.requireItem &&
              !state.inventory.some((i) => i.id === link.requireItem)
            ) {
              return true;
            }
            return false;
          }
        : undefined,
      forwardBlockedMessage:
        link.blockedMessage ||
        (needsGate ? "You can't go that way yet." : undefined),
      forwardShowWhenBlocked: link.showWhenBlocked,
      forwardLockedLabel: link.lockedLabel,
    });
    rooms[link.from].exits = [...(rooms[link.from].exits ?? []), forward];
    rooms[link.to].exits = [...(rooms[link.to].exits ?? []), back];
  }
}

/** Flag / id written with bracket assignment — never __proto__ / constructor. */
function packFlag(raw: string | undefined): string | undefined {
  const trimmed = raw?.trim();
  return trimmed && isSafeIdentifierKey(trimmed) ? trimmed : undefined;
}

/**
 * Compile a JSON pack into a playable GameDefinition.
 * Functions (pickup grants, exit gates) are synthesized from declarative fields.
 */
export function createGameFromJson(doc: JsonPackDocument): GameDefinition {
  const pack = parseJsonPack(doc);
  const rooms: Record<string, Room> = {};

  for (const [key, jr] of Object.entries(pack.rooms)) {
    const id = jr.id || key;
    const walkboxes = sanitizeWalkboxList(jr.walkboxes) ?? [
      { id: "floor", x: 5, y: 55, width: 90, height: 40 },
    ];
    const regionRows = (jr.regions ?? []).slice(0, 64);
    const regions =
      regionRows.length &&
      regionRows.every(
        (r) =>
          typeof r.x === "number" &&
          Number.isFinite(r.x) &&
          typeof r.y === "number" &&
          Number.isFinite(r.y) &&
          typeof r.width === "number" &&
          Number.isFinite(r.width) &&
          typeof r.height === "number" &&
          Number.isFinite(r.height)
      )
        ? regionRows.map((r) => {
            const onEnterActions = sanitizePackActions(r.onEnterActions);
            const onExitActions = sanitizePackActions(r.onExitActions);
            const juice = sanitizeJuiceCue(r.juice);
            const onEnterFlag = packFlag(r.onEnterFlag);
            const onExitFlag = packFlag(r.onExitFlag);
            const setFlag = packFlag(r.setFlag);
            const regionId = packFlag(r.id) || "region";
            return {
              id: regionId,
              x: r.x,
              y: r.y,
              width: r.width,
              height: r.height,
              ...(onEnterFlag ? { onEnterFlag } : {}),
              ...(onExitFlag ? { onExitFlag } : {}),
              ...(setFlag ? { setFlag } : {}),
              ...(r.message?.trim()
                ? { message: r.message.trim().slice(0, 4_000) }
                : {}),
              ...(r.everyEnter ? { everyEnter: true } : {}),
              ...(juice ? { juice } : {}),
              ...(onEnterActions.length ? { onEnterActions } : {}),
              ...(onExitActions.length ? { onExitActions } : {}),
            };
          })
        : undefined;
    const entry =
      jr.entryPoint &&
      typeof jr.entryPoint.x === "number" &&
      typeof jr.entryPoint.y === "number"
        ? { x: jr.entryPoint.x, y: jr.entryPoint.y }
        : { x: 50, y: 75 };
    rooms[id] = {
      id,
      name: jr.name || id,
      description: jr.description || "",
      image:
        jr.image?.trim() && isSafeMediaUrl(jr.image.trim())
          ? jr.image.trim()
          : JSON_PACK_PLACEHOLDER_IMAGE,
      music: jr.music,
      roomSize: { width: 100, height: 100 },
      entryPoint: entry,
      walkboxes,
      ...(typeof jr.activeFloor === "number" && Number.isFinite(jr.activeFloor)
        ? { activeFloor: clampWalkFloor(jr.activeFloor) }
        : {}),
      ...(regions?.length ? { regions } : {}),
      ...(() => {
        const timers = sanitizeRoomTimers(jr.timers);
        return timers.length ? { timers } : {};
      })(),
      hotspots: (jr.hotspots ?? []).map((h) =>
        compileHotspot(h, pack.items, id)
      ),
      exits: [],
      layers: sanitizeRoomLayers(jr.layers),
      particles: sanitizeParticles(jr.particles),
      ...(() => {
        const transitionIn = sanitizeTransition(jr.transitionIn);
        const transitionOut = sanitizeTransition(jr.transitionOut);
        return {
          ...(transitionIn ? { transitionIn } : {}),
          ...(transitionOut ? { transitionOut } : {}),
        };
      })(),
    };
  }

  const initialObjectStates: Record<string, number> = {};
  for (const room of Object.values(rooms)) {
    for (const h of room.hotspots) {
      if (h.initialState != null) {
        initialObjectStates[h.id] = h.initialState;
      }
    }
  }

  applyLinks(rooms, pack.links ?? []);

  const combinations: Record<string, ItemCombination> = {};
  for (const [key, c] of Object.entries(pack.combinations ?? {})) {
    const result = { ...c.result };
    const catalog = pack.items?.[result.id];
    if (catalog) {
      result.name = result.name || catalog.name;
      result.description = result.description || catalog.description || catalog.name;
      result.icon = result.icon || catalog.icon;
    }
    combinations[key] = {
      items: c.items,
      result,
      successMessage: c.successMessage,
      failMessage: c.failMessage,
    };
  }

  const packActors = pack.actors ?? {};

  const pickSprite = (raw: string | undefined, fallback: string): string => {
    const token = typeof raw === "string" ? raw.trim() : "";
    if (!token) return fallback;
    if (isBitmapCostume(token)) return token;
    // CSS class token
    if (/^[a-z][a-z0-9_-]{0,63}$/i.test(token)) return token;
    return fallback;
  };
  const pickPortrait = (raw: string | undefined): string | undefined => {
    if (!raw?.trim()) return undefined;
    return isSafeMediaUrl(raw) ? raw : undefined;
  };

  const playerOverride = packActors.player;
  const actors: Record<string, Actor> = {
    player: {
      id: "player",
      name: playerOverride?.name?.trim() || "You",
      isEgo: true,
      canControl: true,
      talkColor: playerOverride?.talkColor || "#f5e6a8",
      sprite: pickSprite(playerOverride?.sprite, "actor-ego"),
      portrait: pickPortrait(playerOverride?.portrait),
      costumes: playerOverride?.costumes,
      defaultCostume: playerOverride?.defaultCostume,
      animations: playerOverride?.animations,
    },
  };

  // Character hotspots → NPC actors (prefer pack.actors, then hotspot sprite/portrait)
  for (const jr of Object.values(pack.rooms ?? {})) {
    for (const h of jr.hotspots ?? []) {
      if (h.kind !== "character") continue;
      const actorId = (h.actorId || h.id).trim();
      if (!actorId || actors[actorId]) continue;
      const fromPack = packActors[actorId];
      actors[actorId] = {
        id: actorId,
        name: fromPack?.name?.trim() || h.name,
        canControl: false,
        talkColor: fromPack?.talkColor || h.talkColor || "#c4e0f0",
        sprite: pickSprite(fromPack?.sprite || h.sprite, "actor-npc"),
        portrait: pickPortrait(fromPack?.portrait || h.portrait),
        costumes: fromPack?.costumes,
        defaultCostume: fromPack?.defaultCostume,
        animations: fromPack?.animations,
      };
    }
  }
  // Explicit pack.actors entries not tied to hotspots
  for (const [id, a] of Object.entries(packActors)) {
    if (!id || actors[id]) continue;
    actors[id] = {
      id,
      name: a.name?.trim() || id,
      isEgo: !!a.isEgo,
      canControl: !!a.canControl || !!a.isEgo,
      talkColor: a.talkColor || "#c4e0f0",
      sprite: pickSprite(a.sprite, a.isEgo ? "actor-ego" : "actor-npc"),
      portrait: pickPortrait(a.portrait),
      costumes: a.costumes,
      defaultCostume: a.defaultCostume,
      animations: a.animations,
    };
  }

  const itemIcons: Record<string, string> = {};
  for (const item of Object.values(pack.items ?? {})) {
    if (item.icon) itemIcons[item.id] = item.icon;
  }

  const roomIds = Object.keys(rooms);
  const { specials, comics } = compilePackSpecials(pack);
  const definition: GameDefinition = {
    id: pack.id,
    title: pack.title,
    subtitle: pack.subtitle,
    version: pack.version,
    startRoom: pack.startRoom,
    verbMode: pack.verbMode,
    autosave: true,
    mapGroups: pack.mapGroups ?? { World: roomIds },
    mapFastTravel: pack.mapFastTravel ?? {
      enabled: roomIds.length > 1,
      requireVisited: true,
    },
    ...(pack.mapFog?.enabled ? { mapFog: pack.mapFog } : {}),
    ...(Object.keys(specials).length ? { specials } : {}),
    ...(Object.keys(comics).length ? { comics } : {}),
    audio: sanitizePackAudio(pack.audio),
    rooms,
    actors,
    egoId: "player",
    playableActors: ["player"],
    initialActors: {
      player: {
        id: "player",
        roomId: pack.startRoom,
        x: rooms[pack.startRoom]?.entryPoint?.x ?? 50,
        y: rooms[pack.startRoom]?.entryPoint?.y ?? 75,
        facing: "right",
        visible: true,
      },
    },
    namedScripts: {},
    defaultTransition: sanitizeTransition(pack.defaultTransition) ?? {
      kind: "fade",
      durationMs: 280,
    },
    ...(sanitizeFlagCutscenes(pack.flagCutscenes)
      ? { flagCutscenes: sanitizeFlagCutscenes(pack.flagCutscenes) }
      : {}),
    combinations,
    itemIcons: Object.keys(itemIcons).length ? itemIcons : undefined,
    achievements: (pack.achievements ?? []).map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description || a.title,
      ...(a.icon && isSafePlayMediaUrl(a.icon) ? { icon: a.icon } : {}),
      ...(a.unlockFlag?.trim() ? { unlockFlag: a.unlockFlag.trim() } : {}),
    })),
    quests: (pack.quests ?? []).map((q) => {
      const objectives = (q.objectives ?? [])
        .map(String)
        .filter(Boolean)
        .slice(0, 12);
      const objectiveFlags = (q.objectiveFlags ?? [])
        .map((f) => String(f ?? "").trim())
        .slice(0, objectives.length);
      return {
        id: q.id,
        title: q.title,
        description: q.description || q.title,
        objectives,
        ...(objectiveFlags.some(Boolean) ? { objectiveFlags } : {}),
        ...(q.completeFlag?.trim()
          ? { completeFlag: q.completeFlag.trim() }
          : {}),
      };
    }),
    initialFlags: pack.initialFlags ?? {},
    initialObjectStates,
    defaultVerbResponses: {
      look: "Nothing interesting.",
      useWith: "That combination does nothing.",
    },
    cutscenes: compilePackCutscenes(pack.cutscenes ?? {}),
    hints: compilePackHints(pack.hints ?? []),
    ...(pack.stuckAssist !== undefined
      ? { stuckAssist: pack.stuckAssist }
      : {}),
    i18n: seedDefaultLocaleCatalog(pack),
  };

  return definition;
}
