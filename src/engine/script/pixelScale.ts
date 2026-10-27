/**
 * S.C.R.I.P.T. pillar — 2D framebuffer & pixel scaler.
 * Integer-friendly scale factors + CSS for crisp room art.
 */

export interface NativeFramebufferSize {
  width: number;
  height: number;
}

/** Default logical framebuffer (16:9 adventure canvas). */
export const DEFAULT_NATIVE_SIZE: NativeFramebufferSize = {
  width: 640,
  height: 360,
};

/**
 * Largest integer scale that fits native art into a container
 * without upscaling past the container (SCUMM-style integer blit).
 */
export function integerScaleFactor(
  containerWidth: number,
  containerHeight: number,
  native: NativeFramebufferSize = DEFAULT_NATIVE_SIZE
): number {
  if (containerWidth <= 0 || containerHeight <= 0) return 1;
  if (native.width <= 0 || native.height <= 0) return 1;
  const sx = Math.floor(containerWidth / native.width);
  const sy = Math.floor(containerHeight / native.height);
  return Math.max(1, Math.min(sx, sy));
}

export interface PixelBackgroundStyleOpts {
  /** When true, use crisp nearest-neighbor scaling */
  crisp?: boolean;
}

export interface PixelCss {
  imageRendering: "auto" | "pixelated" | "crisp-edges";
}

/** CSS for room background layers. */
export function pixelBackgroundStyle(
  opts: PixelBackgroundStyleOpts = {}
): PixelCss {
  if (!opts.crisp) {
    return { imageRendering: "auto" };
  }
  return { imageRendering: "pixelated" };
}
