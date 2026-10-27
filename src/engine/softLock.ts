/**
 * Soft-lock / stuck analysis for JSON packs.
 * Approximate legal moves from start (pickups, use-with, talk setFlag,
 * combines, ungated exits) via BFS.
 */

import type { JsonPackDocument, JsonPackHotspot } from "./jsonPack";

export interface SoftLockState {
  roomId: string;
  flags: string[];
  inventory: string[];
}

export interface SoftLockIssue {
  id: string;
  severity: "error" | "warning" | "info";
  title: string;
  detail: string;
  fix: string;
  roomId?: string;
  flag?: string;
  itemId?: string;
}

export interface SoftLockReport {
  reachableRooms: string[];
  unreachableRooms: string[];
  obtainableItems: string[];
  settableFlags: string[];
  issues: SoftLockIssue[];
  /** Max explored world-states (cap) */
  explored: number;
}

function keyOf(s: SoftLockState): string {
  return `${s.roomId}|${[...s.flags].sort().join(",")}|${[...s.inventory].sort().join(",")}`;
}

function hasFlag(flags: string[], f: string): boolean {
  return flags.includes(f);
}

function withFlag(flags: string[], f: string): string[] {
  return hasFlag(flags, f) ? flags : [...flags, f];
}

function withoutItem(inv: string[], id: string): string[] {
  return inv.filter((i) => i !== id);
}

function withItem(inv: string[], id: string): string[] {
  return inv.includes(id) ? inv : [...inv, id];
}

function exitOpen(
  link: NonNullable<JsonPackDocument["links"]>[number],
  flags: string[],
  inventory: string[]
): boolean {
  if (link.requireFlag && !hasFlag(flags, link.requireFlag)) return false;
  if (link.requireItem && !inventory.includes(link.requireItem)) return false;
  return true;
}

function applyPickup(
  h: JsonPackHotspot,
  flags: string[],
  inventory: string[]
): SoftLockState | null {
  if (h.kind !== "pickup" || !h.itemId) return null;
  const flag = `got_${h.itemId}`;
  if (hasFlag(flags, flag) || inventory.includes(h.itemId)) return null;
  return {
    roomId: "",
    flags: withFlag(flags, flag),
    inventory: withItem(inventory, h.itemId),
  };
}

function applyUseWith(
  h: JsonPackHotspot,
  flags: string[],
  inventory: string[]
): SoftLockState[] {
  const out: SoftLockState[] = [];
  for (const rule of h.useWith ?? []) {
    if (!inventory.includes(rule.itemId)) continue;
    if (rule.alreadyFlag && hasFlag(flags, rule.alreadyFlag)) continue;
    let nextFlags = [...flags];
    let nextInv = [...inventory];
    if (rule.setFlag) nextFlags = withFlag(nextFlags, rule.setFlag);
    if (rule.clearFlag) {
      nextFlags = nextFlags.filter((f) => f !== rule.clearFlag);
    }
    if (rule.alreadyFlag) nextFlags = withFlag(nextFlags, rule.alreadyFlag);
    if (rule.consumeItem) nextInv = withoutItem(nextInv, rule.itemId);
    if (rule.giveItem?.id) nextInv = withItem(nextInv, rule.giveItem.id);
    out.push({ roomId: "", flags: nextFlags, inventory: nextInv });
  }
  return out;
}

function applyDialogueFlags(
  h: JsonPackHotspot,
  flags: string[]
): SoftLockState[] {
  if (h.kind !== "character") return [];
  const out: SoftLockState[] = [];
  for (const line of h.dialogue?.lines ?? []) {
    for (const c of line.choices ?? []) {
      if (c.requireFlag && !hasFlag(flags, c.requireFlag)) continue;
      if (!c.setFlag) continue;
      if (hasFlag(flags, c.setFlag)) continue;
      out.push({
        roomId: "",
        flags: withFlag(flags, c.setFlag),
        inventory: [],
      });
    }
  }
  return out;
}

function applyCombines(
  doc: JsonPackDocument,
  inventory: string[]
): SoftLockState[] {
  const out: SoftLockState[] = [];
  for (const combo of Object.values(doc.combinations ?? {})) {
    const [a, b] = combo.items ?? [];
    if (!a || !b) continue;
    if (!inventory.includes(a) || !inventory.includes(b)) continue;
    if (inventory.includes(combo.result.id)) continue;
    out.push({
      roomId: "",
      flags: [],
      inventory: withItem(withoutItem(withoutItem(inventory, a), b), combo.result.id),
    });
  }
  return out;
}

/**
 * BFS reachable (room, flags, inventory) configurations from start.
 */
export function analyzeSoftLock(doc: JsonPackDocument): SoftLockReport {
  const issues: SoftLockIssue[] = [];
  const roomIds = Object.keys(doc.rooms ?? {});
  const start = doc.startRoom;
  if (!doc.rooms[start]) {
    return {
      reachableRooms: [],
      unreachableRooms: roomIds,
      obtainableItems: [],
      settableFlags: [],
      issues: [
        {
          id: "softlock:no-start",
          severity: "error",
          title: "No start room",
          detail: `startRoom "${start}" missing`,
          fix: "Set a valid start room in Pack meta.",
        },
      ],
      explored: 0,
    };
  }

  const initialFlags = Object.entries(doc.initialFlags ?? {})
    .filter(([, v]) => v)
    .map(([k]) => k);

  const startState: SoftLockState = {
    roomId: start,
    flags: initialFlags,
    inventory: [],
  };

  const seen = new Set<string>([keyOf(startState)]);
  const queue: SoftLockState[] = [startState];
  const reachableRooms = new Set<string>([start]);
  const obtainableItems = new Set<string>();
  const settableFlags = new Set<string>(initialFlags);
  const CAP = 4000;

  while (queue.length && seen.size < CAP) {
    const cur = queue.shift()!;
    for (const f of cur.flags) settableFlags.add(f);
    for (const i of cur.inventory) obtainableItems.add(i);

    const room = doc.rooms[cur.roomId];
    if (!room) continue;

    // Local interactions
    for (const h of room.hotspots ?? []) {
      const pickup = applyPickup(h, cur.flags, cur.inventory);
      if (pickup) {
        const next: SoftLockState = {
          roomId: cur.roomId,
          flags: pickup.flags,
          inventory: pickup.inventory,
        };
        const k = keyOf(next);
        if (!seen.has(k)) {
          seen.add(k);
          queue.push(next);
        }
      }
      for (const patch of applyUseWith(h, cur.flags, cur.inventory)) {
        const next: SoftLockState = {
          roomId: cur.roomId,
          flags: patch.flags,
          inventory: patch.inventory,
        };
        const k = keyOf(next);
        if (!seen.has(k)) {
          seen.add(k);
          queue.push(next);
        }
      }
      for (const patch of applyDialogueFlags(h, cur.flags)) {
        const next: SoftLockState = {
          roomId: cur.roomId,
          flags: patch.flags,
          inventory: cur.inventory,
        };
        const k = keyOf(next);
        if (!seen.has(k)) {
          seen.add(k);
          queue.push(next);
        }
      }
    }

    for (const patch of applyCombines(doc, cur.inventory)) {
      const next: SoftLockState = {
        roomId: cur.roomId,
        flags: cur.flags,
        inventory: patch.inventory,
      };
      const k = keyOf(next);
      if (!seen.has(k)) {
        seen.add(k);
        queue.push(next);
      }
    }

    // Exits (both directions as stored links — packs store one directed link;
    // compile adds reverse. Approximate: allow to→from always if rooms exist.)
    for (const link of doc.links ?? []) {
      const tryTravel = (from: string, to: string, gated: typeof link) => {
        if (cur.roomId !== from) return;
        if (!doc.rooms[to]) return;
        if (!exitOpen(gated, cur.flags, cur.inventory)) return;
        const next: SoftLockState = {
          roomId: to,
          flags: cur.flags,
          inventory: cur.inventory,
        };
        reachableRooms.add(to);
        const k = keyOf(next);
        if (!seen.has(k)) {
          seen.add(k);
          queue.push(next);
        }
      };
      tryTravel(link.from, link.to, link);
      // Reverse without forward gates (typical linkRooms back)
      tryTravel(link.to, link.from, {
        ...link,
        from: link.to,
        to: link.from,
        requireFlag: undefined,
        requireItem: undefined,
      });
    }
  }

  const unreachableRooms = roomIds.filter((id) => !reachableRooms.has(id));
  for (const id of unreachableRooms) {
    issues.push({
      id: `softlock:room:${id}`,
      severity: "warning",
      title: `Unreachable room — ${doc.rooms[id]?.name || id}`,
      detail: `No legal path from start reaches "${id}" (gates, missing links, or missing keys/flags).`,
      fix: "Add an exit, or ensure the unlock flag/item can be obtained earlier.",
      roomId: id,
    });
  }

  for (const link of doc.links ?? []) {
    if (link.requireFlag && !settableFlags.has(link.requireFlag)) {
      issues.push({
        id: `softlock:exit-flag:${link.from}→${link.to}`,
        severity: "warning",
        title: `Exit gate unreachable — ${link.requireFlag}`,
        detail: `Link ${link.from}→${link.to} needs "${link.requireFlag}", but play from start never sets it.`,
        fix: "Ensure the player can set that flag before needing the exit (Unlock chain wizard).",
        roomId: link.from,
        flag: link.requireFlag,
      });
    }
    if (link.requireItem && !obtainableItems.has(link.requireItem)) {
      issues.push({
        id: `softlock:exit-item:${link.from}→${link.to}`,
        severity: "warning",
        title: `Exit needs unobtainable item — ${link.requireItem}`,
        detail: `Link ${link.from}→${link.to} requires "${link.requireItem}", which is never granted in a legal playthrough.`,
        fix: "Add a pickup / combine / give that yields this item.",
        roomId: link.from,
        itemId: link.requireItem,
      });
    }
  }

  // Catalog items never obtainable
  for (const itemId of Object.keys(doc.items ?? {})) {
    const grantedSomewhere =
      obtainableItems.has(itemId) ||
      Object.values(doc.rooms).some((r) =>
        (r.hotspots ?? []).some(
          (h) =>
            (h.kind === "pickup" && h.itemId === itemId) ||
            (h.useWith ?? []).some((u) => u.giveItem?.id === itemId)
        )
      ) ||
      Object.values(doc.combinations ?? {}).some((c) => c.result?.id === itemId);
    if (!grantedSomewhere) {
      issues.push({
        id: `softlock:item-orphan:${itemId}`,
        severity: "info",
        title: `Item never granted — ${itemId}`,
        detail: `Catalog item "${itemId}" has no pickup, give, or combine result.`,
        fix: "Attach it to a pickup hotspot or combine result, or remove it.",
        itemId,
      });
    } else if (!obtainableItems.has(itemId)) {
      issues.push({
        id: `softlock:item-blocked:${itemId}`,
        severity: "warning",
        title: `Item granted but unreachable — ${itemId}`,
        detail: `Something can grant "${itemId}", but not along any path from start.`,
        fix: "Check room reachability and puzzle order.",
        itemId,
      });
    }
  }

  if (seen.size >= CAP) {
    issues.push({
      id: "softlock:cap",
      severity: "info",
      title: "Soft-lock search capped",
      detail: `Explored ${CAP} states — large packs may need a deeper pass.`,
      fix: "Simplify flag fan-out or run pack-doctor again after trimming.",
    });
  }

  return {
    reachableRooms: [...reachableRooms],
    unreachableRooms,
    obtainableItems: [...obtainableItems],
    settableFlags: [...settableFlags],
    issues,
    explored: seen.size,
  };
}
