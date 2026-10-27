#!/usr/bin/env node
/**
 * Import a Studio .pack.json into src/games/<id>/ with extracted assets
 * and register it in the launcher catalog.
 *
 * Usage:
 *   npm run pack-from-json -- ./my-game.pack.json
 *   npm run pack-from-json -- ./my-game.pack.json --id custom-id --force
 *
 * Then: npm run verify && npm run dev → /play/<id>
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const gamesDir = path.join(root, "src", "games");
const registryPath = path.join(gamesDir, "registry.ts");

function usage(msg) {
  if (msg) console.error(`Error: ${msg}\n`);
  console.error(
    `Usage: npm run pack-from-json -- <file.pack.json> [--id slug] [--force]`
  );
  process.exit(1);
}

function toExportName(slug) {
  const camel = slug
    .split(/[-_]+/)
    .filter(Boolean)
    .map((p, i) =>
      i === 0 ? p.toLowerCase() : p.charAt(0).toUpperCase() + p.slice(1)
    )
    .join("");
  return `${camel}Game`;
}

function suggestId(name, fallback = "asset") {
  const s = String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 48);
  return s || fallback;
}

function parseArgs(argv) {
  const args = argv.slice(2);
  let file = null;
  let id = null;
  let force = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--id") {
      id = args[++i];
      continue;
    }
    if (args[i] === "--force") {
      force = true;
      continue;
    }
    if (args[i] === "--help" || args[i] === "-h") usage();
    if (!file) file = args[i];
    else usage(`Unexpected argument: ${args[i]}`);
  }
  return { file, id, force };
}

function decodeDataUrl(dataUrl) {
  const m = String(dataUrl).match(/^data:([^;,]+);base64,(.+)$/i);
  if (!m) return null;
  const mime = m[1].toLowerCase();
  const buf = Buffer.from(m[2], "base64");
  let ext = "bin";
  if (mime.includes("png")) ext = "png";
  else if (mime.includes("jpeg") || mime.includes("jpg")) ext = "jpg";
  else if (mime.includes("webp")) ext = "webp";
  else if (mime.includes("gif")) ext = "gif";
  return { mime, buf, ext };
}

function registerInCatalog(id, exportName, title) {
  let registry = fs.readFileSync(registryPath, "utf8");
  if (registry.includes(`from "./${id}/manifest"`)) {
    console.log(`registry.ts already imports ${id} — left unchanged`);
    return;
  }
  const importLine = `import { ${exportName} } from "./${id}/manifest";\n`;
  const importMatch = registry.match(/^(?:import .+;\n)+/);
  if (!importMatch) usage("could not find imports in registry.ts");
  const insertAt = importMatch[0].length;
  registry =
    registry.slice(0, insertAt) + importLine + registry.slice(insertAt);

  const entry = `  {
    id: ${exportName}.id,
    title: ${exportName}.title,
    subtitle: ${exportName}.subtitle,
    version: ${exportName}.version,
    blurb: ${JSON.stringify(`Imported from Studio (.pack.json) — ${title}.`)},
    definition: ${exportName},
  },
`;
  const closeIdx = registry.indexOf("\n];", registry.indexOf("gameCatalog"));
  if (closeIdx < 0) usage("could not find end of gameCatalog in registry.ts");
  // The last existing entry may lack a trailing comma — add one so the result parses.
  let head = registry.slice(0, closeIdx).trimEnd();
  if (!head.endsWith(",") && !head.endsWith("[")) head += ",";
  registry = head + "\n" + entry.trimEnd() + registry.slice(closeIdx);
  fs.writeFileSync(registryPath, registry);
  console.log(`Registered ${id} in src/games/registry.ts`);
}

function main() {
  const { file, id: idArg, force } = parseArgs(process.argv);
  if (!file) usage("pack json path is required");
  const abs = path.resolve(process.cwd(), file);
  if (!fs.existsSync(abs)) usage(`file not found: ${abs}`);

  let doc;
  try {
    doc = JSON.parse(fs.readFileSync(abs, "utf8"));
  } catch (e) {
    usage(`invalid JSON: ${e.message}`);
  }
  if (!doc || typeof doc !== "object" || !doc.rooms) {
    usage("not a JsonPackDocument (missing rooms)");
  }

  const id = (idArg || doc.id || "").trim();
  if (!/^[a-z][a-z0-9-]*$/.test(id)) {
    usage("pack id must be a lowercase slug (use --id)");
  }
  if (
    ["template", "_template", "attic-study", "harbor-fog", "registry"].includes(
      id
    )
  ) {
    usage(`reserved id: ${id}`);
  }

  const dest = path.join(gamesDir, id);
  if (fs.existsSync(dest) && !force) {
    usage(`directory exists: src/games/${id} (pass --force to overwrite)`);
  }
  fs.mkdirSync(path.join(dest, "assets"), { recursive: true });

  const assetImports = [];
  const roomImageIdents = {};
  const itemIconIdents = {};

  for (const room of Object.values(doc.rooms || {})) {
    if (!room?.id) continue;
    const decoded = room.image ? decodeDataUrl(room.image) : null;
    if (!decoded) continue;
    const base = `${suggestId(room.id, "room")}.${decoded.ext}`;
    const filePath = path.join(dest, "assets", base);
    fs.writeFileSync(filePath, decoded.buf);
    const ident = `${suggestId(room.id, "room")}Img`;
    assetImports.push(`import ${ident} from "./assets/${base}";`);
    roomImageIdents[room.id] = ident;
    console.log(`  wrote assets/${base}`);
  }

  for (const [itemId, item] of Object.entries(doc.items || {})) {
    const decoded = item?.icon ? decodeDataUrl(item.icon) : null;
    if (!decoded) continue;
    const base = `item_${suggestId(itemId, "item")}.${decoded.ext}`;
    fs.writeFileSync(path.join(dest, "assets", base), decoded.buf);
    const ident = `${suggestId(itemId, "item")}Icon`;
    assetImports.push(`import ${ident} from "./assets/${base}";`);
    itemIconIdents[itemId] = ident;
    console.log(`  wrote assets/${base}`);
  }

  // Strip embedded data URLs from the stored pack.json (paths restored in manifest)
  const packForDisk = structuredClone(doc);
  packForDisk.id = id;
  for (const room of Object.values(packForDisk.rooms || {})) {
    if (room?.image && String(room.image).startsWith("data:")) {
      room.image = "";
    }
    for (const h of room.hotspots || []) {
      if (h.itemIcon && String(h.itemIcon).startsWith("data:")) {
        delete h.itemIcon;
      }
    }
  }
  for (const item of Object.values(packForDisk.items || {})) {
    if (item?.icon && String(item.icon).startsWith("data:")) {
      delete item.icon;
    }
  }
  fs.writeFileSync(
    path.join(dest, "pack.json"),
    JSON.stringify(packForDisk, null, 2) + "\n"
  );

  const exportName = toExportName(id);
  const roomsAssign = Object.keys(roomImageIdents)
    .map(
      (rid) =>
        `  if (pack.rooms[${JSON.stringify(rid)}]) pack.rooms[${JSON.stringify(rid)}].image = ${roomImageIdents[rid]};`
    )
    .join("\n");
  const itemsAssign = Object.keys(itemIconIdents)
    .map(
      (iid) =>
        `  if (pack.items?.[${JSON.stringify(iid)}]) pack.items[${JSON.stringify(iid)}].icon = ${itemIconIdents[iid]};`
    )
    .join("\n");

  const manifest = `/**
 * Generated by npm run pack-from-json from Studio .pack.json
 * Edit pack.json or re-import; keep assets/ in sync.
 */
import type { GameDefinition } from "@/engine";
import { createGameFromJson, type JsonPackDocument } from "@/engine/jsonPack";
import packJson from "./pack.json";
${assetImports.join("\n")}

const pack = structuredClone(packJson) as JsonPackDocument;
${roomsAssign}
${itemsAssign}

export const ${exportName}: GameDefinition = createGameFromJson(pack);
export default ${exportName};
`;

  fs.writeFileSync(path.join(dest, "manifest.ts"), manifest);
  fs.writeFileSync(
    path.join(dest, "index.ts"),
    `export { ${exportName} } from "./manifest";\nexport { ${exportName} as default } from "./manifest";\n`
  );
  fs.writeFileSync(
    path.join(dest, "README.md"),
    `# ${doc.title || id}

Imported from Studio via \`npm run pack-from-json\`.

\`\`\`sh
npm run verify
npm run dev
# → /play/${id}
\`\`\`
`
  );

  // Ensure resolveJsonModule works — vite/ts already handle JSON imports in this repo
  registerInCatalog(id, exportName, doc.title || id);

  console.log(`
Created pack: src/games/${id}/
  play: /play/${id}

Next:
  1. npm run verify
  2. npm run dev → http://localhost:8080/play/${id}
`);
}

main();
