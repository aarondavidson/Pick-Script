import { useCallback, useEffect, useState } from "react";
import type { DraftHotspot } from "@/authoring/codegen";
import { isSafeIdentifierKey, safeJsonParse } from "@/engine/security";

const STORAGE_KEY = "author_draft_hotspots";
const MAX_DRAFTS_PER_ROOM = 100;

type Store = Record<string, DraftHotspot[]>;

function load(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = safeJsonParse<Store>(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const out: Store = {};
    for (const [loc, list] of Object.entries(parsed)) {
      if (!isSafeIdentifierKey(loc) || !Array.isArray(list)) continue;
      out[loc] = list.slice(0, MAX_DRAFTS_PER_ROOM);
    }
    return out;
  } catch {
    return {};
  }
}

/** New hotspots drawn in Author mode (not yet in the pack). */
export function useAuthorDraftHotspots(locationId: string) {
  const [store, setStore] = useState<Store>(() => load());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }, [store]);

  const drafts = store[locationId] ?? [];

  const setDrafts = useCallback(
    (next: DraftHotspot[] | ((prev: DraftHotspot[]) => DraftHotspot[])) => {
      setStore((prev) => {
        const cur = prev[locationId] ?? [];
        const value = typeof next === "function" ? next(cur) : next;
        return { ...prev, [locationId]: value };
      });
    },
    [locationId]
  );

  const addDraft = useCallback(
    (draft: DraftHotspot) => {
      setDrafts((prev) => [...prev, draft]);
    },
    [setDrafts]
  );

  const removeDraft = useCallback(
    (id: string) => {
      setDrafts((prev) => prev.filter((d) => d.id !== id));
    },
    [setDrafts]
  );

  const updateDraft = useCallback(
    (id: string, patch: Partial<DraftHotspot>) => {
      setDrafts((prev) =>
        prev.map((d) => (d.id === id ? { ...d, ...patch } : d))
      );
    },
    [setDrafts]
  );

  const clearDrafts = useCallback(() => {
    setDrafts([]);
  }, [setDrafts]);

  return {
    drafts,
    addDraft,
    removeDraft,
    updateDraft,
    clearDrafts,
    setDrafts,
  };
}
