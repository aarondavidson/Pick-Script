#!/usr/bin/env node
/**
 * Dry-run `npm pack` for @portable-adventure/engine.
 * Verifies package.json + tarball contents include a usable index entry
 * (stub until real extract/publish). Does not publish.
 *
 * Usage: node scripts/pack-engine-dry-run.mjs
 *    or: npm run pack:engine
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkgDir = join(root, "packages", "engine");
const pkgJsonPath = join(pkgDir, "package.json");

function fail(msg) {
  console.error(`pack:engine FAILED: ${msg}`);
  process.exit(1);
}

if (!existsSync(pkgJsonPath)) {
  fail(`missing ${pkgJsonPath}`);
}

const pkg = JSON.parse(readFileSync(pkgJsonPath, "utf8"));
if (pkg.name !== "@portable-adventure/engine") {
  fail(`unexpected package name: ${pkg.name}`);
}

const entry =
  (pkg.exports && pkg.exports["."] && (pkg.exports["."].import || pkg.exports["."].default)) ||
  pkg.main;
if (!entry || typeof entry !== "string") {
  fail("package.json missing exports[\".\"].import / main");
}

const entryAbs = join(pkgDir, entry);
if (!existsSync(entryAbs)) {
  fail(`entry file missing: ${entry} (resolved ${entryAbs})`);
}

const typesPath = pkg.types || pkg.exports?.["."]?.types;
if (typesPath) {
  const typesAbs = join(pkgDir, typesPath);
  if (!existsSync(typesAbs)) {
    fail(`types file missing: ${typesPath}`);
  }
}

// Reject broken deep re-exports that npm pack cannot include.
const entrySrc = readFileSync(entryAbs, "utf8");
if (/from\s+["']\.\.\/\.\.\/\.\.\/src\/engine/.test(entrySrc)) {
  fail(
    "entry re-exports ../../../src/engine — that path is outside the package and will not be in the tarball. Use a stub index (or a build that copies the public API)."
  );
}

console.log("Running npm pack --dry-run in packages/engine …");
const result = spawnSync("npm", ["pack", "--dry-run", "--json"], {
  cwd: pkgDir,
  encoding: "utf8",
  shell: false,
});

if (result.status !== 0) {
  console.error(result.stderr || result.stdout);
  fail(`npm pack --dry-run exited ${result.status}`);
}

let files = [];
try {
  const parsed = JSON.parse(result.stdout.trim() || "[]");
  const report = Array.isArray(parsed) ? parsed[0] : parsed;
  files = (report?.files ?? []).map((f) => f.path || f);
} catch {
  // Older npm may not print JSON; fall back to text scrape.
  const text = `${result.stdout}\n${result.stderr}`;
  const matches = [...text.matchAll(/npm notice\s+(\S+\.(?:js|ts|mjs|cjs|d\.ts|json|md))/g)];
  files = matches.map((m) => m[1]);
  if (!files.length) {
    // Last resort: require notice lines mentioning index
    if (!/index\.(js|ts|mjs)/.test(text)) {
      fail("could not parse npm pack --dry-run output; no index entry listed");
    }
    console.log(text);
    console.log("pack:engine OK (dry-run listed an index entry)");
    process.exit(0);
  }
}

const normalized = files.map((f) => String(f).replace(/^\.\//, ""));
const hasIndex = normalized.some(
  (f) =>
    f === "src/index.js" ||
    f === "src/index.ts" ||
    f.endsWith("/src/index.js") ||
    f === entry.replace(/^\.\//, "")
);
const hasPkg = normalized.some((f) => f === "package.json" || f.endsWith("package.json"));
const hasReadme = normalized.some(
  (f) => f === "README.md" || f.toLowerCase() === "readme.md"
);

if (!hasIndex) {
  fail(
    `tarball would omit index entry (expected ${entry}). Listed: ${normalized.join(", ") || "(none)"}`
  );
}
if (!hasPkg) {
  fail("tarball would omit package.json");
}
if (!hasReadme) {
  fail("tarball would omit README.md");
}

console.log(`pack:engine OK — dry-run includes ${normalized.length || "?"} files`);
console.log(`  entry: ${entry}`);
console.log(`  types: ${typesPath || "(none)"}`);
console.log(
  "  note: stub index throws until publish; monorepo imports stay on @/engine"
);
