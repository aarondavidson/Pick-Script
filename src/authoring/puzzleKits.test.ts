import { describe, expect, it } from "vitest";
import { createEmptyJsonPack, validateJsonPack } from "@/engine/jsonPack";
import {
  applyGetItemKit,
  applyLockedExitKit,
  applyUseWithKit,
} from "@/authoring/puzzleKits";
import { addRoom } from "@/studio/packDraft";
import { applyCoachSuggestion } from "@/authoring/coachApply";

describe("puzzleKits", () => {
  it("get-item + use-with + locked-exit compose", () => {
    let doc = createEmptyJsonPack({ id: "kit-test", title: "Kit" });
    doc.rooms.start!.image = "data:image/gif;base64,R0lGODlhAQABAAAAACw=";
    doc = applyGetItemKit(doc, "start", {
      hotspotName: "Key",
      x: 10,
      y: 10,
      width: 10,
      height: 10,
      itemId: "key",
      itemName: "Key",
    });
    doc = applyUseWithKit(doc, "start", {
      hotspotName: "Door",
      x: 40,
      y: 40,
      width: 12,
      height: 20,
      itemId: "key",
      successMessage: "Unlocked",
      setFlag: "door_open",
      alreadyFlag: "door_open",
      consumeItem: true,
    });
    doc = addRoom(doc, "Hall");
    const hallId = Object.keys(doc.rooms).find((k) => k !== "start")!;
    doc.rooms[hallId]!.image = "data:image/gif;base64,R0lGODlhAQABAAAAACw=";
    doc = applyLockedExitKit(doc, {
      from: "start",
      to: hallId,
      requireFlag: "got_key",
    });
    expect(validateJsonPack(doc).ok).toBe(true);
    expect(doc.rooms.start!.hotspots).toHaveLength(2);
    expect(doc.links?.[0]?.requireFlag).toBe("got_key");
  });

  it("coach Apply adds second room", () => {
    const doc = createEmptyJsonPack({ id: "coach", title: "Coach" });
    const result = applyCoachSuggestion(doc, "pack-second-room");
    expect(result.kind).toBe("doc");
    if (result.kind === "doc") {
      expect(Object.keys(result.doc.rooms).length).toBe(2);
      expect(result.doc.links?.length).toBe(1);
    }
  });
});
