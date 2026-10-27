import { useEffect, useRef, useState } from "react";
import { useAdventure } from "@/engine";
import type { JsonPackDocument } from "@/engine/jsonPack";
import {
  createPlaytestSession,
  diffPlaytestStates,
  finalizePlaytestSession,
  formatPlaytestSessionJson,
  formatPlaytestSessionMarkdown,
  formatWalkthroughNote,
  type PlaytestSessionSnapshot,
} from "@/studio/playtestSession";
import { toast } from "@/hooks/use-toast";

export interface PlaytestSessionPanelProps {
  doc: JsonPackDocument;
  /** Remount / clear when preview reloads */
  reloadToken: number;
}

/**
 * Records room / flag / inventory timeline during live preview for stuck reports.
 */
export function PlaytestSessionPanel({
  doc,
  reloadToken,
}: PlaytestSessionPanelProps) {
  const { gameState, currentMessage } = useAdventure();
  const [session, setSession] = useState<PlaytestSessionSnapshot>(() =>
    createPlaytestSession(doc.id, doc.title)
  );
  const startedAtRef = useRef(Date.now());
  const prevStateRef = useRef(gameState);
  const lastMessageRef = useRef<string | null>(null);

  useEffect(() => {
    startedAtRef.current = Date.now();
    prevStateRef.current = gameState;
    lastMessageRef.current = null;
    setSession(createPlaytestSession(doc.id, doc.title));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset on reload only
  }, [reloadToken, doc.id, doc.title]);

  useEffect(() => {
    const elapsed = Date.now() - startedAtRef.current;
    const events = diffPlaytestStates(
      prevStateRef.current,
      gameState,
      elapsed
    );
    prevStateRef.current = gameState;
    if (!events.length) return;
    setSession((prev) => ({
      ...prev,
      events: [...prev.events, ...events],
    }));
  }, [gameState]);

  useEffect(() => {
    if (!currentMessage || currentMessage === lastMessageRef.current) return;
    lastMessageRef.current = currentMessage;
    const elapsed = Date.now() - startedAtRef.current;
    setSession((prev) => ({
      ...prev,
      events: [
        ...prev.events,
        {
          t: elapsed,
          kind: "message",
          detail: currentMessage.slice(0, 160),
          roomId: gameState.currentLocation,
        },
      ],
    }));
  }, [currentMessage, gameState.currentLocation]);

  const download = (format: "md" | "json" | "walkthrough") => {
    const finalized = finalizePlaytestSession(session, gameState);
    const body =
      format === "md"
        ? formatPlaytestSessionMarkdown(finalized)
        : format === "json"
          ? formatPlaytestSessionJson(finalized)
          : formatWalkthroughNote(finalized);
    const blob = new Blob([body], {
      type:
        format === "json"
          ? "application/json"
          : "text/markdown",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download =
      format === "json"
        ? `playtest-${doc.id}.json`
        : format === "walkthrough"
          ? `walkthrough-${doc.id}.md`
          : `playtest-${doc.id}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title:
        format === "walkthrough"
          ? "Walkthrough downloaded"
          : "Playtest session exported",
      description: `${finalized.events.length} events · ${format}`,
    });
  };

  const copyMarkdown = async () => {
    const finalized = finalizePlaytestSession(session, gameState);
    const body = formatPlaytestSessionMarkdown(finalized);
    try {
      await navigator.clipboard.writeText(body);
      toast({ title: "Copied playtest timeline" });
    } catch {
      toast({
        title: "Copy failed",
        description: "Use Download instead.",
        variant: "destructive",
      });
    }
  };

  const copyWalkthrough = async () => {
    const finalized = finalizePlaytestSession(session, gameState);
    const body = formatWalkthroughNote(finalized);
    try {
      await navigator.clipboard.writeText(body);
      toast({ title: "Copied walkthrough" });
    } catch {
      // Fallback: download when clipboard is blocked
      download("walkthrough");
    }
  };

  return (
    <div className="border-2 border-accent/50 bg-black/30 mt-2">
      <div className="px-3 py-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-accent/30 bg-accent/10">
        <div>
          <p className="pixel-font text-[10px] text-accent">Playtest export</p>
          <p className="text-[10px] text-muted-foreground">
            {session.events.length} events · room path · flags · walkthrough
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            className="pixel-font text-[9px] min-h-[32px] px-2.5 border-2 border-accent text-accent bg-accent/15 hover:bg-accent/25"
            onClick={() => void copyWalkthrough()}
            title="Copy player-facing spoiler note"
          >
            Copy walkthrough
          </button>
          <button
            type="button"
            className="pixel-font text-[9px] min-h-[32px] px-2 border border-game-border hover:bg-secondary/40"
            onClick={() => download("walkthrough")}
            title="Download walkthrough .md"
          >
            Walk .md
          </button>
          <button
            type="button"
            className="pixel-font text-[9px] min-h-[32px] px-2 border border-game-border hover:bg-secondary/40"
            onClick={() => void copyMarkdown()}
          >
            Copy MD
          </button>
          <button
            type="button"
            className="pixel-font text-[9px] min-h-[32px] px-2 border border-game-border hover:bg-secondary/40"
            onClick={() => download("md")}
          >
            .md
          </button>
          <button
            type="button"
            className="pixel-font text-[9px] min-h-[32px] px-2 border border-game-border hover:bg-secondary/40"
            onClick={() => download("json")}
          >
            .json
          </button>
        </div>
      </div>
      <ul className="max-h-28 overflow-y-auto px-3 py-2 space-y-0.5 text-[10px] text-muted-foreground">
        {session.events.slice(-12).map((e, i) => (
          <li key={`${e.t}-${e.kind}-${i}`}>
            <span className="text-accent/80">
              {(e.t / 1000).toFixed(1)}s
            </span>{" "}
            <span className="text-foreground/80">{e.kind}</span> {e.detail}
          </li>
        ))}
      </ul>
    </div>
  );
}
