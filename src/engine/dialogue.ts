import type {
  DialogueChoice,
  DialogueNode,
  DialogueTree,
  GameState,
  StatePatch,
} from "./types";
import { resolveText } from "./state";
import { filterDialogueChoices } from "./dialogueOptions";

export interface DialogueView {
  node: DialogueNode;
  text: string;
  choices: DialogueChoice[];
}

export function getDialogueNode(
  tree: DialogueTree,
  nodeId: string
): DialogueNode | null {
  return tree.nodes[nodeId] ?? null;
}

export function viewDialogueNode(
  tree: DialogueTree,
  nodeId: string,
  state: GameState,
  treeKey = "default"
): DialogueView | null {
  const node = getDialogueNode(tree, nodeId);
  if (!node) return null;

  const choices = filterDialogueChoices(node.choices, state, treeKey);

  return {
    node,
    text: resolveText(node.text, state),
    choices,
  };
}

export interface ChoiceResult {
  patch: StatePatch;
  nextNodeId: string | null; // null = END
}

export function applyDialogueChoice(
  choice: DialogueChoice,
  state: GameState
): ChoiceResult {
  const patch = choice.action?.(state) ?? {};
  const nextNodeId = choice.nextNode === "END" ? null : choice.nextNode;
  return { patch, nextNodeId };
}

export function applyDialogueOnView(
  node: DialogueNode,
  state: GameState
): StatePatch {
  return node.onView?.(state) ?? {};
}
