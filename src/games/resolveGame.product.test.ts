import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { listPlayableGames, resolvePlayableGame } from "./resolveGame";

function stubLocalStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => store.clear(),
  });
}

describe("resolveGame product filter", () => {
  beforeEach(() => { stubLocalStorage(); });
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

  it("engine lists the shipped packs", () => {
    vi.stubEnv("VITE_PRODUCT", "engine");
    vi.stubEnv("VITE_LOCKED_GAMES", "");
    const ids = listPlayableGames().map((g) => g.id);
    expect(ids).toContain("attic-study");
    expect(ids).toContain("harbor-fog");
    expect(ids).toContain("template-adventure");
  });
});
