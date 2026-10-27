import { describe, expect, it } from "vitest";
import { createEmptyJsonPack, validateJsonPack } from "@/engine/jsonPack";
import { applyRecipeToPack } from "./applyRecipeToPack";
import { applyRoomStubFactory } from "./roomStubFactory";

describe("applyRecipeToPack", () => {
  it("applies talk-gate into draft", () => {
    const doc = createEmptyJsonPack({ id: "a", title: "A" });
    const result = applyRecipeToPack(doc, "talk-gate");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.doc.rooms.street).toBeTruthy();
    expect(
      result.doc.rooms.start?.hotspots?.some((h) => h.id === "guard")
    ).toBe(true);
  });

  it("applies look-scenery with three look hotspots", () => {
    const doc = createEmptyJsonPack({ id: "a", title: "A" });
    const result = applyRecipeToPack(doc, "look-scenery");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const spots = result.doc.rooms.start?.hotspots ?? [];
    expect(spots.length).toBe(3);
    expect(spots.every((h) => h.kind === "interact" && h.lookText)).toBe(true);
    expect(validateJsonPack(result.doc).ok).toBe(true);
  });

  it("applies give-item pickup + character use-with", () => {
    const doc = createEmptyJsonPack({ id: "a", title: "A" });
    const result = applyRecipeToPack(doc, "give-item");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.doc.items?.flower).toBeTruthy();
    const gardener = result.doc.rooms.start?.hotspots?.find(
      (h) => h.kind === "character"
    );
    expect(gardener?.useWith?.[0]?.itemId).toBe("flower");
    expect(gardener?.useWith?.[0]?.setFlag).toBe("garden_open");
    expect(validateJsonPack(result.doc).ok).toBe(true);
  });

  it("applies region-trigger with onEnterFlag + message", () => {
    const doc = createEmptyJsonPack({ id: "a", title: "A" });
    const result = applyRecipeToPack(doc, "region-trigger");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const region = result.doc.rooms.start?.regions?.[0];
    expect(region?.onEnterFlag).toBe("stepped_pad");
    expect(region?.message).toBeTruthy();
    expect(result.doc.initialFlags?.stepped_pad).toBe(false);
    expect(validateJsonPack(result.doc).ok).toBe(true);
  });

  it("applies timer-beat once after 5s", () => {
    const doc = createEmptyJsonPack({ id: "a", title: "A" });
    const result = applyRecipeToPack(doc, "timer-beat");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const timer = result.doc.rooms.start?.timers?.[0];
    expect(timer?.afterMs).toBe(5000);
    expect(timer?.once).toBe(true);
    expect(timer?.message).toBeTruthy();
    expect(validateJsonPack(result.doc).ok).toBe(true);
  });

  it("applies sequence-lock minigame hotspot with default config", () => {
    const doc = createEmptyJsonPack({ id: "a", title: "A" });
    const result = applyRecipeToPack(doc, "sequence-lock");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const hs = result.doc.rooms.start?.hotspots?.find(
      (h) => h.special?.minigameId === "sequence-lock"
    );
    expect(hs).toBeTruthy();
    expect(hs?.special?.kind).toBe("minigame");
    expect(hs?.special?.config?.sequence).toEqual(["a", "b", "c", "d"]);
    expect(hs?.special?.config?.winFlag).toBe("beatSequenceLock");
    expect(result.doc.initialFlags?.beatSequenceLock).toBe(false);
    expect(validateJsonPack(result.doc).ok).toBe(true);
  });

  it("applies slider-puzzle minigame hotspot with default config", () => {
    const doc = createEmptyJsonPack({ id: "a", title: "A" });
    const result = applyRecipeToPack(doc, "slider-puzzle");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const hs = result.doc.rooms.start?.hotspots?.find(
      (h) => h.special?.minigameId === "slider-puzzle"
    );
    expect(hs).toBeTruthy();
    expect(hs?.special?.config?.order).toEqual(["b", "r", "g"]);
    expect(hs?.special?.config?.target).toEqual(["r", "g", "b"]);
    expect(hs?.special?.config?.winFlag).toBe("beatSliderPuzzle");
    expect(validateJsonPack(result.doc).ok).toBe(true);
  });

  it("applies dial-lock minigame hotspot with default config", () => {
    const doc = createEmptyJsonPack({ id: "a", title: "A" });
    const result = applyRecipeToPack(doc, "dial-lock");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const hs = result.doc.rooms.start?.hotspots?.find(
      (h) => h.special?.minigameId === "dial-lock"
    );
    expect(hs?.special?.config?.target).toEqual([3, 7, 1]);
    expect(hs?.special?.config?.winFlag).toBe("beatDialLock");
    expect(validateJsonPack(result.doc).ok).toBe(true);
  });

  it("applies wire-match minigame hotspot with default config", () => {
    const doc = createEmptyJsonPack({ id: "a", title: "A" });
    const result = applyRecipeToPack(doc, "wire-match");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const hs = result.doc.rooms.start?.hotspots?.find(
      (h) => h.special?.minigameId === "wire-match"
    );
    expect(hs?.special?.config?.pairs).toEqual([
      ["a", "1"],
      ["b", "2"],
      ["c", "3"],
    ]);
    expect(hs?.special?.config?.winFlag).toBe("beatWireMatch");
    expect(validateJsonPack(result.doc).ok).toBe(true);
  });

  it("room stub factory adds linked rooms with placeholder art", () => {
    const doc = createEmptyJsonPack({ id: "a", title: "A" });
    const next = applyRoomStubFactory(doc, { count: 3, layout: "line" });
    expect(Object.keys(next.rooms).length).toBe(4);
    expect((next.links ?? []).length).toBeGreaterThanOrEqual(3);
    const stub = Object.values(next.rooms).find((r) => r.id !== "start")!;
    expect(stub.image).toContain("MISSING");
    expect(validateJsonPack(next).ok).toBe(true);
  });
});
