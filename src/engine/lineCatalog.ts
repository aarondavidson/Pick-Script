/**
 * Stable line catalog for VO + localization (Yarn/Ink-style).
 * Every extractable string gets a lineId; optional voiceKey for audio.
 */

import type { JsonPackDocument, JsonPackHotspot } from "./jsonPack";
import type { I18nConfig, MessageCatalog } from "./i18n";

export type LineKind =
  | "dialogue"
  | "choice"
  | "look"
  | "use"
  | "cutscene"
  | "quest"
  | "hint";

export interface LineCatalogRow {
  lineId: string;
  kind: LineKind;
  text: string;
  /** Suggested / authored voice clip key */
  voiceKey?: string;
  roomId?: string;
  hotspotId?: string;
  notes?: string;
}

export function dialogueLineId(
  roomId: string,
  hotspotId: string,
  lineId: string
): string {
  return `dlg.${roomId}.${hotspotId}.${lineId}`;
}

export function dialogueChoiceLineId(
  roomId: string,
  hotspotId: string,
  lineId: string,
  choiceIndex: number
): string {
  return `dlg.${roomId}.${hotspotId}.${lineId}.c${choiceIndex}`;
}

export function defaultVoiceKey(lineId: string): string {
  return lineId.replace(/^dlg\./, "voice.");
}

/** Walk a pack and collect translatable / VO-able lines. */
export function extractPackStrings(doc: JsonPackDocument): LineCatalogRow[] {
  const rows: LineCatalogRow[] = [];
  const seen = new Set<string>();

  const push = (row: LineCatalogRow) => {
    if (!row.lineId.trim() || !row.text.trim()) return;
    if (seen.has(row.lineId)) return;
    seen.add(row.lineId);
    rows.push(row);
  };

  for (const [roomId, room] of Object.entries(doc.rooms ?? {})) {
    for (const h of room.hotspots ?? []) {
      if (h.lookText?.trim()) {
        push({
          lineId: `look.${roomId}.${h.id}`,
          kind: "look",
          text: h.lookText.trim(),
          roomId,
          hotspotId: h.id,
        });
      }
      if (h.useText?.trim()) {
        push({
          lineId: `use.${roomId}.${h.id}`,
          kind: "use",
          text: h.useText.trim(),
          roomId,
          hotspotId: h.id,
        });
      }
      extractDialogue(h, roomId, push);
    }
  }

  for (const [cutId, cs] of Object.entries(doc.cutscenes ?? {})) {
    for (let i = 0; i < (cs.steps?.length ?? 0); i++) {
      const step = cs.steps![i]!;
      if (
        (step.op === "message" || step.op === "sayLine") &&
        "text" in step &&
        typeof step.text === "string" &&
        step.text.trim()
      ) {
        const lineId = `cut.${cutId}.${i}`;
        push({
          lineId,
          kind: "cutscene",
          text: step.text.trim(),
          voiceKey:
            step.op === "sayLine" && step.voiceKey
              ? step.voiceKey
              : defaultVoiceKey(lineId),
          notes: cutId,
        });
      }
    }
  }

  for (const q of doc.quests ?? []) {
    if (q.title?.trim()) {
      push({
        lineId: `quest.${q.id}.title`,
        kind: "quest",
        text: q.title.trim(),
      });
    }
    if (q.description?.trim()) {
      push({
        lineId: `quest.${q.id}.desc`,
        kind: "quest",
        text: q.description.trim(),
      });
    }
    (q.objectives ?? []).forEach((obj, i) => {
      if (obj?.trim()) {
        push({
          lineId: `quest.${q.id}.obj.${i}`,
          kind: "quest",
          text: obj.trim(),
        });
      }
    });
  }

  for (const h of doc.hints ?? []) {
    (h.tiers ?? []).forEach((tier, i) => {
      if (tier?.trim()) {
        push({
          lineId: `hint.${h.id}.${i}`,
          kind: "hint",
          text: tier.trim(),
          notes: h.title,
        });
      }
    });
  }

  return rows;
}

function extractDialogue(
  h: JsonPackHotspot,
  roomId: string,
  push: (row: LineCatalogRow) => void
) {
  const lines = h.dialogue?.lines ?? [];
  for (const line of lines) {
    if (!line.id?.trim() || !line.text?.trim()) continue;
    const lineId = dialogueLineId(roomId, h.id, line.id);
    push({
      lineId,
      kind: "dialogue",
      text: line.text.trim(),
      voiceKey: line.voiceKey?.trim() || defaultVoiceKey(lineId),
      roomId,
      hotspotId: h.id,
    });
    (line.choices ?? []).forEach((c, i) => {
      if (!c.text?.trim()) return;
      push({
        lineId: dialogueChoiceLineId(roomId, h.id, line.id, i),
        kind: "choice",
        text: c.text.trim(),
        roomId,
        hotspotId: h.id,
      });
    });
  }
}

/** CSV: lineId,kind,text,voiceKey,roomId,hotspotId */
export function exportStringsCsv(rows: LineCatalogRow[]): string {
  const esc = (s: string) => {
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const header = "lineId,kind,text,voiceKey,roomId,hotspotId";
  const body = rows.map((r) =>
    [
      r.lineId,
      r.kind,
      r.text,
      r.voiceKey ?? "",
      r.roomId ?? "",
      r.hotspotId ?? "",
    ]
      .map(esc)
      .join(",")
  );
  // UTF-8 BOM so Excel / Sheets keep encoding; parsers strip it on import.
  return `\uFEFF${[header, ...body].join("\n")}\n`;
}

/**
 * Parse a simple CSV (handles quoted fields, UTF-8 BOM, empty optional cells).
 * Skips blank lines and rows with empty lineId or text.
 */
export function parseStringsCsv(csv: string): LineCatalogRow[] {
  // Strip UTF-8 BOM (Excel / Google Sheets often prepend it).
  const normalized = csv.replace(/^\uFEFF/, "");
  const rawLines = normalized.split(/\r\n|\n|\r/);
  const lines = rawLines.filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const rows: LineCatalogRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = padCsvCols(splitCsvLine(lines[i]!), 6);
    // Defensive: stray BOM on first cell after some editors re-save.
    const lineId = cols[0]!.replace(/^\uFEFF/, "").trim();
    const kind = cols[1]!.trim() as LineKind;
    const text = cols[2] ?? "";
    // Empty text cell → skip (do not invent a blank translation).
    if (!lineId || !text.trim()) continue;
    const voiceKey = cols[3]!.trim();
    const roomId = cols[4]!.trim();
    const hotspotId = cols[5]!.trim();
    rows.push({
      lineId,
      kind: kind || "dialogue",
      text: text.trim(),
      voiceKey: voiceKey || undefined,
      roomId: roomId || undefined,
      hotspotId: hotspotId || undefined,
    });
  }
  return rows;
}

function padCsvCols(cols: string[], n: number): string[] {
  const out = cols.slice(0, n);
  while (out.length < n) out.push("");
  return out;
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (inQ) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQ = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQ = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

/** Placeholder text for a not-yet-translated string (`[TODO es] Ahoy!`). */
export function stubTranslateText(original: string, locale: string): string {
  const loc = locale.trim().slice(0, 16) || "xx";
  const src = original.trim() || "…";
  return `[TODO ${loc}] ${src}`;
}

/**
 * Fill `doc.i18n.messages[locale][key]` with a TODO stub.
 * Also seeds the default-locale catalog entry so Studio locale preview
 * has 2+ locales to compare against.
 */
export function applyTranslateStub(
  doc: JsonPackDocument,
  locale: string,
  key: string,
  originalText: string
): JsonPackDocument {
  const loc = locale.trim().slice(0, 16) || "es";
  const lineKey = key.trim();
  if (!lineKey) return doc;
  const stub = stubTranslateText(originalText, loc);
  const prev = doc.i18n ?? {};
  const defaultLocale = prev.defaultLocale ?? "en";
  const messages = { ...(prev.messages ?? {}) };
  const defaultCat = { ...(messages[defaultLocale] ?? {}) };
  if (originalText.trim() && !defaultCat[lineKey]) {
    defaultCat[lineKey] = originalText.trim();
  }
  messages[defaultLocale] = defaultCat;
  messages[loc] = { ...(messages[loc] ?? {}), [lineKey]: stub };
  return {
    ...doc,
    i18n: {
      defaultLocale,
      messages,
    },
  };
}

/** Build a message catalog from rows (lineId → text). */
export function catalogFromRows(rows: LineCatalogRow[]): MessageCatalog {
  const cat: MessageCatalog = {};
  for (const r of rows) {
    if (r.lineId && r.text) cat[r.lineId] = r.text;
  }
  return cat;
}

/**
 * Merge an imported locale CSV into pack i18n.
 * Base (source) language stays in dialogue text; locale goes to messages[locale].
 */
export function mergeLocaleIntoPack(
  doc: JsonPackDocument,
  locale: string,
  rows: LineCatalogRow[]
): JsonPackDocument {
  const loc = locale.trim().slice(0, 16) || "en";
  const catalog = catalogFromRows(rows);
  const prev = doc.i18n ?? {};
  const messages = { ...(prev.messages ?? {}) };
  messages[loc] = { ...(messages[loc] ?? {}), ...catalog };
  return {
    ...doc,
    i18n: {
      defaultLocale: prev.defaultLocale ?? "en",
      messages,
    },
  };
}

/** Ensure dialogue lines have voiceKey filled with defaults (mutates copy). */
export function ensureDialogueVoiceKeys(
  doc: JsonPackDocument
): JsonPackDocument {
  const rooms = { ...doc.rooms };
  for (const [roomId, room] of Object.entries(rooms)) {
    const hotspots = (room.hotspots ?? []).map((h) => {
      if (!h.dialogue?.lines?.length) return h;
      return {
        ...h,
        dialogue: {
          ...h.dialogue,
          lines: h.dialogue.lines.map((line) => {
            if (!line.id || line.voiceKey?.trim()) return line;
            const lineId = dialogueLineId(roomId, h.id, line.id);
            return { ...line, voiceKey: defaultVoiceKey(lineId) };
          }),
        },
      };
    });
    rooms[roomId] = { ...room, hotspots };
  }
  return { ...doc, rooms };
}

/** Seed default-locale catalog from extracted source strings. */
export function seedDefaultLocaleCatalog(
  doc: JsonPackDocument,
  locale = "en"
): I18nConfig {
  const rows = extractPackStrings(doc);
  const existing = doc.i18n?.messages?.[locale] ?? {};
  return {
    defaultLocale: doc.i18n?.defaultLocale ?? locale,
    messages: {
      ...(doc.i18n?.messages ?? {}),
      [locale]: { ...catalogFromRows(rows), ...existing },
    },
  };
}
