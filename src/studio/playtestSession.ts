/**
 * Playtest session timeline — room / inventory / flag / message events.
 */

import type { GameState } from "@/engine/types";

export type PlaytestEventKind =
  | "start"
  | "room"
  | "flag"
  | "inventory_add"
  | "inventory_remove"
  | "message"
  | "note";

export interface PlaytestEvent {
  t: number;
  kind: PlaytestEventKind;
  detail: string;
  roomId?: string;
  flag?: string;
  itemId?: string;
}

export interface PlaytestSessionSnapshot {
  packId: string;
  title: string;
  startedAt: string;
  events: PlaytestEvent[];
  final?: {
    roomId: string;
    flags: string[];
    inventory: string[];
  };
}

/** Ordered unique rooms + flag milestones from a playtest timeline. */
export interface WalkthroughOutline {
  /** First-visit room order (unique). */
  roomPath: string[];
  /** Flags that became true, in first-gain order. */
  flagsGained: string[];
  /** Items picked up, in first-add order. */
  inventoryGained: string[];
  /** Interleaved room visits + key flag milestones for a spoiler outline. */
  milestones: Array<{
    t: number;
    kind: "room" | "flag";
    id: string;
  }>;
}

export function createPlaytestSession(
  packId: string,
  title: string
): PlaytestSessionSnapshot {
  const startedAt = new Date().toISOString();
  return {
    packId,
    title,
    startedAt,
    events: [
      {
        t: 0,
        kind: "start",
        detail: `Session started — ${title}`,
      },
    ],
  };
}

/** Diff two game states into timeline events (pure). */
export function diffPlaytestStates(
  prev: GameState | null,
  next: GameState,
  elapsedMs: number
): PlaytestEvent[] {
  const events: PlaytestEvent[] = [];
  if (!prev) {
    events.push({
      t: elapsedMs,
      kind: "room",
      detail: `Start in ${next.currentLocation}`,
      roomId: next.currentLocation,
    });
    return events;
  }

  if (prev.currentLocation !== next.currentLocation) {
    events.push({
      t: elapsedMs,
      kind: "room",
      detail: `${prev.currentLocation} → ${next.currentLocation}`,
      roomId: next.currentLocation,
    });
  }

  const prevFlags = prev.flags ?? {};
  const nextFlags = next.flags ?? {};
  const flagKeys = new Set([
    ...Object.keys(prevFlags),
    ...Object.keys(nextFlags),
  ]);
  for (const key of flagKeys) {
    if (!!prevFlags[key] !== !!nextFlags[key]) {
      events.push({
        t: elapsedMs,
        kind: "flag",
        detail: `${key} = ${nextFlags[key] ? "true" : "false"}`,
        flag: key,
        roomId: next.currentLocation,
      });
    }
  }

  const prevIds = new Set(prev.inventory.map((i) => i.id));
  const nextIds = new Set(next.inventory.map((i) => i.id));
  for (const id of nextIds) {
    if (!prevIds.has(id)) {
      const name = next.inventory.find((i) => i.id === id)?.name || id;
      events.push({
        t: elapsedMs,
        kind: "inventory_add",
        detail: `+ ${name}`,
        itemId: id,
        roomId: next.currentLocation,
      });
    }
  }
  for (const id of prevIds) {
    if (!nextIds.has(id)) {
      const name = prev.inventory.find((i) => i.id === id)?.name || id;
      events.push({
        t: elapsedMs,
        kind: "inventory_remove",
        detail: `− ${name}`,
        itemId: id,
        roomId: next.currentLocation,
      });
    }
  }

  return events;
}

export function finalizePlaytestSession(
  session: PlaytestSessionSnapshot,
  state: GameState
): PlaytestSessionSnapshot {
  return {
    ...session,
    final: {
      roomId: state.currentLocation,
      flags: Object.keys(state.flags ?? {})
        .filter((k) => state.flags[k])
        .sort(),
      inventory: state.inventory.map((i) => i.id),
    },
  };
}

/**
 * Build a simple walkthrough outline: ordered unique rooms + flag milestones.
 */
export function buildWalkthroughOutline(
  session: PlaytestSessionSnapshot
): WalkthroughOutline {
  const roomPath: string[] = [];
  const seenRooms = new Set<string>();
  const flagsGained: string[] = [];
  const seenFlags = new Set<string>();
  const inventoryGained: string[] = [];
  const seenItems = new Set<string>();
  const milestones: WalkthroughOutline["milestones"] = [];

  for (const e of session.events) {
    if (e.kind === "room" && e.roomId && !seenRooms.has(e.roomId)) {
      seenRooms.add(e.roomId);
      roomPath.push(e.roomId);
      milestones.push({ t: e.t, kind: "room", id: e.roomId });
    }
    if (
      e.kind === "flag" &&
      e.flag &&
      /\btrue\b/i.test(e.detail) &&
      !seenFlags.has(e.flag)
    ) {
      seenFlags.add(e.flag);
      flagsGained.push(e.flag);
      milestones.push({ t: e.t, kind: "flag", id: e.flag });
    }
    if (e.kind === "inventory_add" && e.itemId && !seenItems.has(e.itemId)) {
      seenItems.add(e.itemId);
      inventoryGained.push(e.itemId);
    }
  }

  // Prefer finalized inventory/flags when present (covers start-state items).
  if (session.final) {
    for (const id of session.final.inventory) {
      if (!seenItems.has(id)) {
        seenItems.add(id);
        inventoryGained.push(id);
      }
    }
    for (const flag of session.final.flags) {
      if (!seenFlags.has(flag)) {
        seenFlags.add(flag);
        flagsGained.push(flag);
      }
    }
  }

  return { roomPath, flagsGained, inventoryGained, milestones };
}

/**
 * Player-facing spoiler note: room path + key flag beats (no full event dump).
 */
export function formatWalkthroughNote(
  session: PlaytestSessionSnapshot
): string {
  const outline = buildWalkthroughOutline(session);
  const lines: string[] = [];
  lines.push(`# Walkthrough — ${session.title}`);
  lines.push("");
  lines.push("_Spoiler note from a playtest session. Room path and key flags only._");
  lines.push("");
  lines.push("## Room path");
  if (outline.roomPath.length) {
    outline.roomPath.forEach((id, i) => {
      lines.push(`${i + 1}. \`${id}\``);
    });
  } else {
    lines.push("(no rooms recorded)");
  }
  lines.push("");
  lines.push("## Key flags");
  if (outline.flagsGained.length) {
    for (const f of outline.flagsGained) {
      lines.push(`- \`${f}\``);
    }
  } else {
    lines.push("(none)");
  }
  lines.push("");
  lines.push("## Inventory gained");
  if (outline.inventoryGained.length) {
    for (const id of outline.inventoryGained) {
      lines.push(`- \`${id}\``);
    }
  } else {
    lines.push("(none)");
  }
  lines.push("");
  lines.push("## Outline");
  if (outline.milestones.length) {
    for (const m of outline.milestones) {
      const sec = (m.t / 1000).toFixed(1);
      if (m.kind === "room") {
        lines.push(`- ${sec}s · enter \`${m.id}\``);
      } else {
        lines.push(`- ${sec}s · flag \`${m.id}\``);
      }
    }
  } else {
    lines.push("(empty)");
  }
  lines.push("");
  return lines.join("\n");
}

/** Markdown dump for sharing stuck-state reports. */
export function formatPlaytestSessionMarkdown(
  session: PlaytestSessionSnapshot
): string {
  const outline = buildWalkthroughOutline(session);
  const lines: string[] = [];
  lines.push(`# Playtest session — ${session.title}`);
  lines.push(`Pack: \`${session.packId}\``);
  lines.push(`Started: ${session.startedAt}`);
  lines.push("");
  lines.push("## Room path");
  lines.push(
    outline.roomPath.length
      ? outline.roomPath.map((id) => `\`${id}\``).join(" → ")
      : "(none)"
  );
  lines.push("");
  lines.push("## Flags gained");
  lines.push(
    outline.flagsGained.length
      ? outline.flagsGained.map((f) => `\`${f}\``).join(", ")
      : "(none)"
  );
  lines.push("");
  lines.push("## Inventory");
  lines.push(
    outline.inventoryGained.length
      ? outline.inventoryGained.map((i) => `\`${i}\``).join(", ")
      : "(empty)"
  );
  lines.push("");
  lines.push("## Walkthrough outline");
  if (outline.milestones.length) {
    for (const m of outline.milestones) {
      const sec = (m.t / 1000).toFixed(1);
      lines.push(
        `- ${sec}s · ${m.kind === "room" ? "room" : "flag"} \`${m.id}\``
      );
    }
  } else {
    lines.push("(empty)");
  }
  lines.push("");
  lines.push("| t (s) | event | detail |");
  lines.push("| --- | --- | --- |");
  for (const e of session.events) {
    const sec = (e.t / 1000).toFixed(1);
    lines.push(
      `| ${sec} | ${e.kind} | ${e.detail.replace(/\|/g, "\\|")} |`
    );
  }
  if (session.final) {
    lines.push("");
    lines.push("## Final state");
    lines.push(`- Room: \`${session.final.roomId}\``);
    lines.push(
      `- Flags: ${
        session.final.flags.length
          ? session.final.flags.map((f) => `\`${f}\``).join(", ")
          : "(none)"
      }`
    );
    lines.push(
      `- Inventory: ${
        session.final.inventory.length
          ? session.final.inventory.map((i) => `\`${i}\``).join(", ")
          : "(empty)"
      }`
    );
  }
  lines.push("");
  return lines.join("\n");
}

export function formatPlaytestSessionJson(
  session: PlaytestSessionSnapshot
): string {
  const walkthrough = buildWalkthroughOutline(session);
  return `${JSON.stringify({ ...session, walkthrough }, null, 2)}\n`;
}
