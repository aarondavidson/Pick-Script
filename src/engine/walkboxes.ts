import type { GameState, Hotspot, Point2D, Room, Walkbox } from "./types";
import { isSafeIdentifierKey } from "./security";

/** Caps untrusted JSON polygons (point-in-polygon runs on the walk path). */
export const MAX_WALKBOXES_PER_ROOM = 64;
export const MAX_POLYGON_POINTS = 64;
/** Floor layers are capped to a small practical range. */
export const MAX_WALK_FLOOR = 8;
const WALKBOX_COORD_MIN = -1000;
const WALKBOX_COORD_MAX = 1000;
const ADJACENCY_PAD = 0.5; // percent tolerance

function clampCoord(n: number): number {
  return Math.min(WALKBOX_COORD_MAX, Math.max(WALKBOX_COORD_MIN, n));
}

function finiteNum(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

/** Clamp floor index to 0…MAX_WALK_FLOOR. */
export function clampWalkFloor(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(MAX_WALK_FLOOR, Math.max(0, Math.floor(n)));
}

/**
 * Current walk floor for pathfinding.
 * Prefers `state.vars.walkFloor`, then `room.activeFloor`, else 0.
 */
export function getWalkFloor(
  state: Pick<GameState, "vars">,
  room?: Pick<Room, "activeFloor"> | null
): number {
  const fromVar = state.vars?.walkFloor;
  if (typeof fromVar === "number" && Number.isFinite(fromVar)) {
    return clampWalkFloor(fromVar);
  }
  if (room?.activeFloor != null && Number.isFinite(room.activeFloor)) {
    return clampWalkFloor(room.activeFloor);
  }
  return 0;
}

/** Boxes on a given floor (default floor 0 when `floor` omitted on a box). */
export function walkboxesForFloor(
  boxes: Walkbox[] | undefined,
  floor: number
): Walkbox[] | undefined {
  if (!boxes?.length) return boxes;
  const f = clampWalkFloor(floor);
  return boxes.filter((b) => (b.floor ?? 0) === f);
}

/**
 * Keep a polygon only when every kept vertex is a finite coordinate.
 * Arrays longer than MAX_POLYGON_POINTS are truncated (not scanned further).
 */
export function sanitizePolygonPoints(raw: unknown): Point2D[] | undefined {
  if (!Array.isArray(raw) || raw.length < 3) return undefined;
  const out: Point2D[] = [];
  const limit = Math.min(raw.length, MAX_POLYGON_POINTS);
  for (let i = 0; i < limit; i++) {
    const p = raw[i] as { x?: unknown; y?: unknown } | null;
    if (!p || !finiteNum(p.x) || !finiteNum(p.y)) return undefined;
    out.push({ x: clampCoord(p.x), y: clampCoord(p.y) });
  }
  return out.length >= 3 ? out : undefined;
}

function sanitizeLinks(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw.slice(0, MAX_WALKBOXES_PER_ROOM)) {
    if (typeof item !== "string") continue;
    const id = item.trim().slice(0, 64);
    if (!id || !isSafeIdentifierKey(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out.length ? out : undefined;
}

function sanitizeFloorTransition(
  raw: unknown
): { toFloor: number } | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const toFloor = (raw as { toFloor?: unknown }).toFloor;
  if (!finiteNum(toFloor)) return undefined;
  return { toFloor: clampWalkFloor(toFloor) };
}

/** Drop non-finite boxes and cap list length. Undefined when nothing usable. */
export function sanitizeWalkboxList(raw: unknown): Walkbox[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const out: Walkbox[] = [];
  for (const item of raw.slice(0, MAX_WALKBOXES_PER_ROOM)) {
    if (!item || typeof item !== "object") continue;
    const w = item as Walkbox & { points?: unknown; links?: unknown };
    if (
      !finiteNum(w.x) ||
      !finiteNum(w.y) ||
      !finiteNum(w.width) ||
      !finiteNum(w.height)
    ) {
      continue;
    }
    const points = sanitizePolygonPoints(w.points);
    const scale = finiteNum(w.scale)
      ? Math.min(8, Math.max(0.05, w.scale))
      : undefined;
    const floor = finiteNum(w.floor) ? clampWalkFloor(w.floor) : undefined;
    const links = sanitizeLinks(w.links);
    const floorTransition = sanitizeFloorTransition(w.floorTransition);
    const rawId =
      typeof w.id === "string" && w.id.trim() ? w.id.trim().slice(0, 64) : "floor";
    const id = isSafeIdentifierKey(rawId) ? rawId : "floor";
    out.push({
      id,
      x: clampCoord(w.x),
      y: clampCoord(w.y),
      width: clampCoord(Math.max(0, w.width)),
      height: clampCoord(Math.max(0, w.height)),
      ...(scale != null ? { scale } : {}),
      ...(points ? { points } : {}),
      ...(floor != null ? { floor } : {}),
      ...(links ? { links } : {}),
      ...(floorTransition ? { floorTransition } : {}),
    });
  }
  return out.length ? out : undefined;
}

/** Ray-cast point-in-polygon (room %). Boundary counts as inside. */
export function pointInPolygon(x: number, y: number, points: Point2D[]): boolean {
  if (points.length < 3) return false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[j];
    const b = points[i];
    const cross =
      (b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x);
    if (Math.abs(cross) < 1e-9) {
      const minX = Math.min(a.x, b.x) - 1e-9;
      const maxX = Math.max(a.x, b.x) + 1e-9;
      const minY = Math.min(a.y, b.y) - 1e-9;
      const maxY = Math.max(a.y, b.y) + 1e-9;
      if (x >= minX && x <= maxX && y >= minY && y <= maxY) return true;
    }
  }
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i].x;
    const yi = points[i].y;
    const xj = points[j].x;
    const yj = points[j].y;
    const intersect =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi + 0.0) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInAabb(x: number, y: number, box: Walkbox): boolean {
  return (
    x >= box.x &&
    x <= box.x + box.width &&
    y >= box.y &&
    y <= box.y + box.height
  );
}

export function pointInWalkbox(x: number, y: number, box: Walkbox): boolean {
  if (box.points && box.points.length >= 3) {
    return pointInPolygon(x, y, box.points);
  }
  return pointInAabb(x, y, box);
}

export function isWalkable(
  x: number,
  y: number,
  boxes: Walkbox[] | undefined
): boolean {
  if (!boxes?.length) return true;
  return boxes.some((b) => pointInWalkbox(x, y, b));
}

/** Clamp a point to the nearest position inside any walkbox. */
export function clampToWalkable(
  x: number,
  y: number,
  boxes: Walkbox[] | undefined
): Point2D {
  if (!boxes?.length || isWalkable(x, y, boxes)) {
    return { x, y };
  }

  let best: Point2D = boxCenter(boxes[0]);
  let bestDist = Infinity;

  for (const box of boxes) {
    const cx = Math.min(Math.max(x, box.x), box.x + box.width);
    const cy = Math.min(Math.max(y, box.y), box.y + box.height);
    let candidate = { x: cx, y: cy };
    if (box.points && box.points.length >= 3 && !pointInWalkbox(cx, cy, box)) {
      candidate = boxCenter(box);
    }
    const dx = candidate.x - x;
    const dy = candidate.y - y;
    const d = dx * dx + dy * dy;
    if (d < bestDist) {
      bestDist = d;
      best = candidate;
    }
  }
  return best;
}

function boxesAdjacent(a: Walkbox, b: Walkbox): boolean {
  const pad = ADJACENCY_PAD;
  const ax2 = a.x + a.width;
  const ay2 = a.y + a.height;
  const bx2 = b.x + b.width;
  const by2 = b.y + b.height;
  const overlapX = a.x - pad <= bx2 && ax2 + pad >= b.x;
  const overlapY = a.y - pad <= by2 && ay2 + pad >= b.y;
  if (!overlapX || !overlapY) return false;
  const touchX = Math.abs(ax2 - b.x) <= pad || Math.abs(bx2 - a.x) <= pad;
  const touchY = Math.abs(ay2 - b.y) <= pad || Math.abs(by2 - a.y) <= pad;
  const overlapAreaX = Math.min(ax2, bx2) - Math.max(a.x, b.x);
  const overlapAreaY = Math.min(ay2, by2) - Math.max(a.y, b.y);
  return (
    (touchX && overlapAreaY > -pad) ||
    (touchY && overlapAreaX > -pad) ||
    (overlapAreaX > 0 && overlapAreaY > 0)
  );
}

/**
 * Midpoint of the shared AABB edge (or overlap rect center) between two boxes.
 * Used as a portal waypoint so paths hug box boundaries instead of cutting corners.
 */
export function portalMidpoint(a: Walkbox, b: Walkbox): Point2D {
  const pad = ADJACENCY_PAD;
  const ax2 = a.x + a.width;
  const ay2 = a.y + a.height;
  const bx2 = b.x + b.width;
  const by2 = b.y + b.height;

  const touchRight = Math.abs(ax2 - b.x) <= pad;
  const touchLeft = Math.abs(bx2 - a.x) <= pad;
  if (touchRight || touchLeft) {
    const edgeX = touchRight ? (ax2 + b.x) / 2 : (bx2 + a.x) / 2;
    const y1 = Math.max(a.y, b.y);
    const y2 = Math.min(ay2, by2);
    return { x: edgeX, y: (y1 + y2) / 2 };
  }

  const touchBottom = Math.abs(ay2 - b.y) <= pad;
  const touchTop = Math.abs(by2 - a.y) <= pad;
  if (touchBottom || touchTop) {
    const edgeY = touchBottom ? (ay2 + b.y) / 2 : (by2 + a.y) / 2;
    const x1 = Math.max(a.x, b.x);
    const x2 = Math.min(ax2, bx2);
    return { x: (x1 + x2) / 2, y: edgeY };
  }

  const ox1 = Math.max(a.x, b.x);
  const ox2 = Math.min(ax2, bx2);
  const oy1 = Math.max(a.y, b.y);
  const oy2 = Math.min(ay2, by2);
  if (ox2 > ox1 && oy2 > oy1) {
    return { x: (ox1 + ox2) / 2, y: (oy1 + oy2) / 2 };
  }

  const ca = boxCenter(a);
  const cb = boxCenter(b);
  return { x: (ca.x + cb.x) / 2, y: (ca.y + cb.y) / 2 };
}

function boxCenter(box: Walkbox): Point2D {
  if (box.points && box.points.length >= 3) {
    let sx = 0;
    let sy = 0;
    for (const p of box.points) {
      sx += p.x;
      sy += p.y;
    }
    return { x: sx / box.points.length, y: sy / box.points.length };
  }
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

function findBoxIndex(x: number, y: number, boxes: Walkbox[]): number {
  return boxes.findIndex((b) => pointInWalkbox(x, y, b));
}

/** Build undirected adjacency: explicit links override AABB for that box. */
function buildAdjacency(boxes: Walkbox[]): number[][] {
  const adj: number[][] = boxes.map(() => []);
  const idToIndex = new Map<string, number>();
  for (let i = 0; i < boxes.length; i++) {
    idToIndex.set(boxes[i].id, i);
  }

  const addEdge = (i: number, j: number) => {
    if (i === j) return;
    if (!adj[i].includes(j)) adj[i].push(j);
    if (!adj[j].includes(i)) adj[j].push(i);
  };

  const hasLinks = boxes.map((b) => !!(b.links && b.links.length));

  for (let i = 0; i < boxes.length; i++) {
    if (hasLinks[i]) {
      for (const linkId of boxes[i].links!) {
        const j = idToIndex.get(linkId);
        if (j != null) addEdge(i, j);
      }
    }
  }

  for (let i = 0; i < boxes.length; i++) {
    if (hasLinks[i]) continue;
    for (let j = i + 1; j < boxes.length; j++) {
      if (hasLinks[j]) continue;
      if (boxesAdjacent(boxes[i], boxes[j])) {
        addEdge(i, j);
      }
    }
  }

  return adj;
}

export interface FindWalkPathOptions {
  /** Only pathfind on boxes with this floor (default: all boxes / no filter). */
  floor?: number;
}

const dist = (a: Point2D, b: Point2D) => Math.hypot(a.x - b.x, a.y - b.y);

/** True when the straight segment a→b stays inside walkable boxes. */
function segmentWalkable(a: Point2D, b: Point2D, boxes: Walkbox[]): boolean {
  // Sample every ~0.25% of the room so thin gaps between boxes are caught
  const steps = Math.max(1, Math.ceil(dist(a, b) / 0.25));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (!isWalkable(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, boxes)) {
      return false;
    }
  }
  return true;
}

/**
 * Drop waypoints the ego can skip in a straight line (string pulling).
 * Waypoints inside a `floorTransition` box are kept so the walk tick still
 * sees them when they are reached.
 */
function smoothPath(from: Point2D, points: Point2D[], boxes: Walkbox[]): Point2D[] {
  const keep = (p: Point2D) =>
    boxes.some((b) => b.floorTransition && pointInWalkbox(p.x, p.y, b));
  const out: Point2D[] = [];
  let anchor = from;
  for (let i = 0; i < points.length - 1; i++) {
    if (keep(points[i]) || !segmentWalkable(anchor, points[i + 1], boxes)) {
      out.push(points[i]);
      anchor = points[i];
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

/**
 * Path through walkbox portals (SCUMM BOXM-lite).
 * Picks the shortest route by walking distance, then straightens it where the
 * line of sight is clear. Returns waypoints from start to end (including end,
 * excluding start). When the target can't be reached, walks to the closest
 * reachable point instead. When `opts.floor` is set, only boxes on that floor
 * are used.
 */
export function findWalkPath(
  from: Point2D,
  to: Point2D,
  boxes: Walkbox[] | undefined,
  opts?: FindWalkPathOptions
): Point2D[] {
  const scoped =
    opts?.floor != null ? walkboxesForFloor(boxes, opts.floor) : boxes;
  let target = clampToWalkable(to.x, to.y, scoped);
  if (!scoped?.length) {
    return [target];
  }

  const start = clampToWalkable(from.x, from.y, scoped);
  const startIdx = findBoxIndex(start.x, start.y, scoped);
  let endIdx = findBoxIndex(target.x, target.y, scoped);

  if (startIdx === -1 || endIdx === -1) {
    return [target];
  }

  if (startIdx === endIdx) {
    return [target];
  }

  // Dijkstra over boxes; each box remembers the portal point it was entered at
  const adj = buildAdjacency(scoped);
  const cost = new Array<number>(scoped.length).fill(Infinity);
  const entry: Point2D[] = scoped.map(() => start);
  const prev = new Array<number>(scoped.length).fill(-1);
  const done = new Array<boolean>(scoped.length).fill(false);
  cost[startIdx] = 0;
  for (;;) {
    let cur = -1;
    for (let i = 0; i < scoped.length; i++) {
      if (!done[i] && cost[i] < Infinity && (cur === -1 || cost[i] < cost[cur])) {
        cur = i;
      }
    }
    if (cur === -1 || cur === endIdx) break;
    done[cur] = true;
    for (const n of adj[cur]) {
      if (done[n]) continue;
      const portal = portalMidpoint(scoped[cur], scoped[n]);
      const c = cost[cur] + dist(entry[cur], portal);
      if (c < cost[n]) {
        cost[n] = c;
        entry[n] = portal;
        prev[n] = cur;
      }
    }
  }

  if (cost[endIdx] === Infinity) {
    // Unreachable: head for the reachable point closest to the target
    // rather than walking straight through blocked space.
    let best = startIdx;
    let bestPoint = start;
    let bestDist = Infinity;
    for (let i = 0; i < scoped.length; i++) {
      if (cost[i] === Infinity) continue;
      const p = clampToWalkable(to.x, to.y, [scoped[i]]);
      const d = dist(p, to);
      if (d < bestDist) {
        bestDist = d;
        best = i;
        bestPoint = p;
      }
    }
    endIdx = best;
    target = bestPoint;
    if (endIdx === startIdx) return [target];
  }

  const chain: number[] = [];
  for (let at = endIdx; at !== -1; at = prev[at]) {
    chain.push(at);
  }
  chain.reverse();

  const waypoints: Point2D[] = [];
  for (let i = 1; i < chain.length; i++) {
    waypoints.push(portalMidpoint(scoped[chain[i - 1]], scoped[chain[i]]));
  }
  waypoints.push(target);
  return smoothPath(start, waypoints, scoped);
}

/**
 * If the ego is inside a walkbox with `floorTransition`, return a vars patch
 * that sets `walkFloor`. Used when a waypoint is reached.
 */
export function floorTransitionPatchAt(
  x: number,
  y: number,
  boxes: Walkbox[] | undefined,
  state: Pick<GameState, "vars">
): { vars: Record<string, number | string> } | null {
  if (!boxes?.length) return null;
  const box = boxes.find(
    (b) => b.floorTransition && pointInWalkbox(x, y, b)
  );
  if (!box?.floorTransition) return null;
  const toFloor = clampWalkFloor(box.floorTransition.toFloor);
  const current = getWalkFloor(state, null);
  if (current === toFloor) return null;
  return { vars: { ...(state.vars ?? {}), walkFloor: toFloor } };
}

/** Approach point for a hotspot (bottom-center, clamped to walkable). */
export function hotspotApproachPoint(
  hotspot: Hotspot,
  room: Room,
  floor?: number
): Point2D {
  const boxes =
    floor != null ? walkboxesForFloor(room.walkboxes, floor) : room.walkboxes;
  const raw = {
    x: hotspot.x + hotspot.width / 2,
    y: hotspot.y + hotspot.height * 0.9,
  };
  if (hotspot.approach) {
    return clampToWalkable(hotspot.approach.x, hotspot.approach.y, boxes);
  }
  return clampToWalkable(raw.x, raw.y, boxes);
}

export function roomHasWalkboxes(room: Room | null | undefined): boolean {
  return !!room?.walkboxes?.length;
}

/**
 * Depth scale at a room point.
 * Uses containing walkbox.scale, else nearest box, else 1.
 * When multiple boxes exist with scales, also lerps by Y across the set.
 */
export function depthScaleAt(
  x: number,
  y: number,
  boxes: Walkbox[] | undefined
): number {
  if (!boxes?.length) return 1;

  const containing = boxes.find((b) => pointInWalkbox(x, y, b));
  if (containing?.scale != null) return containing.scale;

  let nearest = boxes[0];
  let best = Infinity;
  for (const box of boxes) {
    const cx = Math.min(Math.max(x, box.x), box.x + box.width);
    const cy = Math.min(Math.max(y, box.y), box.y + box.height);
    const d = (cx - x) * (cx - x) + (cy - y) * (cy - y);
    if (d < best) {
      best = d;
      nearest = box;
    }
  }
  if (nearest.scale != null) return nearest.scale;

  const scaled = boxes.filter((b) => b.scale != null);
  if (scaled.length < 2) return scaled[0]?.scale ?? 1;

  const sorted = [...scaled].sort(
    (a, b) => a.y + a.height / 2 - (b.y + b.height / 2)
  );
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const y0 = first.y + first.height / 2;
  const y1 = last.y + last.height / 2;
  if (y1 <= y0) return first.scale ?? 1;
  const t = Math.min(1, Math.max(0, (y - y0) / (y1 - y0)));
  const s0 = first.scale ?? 1;
  const s1 = last.scale ?? 1;
  return s0 + (s1 - s0) * t;
}

/** Derive AABB from polygon points (for compile helpers). */
export function aabbFromPoints(points: Point2D[]): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return {
    x: minX,
    y: minY,
    width: Math.max(0, maxX - minX),
    height: Math.max(0, maxY - minY),
  };
}
