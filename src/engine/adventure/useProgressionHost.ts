import {
  useCallback,
  useEffect,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { GameDefinition } from "../definition";
import type { AdventureRuntime } from "../createGame";
import type {
  GameItem,
  GameState,
  JournalEntry,
  Quest,
} from "../types";
import { applyStatePatch } from "../state";
import { shouldCompleteGame } from "../winFlag";
import type { CutsceneRuntime } from "../cutscene";

export interface UseProgressionHostArgs {
  runtime: AdventureRuntime;
  definition: GameDefinition;
  gameState: GameState;
  setGameState: Dispatch<SetStateAction<GameState>>;
  showMessage: (message: string) => void;
  cutscene: CutsceneRuntime | null;
  setSelectedCombineItem: (item: GameItem | null) => void;
  sfx?: {
    click?: () => void;
    pickup?: () => void;
    success?: () => void;
    error?: () => void;
  };
}

/**
 * Inventory combine, achievements, quests, and journal helpers.
 */
export function useProgressionHost({
  runtime,
  definition,
  gameState,
  setGameState,
  showMessage,
  cutscene,
  setSelectedCombineItem,
  sfx,
}: UseProgressionHostArgs) {
  const addJournalEntry = useCallback(
    (id: string, title: string, content: string) => {
      setGameState((prev) => {
        if (prev.journalEntries.some((entry) => entry.id === id)) return prev;
        const entry: JournalEntry = {
          id,
          title,
          content,
          timestamp: Date.now(),
          location: prev.currentLocation,
        };
        return applyStatePatch(prev, {
          journalEntries: [...prev.journalEntries, entry],
        });
      });
    },
    [setGameState]
  );

  const combineItems = useCallback(
    (item1: GameItem, item2: GameItem): GameItem | null => {
      if (cutscene?.active) return null;
      const result = runtime.combine(gameState, item1, item2);
      if (!result.ok) {
        showMessage(result.message);
        sfx?.error?.();
        return null;
      }

      if (result.patch) {
        let next = applyStatePatch(gameState, result.patch);
        next = runtime.runEvent(
          {
            type: "itemCombine",
            item1: item1.id,
            item2: item2.id,
            resultId: result.result!.id,
          },
          next
        );
        setGameState(next);
      }

      showMessage(result.message);
      sfx?.pickup?.();
      setSelectedCombineItem(null);
      return result.result ?? null;
    },
    [
      runtime,
      gameState,
      showMessage,
      sfx,
      cutscene,
      setGameState,
      setSelectedCombineItem,
    ]
  );

  const unlockAchievement = useCallback(
    (id: string) => {
      setGameState((prev) => {
        const achievement = prev.achievements.find((a) => a.id === id);
        if (!achievement || achievement.unlocked) return prev;

        const updated = prev.achievements.map((a) =>
          a.id === id ? { ...a, unlocked: true, timestamp: Date.now() } : a
        );
        let next = applyStatePatch(prev, { achievements: updated });
        next = runtime.runEvent(
          { type: "achievementUnlock", achievementId: id },
          next
        );

        queueMicrotask(() => {
          sfx?.success?.();
          showMessage(`Achievement Unlocked: ${achievement.title}!`);
        });

        return next;
      });
    },
    [runtime, showMessage, sfx, setGameState]
  );

  const updateQuest = useCallback(
    (id: string, objectiveIndex: number) => {
      setGameState((prev) => {
        const quest = prev.quests.find((q) => q.id === id);
        if (!quest || quest.completedObjectives.includes(objectiveIndex)) {
          return prev;
        }
        const updatedQuests = prev.quests.map((q) =>
          q.id === id
            ? {
                ...q,
                completedObjectives: [
                  ...q.completedObjectives,
                  objectiveIndex,
                ],
              }
            : q
        );
        sfx?.pickup?.();
        return applyStatePatch(prev, { quests: updatedQuests });
      });
    },
    [sfx, setGameState]
  );

  const addQuest = useCallback(
    (quest: Quest) => {
      setGameState((prev) => {
        if (prev.quests.some((q) => q.id === quest.id)) return prev;
        queueMicrotask(() => {
          sfx?.pickup?.();
          showMessage(`New Quest: ${quest.title}!`);
        });
        return applyStatePatch(prev, {
          quests: [...prev.quests, quest],
        });
      });
    },
    [showMessage, sfx, setGameState]
  );

  const completeQuest = useCallback(
    (id: string) => {
      setGameState((prev) => {
        const quest = prev.quests.find((q) => q.id === id);
        if (!quest || quest.completed) return prev;
        const updatedQuests = prev.quests.map((q) =>
          q.id === id ? { ...q, completed: true } : q
        );
        let next = applyStatePatch(prev, { quests: updatedQuests });
        next = runtime.runEvent({ type: "questComplete", questId: id }, next);
        queueMicrotask(() => {
          sfx?.success?.();
          showMessage(`Quest Completed: ${quest.title}!`);
        });
        return next;
      });
    },
    [runtime, showMessage, sfx, setGameState]
  );

  // Achievement / quest flag auto-unlock (Studio JSON packs)
  useEffect(() => {
    for (const ach of definition.achievements) {
      const flag = ach.unlockFlag;
      if (!flag || !gameState.flags[flag]) continue;
      const live = gameState.achievements.find((a) => a.id === ach.id);
      if (live && !live.unlocked) unlockAchievement(ach.id);
    }
    for (const q of definition.quests) {
      const live = gameState.quests.find((x) => x.id === q.id);
      if (!live || live.completed) continue;
      const objFlags = q.objectiveFlags ?? [];
      objFlags.forEach((f, index) => {
        if (!f || !gameState.flags[f]) return;
        if (!live.completedObjectives.includes(index)) {
          updateQuest(q.id, index);
        }
      });
      const flag = q.completeFlag;
      if (flag && gameState.flags[flag] && !live.completed) {
        completeQuest(q.id);
      }
    }
  }, [
    gameState.flags,
    gameState.achievements,
    gameState.quests,
    definition.achievements,
    definition.quests,
    unlockAchievement,
    completeQuest,
    updateQuest,
  ]);

  // Pack win flag → win screen (any source can set the flag)
  useEffect(() => {
    if (!shouldCompleteGame(definition, gameState)) return;
    setGameState((prev) => {
      if (!shouldCompleteGame(definition, prev)) return prev;
      const next = applyStatePatch(prev, { gameComplete: true });
      return runtime.runEvent({ type: "gameComplete" }, next);
    });
  }, [definition, gameState, runtime, setGameState]);

  return {
    combineItems,
    addJournalEntry,
    unlockAchievement,
    addQuest,
    updateQuest,
    completeQuest,
  };
}
