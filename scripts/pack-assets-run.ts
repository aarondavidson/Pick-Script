/**
 * vite-node entry for `npm run pack-assets`.
 * Args: <file.pack.json> <outDir>
 */

import fs from "node:fs";
import path from "node:path";
import { parseJsonPack } from "../src/engine/jsonPack";
import { externalizePackAssets } from "../src/engine/packAssets";
import { safeJsonParse } from "../src/engine/security";

const [file, outDir] = process.argv.slice(2).filter((a) => !a.startsWith("-"));
if (!file || !outDir) {
  console.error("Missing <file.pack.json> or <outDir>");
  process.exit(2);
}

let doc;
try {
  doc = parseJsonPack(safeJsonParse(fs.readFileSync(file, "utf8")));
} catch (e) {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(2);
}

const before = fs.statSync(file).size;
const out = externalizePackAssets(doc);
fs.mkdirSync(path.join(outDir, "assets"), { recursive: true });
for (const [rel, bytes] of Object.entries(out.files)) {
  const target = path.join(outDir, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, bytes);
}
const packPath = path.join(outDir, "pack.json");
fs.writeFileSync(packPath, JSON.stringify(out.doc, null, 2));

const kb = (n: number) => `${(n / 1024).toFixed(1)} KB`;
console.log(
  `pack-assets OK — ${Object.keys(out.files).length} file(s) → ${path.join(outDir, "assets")}`
);
console.log(`  pack.json  ${kb(before)} → ${kb(fs.statSync(packPath).size)}`);
console.log(
  `  host the folder, then play: /play?packUrl=https://<your-host>/<folder>/pack.json`
);
