import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptyJsonPack } from "@/engine/jsonPack";
import {
  applyCombinesToPackDraft,
  applyHotspotsToPackDraft,
} from "@/studio/packApplyBridge";

function stubStorage() {
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
  // IndexedDB draft path falls back / uses local — also stub IDB away
  vi.stubGlobal("indexedDB", undefined);
  return store;
}

describe("packApplyBridge", () => {
  beforeEach(() => {
    stubStorage();
  });

  it("merges hotspots into the pack draft room", async () => {
    const empty = createEmptyJsonPack({ id: "apply-test", title: "Apply" });
    const { savePackDraftAsync } = await import("@/studio/packDraftIdb");
    await savePackDraftAsync(empty);

    const next = await applyHotspotsToPackDraft({
      hotspots: [
        {
          id: "key",
          name: "Key",
          x: 10,
          y: 20,
          width: 8,
          height: 8,
          verbs: ["look", "use"],
          kind: "pickup",
          itemId: "brass_key",
          itemName: "Brass key",
          lookText: "A key.",
        },
      ],
    });
    const hs = next.rooms[next.startRoom]?.hotspots ?? [];
    expect(hs.some((h) => h.id === "key" && h.itemId === "brass_key")).toBe(
      true
    );
  });

  it("merges combine recipes into pack.combinations", async () => {
    const empty = createEmptyJsonPack({ id: "combo-test", title: "Combo" });
    const { savePackDraftAsync } = await import("@/studio/packDraftIdb");
    await savePackDraftAsync(empty);

    const next = await applyCombinesToPackDraft([
      {
        itemA: "tape",
        itemB: "chicken",
        resultId: "taped_chicken",
        resultName: "Taped chicken",
        resultDescription: "Secure poultry.",
        successMessage: "Taped!",
      },
    ]);
    expect(next.combinations?.["tape+chicken"]?.result.id).toBe(
      "taped_chicken"
    );
    expect(next.items?.taped_chicken?.name).toBe("Taped chicken");
  });
});
