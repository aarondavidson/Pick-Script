/**
 * Browser-side pixelation (Image-to-Pixel–style).
 * Quantize + optional Floyd–Steinberg dither + nearest-neighbor upscale.
 * MIT-compatible original implementation for pack asset prep.
 */

export type DitherMode = "none" | "floyd-steinberg" | "ordered";

export interface PixelateOptions {
  /** Logical pixel width (art resolution before upscale) */
  pixelWidth: number;
  /** Optional height; defaults to preserve aspect */
  pixelHeight?: number;
  dither?: DitherMode;
  /** 0–1 strength for dither */
  ditherStrength?: number;
  /** Hex colors; omit to keep quantized adaptive palette */
  palette?: string[] | null;
  /** Max colors when palette is null (adaptive) */
  maxColors?: number;
  /** Output canvas size (nearest-neighbor upscale). Default = pixel size */
  outputWidth?: number;
  outputHeight?: number;
}

const DEFAULT_GAME_PALETTE = [
  "#1b1b1e",
  "#f4f1de",
  "#e07a5f",
  "#3d405b",
  "#81b29a",
  "#f2cc8f",
  "#8d5a97",
  "#ef3054",
  "#2a9d8f",
  "#e9c46a",
  "#264653",
  "#e76f51",
  "#ffffff",
  "#000000",
  "#6c757d",
  "#adb5bd",
];

export function parseHex(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function colorDist(
  a: [number, number, number],
  b: [number, number, number]
): number {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return dr * dr + dg * dg + db * db;
}

function nearestPalette(
  r: number,
  g: number,
  b: number,
  palette: [number, number, number][]
): [number, number, number] {
  let best = palette[0];
  let bestD = Infinity;
  for (const c of palette) {
    const d = colorDist([r, g, b], c);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}

/** Simple median-cut–ish adaptive palette via uniform bucket sampling */
function adaptivePalette(
  data: Uint8ClampedArray,
  maxColors: number
): [number, number, number][] {
  const buckets = new Map<string, { r: number; g: number; b: number; n: number }>();
  for (let i = 0; i < data.length; i += 16) {
    const r = data[i] >> 4;
    const g = data[i + 1] >> 4;
    const b = data[i + 2] >> 4;
    const key = `${r},${g},${b}`;
    const cur = buckets.get(key);
    if (cur) {
      cur.r += data[i];
      cur.g += data[i + 1];
      cur.b += data[i + 2];
      cur.n += 1;
    } else {
      buckets.set(key, { r: data[i], g: data[i + 1], b: data[i + 2], n: 1 });
    }
  }
  const sorted = [...buckets.values()].sort((a, b) => b.n - a.n);
  const out: [number, number, number][] = sorted
    .slice(0, maxColors)
    .map((c) => [
      Math.round(c.r / c.n),
      Math.round(c.g / c.n),
      Math.round(c.b / c.n),
    ]);
  if (out.length === 0) out.push([0, 0, 0], [255, 255, 255]);
  return out;
}

function loadImage(src: string | HTMLImageElement | HTMLCanvasElement): Promise<{
  width: number;
  height: number;
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
}> {
  if (src instanceof HTMLCanvasElement) {
    return Promise.resolve({
      width: src.width,
      height: src.height,
      draw: (ctx, w, h) => ctx.drawImage(src, 0, 0, w, h),
    });
  }
  if (src instanceof HTMLImageElement) {
    const img = src;
    const ready = img.complete
      ? Promise.resolve()
      : new Promise<void>((res, rej) => {
          img.onload = () => res();
          img.onerror = () => rej(new Error("Image failed to load"));
        });
    return ready.then(() => ({
      width: img.naturalWidth || img.width,
      height: img.naturalHeight || img.height,
      draw: (ctx, w, h) => ctx.drawImage(img, 0, 0, w, h),
    }));
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () =>
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
        draw: (ctx, w, h) => ctx.drawImage(img, 0, 0, w, h),
      });
    img.onerror = () => reject(new Error("Failed to load image URL"));
    img.src = src;
  });
}

export async function pixelate(
  source: string | HTMLImageElement | HTMLCanvasElement,
  options: PixelateOptions
): Promise<HTMLCanvasElement> {
  const {
    pixelWidth,
    dither = "floyd-steinberg",
    ditherStrength = 0.75,
    maxColors = 32,
  } = options;

  const img = await loadImage(source);
  const aspect = img.height / img.width || 1;
  const pw = Math.max(8, Math.round(pixelWidth));
  const ph = Math.max(8, Math.round(options.pixelHeight ?? pw * aspect));

  const small = document.createElement("canvas");
  small.width = pw;
  small.height = ph;
  const sctx = small.getContext("2d", { willReadFrequently: true })!;
  sctx.imageSmoothingEnabled = false;
  img.draw(sctx, pw, ph);

  const imageData = sctx.getImageData(0, 0, pw, ph);
  const data = imageData.data;

  const paletteRgb: [number, number, number][] = options.palette
    ? options.palette.map(parseHex)
    : options.palette === null
      ? adaptivePalette(data, maxColors)
      : DEFAULT_GAME_PALETTE.map(parseHex);

  const strength = Math.max(0, Math.min(1, ditherStrength));

  if (dither === "floyd-steinberg" && strength > 0) {
    const buf = new Float32Array(data.length);
    for (let i = 0; i < data.length; i++) buf[i] = data[i];

    for (let y = 0; y < ph; y++) {
      for (let x = 0; x < pw; x++) {
        const i = (y * pw + x) * 4;
        const oldR = buf[i];
        const oldG = buf[i + 1];
        const oldB = buf[i + 2];
        const [nr, ng, nb] = nearestPalette(oldR, oldG, oldB, paletteRgb);
        data[i] = nr;
        data[i + 1] = ng;
        data[i + 2] = nb;
        const er = (oldR - nr) * strength;
        const eg = (oldG - ng) * strength;
        const eb = (oldB - nb) * strength;
        const spread = (ox: number, oy: number, factor: number) => {
          const xx = x + ox;
          const yy = y + oy;
          if (xx < 0 || xx >= pw || yy < 0 || yy >= ph) return;
          const j = (yy * pw + xx) * 4;
          buf[j] += er * factor;
          buf[j + 1] += eg * factor;
          buf[j + 2] += eb * factor;
        };
        spread(1, 0, 7 / 16);
        spread(-1, 1, 3 / 16);
        spread(0, 1, 5 / 16);
        spread(1, 1, 1 / 16);
      }
    }
  } else if (dither === "ordered" && strength > 0) {
    const bayer = [
      [0, 8, 2, 10],
      [12, 4, 14, 6],
      [3, 11, 1, 9],
      [15, 7, 13, 5],
    ];
    for (let y = 0; y < ph; y++) {
      for (let x = 0; x < pw; x++) {
        const i = (y * pw + x) * 4;
        const t = ((bayer[y % 4][x % 4] / 16) - 0.5) * 64 * strength;
        const [nr, ng, nb] = nearestPalette(
          data[i] + t,
          data[i + 1] + t,
          data[i + 2] + t,
          paletteRgb
        );
        data[i] = nr;
        data[i + 1] = ng;
        data[i + 2] = nb;
      }
    }
  } else {
    for (let i = 0; i < data.length; i += 4) {
      const [nr, ng, nb] = nearestPalette(
        data[i],
        data[i + 1],
        data[i + 2],
        paletteRgb
      );
      data[i] = nr;
      data[i + 1] = ng;
      data[i + 2] = nb;
    }
  }

  sctx.putImageData(imageData, 0, 0);

  const outW = options.outputWidth ?? pw;
  const outH = options.outputHeight ?? ph;
  const out = document.createElement("canvas");
  out.width = outW;
  out.height = outH;
  const octx = out.getContext("2d")!;
  octx.imageSmoothingEnabled = false;
  octx.drawImage(small, 0, 0, outW, outH);
  return out;
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: "image/png" | "image/jpeg" = "image/png",
  quality = 0.92
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
      type,
      quality
    );
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Asset presets aligned with ASSETS.md */
export const ASSET_PRESETS = {
  room: {
    label: "Room background",
    hint: "1920×1080 JPG target — generate pixel scene then upscale",
    genWidth: 256,
    genHeight: 144,
    pixelWidth: 256,
    outputWidth: 1920,
    outputHeight: 1080,
    mime: "image/jpeg" as const,
    style: "rd_fast__detailed",
    filename: "room.jpg",
  },
  item: {
    label: "Inventory item",
    hint: "256×256 icon",
    genWidth: 128,
    genHeight: 128,
    pixelWidth: 64,
    outputWidth: 256,
    outputHeight: 256,
    mime: "image/png" as const,
    style: "rd_fast__game_asset",
    filename: "item.png",
    removeBg: true,
  },
  portrait: {
    label: "Portrait",
    hint: "256×256 bust",
    genWidth: 128,
    genHeight: 128,
    pixelWidth: 64,
    outputWidth: 256,
    outputHeight: 256,
    mime: "image/png" as const,
    style: "rd_fast__portrait",
    filename: "portrait.png",
  },
  character: {
    label: "Character / actor",
    hint: "128×192 standing figure (PNG, feet at bottom)",
    genWidth: 128,
    genHeight: 192,
    pixelWidth: 64,
    outputWidth: 128,
    outputHeight: 192,
    mime: "image/png" as const,
    style: "rd_fast__game_asset",
    filename: "character.png",
    removeBg: true,
  },
  comic: {
    label: "Comic panel",
    hint: "800×544 panel",
    genWidth: 256,
    genHeight: 176,
    pixelWidth: 200,
    outputWidth: 800,
    outputHeight: 544,
    mime: "image/jpeg" as const,
    style: "rd_fast__retro",
    filename: "comic-panel.jpg",
  },
} as const;

export type AssetPresetId = keyof typeof ASSET_PRESETS;

export { DEFAULT_GAME_PALETTE };
