/**
 * Web save persistence — IndexedDB primary, localStorage mirror, memory fallback.
 * Designed for browser packs (Chrome / Firefox / Safari / Edge), not Capacitor.
 */

import { safeJsonParse, STORAGE_LIMITS } from "./security";

export type SaveBackend = "indexeddb" | "localStorage" | "memory";

const IDB_NAME = "adventure-game-saves";
const IDB_STORE = "slots";
const IDB_VERSION = 1;

export interface SaveEnvelope {
  /** Storage schema */
  v: 1;
  key: string;
  /** Serialized SaveSlot JSON string (keeps checksum stable) */
  payload: string;
  checksum: string;
  savedAt: number;
}

/** Fast non-crypto checksum for corruption detection (djb2). */
export function checksumString(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) + h) ^ input.charCodeAt(i);
    h |= 0;
  }
  return `djb2_${(h >>> 0).toString(16)}`;
}

export function wrapPayload(key: string, payload: string): SaveEnvelope {
  return {
    v: 1,
    key,
    payload,
    checksum: checksumString(payload),
    savedAt: Date.now(),
  };
}

export function verifyEnvelope(env: SaveEnvelope): boolean {
  if (!env || env.v !== 1 || typeof env.payload !== "string") return false;
  if (env.payload.length > STORAGE_LIMITS.maxSaveRawChars) return false;
  return env.checksum === checksumString(env.payload);
}

function canUseLocalStorage(): boolean {
  try {
    if (typeof localStorage === "undefined") return false;
    const k = "__adventure_save_probe__";
    localStorage.setItem(k, "1");
    localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

function localGet(key: string): string | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function localSet(key: string, value: string): { ok: boolean; error?: string } {
  try {
    if (typeof localStorage === "undefined") {
      return { ok: false, error: "localStorage unavailable" };
    }
    localStorage.setItem(key, value);
    return { ok: true };
  } catch (e) {
    const name = e instanceof DOMException ? e.name : "";
    if (name === "QuotaExceededError" || name === "NS_ERROR_DOM_QUOTA_REACHED") {
      return {
        ok: false,
        error: "Browser storage full — export a backup or free space.",
      };
    }
    return {
      ok: false,
      error: e instanceof Error ? e.message : "localStorage write failed",
    };
  }
}

function localRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IDB open failed"));
  });
}

async function idbGet(key: string): Promise<SaveEnvelope | null> {
  const db = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const req = tx.objectStore(IDB_STORE).get(key);
    req.onsuccess = () => {
      const row = req.result as SaveEnvelope | undefined;
      if (!row) {
        resolve(null);
        return;
      }
      resolve(verifyEnvelope(row) ? row : null);
    };
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(env: SaveEnvelope): Promise<void> {
  const db = await openIdb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).put(env);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbDelete(key: string): Promise<void> {
  const db = await openIdb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export interface DualSaveStore {
  backend: SaveBackend;
  ready: Promise<void>;
  lastError: string | null;
  /** Sync read of payload string (after hydrate; falls back to localStorage). */
  getSync: (key: string) => string | null;
  /** Write payload to memory + localStorage + IDB. */
  set: (key: string, payload: string) => { ok: boolean; error?: string };
  remove: (key: string) => void;
  flush: () => Promise<void>;
}

/**
 * Create a dual-write store for one game's save keys.
 * Hydrates: localStorage (immediate) then IDB (prefer newer timestamp).
 */
export function createDualSaveStore(knownKeys: string[]): DualSaveStore {
  const memory = new Map<string, SaveEnvelope>();
  let backend: SaveBackend = "memory";
  let lastError: string | null = null;
  const pending = new Map<string, SaveEnvelope>();

  const lsOk = canUseLocalStorage();
  if (lsOk) backend = "localStorage";

  // Immediate hydrate from localStorage so sync API works before IDB ready
  for (const key of knownKeys) {
    const raw = localGet(key);
    if (!raw) continue;
    if (raw.length > STORAGE_LIMITS.maxSaveRawChars) continue;
    memory.set(key, wrapPayload(key, raw));
  }

  const ready = (async () => {
    try {
      // Probe IDB
      await openIdb();
      backend = "indexeddb";
      for (const key of knownKeys) {
        try {
          const fromIdb = await idbGet(key);
          const fromMem = memory.get(key);
          if (fromIdb && (!fromMem || fromIdb.savedAt >= fromMem.savedAt)) {
            memory.set(key, fromIdb);
            // Mirror newer IDB → localStorage for browsers that lose IDB
            if (lsOk) localSet(key, fromIdb.payload);
          } else if (fromMem && !fromIdb) {
            await idbSet(fromMem);
          }
        } catch (e) {
          lastError =
            e instanceof Error ? e.message : "IndexedDB slot hydrate failed";
        }
      }
    } catch {
      // Stay on localStorage / memory
      if (!lsOk) {
        backend = "memory";
        lastError =
          "Persistent browser storage unavailable (private mode?). Use Export backup.";
      }
    }
  })();

  const flush = async () => {
    if (backend !== "indexeddb") return;
    const jobs = [...pending.values()];
    pending.clear();
    for (const env of jobs) {
      try {
        await idbSet(env);
      } catch (e) {
        lastError =
          e instanceof Error ? e.message : "IndexedDB persist failed";
        pending.set(env.key, env);
      }
    }
  };

  return {
    get backend() {
      return backend;
    },
    ready,
    get lastError() {
      return lastError;
    },
    getSync: (key: string) => memory.get(key)?.payload ?? localGet(key),
    set: (key: string, payload: string) => {
      if (payload.length > STORAGE_LIMITS.maxSaveRawChars) {
        lastError = "Save too large for browser storage";
        return { ok: false, error: lastError };
      }
      const env = wrapPayload(key, payload);
      memory.set(key, env);

      let lsError: string | undefined;
      if (lsOk) {
        const ls = localSet(key, payload);
        if (!ls.ok) {
          lsError = ls.error;
          lastError = ls.error ?? lastError;
        }
      }

      if (backend === "indexeddb") {
        pending.set(key, env);
        void flush();
        // Succeed if IDB path active even when localStorage quota fails
        return { ok: true, error: lsError };
      }

      if (lsOk && !lsError) return { ok: true };
      if (backend === "memory") {
        lastError =
          lastError ??
          "Saved in-memory only — export a backup before closing the tab.";
        return { ok: true, error: lastError };
      }
      return {
        ok: false,
        error: lsError ?? lastError ?? "Could not persist save",
      };
    },
    remove: (key: string) => {
      memory.delete(key);
      pending.delete(key);
      if (lsOk) localRemove(key);
      if (backend === "indexeddb") {
        void idbDelete(key).catch((e) => {
          lastError =
            e instanceof Error ? e.message : "IndexedDB delete failed";
        });
      }
    },
    flush,
  };
}
