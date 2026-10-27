import { afterEach, describe, expect, it, vi } from "vitest";
import {
  filterCatalogForProduct,
  getLockedGameIds,
  getProductConfig,
  isGameLocked,
  isGameVisibleInProduct,
  parseProductId,
} from "./productConfig";

describe("productConfig", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults unknown product ids to engine", () => {
    expect(parseProductId(undefined)).toBe("engine");
    expect(parseProductId("nope")).toBe("engine");
    expect(parseProductId("engine")).toBe("engine");
  });

  it("engine exposes the full catalog", () => {
    vi.stubEnv("VITE_LOCKED_GAMES", "");
    const engine = getProductConfig("engine");
    expect(engine.catalogGameIds).toBeNull();
    expect(engine.showStudioChrome).toBe(true);
    expect(engine.isTitleProduct).toBe(false);
    expect(engine.documentTitle).toContain("P.I.C.K.");
    expect(engine.documentTitle).toContain("S.C.R.I.P.T.");
    expect(isGameVisibleInProduct("attic-study", engine)).toBe(true);
    expect(isGameVisibleInProduct("harbor-fog", engine)).toBe(true);
  });

  it("title products isolate a single shipped game", () => {
    vi.stubEnv("VITE_LOCKED_GAMES", "");
    const title = {
      ...getProductConfig("engine"),
      catalogGameIds: ["harbor-fog"],
      isTitleProduct: true,
    };
    expect(isGameVisibleInProduct("harbor-fog", title)).toBe(true);
    expect(isGameVisibleInProduct("attic-study", title)).toBe(false);

    const catalog = filterCatalogForProduct(
      [{ id: "attic-study" }, { id: "harbor-fog" }],
      title
    );
    expect(catalog.map((c) => c.id)).toEqual(["harbor-fog"]);
  });

  it("parses VITE_LOCKED_GAMES and hides locked titles", () => {
    expect(getLockedGameIds("harbor-fog, attic-study")).toEqual(
      new Set(["harbor-fog", "attic-study"])
    );
    vi.stubEnv("VITE_LOCKED_GAMES", "harbor-fog");
    expect(isGameLocked("harbor-fog")).toBe(true);
    expect(isGameLocked("attic-study")).toBe(false);
    expect(isGameVisibleInProduct("harbor-fog")).toBe(false);
    expect(isGameVisibleInProduct("attic-study")).toBe(true);
  });
});
