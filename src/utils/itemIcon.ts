import type { GameItem } from "@/engine";
import { isSafePlayMediaUrl } from "@/engine/security";

/** Tiny neutral PNG placeholder when a pack omits an icon (safe for <img>). */
export const PLACEHOLDER_ITEM_ICON =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

/**
 * Resolve inventory art for a pack item.
 * Order: `item.icon` URL → pack `itemIcons[id]` → neutral placeholder.
 * Play-safe allowlist (no SVG data URLs).
 */
export function resolveItemIcon(
  item: Pick<GameItem, "id" | "icon">,
  packIcons?: Record<string, string> | null
): string {
  const icon = item.icon;
  if (typeof icon === "string" && isSafePlayMediaUrl(icon)) {
    return icon;
  }
  if (
    typeof icon === "string" &&
    packIcons?.[icon] &&
    isSafePlayMediaUrl(packIcons[icon])
  ) {
    return packIcons[icon]!;
  }
  if (packIcons?.[item.id] && isSafePlayMediaUrl(packIcons[item.id])) {
    return packIcons[item.id]!;
  }
  return PLACEHOLDER_ITEM_ICON;
}
