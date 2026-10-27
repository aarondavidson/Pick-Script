import { useEffect, useState } from "react";
import { GameProvider } from "@/contexts/GameContext";
import { MusicProvider } from "@/contexts/MusicContext";
import { AdventurePlaySurface } from "@/components/game/AdventurePlaySurface";
import { Link, Navigate, useParams, useSearchParams } from "react-router-dom";
import { resolvePlayableGame } from "@/games/resolveGame";
import {
  createGameFromJson,
  parseJsonPack,
  type JsonPackDocument,
} from "@/engine/jsonPack";
import { applySidecarToDefinition } from "@/engine/packSidecar";
import { isStrictPlayEnabled } from "@/engine/deployLock";
import { loadPlayDraft } from "@/studio/packDraft";
import { isAuthoringEnabled } from "@/studio/studioAccess";
import { installPack } from "@/studio/installedPacks";
import {
  STORAGE_LIMITS,
  assertSafePackUrl,
  safeJsonParse,
} from "@/engine/security";
import type { GameDefinition } from "@/engine/definition";
import { getProductConfig, isGameLocked } from "@/product/productConfig";

/** Load a hosted .pack.json (same-origin or CORS-enabled HTTPS URL) into play. */
async function fetchPackFromUrl(url: string): Promise<JsonPackDocument> {
  const res = await fetch(url, { credentials: "omit" });
  if (!res.ok) throw new Error(`Could not fetch pack (${res.status})`);
  const text = await res.text();
  if (text.length > STORAGE_LIMITS.maxInstalledPackChars) {
    throw new Error("Pack file too large");
  }
  return parseJsonPack(safeJsonParse(text));
}

const Index = () => {
  const { gameId } = useParams<{ gameId?: string }>();
  const [search] = useSearchParams();
  const packUrl = search.get("packUrl");

  const [remoteDef, setRemoteDef] = useState<GameDefinition | null>(null);
  const [remoteDoc, setRemoteDoc] = useState<JsonPackDocument | null>(null);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const [remoteLoading, setRemoteLoading] = useState(!!packUrl);
  const [installNote, setInstallNote] = useState<string | null>(null);

  useEffect(() => {
    if (!packUrl) return;
    let cancelled = false;
    setRemoteLoading(true);
    setRemoteError(null);
    setInstallNote(null);
    setRemoteDoc(null);
    void (async () => {
      try {
        const safeUrl = assertSafePackUrl(packUrl);
        const doc = await fetchPackFromUrl(safeUrl);
        if (cancelled) return;
        // Play without auto-installing into localStorage (confirm below).
        setRemoteDoc(doc);
        setRemoteDef(applySidecarToDefinition(createGameFromJson(doc)));
      } catch (e) {
        if (!cancelled) {
          setRemoteError(e instanceof Error ? e.message : String(e));
        }
      } finally {
        if (!cancelled) setRemoteLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [packUrl]);

  if (packUrl) {
    if (remoteLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background">
          <p className="pixel-font text-accent">Loading pack…</p>
        </div>
      );
    }
    if (remoteError || !remoteDef) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 bg-background">
          <p className="pixel-font text-accent text-xl">Pack URL failed</p>
          <p className="text-sm text-destructive max-w-md text-center">
            {remoteError || "Unknown error"}
          </p>
          <Link to="/" className="pixel-font text-sm text-primary underline">
            Back to launcher
          </Link>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-background">
        {remoteDoc && (
          <div className="border-b border-game-border bg-game-ui/90 px-4 py-2 flex flex-wrap items-center gap-3 justify-center text-xs">
            <span className="text-muted-foreground">
              Playing remote pack{" "}
              <span className="text-accent pixel-font">{remoteDoc.title}</span>
              {" — "}
              not saved to this browser yet.
            </span>
            <button
              type="button"
              className="pixel-font min-h-[36px] px-3 border border-accent text-accent hover:bg-accent/10"
              onClick={() => {
                try {
                  installPack(remoteDoc);
                  setInstallNote(`Installed “${remoteDoc.title}” for this browser.`);
                } catch (e) {
                  setInstallNote(
                    e instanceof Error ? e.message : "Install failed"
                  );
                }
              }}
            >
              Install to launcher
            </button>
            {installNote && (
              <span className="text-primary">{installNote}</span>
            )}
            <Link to="/" className="text-primary underline pixel-font">
              Launcher
            </Link>
          </div>
        )}
        <MusicProvider initialLocation={remoteDef.startRoom}>
          <GameProvider definition={remoteDef}>
            <AdventurePlaySurface variant="full" />
          </GameProvider>
        </MusicProvider>
      </div>
    );
  }

  if (gameId === "studio-draft") {
    // Deploy lock: draft play is authoring-only on public builds.
    if (isStrictPlayEnabled() || !isAuthoringEnabled()) {
      return <Navigate to="/" replace />;
    }
    const draft = loadPlayDraft();
    if (!draft) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 bg-background">
          <p className="pixel-font text-accent text-xl">No P.I.C.K. draft ready</p>
          <p className="text-sm text-muted-foreground text-center max-w-sm">
            Open P.I.C.K. → Pack → Play draft (or Live preview) to load a
            self-contained S.C.R.I.P.T. pack.
          </p>
          <Link
            to="/pick"
            className="pixel-font text-sm text-primary underline"
          >
            Back to P.I.C.K.
          </Link>
        </div>
      );
    }
    let definition;
    try {
      definition = applySidecarToDefinition(createGameFromJson(draft));
    } catch (e) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 bg-background">
          <p className="pixel-font text-accent text-xl">Draft pack invalid</p>
          <p className="text-sm text-destructive">
            {e instanceof Error ? e.message : String(e)}
          </p>
          <Link
            to="/pick"
            className="pixel-font text-sm text-primary underline"
          >
            Back to P.I.C.K.
          </Link>
        </div>
      );
    }
    return (
      <MusicProvider initialLocation={definition.startRoom}>
        <GameProvider definition={definition}>
          <AdventurePlaySurface variant="full" />
        </GameProvider>
      </MusicProvider>
    );
  }

  const entry = resolvePlayableGame(
    gameId ?? getProductConfig().defaultGameId
  );

  if (!entry) {
    const locked = isGameLocked(gameId ?? getProductConfig().defaultGameId);
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 bg-background">
        <p className="pixel-font text-accent text-xl">
          {locked ? "Title locked on this build" : "Game not found"}
        </p>
        {locked && (
          <p className="text-sm text-muted-foreground text-center max-w-sm">
            This share hides selected shipped titles. Try Attic Study or another
            unlocked pack from the launcher.
          </p>
        )}
        <Link to="/" className="pixel-font text-sm text-primary underline">
          Back to launcher
        </Link>
      </div>
    );
  }

  const definition = applySidecarToDefinition(entry.definition);

  return (
    <MusicProvider initialLocation={definition.startRoom}>
      <GameProvider definition={definition}>
        <AdventurePlaySurface variant="full" />
      </GameProvider>
    </MusicProvider>
  );
};

export default Index;
