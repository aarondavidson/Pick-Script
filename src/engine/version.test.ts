import { describe, expect, it } from "vitest";
import { ENGINE_VERSION, checkEngineCompatibility } from "./version";
import { parseSemver } from "./semver";
import { validateGameDefinition } from "./validate";
import {
  JSON_PACK_MIGRATIONS,
  JSON_PACK_SCHEMA_VERSION,
  createEmptyJsonPack,
  createGameFromJson,
  migrateJsonPackDocument,
  parseJsonPack,
} from "./jsonPack";

// The package.json ↔ ENGINE_VERSION sync check lives in
// scripts/check-release.mjs so this file stays valid in vendored engine copies.
describe("ENGINE_VERSION", () => {
  it("is a plain semver", () => {
    expect(ENGINE_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    expect(parseSemver(ENGINE_VERSION)).not.toBeNull();
  });
});

describe("checkEngineCompatibility", () => {
  it("accepts missing, equal and older requirements", () => {
    expect(checkEngineCompatibility(undefined).ok).toBe(true);
    expect(checkEngineCompatibility(ENGINE_VERSION).ok).toBe(true);
    expect(checkEngineCompatibility("0.1.0", "0.2.0").ok).toBe(true);
  });

  it("rejects newer requirements and non-semver values", () => {
    const newer = checkEngineCompatibility("1.4.0", "0.2.0");
    expect(newer.ok).toBe(false);
    expect(newer.reason).toContain("1.4.0");
    expect(checkEngineCompatibility("latest").ok).toBe(false);
    expect(checkEngineCompatibility("").ok).toBe(false);
  });
});

describe("minEngineVersion on packs", () => {
  it("passes through JSON packs and fails validation when too new", () => {
    const ok = createGameFromJson({
      ...createEmptyJsonPack({ id: "min-ok", title: "Min" }),
      minEngineVersion: "0.1.0",
    });
    expect(ok.minEngineVersion).toBe("0.1.0");
    expect(validateGameDefinition(ok).ok).toBe(true);

    const result = validateGameDefinition({
      ...ok,
      minEngineVersion: "99.0.0",
    });
    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("needs engine 99.0.0");
  });
});

describe("pack schema migration", () => {
  const base = () =>
    createEmptyJsonPack({ id: "schema-game", title: "Schema" }) as unknown as Record<
      string,
      unknown
    >;

  it("returns current-version documents untouched", () => {
    const doc = base();
    expect(migrateJsonPackDocument(doc)).toBe(doc);
  });

  it("explains packs from a newer engine", () => {
    expect(() =>
      parseJsonPack({ ...base(), schemaVersion: JSON_PACK_SCHEMA_VERSION + 1 })
    ).toThrow(/newer engine/);
  });

  it("rejects missing, fractional and too-old versions", () => {
    expect(() => parseJsonPack({ ...base(), schemaVersion: undefined })).toThrow(
      /Unsupported schemaVersion/
    );
    expect(() => parseJsonPack({ ...base(), schemaVersion: 1.5 })).toThrow(
      /Unsupported schemaVersion/
    );
    expect(() => parseJsonPack({ ...base(), schemaVersion: 0 })).toThrow(
      /too old/
    );
  });

  it("has a migration for every supported older version", () => {
    for (let v = 1; v < JSON_PACK_SCHEMA_VERSION; v++) {
      expect(typeof JSON_PACK_MIGRATIONS[v]).toBe("function");
    }
  });
});
