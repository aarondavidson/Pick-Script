#!/usr/bin/env node
/**
 * CLI pack doctor — missing art, dead exits, silent hotspots.
 *
 * Usage:
 *   npm run pack-doctor -- path/to/game.pack.json
 *   npm run pack-doctor -- path/to/game.pack.json --json
 *
 * Exit 1 when blocking errors are present.
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const args = process.argv.slice(2).filter((a) => a !== "--");
const jsonOut = args.includes("--json");
const fileArg = args.find((a) => !a.startsWith("-"));

if (!fileArg) {
  console.error(`Usage: npm run pack-doctor -- <file.pack.json> [--json]

Reports missing room art, dead exits, silent hotspots, and validation errors.
Exit code 1 when blocking errors exist.`);
  process.exit(2);
}

const abs = path.resolve(process.cwd(), fileArg);
if (!fs.existsSync(abs)) {
  console.error(`File not found: ${abs}`);
  process.exit(2);
}

const runner = path.join(root, "scripts", "pack-doctor-run.ts");
const result = spawnSync(
  path.join(root, "node_modules", ".bin", "vite-node"),
  [runner, abs, ...(jsonOut ? ["--json"] : [])],
  {
    cwd: root,
    encoding: "utf8",
    env: process.env,
  }
);

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);

if (result.error) {
  console.error(result.error.message);
  process.exit(2);
}

process.exit(result.status ?? 1);
