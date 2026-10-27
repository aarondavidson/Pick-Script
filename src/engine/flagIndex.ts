/**
 * Index which pack elements set / read flags — for Flag inspector + unlock chains.
 */

import type { JsonPackDocument } from "@/engine/jsonPack";

export type FlagRefKind =
  | "dialogue_set"
  | "dialogue_require"
  | "use_with_set"
  | "use_with_already"
  | "use_with_clear"
  | "pickup_got"
  | "exit_require"
  | "hint_until"
  | "hint_require"
  | "win_flag"
  | "initial"
  | "action";

export interface FlagRef {
  flag: string;
  role: "set" | "read";
  kind: FlagRefKind;
  label: string;
  roomId?: string;
  hotspotId?: string;
  linkKey?: string;
}

export interface FlagIndexEntry {
  flag: string;
  setters: FlagRef[];
  readers: FlagRef[];
}

function add(
  map: Map<string, FlagIndexEntry>,
  flag: string,
  ref: Omit<FlagRef, "flag">
): void {
  const key = flag.trim();
  if (!key) return;
  let entry = map.get(key);
  if (!entry) {
    entry = { flag: key, setters: [], readers: [] };
    map.set(key, entry);
  }
  const full: FlagRef = { flag: key, ...ref };
  if (ref.role === "set") entry.setters.push(full);
  else entry.readers.push(full);
}

/** Build setter/reader index for every flag mentioned in the pack. */
export function buildFlagIndex(doc: JsonPackDocument): FlagIndexEntry[] {
  const map = new Map<string, FlagIndexEntry>();

  for (const [flag, value] of Object.entries(doc.initialFlags ?? {})) {
    // Declared initials count as setters so “= false” doesn’t look like a dead read.
    add(map, flag, {
      role: "set",
      kind: "initial",
      label: `initialFlags.${flag} = ${value}`,
    });
  }

  for (const [roomId, room] of Object.entries(doc.rooms ?? {})) {
    for (const h of room.hotspots ?? []) {
      if (h.kind === "pickup" && h.itemId) {
        add(map, `got_${h.itemId}`, {
          role: "set",
          kind: "pickup_got",
          label: `Pickup “${h.name}” grants got_${h.itemId}`,
          roomId,
          hotspotId: h.id,
        });
      }
      for (const rule of h.useWith ?? []) {
        if (rule.setFlag) {
          add(map, rule.setFlag, {
            role: "set",
            kind: "use_with_set",
            label: `Use-with on “${h.name}” sets ${rule.setFlag}`,
            roomId,
            hotspotId: h.id,
          });
        }
        if (rule.alreadyFlag) {
          add(map, rule.alreadyFlag, {
            role: "read",
            kind: "use_with_already",
            label: `Use-with on “${h.name}” checks ${rule.alreadyFlag}`,
            roomId,
            hotspotId: h.id,
          });
        }
        if (rule.clearFlag) {
          add(map, rule.clearFlag, {
            role: "set",
            kind: "use_with_clear",
            label: `Use-with on “${h.name}” clears ${rule.clearFlag}`,
            roomId,
            hotspotId: h.id,
          });
        }
      }
      for (const line of h.dialogue?.lines ?? []) {
        for (const c of line.choices ?? []) {
          if (c.setFlag) {
            add(map, c.setFlag, {
              role: "set",
              kind: "dialogue_set",
              label: `Talk “${h.name}” / ${line.id}: “${c.text}” sets ${c.setFlag}`,
              roomId,
              hotspotId: h.id,
            });
          }
          if (c.requireFlag) {
            add(map, c.requireFlag, {
              role: "read",
              kind: "dialogue_require",
              label: `Talk “${h.name}” / ${line.id}: choice needs ${c.requireFlag}`,
              roomId,
              hotspotId: h.id,
            });
          }
        }
      }
      for (const action of h.actions ?? []) {
        if (action.op === "setFlag" && action.flag) {
          add(map, String(action.flag), {
            role: "set",
            kind: "action",
            label: `Action on “${h.name}” sets ${action.flag}${
              action.value === false ? " (false)" : ""
            }`,
            roomId,
            hotspotId: h.id,
          });
        }
        if (action.op === "clearFlag" && action.flag) {
          add(map, String(action.flag), {
            role: "set",
            kind: "action",
            label: `Action on “${h.name}” clears ${action.flag}`,
            roomId,
            hotspotId: h.id,
          });
        }
      }
    }
  }

  for (const link of doc.links ?? []) {
    const key = `${link.from}→${link.to}`;
    if (link.requireFlag) {
      add(map, link.requireFlag, {
        role: "read",
        kind: "exit_require",
        label: `Exit ${key} needs flag ${link.requireFlag}`,
        roomId: link.from,
        linkKey: key,
      });
    }
  }

  for (const hint of doc.hints ?? []) {
    if (hint.untilFlag) {
      add(map, hint.untilFlag, {
        role: "read",
        kind: "hint_until",
        label: `Hint “${hint.title}” until ${hint.untilFlag}`,
      });
    }
    if (hint.requireFlag) {
      add(map, hint.requireFlag, {
        role: "read",
        kind: "hint_require",
        label: `Hint “${hint.title}” requires ${hint.requireFlag}`,
      });
    }
  }

  if (doc.winFlag?.trim()) {
    add(map, doc.winFlag, {
      role: "read",
      kind: "win_flag",
      label: `Game ends when ${doc.winFlag.trim()} is set`,
    });
  }

  return [...map.values()].sort((a, b) => a.flag.localeCompare(b.flag));
}

/** Flags that are read (e.g. exit gates) but never set by any authoring surface. */
export function flagsNeverSet(doc: JsonPackDocument): string[] {
  return buildFlagIndex(doc)
    .filter((e) => e.readers.length > 0 && e.setters.length === 0)
    .map((e) => e.flag);
}
