/**
 * AGS-style dialogue option lifecycle: once / once-game / off-forever.
 */

import type { DialogueChoice, GameState, StatePatch } from "./types";

export type DialogueOptionMode = "normal" | "once" | "onceGame" | "offForever";

export function dialogueOnceFlag(
  treeKey: string,
  choiceId: string
): string {
  return `dlg_once_${treeKey}_${choiceId}`;
}

export function dialogueOnceGameFlag(choiceId: string): string {
  return `dlg_once_game_${choiceId}`;
}

export function dialogueOffForeverFlag(choiceId: string): string {
  return `dlg_off_forever_${choiceId}`;
}

export function choiceStableId(
  choice: DialogueChoice,
  index: number
): string {
  return choice.choiceId || `c${index}_${choice.text.slice(0, 24)}`;
}

/** Filter choices by once / onceGame / offForever flags. */
export function filterDialogueChoices(
  choices: DialogueChoice[] | undefined,
  state: GameState,
  treeKey: string
): DialogueChoice[] {
  return (choices ?? []).filter((choice, index) => {
    if (choice.condition && !choice.condition(state)) return false;
    const id = choiceStableId(choice, index);
    const mode = choice.optionMode ?? "normal";
    if (state.flags[dialogueOffForeverFlag(id)]) return false;
    if (mode === "once" && state.flags[dialogueOnceFlag(treeKey, id)]) {
      return false;
    }
    if (mode === "onceGame" && state.flags[dialogueOnceGameFlag(id)]) {
      return false;
    }
    return true;
  });
}

/** Patch flags after a choice is taken (for once / forever modes). */
export function dialogueChoiceTakenPatch(
  choice: DialogueChoice,
  index: number,
  state: GameState,
  treeKey: string
): StatePatch {
  const id = choiceStableId(choice, index);
  const mode = choice.optionMode ?? "normal";
  const flags = { ...state.flags };
  if (mode === "once") flags[dialogueOnceFlag(treeKey, id)] = true;
  if (mode === "onceGame") flags[dialogueOnceGameFlag(id)] = true;
  if (mode === "offForever" || choice.offForever) {
    flags[dialogueOffForeverFlag(id)] = true;
  }
  const base = choice.action?.(state) ?? {};
  return {
    ...base,
    flags: { ...flags, ...(base.flags ?? {}) },
  };
}
