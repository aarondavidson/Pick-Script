import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { __setStrictPlayTestOverride } from "@/engine/deployLock";
import { listPlayableGames, resolvePlayableGame } from "./resolveGame";
import { gameCatalog } from "./registry";
import { installPack, INSTALLED_PACKS_KEY } from "@/studio/installedPacks";
import { createEmptyJsonPack } from "@/engine/jsonPack";

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
}

describe("resolveGame strict play", () => {
  beforeEach(() => {
    stubLocalStorage();
  });

  afterEach(() => {
    __setStrictPlayTestOverride(null);
    vi.unstubAllGlobals();
  });

  it("refuses installed override of a shipped pack id when strict", () => {
    const shipped = gameCatalog[0];
    expect(shipped).toBeTruthy();

    const fake = createEmptyJsonPack({
      id: shipped.id,
      title: "Hacked Override",
      version: "9.9.9",
    });
    installPack(fake);

    __setStrictPlayTestOverride(false);
    const open = resolvePlayableGame(shipped.id);
    expect(open?.title).toBe("Hacked Override");

    __setStrictPlayTestOverride(true);
    const locked = resolvePlayableGame(shipped.id);
    expect(locked?.title).toBe(shipped.title);
    expect(locked?.version).toBe(shipped.version);

    const listed = listPlayableGames().find((g) => g.id === shipped.id);
    expect(listed?.title).toBe(shipped.title);

    // Distinct installed ids still appear in the launcher list
    installPack(
      createEmptyJsonPack({ id: "custom-fan-pack", title: "Fan Pack" })
    );
    expect(
      listPlayableGames().some((g) => g.id === "custom-fan-pack")
    ).toBe(true);
    void INSTALLED_PACKS_KEY;
  });
});
