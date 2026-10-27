/**
 * vite-node entry for `npm run pack-doctor`.
 * Args: <file.pack.json> [--json]
 */

import fs from "node:fs";
import { parseJsonPack } from "../src/engine/jsonPack";
import {
  diagnosePack,
  formatPackDoctorReport,
} from "../src/engine/packDoctor";
import { safeJsonParse } from "../src/engine/security";

const args = process.argv.slice(2);
const jsonOut = args.includes("--json");
const file = args.find((a) => !a.startsWith("-"));

if (!file) {
  console.error("Missing pack JSON path");
  process.exit(2);
}

const raw = fs.readFileSync(file, "utf8");
let doc;
try {
  doc = parseJsonPack(safeJsonParse(raw));
} catch (e) {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(2);
}

const report = diagnosePack(doc);
if (jsonOut) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(formatPackDoctorReport(report));
}

process.exit(report.summary.errors > 0 || !report.ok ? 1 : 0);
