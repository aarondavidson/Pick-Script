/**
 * Pack doctor — structured readiness report for missing art, dead exits,
 * silent hotspots, and incomplete puzzle wiring.
 * Shared by Studio UI and `npm run pack-doctor`.
 */

import type { JsonPackDocument, JsonPackHotspot } from "./jsonPack";
import {
  collectKnownItemIds,
  lintDeadItemRefs,
  lintSilentHotspots,
  lintTinyHotspots,
} from "./packLint";
import { validateJsonPack } from "./jsonPack";
import { analyzeSoftLock } from "./softLock";
import { flagsNeverSet } from "./flagIndex";
import { isBitmapCostume } from "./actorArt";

export type PackDoctorCategory =
  | "art"
  | "interaction"
  | "exit"
  | "item"
  | "dialogue"
  | "meta"
  | "softlock"
  | "feel";

export type PackDoctorSeverity = "error" | "warning" | "info";

export interface PackDoctorFinding {
  id: string;
  severity: PackDoctorSeverity;
  category: PackDoctorCategory;
  /** Short label for UI lists */
  title: string;
  /** What is wrong */
  detail: string;
  /** What to do next */
  fix: string;
  roomId?: string;
  hotspotId?: string;
  itemId?: string;
  linkKey?: string;
}

export interface PackDoctorReport {
  packId: string;
  title: string;
  ok: boolean;
  findings: PackDoctorFinding[];
  summary: {
    errors: number;
    warnings: number;
    info: number;
    missingRoomArt: number;
    missingItemIcons: number;
    deadExits: number;
    silentHotspots: number;
    unreachableRooms: number;
    flagsNeverSet: number;
  };
}

/** True when room/item art is empty or a known placeholder. */
export function isMissingOrPlaceholderArt(image: string | undefined): boolean {
  const img = image?.trim() ?? "";
  if (!img) return true;
  if (img.startsWith("data:image/svg")) return true;
  if (/No([+\s%20]*)room([+\s%20]*)image/i.test(img)) return true;
  if (/MISSING[_\s-]*ART/i.test(img)) return true;
  // 1×1 PNG placeholder used by the engine compile path
  if (
    img.includes(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
    )
  ) {
    return true;
  }
  return false;
}

/** Visible SVG stand-in so authors see exactly which room/item lacks art. */
export function missingArtPlaceholderDataUrl(label: string): string {
  const safe = label
    .replace(/[<>&'"]/g, "")
    .slice(0, 48)
    .trim() || "Untitled";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
  <defs>
    <pattern id="g" width="48" height="48" patternUnits="userSpaceOnUse">
      <path d="M48 0H0V48" fill="none" stroke="#3a3a42" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="1920" height="1080" fill="#1a1a1e"/>
  <rect width="1920" height="1080" fill="url(#g)"/>
  <rect x="120" y="360" width="1680" height="360" fill="#2a1f18" stroke="#c45c26" stroke-width="8"/>
  <text x="960" y="480" text-anchor="middle" fill="#f0c674" font-family="monospace" font-size="72" font-weight="700">MISSING ART</text>
  <text x="960" y="580" text-anchor="middle" fill="#e8e0d0" font-family="monospace" font-size="48">${escapeXml(safe)}</text>
  <text x="960" y="660" text-anchor="middle" fill="#9a9080" font-family="monospace" font-size="28">Upload room image · or Pixels → Send to pack</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function hotspotWired(h: JsonPackHotspot): boolean {
  if (h.lookText?.trim()) return true;
  if (h.useText?.trim()) return true;
  if ((h.actions?.length ?? 0) > 0) return true;
  if ((h.useWith?.length ?? 0) > 0) return true;
  if (h.kind === "pickup" && h.itemId) return true;
  if (h.kind === "character" && (h.dialogue?.lines?.length ?? 0) > 0) {
    return true;
  }
  return false;
}

/** Interactive but no SFX / haptic / juice channel (feel contract). */
function hotspotNeedsFeel(h: JsonPackHotspot): boolean {
  // Pure look-only flavor text is fine without juice
  const hasVerbAction =
    !!(h.useText?.trim() ||
      (h.actions?.length ?? 0) > 0 ||
      (h.useWith?.length ?? 0) > 0 ||
      (h.kind === "pickup" && h.itemId) ||
      h.kind === "interact" ||
      h.kind === "use-with-target");
  if (!hasVerbAction) return false;
  if (h.interactSound?.trim() || h.useWithSound?.trim()) return false;
  if (h.interactHaptic || h.useWithHaptic) return false;
  if (h.interactJuice || h.useWithJuice) return false;
  const acts = h.actions ?? [];
  if (
    acts.some(
      (a) => a.op === "sound" || a.op === "haptic" || a.op === "juice"
    )
  ) {
    return false;
  }
  return true;
}

/**
 * Diagnose a pack draft. Combines validateJsonPack errors with art / exit /
 * interaction readiness that authors often miss.
 */
export function diagnosePack(doc: JsonPackDocument): PackDoctorReport {
  const findings: PackDoctorFinding[] = [];
  const validation = validateJsonPack(doc);

  for (const msg of validation.errors) {
    findings.push({
      id: `err:${msg}`,
      severity: "error",
      category: categorizeMessage(msg),
      title: "Validation error",
      detail: msg,
      fix: "Fix this before Publish / playtest.",
      ...parseRefs(msg),
    });
  }

  for (const [roomId, room] of Object.entries(doc.rooms ?? {})) {
    if (isMissingOrPlaceholderArt(room.image)) {
      findings.push({
        id: `art:room:${roomId}`,
        severity: "warning",
        category: "art",
        title: `Room art missing — ${room.name || roomId}`,
        detail: `Room "${roomId}" has no real background image. Players will see a blank/placeholder scene.`,
        fix: "Pack → Rooms → upload image (1920×1080), or Pixels → Send to pack.",
        roomId,
      });
    }

    const hotspots = room.hotspots ?? [];
    if (hotspots.length === 0 && Object.keys(doc.rooms).length > 0) {
      // Only flag if room is linked or is start — empty decorative rooms OK later
      const isStart = roomId === doc.startRoom;
      const linked = (doc.links ?? []).some(
        (l) => l.from === roomId || l.to === roomId
      );
      if (isStart || linked) {
        findings.push({
          id: `interact:empty:${roomId}`,
          severity: isStart ? "warning" : "info",
          category: "interaction",
          title: `No hotspots in ${room.name || roomId}`,
          detail: `Room "${roomId}" is reachable but has nothing to click.`,
          fix: "Draw a hotspot on the stage, then run the Intent Wizard.",
          roomId,
        });
      }
    }

    for (const h of hotspots) {
      if (!hotspotWired(h)) {
        findings.push({
          id: `interact:silent:${roomId}/${h.id}`,
          severity: "warning",
          category: "interaction",
          title: `Dead hotspot — ${h.name || h.id}`,
          detail: `"${roomId}/${h.id}" has no Look/Use/dialogue/actions — interaction will do nothing.`,
          fix: "Select it → Intent Wizard, or add Look text / dialogue.",
          roomId,
          hotspotId: h.id,
        });
      } else if (hotspotNeedsFeel(h)) {
        findings.push({
          id: `feel:dry:${roomId}/${h.id}`,
          severity: "info",
          category: "feel",
          title: `Flat interaction — ${h.name || h.id}`,
          detail: `"${roomId}/${h.id}" has no SFX, haptic, or juice — taps feel dead.`,
          fix: "Add interactSound / interactHaptic / interactJuice, or a juice/haptic/sound action.",
          roomId,
          hotspotId: h.id,
        });
      }
      if (h.kind === "use-with-target" && !(h.useWith?.length)) {
        findings.push({
          id: `interact:usewith:${roomId}/${h.id}`,
          severity: "warning",
          category: "interaction",
          title: `Use-with target not wired — ${h.name || h.id}`,
          detail: `"${roomId}/${h.id}" expects an inventory item but has no useWith rules.`,
          fix: "Polish → Puzzles, or Intent Wizard → Use item on this.",
          roomId,
          hotspotId: h.id,
        });
      }
      if (h.kind === "character" && !(h.dialogue?.lines?.length)) {
        findings.push({
          id: `dialogue:empty:${roomId}/${h.id}`,
          severity: "warning",
          category: "dialogue",
          title: `Character has no dialogue — ${h.name || h.id}`,
          detail: `Talk on "${roomId}/${h.id}" will do nothing until you add lines.`,
          fix: "Pack → Dialogue → Add starter line (or open the graph).",
          roomId,
          hotspotId: h.id,
        });
      }
      if (h.kind === "character" && h.dialogue?.lines?.length) {
        for (const line of h.dialogue.lines) {
          for (const c of line.choices ?? []) {
            const next = c.nextId?.trim();
            if (
              next &&
              next !== "END" &&
              !h.dialogue.lines.some((l) => l.id === next)
            ) {
              findings.push({
                id: `dialogue:dead:${roomId}/${h.id}/${line.id}/${next}`,
                severity: "error",
                category: "dialogue",
                title: `Broken dialogue jump — ${next}`,
                detail: `Choice on "${line.id}" jumps to missing line "${next}".`,
                fix: "Dialogue graph → point nextId at an existing line or END.",
                roomId,
                hotspotId: h.id,
              });
            }
          }
        }
      }
    }
  }

  const knownItems = collectKnownItemIds(doc);
  for (const [itemId, item] of Object.entries(doc.items ?? {})) {
    if (isMissingOrPlaceholderArt(item?.icon)) {
      findings.push({
        id: `art:item:${itemId}`,
        severity: "info",
        category: "art",
        title: `Item icon missing — ${item?.name || itemId}`,
        detail: `Inventory item "${itemId}" has no icon — a neutral placeholder will show.`,
        fix: "Pixels → Inventory item → Send to pack, or Pack → Items → upload icon.",
        itemId,
      });
    }
  }

  // Feel / authoring completeness
  const roomCount = Object.keys(doc.rooms ?? {}).length;
  if (roomCount > 0 && !(doc.quests?.length)) {
    findings.push({
      id: "quest:missing",
      severity: "info",
      category: "meta",
      title: "No quests defined",
      detail:
        "Players won’t see an Objective bar or journal goals until you add a quest.",
      fix: "Pack → Quests & achievements → add a quest with objectiveFlags.",
    });
  }
  if (roomCount > 0 && !doc.winFlag?.trim()) {
    findings.push({
      id: "win:missing",
      severity: "info",
      category: "meta",
      title: "No ending",
      detail: "The game never shows the win screen until you pick a win flag.",
      fix: "Pack → Quests & achievements → Game ends when flag.",
    });
  }

  for (const [roomId, room] of Object.entries(doc.rooms ?? {})) {
    const boxes = room.walkboxes ?? [];
    if (
      boxes.length > 0 &&
      boxes.every((w) => w.scale == null || w.scale === 1)
    ) {
      findings.push({
        id: `walkbox:flat:${roomId}`,
        severity: "info",
        category: "meta",
        title: `Flat walkboxes — ${room.name || roomId}`,
        detail: `All walkboxes in "${roomId}" use default scale — actors won’t foreshorten with depth.`,
        fix: "Pack stage → Walkboxes → depth scale slider or Near/far pair.",
        roomId,
      });
    }
    for (const h of room.hotspots ?? []) {
      if (h.kind !== "character") continue;
      const actorId = (h.actorId || h.id).trim();
      const fromPack = doc.actors?.[actorId];
      const sheetHasBitmap = (sheet: unknown): boolean => {
        if (typeof sheet === "string") return isBitmapCostume(sheet);
        if (!sheet || typeof sheet !== "object") return false;
        return Object.values(sheet as Record<string, unknown>).some(
          (u) => typeof u === "string" && isBitmapCostume(u)
        );
      };
      const hasCostume =
        isBitmapCostume(h.sprite) ||
        isBitmapCostume(fromPack?.sprite) ||
        Object.values(fromPack?.costumes ?? {}).some(sheetHasBitmap) ||
        Object.values(fromPack?.animations ?? {}).some(sheetHasBitmap);
      if (!hasCostume) {
        findings.push({
          id: `costume:missing:${roomId}/${h.id}`,
          severity: "info",
          category: "art",
          title: `Character uses CSS stand-in — ${h.name || h.id}`,
          detail: `"${actorId}" has no bitmap sprite/costume — stage will show a colored silhouette.`,
          fix: "Pixels → Character costume → Send to pack, or Pack → Actors & costumes.",
          roomId,
          hotspotId: h.id,
        });
      }
    }
  }

  const playerSprite = doc.actors?.player?.sprite;
  if (roomCount > 1 && !isBitmapCostume(playerSprite)) {
    findings.push({
      id: "costume:missing:player",
      severity: "info",
      category: "art",
      title: "Player has no bitmap costume",
      detail:
        "Ego uses the CSS stand-in. Bitmap costumes read much better with walkbox depth.",
      fix: "Pixels → Character costume → send to actor “player”.",
    });
  }

  for (const link of doc.links ?? []) {
    const key = `${link.from}→${link.to}`;
    if (!doc.rooms[link.from]) {
      findings.push({
        id: `exit:from:${key}`,
        severity: "error",
        category: "exit",
        title: `Dead exit — from missing room`,
        detail: `Link ${key} starts in unknown room "${link.from}".`,
        fix: "Delete the link or restore the room id.",
        linkKey: key,
        roomId: link.from,
      });
    }
    if (!doc.rooms[link.to]) {
      findings.push({
        id: `exit:to:${key}`,
        severity: "error",
        category: "exit",
        title: `Dead exit — destination missing`,
        detail: `Link ${key} points at unknown room "${link.to}". Players cannot travel there.`,
        fix: "Create room \"" + link.to + "\" or retarget the link.",
        linkKey: key,
        roomId: link.to,
      });
    }
    if (link.requireItem?.trim() && !knownItems.has(link.requireItem.trim())) {
      findings.push({
        id: `exit:item:${key}`,
        severity: "warning",
        category: "exit",
        title: `Exit needs unknown item — ${link.requireItem}`,
        detail: `Link ${key} requireItem "${link.requireItem}" is not in the catalog — exit stays blocked forever.`,
        fix: "Add the item (pickup / Items catalog) or clear requireItem.",
        linkKey: key,
        itemId: link.requireItem.trim(),
        roomId: link.from,
      });
    }
    if (
      (link.requireFlag || link.requireItem) &&
      !link.blockedMessage?.trim()
    ) {
      findings.push({
        id: `exit:msg:${key}`,
        severity: "info",
        category: "exit",
        title: `Gated exit has no blocked message`,
        detail: `Link ${key} is locked but has no blockedMessage — players get a generic failure.`,
        fix: "Room links → add a blocked message (why can’t they leave?).",
        linkKey: key,
        roomId: link.from,
      });
    }
  }

  // Surface packLint strings that aren't already covered
  const lintExtra = [
    ...lintSilentHotspots(doc),
    ...lintDeadItemRefs(doc),
    ...lintTinyHotspots(doc),
  ];
  for (const msg of lintExtra) {
    const id = `lint:${msg}`;
    if (findings.some((f) => f.detail === msg || f.id === id)) continue;
    // Skip duplicates already emitted with richer titles
    if (
      findings.some(
        (f) =>
          f.category === "interaction" &&
          msg.includes(f.hotspotId ?? "___never___")
      )
    ) {
      continue;
    }
    findings.push({
      id,
      severity: "warning",
      category: categorizeMessage(msg),
      title: "Pack lint",
      detail: msg,
      fix: "See detail — fix in Pack / Pixels / Puzzles.",
      ...parseRefs(msg),
    });
  }

  for (const msg of validation.warnings) {
    if (findings.some((f) => f.detail === msg)) continue;
    if (/has no image|placeholder will be used/i.test(msg)) continue; // covered
    findings.push({
      id: `warn:${msg}`,
      severity: "warning",
      category: categorizeMessage(msg),
      title: "Validation warning",
      detail: msg,
      fix: "Optional polish — safe to ship, but worth fixing.",
      ...parseRefs(msg),
    });
  }

  for (const flag of flagsNeverSet(doc)) {
    findings.push({
      id: `softlock:flag-never:${flag}`,
      severity: "error",
      category: "softlock",
      title: `Flag never set — ${flag}`,
      detail: `Something reads "${flag}" but nothing sets it — exits/dialogue stay locked forever.`,
      fix: "Unlock chain wizard, talk setFlag, use-with, or pickup that sets this flag.",
    });
  }

  const soft = analyzeSoftLock(doc);
  for (const issue of soft.issues) {
    if (findings.some((f) => f.id === issue.id)) continue;
    findings.push({
      id: issue.id,
      severity: issue.severity,
      category: "softlock",
      title: issue.title,
      detail: issue.detail,
      fix: issue.fix,
      roomId: issue.roomId,
      itemId: issue.itemId,
    });
  }

  const missingRoomArt = findings.filter((f) =>
    f.id.startsWith("art:room:")
  ).length;
  const missingItemIcons = findings.filter((f) =>
    f.id.startsWith("art:item:")
  ).length;
  const deadExits = findings.filter((f) => f.category === "exit" && f.severity === "error").length;
  const silentHotspots = findings.filter((f) =>
    f.id.startsWith("interact:silent:")
  ).length;
  const unreachableRooms = soft.unreachableRooms.length;
  const neverSetCount = flagsNeverSet(doc).length;
  const errors = findings.filter((f) => f.severity === "error").length;
  const warnings = findings.filter((f) => f.severity === "warning").length;
  const info = findings.filter((f) => f.severity === "info").length;

  return {
    packId: doc.id,
    title: doc.title,
    ok: errors === 0 && validation.ok,
    findings,
    summary: {
      errors,
      warnings,
      info,
      missingRoomArt,
      missingItemIcons,
      deadExits,
      silentHotspots,
      unreachableRooms,
      flagsNeverSet: neverSetCount,
    },
  };
}

function categorizeMessage(msg: string): PackDoctorCategory {
  if (/image|placeholder|icon|art/i.test(msg)) return "art";
  if (/link|exit|room/i.test(msg) && /unknown|missing|dead/i.test(msg)) {
    return "exit";
  }
  if (/dialogue|talk|character/i.test(msg)) return "dialogue";
  if (/item|use-with|combination|pickup/i.test(msg)) return "item";
  if (/hotspot|Look|Use|handlers|silent/i.test(msg)) return "interaction";
  if (/juice|haptic|feel|SFX|flat interaction/i.test(msg)) return "feel";
  return "meta";
}

function parseRefs(msg: string): Partial<PackDoctorFinding> {
  const roomHs = msg.match(/"([^"/]+)\/([^"]+)"/);
  if (roomHs) return { roomId: roomHs[1], hotspotId: roomHs[2] };
  const room = msg.match(/room "([^"]+)"/i);
  if (room) return { roomId: room[1] };
  const item = msg.match(/item "([^"]+)"/i);
  if (item) return { itemId: item[1] };
  return {};
}

/** Plain-text report for CLI / copy-paste. */
export function formatPackDoctorReport(report: PackDoctorReport): string {
  const lines: string[] = [];
  lines.push(`Pack doctor — ${report.title} (${report.packId})`);
  lines.push(
    report.ok
      ? "Status: OK (no blocking errors)"
      : "Status: NEEDS FIX (blocking errors)"
  );
  const s = report.summary;
  lines.push(
    `Summary: ${s.errors} error(s), ${s.warnings} warning(s), ${s.info} info · missing room art ${s.missingRoomArt} · missing item icons ${s.missingItemIcons} · dead exits ${s.deadExits} · silent hotspots ${s.silentHotspots} · unreachable rooms ${s.unreachableRooms} · flags never set ${s.flagsNeverSet}`
  );
  lines.push("");

  const order: PackDoctorSeverity[] = ["error", "warning", "info"];
  for (const sev of order) {
    const group = report.findings.filter((f) => f.severity === sev);
    if (!group.length) continue;
    lines.push(`## ${sev.toUpperCase()} (${group.length})`);
    for (const f of group) {
      lines.push(`[${f.category}] ${f.title}`);
      lines.push(`  ${f.detail}`);
      lines.push(`  Fix: ${f.fix}`);
      if (f.roomId) lines.push(`  Room: ${f.roomId}`);
      if (f.hotspotId) lines.push(`  Hotspot: ${f.hotspotId}`);
      if (f.itemId) lines.push(`  Item: ${f.itemId}`);
      lines.push("");
    }
  }
  return lines.join("\n");
}
