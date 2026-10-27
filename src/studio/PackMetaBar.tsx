import type { RefObject } from "react";
import { Link } from "react-router-dom";
import type { JsonPackDocument } from "@/engine/jsonPack";
import type { LinkedValidationResult } from "@/engine/validationHelp";
import { suggestId } from "@/authoring/codegen";
import { ValidationIssueList } from "@/components/authoring/ValidationIssueList";
import { toastOk } from "@/studio/toastError";

export interface PackMetaBarProps {
  doc: JsonPackDocument;
  guided: boolean;
  roomIds: string[];
  validation: LinkedValidationResult;
  publishedId: string | null;
  canUndo: boolean;
  canRedo: boolean;
  downloadBtnRef: RefObject<HTMLButtonElement | null>;
  publishBtnRef: RefObject<HTMLButtonElement | null>;
  importRef: RefObject<HTMLInputElement | null>;
  onOpenWizard: () => void;
  onExport: () => void;
  onPublish: () => void;
  onPlay: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onCopyTs: () => void;
  onExportGameFolder: () => void;
  onCopyShipCli: () => void;
  onImport: (file: File | null) => void;
  onReset: () => void;
  onPersist: (doc: JsonPackDocument) => void;
  onDismissPublished: () => void;
}

/**
 * Pack tab meta chrome: actions, published banner, id/title/start/verbs, validation.
 */
export function PackMetaBar({
  doc,
  guided,
  roomIds,
  validation,
  publishedId,
  canUndo,
  canRedo,
  downloadBtnRef,
  publishBtnRef,
  importRef,
  onOpenWizard,
  onExport,
  onPublish,
  onPlay,
  onUndo,
  onRedo,
  onCopyTs,
  onExportGameFolder,
  onCopyShipCli,
  onImport,
  onReset,
  onPersist,
  onDismissPublished,
}: PackMetaBarProps) {
  return (
    <section className="border border-game-border bg-game-ui/90 p-4 space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h3 className="pixel-font text-sm text-accent">Pack</h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onOpenWizard}
            className="pixel-font text-xs min-h-[40px] px-3 border border-accent text-accent"
          >
            New game
          </button>
          <button
            ref={downloadBtnRef}
            type="button"
            onClick={onExport}
            className="pixel-font text-xs min-h-[40px] px-3 border-2 border-accent text-accent"
          >
            Download .pack.json
          </button>
          <button
            ref={publishBtnRef}
            type="button"
            onClick={onPublish}
            className="pixel-font text-xs min-h-[40px] px-3 border-2 border-primary text-primary"
          >
            Publish to launcher
          </button>
          <button
            type="button"
            onClick={onPlay}
            className="pixel-font text-xs min-h-[40px] px-3 border border-primary text-primary"
          >
            Play draft
          </button>
          {!guided && (
            <>
              <button
                type="button"
                disabled={!canUndo}
                onClick={onUndo}
                className="pixel-font text-xs min-h-[40px] px-3 border border-game-border disabled:opacity-40"
              >
                Undo
              </button>
              <button
                type="button"
                disabled={!canRedo}
                onClick={onRedo}
                className="pixel-font text-xs min-h-[40px] px-3 border border-game-border disabled:opacity-40"
              >
                Redo
              </button>
              <button
                type="button"
                onClick={() => void onCopyTs()}
                className="pixel-font text-xs min-h-[40px] px-3 border border-accent text-accent"
              >
                Copy TS pack
              </button>
              <button
                type="button"
                onClick={() => void onExportGameFolder()}
                className="pixel-font text-xs min-h-[40px] px-3 border border-accent text-accent"
                title="Download src/games/<id>/ folder (manifest, README, assets list, registry snippet)"
              >
                Download game folder (.zip)
              </button>
              <button
                type="button"
                onClick={() => void onCopyShipCli()}
                className="pixel-font text-xs min-h-[40px] px-3 border border-game-border"
                title="After Download .pack.json — register into src/games/"
              >
                Copy repo ship cmd
              </button>
              <button
                type="button"
                onClick={() => importRef.current?.click()}
                className="pixel-font text-xs min-h-[40px] px-3 border border-game-border"
              >
                Import
              </button>
              <button
                type="button"
                onClick={onReset}
                className="pixel-font text-xs min-h-[40px] px-3 border border-destructive/50 text-destructive"
              >
                Reset
              </button>
            </>
          )}
          {guided && (
            <button
              type="button"
              disabled={!canUndo}
              onClick={onUndo}
              className="pixel-font text-xs min-h-[40px] px-3 border border-game-border disabled:opacity-40"
            >
              Undo
            </button>
          )}
          <input
            ref={importRef}
            type="file"
            accept="application/json,.json,.pack.json"
            className="hidden"
            onChange={(e) => void onImport(e.target.files?.[0] ?? null)}
          />
        </div>
      </div>
      {publishedId && (
        <div
          className="border-2 border-primary/70 bg-primary/10 px-3 py-3 space-y-2"
          role="status"
        >
          <p className="pixel-font text-xs text-primary">
            Published — this browser only
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Local launcher can play it now. To share with others: Download
            .pack.json → Import on their launcher, or run{" "}
            <code className="text-accent">npm run pack-from-json</code> to
            register into this repo.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              to={`/play/${publishedId}`}
              className="pixel-font text-xs min-h-[40px] px-3 border-2 border-accent text-accent inline-flex items-center hover:bg-accent/10"
            >
              Play /play/{publishedId}
            </Link>
            <button
              type="button"
              className="pixel-font text-xs min-h-[40px] px-3 border border-game-border"
              onClick={async () => {
                const url = `${window.location.origin}/play/${publishedId}`;
                try {
                  await navigator.clipboard.writeText(url);
                  toastOk("Copied play link", url);
                } catch {
                  toastOk("Play link", url);
                }
              }}
            >
              Copy play link
            </button>
            <button
              type="button"
              className="pixel-font text-xs min-h-[40px] px-3 border border-game-border"
              onClick={onExport}
            >
              Download .pack.json
            </button>
            <button
              type="button"
              className="pixel-font text-xs min-h-[40px] px-3 border border-game-border"
              onClick={onDismissPublished}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
        <label className="block text-xs space-y-1">
          <span className="text-muted-foreground">Id</span>
          <input
            className="w-full bg-background border border-border px-2 py-2 min-h-[40px]"
            value={doc.id}
            onChange={(e) =>
              onPersist({ ...doc, id: suggestId(e.target.value, "pack") })
            }
          />
        </label>
        <label className="block text-xs space-y-1">
          <span className="text-muted-foreground">Title</span>
          <input
            className="w-full bg-background border border-border px-2 py-2 min-h-[40px]"
            value={doc.title}
            onChange={(e) => onPersist({ ...doc, title: e.target.value })}
          />
        </label>
        <label className="block text-xs space-y-1">
          <span className="text-muted-foreground">Start room</span>
          <select
            className="w-full bg-background border border-border px-2 py-2 min-h-[40px]"
            value={doc.startRoom}
            onChange={(e) => onPersist({ ...doc, startRoom: e.target.value })}
          >
            {roomIds.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs space-y-1">
          <span className="text-muted-foreground">Verb mode</span>
          <select
            className="w-full bg-background border border-border px-2 py-2 min-h-[40px]"
            value={doc.verbMode || "coin"}
            onChange={(e) => {
              const v = e.target.value;
              onPersist({
                ...doc,
                verbMode:
                  v === "classic"
                    ? "classic"
                    : v === "simple"
                      ? "simple"
                      : "coin",
              });
            }}
          >
            <option value="coin">coin (radial — best on phones)</option>
            <option value="simple">simple (Look/Use)</option>
            <option value="classic">classic (7 verbs)</option>
          </select>
        </label>
      </div>
      {guided && (
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          <strong className="font-normal text-foreground">Verb modes:</strong>{" "}
          Guided defaults to{" "}
          <strong className="font-normal text-foreground">coin</strong> (tap
          hotspot → Look/Talk/Use). Simple is two buttons; classic is the full
          7-verb bar for desktop nostalgia.
        </p>
      )}
      <div
        id="pack-validation"
        className={`text-xs px-2 py-1.5 border ${
          validation.ok
            ? "border-primary/40 text-primary"
            : "border-destructive/50 text-destructive"
        }`}
      >
        {validation.ok
          ? `Valid · ${roomIds.length} room(s) · ${(doc.links ?? []).length} link(s)`
          : guided
            ? `${validation.errors.length} issue(s) — fix below, then Publish`
            : `${validation.errors.length} error(s) — fix via links below`}
      </div>
      {validation.issues.length > 0 && (
        <ValidationIssueList
          issues={validation.issues}
          guided={guided}
          showWarnings={!guided}
        />
      )}
    </section>
  );
}
