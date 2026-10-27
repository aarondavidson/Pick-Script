import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { parseJsonPack, validateJsonPack } from "@/engine/jsonPack";
import { safeJsonParse } from "@/engine/security";
import { applyCoachSuggestion } from "@/authoring/coachApply";
import type { DesignSuggestion } from "@/authoring/designCoach";
import {
  PACK_TEMPLATES,
  type PackTemplateId,
} from "@/authoring/packTemplates";
import {
  downloadGameFolderZip,
  downloadPackJson,
  preparePlayDraft,
} from "@/studio/packDraft";
import { toastError, toastFail, toastOk } from "@/studio/toastError";
import { PackPreview } from "@/studio/PackPreview";
import {
  formatJsonPackAsManifestTs,
  listJsonPackAssetFiles,
} from "@/authoring/jsonPackCodegen";
import { PackMetaBar } from "@/studio/PackMetaBar";
import { recipesGalleryHref, studioTabHref } from "@/engine/validationHelp";
import { PackPuzzlesPanel } from "@/studio/PackPuzzlesPanel";
import { PackItemsPanel } from "@/studio/PackItemsPanel";
import { PackWorldPanel } from "@/studio/PackWorldPanel";
import { PackDialoguePanel } from "@/studio/PackDialoguePanel";
import { DesignCoachPanel } from "@/studio/DesignCoachPanel";
import { NewGameWizard } from "@/studio/NewGameWizard";
import { PixelLibraryPanel } from "@/studio/PixelLibraryPanel";
import { HotspotIntentWizard } from "@/studio/HotspotIntentWizard";
import { PackLibraryPanel } from "@/studio/PackLibraryPanel";
import { PackSetupPanel } from "@/studio/PackSetupPanel";
import { PackPuzzleGraphPanel } from "@/studio/PackPuzzleGraphPanel";
import { PackStarterGallery } from "@/studio/PackStarterGallery";
import { WorldMapGraph } from "@/studio/WorldMapGraph";
import { UnlockChainWizard } from "@/studio/UnlockChainWizard";
import { FlagInspectorPanel } from "@/studio/FlagInspectorPanel";
import { PackRecipeApplyPanel } from "@/studio/PackRecipeApplyPanel";
import { PackBlendPanel } from "@/studio/PackBlendPanel";
import { RoomStubFactoryPanel } from "@/studio/RoomStubFactoryPanel";
import { PropLibraryPanel } from "@/studio/PropLibraryPanel";
import { RoomLayersPanel } from "@/studio/RoomLayersPanel";
import { PackHintsPanel } from "@/studio/PackHintsPanel";
import { PackProgressPanel } from "@/studio/PackProgressPanel";
import { PackActorsPanel } from "@/studio/PackActorsPanel";
import { PackCutscenesPanel } from "@/studio/PackCutscenesPanel";
import { PackRoomsPanel } from "@/studio/PackRoomsPanel";
import { ArtHandoffPanel } from "@/studio/ArtHandoffPanel";
import { PackLinksPanel } from "@/studio/PackLinksPanel";
import { PackStageCanvas } from "@/studio/PackStageCanvas";
import {
  loadStudioMode,
  saveStudioMode,
  type StudioMode,
} from "@/studio/studioModePrefs";
import { createLibraryDraft, syncActiveLibrary } from "@/studio/packLibrary";
import { installPack } from "@/studio/installedPacks";
import { usePackDraft } from "@/studio/usePackDraft";
import { gameCatalog } from "@/games/registry";
import {
  humanizeValidationMessage,
  scrollToPackValidation,
} from "@/studio/plainValidation";

/**
 * Pack draft hub — rooms, art, hotspots, room links, validate, export, play.
 * Self-contained .pack.json handoff (no hunting asset paths).
 */
function parseTemplateHint(raw: string | null): PackTemplateId | undefined {
  if (!raw) return undefined;
  return PACK_TEMPLATES.some((t) => t.id === raw)
    ? (raw as PackTemplateId)
    : undefined;
}

export function PackTool() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [publishedId, setPublishedId] = useState<string | null>(null);
  const {
    doc,
    ready,
    persist,
    undo,
    redo,
    canUndo,
    canRedo,
    reset,
  } = usePackDraft();
  const [mode, setMode] = useState<StudioMode>(() => loadStudioMode());
  const guided = mode === "guided";
  /** Guided: hide polish panels until the core loop works */
  const [showPolish, setShowPolish] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardTemplate, setWizardTemplate] = useState<
    PackTemplateId | undefined
  >(() => parseTemplateHint(searchParams.get("new")));
  const publishBtnRef = useRef<HTMLButtonElement>(null);
  const downloadBtnRef = useRef<HTMLButtonElement>(null);
  const roomArtFocusRef = useRef<HTMLLabelElement>(null);
  const [intentOpen, setIntentOpen] = useState(false);
  const [intentHotspotId, setIntentHotspotId] = useState<string | null>(null);
  const [roomId, setRoomId] = useState("start");
  const [selectedHotspot, setSelectedHotspot] = useState<string | null>(null);
  const [canvasMode, setCanvasMode] = useState<"hotspots" | "walkboxes">(
    "hotspots"
  );
  const [previewReload, setPreviewReload] = useState(0);

  const importRef = useRef<HTMLInputElement>(null);
  const roomArtRef = useRef<HTMLInputElement>(null);
  const hotspotSectionRef = useRef<HTMLElement | null>(null);
  const syncedRoomRef = useRef(false);

  useEffect(() => {
    if (!ready || syncedRoomRef.current) return;
    setRoomId(doc.startRoom);
    syncedRoomRef.current = true;
  }, [ready, doc.startRoom]);

  /** Deep-link: ?new=short-mystery and/or ?funnel=1 → open wizard */
  useEffect(() => {
    const newHint = parseTemplateHint(searchParams.get("new"));
    const funnel = searchParams.get("funnel") === "1";
    if (!newHint && !funnel) return;
    setWizardTemplate(newHint ?? "short-mystery");
    setWizardOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete("new");
    next.delete("funnel");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (!doc.rooms[roomId]) {
      setRoomId(doc.startRoom);
    }
  }, [doc, roomId]);

  const room = doc.rooms[roomId];
  const hotspots = room?.hotspots ?? [];
  const selected = hotspots.find((h) => h.id === selectedHotspot) ?? null;
  const roomIds = Object.keys(doc.rooms);

  const validation = useMemo(() => validateJsonPack(doc), [doc]);

  const onCoachApply = (suggestion: DesignSuggestion) => {
    const result = applyCoachSuggestion(doc, suggestion.id, roomId);
    if (result.kind === "doc") {
      persist(result.doc);
      toastOk("Applied", result.message);
      return;
    }
    if (result.kind === "focus") {
      if (result.focus === "room-art") {
        roomArtFocusRef.current?.scrollIntoView({ behavior: "smooth" });
        roomArtRef.current?.focus();
      } else if (result.focus === "hotspot-draw") {
        hotspotSectionRef.current?.scrollIntoView({ behavior: "smooth" });
      } else if (
        result.focus === "intent-get-item" ||
        result.focus === "intent-use-with" ||
        result.focus === "intent-locked-exit"
      ) {
        setIntentHotspotId(selectedHotspot);
        setIntentOpen(true);
      } else if (result.focus === "pixels") {
        window.location.href = studioTabHref("pixels");
      } else if (result.focus === "audio") {
        window.location.href = studioTabHref("audio");
      } else if (result.focus === "dialogue") {
        setShowPolish(true);
        document
          .getElementById("pack-dialogue")
          ?.scrollIntoView({ behavior: "smooth" });
      } else if (result.focus === "publish") {
        publishBtnRef.current?.scrollIntoView({ behavior: "smooth" });
        publishBtnRef.current?.focus();
      } else if (result.focus === "download") {
        downloadBtnRef.current?.scrollIntoView({ behavior: "smooth" });
        downloadBtnRef.current?.focus();
      } else if (result.focus === "polish") {
        setShowPolish(true);
        document
          .getElementById("pack-polish")
          ?.scrollIntoView({ behavior: "smooth" });
      }
      toastOk("Next step", result.message);
      return;
    }
    toastOk("Tip", result.message);
  };

  const failValidation = (errors: string[]) => {
    scrollToPackValidation();
    toastFail(
      "Almost — fix this first",
      humanizeValidationMessage(errors[0] ?? "Validation failed")
    );
  };

  const onPublish = () => {
    const result = validateJsonPack(doc);
    if (!result.ok) {
      failValidation(result.errors);
      return;
    }
    const staticHit = gameCatalog.find((g) => g.id === doc.id);
    if (staticHit) {
      const ok = window.confirm(
        `Pack id "${doc.id}" matches the shipped title “${staticHit.title}”. Publishing overrides it in this browser only (localStorage). Continue?`
      );
      if (!ok) return;
    }
    const installed = installPack(doc);
    setPublishedId(installed.id);
    toastOk(
      "Published to launcher",
      `This browser only — play /play/${installed.id} or Download .pack.json to share`
    );
  };

  const copyShipCli = async () => {
    const cmd = `npm run pack-from-json -- ./${doc.id || "my-game"}.pack.json`;
    try {
      await navigator.clipboard.writeText(cmd);
      toastOk(
        "Copied ship command",
        "Download .pack.json first, then run this in the repo root"
      );
    } catch {
      toastOk("Ship command", cmd);
    }
  };

  const onExport = () => {
    const result = validateJsonPack(doc);
    if (!result.ok) {
      failValidation(result.errors);
      return;
    }
    downloadPackJson(doc);
    toastOk(
      "Downloaded .pack.json",
      "Self-contained — images are inside the file"
    );
  };

  const onExportGameFolder = async () => {
    const result = validateJsonPack(doc);
    if (!result.ok) {
      failValidation(result.errors);
      return;
    }
    const mode = await downloadGameFolderZip(doc);
    if (mode === "zip") {
      toastOk(
        "Downloaded game folder (.zip)",
        "Unpack under the repo — paste REGISTRY_SNIPPET.ts.txt into registry.ts"
      );
    } else {
      toastOk(
        "Downloaded manifest + SHIP.txt",
        "Zip unavailable — follow SHIP.txt for assets and registry paste"
      );
    }
  };

  const onImport = async (file: File | null) => {
    if (!file) return;
    try {
      const text = await file.text();
      if (text.length > 15_000_000) {
        throw new Error("Pack file too large");
      }
      const next = parseJsonPack(safeJsonParse(text));
      persist(next);
      setRoomId(next.startRoom);
      toastOk("Pack imported", next.title);
    } catch (e) {
      toastError("Import failed", e);
    }
  };

  const onPlay = () => {
    const result = validateJsonPack(doc);
    if (!result.ok) {
      failValidation(result.errors);
      return;
    }
    preparePlayDraft(doc);
    window.open("/play/studio-draft", "_blank", "noopener,noreferrer");
  };

  if (!ready) {
    return (
      <p className="text-sm text-muted-foreground">Loading pack draft…</p>
    );
  }

  const focusRoom = (id: string, scroll = true) => {
    setRoomId(id);
    setSelectedHotspot(null);
    if (scroll) {
      hotspotSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  const focusHotspot = (rid: string, hid: string, scroll = true) => {
    setRoomId(rid);
    setSelectedHotspot(hid);
    setCanvasMode("hotspots");
    if (scroll) {
      hotspotSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  const isEmptyStarter =
    doc.title === "Untitled Pack" &&
    Object.keys(doc.rooms).length <= 1 &&
    !(doc.rooms[doc.startRoom]?.hotspots?.length) &&
    !doc.rooms[doc.startRoom]?.image;

  const openWizard = (template?: PackTemplateId) => {
    setWizardTemplate(template);
    setWizardOpen(true);
  };

  return (
    <div className="space-y-6">
      <NewGameWizard
        open={wizardOpen}
        defaultTemplate={wizardTemplate}
        onClose={() => {
          setWizardOpen(false);
          setWizardTemplate(undefined);
        }}
        onCreate={(next) => {
          persist(next);
          setRoomId(next.startRoom);
          setSelectedHotspot(null);
          void createLibraryDraft(next, next.title);
          toastOk("Pack created", next.title);
          requestAnimationFrame(() => {
            document
              .getElementById("art-handoff")
              ?.scrollIntoView({ behavior: "smooth", block: "start" });
          });
        }}
      />
      <HotspotIntentWizard
        open={intentOpen}
        onClose={() => {
          setIntentOpen(false);
          setIntentHotspotId(null);
        }}
        doc={doc}
        roomId={roomId}
        hotspot={
          (intentHotspotId
            ? hotspots.find((h) => h.id === intentHotspotId)
            : selected) ?? null
        }
        onApply={(next, selectId) => {
          persist(next);
          if (selectId) setSelectedHotspot(selectId);
          void syncActiveLibrary(next);
          toastOk("Intent applied");
        }}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
          {guided ? (
            <>
              One path: wizard → room art → draw hotspot (Intent Wizard) →
              preview → Publish. Everything else is under Polish.
            </>
          ) : (
            <>
              Build a self-contained pack — rooms, art, hotspots, items,
              dialogue, and links — then download{" "}
              <code className="text-accent">.pack.json</code> or play the draft.
            </>
          )}
        </p>
        {!guided && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="pixel-font text-[10px] min-h-[36px] px-3 border border-game-border"
              onClick={() => setMode(saveStudioMode("guided"))}
            >
              Switch to Guided
            </button>
          </div>
        )}
      </div>

      {isEmptyStarter && (
        <section className="border-2 border-accent/50 bg-accent/5 p-4 space-y-3">
          <h3 className="pixel-font text-sm text-accent">Start a new game</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Recommend <code className="text-accent text-[11px]">short-mystery</code>{" "}
            (5 rooms, harbor key → lighthouse). The wizard also offers blank,
            key→door, and two-room kits — real inventory / use-with / locked
            exits, not copy-paste scripts.
          </p>
          <button
            type="button"
            onClick={() => openWizard("short-mystery")}
            className="pixel-font text-xs min-h-[44px] px-4 border-2 border-accent text-accent"
          >
            New game wizard · short-mystery
          </button>
        </section>
      )}

      {guided && !isEmptyStarter && (
        <section className="border border-border/60 bg-game-ui/60 px-3 py-2 text-[11px] text-muted-foreground leading-relaxed">
          <strong className="font-normal text-foreground">Already built-in:</strong>{" "}
          inventory, Look/Use (or coin verbs), use-with, room links, save/load,
          map, hints — you wire content; you don’t rebuild the engine.
        </section>
      )}

      <PackMetaBar
        doc={doc}
        guided={guided}
        roomIds={roomIds}
        validation={validation}
        publishedId={publishedId}
        canUndo={canUndo}
        canRedo={canRedo}
        downloadBtnRef={downloadBtnRef}
        publishBtnRef={publishBtnRef}
        importRef={importRef}
        onOpenWizard={() => openWizard()}
        onExport={onExport}
        onPublish={onPublish}
        onPlay={onPlay}
        onUndo={undo}
        onRedo={redo}
        onCopyTs={async () => {
          const result = validateJsonPack(doc);
          if (!result.ok) {
            failValidation(result.errors);
            return;
          }
          const code = formatJsonPackAsManifestTs(doc);
          await navigator.clipboard.writeText(code);
          const assets = listJsonPackAssetFiles(doc);
          toastOk(
            "Copied TS manifest",
            `Save assets: ${assets.slice(0, 3).join(", ")}${assets.length > 3 ? "…" : ""}`
          );
        }}
        onExportGameFolder={() => void onExportGameFolder()}
        onCopyShipCli={() => void copyShipCli()}
        onImport={(file) => void onImport(file)}
        onReset={() => {
          void reset().then((empty) => {
            setRoomId(empty.startRoom);
            setSelectedHotspot(null);
            toastOk("Draft reset");
          });
        }}
        onPersist={(next) => persist(next)}
        onDismissPublished={() => setPublishedId(null)}
      />

      <PackStarterGallery
        onLoad={(next) => {
          persist(next, { skipHistory: true });
          setRoomId(next.startRoom);
          setSelectedHotspot(null);
          document
            .getElementById("pack-setup")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
      />

      <PackSetupPanel
        doc={doc}
        onFocusRoom={focusRoom}
        onFocusHotspot={focusHotspot}
      />

      <PackPuzzleGraphPanel
        doc={doc}
        onChange={(next) => persist(next)}
        onFocusRoom={focusRoom}
        onFocusHotspot={focusHotspot}
      />

      <div className="grid lg:grid-cols-2 gap-4">
        <RoomStubFactoryPanel
          doc={doc}
          onChange={(next) => persist(next)}
        />
        <PackRecipeApplyPanel
          doc={doc}
          roomId={roomId}
          onChange={(next) => persist(next)}
        />
      </div>

      <PackBlendPanel
        doc={doc}
        onChange={(next) => persist(next)}
      />

      <div className="grid lg:grid-cols-2 gap-4">
        <UnlockChainWizard
          doc={doc}
          roomId={roomId}
          onChange={(next) => persist(next)}
        />
        <FlagInspectorPanel
          doc={doc}
          onFocusRoom={(id) => focusRoom(id, false)}
          onFocusHotspot={(rid, hid) => focusHotspot(rid, hid, false)}
        />
      </div>

      <WorldMapGraph
        doc={doc}
        onChange={(next) => persist(next)}
        onSelectRoom={(id) => {
          setRoomId(id);
          setSelectedHotspot(null);
        }}
      />

      {!guided && (
        <PackLibraryPanel
          doc={doc}
          onLoad={(next) => {
            persist(next, { skipHistory: true });
            setRoomId(next.startRoom);
            setSelectedHotspot(null);
          }}
        />
      )}

      <DesignCoachPanel
        doc={doc}
        guided={guided}
        onApply={onCoachApply}
      />

      <PackPreview
        doc={doc}
        reloadToken={previewReload}
        onReload={() => setPreviewReload((n) => n + 1)}
        defaultOpen={!guided}
        guided={guided}
      />

      <div className="grid lg:grid-cols-2 gap-4">
        <PackRoomsPanel
          doc={doc}
          roomId={roomId}
          onChange={(next) => persist(next)}
          onSelectRoom={(id) => {
            setRoomId(id);
            setSelectedHotspot(null);
          }}
          onRoomIdChange={setRoomId}
          roomArtFocusRef={roomArtFocusRef}
          roomArtRef={roomArtRef}
        />

        <ArtHandoffPanel
          doc={doc}
          roomId={roomId}
          onChange={(next) => persist(next)}
          onAssignedRoom={() => {
            roomArtFocusRef.current?.scrollIntoView({
              behavior: "smooth",
              block: "nearest",
            });
          }}
        />

        <PixelLibraryPanel doc={doc} onChange={(next) => persist(next)} />

        <PackLinksPanel
          doc={doc}
          roomId={roomId}
          onChange={(next) => persist(next)}
          onSelectRoom={setRoomId}
        />
      </div>

      <PackStageCanvas
        doc={doc}
        roomId={roomId}
        guided={guided}
        selectedHotspot={selectedHotspot}
        canvasMode={canvasMode}
        sectionRef={hotspotSectionRef}
        onChange={(next) => persist(next)}
        onSelectHotspot={setSelectedHotspot}
        onCanvasModeChange={setCanvasMode}
        onOpenIntentWizard={(id) => {
          setIntentHotspotId(id);
          setIntentOpen(true);
        }}
      />

      {guided && (
        <button
          type="button"
          id="pack-polish"
          onClick={() => setShowPolish((v) => !v)}
          className="pixel-font text-xs min-h-[44px] w-full border border-game-border text-muted-foreground hover:text-foreground"
        >
          {showPolish
            ? "Hide polish (items, world, dialogue, hints…)"
            : "Polish… (items, world, dialogue, hints, puzzles)"}
        </button>
      )}

      {(!guided || showPolish) && (
        <>
          <div className="grid lg:grid-cols-2 gap-4">
            <PackItemsPanel doc={doc} onChange={(next) => persist(next)} />
            <PackWorldPanel doc={doc} onChange={(next) => persist(next)} />
          </div>

          <div id="pack-dialogue">
            <PackDialoguePanel
              doc={doc}
              roomId={roomId}
              hotspotId={selectedHotspot}
              onChange={(next) => persist(next)}
              onSelectHotspot={setSelectedHotspot}
            />
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <PackHintsPanel doc={doc} onChange={(next) => persist(next)} />
            <PackProgressPanel doc={doc} onChange={(next) => persist(next)} />
            <PackActorsPanel doc={doc} onChange={(next) => persist(next)} />
            <PackCutscenesPanel
              doc={doc}
              roomId={roomId}
              onChange={(next) => persist(next)}
            />
            <PropLibraryPanel
              doc={doc}
              roomId={roomId}
              onChange={(next) => persist(next)}
            />
            <RoomLayersPanel
              doc={doc}
              roomId={roomId}
              onChange={(next) => persist(next)}
            />
          </div>


          <PackPuzzlesPanel
            doc={doc}
            roomId={roomId}
            onChange={(next) => persist(next)}
          />
        </>
      )}

      <p className="text-[11px] text-muted-foreground">
        {guided ? (
          <>
            Core loop first. Open Polish when the checklist is green. Studio
            header switches to Advanced for Copy TS / raw JSON.
          </>
        ) : (
          <>
            Advanced TS packs still work via{" "}
            <code className="text-accent">npm run new-pack</code>. See{" "}
            <Link to={recipesGalleryHref()} className="text-primary underline">
              Recipes
            </Link>
            .
          </>
        )}
      </p>
    </div>
  );
}
