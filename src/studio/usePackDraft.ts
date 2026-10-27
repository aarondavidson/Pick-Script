import { useCallback, useEffect, useRef, useState } from "react";
import {
  createEmptyJsonPack,
  type JsonPackDocument,
} from "@/engine/jsonPack";
import {
  clearPackDraftAsync,
  loadPackDraftAsync,
  savePackDraftAsync,
} from "@/studio/packDraftIdb";
import { STORAGE_LIMITS, safeJsonParse } from "@/engine/security";

const MAX_HISTORY = 40;

function pushHistory(stack: string[], entry: string) {
  if (entry.length > STORAGE_LIMITS.maxUndoEntryChars) {
    // Skip huge snapshots (embedded art) to avoid memory runs
    return;
  }
  stack.push(entry);
  if (stack.length > MAX_HISTORY) stack.shift();
}

/**
 * Pack draft with IndexedDB persistence + undo/redo.
 */
export function usePackDraft() {
  const [doc, setDoc] = useState<JsonPackDocument>(() => createEmptyJsonPack());
  const [ready, setReady] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const undoRef = useRef<string[]>([]);
  const redoRef = useRef<string[]>([]);
  const docRef = useRef(doc);
  docRef.current = doc;

  const syncFlags = useCallback(() => {
    setCanUndo(undoRef.current.length > 0);
    setCanRedo(redoRef.current.length > 0);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void loadPackDraftAsync().then((loaded) => {
      if (cancelled) return;
      setDoc(loaded);
      docRef.current = loaded;
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback(
    (next: JsonPackDocument, opts?: { skipHistory?: boolean }) => {
      if (!opts?.skipHistory) {
        pushHistory(undoRef.current, JSON.stringify(docRef.current));
        redoRef.current = [];
      }
      docRef.current = next;
      setDoc(next);
      syncFlags();
      void savePackDraftAsync(next);
    },
    [syncFlags]
  );

  const undo = useCallback(() => {
    const prev = undoRef.current.pop();
    if (!prev) return;
    pushHistory(redoRef.current, JSON.stringify(docRef.current));
    const restored = safeJsonParse<JsonPackDocument>(prev);
    docRef.current = restored;
    setDoc(restored);
    syncFlags();
    void savePackDraftAsync(restored);
  }, [syncFlags]);

  const redo = useCallback(() => {
    const next = redoRef.current.pop();
    if (!next) return;
    pushHistory(undoRef.current, JSON.stringify(docRef.current));
    const restored = safeJsonParse<JsonPackDocument>(next);
    docRef.current = restored;
    setDoc(restored);
    syncFlags();
    void savePackDraftAsync(restored);
  }, [syncFlags]);

  const reset = useCallback(async () => {
    undoRef.current = [];
    redoRef.current = [];
    await clearPackDraftAsync();
    const empty = createEmptyJsonPack();
    docRef.current = empty;
    setDoc(empty);
    syncFlags();
    void savePackDraftAsync(empty);
    return empty;
  }, [syncFlags]);

  return { doc, ready, persist, undo, redo, canUndo, canRedo, reset };
}
