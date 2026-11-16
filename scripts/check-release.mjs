#!/usr/bin/env node
/**
 * Release consistency check — run by `npm run verify` and CI.
 *
 * Fails when the engine version is not stated identically everywhere, or when
 * the changelog has no section for it. This is what keeps a tagged release,
 * the vendored `src/engine` copy, and the npm package scaffold in agreement.
 *
 * Checks:
 *   1. package.json, package-lock.json, packages/engine/package.json and
 *      ENGINE_VERSION (src/engine/version.ts) all carry the same semver
 *   2. CHANGELOG.md has a "## <version> — YYYY-MM-DD" section for it
 *   3. CHANGELOG.md keeps an "## Unreleased" section above it
 *   4. With --tag <name> (CI on tag pushes): the tag equals v<version>
 *
 * Usage: node scripts/check-release.mjs [--tag v0.2.0]
 * See docs/RELEASING.md.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");
const problems = [];

const rootPkg = JSON.parse(read("package.json"));
const version = rootPkg.version;

if (!/^\d+\.\d+\.\d+$/.test(version ?? "")) {
  problems.push(`package.json version "${version}" is not MAJOR.MINOR.PATCH`);
}

const lock = JSON.parse(read("package-lock.json"));
const sources = {
  "package-lock.json": lock.version,
  'package-lock.json packages[""]': lock.packages?.[""]?.version,
  "packages/engine/package.json": JSON.parse(
    read("packages/engine/package.json")
  ).version,
  "src/engine/version.ts ENGINE_VERSION": read("src/engine/version.ts").match(
    /export const ENGINE_VERSION = "([^"]+)"/
  )?.[1],
};
for (const [where, found] of Object.entries(sources)) {
  if (found !== version) {
    problems.push(`${where} is "${found}" but package.json is "${version}"`);
  }
}

const changelog = read("CHANGELOG.md");
const headings = [...changelog.matchAll(/^## (.+)$/gm)].map((m) => m[1].trim());
const escaped = version.replace(/\./g, "\\.");
const releaseIndex = headings.findIndex((h) =>
  new RegExp(`^${escaped} — \\d{4}-\\d{2}-\\d{2}( |$)`).test(h)
);
const unreleasedIndex = headings.indexOf("Unreleased");
if (releaseIndex === -1) {
  problems.push(
    `CHANGELOG.md has no "## ${version} — YYYY-MM-DD" section (move the Unreleased notes under it)`
  );
}
if (unreleasedIndex === -1) {
  problems.push('CHANGELOG.md is missing the "## Unreleased" section');
} else if (releaseIndex !== -1 && unreleasedIndex > releaseIndex) {
  problems.push('CHANGELOG.md: "## Unreleased" must come before the releases');
}

const tagArg = process.argv.indexOf("--tag");
if (tagArg !== -1) {
  const tag = process.argv[tagArg + 1];
  if (tag !== `v${version}`) {
    problems.push(`tag "${tag}" does not match version (expected "v${version}")`);
  }
}

if (problems.length) {
  console.error("check:release FAILED");
  for (const p of problems) console.error(`  - ${p}`);
  console.error("See docs/RELEASING.md.");
  process.exit(1);
}
console.log(`check:release OK — engine ${version}`);
