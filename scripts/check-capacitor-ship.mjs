#!/usr/bin/env node
/**
 * Pre-flight checks for Capacitor / store ship readiness.
 * Does not build or open Xcode — only verifies repo wiring.
 *
 * Usage:
 *   npm run check:capacitor
 *   node scripts/check-capacitor-ship.mjs
 *
 * Exit 1 if any required file or script is missing.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

/** @type {string[]} */
const errors = [];

function rel(p) {
  return path.relative(root, p);
}

function mustExist(filePath, label) {
  if (!fs.existsSync(filePath)) {
    errors.push(`missing ${label}: ${rel(filePath)}`);
    return false;
  }
  return true;
}

function mustContain(filePath, needle, label) {
  if (!mustExist(filePath, label)) return;
  const text = fs.readFileSync(filePath, "utf8");
  if (!text.includes(needle)) {
    errors.push(`${rel(filePath)} must include ${JSON.stringify(needle)}`);
  }
}

const capacitorConfig = path.join(root, "capacitor.config.ts");
const indexHtml = path.join(root, "index.html");
const capacitorMd = path.join(root, "CAPACITOR.md");
const packageJsonPath = path.join(root, "package.json");

mustExist(capacitorConfig, "Capacitor config");
mustContain(indexHtml, "viewport-fit=cover", "index.html viewport");
mustExist(capacitorMd, "CAPACITOR.md");

if (mustExist(packageJsonPath, "package.json")) {
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  const scripts = pkg.scripts ?? {};
  for (const name of ["cap:sync", "cap:ios", "cap:android"]) {
    if (typeof scripts[name] !== "string" || !scripts[name].trim()) {
      errors.push(`package.json scripts missing "${name}"`);
    }
  }
}

if (errors.length) {
  console.error("check:capacitor failed:\n");
  for (const e of errors) console.error(`  • ${e}`);
  console.error("\nSee CAPACITOR.md (Store submission checklist).");
  process.exit(1);
}

console.log("check:capacitor ok — capacitor.config.ts, viewport-fit=cover, CAPACITOR.md, cap:* scripts");
process.exit(0);
