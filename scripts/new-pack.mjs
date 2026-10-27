#!/usr/bin/env node
/**
 * Scaffold a new adventure pack from src/games/_template.
 *
 * Usage:
 *   npm run new-pack -- my-game
 *   npm run new-pack -- my-game --title "My Game"
 *
 * Then: npm run dev → /play/my-game
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const gamesDir = path.join(root, "src", "games");
const templateDir = path.join(gamesDir, "_template");
const registryPath = path.join(gamesDir, "registry.ts");

function usage(msg) {
  if (msg) console.error(`Error: ${msg}\n`);
  console.error(
    `Usage: npm run new-pack -- <pack-id> [--title "Display Title"]`
  );
  console.error(
    `  pack-id  lowercase slug (letters, numbers, hyphens), e.g. haunted-diner`
  );
  process.exit(1);
}

function toTitle(slug) {
  return slug
    .split(/[-_]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

/** haunted-diner → hauntedDinerGame */
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

function parseArgs(argv) {
  const args = argv.slice(2);
  let id = null;
  let title = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--title") {
      title = args[++i];
      continue;
    }
    if (args[i] === "--help" || args[i] === "-h") usage();
    if (!id) id = args[i];
    else usage(`Unexpected argument: ${args[i]}`);
  }
  return { id, title };
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

function main() {
  const { id, title: titleArg } = parseArgs(process.argv);
  if (!id) usage("pack-id is required");
  if (!/^[a-z][a-z0-9-]*$/.test(id)) {
    usage("pack-id must be a lowercase slug (start with a letter)");
  }
  if (
    ["template", "_template", "attic-study", "harbor-fog", "registry"].includes(
      id
    )
  ) {
    usage(`reserved id: ${id}`);
  }

  const dest = path.join(gamesDir, id);
  if (fs.existsSync(dest)) {
    usage(`directory already exists: src/games/${id}`);
  }
  if (!fs.existsSync(templateDir)) {
    usage("missing template at src/games/_template");
  }

  const title = titleArg?.trim() || toTitle(id);
  const camel = toExportName(id);

  copyDir(templateDir, dest);

  const manifestPath = path.join(dest, "manifest.ts");
  let manifest = fs.readFileSync(manifestPath, "utf8");
  manifest = manifest
    .replace(
      /export const templateGame: GameDefinition = \{/,
      `export const ${camel}: GameDefinition = {`
    )
    .replace(/id: "template-adventure"/, `id: "${id}"`)
    .replace(/title: "Untitled Adventure"/, `title: ${JSON.stringify(title)}`)
    .replace(
      /subtitle: "A point-and-click starter pack"/,
      `subtitle: "A point-and-click adventure"`
    )
    .replace(/export default templateGame;/, `export default ${camel};`);
  fs.writeFileSync(manifestPath, manifest);

  fs.writeFileSync(
    path.join(dest, "index.ts"),
    `export { ${camel} } from "./manifest";\nexport { ${camel} as default } from "./manifest";\n`
  );

  fs.mkdirSync(path.join(dest, "assets", "items"), { recursive: true });
  fs.writeFileSync(
    path.join(dest, "assets", "items", ".gitkeep"),
    "# Drop 256×256 item icons here and Vite-import them (set item.icon or definition.itemIcons).\n"
  );

  fs.writeFileSync(
    path.join(dest, "README.md"),
    `# ${title}

Pack id: \`${id}\`

## Run

\`\`\`sh
npm run dev
# http://localhost:8080/play/${id}
\`\`\`

## Authoring

- Edit \`manifest.ts\` for rooms, actors, puzzles
- Put art in \`assets/\` (room JPG 1920×1080, icons in \`assets/items/\`)
- Set \`item.icon\` or \`definition.itemIcons\` — host UI does not hardcode pack art
- Asset specs: [\`../../engine/ASSETS.md\`](../../engine/ASSETS.md)
- Full guide: [\`../../engine/PACKS.md\`](../../engine/PACKS.md)
- Teaching pack: [\`../attic-study/WALKTHROUGH.md\`](../attic-study/WALKTHROUGH.md)
- Puzzle recipes: [\`../../docs/RECIPES.md\`](../../docs/RECIPES.md) (\`/recipes\`)
- Author mode in play: Ctrl+Shift+H (hotspot %, flags)

Scaffolded with \`npm run new-pack -- ${id}\`.

Verify: \`npm run verify\`
`
  );

  let registry = fs.readFileSync(registryPath, "utf8");
  if (!registry.includes(`from "./${id}/manifest"`)) {
    const importLine = `import { ${camel} } from "./${id}/manifest";\n`;
    const importMatch = registry.match(/^(?:import .+;\n)+/);
    if (!importMatch) usage("could not find imports in registry.ts");
    const insertAt = importMatch[0].length;
    registry =
      registry.slice(0, insertAt) + importLine + registry.slice(insertAt);

    const entry = `  {
    id: ${camel}.id,
    title: ${camel}.title,
    subtitle: ${camel}.subtitle,
    version: ${camel}.version,
    blurb: "New adventure pack — edit this blurb in registry.ts.",
    definition: ${camel},
  },
`;
    // Append before catalog close so featured packs (e.g. attic-study) stay first
    const closeIdx = registry.indexOf("\n];", registry.indexOf("gameCatalog"));
    if (closeIdx < 0) usage("could not find end of gameCatalog in registry.ts");
    // The last existing entry may lack a trailing comma — add one so the result parses.
    let head = registry.slice(0, closeIdx).trimEnd();
    if (!head.endsWith(",") && !head.endsWith("[")) head += ",";
    registry = head + "\n" + entry.trimEnd() + registry.slice(closeIdx);
    fs.writeFileSync(registryPath, registry);
  }

  console.log(`
Created pack: src/games/${id}/
  export: ${camel}
  play:   /play/${id}

Next:
  1. Edit src/games/${id}/manifest.ts  (or paste from /recipes)
  2. npm run verify
  3. npm run dev → http://localhost:8080/play/${id}
  4. Author mode: Ctrl+Shift+H · recipes: /recipes
`);
}

main();
