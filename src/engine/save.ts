import type { GameState } from "./types";
import { isMajorMismatch } from "./semver";
import {
  isSafeIdentifierKey,
  safeJsonParse,
  STORAGE_LIMITS,
} from "./security";
import { normalizeLoadedState } from "./state";
import {
  createDualSaveStore,
  type DualSaveStore,
  type SaveBackend,
} from "./saveStorage";
import {
  getSaveIntegrityKey,
  isSaveSealingEnabled,
  isStrictPlayEnabled,
  sealTag,
  verifySealTag,
} from "./deployLock";

export interface SaveSlot {
  slot: number;
  gameId: string;
  data: GameState;
  timestamp: number;
  locationName: string;
  /** Pack content version at time of save */
  version?: string;
  /** True when this is the autosave slot */
  autosave?: boolean;
  /** Set when load refused the slot (major mismatch, no migrator) */
  incompatible?: boolean;
  incompatibleReason?: string;
}

export type MigrateSaveFn = (
  state: GameState,
  fromVersion: string,
  toVersion: string
) => GameState | null;

export type SanitizeSaveStateFn = (state: GameState) => GameState;

export interface SaveAdapterOptions {
  /** Old key prefix to copy into modern slots once, e.g. `oldtitle_save_` → `oldtitle_save_1` */
  legacyKeyPrefix?: string;
  /** Current pack content version written on every save */
  contentVersion?: string;
  /** Optional migrator when versions differ */
  migrateSave?: MigrateSaveFn;
  /** Clamp loaded state against the pack (rooms / inventory / etc.) */
  sanitizeState?: SanitizeSaveStateFn;
  /**
   * Inject a store (tests). When omitted, uses IndexedDB + localStorage dual-write.
   */
  store?: DualSaveStore;
}

export interface SaveBackupV1 {
  format: "adventure-save-backup-v1";
  gameId: string;
  exportedAt: number;
  contentVersion?: string;
  slots: Array<SaveSlot | null>;
  autosave: SaveSlot | null;
}

/** Sealed wrapper when VITE_SAVE_INTEGRITY_KEY is set. */
export interface SealedSaveV1 {
  format: "adventure-save-sealed-v1";
  gameId: string;
  payload: string;
  tag: string;
}

export interface SaveAdapter {
  saveSlots: number;
  contentVersion?: string;
  /** Resolves when IndexedDB hydrate / migration finished */
  ready: Promise<void>;
  getBackend: () => SaveBackend;
  getLastError: () => string | null;
  saveGame: (slot: number, state: GameState, locationName: string) => boolean;
  loadGame: (slot: number) => SaveSlot | null;
  deleteSave: (slot: number) => void;
  getAllSaves: () => (SaveSlot | null)[];
  hasSaves: () => boolean;
  autosave: (state: GameState, locationName: string) => boolean;
  loadAutosave: () => SaveSlot | null;
  deleteAutosave: () => void;
  hasAutosave: () => boolean;
  /** JSON backup for download / cross-browser restore */
  exportBackup: () => string;
  importBackup: (json: string) => {
    ok: boolean;
    imported: number;
    error?: string;
  };
  flush: () => Promise<void>;
}

function storageKey(gameId: string, slot: number): string {
  return `adventure_${gameId}_save_${slot}`;
}

function autosaveKey(gameId: string): string {
  return `adventure_${gameId}_autosave`;
}


function applyVersionPolicy(
  slot: SaveSlot,
  contentVersion: string | undefined,
  migrateSave: MigrateSaveFn | undefined
): SaveSlot | null {
  if (!contentVersion || !slot.version || slot.version === contentVersion) {
    return {
      ...slot,
      version: slot.version ?? contentVersion,
    };
  }

  if (migrateSave) {
    const migrated = migrateSave(slot.data, slot.version, contentVersion);
    if (!migrated) {
      return {
        ...slot,
        incompatible: true,
        incompatibleReason: `Save v${slot.version} could not be migrated to v${contentVersion}.`,
      };
    }
    return {
      ...slot,
      data: migrated,
      version: contentVersion,
    };
  }

  if (isMajorMismatch(slot.version, contentVersion)) {
    return {
      ...slot,
      incompatible: true,
      incompatibleReason: `Save is v${slot.version} but game is v${contentVersion} (major mismatch).`,
    };
  }

  // Minor/patch drift without migrator — load with warning stamp
  console.warn(
    `[adventure:${slot.gameId}] Loading save v${slot.version} into content v${contentVersion}`
  );
  return slot;
}

/** Serialize a slot for the dual store, optionally sealed. */
function encodeSlot(saveData: SaveSlot): string {
  const payload = JSON.stringify(saveData);
  if (!isSaveSealingEnabled()) return payload;
  const secret = getSaveIntegrityKey();
  const sealed: SealedSaveV1 = {
    format: "adventure-save-sealed-v1",
    gameId: saveData.gameId,
    payload,
    tag: sealTag(payload, secret),
  };
  return JSON.stringify(sealed);
}

/** Unwrap sealed envelopes; return SaveSlot JSON string or null. */
function unwrapStored(raw: string, expectedGameId: string): string | null {
  try {
    const parsed = safeJsonParse<SealedSaveV1 | SaveSlot>(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      (parsed as SealedSaveV1).format === "adventure-save-sealed-v1"
    ) {
      const sealed = parsed as SealedSaveV1;
      if (sealed.gameId !== expectedGameId) return null;
      const secret = getSaveIntegrityKey();
      if (!secret || !verifySealTag(sealed.payload, sealed.tag, secret)) {
        console.error("Save seal verification failed");
        return null;
      }
      return sealed.payload;
    }

    // Unsealed slot
    if (isSaveSealingEnabled() && isStrictPlayEnabled()) {
      console.error("Unsigned save rejected in sealed strict play");
      return null;
    }
    return raw;
  } catch {
    return null;
  }
}

/**
 * Create a save system scoped to a game pack id + content version.
 * Web: IndexedDB primary with localStorage mirror; export/import for backups.
 * Copies `${legacyKeyPrefix}${slot}` saves into modern keys when the pack sets
 * `GameDefinition.legacySaveKeyPrefix`.
 * When `VITE_SAVE_INTEGRITY_KEY` is set, slots are sealed against casual edits.
 */
export function createSaveAdapter(
  gameId: string,
  saveSlots = 3,
  options?: SaveAdapterOptions
): SaveAdapter {
  const legacyPrefix = options?.legacyKeyPrefix || undefined;
  const legacyKey = (slot: number) => `${legacyPrefix}${slot}`;
  const contentVersion = options?.contentVersion;
  const migrateSave = options?.migrateSave;
  const sanitizeState = options?.sanitizeState;

  const keys: string[] = [autosaveKey(gameId)];
  for (let i = 1; i <= saveSlots; i++) {
    keys.push(storageKey(gameId, i));
    if (legacyPrefix) keys.push(legacyKey(i));
  }

  const store = options?.store ?? createDualSaveStore(keys);

  // One-time legacy migrate into modern keys (sync from localStorage via store)
  if (legacyPrefix) {
    for (let slot = 1; slot <= saveSlots; slot++) {
      const modern = storageKey(gameId, slot);
      if (store.getSync(modern)) continue;
      const legacy = store.getSync(legacyKey(slot));
      if (!legacy) continue;
      store.set(modern, legacy);
    }
  }

  const parseAndPolicy = (raw: string, slot: number): SaveSlot | null => {
    try {
      if (raw.length > STORAGE_LIMITS.maxSaveRawChars) {
        console.error("Save data exceeds size limit");
        return null;
      }
      const unwrapped = unwrapStored(raw, gameId);
      if (!unwrapped) return null;

      const parsed = safeJsonParse<SaveSlot>(unwrapped);
      if (!parsed || typeof parsed !== "object" || !parsed.data) {
        return null;
      }
      // Refuse saves that claim a different pack id (cross-game injection)
      if (
        parsed.gameId != null &&
        parsed.gameId !== gameId &&
        isSafeIdentifierKey(parsed.gameId)
      ) {
        console.error(
          `Save gameId mismatch: expected ${gameId}, got ${parsed.gameId}`
        );
        return null;
      }
      let data = normalizeLoadedState(parsed.data);
      if (sanitizeState) {
        data = sanitizeState(data);
      }
      return applyVersionPolicy(
        { ...parsed, data, slot, gameId },
        contentVersion,
        migrateSave
      );
    } catch (error) {
      console.error("Failed to parse save data", error);
      return null;
    }
  };

  const writeSlot = (key: string, saveData: SaveSlot): boolean => {
    const encoded = encodeSlot(saveData);
    const result = store.set(key, encoded);
    return result.ok;
  };

  const saveGame = (
    slot: number,
    state: GameState,
    locationName: string
  ): boolean => {
    if (slot < 1 || slot > saveSlots) throw new Error("Invalid save slot");

    const saveData: SaveSlot = {
      slot,
      gameId,
      data: state,
      timestamp: Date.now(),
      locationName,
      version: contentVersion,
    };

    return writeSlot(storageKey(gameId, slot), saveData);
  };

  const loadGame = (slot: number): SaveSlot | null => {
    if (slot < 1 || slot > saveSlots) throw new Error("Invalid save slot");

    let raw = store.getSync(storageKey(gameId, slot));

    if (!raw && legacyPrefix) {
      raw = store.getSync(legacyKey(slot));
      if (raw) {
        const migrated = parseAndPolicy(raw, slot);
        if (migrated && !migrated.incompatible) {
          writeSlot(storageKey(gameId, slot), {
            ...migrated,
            gameId,
            slot,
          });
        }
        return migrated;
      }
    }

    if (!raw) return null;
    return parseAndPolicy(raw, slot);
  };

  const deleteSave = (slot: number): void => {
    if (slot < 1 || slot > saveSlots) throw new Error("Invalid save slot");
    store.remove(storageKey(gameId, slot));
    if (legacyPrefix) {
      store.remove(legacyKey(slot));
    }
  };

  const getAllSaves = (): (SaveSlot | null)[] => {
    const saves: (SaveSlot | null)[] = [];
    for (let i = 1; i <= saveSlots; i++) {
      saves.push(loadGame(i));
    }
    return saves;
  };

  const hasSaves = (): boolean => getAllSaves().some((s) => s !== null);

  const autosave = (state: GameState, locationName: string): boolean => {
    const saveData: SaveSlot = {
      slot: 0,
      gameId,
      data: state,
      timestamp: Date.now(),
      locationName,
      autosave: true,
      version: contentVersion,
    };
    return writeSlot(autosaveKey(gameId), saveData);
  };

  const loadAutosave = (): SaveSlot | null => {
    const raw = store.getSync(autosaveKey(gameId));
    if (!raw) return null;
    return parseAndPolicy(raw, 0);
  };

  const deleteAutosave = (): void => {
    store.remove(autosaveKey(gameId));
  };

  const hasAutosave = (): boolean => {
    const slot = loadAutosave();
    return !!slot && !slot.incompatible;
  };

  const exportBackup = (): string => {
    const backup: SaveBackupV1 = {
      format: "adventure-save-backup-v1",
      gameId,
      exportedAt: Date.now(),
      contentVersion,
      slots: getAllSaves(),
      autosave: loadAutosave(),
    };
    return JSON.stringify(backup, null, 2);
  };

  const importBackup = (
    json: string
  ): { ok: boolean; imported: number; error?: string } => {
    try {
      if (json.length > STORAGE_LIMITS.maxSaveRawChars * 4) {
        return { ok: false, imported: 0, error: "Backup file too large" };
      }
      const parsed = safeJsonParse<SaveBackupV1>(json);
      if (
        !parsed ||
        parsed.format !== "adventure-save-backup-v1" ||
        parsed.gameId !== gameId
      ) {
        return {
          ok: false,
          imported: 0,
          error: `Backup must be for game “${gameId}”`,
        };
      }
      let imported = 0;
      const slots = Array.isArray(parsed.slots) ? parsed.slots : [];
      for (let i = 0; i < Math.min(slots.length, saveSlots); i++) {
        const s = slots[i];
        if (!s?.data) continue;
        const ok = writeSlot(storageKey(gameId, i + 1), {
          ...s,
          slot: i + 1,
          gameId,
        });
        if (ok) imported++;
      }
      if (parsed.autosave?.data) {
        const ok = writeSlot(autosaveKey(gameId), {
          ...parsed.autosave,
          slot: 0,
          gameId,
          autosave: true,
        });
        if (ok) imported++;
      }
      return { ok: imported > 0, imported };
    } catch (e) {
      return {
        ok: false,
        imported: 0,
        error: e instanceof Error ? e.message : "Import failed",
      };
    }
  };

  return {
    saveSlots,
    contentVersion,
    ready: store.ready,
    getBackend: () => store.backend,
    getLastError: () => store.lastError,
    saveGame,
    loadGame,
    deleteSave,
    getAllSaves,
    hasSaves,
    autosave,
    loadAutosave,
    deleteAutosave,
    hasAutosave,
    exportBackup,
    importBackup,
    flush: () => store.flush(),
  };
}
