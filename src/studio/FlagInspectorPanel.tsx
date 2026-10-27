import { useMemo, useState } from "react";
import type { JsonPackDocument } from "@/engine/jsonPack";
import { buildFlagIndex, flagsNeverSet } from "@/engine/flagIndex";

export interface FlagInspectorPanelProps {
  doc: JsonPackDocument;
  onFocusRoom?: (roomId: string) => void;
  onFocusHotspot?: (roomId: string, hotspotId: string) => void;
}

/**
 * Who sets / who reads each flag — catches “door needs X but nothing sets X”.
 */
export function FlagInspectorPanel({
  doc,
  onFocusRoom,
  onFocusHotspot,
}: FlagInspectorPanelProps) {
  const index = useMemo(() => buildFlagIndex(doc), [doc]);
  const neverSet = useMemo(() => flagsNeverSet(doc), [doc]);
  const [filter, setFilter] = useState("");
  const [open, setOpen] = useState(true);

  const list = index.filter(
    (e) => !filter.trim() || e.flag.includes(filter.trim())
  );

  return (
    <section className="border border-game-border bg-game-ui/90 p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="pixel-font text-sm text-accent">Flag inspector</h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Every flag’s setters and readers. Red = read but never set.
          </p>
        </div>
        <button
          type="button"
          className="text-[10px] underline text-muted-foreground"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "Hide" : "Show"}
        </button>
      </div>
      {open && (
        <>
          {neverSet.length > 0 && (
            <div className="border border-destructive/50 px-2 py-1.5 text-xs text-destructive">
              Never set: {neverSet.join(", ")}
            </div>
          )}
          <input
            className="w-full bg-background border border-border px-2 py-2 text-xs min-h-[36px]"
            placeholder="Filter flags…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          {list.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No flags yet — pickups, talk setFlag, and exit gates will appear
              here.
            </p>
          ) : (
            <ul className="space-y-2 max-h-64 overflow-y-auto text-xs">
              {list.map((e) => {
                const orphan = e.readers.length > 0 && e.setters.length === 0;
                return (
                  <li
                    key={e.flag}
                    className={`border px-2 py-1.5 space-y-1 ${
                      orphan
                        ? "border-destructive/50"
                        : "border-border/60"
                    }`}
                  >
                    <div className="pixel-font text-[11px] text-accent">
                      {e.flag}
                      {orphan ? " · never set" : ""}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Sets: </span>
                      {e.setters.length === 0 ? (
                        <span className="text-destructive">—</span>
                      ) : (
                        <ul className="mt-0.5 space-y-0.5">
                          {e.setters.map((r, i) => (
                            <li key={i}>
                              <RefLine
                                label={r.label}
                                roomId={r.roomId}
                                hotspotId={r.hotspotId}
                                onFocusRoom={onFocusRoom}
                                onFocusHotspot={onFocusHotspot}
                              />
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Reads: </span>
                      {e.readers.length === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <ul className="mt-0.5 space-y-0.5">
                          {e.readers.map((r, i) => (
                            <li key={i}>
                              <RefLine
                                label={r.label}
                                roomId={r.roomId}
                                hotspotId={r.hotspotId}
                                onFocusRoom={onFocusRoom}
                                onFocusHotspot={onFocusHotspot}
                              />
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

function RefLine({
  label,
  roomId,
  hotspotId,
  onFocusRoom,
  onFocusHotspot,
}: {
  label: string;
  roomId?: string;
  hotspotId?: string;
  onFocusRoom?: (id: string) => void;
  onFocusHotspot?: (roomId: string, hotspotId: string) => void;
}) {
  return (
    <span className="leading-relaxed">
      {label}
      {roomId && (
        <>
          {" "}
          <button
            type="button"
            className="underline text-primary"
            onClick={() =>
              hotspotId
                ? onFocusHotspot?.(roomId, hotspotId)
                : onFocusRoom?.(roomId)
            }
          >
            open
          </button>
        </>
      )}
    </span>
  );
}
