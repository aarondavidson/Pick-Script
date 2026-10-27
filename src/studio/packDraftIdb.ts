/**
 * IndexedDB persistence for studio pack drafts (survives large embedded images).
 * Primary draft body API — localStorage is used only as a fallback when IDB
 * is unavailable or rejects (e.g. size / quota), for drafts that still fit.
 */

import {
  createEmptyJsonPack,
  parseJsonPack,
  type JsonPackDocument,
} from "@/engine/jsonPack";
import { STUDIO_PACK_DRAFT_KEY } from "@/studio/packDraft";
import { safeJsonParse, STORAGE_LIMITS } from "@/engine/security";

const DB_NAME = "adventure-studio";
const STORE = "packs";
const DRAFT_ID = "current-draft";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IDB open failed"));
  });
}

function idbGet(): Promise<JsonPackDocument | null> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readonly");
        const req = tx.objectStore(STORE).get(DRAFT_ID);
        req.onsuccess = () => {
          try {
            resolve(req.result ? parseJsonPack(req.result) : null);
          } catch {
            resolve(null);
          }
        };
        req.onerror = () => reject(req.error);
      })
  );
}

function idbSet(doc: JsonPackDocument): Promise<void> {
  let serialized: string;
  try {
    serialized = JSON.stringify(doc);
  } catch (e) {
    return Promise.reject(e);
  }
  if (serialized.length > STORAGE_LIMITS.maxIdbDraftChars) {
    return Promise.reject(
      new Error(
        "Pack draft exceeds storage limit — shrink embedded images or remove rooms."
      )
    );
  }
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).put(doc, DRAFT_ID);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      })
  );
}

function localGet(): JsonPackDocument | null {
  try {
    const raw = localStorage.getItem(STUDIO_PACK_DRAFT_KEY);
    if (!raw) return null;
    return parseJsonPack(safeJsonParse(raw));
  } catch {
    return null;
  }
}

/** Best-effort localStorage write — used only when IDB cannot persist. */
function localSetFallback(doc: JsonPackDocument): boolean {
  try {
    const raw = JSON.stringify(doc);
    // Typical browser quota ~5MB; skip oversized payloads rather than throw.
    if (raw.length > 4_500_000) return false;
    localStorage.setItem(STUDIO_PACK_DRAFT_KEY, raw);
    return true;
  } catch {
    return false;
  }
}

function clearLocalMirror(): void {
  try {
    localStorage.removeItem(STUDIO_PACK_DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

/** Load draft: IDB → migrate from localStorage → empty pack. */
export async function loadPackDraftAsync(): Promise<JsonPackDocument> {
  try {
    const fromIdb = await idbGet();
    if (fromIdb) return fromIdb;
  } catch {
    /* fall through */
  }
  const fromLocal = localGet();
  if (fromLocal) {
    try {
      await idbSet(fromLocal);
      clearLocalMirror();
    } catch {
      /* keep local until IDB works */
    }
    return fromLocal;
  }
  return createEmptyJsonPack();
}

/**
 * Persist to IndexedDB. Falls back to localStorage only when IDB fails
 * and the serialized draft still fits typical localStorage limits.
 */
export async function savePackDraftAsync(doc: JsonPackDocument): Promise<void> {
  try {
    await idbSet(doc);
    clearLocalMirror();
  } catch (err) {
    if (localSetFallback(doc)) return;
    throw err instanceof Error
      ? err
      : new Error("Could not save pack draft");
  }
}

export async function clearPackDraftAsync(): Promise<void> {
  clearLocalMirror();
  try {
    await idbSet(createEmptyJsonPack());
  } catch {
    /* ignore — local already cleared */
  }
}
