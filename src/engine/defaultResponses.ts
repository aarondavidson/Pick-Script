import type { GameState, StateFn, VerbId } from "./types";

/** Pack-overridable fallback lines when a verb isn't valid on a target. */
export type DefaultVerbResponses = Partial<
  Record<VerbId, StateFn<string>>
> & {
  /** Use inventory-item with world object failure */
  useWith?: StateFn<string>;
};

export const DEFAULT_VERB_RESPONSES: DefaultVerbResponses = {
  look: "Nothing special about it.",
  talk: "It doesn't talk back.",
  use: "That doesn't seem useful.",
  pickup: "You can't pick that up.",
  open: "It doesn't open.",
  push: "It won't budge.",
  pull: "Pulling does nothing.",
  give: "They don't want that.",
  useWith: "That doesn't work.",
};

export function getDefaultVerbResponse(
  responses: DefaultVerbResponses | undefined,
  verb: VerbId,
  state: GameState
): string {
  const table = { ...DEFAULT_VERB_RESPONSES, ...responses };
  const entry = table[verb] ?? `You can't ${verb} that.`;
  return typeof entry === "function" ? entry(state) : entry;
}
