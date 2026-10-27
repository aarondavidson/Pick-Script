import { describe, expect, it } from "vitest";
import { sanitizePackActions } from "@/engine/packActions";
import { GUIDED_ACTION_MAX_DEPTH } from "@/studio/GuidedActionEditor";

describe("GuidedActionEditor if/else ActionList", () => {
  it("round-trips if/else through sanitizePackActions", () => {
    const authored = [
      {
        op: "if" as const,
        flag: "gate_open",
        hasItem: "key",
        then: [
          { op: "message" as const, text: "Open." },
          { op: "setFlag" as const, flag: "passed", value: true },
        ],
        else: [
          { op: "message" as const, text: "Locked." },
          {
            op: "requireItem" as const,
            itemId: "key",
            failMessage: "Need the key.",
          },
        ],
      },
    ];
    const once = sanitizePackActions(authored);
    expect(once).toHaveLength(1);
    expect(once[0]).toMatchObject({
      op: "if",
      flag: "gate_open",
      hasItem: "key",
    });
    if (once[0]?.op !== "if") throw new Error("expected if");
    expect(once[0].then).toEqual([
      { op: "message", text: "Open." },
      { op: "setFlag", flag: "passed", value: true },
    ]);
    expect(once[0].else).toEqual([
      { op: "message", text: "Locked." },
      {
        op: "requireItem",
        itemId: "key",
        failMessage: "Need the key.",
      },
    ]);

    const twice = sanitizePackActions(once);
    expect(twice).toEqual(once);
  });

  it("keeps requireItem itemId + failMessage through sanitize", () => {
    const actions = sanitizePackActions([
      {
        op: "requireItem",
        itemId: "torch",
        failMessage: "Need a torch.",
      },
    ]);
    expect(actions).toEqual([
      {
        op: "requireItem",
        itemId: "torch",
        failMessage: "Need a torch.",
      },
    ]);
  });

  it("exports a guided nest depth limit of 2", () => {
    expect(GUIDED_ACTION_MAX_DEPTH).toBe(2);
  });
});
