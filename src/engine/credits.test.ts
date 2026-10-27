import { describe, expect, it } from "vitest";
import { formatCredit, mergeCredits, sanitizeCredits } from "./credits";

describe("credits", () => {
  it("keeps valid rows and drops malformed ones", () => {
    expect(
      sanitizeCredits([
        { work: "Tiny Dungeon", author: "Kenney", license: "CC0", url: "https://kenney.nl/" },
        { work: "", author: "Nobody" },
        { work: "No author" },
        null,
        "string",
      ])
    ).toEqual([
      { work: "Tiny Dungeon", author: "Kenney", license: "CC0", url: "https://kenney.nl/" },
    ]);
    expect(sanitizeCredits(undefined)).toBeUndefined();
  });

  it("only keeps https links", () => {
    const [a, b] = sanitizeCredits([
      { work: "A", author: "X", url: "javascript:alert(1)" },
      { work: "B", author: "Y", url: "http://example.com" },
    ])!;
    expect(a.url).toBeUndefined();
    expect(b.url).toBeUndefined();
  });

  it("caps text length", () => {
    const [c] = sanitizeCredits([{ work: "w".repeat(500), author: "a" }])!;
    expect(c.work.length).toBe(160);
  });

  it("merges without duplicates", () => {
    const k = { work: "Tiny Dungeon", author: "Kenney", url: "https://kenney.nl/tiny" };
    const merged = mergeCredits([k], [{ ...k }, { work: "Town", author: "ansimuz" }]);
    expect(merged.map((c) => c.work)).toEqual(["Tiny Dungeon", "Town"]);
  });

  it("formats a one-line credit", () => {
    expect(formatCredit({ work: "Town", author: "ansimuz", license: "CC0" })).toBe(
      "“Town” by ansimuz (CC0)"
    );
  });
});
