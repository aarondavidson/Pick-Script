/**
 * Asset credits — who made the art / music / sound a pack ships with.
 *
 * Many free assets ask for credit (Kenney, ansimuz…) and CC-BY ones require it.
 * Packs list them here; the in-game Settings menu and default win screen show them.
 */

export interface CreditEntry {
  /** What was used, e.g. "Tiny Dungeon" */
  work: string;
  /** Who made it, e.g. "Kenney" */
  author: string;
  /** License name, e.g. "CC0" or "CC-BY 4.0" */
  license?: string;
  /** Source page (https only) */
  url?: string;
}

const MAX_CREDITS = 100;
const MAX_TEXT = 160;

function cleanText(raw: unknown): string {
  return typeof raw === "string" ? raw.trim().slice(0, MAX_TEXT) : "";
}

function cleanHttpsUrl(raw: unknown): string | undefined {
  if (typeof raw !== "string" || raw.length > 2048) return undefined;
  try {
    const u = new URL(raw.trim());
    return u.protocol === "https:" ? u.toString() : undefined;
  } catch {
    return undefined;
  }
}

/** Drop malformed rows, cap lengths, keep only https links. */
export function sanitizeCredits(raw: unknown): CreditEntry[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: CreditEntry[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const work = cleanText(r.work);
    const author = cleanText(r.author);
    if (!work || !author) continue;
    const license = cleanText(r.license);
    const url = cleanHttpsUrl(r.url);
    out.push({
      work,
      author,
      ...(license ? { license } : {}),
      ...(url ? { url } : {}),
    });
    if (out.length >= MAX_CREDITS) break;
  }
  return out;
}

function creditKey(c: CreditEntry): string {
  return (c.url || `${c.work}|${c.author}`).toLowerCase();
}

/** Append credits, skipping duplicates (same url, or same work + author). */
export function mergeCredits(
  base: CreditEntry[] | undefined,
  extra: CreditEntry[] | undefined
): CreditEntry[] {
  const out = [...(base ?? [])];
  const seen = new Set(out.map(creditKey));
  for (const c of extra ?? []) {
    const key = creditKey(c);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}

/** One-line credit, e.g. `"Tiny Dungeon" by Kenney (CC0)`. */
export function formatCredit(c: CreditEntry): string {
  return `“${c.work}” by ${c.author}${c.license ? ` (${c.license})` : ""}`;
}
