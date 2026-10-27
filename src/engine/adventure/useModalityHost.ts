import {
  useCallback,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { GameDefinition } from "../definition";
import type { AdventureRuntime } from "../createGame";
import type { GameState } from "../types";
import { applyStatePatch } from "../state";
import type { PackModality } from "../specials";
import { resolveMinigameWinFlag } from "../jsonPackSpecials";
import { isSafeIdentifierKey } from "../security";

export interface UseModalityHostArgs {
  definition: GameDefinition;
  runtime: AdventureRuntime;
  setGameState: Dispatch<SetStateAction<GameState>>;
  showMessage: (message: string) => void;
  sfx?: {
    click?: () => void;
    pickup?: () => void;
    success?: () => void;
    error?: () => void;
  };
}

/**
 * Pack modality open / clear / win helpers (comic / minigame UI).
 */
export function useModalityHost({
  definition,
  runtime,
  setGameState,
  showMessage,
  sfx,
}: UseModalityHostArgs) {
  const [pendingModality, setPendingModality] =
    useState<PackModality | null>(null);

  const clearModality = useCallback(() => {
    setPendingModality(null);
  }, []);

  const completeModality = useCallback(
    (modalityKey: string, config?: Record<string, unknown>) => {
      const handler = definition.onModalityWin;
      setPendingModality(null);
      const winFlag = resolveMinigameWinFlag(modalityKey, config);

      setGameState((prev) => {
        let next = prev;

        // Declarative templates set winFlag even without pack onModalityWin
        // (same pattern as a pack's onModalityWin for pixel-invaders).
        if (
          winFlag &&
          isSafeIdentifierKey(winFlag) &&
          !next.flags[winFlag]
        ) {
          next = applyStatePatch(next, {
            flags: { ...next.flags, [winFlag]: true },
          });
        }

        if (!handler) return next;

        const result = handler(modalityKey, next);
        if (!result) return next;

        if (result.patch) {
          next = applyStatePatch(next, result.patch);
        }
        if (result.journalEntry) {
          const already = next.journalEntries.some(
            (e) => e.id === result.journalEntry!.id
          );
          if (!already) {
            next = applyStatePatch(next, {
              journalEntries: [
                ...next.journalEntries,
                {
                  ...result.journalEntry,
                  timestamp: Date.now(),
                  location: next.currentLocation,
                },
              ],
            });
          }
        }
        if (result.achievementId) {
          const ach = next.achievements.find(
            (a) => a.id === result.achievementId
          );
          if (ach && !ach.unlocked) {
            next = applyStatePatch(next, {
              achievements: next.achievements.map((a) =>
                a.id === result.achievementId
                  ? { ...a, unlocked: true, timestamp: Date.now() }
                  : a
              ),
            });
            next = runtime.runEvent(
              {
                type: "achievementUnlock",
                achievementId: result.achievementId,
              },
              next
            );
            queueMicrotask(() => {
              sfx?.success?.();
              showMessage(`Achievement Unlocked: ${ach.title}!`);
            });
          }
        }
        if (result.message) {
          queueMicrotask(() => showMessage(result.message!));
        }
        return next;
      });
    },
    [definition.onModalityWin, showMessage, runtime, sfx, setGameState]
  );

  return {
    pendingModality,
    setPendingModality,
    clearModality,
    completeModality,
  };
}
