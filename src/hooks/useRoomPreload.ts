import { useEffect, useState } from "react";
import type { GameDefinition } from "@/engine";
import { collectRoomMediaUrls, neighbourRoomIds } from "@/engine/packAssets";

/** URLs that have finished loading (or failed) once this session */
const settled = new Set<string>();
const inFlight = new Map<string, Promise<void>>();

/** Load one image into the browser cache. Never rejects. */
export function preloadImage(url: string): Promise<void> {
  if (settled.has(url) || url.startsWith("data:")) {
    settled.add(url);
    return Promise.resolve();
  }
  const existing = inFlight.get(url);
  if (existing) return existing;
  const job = new Promise<void>((resolve) => {
    const img = new Image();
    const done = () => {
      settled.add(url);
      inFlight.delete(url);
      resolve();
    };
    img.onload = done;
    img.onerror = done; // a missing image must not block play
    img.decoding = "async";
    img.src = url;
  });
  inFlight.set(url, job);
  return job;
}

export function isImageSettled(url: string | undefined): boolean {
  return !url || url.startsWith("data:") || settled.has(url);
}

/** Give up waiting for art after this long and show the room anyway */
const MAX_WAIT_MS = 8000;

/**
 * Preload a room's art.
 *
 * - `ready` is false until the room's background has loaded (or failed, or
 *   the wait timed out) — show a loading veil instead of a blank scene.
 * - Once the room is up, the rooms one exit away are fetched in the
 *   background so walking through a door is instant.
 */
export function useRoomPreload(
  definition: GameDefinition,
  roomId: string
): { ready: boolean } {
  const background = definition.rooms[roomId]?.image;
  const [readyFor, setReadyFor] = useState<string | null>(
    isImageSettled(background) ? roomId : null
  );

  useEffect(() => {
    let cancelled = false;
    const urls = collectRoomMediaUrls(definition, roomId);
    const markReady = () => {
      if (!cancelled) setReadyFor(roomId);
    };
    if (isImageSettled(background)) markReady();
    else {
      void preloadImage(background!).then(markReady);
    }
    const timeout = window.setTimeout(markReady, MAX_WAIT_MS);

    // Everything else in this room, then the neighbours, without blocking
    void Promise.all(urls.map(preloadImage)).then(() => {
      if (cancelled) return;
      for (const next of neighbourRoomIds(definition, roomId)) {
        for (const url of collectRoomMediaUrls(definition, next)) {
          void preloadImage(url);
        }
      }
    });

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [definition, roomId, background]);

  return { ready: readyFor === roomId || isImageSettled(background) };
}
