#!/usr/bin/env node
/**
 * Validate pack art against src/engine/ASSETS.md.
 *
 * Errors fail the process (CI). Warnings print but do not fail unless --strict.
 *
 * Usage:
 *   npm run check-assets
 *   npm run check-assets -- --strict
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const assetsRoot = path.join(root, "src", "assets");
const gamesRoot = path.join(root, "src", "games");

const strict = process.argv.includes("--strict");

/** @typedef {{ path: string, kind: string, level: "error" | "warn", msg: string }} Finding */

/** @type {Finding[]} */
const findings = [];

function rel(p) {
  return path.relative(root, p);
}

function add(level, filePath, kind, msg) {
  findings.push({ path: rel(filePath), kind, level, msg });
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function readU16BE(buf, i) {
  return buf.readUInt16BE(i);
}

function readU32BE(buf, i) {
  return buf.readUInt32BE(i);
}

/** @returns {{ format: string, width: number, height: number } | null} */
function probeImage(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf.length < 24) return null;

  // PNG
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  ) {
    return {
      format: "png",
      width: readU32BE(buf, 16),
      height: readU32BE(buf, 20),
    };
  }

  // JPEG (also catches mislabeled .png that are actually JPEG)
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i < buf.length - 8) {
      if (buf[i] !== 0xff) {
        i += 1;
        continue;
      }
      while (i < buf.length && buf[i] === 0xff) i += 1;
      if (i >= buf.length) break;
      const marker = buf[i];
      i += 1;
      if (marker === 0xd8 || marker === 0xd9) continue;
      if (marker === 0xda) break;
      if (i + 2 > buf.length) break;
      const length = readU16BE(buf, i);
      if (
        marker >= 0xc0 &&
        marker <= 0xcf &&
        marker !== 0xc4 &&
        marker !== 0xc8 &&
        marker !== 0xcc
      ) {
        if (i + 7 > buf.length) break;
        return {
          format: "jpeg",
          height: readU16BE(buf, i + 3),
          width: readU16BE(buf, i + 5),
        };
      }
      i += length;
    }
    return null;
  }

  // WebP (RIFF....WEBP)
  if (
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  ) {
    const chunk = buf.toString("ascii", 12, 16);
    if (chunk === "VP8X" && buf.length >= 30) {
      const w = 1 + buf[24] + (buf[25] << 8) + (buf[26] << 16);
      const h = 1 + buf[27] + (buf[28] << 8) + (buf[29] << 16);
      return { format: "webp", width: w, height: h };
    }
    if (chunk === "VP8 " && buf.length >= 30) {
      // Lossy bitstream: width/height at bytes 26-29 of payload (little-endian 14-bit)
      const w = buf[26] | ((buf[27] & 0x3f) << 8);
      const h = buf[28] | ((buf[29] & 0x3f) << 8);
      return { format: "webp", width: w, height: h };
    }
    if (chunk === "VP8L" && buf.length >= 25) {
      const b0 = buf[21];
      const b1 = buf[22];
      const b2 = buf[23];
      const b3 = buf[24];
      const w = 1 + (((b1 & 0x3f) << 8) | b0);
      const h = 1 + (((b3 & 0xf) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
      return { format: "webp", width: w, height: h };
    }
    return { format: "webp", width: 0, height: 0 };
  }

  return null;
}

function almostEqual(a, b, tol = 0.05) {
  return Math.abs(a - b) <= tol;
}

/** Classify asset role from shared or pack-local asset paths. */
function classify(filePath) {
  const r = rel(filePath).replace(/\\/g, "/");
  if (r.includes("/comics/")) return "comic";
  if (r.includes("/items/") || r.includes("/icons/")) return "item";
  if (r.includes("/npcs/")) return "npc";
  if (r.includes("/portraits/")) return "portrait";
  if (r.includes("/sfx/")) return "other";
  const base = path.basename(filePath).toLowerCase();
  if (base.startsWith("app-icon")) return "other";

  // Shared library: src/assets/<file>.jpg
  if (r.startsWith("src/assets/")) {
    const after = r.slice("src/assets/".length);
    if (!after.includes("/") && /\.(jpe?g|png|webp)$/i.test(after)) return "room";
    return "other";
  }

  // Pack-local: src/games/<id>/assets/<file>.jpg (top-level = room bg)
  const pack = r.match(/^src\/games\/[^/]+\/assets\/(.+)$/);
  if (pack) {
    const after = pack[1];
    if (!after.includes("/") && /\.(jpe?g|png|webp)$/i.test(after)) return "room";
  }
  return "other";
}

function checkRoom(filePath, sizeKb, probe) {
  if (sizeKb > 1024) {
    add("error", filePath, "room", `file ${sizeKb} KB exceeds 1 MB hard max`);
  }
  if (!probe || !probe.width) {
    add("error", filePath, "room", "unreadable image (expected JPG/PNG/WebP)");
    return;
  }
  if (probe.width < 1280 || probe.height < 720) {
    add(
      "warn",
      filePath,
      "room",
      `${probe.width}×${probe.height} below 1280×720 minimum (canonical 1920×1080)`
    );
  } else if (probe.width !== 1920 || probe.height !== 1080) {
    add(
      "warn",
      filePath,
      "room",
      `${probe.width}×${probe.height} — prefer canonical 1920×1080`
    );
  }
  const aspect = probe.width / probe.height;
  if (!almostEqual(aspect, 16 / 9, 0.08)) {
    add(
      "warn",
      filePath,
      "room",
      `aspect ${aspect.toFixed(3)} — prefer 16:9`
    );
  }
}

function checkItem(filePath, sizeKb, probe) {
  if (sizeKb > 150) {
    add("error", filePath, "item", `file ${sizeKb} KB exceeds 150 KB cap`);
  }
  if (!probe || !probe.width) {
    add("error", filePath, "item", "unreadable image");
    return;
  }
  const okSizes = new Set([128, 256, 512]);
  if (
    probe.width !== probe.height ||
    !okSizes.has(probe.width)
  ) {
    add(
      "warn",
      filePath,
      "item",
      `${probe.width}×${probe.height} — prefer square 128 / 256 / 512`
    );
  }
  if (sizeKb > 40) {
    add("warn", filePath, "item", `${sizeKb} KB — target ≤ 40 KB`);
  }
}

function checkNpc(filePath, sizeKb, probe) {
  if (sizeKb > 200) {
    add("error", filePath, "npc", `file ${sizeKb} KB exceeds 200 KB cap`);
  }
  if (!probe || !probe.width) {
    add("error", filePath, "npc", "unreadable image");
    return;
  }
  if (probe.width !== 512 || probe.height !== 512) {
    add(
      "warn",
      filePath,
      "npc",
      `${probe.width}×${probe.height} — prefer 512×512`
    );
  }
}

function checkComic(filePath, sizeKb, probe) {
  if (sizeKb > 500) {
    add("error", filePath, "comic", `file ${sizeKb} KB exceeds 500 KB cap`);
  }
  if (!probe || !probe.width) {
    add("error", filePath, "comic", "unreadable image");
    return;
  }
  if (probe.width !== 800 || probe.height !== 544) {
    add(
      "warn",
      filePath,
      "comic",
      `${probe.width}×${probe.height} — prefer 800×544`
    );
  }
  if (sizeKb > 200) {
    add("warn", filePath, "comic", `${sizeKb} KB — target ≤ 200 KB`);
  }
}

function checkPortrait(filePath, sizeKb, probe) {
  if (sizeKb > 120) {
    add("error", filePath, "portrait", `file ${sizeKb} KB exceeds 120 KB cap`);
  }
  if (!probe || !probe.width) {
    add("error", filePath, "portrait", "unreadable image");
    return;
  }
  if (probe.width < 128 || probe.height < 128) {
    add(
      "warn",
      filePath,
      "portrait",
      `${probe.width}×${probe.height} below 128×128 minimum`
    );
  } else if (probe.width !== 256 || probe.height !== 256) {
    add(
      "warn",
      filePath,
      "portrait",
      `${probe.width}×${probe.height} — prefer 256×256`
    );
  }
}

function collectImageFiles() {
  const files = [];
  if (fs.existsSync(assetsRoot)) {
    files.push(...walk(assetsRoot));
  }
  if (fs.existsSync(gamesRoot)) {
    for (const entry of fs.readdirSync(gamesRoot, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
      const packAssets = path.join(gamesRoot, entry.name, "assets");
      if (fs.existsSync(packAssets)) files.push(...walk(packAssets));
    }
  }
  return files.filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
}

function main() {
  if (!fs.existsSync(assetsRoot) && !fs.existsSync(gamesRoot)) {
    console.error("No asset directories found under src/assets or src/games/*/assets");
    process.exit(1);
  }

  const files = collectImageFiles();

  for (const filePath of files) {
    const stat = fs.statSync(filePath);
    const sizeKb = Math.round(stat.size / 1024);
    let probe = null;
    try {
      probe = probeImage(filePath);
    } catch (err) {
      add("error", filePath, "other", `probe failed: ${err.message}`);
      continue;
    }

    const kind = classify(filePath);
    switch (kind) {
      case "room":
        checkRoom(filePath, sizeKb, probe);
        break;
      case "item":
        checkItem(filePath, sizeKb, probe);
        break;
      case "npc":
        checkNpc(filePath, sizeKb, probe);
        break;
      case "comic":
        checkComic(filePath, sizeKb, probe);
        break;
      case "portrait":
        checkPortrait(filePath, sizeKb, probe);
        break;
      default:
        if (!probe) {
          add("warn", filePath, "other", "unrecognized image format");
        }
        break;
    }
  }

  const errors = findings.filter((f) => f.level === "error");
  const warns = findings.filter((f) => f.level === "warn");

  for (const f of [...errors, ...warns]) {
    const tag = f.level === "error" ? "ERROR" : "WARN ";
    console.log(`${tag} [${f.kind}] ${f.path}: ${f.msg}`);
  }

  console.log(
    `\nChecked ${files.length} images (src/assets + pack assets) — ${errors.length} error(s), ${warns.length} warning(s)`
  );

  if (errors.length > 0 || (strict && warns.length > 0)) {
    if (strict && warns.length && !errors.length) {
      console.error("\n--strict: treating warnings as failures");
    }
    process.exit(1);
  }

  console.log("Asset check OK (hard limits).");
}

main();
