/**
 * Character sprite background removal.
 *
 * Character art often arrives with a background baked in: a flat colour, a
 * "fake transparency" checkerboard (very common from AI image tools and
 * screenshots), or letterbox bars. On stage that shows as a rectangle around
 * the character. `cutoutSpriteBackground` makes that background transparent.
 *
 * It is deliberately conservative: when the border of the image is not
 * clearly a simple background (a photo, a scene), it changes nothing and says
 * so, so the Studio can tell the author instead of eating the character.
 */

export type SpriteCutoutOutcome =
  | "already-transparent"
  | "removed"
  | "no-simple-background";

export interface SpriteCutoutResult {
  /** RGBA pixels (same size as the input) */
  data: Uint8ClampedArray;
  changed: boolean;
  /**
   * - `already-transparent` — the image has real transparency; left alone
   * - `removed` — background made transparent
   * - `no-simple-background` — border is too varied to remove safely
   */
  outcome: "already-transparent" | "removed" | "no-simple-background";
  /** Share of pixels made transparent (0–1) */
  removedFraction: number;
}

/** Colour distance below which a pixel counts as background */
const TOLERANCE = 46;
/** Border clusters must explain at least this share of the border */
const MIN_BORDER_COVERAGE = 0.8;
const MAX_BG_COLORS = 3;
/** Enclosed background patches (between legs, under an arm) this big are cleared too */
const MIN_ENCLOSED_AREA = 12;

type Rgb = [number, number, number];

function dist(a: Rgb, r: number, g: number, b: number): number {
  const dr = a[0] - r;
  const dg = a[1] - g;
  const db = a[2] - b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * Remove a simple baked-in background from RGBA pixels.
 * Pure (no DOM) so it can be unit-tested.
 */
export function cutoutSpriteBackground(
  src: Uint8ClampedArray,
  width: number,
  height: number
): SpriteCutoutResult {
  const data = new Uint8ClampedArray(src);
  const total = width * height;
  const unchanged = (
    outcome: SpriteCutoutResult["outcome"]
  ): SpriteCutoutResult => ({ data, changed: false, outcome, removedFraction: 0 });

  if (total === 0 || width < 4 || height < 4) {
    return unchanged("no-simple-background");
  }

  // 1. Real transparency already? (corner / edge pixels see-through)
  let transparentBorder = 0;
  let borderCount = 0;
  const eachBorder = (
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    fn: (i: number) => void
  ) => {
    for (let x = x0; x <= x1; x++) {
      fn(y0 * width + x);
      if (y1 !== y0) fn(y1 * width + x);
    }
    for (let y = y0 + 1; y < y1; y++) {
      fn(y * width + x0);
      if (x1 !== x0) fn(y * width + x1);
    }
  };
  eachBorder(0, 0, width - 1, height - 1, (i) => {
    borderCount++;
    if (data[i * 4 + 3] < 128) transparentBorder++;
  });
  if (transparentBorder / borderCount > 0.25) {
    return unchanged("already-transparent");
  }

  const clear = new Uint8Array(total);

  // 2. Trim letterbox bars: whole edge rows / columns of one flat colour.
  //    Done first so a black bar never becomes a "background colour" that
  //    could leak into dark clothing.
  let top = 0;
  let bottom = height - 1;
  let left = 0;
  let right = width - 1;
  const lineIsFlat = (horizontal: boolean, index: number): boolean => {
    const len = horizontal ? width : height;
    let r = 0;
    let g = 0;
    let b = 0;
    for (let k = 0; k < len; k++) {
      const i = (horizontal ? index * width + k : k * width + index) * 4;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
    }
    const mean: Rgb = [r / len, g / len, b / len];
    let off = 0;
    for (let k = 0; k < len; k++) {
      const i = (horizontal ? index * width + k : k * width + index) * 4;
      if (dist(mean, data[i], data[i + 1], data[i + 2]) > 26) off++;
    }
    return off / len < 0.04;
  };
  const lineMean = (horizontal: boolean, index: number): Rgb => {
    const len = horizontal ? width : height;
    let r = 0;
    let g = 0;
    let b = 0;
    for (let k = 0; k < len; k++) {
      const i = (horizontal ? index * width + k : k * width + index) * 4;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
    }
    return [r / len, g / len, b / len];
  };
  /** Share of a line's pixels that match `color` */
  const lineShare = (horizontal: boolean, index: number, color: Rgb): number => {
    const len = horizontal ? width : height;
    let hit = 0;
    for (let k = 0; k < len; k++) {
      const i = (horizontal ? index * width + k : k * width + index) * 4;
      if (dist(color, data[i], data[i + 1], data[i + 2]) <= 26) hit++;
    }
    return hit / len;
  };
  /**
   * Count flat lines from one edge — but only when they are a *bar*: a band
   * whose colour stops where it ends. If the colour carries on into the next
   * line it is the background itself, which the flood fill handles (step 4).
   */
  const barDepth = (horizontal: boolean, fromEnd: boolean): number => {
    const len = horizontal ? height : width;
    const max = Math.floor(len * 0.4);
    const at = (d: number) => (fromEnd ? len - 1 - d : d);
    let depth = 0;
    while (depth < max && lineIsFlat(horizontal, at(depth))) depth++;
    if (depth === 0) return 0;
    const barColor = lineMean(horizontal, at(0));
    return lineShare(horizontal, at(depth), barColor) >= 0.2 ? 0 : depth;
  };
  top = barDepth(true, false);
  bottom = height - 1 - barDepth(true, true);
  left = barDepth(false, false);
  right = width - 1 - barDepth(false, true);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (y < top || y > bottom || x < left || x > right) clear[y * width + x] = 1;
    }
  }

  // 3. Background colours = the few colours that make up the remaining border
  const buckets = new Map<number, { n: number; r: number; g: number; b: number }>();
  let ring = 0;
  eachBorder(left, top, right, bottom, (i) => {
    ring++;
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    const key = ((r >> 5) << 10) | ((g >> 5) << 5) | (b >> 5);
    const e = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    e.n++;
    e.r += r;
    e.g += g;
    e.b += b;
    buckets.set(key, e);
  });
  const ranked = [...buckets.values()].sort((a, b) => b.n - a.n);
  const colors: Rgb[] = [];
  for (const e of ranked) {
    const c: Rgb = [e.r / e.n, e.g / e.n, e.b / e.n];
    // Merge near-duplicates created by bucket edges
    if (colors.some((k) => dist(k, c[0], c[1], c[2]) < TOLERANCE / 2)) continue;
    colors.push(c);
    if (colors.length >= MAX_BG_COLORS) break;
  }
  const isBg = (i: number): boolean => {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    for (const c of colors) if (dist(c, r, g, b) <= TOLERANCE) return true;
    return false;
  };
  let covered = 0;
  eachBorder(left, top, right, bottom, (i) => {
    if (isBg(i)) covered++;
  });
  const trimmedAny =
    top > 0 || left > 0 || bottom < height - 1 || right < width - 1;
  if (ring === 0 || covered / ring < MIN_BORDER_COVERAGE) {
    if (!trimmedAny) return unchanged("no-simple-background");
  } else {
    // 4. Flood from the border through background-coloured pixels
    const stack: number[] = [];
    const push = (x: number, y: number) => {
      if (x < left || x > right || y < top || y > bottom) return;
      const i = y * width + x;
      if (clear[i] || !isBg(i)) return;
      clear[i] = 1;
      stack.push(i);
    };
    for (let x = left; x <= right; x++) {
      push(x, top);
      push(x, bottom);
    }
    for (let y = top; y <= bottom; y++) {
      push(left, y);
      push(right, y);
    }
    while (stack.length) {
      const i = stack.pop()!;
      const x = i % width;
      const y = (i - x) / width;
      push(x + 1, y);
      push(x - 1, y);
      push(x, y + 1);
      push(x, y - 1);
    }

    // 5. Enclosed background patches (not reachable from the border)
    const seen = new Uint8Array(total);
    for (let start = 0; start < total; start++) {
      if (clear[start] || seen[start] || !isBg(start)) continue;
      const patch: number[] = [start];
      seen[start] = 1;
      for (let p = 0; p < patch.length; p++) {
        const i = patch[p];
        const x = i % width;
        const y = (i - x) / width;
        const next = [
          x + 1 < width ? i + 1 : -1,
          x > 0 ? i - 1 : -1,
          y + 1 < height ? i + width : -1,
          y > 0 ? i - width : -1,
        ];
        for (const n of next) {
          if (n < 0 || clear[n] || seen[n] || !isBg(n)) continue;
          seen[n] = 1;
          patch.push(n);
        }
      }
      if (patch.length >= MIN_ENCLOSED_AREA) for (const i of patch) clear[i] = 1;
    }
  }

  // 6. Defringe: edge pixels that are a blend of character and background
  //    (JPEG / resize halo) and still mostly background-coloured.
  if (colors.length) {
    const fringe: number[] = [];
    for (let y = top; y <= bottom; y++) {
      for (let x = left; x <= right; x++) {
        const i = y * width + x;
        if (clear[i]) continue;
        const touches =
          (x > 0 && clear[i - 1]) ||
          (x + 1 < width && clear[i + 1]) ||
          (y > 0 && clear[i - width]) ||
          (y + 1 < height && clear[i + width]);
        if (!touches) continue;
        const r = data[i * 4];
        const g = data[i * 4 + 1];
        const b = data[i * 4 + 2];
        if (colors.some((c) => dist(c, r, g, b) <= TOLERANCE * 1.9)) fringe.push(i);
      }
    }
    for (const i of fringe) clear[i] = 1;
  }

  let removed = 0;
  for (let i = 0; i < total; i++) {
    if (!clear[i]) continue;
    removed++;
    data[i * 4 + 3] = 0;
  }
  const removedFraction = removed / total;
  // Nothing left (or almost nothing removed) means the guess was wrong
  if (removedFraction > 0.97 || removedFraction < 0.02) {
    return {
      data: new Uint8ClampedArray(src),
      changed: false,
      outcome: "no-simple-background",
      removedFraction: 0,
    };
  }
  return { data, changed: true, outcome: "removed", removedFraction };
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read the image"));
    img.src = url;
  });
}

export interface SpriteCutoutUrlResult {
  dataUrl: string;
  outcome: SpriteCutoutResult["outcome"];
}

/**
 * Browser wrapper: returns a transparent PNG data URL when a background was
 * removed, otherwise the original URL untouched.
 */
export async function cutoutSpriteDataUrl(
  url: string
): Promise<SpriteCutoutUrlResult> {
  const img = await loadImage(url);
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx || !w || !h) return { dataUrl: url, outcome: "no-simple-background" };
  ctx.drawImage(img, 0, 0);
  const image = ctx.getImageData(0, 0, w, h);
  const result = cutoutSpriteBackground(image.data, w, h);
  if (!result.changed) return { dataUrl: url, outcome: result.outcome };
  ctx.putImageData(new ImageData(result.data, w, h), 0, 0);
  return { dataUrl: canvas.toDataURL("image/png"), outcome: "removed" };
}

/** Plain-language note for the author about what happened to their sprite. */
export function describeCutoutOutcome(
  outcome: SpriteCutoutResult["outcome"]
): string {
  switch (outcome) {
    case "removed":
      return "Background removed — the character is now cut out.";
    case "already-transparent":
      return "Image already has a transparent background.";
    default:
      return "Couldn't remove the background automatically. Use a PNG with a transparent background, or art on one flat colour.";
  }
}
