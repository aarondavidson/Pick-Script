/**
 * Studio pack draft — mutators + play handoff.
 * Draft body persistence lives in `packDraftIdb.ts` (IndexedDB primary).
 */

import {
  parseJsonPack,
  type JsonPackDocument,
  type JsonPackHotspot,
  type JsonPackLink,
  type JsonPackRoom,
} from "@/engine/jsonPack";
import { suggestId } from "@/authoring/codegen";
import { assertImageFile, safeJsonParse } from "@/engine/security";

/** localStorage key used only as IDB fallback mirror (see packDraftIdb). */
export const STUDIO_PACK_DRAFT_KEY = "studio-pack-draft-v1";
/** Written before navigating to /play/studio-draft */
export const STUDIO_PACK_PLAY_KEY = "studio-pack-play";

export function preparePlayDraft(doc: JsonPackDocument): void {
  sessionStorage.setItem(STUDIO_PACK_PLAY_KEY, JSON.stringify(doc));
}

export function loadPlayDraft(): JsonPackDocument | null {
  try {
    const raw = sessionStorage.getItem(STUDIO_PACK_PLAY_KEY);
    if (!raw) return null;
    return parseJsonPack(safeJsonParse(raw));
  } catch {
    return null;
  }
}

export function addRoom(
  doc: JsonPackDocument,
  name: string
): JsonPackDocument {
  const id = suggestId(name, `room_${Object.keys(doc.rooms).length + 1}`);
  let roomId = id;
  if (doc.rooms[roomId]) roomId = `${id}_${Date.now().toString(36)}`;
  const room: JsonPackRoom = {
    id: roomId,
    name: name.trim() || roomId,
    description: "",
    image: "",
    music: doc.audio?.defaultMusic,
    hotspots: [],
  };
  return {
    ...doc,
    rooms: { ...doc.rooms, [roomId]: room },
  };
}

export function updateRoom(
  doc: JsonPackDocument,
  roomId: string,
  patch: Partial<JsonPackRoom>
): JsonPackDocument {
  const prev = doc.rooms[roomId];
  if (!prev) return doc;
  return {
    ...doc,
    rooms: {
      ...doc.rooms,
      [roomId]: { ...prev, ...patch, id: roomId },
    },
  };
}

export function removeRoom(
  doc: JsonPackDocument,
  roomId: string
): JsonPackDocument {
  if (Object.keys(doc.rooms).length <= 1) return doc;
  const rooms = { ...doc.rooms };
  delete rooms[roomId];
  const links = (doc.links ?? []).filter(
    (l) => l.from !== roomId && l.to !== roomId
  );
  const startRoom =
    doc.startRoom === roomId ? Object.keys(rooms)[0]! : doc.startRoom;
  return { ...doc, rooms, links, startRoom };
}

export function setRoomHotspots(
  doc: JsonPackDocument,
  roomId: string,
  hotspots: JsonPackHotspot[]
): JsonPackDocument {
  return updateRoom(doc, roomId, { hotspots });
}

export function upsertLink(
  doc: JsonPackDocument,
  link: JsonPackLink
): JsonPackDocument {
  const rest = (doc.links ?? []).filter(
    (l) =>
      !(
        (l.from === link.from && l.to === link.to) ||
        (l.from === link.to && l.to === link.from)
      )
  );
  return { ...doc, links: [...rest, link] };
}

export function removeLink(
  doc: JsonPackDocument,
  from: string,
  to: string
): JsonPackDocument {
  return {
    ...doc,
    links: (doc.links ?? []).filter(
      (l) =>
        !(
          (l.from === from && l.to === to) ||
          (l.from === to && l.to === from)
        )
    ),
  };
}

/** Download a self-contained .pack.json (assets as data URLs). */
export function downloadPackJson(doc: JsonPackDocument, filename?: string): void {
  const blob = new Blob([JSON.stringify(doc, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || `${doc.id || "pack"}.pack.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Download Studio pack as a `src/games/<id>/` folder zip (fflate).
 * Falls back to `manifest.ts` + `SHIP.txt` if zip fails.
 */
export async function downloadGameFolderZip(
  doc: JsonPackDocument
): Promise<"zip" | "fallback"> {
  const {
    formatJsonPackAsGameFolder,
    formatJsonPackAsManifestTs,
    listJsonPackAssetFiles,
    formatJsonPackRegistrySnippet,
  } = await import("@/authoring/jsonPackCodegen");
  const { folderId, files } = formatJsonPackAsGameFolder(doc);

  try {
    const { zipSync, strToU8 } = await import("fflate");
    const zipped: Record<string, Uint8Array> = {};
    for (const [path, text] of Object.entries(files)) {
      zipped[path] = strToU8(text);
    }
    const out = zipSync(zipped, { level: 6 });
    triggerDownload(
      new Blob([out], { type: "application/zip" }),
      `${folderId}-game-folder.zip`
    );
    return "zip";
  } catch {
    triggerDownload(
      new Blob([formatJsonPackAsManifestTs(doc)], { type: "text/plain" }),
      `${folderId}-manifest.ts`
    );
    const ship = `SHIP — ${doc.title || folderId}
====================

1. Create src/games/${folderId}/ and save the companion manifest.ts there.
2. Room assets to add under src/games/${folderId}/assets/:
${listJsonPackAssetFiles(doc)
  .map((a) => `   - ${a.replace(/^assets\//, "")}`)
  .join("\n") || "   (none yet)"}

3. Paste this into src/games/registry.ts:

${formatJsonPackRegistrySnippet(doc)}
`;
    triggerDownload(
      new Blob([ship], { type: "text/plain" }),
      `${folderId}-SHIP.txt`
    );
    return "fallback";
  }
}

/** Image → data URL with automatic downscale (keeps pack catalogs small). */
export async function fileToDataUrl(file: File): Promise<string> {
  assertImageFile(file);
  const { fileToShrunkDataUrl } = await import("@/studio/imageShrink");
  return fileToShrunkDataUrl(file);
}
