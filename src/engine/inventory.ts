import type { GameItem, GameState, ItemCombination, StatePatch } from "./types";
import type { GameDefinition } from "./definition";

export function addItem(state: GameState, item: GameItem): StatePatch {
  if (state.inventory.some((i) => i.id === item.id)) {
    return {};
  }
  return { inventory: [...state.inventory, item] };
}

export function removeItem(state: GameState, itemId: string): StatePatch {
  return {
    inventory: state.inventory.filter((item) => item.id !== itemId),
  };
}

export function removeItems(state: GameState, itemIds: string[]): StatePatch {
  const idSet = new Set(itemIds);
  return {
    inventory: state.inventory.filter((item) => !idSet.has(item.id)),
  };
}

export function findCombination(
  combinations: Record<string, ItemCombination>,
  item1Id: string,
  item2Id: string
): ItemCombination | null {
  const key1 = `${item1Id}+${item2Id}`;
  const key2 = `${item2Id}+${item1Id}`;
  return combinations[key1] ?? combinations[key2] ?? null;
}

export interface CombineResult {
  ok: boolean;
  result?: GameItem;
  message: string;
  patch?: StatePatch;
}

/**
 * Pure combine attempt — no side effects.
 * Callers apply patch and play SFX.
 */
export function tryCombineItems(
  def: GameDefinition,
  state: GameState,
  item1: GameItem,
  item2: GameItem
): CombineResult {
  if (def.canCombine) {
    const gate = def.canCombine(item1.id, item2.id, state);
    if (gate.ok === false) {
      return { ok: false, message: gate.message };
    }
  }

  const recipe = findCombination(def.combinations, item1.id, item2.id);
  if (!recipe) {
    return { ok: false, message: "These items don't combine." };
  }

  if (recipe.condition && !recipe.condition(state)) {
    return {
      ok: false,
      message: recipe.failMessage ?? "That won't work right now.",
    };
  }

  const result: GameItem = {
    ...recipe.result,
    icon: recipe.result.icon ?? def.itemIcons?.[recipe.result.id],
  };

  const newInventory = state.inventory.filter(
    (item) => item.id !== item1.id && item.id !== item2.id
  );
  newInventory.push(result);

  return {
    ok: true,
    result,
    message:
      recipe.successMessage ??
      `Combined ${item1.name} and ${item2.name}!`,
    patch: { inventory: newInventory },
  };
}
