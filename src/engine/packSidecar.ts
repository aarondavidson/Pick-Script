/**
 * TS pack sidecar — hotspot geometry overlays stored per game id.
 * Lets authors tweak any TS pack's hotspots in play/author mode
 * without a full JSON pack round-trip.
 */

import type { GameDefinition } from "./definition";
import type { Hotspot, Room } from "./types";
import { isStrictPlayEnabled } from "./deployLock";
import {
  isSafeIdentifierKey,
  safeJsonParse,
  STORAGE_LIMITS,
} from "./security";

export const PACK_SIDECAR_STORAGE_PREFIX = "pack_sidecar_v1_";

export interface SidecarHotspotOverlay {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  name?: string;
}

export interface PackSidecar {
  gameId: string;
  updatedAt: number;
  rooms: Record<string, { hotspots: SidecarHotspotOverlay[] }>;
}

function clampPct(n: unknown, fallback = 0): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.max(0, Math.min(100, v));
}

function sanitizeOverlay(raw: unknown): SidecarHotspotOverlay | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (!isSafeIdentifierKey(o.id)) return null;
  const width = clampPct(o.width, 1);
  const height = clampPct(o.height, 1);
  if (width < 0.5 || height < 0.5) return null;
  return {
    id: o.id,
    x: clampPct(o.x),
    y: clampPct(o.y),
    width,
    height,
    ...(typeof o.name === "string"
      ? { name: o.name.slice(0, 120) }
      : {}),
  };
}

function sanitizeSidecar(raw: unknown, expectGameId: string): PackSidecar | null {
  if (!raw || typeof raw !== "object") return null;
  const parsed = raw as PackSidecar;
  if (parsed.gameId !== expectGameId || !isSafeIdentifierKey(parsed.gameId)) {
    return null;
  }
  const rooms: PackSidecar["rooms"] = {};
  for (const [roomId, room] of Object.entries(parsed.rooms ?? {})) {
    if (!isSafeIdentifierKey(roomId)) continue;
    const hotspots = (room?.hotspots ?? [])
      .map(sanitizeOverlay)
      .filter((h): h is SidecarHotspotOverlay => !!h)
      .slice(0, STORAGE_LIMITS.maxSidecarHotspotsPerRoom);
    rooms[roomId] = { hotspots };
  }
  return {
    gameId: expectGameId,
    updatedAt:
      typeof parsed.updatedAt === "number" ? parsed.updatedAt : Date.now(),
    rooms,
  };
}

export function packSidecarStorageKey(gameId: string): string {
  return `${PACK_SIDECAR_STORAGE_PREFIX}${gameId}`;
}

export function loadPackSidecar(gameId: string): PackSidecar | null {
  if (!isSafeIdentifierKey(gameId)) return null;
  try {
    const raw = localStorage.getItem(packSidecarStorageKey(gameId));
    if (!raw) return null;
    if (raw.length > STORAGE_LIMITS.maxSidecarJsonChars) return null;
    return sanitizeSidecar(safeJsonParse(raw), gameId);
  } catch {
    return null;
  }
}

export function savePackSidecar(sidecar: PackSidecar): void {
  if (!isSafeIdentifierKey(sidecar.gameId)) return;
  const clean = sanitizeSidecar(sidecar, sidecar.gameId);
  if (!clean) return;
  try {
    const payload = JSON.stringify({ ...clean, updatedAt: Date.now() });
    if (payload.length > STORAGE_LIMITS.maxSidecarJsonChars) return;
    localStorage.setItem(packSidecarStorageKey(sidecar.gameId), payload);
  } catch {
    /* ignore quota */
  }
}

export function clearPackSidecar(gameId: string): void {
  if (!isSafeIdentifierKey(gameId)) return;
  try {
    localStorage.removeItem(packSidecarStorageKey(gameId));
  } catch {
    /* ignore */
  }
}

/** Upsert one room's hotspot overlays into the sidecar. */
export function upsertSidecarRoom(
  gameId: string,
  roomId: string,
  hotspots: SidecarHotspotOverlay[]
): PackSidecar {
  const prev = loadPackSidecar(gameId) ?? {
    gameId,
    updatedAt: Date.now(),
    rooms: {},
  };
  if (!isSafeIdentifierKey(roomId)) return prev;
  const next: PackSidecar = {
    ...prev,
    updatedAt: Date.now(),
    rooms: {
      ...prev.rooms,
      [roomId]: {
        hotspots: hotspots
          .map(sanitizeOverlay)
          .filter((h): h is SidecarHotspotOverlay => !!h)
          .slice(0, STORAGE_LIMITS.maxSidecarHotspotsPerRoom),
      },
    },
  };
  savePackSidecar(next);
  return next;
}

function applyOverlay(
  hotspot: Hotspot,
  overlay: SidecarHotspotOverlay | undefined
): Hotspot {
  if (!overlay) return hotspot;
  return {
    ...hotspot,
    x: overlay.x,
    y: overlay.y,
    width: overlay.width,
    height: overlay.height,
    ...(overlay.name ? { name: overlay.name } : {}),
  };
}

/** Merge sidecar geometry into a room's hotspot list. */
export function applySidecarToRoom(
  room: Room,
  sidecar: PackSidecar | null
): Room {
  const overlays = sidecar?.rooms[room.id]?.hotspots;
  if (!overlays?.length) return room;
  const byId = new Map(overlays.map((o) => [o.id, o]));
  return {
    ...room,
    hotspots: room.hotspots.map((h) => applyOverlay(h, byId.get(h.id))),
  };
}

/** Clone definition with sidecar overlays applied to all rooms. */
export function applySidecarToDefinition(
  definition: GameDefinition,
  sidecar?: PackSidecar | null
): GameDefinition {
  // Deploy lock: ignore localStorage geometry overlays on public builds.
  // Explicit `sidecar` arg still applies (tests / author tooling).
  if (isStrictPlayEnabled() && sidecar == null) return definition;

  const data = sidecar ?? loadPackSidecar(definition.id);
  if (!data) return definition;
  const rooms: Record<string, Room> = {};
  for (const [id, room] of Object.entries(definition.rooms)) {
    rooms[id] = applySidecarToRoom(room, data);
  }
  return { ...definition, rooms };
}

/** Build overlays from current room hotspots (author export → sidecar). */
export function hotspotsToSidecarOverlays(
  hotspots: Hotspot[]
): SidecarHotspotOverlay[] {
  return hotspots.map((h) => ({
    id: h.id,
    x: h.x,
    y: h.y,
    width: h.width,
    height: h.height,
    name: h.name,
  }));
}
