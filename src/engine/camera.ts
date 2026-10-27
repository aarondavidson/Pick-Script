import type {
  ActorInstance,
  CameraEase,
  CameraState,
  Point2D,
  Room,
  RoomSize,
} from "./types";
import { isSafeIdentifierKey } from "./security";

export const DEFAULT_ROOM_SIZE: RoomSize = { width: 100, height: 100 };
export const DEFAULT_CAMERA_ZOOM = 1;
export const MIN_CAMERA_ZOOM = 0.25;
export const MAX_CAMERA_ZOOM = 4;
/** Scripted pan/zoom ease cap — rejects Infinity that would pin camera.ease forever. */
export const MAX_CAMERA_DURATION_MS = 60_000;

/**
 * Duration in (0, MAX]. Non-positive / NaN snaps (0).
 * +Infinity is capped so an ease cannot run forever.
 */
export function clampCameraDurationMs(ms: unknown): number {
  if (typeof ms !== "number" || Number.isNaN(ms) || ms <= 0) return 0;
  if (!Number.isFinite(ms)) return MAX_CAMERA_DURATION_MS;
  return Math.min(MAX_CAMERA_DURATION_MS, ms);
}

export function getRoomSize(room: Room | null | undefined): RoomSize {
  return room?.roomSize ?? DEFAULT_ROOM_SIZE;
}

export function clampZoom(scale: number): number {
  if (!Number.isFinite(scale)) return DEFAULT_CAMERA_ZOOM;
  return Math.min(MAX_CAMERA_ZOOM, Math.max(MIN_CAMERA_ZOOM, scale));
}

export function createInitialCamera(
  ego: ActorInstance | null,
  followActorId: string | null
): CameraState {
  return {
    x: ego?.x ?? 50,
    y: ego?.y ?? 50,
    followActorId,
    zoom: DEFAULT_CAMERA_ZOOM,
  };
}

/**
 * Compute camera focus (room %) following an actor, clamped so the
 * viewport (100×100 of container, adjusted by zoom) stays inside the room.
 */
export function followCamera(
  focus: Point2D,
  roomSize: RoomSize,
  zoom: number = DEFAULT_CAMERA_ZOOM
): Point2D {
  const z = clampZoom(zoom);
  const halfViewX = (100 / roomSize.width) * (50 / z);
  const halfViewY = (100 / roomSize.height) * (50 / z);

  // When the zoomed room still fits the viewport, camera is fixed at center
  if (roomSize.width * z <= 100 && roomSize.height * z <= 100) {
    return { x: 50, y: 50 };
  }

  const minX = halfViewX;
  const maxX = 100 - halfViewX;
  const minY = halfViewY;
  const maxY = 100 - halfViewY;

  return {
    x: Math.min(Math.max(focus.x, minX), maxX),
    y: Math.min(Math.max(focus.y, minY), maxY),
  };
}

/** Linear interpolation. */
export function easeLinear(a: number, b: number, t: number): number {
  const u = Math.min(1, Math.max(0, t));
  return a + (b - a) * u;
}

/** Smoothstep ease-in-out. */
export function easeInOut(a: number, b: number, t: number): number {
  const u = Math.min(1, Math.max(0, t));
  const s = u * u * (3 - 2 * u);
  return a + (b - a) * s;
}

export function easePoint(
  from: Point2D,
  to: Point2D,
  t: number,
  ease: (a: number, b: number, t: number) => number = easeInOut
): Point2D {
  return { x: ease(from.x, to.x, t), y: ease(from.y, to.y, t) };
}

/**
 * Pan camera to room % (clamped). Clears followActorId so scripted pans stick.
 * When durationMs > 0, stores an ease; otherwise snaps immediately.
 */
export function panTo(
  camera: CameraState,
  x: number,
  y: number,
  roomSize: RoomSize,
  durationMs = 0
): CameraState {
  const zoom = clampZoom(camera.zoom ?? DEFAULT_CAMERA_ZOOM);
  const px = Number.isFinite(x) ? x : camera.x;
  const py = Number.isFinite(y) ? y : camera.y;
  const focus = followCamera({ x: px, y: py }, roomSize, zoom);
  const dur = clampCameraDurationMs(durationMs);
  const base: CameraState = {
    ...camera,
    followActorId: null,
    zoom,
    ease: undefined,
  };
  if (!dur) {
    return { ...base, x: focus.x, y: focus.y };
  }
  const ease: CameraEase = {
    fromX: camera.x,
    fromY: camera.y,
    fromZoom: zoom,
    toX: focus.x,
    toY: focus.y,
    toZoom: zoom,
    durationMs: dur,
    elapsedMs: 0,
  };
  return { ...base, ease };
}

/**
 * Zoom camera to scale (clamped). Optionally eases over durationMs.
 * Re-clamps focus so the viewport stays inside the room at the new zoom.
 */
export function zoomTo(
  camera: CameraState,
  scale: number,
  roomSize: RoomSize,
  durationMs = 0
): CameraState {
  const toZoom = clampZoom(scale);
  const focus = followCamera(
    { x: camera.x, y: camera.y },
    roomSize,
    toZoom
  );
  const base: CameraState = {
    ...camera,
    ease: undefined,
  };
  const dur = clampCameraDurationMs(durationMs);
  if (!dur) {
    return { ...base, x: focus.x, y: focus.y, zoom: toZoom };
  }
  const fromZoom = clampZoom(camera.zoom ?? DEFAULT_CAMERA_ZOOM);
  const ease: CameraEase = {
    fromX: camera.x,
    fromY: camera.y,
    fromZoom,
    toX: focus.x,
    toY: focus.y,
    toZoom,
    durationMs: dur,
    elapsedMs: 0,
  };
  return { ...base, ease };
}

/** Set or clear the follow target (does not move focus immediately). */
export function setCameraFollow(
  camera: CameraState,
  actorId: string | null
): CameraState {
  // Reject __proto__ / constructor — actors[id] would return Object.prototype.
  const followActorId =
    actorId == null || actorId === ""
      ? null
      : isSafeIdentifierKey(actorId)
        ? actorId
        : camera.followActorId;
  return {
    ...camera,
    followActorId,
    ease: undefined,
  };
}

/**
 * Advance an in-flight camera ease by dtMs.
 * Returns the same camera reference when nothing changed.
 */
export function stepCameraEase(
  camera: CameraState,
  dtMs: number
): CameraState {
  const ease = camera.ease;
  if (!ease) return camera;
  const elapsed = ease.elapsedMs + Math.max(0, dtMs);
  const t =
    ease.durationMs <= 0 ? 1 : Math.min(1, elapsed / ease.durationMs);
  const x = easeInOut(ease.fromX, ease.toX, t);
  const y = easeInOut(ease.fromY, ease.toY, t);
  const zoom = easeInOut(ease.fromZoom, ease.toZoom, t);
  if (t >= 1) {
    return {
      ...camera,
      x: ease.toX,
      y: ease.toY,
      zoom: ease.toZoom,
      ease: undefined,
    };
  }
  return {
    ...camera,
    x,
    y,
    zoom,
    ease: { ...ease, elapsedMs: elapsed },
  };
}

/**
 * CSS translate (%) for the room layer so `camera` focus sits at
 * viewport center. Room layer is sized to roomSize (% of container).
 */
export function cameraToTranslate(
  camera: CameraState,
  roomSize: RoomSize
): { x: number; y: number; zoom: number } {
  const zoom = clampZoom(camera.zoom ?? DEFAULT_CAMERA_ZOOM);
  const cx = Number.isFinite(camera.x) ? camera.x : 50;
  const cy = Number.isFinite(camera.y) ? camera.y : 50;
  if (roomSize.width <= 100 && roomSize.height <= 100 && zoom <= 1) {
    return { x: 0, y: 0, zoom };
  }
  // Focus at camera.x% of room → want at 50% of container
  // room left edge in container % = 50 - camera.x * (roomWidth/100)
  const tx = 50 - cx * (roomSize.width / 100);
  const ty = 50 - cy * (roomSize.height / 100);
  return { x: tx, y: ty, zoom };
}

export function updateFollowCamera(
  camera: CameraState,
  actors: Record<string, ActorInstance> | undefined,
  roomSize: RoomSize
): CameraState {
  // Scripted ease owns the camera until it finishes
  if (camera.ease) return camera;

  const zoom = clampZoom(camera.zoom ?? DEFAULT_CAMERA_ZOOM);
  const followId = camera.followActorId;
  const followed =
    followId && isSafeIdentifierKey(followId) ? actors?.[followId] : undefined;
  if (
    !followed ||
    !Number.isFinite(followed.x) ||
    !Number.isFinite(followed.y)
  ) {
    const focus = followCamera({ x: camera.x, y: camera.y }, roomSize, zoom);
    if (
      focus.x === camera.x &&
      focus.y === camera.y &&
      (camera.zoom ?? DEFAULT_CAMERA_ZOOM) === zoom
    ) {
      return camera;
    }
    return { ...camera, ...focus, zoom };
  }
  const focus = followCamera(
    { x: followed.x, y: followed.y },
    roomSize,
    zoom
  );
  return { ...camera, ...focus, zoom };
}
