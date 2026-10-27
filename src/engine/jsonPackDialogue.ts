/**
 * Compile lite JSON pack dialogue → engine DialogueTree.
 */

import type {
  DialogueChoice,
  DialogueTree,
  GameState,
} from "./types";
import type { JsonPackDialogue, JsonPackItem } from "./jsonPackTypes";

/** Compile lite dialogue → engine DialogueTree (`END` closes). */
export function compileJsonDialogue(
  d: JsonPackDialogue,
  items?: Record<string, JsonPackItem>,
  ctx?: { roomId: string; hotspotId: string }
): DialogueTree {
  const lines = d.lines?.filter((l) => l.id && l.text) ?? [];
  if (!lines.length) {
    return {
      startNode: "empty",
      nodes: {
        empty: {
          id: "empty",
          text: "…",
          speaker: d.speaker,
          choices: [{ text: "Bye", nextNode: "END" }],
        },
      },
    };
  }
  const nodes: DialogueTree["nodes"] = {};
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const next = lines[i + 1];
    const lineKey = ctx
      ? `dlg.${ctx.roomId}.${ctx.hotspotId}.${line.id}`
      : undefined;
    const voiceKey =
      line.voiceKey?.trim() ||
      (lineKey ? `voice.${ctx!.roomId}.${ctx!.hotspotId}.${line.id}` : undefined);
    let choices: DialogueChoice[] | undefined = line.choices?.map((c, ci) => {
      const flag = c.requireFlag?.trim();
      const setFlag = c.setFlag?.trim();
      const clearFlag = c.clearFlag?.trim();
      const giveItemId = c.giveItemId?.trim();
      const needsAction = !!(setFlag || clearFlag || giveItemId);
      const choiceKey = lineKey ? `${lineKey}.c${ci}` : undefined;
      return {
        text: c.text,
        nextNode: !c.nextId || c.nextId === "END" ? "END" : c.nextId,
        choiceId: c.choiceId ?? choiceKey,
        optionMode: c.optionMode,
        offForever: c.offForever,
        condition: flag
          ? (state: GameState) => !!state.flags[flag]
          : undefined,
        action: needsAction
          ? (state: GameState) => {
              const flags = { ...state.flags };
              if (setFlag) flags[setFlag] = true;
              if (clearFlag) flags[clearFlag] = false;
              let inventory = state.inventory;
              if (giveItemId && !inventory.some((i) => i.id === giveItemId)) {
                const catalog = items?.[giveItemId];
                inventory = [
                  ...inventory,
                  {
                    id: giveItemId,
                    name: catalog?.name || giveItemId,
                    description: catalog?.description || catalog?.name || giveItemId,
                    icon: catalog?.icon,
                  },
                ];
              }
              return { flags, inventory };
            }
          : undefined,
      };
    });
    if (!choices?.length) {
      choices = next
        ? [{ text: "…", nextNode: next.id }]
        : [{ text: "Bye", nextNode: "END" }];
    }
    // Cap at 4 choices for lite UI
    choices = choices.slice(0, 4);
    nodes[line.id] = {
      id: line.id,
      text: line.text,
      speaker: d.speaker,
      choices,
      ...(lineKey ? { lineKey } : {}),
      ...(voiceKey ? { voiceKey } : {}),
      ...(line.mouthCues?.length ? { mouthCues: line.mouthCues } : {}),
      ...(line.lipSyncKey?.trim()
        ? { lipSyncKey: line.lipSyncKey.trim() }
        : {}),
    };
  }
  return { startNode: lines[0]!.id, nodes };
}
