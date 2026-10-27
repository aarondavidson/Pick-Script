/**
 * Puzzle dependency graph — pure DAG/graph from JsonPackDocument
 * (and a simplified mirror from GameDefinition for Author mode).
 * Engine-safe: no React. Used by Studio viz + soft-lock highlights.
 */

import type { GameDefinition } from "./definition";
import type {
  JsonPackDocument,
  JsonPackHotspot,
  JsonPackLink,
} from "./jsonPack";
import type { PackAction } from "./packActions";
import { flagsNeverSet } from "./flagIndex";
import type {
  GameItem,
  GameState,
  Hotspot,
  RoomExit,
  VerbId,
} from "./types";

export type PuzzleNodeKind =
  | "room"
  | "hotspot"
  | "item"
  | "flag"
  | "exit"
  | "hint"
  | "timer"
  | "region";

export type PuzzleEdgeKind =
  | "in_room"
  | "pickup"
  | "pickup_flag"
  | "use_with"
  | "sets_flag"
  | "clears_flag"
  | "requires_flag"
  | "requires_item"
  | "unlocks_exit"
  | "region_flag"
  | "timer_flag"
  | "hint_hotspot"
  | "hint_flag"
  | "combination"
  | "combination_input"
  | "give_item"
  | "exit_connect"
  | "dialogue_set"
  | "dialogue_require"
  | "action_gate";

export interface PuzzleGraphNode {
  id: string;
  kind: PuzzleNodeKind;
  label: string;
  roomId?: string;
  hotspotId?: string;
  /** Soft-lock: flag is read but never set (from diagnose / flagIndex). */
  softLock?: boolean;
}

export interface PuzzleGraphEdge {
  id: string;
  from: string;
  to: string;
  kind: PuzzleEdgeKind;
  label?: string;
}

export interface PuzzleGraphOptions {
  /** Default 220 */
  maxNodes?: number;
  /** Default 480 */
  maxEdges?: number;
  /**
   * Flags that are never set (soft-lock). When omitted, computed via
   * `flagsNeverSet(doc)`.
   */
  softLockFlags?: Iterable<string>;
}

export interface PuzzleGraph {
  nodes: PuzzleGraphNode[];
  edges: PuzzleGraphEdge[];
  truncated: boolean;
  caps: { maxNodes: number; maxEdges: number };
}

const DEFAULT_MAX_NODES = 220;
const DEFAULT_MAX_EDGES = 480;

function roomNodeId(roomId: string): string {
  return `room:${roomId}`;
}
function hotspotNodeId(roomId: string, hotspotId: string): string {
  return `hotspot:${roomId}/${hotspotId}`;
}
function itemNodeId(itemId: string): string {
  return `item:${itemId}`;
}
function flagNodeId(flag: string): string {
  return `flag:${flag}`;
}
function exitNodeId(from: string, to: string): string {
  return `exit:${from}→${to}`;
}
function hintNodeId(hintId: string): string {
  return `hint:${hintId}`;
}
function timerNodeId(roomId: string, timerId: string): string {
  return `timer:${roomId}/${timerId}`;
}
function regionNodeId(roomId: string, regionId: string): string {
  return `region:${roomId}/${regionId}`;
}

function walkActions(
  actions: PackAction[] | undefined,
  visit: (a: PackAction) => void
): void {
  if (!actions?.length) return;
  for (const a of actions) {
    visit(a);
    if (a.op === "if") {
      walkActions(a.then, visit);
      walkActions(a.else, visit);
    }
  }
}

/**
 * Build a capped puzzle dependency graph from a JSON pack document.
 * Prefer pickup / use-with / gated exits / flags / hints / timers / regions.
 */
export function buildPuzzleGraph(
  doc: JsonPackDocument,
  opts: PuzzleGraphOptions = {}
): PuzzleGraph {
  const maxNodes = opts.maxNodes ?? DEFAULT_MAX_NODES;
  const maxEdges = opts.maxEdges ?? DEFAULT_MAX_EDGES;
  const softLocks = new Set(
    opts.softLockFlags
      ? [...opts.softLockFlags]
      : flagsNeverSet(doc)
  );

  const nodes = new Map<string, PuzzleGraphNode>();
  const edges: PuzzleGraphEdge[] = [];
  let truncated = false;
  let edgeSeq = 0;

  const canAddNode = (): boolean => nodes.size < maxNodes;
  const canAddEdge = (): boolean => edges.length < maxEdges;

  const ensureNode = (
    id: string,
    kind: PuzzleNodeKind,
    label: string,
    extra?: { roomId?: string; hotspotId?: string }
  ): boolean => {
    const existing = nodes.get(id);
    if (existing) {
      if (kind === "flag" && softLocks.has(label)) {
        existing.softLock = true;
      }
      return true;
    }
    if (!canAddNode()) {
      truncated = true;
      return false;
    }
    nodes.set(id, {
      id,
      kind,
      label,
      roomId: extra?.roomId,
      hotspotId: extra?.hotspotId,
      softLock: kind === "flag" ? softLocks.has(label) : undefined,
    });
    return true;
  };

  const addEdge = (
    from: string,
    to: string,
    kind: PuzzleEdgeKind,
    label?: string
  ): void => {
    if (!nodes.has(from) || !nodes.has(to)) return;
    if (!canAddEdge()) {
      truncated = true;
      return;
    }
    edgeSeq += 1;
    edges.push({
      id: `e${edgeSeq}:${kind}:${from}→${to}`,
      from,
      to,
      kind,
      label,
    });
  };

  const ensureFlag = (flag: string | undefined): string | null => {
    const f = flag?.trim();
    if (!f) return null;
    if (!ensureNode(flagNodeId(f), "flag", f)) return null;
    return flagNodeId(f);
  };

  const ensureItem = (itemId: string | undefined, name?: string): string | null => {
    const id = itemId?.trim();
    if (!id) return null;
    if (!ensureNode(itemNodeId(id), "item", name || id)) return null;
    return itemNodeId(id);
  };

  // Rooms
  for (const [roomId, room] of Object.entries(doc.rooms ?? {})) {
    if (!ensureNode(roomNodeId(roomId), "room", room.name || roomId, { roomId })) {
      break;
    }
  }

  // Catalog items (may be referenced before pickup)
  for (const [itemId, item] of Object.entries(doc.items ?? {})) {
    ensureItem(itemId, item.name);
  }

  // Initial flags
  for (const flag of Object.keys(doc.initialFlags ?? {})) {
    ensureFlag(flag);
  }

  // Hotspots + nested effects
  for (const [roomId, room] of Object.entries(doc.rooms ?? {})) {
    const rId = roomNodeId(roomId);
    if (!nodes.has(rId)) continue;

    for (const h of room.hotspots ?? []) {
      wireHotspot(doc, roomId, h, rId, {
        ensureNode,
        ensureFlag,
        ensureItem,
        addEdge,
      });
      if (truncated && !canAddNode() && !canAddEdge()) break;
    }

    for (const region of room.regions ?? []) {
      const id = regionNodeId(roomId, region.id);
      if (
        !ensureNode(id, "region", region.id, {
          roomId,
        })
      ) {
        break;
      }
      addEdge(id, rId, "in_room");
      for (const flag of [
        region.setFlag,
        region.onEnterFlag,
        region.onExitFlag,
      ]) {
        const fId = ensureFlag(flag);
        if (fId) addEdge(id, fId, "region_flag", flag);
      }
      walkActions(region.onEnterActions, (a) =>
        wireAction(id, a, { ensureFlag, ensureItem, addEdge })
      );
      walkActions(region.onExitActions, (a) =>
        wireAction(id, a, { ensureFlag, ensureItem, addEdge })
      );
    }

    for (const timer of room.timers ?? []) {
      const id = timerNodeId(roomId, timer.id);
      if (!ensureNode(id, "timer", timer.id, { roomId })) break;
      addEdge(id, rId, "in_room");
      const fId = ensureFlag(timer.setFlag);
      if (fId) addEdge(id, fId, "timer_flag", timer.setFlag);
      walkActions(timer.actions, (a) =>
        wireAction(id, a, { ensureFlag, ensureItem, addEdge })
      );
    }
  }

  // Gated / connecting exits
  for (const link of doc.links ?? []) {
    wireExit(link, { ensureNode, ensureFlag, ensureItem, addEdge, nodes });
    if (truncated && !canAddEdge()) break;
  }

  // Combinations: a+b → result
  for (const [key, combo] of Object.entries(doc.combinations ?? {})) {
    const [a, b] = combo.items;
    const aId = ensureItem(a);
    const bId = ensureItem(b);
    const resultId = ensureItem(combo.result.id, combo.result.name);
    if (aId && resultId) addEdge(aId, resultId, "combination_input", key);
    if (bId && resultId) addEdge(bId, resultId, "combination_input", key);
    if (aId && bId && resultId) {
      // Synthetic combo node skipped — edge label carries key; mark combination
      addEdge(aId, resultId, "combination", `+${b}`);
    }
  }

  // Hints
  for (const hint of doc.hints ?? []) {
    const hId = hintNodeId(hint.id);
    if (!ensureNode(hId, "hint", hint.title || hint.id)) break;
    const until = ensureFlag(hint.untilFlag);
    if (until) addEdge(hId, until, "hint_flag", "until");
    const req = ensureFlag(hint.requireFlag);
    if (req) addEdge(req, hId, "requires_flag");
    if (hint.hotspotId) {
      // Resolve first matching hotspot id across rooms
      for (const [roomId, room] of Object.entries(doc.rooms ?? {})) {
        const hs = (room.hotspots ?? []).find((x) => x.id === hint.hotspotId);
        if (!hs) continue;
        const hsN = hotspotNodeId(roomId, hs.id);
        if (nodes.has(hsN)) addEdge(hId, hsN, "hint_hotspot");
        break;
      }
    }
  }

  // Mark soft-lock flags that appeared only as readers
  for (const flag of softLocks) {
    const n = nodes.get(flagNodeId(flag));
    if (n) n.softLock = true;
  }

  return {
    nodes: [...nodes.values()],
    edges,
    truncated,
    caps: { maxNodes, maxEdges },
  };
}

type WireHelpers = {
  ensureNode: (
    id: string,
    kind: PuzzleNodeKind,
    label: string,
    extra?: { roomId?: string; hotspotId?: string }
  ) => boolean;
  ensureFlag: (flag: string | undefined) => string | null;
  ensureItem: (itemId: string | undefined, name?: string) => string | null;
  addEdge: (
    from: string,
    to: string,
    kind: PuzzleEdgeKind,
    label?: string
  ) => void;
};

function wireHotspot(
  doc: JsonPackDocument,
  roomId: string,
  h: JsonPackHotspot,
  rId: string,
  helpers: WireHelpers
): void {
  const { ensureNode, ensureFlag, ensureItem, addEdge } = helpers;
  const hsId = hotspotNodeId(roomId, h.id);
  if (
    !ensureNode(hsId, "hotspot", h.name || h.id, {
      roomId,
      hotspotId: h.id,
    })
  ) {
    return;
  }
  addEdge(hsId, rId, "in_room");

  if (h.kind === "pickup" && h.itemId) {
    const itemN = ensureItem(h.itemId, h.itemName);
    if (itemN) addEdge(hsId, itemN, "pickup");
    const got = ensureFlag(`got_${h.itemId}`);
    if (got) addEdge(hsId, got, "pickup_flag", `got_${h.itemId}`);
  }

  for (const rule of h.useWith ?? []) {
    const itemN = ensureItem(rule.itemId);
    if (itemN) addEdge(itemN, hsId, "use_with", rule.itemId);
    const setF = ensureFlag(rule.setFlag);
    if (setF) addEdge(hsId, setF, "sets_flag", rule.setFlag);
    const clearF = ensureFlag(rule.clearFlag);
    if (clearF) addEdge(hsId, clearF, "clears_flag", rule.clearFlag);
    const already = ensureFlag(rule.alreadyFlag);
    if (already) addEdge(already, hsId, "requires_flag", "already");
    if (rule.giveItem?.id) {
      const give = ensureItem(rule.giveItem.id, rule.giveItem.name);
      if (give) addEdge(hsId, give, "give_item");
    }
  }

  for (const line of h.dialogue?.lines ?? []) {
    for (const c of line.choices ?? []) {
      const setF = ensureFlag(c.setFlag);
      if (setF) addEdge(hsId, setF, "dialogue_set", c.setFlag);
      const req = ensureFlag(c.requireFlag);
      if (req) addEdge(req, hsId, "dialogue_require", c.requireFlag);
      if (c.giveItemId) {
        const give = ensureItem(c.giveItemId);
        if (give) addEdge(hsId, give, "give_item");
      }
    }
  }

  walkActions(h.actions, (a) =>
    wireAction(hsId, a, { ensureFlag, ensureItem, addEdge })
  );

  const special = h.special;
  if (special) {
    if (special.requireItemId) {
      const itemN = ensureItem(special.requireItemId);
      if (itemN) addEdge(itemN, hsId, "requires_item", special.requireItemId);
    }
    const setF = ensureFlag(special.setFlag);
    if (setF) addEdge(hsId, setF, "sets_flag", special.setFlag);
    const clearF = ensureFlag(special.clearFlag);
    if (clearF) addEdge(hsId, clearF, "clears_flag", special.clearFlag);
    const already = ensureFlag(special.alreadyFlag);
    if (already) addEdge(already, hsId, "requires_flag", "already");
    if (special.giveItemId) {
      const give = ensureItem(special.giveItemId);
      if (give) addEdge(hsId, give, "give_item");
    }
  }

  void doc;
}

function wireAction(
  sourceId: string,
  a: PackAction,
  helpers: Pick<WireHelpers, "ensureFlag" | "ensureItem" | "addEdge">
): void {
  const { ensureFlag, ensureItem, addEdge } = helpers;
  if (a.op === "setFlag") {
    const f = ensureFlag(a.flag);
    if (f) addEdge(sourceId, f, "sets_flag", a.flag);
  } else if (a.op === "clearFlag") {
    const f = ensureFlag(a.flag);
    if (f) addEdge(sourceId, f, "clears_flag", a.flag);
  } else if (a.op === "giveItem" && a.item?.id) {
    const item = ensureItem(a.item.id, a.item.name);
    if (item) addEdge(sourceId, item, "give_item");
  } else if (a.op === "requireItem") {
    const item = ensureItem(a.itemId);
    if (item) addEdge(item, sourceId, "action_gate", a.itemId);
  } else if (a.op === "if") {
    const f = ensureFlag(a.flag);
    if (f) addEdge(f, sourceId, "requires_flag", a.flag);
    if (a.hasItem) {
      const item = ensureItem(a.hasItem);
      if (item) addEdge(item, sourceId, "action_gate", a.hasItem);
    }
  }
}

function wireExit(
  link: JsonPackLink,
  helpers: WireHelpers & { nodes: Map<string, PuzzleGraphNode> }
): void {
  const { ensureNode, ensureFlag, ensureItem, addEdge, nodes } = helpers;
  const fromR = roomNodeId(link.from);
  const toR = roomNodeId(link.to);
  if (!nodes.has(fromR) || !nodes.has(toR)) return;

  const eId = exitNodeId(link.from, link.to);
  const gated = !!(link.requireFlag || link.requireItem);
  const label = gated
    ? `${link.fromLabel || link.to} (gated)`
    : link.fromLabel || `${link.from}→${link.to}`;
  if (
    !ensureNode(eId, "exit", label, {
      roomId: link.from,
    })
  ) {
    return;
  }

  addEdge(fromR, eId, "exit_connect");
  addEdge(eId, toR, "exit_connect");

  if (link.requireFlag) {
    const f = ensureFlag(link.requireFlag);
    if (f) {
      addEdge(f, eId, "unlocks_exit", link.requireFlag);
      addEdge(eId, f, "requires_flag", link.requireFlag);
    }
  }
  if (link.requireItem) {
    const item = ensureItem(link.requireItem);
    if (item) {
      addEdge(item, eId, "requires_item", link.requireItem);
    }
  }
}

/** Group nodes by kind for column / hierarchical layouts. */
export const PUZZLE_NODE_KIND_ORDER: PuzzleNodeKind[] = [
  "room",
  "hotspot",
  "item",
  "flag",
  "exit",
  "region",
  "timer",
  "hint",
];

/** Parse `exit:from→to` node id. */
export function parseExitNodeId(
  id: string
): { from: string; to: string } | null {
  const m = /^exit:([^→]+)→(.+)$/.exec(id);
  if (!m?.[1] || !m[2]) return null;
  return { from: m[1], to: m[2] };
}

export interface GatedExitRef {
  from: string;
  to: string;
  exitNodeId: string;
}

/**
 * Exits gated on a soft-lock (never-set) flag — from unlocks_exit /
 * requires_flag edges.
 */
export function gatedExitsForSoftLockFlag(
  graph: PuzzleGraph,
  flagLabel: string
): GatedExitRef[] {
  const flagId = flagNodeId(flagLabel);
  const out: GatedExitRef[] = [];
  const seen = new Set<string>();
  for (const e of graph.edges) {
    if (
      (e.kind !== "unlocks_exit" && e.kind !== "requires_flag") ||
      (e.from !== flagId && e.to !== flagId)
    ) {
      continue;
    }
    const exitId = e.from === flagId ? e.to : e.from;
    if (!exitId.startsWith("exit:") || seen.has(exitId)) continue;
    const parsed = parseExitNodeId(exitId);
    if (!parsed) continue;
    seen.add(exitId);
    out.push({ ...parsed, exitNodeId: exitId });
  }
  return out;
}

/**
 * Edge ids on the path between a soft-lock flag and its gated exit(s).
 * Used to highlight blocked gate paths in Studio.
 */
export function blockedGatePathEdgeIds(
  graph: PuzzleGraph,
  flagLabel: string
): Set<string> {
  const flagId = flagNodeId(flagLabel);
  const exits = new Set(
    gatedExitsForSoftLockFlag(graph, flagLabel).map((e) => e.exitNodeId)
  );
  const ids = new Set<string>();
  if (exits.size === 0) return ids;
  for (const e of graph.edges) {
    const touchesFlag = e.from === flagId || e.to === flagId;
    const touchesExit = exits.has(e.from) || exits.has(e.to);
    if (
      touchesFlag &&
      touchesExit &&
      (e.kind === "unlocks_exit" ||
        e.kind === "requires_flag" ||
        e.kind === "requires_item")
    ) {
      ids.add(e.id);
    }
    // Also highlight room ↔ exit connectors for those gated exits
    if (
      touchesExit &&
      e.kind === "exit_connect" &&
      (exits.has(e.from) || exits.has(e.to))
    ) {
      ids.add(e.id);
    }
  }
  return ids;
}

/** Minimal state for probing exit gates / interact patches (no React). */
function probeGameState(
  overrides: Partial<GameState> = {}
): GameState {
  return {
    currentLocation: "",
    inventory: [],
    flags: {},
    objectStates: {},
    dialogueState: {},
    gameComplete: false,
    journalEntries: [],
    achievements: [],
    quests: [],
    visitedLocations: [],
    egoId: null,
    actors: {},
    camera: { x: 50, y: 50, followActorId: null },
    activeScripts: [],
    actorInventories: {},
    hintProgress: {},
    ...overrides,
  };
}

/** Pull flag ids mentioned in a function body (TS packs: `state.flags.foo`). */
function flagsInFnSource(fn: unknown): string[] {
  if (typeof fn !== "function") return [];
  try {
    const src = Function.prototype.toString.call(fn);
    const out = new Set<string>();
    for (const re of [
      /\.flags\.([A-Za-z_][\w]*)/g,
      /\.flags\[['"']([^'"]+)['"']/g,
    ]) {
      for (const m of src.matchAll(re)) {
        if (m[1]) out.add(m[1]);
      }
    }
    return [...out];
  } catch {
    return [];
  }
}

function trueFlagsInPatch(
  patch: { flags?: Record<string, boolean> } | null | undefined
): string[] {
  if (!patch?.flags) return [];
  return Object.entries(patch.flags)
    .filter(([, v]) => v === true)
    .map(([k]) => k);
}

function probeExitGate(
  exit: RoomExit,
  candidateFlags: Iterable<string>,
  candidateItems: Iterable<string>
): { flag?: string; item?: string } {
  if (!exit.blocked) return {};
  const blank = probeGameState();
  let blockedWhenEmpty = false;
  try {
    blockedWhenEmpty = !!exit.blocked(blank);
  } catch {
    return {};
  }
  if (!blockedWhenEmpty) return {};

  for (const flag of candidateFlags) {
    try {
      if (!exit.blocked(probeGameState({ flags: { [flag]: true } }))) {
        return { flag };
      }
    } catch {
      /* ignore probe errors */
    }
  }
  for (const itemId of candidateItems) {
    try {
      const item: GameItem = {
        id: itemId,
        name: itemId,
        description: "",
      };
      if (!exit.blocked(probeGameState({ inventory: [item] }))) {
        return { item: itemId };
      }
    } catch {
      /* ignore */
    }
  }
  // TS packs often use state.flags.xyz in the blocked closure source
  for (const flag of flagsInFnSource(exit.blocked)) {
    try {
      if (!exit.blocked(probeGameState({ flags: { [flag]: true } }))) {
        return { flag };
      }
    } catch {
      /* ignore */
    }
  }
  return {};
}

const PROBE_VERBS: VerbId[] = [
  "look",
  "use",
  "talk",
  "pickup",
  "open",
  "push",
  "pull",
  "give",
];

/**
 * Build a capped puzzle graph from a compiled GameDefinition.
 * Mirrors the JSON builder for rooms / hotspots / combinations / exits /
 * hints / regions / timers — uses probes for exit gates and interact setters
 * (TS packs are not JsonPackDocument).
 */
export function buildPuzzleGraphFromGameDefinition(
  def: GameDefinition,
  opts: PuzzleGraphOptions = {}
): PuzzleGraph {
  const maxNodes = opts.maxNodes ?? DEFAULT_MAX_NODES;
  const maxEdges = opts.maxEdges ?? DEFAULT_MAX_EDGES;

  const nodes = new Map<string, PuzzleGraphNode>();
  const edges: PuzzleGraphEdge[] = [];
  let truncated = false;
  let edgeSeq = 0;

  const setters = new Set<string>();
  const readers = new Set<string>();
  const itemIds = new Set<string>();

  const canAddNode = (): boolean => nodes.size < maxNodes;
  const canAddEdge = (): boolean => edges.length < maxEdges;

  const ensureNode = (
    id: string,
    kind: PuzzleNodeKind,
    label: string,
    extra?: { roomId?: string; hotspotId?: string }
  ): boolean => {
    if (nodes.has(id)) return true;
    if (!canAddNode()) {
      truncated = true;
      return false;
    }
    nodes.set(id, {
      id,
      kind,
      label,
      roomId: extra?.roomId,
      hotspotId: extra?.hotspotId,
    });
    return true;
  };

  const addEdge = (
    from: string,
    to: string,
    kind: PuzzleEdgeKind,
    label?: string
  ): void => {
    if (!nodes.has(from) || !nodes.has(to)) return;
    if (!canAddEdge()) {
      truncated = true;
      return;
    }
    edgeSeq += 1;
    edges.push({
      id: `e${edgeSeq}:${kind}:${from}→${to}`,
      from,
      to,
      kind,
      label,
    });
  };

  const ensureFlag = (flag: string | undefined): string | null => {
    const f = flag?.trim();
    if (!f) return null;
    if (!ensureNode(flagNodeId(f), "flag", f)) return null;
    return flagNodeId(f);
  };

  const ensureItem = (
    itemId: string | undefined,
    name?: string
  ): string | null => {
    const id = itemId?.trim();
    if (!id) return null;
    itemIds.add(id);
    if (!ensureNode(itemNodeId(id), "item", name || id)) return null;
    return itemNodeId(id);
  };

  const noteSetter = (flag: string | undefined) => {
    const f = flag?.trim();
    if (f) setters.add(f);
  };
  const noteReader = (flag: string | undefined) => {
    const f = flag?.trim();
    if (f) readers.add(f);
  };

  // Seed flags + combination items
  for (const flag of Object.keys(def.initialFlags ?? {})) {
    ensureFlag(flag);
  }
  for (const [key, combo] of Object.entries(def.combinations ?? {})) {
    const [a, b] = combo.items;
    const aId = ensureItem(a);
    const bId = ensureItem(b);
    const resultId = ensureItem(combo.result.id, combo.result.name);
    if (aId && resultId) addEdge(aId, resultId, "combination_input", key);
    if (bId && resultId) addEdge(bId, resultId, "combination_input", key);
    if (aId && bId && resultId) {
      addEdge(aId, resultId, "combination", `+${b}`);
    }
  }

  // Rooms + hotspots + regions + timers
  for (const [roomId, room] of Object.entries(def.rooms ?? {})) {
    const rId = roomNodeId(roomId);
    if (!ensureNode(rId, "room", room.name || roomId, { roomId })) break;

    for (const h of room.hotspots ?? []) {
      wireDefHotspot(roomId, h, rId, {
        ensureNode,
        ensureFlag,
        ensureItem,
        addEdge,
        noteSetter,
        noteReader,
        itemIds,
      });
      if (truncated && !canAddNode() && !canAddEdge()) break;
    }

    for (const region of room.regions ?? []) {
      const id = regionNodeId(roomId, region.id);
      if (!ensureNode(id, "region", region.id, { roomId })) break;
      addEdge(id, rId, "in_room");
      for (const flag of [
        region.setFlag,
        region.onEnterFlag,
        region.onExitFlag,
      ]) {
        noteSetter(flag);
        const fId = ensureFlag(flag);
        if (fId) addEdge(id, fId, "region_flag", flag);
      }
      walkActions(region.onEnterActions, (a) => {
        if (a.op === "setFlag") noteSetter(a.flag);
        wireAction(id, a, { ensureFlag, ensureItem, addEdge });
      });
      walkActions(region.onExitActions, (a) => {
        if (a.op === "setFlag") noteSetter(a.flag);
        wireAction(id, a, { ensureFlag, ensureItem, addEdge });
      });
    }

    for (const timer of room.timers ?? []) {
      const id = timerNodeId(roomId, timer.id);
      if (!ensureNode(id, "timer", timer.id, { roomId })) break;
      addEdge(id, rId, "in_room");
      noteSetter(timer.setFlag);
      const fId = ensureFlag(timer.setFlag);
      if (fId) addEdge(id, fId, "timer_flag", timer.setFlag);
      walkActions(timer.actions, (a) => {
        if (a.op === "setFlag") noteSetter(a.flag);
        wireAction(id, a, { ensureFlag, ensureItem, addEdge });
      });
    }
  }

  // Candidate flags for exit probes (setters + initial + blocked() source)
  const candidateFlags = new Set<string>([
    ...setters,
    ...Object.keys(def.initialFlags ?? {}),
    ...readers,
  ]);
  for (const room of Object.values(def.rooms ?? {})) {
    for (const exit of room.exits ?? []) {
      for (const flag of flagsInFnSource(exit.blocked)) {
        candidateFlags.add(flag);
      }
    }
  }

  // Exits (probe requireFlag / requireItem)
  for (const [roomId, room] of Object.entries(def.rooms ?? {})) {
    const fromR = roomNodeId(roomId);
    if (!nodes.has(fromR)) continue;
    for (const exit of room.exits ?? []) {
      const toR = roomNodeId(exit.to);
      if (!nodes.has(toR) && !ensureNode(toR, "room", exit.to, { roomId: exit.to })) {
        continue;
      }
      const eId = exitNodeId(roomId, exit.to);
      const gate = probeExitGate(exit, candidateFlags, itemIds);
      const gated = !!(gate.flag || gate.item || exit.blocked);
      const label = gated
        ? `${exit.label || exit.to} (gated)`
        : exit.label || `${roomId}→${exit.to}`;
      if (!ensureNode(eId, "exit", label, { roomId })) continue;
      addEdge(fromR, eId, "exit_connect");
      addEdge(eId, toR, "exit_connect");
      if (gate.flag) {
        noteReader(gate.flag);
        const f = ensureFlag(gate.flag);
        if (f) {
          addEdge(f, eId, "unlocks_exit", gate.flag);
          addEdge(eId, f, "requires_flag", gate.flag);
        }
      }
      if (gate.item) {
        const item = ensureItem(gate.item);
        if (item) addEdge(item, eId, "requires_item", gate.item);
      }
    }
  }

  // Hints
  for (const hint of def.hints ?? []) {
    const hId = hintNodeId(hint.id);
    if (!ensureNode(hId, "hint", hint.title || hint.id)) break;
    for (const flag of [
      ...flagsInFnSource(hint.condition),
      ...flagsInFnSource(hint.completed),
    ]) {
      noteReader(flag);
      const f = ensureFlag(flag);
      if (f) addEdge(hId, f, "hint_flag");
    }
    if (hint.hotspotId) {
      for (const [roomId, room] of Object.entries(def.rooms ?? {})) {
        const hs = (room.hotspots ?? []).find((x) => x.id === hint.hotspotId);
        if (!hs) continue;
        const hsN = hotspotNodeId(roomId, hs.id);
        if (nodes.has(hsN)) addEdge(hId, hsN, "hint_hotspot");
        break;
      }
    }
  }

  const softLocks = new Set(
    opts.softLockFlags
      ? [...opts.softLockFlags]
      : [...readers].filter((f) => !setters.has(f))
  );
  for (const flag of softLocks) {
    const n = nodes.get(flagNodeId(flag));
    if (n) n.softLock = true;
    else if (ensureFlag(flag)) {
      const created = nodes.get(flagNodeId(flag));
      if (created) created.softLock = true;
    }
  }

  return {
    nodes: [...nodes.values()],
    edges,
    truncated,
    caps: { maxNodes, maxEdges },
  };
}

type DefWireHelpers = {
  ensureNode: (
    id: string,
    kind: PuzzleNodeKind,
    label: string,
    extra?: { roomId?: string; hotspotId?: string }
  ) => boolean;
  ensureFlag: (flag: string | undefined) => string | null;
  ensureItem: (itemId: string | undefined, name?: string) => string | null;
  addEdge: (
    from: string,
    to: string,
    kind: PuzzleEdgeKind,
    label?: string
  ) => void;
  noteSetter: (flag: string | undefined) => void;
  noteReader: (flag: string | undefined) => void;
  itemIds: Set<string>;
};

function wireDefHotspot(
  roomId: string,
  h: Hotspot,
  rId: string,
  helpers: DefWireHelpers
): void {
  const {
    ensureNode,
    ensureFlag,
    ensureItem,
    addEdge,
    noteSetter,
    noteReader,
    itemIds,
  } = helpers;
  const hsId = hotspotNodeId(roomId, h.id);
  if (
    !ensureNode(hsId, "hotspot", h.name || h.id, {
      roomId,
      hotspotId: h.id,
    })
  ) {
    return;
  }
  addEdge(hsId, rId, "in_room");

  if (h.item?.id) {
    const itemN = ensureItem(h.item.id, h.item.name);
    if (itemN) addEdge(hsId, itemN, "pickup");
    const got = `got_${h.item.id}`;
    noteSetter(got);
    const gotN = ensureFlag(got);
    if (gotN) addEdge(hsId, gotN, "pickup_flag", got);
  }

  // Probe onInteract for flag setters / inventory grants
  if (typeof h.onInteract === "function") {
    for (const verb of PROBE_VERBS) {
      try {
        const patch = h.onInteract(verb, probeGameState());
        for (const flag of trueFlagsInPatch(patch)) {
          noteSetter(flag);
          const f = ensureFlag(flag);
          if (f) addEdge(hsId, f, "sets_flag", flag);
        }
        for (const it of patch?.inventory ?? []) {
          if (it?.id) {
            const itemN = ensureItem(it.id, it.name);
            if (itemN) addEdge(hsId, itemN, "give_item");
          }
        }
      } catch {
        /* ignore probe errors */
      }
    }
    for (const flag of flagsInFnSource(h.onInteract)) {
      noteReader(flag);
      ensureFlag(flag);
    }
  }

  // use-with: probe known item ids + keys from useWithResponses
  const useKeys = Object.keys(h.useWithResponses ?? {}).filter(
    (k) => k !== "*"
  );
  for (const id of useKeys) itemIds.add(id);
  if (typeof h.onUseWith === "function") {
    const tryIds = [...new Set([...itemIds, ...useKeys])];
    for (const itemId of tryIds) {
      try {
        const patch = h.onUseWith(itemId, probeGameState());
        const itemN = ensureItem(itemId);
        if (itemN) addEdge(itemN, hsId, "use_with", itemId);
        for (const flag of trueFlagsInPatch(patch)) {
          noteSetter(flag);
          const f = ensureFlag(flag);
          if (f) addEdge(hsId, f, "sets_flag", flag);
        }
      } catch {
        /* ignore */
      }
    }
    for (const flag of flagsInFnSource(h.onUseWith)) {
      noteReader(flag);
      ensureFlag(flag);
    }
  }

  // Dialogue choice actions / conditions
  const tree = h.dialogue;
  if (tree?.nodes) {
    for (const node of Object.values(tree.nodes)) {
      for (const choice of node.choices ?? []) {
        if (typeof choice.action === "function") {
          try {
            const patch = choice.action(probeGameState());
            for (const flag of trueFlagsInPatch(patch)) {
              noteSetter(flag);
              const f = ensureFlag(flag);
              if (f) addEdge(hsId, f, "dialogue_set", flag);
            }
            for (const it of patch?.inventory ?? []) {
              if (it?.id) {
                const give = ensureItem(it.id, it.name);
                if (give) addEdge(hsId, give, "give_item");
              }
            }
          } catch {
            /* ignore */
          }
        }
        for (const flag of flagsInFnSource(choice.condition)) {
          noteReader(flag);
          const f = ensureFlag(flag);
          if (f) addEdge(f, hsId, "dialogue_require", flag);
        }
        for (const flag of flagsInFnSource(choice.action)) {
          noteSetter(flag);
          ensureFlag(flag);
        }
      }
    }
  }
}
