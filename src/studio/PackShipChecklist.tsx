import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  buildShipChecklist,
  type ShipFinding,
} from "@/authoring/shipChecklist";
import type { JsonPackDocument } from "@/engine/jsonPack";
import type { PackDoctorCategory } from "@/engine/packDoctor";
import { studioTabHref } from "@/engine/validationHelp";

export interface PackShipChecklistProps {
  doc: JsonPackDocument;
  onFocusRoom?: (roomId: string) => void;
  onFocusHotspot?: (roomId: string, hotspotId: string) => void;
}

const CATEGORY_LABEL: Record<PackDoctorCategory, string> = {
  art: "Missing art",
  interaction: "Dead / unwired interactions",
  exit: "Dead or incomplete exits",
  item: "Items",
  dialogue: "Dialogue",
  softlock: "Soft-locks / stuck checks",
  feel: "Feel / juice",
  meta: "Pack meta",
};

function scrollToSetupOrStage(hasRoomFocus: boolean) {
  const target = hasRoomFocus
    ? document.getElementById("pack-stage") ||
      document.getElementById("pack-hotspots") ||
      document.getElementById("pack-setup")
    : document.getElementById("pack-setup");
  target?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/**
 * Always-visible ship checklist: doctor findings + playtest + soft-lock summary.
 */
export function PackShipChecklist({
  doc,
  onFocusRoom,
  onFocusHotspot,
}: PackShipChecklistProps) {
  const report = useMemo(() => buildShipChecklist(doc), [doc]);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const firstBlockerId = report.blockers[0]?.id ?? null;
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHighlightId(firstBlockerId);
  }, [firstBlockerId, doc.id]);

  const focusFinding = (f: ShipFinding) => {
    setHighlightId(f.id);
    if (f.roomId && f.hotspotId) {
      onFocusHotspot?.(f.roomId, f.hotspotId);
      scrollToSetupOrStage(true);
    } else if (f.roomId) {
      onFocusRoom?.(f.roomId);
      scrollToSetupOrStage(true);
    } else {
      scrollToSetupOrStage(false);
    }
  };

  const runChecklist = () => {
    const next = buildShipChecklist(doc);
    const id = next.blockers[0]?.id ?? null;
    setHighlightId(id);
    if (id) {
      const el = listRef.current?.querySelector(`[data-finding-id="${id}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    document
      .getElementById("pack-setup")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const s = report.doctor.summary;
  const soft = report.softLock;

  return (
    <section
      id="pack-setup"
      className="border border-game-border bg-game-ui/90 p-4 space-y-3"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="pixel-font text-sm text-accent">Ship checklist</h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Doctor findings, playtest readiness, and soft-lock checks — finish
            blockers before Publish.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="pixel-font text-[10px] px-3 py-1.5 border-2 border-accent text-accent min-h-[36px]"
            onClick={runChecklist}
          >
            Run ship checklist
          </button>
          <span
            className={`pixel-font text-[10px] px-2 py-1 border ${
              report.ready
                ? "border-primary text-primary"
                : "border-destructive/60 text-destructive"
            }`}
            data-testid="ship-ready-badge"
          >
            {report.ready
              ? "Ready"
              : `${report.blockers.length} blocker${
                  report.blockers.length === 1 ? "" : "s"
                }`}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-[10px]">
        <Stat label="Room art missing" value={s.missingRoomArt} hot={s.missingRoomArt > 0} />
        <Stat label="Dead exits" value={s.deadExits} hot={s.deadExits > 0} />
        <Stat
          label="Silent hotspots"
          value={s.silentHotspots}
          hot={s.silentHotspots > 0}
        />
        <Stat
          label="Unreachable rooms"
          value={soft.unreachableRooms}
          hot={soft.unreachableRooms > 0}
        />
        <Stat
          label="Flags never set"
          value={soft.flagsNeverSet}
          hot={soft.flagsNeverSet > 0}
        />
        <Stat
          label="Playtest left"
          value={report.playtest.filter((i) => !i.done).length}
          hot={!report.playtestReady}
        />
      </div>

      <div className="border border-border/60 px-3 py-2 space-y-1.5">
        <h4 className="pixel-font text-[11px] text-primary">Playtest</h4>
        <ul className="space-y-1">
          {report.playtest.map((item) => (
            <li
              key={item.id}
              className="flex gap-2 text-xs"
              data-testid={`playtest-${item.id}`}
            >
              <span
                className={item.done ? "text-primary" : "text-muted-foreground"}
                aria-hidden
              >
                {item.done ? "✓" : "○"}
              </span>
              <div>
                <span
                  className={
                    item.done ? "text-foreground" : "text-muted-foreground"
                  }
                >
                  {item.label}
                </span>
                {!item.done && item.hint && (
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                    {item.hint}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {(soft.findings.length > 0 ||
        soft.unreachableRooms > 0 ||
        soft.flagsNeverSet > 0) && (
        <div className="border border-accent/30 px-3 py-2 space-y-1">
          <h4 className="pixel-font text-[11px] text-accent">
            Soft-lock summary
          </h4>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {soft.unreachableRooms} unreachable room(s) · {soft.flagsNeverSet}{" "}
            flag(s) never set · {soft.findings.length} soft-lock finding(s)
          </p>
          <a
            href="#pack-puzzle-graph"
            className="inline-block text-[10px] underline text-primary"
          >
            Open puzzle graph (red = never set)
          </a>
        </div>
      )}

      {report.findings.length === 0 ? (
        <p className="text-xs text-primary">
          All clear — pack looks ready to ship.
        </p>
      ) : (
        <div ref={listRef} className="space-y-2 max-h-80 overflow-y-auto">
          {report.findings.map((f) => {
            const highlighted = f.id === highlightId;
            return (
              <button
                key={f.id}
                type="button"
                data-finding-id={f.id}
                data-testid={`ship-finding-${f.id}`}
                onClick={() => focusFinding(f)}
                className={`w-full text-left border px-2 py-1.5 text-xs space-y-0.5 transition-colors ${
                  f.severity === "error"
                    ? "border-destructive/50"
                    : f.severity === "warning"
                      ? "border-accent/40"
                      : "border-border/50"
                } ${
                  highlighted
                    ? "ring-2 ring-accent bg-accent/10"
                    : "hover:bg-secondary/20"
                }`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-foreground">{f.title}</span>
                  <span className="text-[10px] text-muted-foreground uppercase">
                    {f.source === "playtest"
                      ? "playtest"
                      : f.category
                        ? CATEGORY_LABEL[f.category]
                        : f.severity}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {f.detail}
                </p>
                {f.fix && (
                  <p className="text-[11px] text-accent/90 leading-relaxed">
                    → {f.fix}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 pt-0.5">
                  {f.roomId && (
                    <span className="text-[10px] underline text-primary">
                      Open room
                    </span>
                  )}
                  {f.roomId && f.hotspotId && (
                    <span className="text-[10px] underline text-primary">
                      Select hotspot
                    </span>
                  )}
                  {f.category === "art" && (
                    <Link
                      to={studioTabHref("pixels", { send: "room" })}
                      className="text-[10px] underline text-primary"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Pixels tab
                    </Link>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

function Stat({
  label,
  value,
  hot,
}: {
  label: string;
  value: number;
  hot: boolean;
}) {
  return (
    <div
      className={`border px-2 py-2 ${
        hot ? "border-accent/50 bg-accent/5" : "border-border/60"
      }`}
      role="status"
      aria-label={`${label}: ${value}`}
    >
      <div
        className={`pixel-font text-sm ${
          hot ? "text-accent" : "text-foreground"
        }`}
        aria-hidden
      >
        {value}
      </div>
      <div className="text-muted-foreground leading-snug mt-0.5" aria-hidden>
        {label}
      </div>
    </div>
  );
}
