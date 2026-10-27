import { describe, expect, it } from "vitest";
import { createPackFromTemplate } from "@/authoring/packTemplates";
import { guessArtHandoffIds } from "@/studio/artHandoff";

describe("guessArtHandoffIds", () => {
  it("prefers harbor_key for short-mystery", () => {
    const doc = createPackFromTemplate({
      id: "test-mystery",
      title: "Test",
      templateId: "short-mystery",
    });
    expect(guessArtHandoffIds(doc)).toEqual({
      keyId: "harbor_key",
      rewardId: "reward",
    });
  });

  it("prefers brass_key + locket for key-door", () => {
    const doc = createPackFromTemplate({
      id: "test-key",
      title: "Test",
      templateId: "key-door",
    });
    expect(guessArtHandoffIds(doc)).toEqual({
      keyId: "brass_key",
      rewardId: "locket",
    });
  });

  it("defaults to harbor_key when the pack has no items", () => {
    const doc = createPackFromTemplate({
      id: "test-blank",
      title: "Test",
      templateId: "blank",
    });
    expect(guessArtHandoffIds(doc).keyId).toBe("harbor_key");
  });
});
