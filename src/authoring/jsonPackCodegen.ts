/**
 * Codegen: JsonPackDocument → paste-ready TypeScript (visual admin bridge).
 * Images become Vite import path stubs so authors aren't stuck hunting data URLs.
 */

import {
  formatHotspotDraft,
  suggestId,
  type DraftHotspot,
  type HotspotKind,
} from "@/authoring/codegen";
import type {
  JsonPackDocument,
  JsonPackHotspot,
  JsonPackRoom,
} from "@/engine/jsonPack";

function exportNameFromId(id: string): string {
  const camel = id
    .split(/[-_]+/)
    .filter(Boolean)
    .map((p, i) =>
      i === 0 ? p.toLowerCase() : p.charAt(0).toUpperCase() + p.slice(1)
    )
    .join("");
  return `${camel || "pack"}Game`;
}

/** Keep kebab-case pack ids (`attic-study`) for `src/games/<id>/`. */
function gameFolderId(doc: JsonPackDocument): string {
  const raw = (doc.id || "my-game").trim().toLowerCase();
  const cleaned = raw
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return cleaned || "my-game";
}

function hotspotToDraft(h: JsonPackHotspot): DraftHotspot {
  const kind = (h.kind || "interact") as HotspotKind;
  return {
    id: h.id,
    name: h.name,
    x: h.x,
    y: h.y,
    width: h.width,
    height: h.height,
    verbs: h.verbs?.length ? h.verbs : kind === "character" ? ["look", "talk"] : ["look", "use"],
    kind,
    itemId: h.itemId,
    itemName: h.itemName,
    itemDescription: h.itemDescription,
    lookText: h.lookText,
    actorId: h.actorId,
    interactSound: h.interactSound,
    useWithSound: h.useWithSound,
  };
}

function assetBasename(room: JsonPackRoom): string {
  return `${suggestId(room.id, "room")}.jpg`;
}

/**
 * Emit a TypeScript pack module that loads via `createGameFromJson`.
 * Room images are referenced as `./assets/<room>.jpg` stubs (not data URLs).
 */
export function formatJsonPackAsManifestTs(doc: JsonPackDocument): string {
  const exportName = exportNameFromId(doc.id);
  const assetImports: string[] = [];
  const roomImageMap: Record<string, string> = {};

  for (const room of Object.values(doc.rooms)) {
    const file = assetBasename(room);
    const ident = `${suggestId(room.id, "room")}Img`;
    assetImports.push(`import ${ident} from "./assets/${file}";`);
    roomImageMap[room.id] = ident;
  }

  const roomsForJson = Object.fromEntries(
    Object.entries(doc.rooms).map(([id, room]) => [
      id,
      {
        ...room,
        image: `__IMG_${id}__`,
      },
    ])
  );

  const packLiteral = JSON.stringify(
    {
      schemaVersion: doc.schemaVersion,
      id: doc.id,
      title: doc.title,
      subtitle: doc.subtitle,
      version: doc.version,
      startRoom: doc.startRoom,
      verbMode: doc.verbMode,
      audio: doc.audio,
      rooms: roomsForJson,
      links: doc.links ?? [],
      combinations: doc.combinations ?? {},
      initialFlags: doc.initialFlags ?? {},
      mapGroups: doc.mapGroups,
      mapFastTravel: doc.mapFastTravel,
    },
    null,
    2
  );

  let packBody = packLiteral;
  for (const [roomId, ident] of Object.entries(roomImageMap)) {
    packBody = packBody.replace(
      `"image": "__IMG_${roomId}__"`,
      `image: ${ident}`
    );
  }

  const hotspotSnippets = Object.values(doc.rooms)
    .flatMap((room) =>
      (room.hotspots ?? []).map(
        (h) =>
          `// rooms.${room.id} — ${h.name}\n${formatHotspotDraft(hotspotToDraft(h))}`
      )
    )
    .join("\n\n");

  const linkComments = (doc.links ?? [])
    .map(
      (l) =>
        `// linkRooms("${l.from}", "${l.to}", { direction: "${l.direction || "east"}", fromLabel: ${JSON.stringify(l.fromLabel)}, toLabel: ${JSON.stringify(l.toLabel)}${l.requireFlag ? `, requireFlag: "${l.requireFlag}"` : ""} })`
    )
    .join("\n");

  return `/**
 * Generated from Studio Pack (.pack.json → TS).
 * 1. Save room JPGs under ./assets/ as named in the imports
 * 2. Register in src/games/registry.ts
 * 3. npm run verify
 *
 * Prefer keeping the .pack.json for path-free play; this file is the
 * advanced TypeScript bridge (visual admin plan).
 */
import type { GameDefinition } from "@/engine";
import { createGameFromJson, type JsonPackDocument } from "@/engine/jsonPack";
${assetImports.join("\n")}

const packDocument = ${packBody} satisfies JsonPackDocument;

export const ${exportName}: GameDefinition = createGameFromJson(packDocument);

export default ${exportName};

/* --- Expanded hotspot drafts (optional paste into a hand-written room) ---
${hotspotSnippets || "// (no hotspots yet)"}

${linkComments || "// (no links yet)"}
*/
`;
}

/** List expected asset filenames for the pack (no hunting). */
export function listJsonPackAssetFiles(doc: JsonPackDocument): string[] {
  return Object.values(doc.rooms).map((r) => `assets/${assetBasename(r)}`);
}

/** Registry paste snippet for `src/games/registry.ts`. */
export function formatJsonPackRegistrySnippet(doc: JsonPackDocument): string {
  const exportName = exportNameFromId(doc.id);
  const folder = gameFolderId(doc);
  const blurb =
    doc.subtitle?.trim() ||
    `${doc.title || folder} — exported from Studio Pack.`;
  return `import { ${exportName} } from "./${folder}";

// Append inside gameCatalog:
{
  id: ${exportName}.id,
  title: ${exportName}.title,
  subtitle: ${exportName}.subtitle,
  version: ${exportName}.version,
  blurb: ${JSON.stringify(blurb)},
  definition: ${exportName},
},
`;
}

/**
 * Full `src/games/<id>/` folder contents for ship (manifest + stubs + registry paste).
 * Relative paths are rooted at the game folder, except `REGISTRY_SNIPPET.ts.txt`
 * which sits beside the folder (paste into registry.ts).
 */
export function formatJsonPackAsGameFolder(
  doc: JsonPackDocument
): { folderId: string; files: Record<string, string> } {
  const folder = gameFolderId(doc);
  const exportName = exportNameFromId(doc.id);
  const base = `src/games/${folder}`;
  const assets = listJsonPackAssetFiles(doc);
  const assetLines =
    assets.length > 0
      ? assets.map((a) => `- \`${a.replace(/^assets\//, "")}\``).join("\n")
      : "- _(no room images yet — add a room and re-export)_";

  const readme = `# ${doc.title || folder}

Studio export of pack \`${doc.id}\`.

| | |
|---|---|
| Play (after register) | \`/play/${folder}\` |
| Manifest | \`manifest.ts\` |

## Next steps

1. Drop room JPGs under \`assets/\` (names listed in \`assets/README.md\`)
2. Paste \`REGISTRY_SNIPPET.ts.txt\` into \`src/games/registry.ts\`
3. \`npm run verify\`

Prefer keeping the \`.pack.json\` for path-free play; this folder is the TypeScript ship bridge.
`;

  const assetsReadme = `# Assets

Expected room images for \`${folder}\` (from Studio export):

${assetLines}

Place files next to this README (\`src/games/${folder}/assets/\`).
`;

  const indexTs = `export { ${exportName} } from "./manifest";
export { ${exportName} as default } from "./manifest";
`;

  return {
    folderId: folder,
    files: {
      [`${base}/manifest.ts`]: formatJsonPackAsManifestTs(doc),
      [`${base}/index.ts`]: indexTs,
      [`${base}/README.md`]: readme,
      [`${base}/assets/README.md`]: assetsReadme,
      "REGISTRY_SNIPPET.ts.txt": formatJsonPackRegistrySnippet(doc),
    },
  };
}
