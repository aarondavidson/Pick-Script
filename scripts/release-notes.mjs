#!/usr/bin/env node
/**
 * Print the CHANGELOG.md section for one version — used as the body of the
 * GitHub Release so the release page and the changelog never disagree.
 *
 * Usage: node scripts/release-notes.mjs 0.3.0
 * Exits 1 when the version has no section.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const version = (process.argv[2] ?? "").replace(/^v/, "");
if (!/^\d+\.\d+\.\d+$/.test(version)) {
  console.error("Usage: node scripts/release-notes.mjs <MAJOR.MINOR.PATCH>");
  process.exit(1);
}

const lines = readFileSync(join(root, "CHANGELOG.md"), "utf8").split("\n");
const start = lines.findIndex(
  (l) => l.startsWith(`## ${version} `) || l.trim() === `## ${version}`
);
if (start === -1) {
  console.error(`CHANGELOG.md has no "## ${version}" section`);
  process.exit(1);
}
let end = lines.findIndex((l, i) => i > start && /^## /.test(l));
if (end === -1) end = lines.length;

const repo = "https://github.com/aarondavidson/Pick-Script";
const body = lines
  .slice(start + 1, end)
  .join("\n")
  .trim()
  // Relative doc links do not resolve on a release page — pin them to the tag
  .replace(/\]\(\.\/([^)]+)\)/g, `](${repo}/blob/v${version}/$1)`);

console.log(`${body}

---

## Get this release

- **Use the engine in your own React app** — install the package attached below:
  \`npm install ${repo}/releases/download/v${version}/portable-adventure-engine-${version}.tgz\`
  then follow [ENGINE-PACKAGE.md](${repo}/blob/v${version}/docs/ENGINE-PACKAGE.md).
- **Host the player + Studio yourself** — unzip \`pick-script-web-${version}.zip\` onto any static web host.
- **Work from source** — \`git checkout v${version}\`, or the *Source code* archive below.

**Upgrading a game?** Read [UPGRADING.md](${repo}/blob/v${version}/docs/UPGRADING.md) first.
**Licence:** GPL-3.0-only with the [Pick-Script Game Exception](${repo}/blob/v${version}/LICENSE-EXCEPTION.md) — games you make can use any licence.`);
