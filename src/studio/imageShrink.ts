/**
 * Shrink images before embedding as data URLs in pack drafts.
 * Keeps IDB / installed-pack catalogs under STORAGE_LIMITS.
 */

export interface ShrinkImageOptions {
  /** Longest edge in CSS pixels (default 1280) */
  maxEdge?: number;
  /** JPEG quality 0–1 (default 0.82) */
  quality?: number;
  /** Prefer PNG when source has alpha (default true) */
  preserveAlpha?: boolean;
}

const DEFAULT_MAX_EDGE = 1280;
const DEFAULT_QUALITY = 0.82;

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not decode image"));
    };
    img.src = url;
  });
}

function canvasToDataUrl(
  canvas: HTMLCanvasElement,
  mime: string,
  quality: number
): string {
  try {
    return canvas.toDataURL(mime, quality);
  } catch {
    return canvas.toDataURL("image/jpeg", quality);
  }
}

/**
 * Decode → optional downscale → JPEG/PNG data URL.
 * Falls back to FileReader raw data URL when Canvas is unavailable (SSR/tests).
 */
export async function fileToShrunkDataUrl(
  file: File,
  options?: ShrinkImageOptions
): Promise<string> {
  const maxEdge = options?.maxEdge ?? DEFAULT_MAX_EDGE;
  const quality = options?.quality ?? DEFAULT_QUALITY;
  const preserveAlpha = options?.preserveAlpha !== false;

  if (typeof document === "undefined" || typeof Image === "undefined") {
    return readFileAsDataUrl(file);
  }

  const img = await loadImageFromFile(file);
  const { width, height } = img;
  if (!width || !height) return readFileAsDataUrl(file);

  const scale = Math.min(1, maxEdge / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return readFileAsDataUrl(file);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, w, h);

  const srcType = (file.type || "").toLowerCase();
  const usePng =
    preserveAlpha &&
    (srcType.includes("png") || srcType.includes("webp") || srcType.includes("gif"));

  if (usePng) {
    return canvasToDataUrl(canvas, "image/png", 1);
  }
  return canvasToDataUrl(canvas, "image/jpeg", quality);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
