#!/usr/bin/env node
/**
 * Split a Studio .pack.json into a hosting folder: small pack.json + assets/.
 *
 * Usage:
 *   npm run pack-assets -- path/to/game.pack.json out/my-game
 *
 * Upload the output folder to any HTTPS host and play it with
 *   /play?packUrl=https://<host>/my-game/pack.json
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2).filter((a) => a !== "--");
const [fileArg, outArg] = args.filter((a) => !a.startsWith("-"));

if (!fileArg || !outArg) {
  console.error(`Usage: npm run pack-assets -- <file.pack.json> <outDir>

Moves the images and audio stored inside a .pack.json into an assets/ folder
and writes a small pack.json next to it, ready for web hosting.`);
  process.exit(2);
}

const abs = path.resolve(process.cwd(), fileArg);
if (!fs.existsSync(abs)) {
  console.error(`File not found: ${abs}`);
  process.exit(2);
}

const result = spawnSync(
  path.join(root, "node_modules", ".bin", "vite-node"),
  [
    path.join(root, "scripts", "pack-assets-run.ts"),
    abs,
    path.resolve(process.cwd(), outArg),
  ],
  { cwd: root, stdio: "inherit" }
);
process.exit(result.status ?? 1);
