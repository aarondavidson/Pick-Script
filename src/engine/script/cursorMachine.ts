/**
 * S.C.R.I.P.T. pillar — cursor state machine.
 * Contextual modes from verb bar + inventory-as-cursor.
 */

import type { GameItem, VerbId } from "../types";

export type CursorMode =
  | "default"
  | "walk"
  | "look"
  | "talk"
  | "use"
  | "pickup"
  | "open"
  | "push"
  | "pull"
  | "give"
  | "item"
  | "locked";

export interface CursorState {
  mode: CursorMode;
  /** Short label for UI / a11y */
  label: string;
  /** CSS cursor keyword */
  cssCursor: string;
  /** Inventory item when mode === "item" */
  item: GameItem | null;
}

export interface ResolveCursorArgs {
  selectedVerb: VerbId | null;
  selectedCombineItem: GameItem | null;
  inputLocked?: boolean;
  /** Floor click with no verb = walk */
  allowWalk?: boolean;
}

const VERB_CURSORS: Record<
  VerbId,
  { mode: CursorMode; label: string; cssCursor: string }
> = {
  look: { mode: "look", label: "Look at", cssCursor: "help" },
  talk: { mode: "talk", label: "Talk to", cssCursor: "pointer" },
  use: { mode: "use", label: "Use", cssCursor: "pointer" },
  pickup: { mode: "pickup", label: "Pick up", cssCursor: "grab" },
  open: { mode: "open", label: "Open", cssCursor: "pointer" },
  push: { mode: "push", label: "Push", cssCursor: "move" },
  pull: { mode: "pull", label: "Pull", cssCursor: "move" },
  give: { mode: "give", label: "Give", cssCursor: "crosshair" },
};

/** Resolve the active cursor from verb / inventory / lock state. */
export function resolveCursorState(args: ResolveCursorArgs): CursorState {
  if (args.inputLocked) {
    return {
      mode: "locked",
      label: "Wait",
      cssCursor: "wait",
      item: null,
    };
  }

  if (args.selectedCombineItem) {
    const give =
      args.selectedVerb === "give"
        ? `Give ${args.selectedCombineItem.name} to`
        : `Use ${args.selectedCombineItem.name} with`;
    return {
      mode: "item",
      label: give,
      cssCursor: "crosshair",
      item: args.selectedCombineItem,
    };
  }

  if (args.selectedVerb) {
    const v = VERB_CURSORS[args.selectedVerb];
    if (v) {
      return { ...v, item: null };
    }
  }

  if (args.allowWalk !== false) {
    return {
      mode: "walk",
      label: "Walk to",
      cssCursor: "default",
      item: null,
    };
  }

  return {
    mode: "default",
    label: "",
    cssCursor: "default",
    item: null,
  };
}
