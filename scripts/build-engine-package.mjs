#!/usr/bin/env node
/**
 * Build @portable-adventure/engine from the monorepo sources.
 *
 *   npm run build:package            build packages/engine/dist
 *   npm run build:package -- --pack  …and write the installable .tgz
 *
 * Steps:
 *   1. vite library build → dist/index.js, dist/style.css, type declarations
 *   2. sync the package's `dependencies` with what the bundle really imports
 *      (versions copied from the root package.json), so installs are complete
 *   3. copy the licence files next to the package
 *   4. verify the entry points exist; with --pack run `npm pack`
 */

import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkgDir = join(root, "packages", "engine");
const pack = process.argv.includes("--pack");

function fail(msg) {
  console.error(`build:package FAILED: ${msg}`);
  process.exit(1);
}
function run(cmd, args, cwd = root) {
  const r = spawnSync(cmd, args, { cwd, stdio: "inherit" });
  if (r.status !== 0) fail(`${cmd} ${args.join(" ")} exited ${r.status}`);
}

// 1. Build
run(join(root, "node_modules", ".bin", "vite"), [
  "build",
  "-c",
  join(pkgDir, "vite.config.ts"),
  "--logLevel",
  "warn",
]);

// 2. Dependencies = bare imports of the bundle
const rootPkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const pkgPath = join(pkgDir, "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
const bundle = readFileSync(join(pkgDir, "dist", "index.js"), "utf8");
const imported = new Set();
// Real import statements only (the bundle also contains code *text*, e.g.
// authoring snippets that mention imports)
for (const m of bundle.matchAll(
  /^\s*import\s+(?:[^"';]*?\s+from\s*)?["']([^"']+)["']/gm
)) {
  const spec = m[1];
  if (spec.startsWith(".") || spec.startsWith("/")) continue;
  if (spec.startsWith("@/")) fail(`bundle has an unresolved alias import: ${spec}`);
  const name = spec.startsWith("@")
    ? spec.split("/").slice(0, 2).join("/")
    : spec.split("/")[0];
  imported.add(name);
}
const peers = new Set(Object.keys(pkg.peerDependencies ?? {}));
const dependencies = {};
for (const name of [...imported].sort()) {
  if (peers.has(name)) continue;
  const version = rootPkg.dependencies?.[name];
  if (!version) {
    fail(`bundle imports "${name}" but it is not in the root package.json dependencies`);
  }
  dependencies[name] = version;
}
const before = JSON.stringify(pkg.dependencies ?? {});
pkg.dependencies = dependencies;
if (pkg.version !== rootPkg.version) {
  fail(`packages/engine version ${pkg.version} != root ${rootPkg.version}`);
}
if (JSON.stringify(dependencies) !== before) {
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
  console.log("build:package — updated packages/engine/package.json dependencies (commit this)");
}

// 3. Licence files travel with the package
for (const file of ["LICENSE", "LICENSE-EXCEPTION.md", "COPYRIGHT"]) {
  copyFileSync(join(root, file), join(pkgDir, file));
}

// 4. Entry points
const entries = [
  pkg.main,
  pkg.types,
  pkg.exports?.["."]?.import,
  pkg.exports?.["."]?.types,
  pkg.exports?.["./style.css"],
];
for (const rel of entries) {
  if (!rel || !existsSync(join(pkgDir, rel))) fail(`missing entry file: ${rel}`);
}
// Declarations must not point back into the monorepo layout
const badDts = spawnSync(
  "grep",
  ["-rlE", "import\\(['\"](packages|src)/", join(pkgDir, "dist"), "--include=*.d.ts"],
  { encoding: "utf8" }
).stdout.trim();
if (badDts) {
  fail(
    `type declarations contain monorepo-relative imports (add explicit return types in the source):\n${badDts}`
  );
}
if (/import\.meta\.env/.test(bundle)) fail("bundle still reads import.meta.env");

console.log(
  `build:package OK — ${pkg.name}@${pkg.version}, ${Object.keys(dependencies).length} dependencies, ` +
    `${(bundle.length / 1024).toFixed(0)} KB JS`
);

if (pack) {
  for (const f of readdirSync(pkgDir)) {
    if (f.endsWith(".tgz")) rmSync(join(pkgDir, f));
  }
  run("npm", ["pack", "--silent"], pkgDir);
  const tgz = readdirSync(pkgDir).find((f) => f.endsWith(".tgz"));
  if (!tgz) fail("npm pack produced no tarball");
  const list = spawnSync("tar", ["-tzf", join(pkgDir, tgz)], { encoding: "utf8" }).stdout;
  for (const need of [
    "package/dist/index.js",
    "package/dist/style.css",
    "package/README.md",
    "package/LICENSE",
    "package/LICENSE-EXCEPTION.md",
    "package/COPYRIGHT",
  ]) {
    if (!list.includes(need)) fail(`tarball is missing ${need}`);
  }
  console.log(`build:package — packed packages/engine/${tgz}`);
}
