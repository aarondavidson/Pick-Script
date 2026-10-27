/**
 * Named pack draft library — switch / recover without clobbering.
 * Active draft still uses packDraftIdb "current-draft"; library is a sidecar index.
 */

import {
  createEmptyJsonPack,
  parseJsonPack,
  type JsonPackDocument,
} from "@/engine/jsonPack";
import { safeJsonParse } from "@/engine/security";
import {
  loadPackDraftAsync,
  savePackDraftAsync,
} from "@/studio/packDraftIdb";

const INDEX_KEY = "studio-pack-library-v1";
const LIB_DB = "adventure-studio-library";
const LIB_STORE = "named-packs";

export interface PackLibraryEntry {
  id: string;
  name: string;
  packId: string;
  title: string;
  updatedAt: number;
}

interface LibraryIndex {
  entries: PackLibraryEntry[];
  activeId: string | null;
}

function emptyIndex(): LibraryIndex {
  return { entries: [], activeId: null };
}

function loadIndex(): LibraryIndex {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    if (!raw) return emptyIndex();
    const parsed = safeJsonParse(raw) as Partial<LibraryIndex>;
    return {
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
      activeId: typeof parsed.activeId === "string" ? parsed.activeId : null,
    };
  } catch {
    return emptyIndex();
  }
}

function saveIndex(index: LibraryIndex): void {
  try {
    localStorage.setItem(INDEX_KEY, JSON.stringify(index));
  } catch {
    /* quota */
  }
}

function openLibDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(LIB_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(LIB_STORE)) {
        db.createObjectStore(LIB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IDB open failed"));
  });
}

async function libGet(id: string): Promise<JsonPackDocument | null> {
  try {
    const db = await openLibDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(LIB_STORE, "readonly");
      const req = tx.objectStore(LIB_STORE).get(id);
      req.onsuccess = () => {
        try {
          resolve(req.result ? parseJsonPack(req.result) : null);
        } catch {
          resolve(null);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

async function libSet(id: string, doc: JsonPackDocument): Promise<void> {
  const db = await openLibDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(LIB_STORE, "readwrite");
    tx.objectStore(LIB_STORE).put(doc, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function libDelete(id: string): Promise<void> {
  try {
    const db = await openLibDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(LIB_STORE, "readwrite");
      tx.objectStore(LIB_STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* ignore */
  }
}

function newEntryId(): string {
  return `draft_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function listPackLibrary(): PackLibraryEntry[] {
  return loadIndex().entries.sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getActiveLibraryId(): string | null {
  return loadIndex().activeId;
}

/** Snapshot current active draft into the library under a name. */
export async function saveDraftToLibrary(
  doc: JsonPackDocument,
  name?: string
): Promise<PackLibraryEntry> {
  const index = loadIndex();
  const entryName =
    name?.trim() || doc.title?.trim() || "Untitled draft";
  let entry: PackLibraryEntry;
  if (index.activeId) {
    const existing = index.entries.find((e) => e.id === index.activeId);
    if (existing) {
      entry = {
        ...existing,
        name: entryName,
        packId: doc.id,
        title: doc.title,
        updatedAt: Date.now(),
      };
      index.entries = index.entries.map((e) =>
        e.id === entry.id ? entry : e
      );
    } else {
      entry = {
        id: index.activeId,
        name: entryName,
        packId: doc.id,
        title: doc.title,
        updatedAt: Date.now(),
      };
      index.entries.push(entry);
    }
  } else {
    entry = {
      id: newEntryId(),
      name: entryName,
      packId: doc.id,
      title: doc.title,
      updatedAt: Date.now(),
    };
    index.entries.push(entry);
    index.activeId = entry.id;
  }
  await libSet(entry.id, doc);
  await savePackDraftAsync(doc);
  saveIndex(index);
  return entry;
}

/** Create a new named slot from a document and make it active. */
export async function createLibraryDraft(
  doc: JsonPackDocument,
  name?: string
): Promise<PackLibraryEntry> {
  const entry: PackLibraryEntry = {
    id: newEntryId(),
    name: name?.trim() || doc.title || "New draft",
    packId: doc.id,
    title: doc.title,
    updatedAt: Date.now(),
  };
  const index = loadIndex();
  index.entries.push(entry);
  index.activeId = entry.id;
  await libSet(entry.id, doc);
  await savePackDraftAsync(doc);
  saveIndex(index);
  return entry;
}

/** Read a library draft without switching the active slot. */
export async function peekLibraryDraft(
  id: string
): Promise<JsonPackDocument | null> {
  return libGet(id);
}

/** Switch active draft to a library entry (loads into current-draft). */
export async function switchToLibraryDraft(
  id: string
): Promise<JsonPackDocument | null> {
  const doc = await libGet(id);
  if (!doc) return null;
  const index = loadIndex();
  index.activeId = id;
  saveIndex(index);
  await savePackDraftAsync(doc);
  return doc;
}

/** Duplicate current doc into a new library slot. */
export async function duplicateLibraryDraft(
  doc: JsonPackDocument,
  name?: string
): Promise<PackLibraryEntry> {
  const copy: JsonPackDocument = {
    ...doc,
    id: `${doc.id}-copy`,
    title: `${doc.title} (copy)`,
  };
  return createLibraryDraft(copy, name || `${doc.title} (copy)`);
}

export async function deleteLibraryDraft(id: string): Promise<void> {
  const index = loadIndex();
  index.entries = index.entries.filter((e) => e.id !== id);
  if (index.activeId === id) {
    index.activeId = index.entries[0]?.id ?? null;
    if (index.activeId) {
      const restored = await libGet(index.activeId);
      if (restored) await savePackDraftAsync(restored);
      else await savePackDraftAsync(createEmptyJsonPack());
    }
  }
  await libDelete(id);
  saveIndex(index);
}

/** Ensure active draft is mirrored into library when saving from Pack. */
export async function syncActiveLibrary(doc: JsonPackDocument): Promise<void> {
  const index = loadIndex();
  if (!index.activeId) {
    await createLibraryDraft(doc, doc.title);
    return;
  }
  const entry = index.entries.find((e) => e.id === index.activeId);
  if (!entry) {
    await createLibraryDraft(doc, doc.title);
    return;
  }
  entry.packId = doc.id;
  entry.title = doc.title;
  entry.updatedAt = Date.now();
  index.entries = index.entries.map((e) =>
    e.id === entry.id ? entry : e
  );
  saveIndex(index);
  try {
    await libSet(entry.id, doc);
  } catch {
    /* ignore */
  }
}

/** Bootstrap: if library empty but current draft exists, seed one entry. */
export async function ensureLibrarySeeded(): Promise<void> {
  const index = loadIndex();
  if (index.entries.length > 0) return;
  const current = await loadPackDraftAsync();
  if (current.title === "Untitled Pack" && Object.keys(current.rooms).length <= 1) {
    const hs = Object.values(current.rooms).flatMap((r) => r.hotspots ?? []);
    if (hs.length === 0 && !Object.values(current.rooms).some((r) => r.image)) {
      return; // still empty starter — don't force a library slot
    }
  }
  await createLibraryDraft(current, current.title);
}
