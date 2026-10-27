import { describe, expect, it } from "vitest";
import {
  assertImageFile,
  assertSafePackUrl,
  cssPlayUrlValue,
  cssUrlValue,
  isSafeCssColor,
  isSafeMediaUrl,
  isSafePlayMediaUrl,
  parsePackActions,
  safeJsonParse,
  safeMediaUrl,
  sanitizeStringRecord,
} from "./security";
import { applyStatePatch, createInitialState } from "./state";
import { createEmptyJsonPack, createGameFromJson } from "./jsonPack";
import { createGame } from "./createGame";
import { runPackActions } from "./packActions";
import { compilePackSpecials } from "./jsonPackSpecials";
import { MAX_POLYGON_POINTS, sanitizePolygonPoints } from "./walkboxes";
import { advanceCutscene, startCutscene } from "./cutscene";
import { panTo } from "./camera";
import { sanitizeRoomTimers } from "./roomTimers";

describe("security media / CSS", () => {
  it("allows safe media URLs and rejects injections", () => {
    expect(isSafeMediaUrl("https://cdn.example/a.png")).toBe(true);
    expect(isSafeMediaUrl("/assets/room.png")).toBe(true);
    expect(
      isSafeMediaUrl("data:image/gif;base64,R0lGODlhAQABAAAAACw=")
    ).toBe(true);
    expect(isSafeMediaUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeMediaUrl('https://x.com/a.png")')).toBe(false);
    expect(isSafeMediaUrl("data:text/html,<script>")).toBe(false);
  });

  it("quotes CSS urls safely", () => {
    const u = cssUrlValue("https://cdn.example/a.png");
    expect(u).toBe('url("https://cdn.example/a.png")');
    expect(cssUrlValue('foo")')).toBeUndefined();
  });

  it("rejects CSS color breakouts", () => {
    expect(isSafeCssColor("#f5e6a8")).toBe(true);
    expect(isSafeCssColor("red")).toBe(true);
    expect(isSafeCssColor("red; background: url(x)")).toBe(false);
    expect(isSafeCssColor("expression(alert(1))")).toBe(false);
  });

  it("safeMediaUrl wraps allowlist", () => {
    expect(safeMediaUrl("https://cdn.example/a.png")).toBe(
      "https://cdn.example/a.png"
    );
    expect(safeMediaUrl("javascript:alert(1)")).toBeUndefined();
  });

  it("cssPlayUrlValue rejects svg data URLs", () => {
    const svg =
      "data:image/svg+xml;base64," +
      btoa("<svg xmlns='http://www.w3.org/2000/svg'></svg>");
    expect(cssPlayUrlValue(svg)).toBeUndefined();
    expect(cssPlayUrlValue("https://cdn.example/a.png")).toMatch(/^url\(/);
  });

  it("isSafePlayMediaUrl rejects svg data URLs", () => {
    const svg =
      "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjwvc3ZnPg==";
    expect(isSafeMediaUrl(svg)).toBe(true);
    expect(isSafePlayMediaUrl(svg)).toBe(false);
    expect(
      isSafePlayMediaUrl("data:image/png;base64,iVBORw0KGgo=")
    ).toBe(true);
  });

  it("assertImageFile rejects non-images", () => {
    expect(() =>
      assertImageFile(new File(["x"], "x.txt", { type: "text/plain" }))
    ).toThrow(/image/i);
    expect(() =>
      assertImageFile(new File(["x"], "x.png", { type: "image/png" }))
    ).not.toThrow();
  });
});

describe("prototype pollution hardening", () => {
  it("strips __proto__ from JSON parse", () => {
    const parsed = safeJsonParse<{ flags?: Record<string, boolean> }>(
      '{"flags":{"ok":true,"__proto__":{"polluted":true}}}'
    );
    expect(parsed.flags?.ok).toBe(true);
    expect(
      Object.prototype.hasOwnProperty.call(parsed.flags ?? {}, "__proto__")
    ).toBe(false);
    expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
  });

  it("applyStatePatch ignores dangerous flag keys", () => {
    const def = createGameFromJson(createEmptyJsonPack({ id: "s", title: "S" }));
    const state = createInitialState(def);
    const poisoned = {
      legit: true,
      __proto__: { polluted: true },
    } as unknown as Record<string, boolean>;
    const next = applyStatePatch(state, { flags: poisoned });
    expect(next.flags.legit).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(next.flags, "__proto__")).toBe(
      false
    );
    expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
  });

  it("sanitizeStringRecord drops constructor", () => {
    const clean = sanitizeStringRecord(
      { a: true, constructor: true, prototype: true } as Record<string, boolean>,
      (v): v is boolean => typeof v === "boolean"
    );
    expect(clean.a).toBe(true);
    expect(Object.keys(clean)).toEqual(["a"]);
  });
});

describe("assertSafePackUrl", () => {
  it("allows https absolute URLs", () => {
    expect(assertSafePackUrl("https://cdn.example.com/pack.json")).toBe(
      "https://cdn.example.com/pack.json"
    );
  });

  it("rejects http", () => {
    expect(() => assertSafePackUrl("http://cdn.example.com/pack.json")).toThrow(
      /https/
    );
  });

  it("rejects localhost", () => {
    expect(() =>
      assertSafePackUrl("https://localhost/pack.json")
    ).toThrow(/host not allowed/);
  });

  it("allows relative /path", () => {
    expect(assertSafePackUrl("/packs/demo.pack.json")).toBe(
      "/packs/demo.pack.json"
    );
  });

  it("rejects protocol-relative //", () => {
    expect(() => assertSafePackUrl("//evil.example/pack.json")).toThrow(
      /Invalid packUrl/
    );
  });

  it("rejects path traversal ..", () => {
    expect(() => assertSafePackUrl("/packs/../etc/passwd")).toThrow(
      /Invalid packUrl path/
    );
  });
});

describe("pack action sanitization", () => {
  it("drops unknown ops and unsafe flag names", () => {
    const actions = parsePackActions([
      { op: "setFlag", flag: "__proto__" },
      { op: "setFlag", flag: "door_open" },
      { op: "eval", code: "1" },
      { op: "message", text: "Hi" },
    ]);
    expect(actions.map((a) => a.op)).toEqual(["setFlag", "message"]);
    expect(actions[0]).toMatchObject({ flag: "door_open" });
  });

  it("runPackActions refuses __proto__ flags", () => {
    const game = createGame(
      createGameFromJson(createEmptyJsonPack({ id: "p", title: "P" }))
    );
    const state = game.createInitialState();
    const result = runPackActions(
      [{ op: "setFlag", flag: "__proto__" } as never, { op: "setFlag", flag: "ok" }],
      state
    );
    expect(result.patch.flags?.ok).toBe(true);
    expect(
      Object.prototype.hasOwnProperty.call(result.patch.flags ?? {}, "__proto__")
    ).toBe(false);
  });
});

describe("enhance-12 untrusted pack sinks", () => {
  it("does not install __proto__ specials or region flags", () => {
    const pack = createEmptyJsonPack({
      id: "sec12",
      title: "Sec",
      rooms: {
        start: {
          id: "start",
          name: "Start",
          image: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
          regions: [
            {
              id: "zone",
              x: 0,
              y: 0,
              width: 10,
              height: 10,
              onEnterFlag: "__proto__",
              setFlag: "constructor",
              onExitFlag: "left_ok",
            },
          ],
          hotspots: [
            {
              id: "__proto__",
              name: "Bad",
              x: 1,
              y: 1,
              width: 5,
              height: 5,
              special: { kind: "minigame", minigameId: "pixel-invaders" },
            },
          ],
        },
      },
    });
    const compiled = compilePackSpecials(pack);
    expect(Object.getPrototypeOf(compiled.specials)).toBe(Object.prototype);
    expect(compiled.specials.run).toBeUndefined();
    expect(
      Object.prototype.hasOwnProperty.call(compiled.specials, "__proto__")
    ).toBe(false);
    const def = createGameFromJson(pack);
    expect(def.rooms.start.regions?.[0]?.onEnterFlag).toBeUndefined();
    expect(def.rooms.start.regions?.[0]?.setFlag).toBeUndefined();
    expect(def.rooms.start.regions?.[0]?.onExitFlag).toBe("left_ok");
    expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
  });

  it("caps polygon points, timers, camera ease, and cutscene goto loops", () => {
    const points = sanitizePolygonPoints(
      Array.from({ length: 500 }, (_, i) => ({
        x: i,
        y: 10,
        extra: "ignore",
      }))
    );
    expect(points).toHaveLength(MAX_POLYGON_POINTS);
    expect(points?.[0]).toEqual({ x: 0, y: 10 });

    const timers = sanitizeRoomTimers([
      { id: "ok", afterMs: 10, message: "x".repeat(10_000) },
      { id: "__proto__", afterMs: 1 },
      ...Array.from({ length: 80 }, (_, i) => ({
        id: `t${i}`,
        afterMs: 10,
      })),
    ]);
    expect(timers.length).toBeLessThanOrEqual(64);
    expect(timers[0]?.message?.length).toBeLessThanOrEqual(4_000);
    expect(timers.some((t) => t.id === "__proto__")).toBe(false);

    const cam = panTo(
      { x: 50, y: 50, followActorId: "player", zoom: 1 },
      10,
      10,
      { width: 200, height: 100 },
      Number.POSITIVE_INFINITY
    );
    expect(cam.ease?.durationMs).toBeLessThanOrEqual(60_000);
    expect(Number.isFinite(cam.ease?.durationMs)).toBe(true);

    let rt = startCutscene({
      id: "loop",
      lines: [{ text: "", durationMs: 1, label: "a", goto: "a" }],
    });
    let guard = 0;
    while (rt && guard < 100) {
      const next = advanceCutscene(rt);
      if (!next) break;
      rt = next;
      guard += 1;
    }
    expect(guard).toBeLessThan(20);
    expect(advanceCutscene(rt!)).toBeNull();
  });
});
