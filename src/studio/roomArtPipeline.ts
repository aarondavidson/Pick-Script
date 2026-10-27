/**
 * Room art pipeline — resize to 1920×1080, optional pixel palette/dither.
 */

import {
  DEFAULT_GAME_PALETTE,
  pixelate,
  type DitherMode,
} from "@/studio/pixelate";
import { assertImageFile } from "@/engine/security";

export const ROOM_ART_WIDTH = 1920;
export const ROOM_ART_HEIGHT = 1080;

export type RoomArtFit = "cover" | "contain";

export interface PrepareRoomArtOptions {
  /** cover = crop to fill; contain = letterbox (default cover) */
  fit?: RoomArtFit;
  /** Apply pixelate + palette after resize */
  pixelate?: boolean;
  dither?: DitherMode;
  useGamePalette?: boolean;
  /** Logical pixel width when pixelating (default 320) */
  pixelWidth?: number;
}

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

/**
 * Decode → fit into 1920×1080 → JPEG/PNG data URL.
 * Optionally pixelate with the studio game palette.
 */
export async function prepareRoomArt(
  file: File,
  options?: PrepareRoomArtOptions
): Promise<{ dataUrl: string; width: number; height: number }> {
  assertImageFile(file);
  const fit = options?.fit ?? "cover";
  const doPixel = options?.pixelate === true;

  if (typeof document === "undefined" || typeof Image === "undefined") {
    const raw = await readFileAsDataUrl(file);
    return { dataUrl: raw, width: ROOM_ART_WIDTH, height: ROOM_ART_HEIGHT };
  }

  const img = await loadImageFromFile(file);
  const canvas = document.createElement("canvas");
  canvas.width = ROOM_ART_WIDTH;
  canvas.height = ROOM_ART_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    const raw = await readFileAsDataUrl(file);
    return { dataUrl: raw, width: ROOM_ART_WIDTH, height: ROOM_ART_HEIGHT };
  }

  ctx.fillStyle = "#1a1a1e";
  ctx.fillRect(0, 0, ROOM_ART_WIDTH, ROOM_ART_HEIGHT);

  const scale =
    fit === "contain"
      ? Math.min(ROOM_ART_WIDTH / img.width, ROOM_ART_HEIGHT / img.height)
      : Math.max(ROOM_ART_WIDTH / img.width, ROOM_ART_HEIGHT / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  const x = (ROOM_ART_WIDTH - w) / 2;
  const y = (ROOM_ART_HEIGHT - h) / 2;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, x, y, w, h);

  if (doPixel) {
    const pixelWidth = options?.pixelWidth ?? 320;
    const pixelHeight = Math.round(
      (pixelWidth * ROOM_ART_HEIGHT) / ROOM_ART_WIDTH
    );
    const out = await pixelate(canvas, {
      pixelWidth,
      pixelHeight,
      dither: options?.dither ?? "floyd-steinberg",
      palette: options?.useGamePalette === false ? null : DEFAULT_GAME_PALETTE,
      outputWidth: ROOM_ART_WIDTH,
      outputHeight: ROOM_ART_HEIGHT,
    });
    return {
      dataUrl: out.toDataURL("image/png"),
      width: ROOM_ART_WIDTH,
      height: ROOM_ART_HEIGHT,
    };
  }

  const srcType = (file.type || "").toLowerCase();
  const usePng =
    srcType.includes("png") ||
    srcType.includes("webp") ||
    srcType.includes("gif");
  const dataUrl = usePng
    ? canvas.toDataURL("image/png")
    : canvas.toDataURL("image/jpeg", 0.88);
  return { dataUrl, width: ROOM_ART_WIDTH, height: ROOM_ART_HEIGHT };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
