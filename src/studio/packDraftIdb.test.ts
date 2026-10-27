import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptyJsonPack } from "@/engine/jsonPack";
import { STUDIO_PACK_DRAFT_KEY } from "@/studio/packDraft";

function stubLocalStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
  });
  return store;
}

describe("packDraftIdb", () => {
  beforeEach(() => {
    vi.resetModules();
    stubLocalStorage();
    vi.stubGlobal("indexedDB", undefined);
  });

  it("falls back to localStorage when IndexedDB is unavailable", async () => {
    const { savePackDraftAsync, loadPackDraftAsync } = await import(
      "@/studio/packDraftIdb"
    );
    const doc = createEmptyJsonPack({
      id: "fallback-pack",
      title: "Fallback",
    });
    await savePackDraftAsync(doc);
    expect(localStorage.getItem(STUDIO_PACK_DRAFT_KEY)).toBeTruthy();

    const loaded = await loadPackDraftAsync();
    expect(loaded.id).toBe("fallback-pack");
    expect(loaded.title).toBe("Fallback");
  });

  it("clearPackDraftAsync removes the localStorage fallback", async () => {
    const { savePackDraftAsync, clearPackDraftAsync, loadPackDraftAsync } =
      await import("@/studio/packDraftIdb");
    await savePackDraftAsync(
      createEmptyJsonPack({ id: "wipe-me", title: "Wipe" })
    );
    expect(localStorage.getItem(STUDIO_PACK_DRAFT_KEY)).toBeTruthy();

    await clearPackDraftAsync();
    expect(localStorage.getItem(STUDIO_PACK_DRAFT_KEY)).toBeNull();

    const loaded = await loadPackDraftAsync();
    expect(loaded.id).toBe("untitled-pack");
  });

  it("migrates a localStorage-only draft on load when IDB is down", async () => {
    const doc = createEmptyJsonPack({
      id: "legacy-local",
      title: "Legacy Local",
    });
    localStorage.setItem(STUDIO_PACK_DRAFT_KEY, JSON.stringify(doc));

    const { loadPackDraftAsync } = await import("@/studio/packDraftIdb");
    const loaded = await loadPackDraftAsync();
    expect(loaded.id).toBe("legacy-local");
  });
});
