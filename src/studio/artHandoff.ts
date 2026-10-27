import type { JsonPackDocument } from "@/engine/jsonPack";
import { suggestId } from "@/authoring/codegen";
import { ROOM_ART_HEIGHT, ROOM_ART_WIDTH } from "@/studio/roomArtPipeline";

export const IMAGE_GEN_STARTER_PATH = "docs/IMAGE-GEN-STARTER.md";

export const ART_HANDOFF_STARTER_BLURB = `AI art handoff (30-min funnel → short-mystery):
1. Start-room background → ${ROOM_ART_WIDTH}×${ROOM_ART_HEIGHT} JPG/WebP
   (short-mystery has 5 rooms — paint the hub first, then wings)
2. Key item icon → 256×256 (default id: harbor_key)
3. Optional reward icon → 256×256 (Attic-style second item)
Prompts + theme card: ${IMAGE_GEN_STARTER_PATH}
Then P.I.C.K. → Pack → Art handoff → Ship checklist → Play.`;

/** Prefer pack item ids (harbor_key / brass_key / locket) over Attic placeholders. */
export function guessArtHandoffIds(doc: JsonPackDocument): {
  keyId: string;
  rewardId: string;
} {
  const items = doc.items ?? {};
  let keyId = "harbor_key";
  if (items.harbor_key) keyId = "harbor_key";
  else if (items.brass_key) keyId = "brass_key";
  else {
    for (const room of Object.values(doc.rooms)) {
      const pickup = (room.hotspots ?? []).find(
        (h) => h.kind === "pickup" && h.itemId
      );
      if (pickup?.itemId) {
        keyId = pickup.itemId;
        break;
      }
    }
  }

  let rewardId = "reward";
  if (items.locket) rewardId = "locket";
  else if (items.silver_locket) rewardId = "silver_locket";
  else {
    const ids = Object.keys(items).filter((id) => id !== keyId);
    if (ids.length === 1) rewardId = ids[0]!;
  }

  return { keyId, rewardId };
}

export function upsertItemIcon(
  doc: JsonPackDocument,
  opts: { id: string; name: string; description?: string; icon: string }
): JsonPackDocument {
  const itemId = suggestId(opts.id, "item");
  const prev = doc.items?.[itemId];
  const items = {
    ...(doc.items ?? {}),
    [itemId]: {
      id: itemId,
      name: opts.name || prev?.name || itemId,
      description:
        opts.description || prev?.description || opts.name || itemId,
      icon: opts.icon,
    },
  };
  const rooms = { ...doc.rooms };
  for (const [rid, room] of Object.entries(rooms)) {
    const hotspots = (room.hotspots ?? []).map((h) =>
      h.kind === "pickup" && h.itemId === itemId
        ? { ...h, itemIcon: opts.icon }
        : h
    );
    rooms[rid] = { ...room, hotspots };
  }
  return { ...doc, items, rooms };
}

export function artHandoffItemLabel(
  role: "key" | "reward",
  id: string,
  existingName?: string
): string {
  if (existingName) return existingName;
  if (role === "key") {
    if (id === "harbor_key") return "Harbor Key";
    if (id === "brass_key") return "Brass Key";
    return "Key";
  }
  if (id === "locket") return "Silver Locket";
  return "Reward";
}
