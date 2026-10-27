/**
 * Parse a pasted palette into `#rrggbb` colors for pixelate.
 *
 * Accepts what palette sites (e.g. Lospec) hand out:
 * - hex lists: `ff0044`, `#ff0044`, comma / space / newline separated
 * - Paint.NET `.txt`: `FFff0044` (alpha first; `;` comments)
 * - GIMP `.gpl`: `255 0 68  Name` rows
 */

export const MAX_PALETTE_COLORS = 256;

function toHex(n: number): string {
  return n.toString(16).padStart(2, "0");
}

export function parsePaletteText(text: string): string[] {
  const colors: string[] = [];
  const seen = new Set<string>();
  const add = (hex: string) => {
    const c = `#${hex.toLowerCase()}`;
    if (seen.has(c) || colors.length >= MAX_PALETTE_COLORS) return;
    seen.add(c);
    colors.push(c);
  };

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith(";") || line.startsWith("//")) continue;
    if (/^(GIMP Palette|Name:|Columns:|#\s*$)/i.test(line)) continue;

    // GIMP row: three 0–255 channel values
    const gpl = line.match(/^(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})(?:\s|$)/);
    if (gpl) {
      const rgb = gpl.slice(1, 4).map(Number);
      if (rgb.every((v) => v <= 255)) add(rgb.map(toHex).join(""));
      continue;
    }

    for (const token of line.match(/#?\b[0-9a-f]{6}(?:[0-9a-f]{2})?\b/gi) ?? []) {
      const hex = token.replace("#", "");
      // 8 digits = Paint.NET AARRGGBB
      add(hex.length === 8 ? hex.slice(2) : hex);
    }
  }
  return colors;
}
