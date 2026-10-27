import { useEffect, useMemo, useState } from "react";
import { GameProvider } from "@/contexts/GameContext";
import { MusicProvider } from "@/contexts/MusicContext";
import { AdventurePlaySurface } from "@/components/game/AdventurePlaySurface";
import {
  createGameFromJson,
  validateJsonPack,
  type JsonPackDocument,
} from "@/engine/jsonPack";
import { preparePlayDraft } from "@/studio/packDraft";
import { ValidationIssueList } from "@/components/authoring/ValidationIssueList";
import { PlaytestCheatsPanel } from "@/studio/PlaytestCheatsPanel";
import { PlaytestSessionPanel } from "@/studio/PlaytestSessionPanel";

export type PreviewWidth = "phone" | "tablet" | "desktop";

const WIDTH_PX: Record<PreviewWidth, number | "100%"> = {
  phone: 390,
  tablet: 768,
  desktop: "100%",
};

/** Stable-ish fingerprint for “draft changed since last refresh”. */
export function packPreviewFingerprint(doc: JsonPackDocument): string {
  return JSON.stringify({
    id: doc.id,
    title: doc.title,
    startRoom: doc.startRoom,
    verbMode: doc.verbMode,
    links: doc.links,
    audio: doc.audio,
    hints: doc.hints,
    cutscenes: doc.cutscenes,
    rooms: Object.fromEntries(
      Object.entries(doc.rooms).map(([id, r]) => [
        id,
        {
          id: r.id,
          name: r.name,
          music: r.music,
          imageLen: r.image?.length ?? 0,
          hotspots: r.hotspots,
          walkboxes: r.walkboxes,
          entryPoint: r.entryPoint,
        },
      ])
    ),
  });
}

export interface PackPreviewProps {
  doc: JsonPackDocument;
  /** Bump to remount the play session (fresh state) */
  reloadToken: number;
  onReload: () => void;
  /** Guided mode starts collapsed so the Pack stack stays focused */
  defaultOpen?: boolean;
  guided?: boolean;
}

/**
 * In-studio live playframe for the current pack draft.
 */
export function PackPreview({
  doc,
  reloadToken,
  onReload,
  defaultOpen = true,
  guided = false,
}: PackPreviewProps) {
  const [width, setWidth] = useState<PreviewWidth>("phone");
  const [open, setOpen] = useState(defaultOpen);
  /** Draft snapshot driving the live play session (updates only on Refresh) */
  const [sessionDoc, setSessionDoc] = useState(doc);

  useEffect(() => {
    setSessionDoc(doc);
  }, [reloadToken]); // eslint-disable-line react-hooks/exhaustive-deps -- remount signal

  const draftFp = useMemo(() => packPreviewFingerprint(doc), [doc]);
  const sessionFp = useMemo(
    () => packPreviewFingerprint(sessionDoc),
    [sessionDoc]
  );
  const stale = draftFp !== sessionFp;

  const draftValidation = useMemo(() => validateJsonPack(doc), [doc]);
  const sessionValidation = useMemo(
    () => validateJsonPack(sessionDoc),
    [sessionDoc]
  );

  const compiled = useMemo(() => {
    if (!sessionValidation.ok) return null;
    try {
      return createGameFromJson(sessionDoc);
    } catch {
      return null;
    }
  }, [sessionDoc, sessionValidation.ok]);

  const openFullscreen = () => {
    preparePlayDraft(doc);
    window.open("/play/studio-draft", "_blank", "noopener,noreferrer");
  };

  const frameWidth = WIDTH_PX[width];

  return (
    <section className="border border-game-border bg-game-ui/90 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <h3 className="pixel-font text-sm text-accent">Live preview</h3>
          <button
            type="button"
            className="text-[10px] text-muted-foreground underline"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? "Hide" : "Show"}
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5 items-center">
          {(["phone", "tablet", "desktop"] as PreviewWidth[]).map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setWidth(w)}
              className={`pixel-font text-[10px] min-h-[32px] px-2 border ${
                width === w
                  ? "border-accent text-accent"
                  : "border-game-border text-muted-foreground"
              }`}
            >
              {w}
            </button>
          ))}
          <button
            type="button"
            onClick={onReload}
            disabled={!draftValidation.ok}
            className={`pixel-font text-[10px] min-h-[32px] px-2 border disabled:opacity-40 ${
              stale
                ? "border-accent text-accent bg-accent/10"
                : "border-primary text-primary"
            }`}
            title="Remount with current draft (resets play state)"
          >
            {stale ? "Refresh*" : "Refresh"}
          </button>
          <button
            type="button"
            onClick={openFullscreen}
            disabled={!draftValidation.ok}
            className="pixel-font text-[10px] min-h-[32px] px-2 border border-game-border disabled:opacity-40"
          >
            Full window
          </button>
        </div>
      </div>

      {open && (
        <div className="p-3 bg-black/20">
          {stale && draftValidation.ok && (
            <div className="text-xs text-accent border border-accent/40 p-2 mb-2 flex flex-wrap items-center justify-between gap-2">
              <span>Draft changed since last refresh — remount to play the latest pack.</span>
              <button
                type="button"
                onClick={onReload}
                className="pixel-font text-[10px] min-h-[32px] px-2 border border-accent"
              >
                Refresh now
              </button>
            </div>
          )}
          {!draftValidation.ok && (
            <div className="mb-2 space-y-2">
              <div className="text-xs text-destructive border border-destructive/40 p-2">
                Fix pack errors before preview
              </div>
              <ValidationIssueList
                issues={draftValidation.issues}
                showWarnings={false}
                guided={guided}
              />
            </div>
          )}
          {!sessionValidation.ok && draftValidation.ok && (
            <div className="text-xs text-muted-foreground border border-border p-3 mb-2">
              Previous preview session was invalid — Refresh to load the fixed draft.
            </div>
          )}
          {sessionValidation.ok && compiled && (
            <div className="flex flex-col items-center gap-2">
              <div
                className="border-2 border-game-border bg-background max-w-full"
                style={{
                  width: frameWidth === "100%" ? "100%" : frameWidth,
                  maxHeight: width === "phone" ? 720 : 820,
                  overflow: "auto",
                }}
              >
                <MusicProvider
                  key={`music-${reloadToken}`}
                  initialLocation={compiled.startRoom}
                >
                  <GameProvider
                    key={`game-${reloadToken}`}
                    definition={compiled}
                  >
                    <AdventurePlaySurface
                      variant="preview"
                      onRestart={onReload}
                    />
                    {!guided && <PlaytestCheatsPanel doc={sessionDoc} />}
                    <div className="sticky bottom-0 z-10 border-t border-accent/40 bg-background/95 backdrop-blur-sm">
                      <p className="px-3 pt-2 pixel-font text-[9px] text-accent">
                        Export playtest · Copy walkthrough when stuck
                      </p>
                      <PlaytestSessionPanel
                        doc={sessionDoc}
                        reloadToken={reloadToken}
                      />
                    </div>
                  </GameProvider>
                </MusicProvider>
              </div>
            </div>
          )}
          <p className="text-[10px] text-muted-foreground mt-2 text-center">
            {guided
              ? "Show preview when you’re ready to playtest. Refresh after edits. Export the playtest log / walkthrough from the panel under the frame."
              : "Preview compiles the draft in-memory. Refresh after editing. Use playtest cheats to jump / give / flag. Export MD/JSON or Copy walkthrough from the playtest panel."}
          </p>
        </div>
      )}
    </section>
  );
}
