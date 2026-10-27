import type { GameState, Quest } from "./types";

export interface CurrentObjective {
  questId: string;
  questTitle: string;
  /** Next incomplete objective text, or quest title if all checked but quest open */
  text: string;
  /** 1-based index among remaining objectives, for “Step 2 of 3” style UI */
  step: number;
  total: number;
  /** True when every listed objective is done but quest not yet completed */
  awaitingComplete: boolean;
}

function activeQuests(state: GameState): Quest[] {
  return (state.quests ?? []).filter((q) => !q.completed);
}

/**
 * First incomplete objective on the first active quest (clear sub-goal).
 */
export function getCurrentObjective(state: GameState): CurrentObjective | null {
  const quest = activeQuests(state)[0];
  if (!quest) return null;

  const total = quest.objectives.length;
  if (total === 0) {
    return {
      questId: quest.id,
      questTitle: quest.title,
      text: quest.title,
      step: 1,
      total: 1,
      awaitingComplete: false,
    };
  }

  const done = new Set(quest.completedObjectives ?? []);
  const nextIndex = quest.objectives.findIndex((_, i) => !done.has(i));
  if (nextIndex < 0) {
    return {
      questId: quest.id,
      questTitle: quest.title,
      text: quest.title,
      step: total,
      total,
      awaitingComplete: true,
    };
  }

  return {
    questId: quest.id,
    questTitle: quest.title,
    text: quest.objectives[nextIndex]!,
    step: nextIndex + 1,
    total,
    awaitingComplete: false,
  };
}
