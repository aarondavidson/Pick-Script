/**
 * Combined ship readiness: pack doctor + playtest checklist + soft-lock summary.
 */

import {
  buildPlaytestChecklist,
  playtestProgress,
  type PlaytestCheckItem,
} from "@/authoring/playtestChecklist";
import type { JsonPackDocument } from "@/engine/jsonPack";
import {
  diagnosePack,
  type PackDoctorFinding,
  type PackDoctorReport,
} from "@/engine/packDoctor";

export type ShipFindingSource = "doctor" | "playtest";

export interface ShipFinding {
  id: string;
  severity: "error" | "warning" | "info";
  title: string;
  detail: string;
  fix?: string;
  roomId?: string;
  hotspotId?: string;
  source: ShipFindingSource;
  /** Doctor category when source is doctor */
  category?: PackDoctorFinding["category"];
}

export interface SoftLockSummary {
  unreachableRooms: number;
  flagsNeverSet: number;
  findings: ShipFinding[];
}

export interface ShipChecklistReport {
  ready: boolean;
  /** Blocking issues (doctor errors + incomplete playtest items) */
  blockers: ShipFinding[];
  /** All findings, errors first */
  findings: ShipFinding[];
  playtest: PlaytestCheckItem[];
  softLock: SoftLockSummary;
  doctor: PackDoctorReport;
  playtestReady: boolean;
}

const SEV_RANK: Record<ShipFinding["severity"], number> = {
  error: 0,
  warning: 1,
  info: 2,
};

function doctorToShip(f: PackDoctorFinding): ShipFinding {
  return {
    id: f.id,
    severity: f.severity,
    title: f.title,
    detail: f.detail,
    fix: f.fix,
    roomId: f.roomId,
    hotspotId: f.hotspotId,
    source: "doctor",
    category: f.category,
  };
}

function playtestToShip(item: PlaytestCheckItem): ShipFinding {
  return {
    id: `playtest:${item.id}`,
    severity: "error",
    title: item.label,
    detail: item.hint || `${item.label} is not done yet.`,
    fix: item.hint,
    source: "playtest",
  };
}

function sortFindings(a: ShipFinding, b: ShipFinding): number {
  const sev = SEV_RANK[a.severity] - SEV_RANK[b.severity];
  if (sev !== 0) return sev;
  return a.id.localeCompare(b.id);
}

/** Pure ship checklist combining diagnosePack + playtest + soft-lock summary. */
export function buildShipChecklist(doc: JsonPackDocument): ShipChecklistReport {
  const doctor = diagnosePack(doc);
  const playtest = buildPlaytestChecklist(doc);
  const { ready: playtestReady } = playtestProgress(playtest);

  const doctorFindings = doctor.findings.map(doctorToShip);
  const softLockFindings = doctorFindings.filter(
    (f) => f.category === "softlock"
  );

  const playtestBlockers = playtest
    .filter((item) => !item.done)
    .map(playtestToShip);

  const doctorBlockers = doctorFindings.filter((f) => f.severity === "error");

  const blockers = [...doctorBlockers, ...playtestBlockers].sort(sortFindings);

  const findings = [...doctorFindings, ...playtestBlockers].sort(sortFindings);

  return {
    ready: doctor.ok && playtestReady,
    blockers,
    findings,
    playtest,
    softLock: {
      unreachableRooms: doctor.summary.unreachableRooms,
      flagsNeverSet: doctor.summary.flagsNeverSet,
      findings: softLockFindings,
    },
    doctor,
    playtestReady,
  };
}
