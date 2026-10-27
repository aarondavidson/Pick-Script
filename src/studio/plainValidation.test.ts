import { describe, expect, it } from "vitest";
import { humanizeValidationMessage } from "./plainValidation";

describe("humanizeValidationMessage", () => {
  it("explains missing room art", () => {
    expect(
      humanizeValidationMessage('room "start" has no image (placeholder will be used)')
    ).toMatch(/Upload room art/i);
  });

  it("explains silent hotspots", () => {
    expect(
      humanizeValidationMessage(
        'hotspot "start/prop" has no Look/Use/actions — interaction will do nothing'
      )
    ).toMatch(/Intent Wizard/i);
  });

  it("falls back to the original message", () => {
    expect(humanizeValidationMessage("Weird custom error")).toBe(
      "Weird custom error"
    );
  });
});
