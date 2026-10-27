import { describe, expect, it } from "vitest";
import { getCurrentObjective } from "./currentObjective";
import type { Quest } from "./types";

function withQuests(quests: Quest[]) {
  return { quests } as Parameters<typeof getCurrentObjective>[0];
}

describe("getCurrentObjective", () => {
  it("returns null with no quests", () => {
    expect(getCurrentObjective(withQuests([]))).toBeNull();
  });

  it("returns the first incomplete objective", () => {
    const obj = getCurrentObjective(
      withQuests([
        {
          id: "q1",
          title: "Escape",
          description: "Leave",
          objectives: ["Find key", "Open door"],
          completed: false,
          completedObjectives: [0],
        },
      ])
    );
    expect(obj?.text).toBe("Open door");
    expect(obj?.step).toBe(2);
    expect(obj?.total).toBe(2);
  });

  it("skips completed quests", () => {
    const obj = getCurrentObjective(
      withQuests([
        {
          id: "done",
          title: "Done",
          description: "",
          objectives: ["A"],
          completed: true,
          completedObjectives: [0],
        },
        {
          id: "next",
          title: "Next",
          description: "",
          objectives: ["Talk to NPC"],
          completed: false,
          completedObjectives: [],
        },
      ])
    );
    expect(obj?.questId).toBe("next");
    expect(obj?.text).toBe("Talk to NPC");
  });
});
