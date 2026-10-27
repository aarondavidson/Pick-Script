import type { GameItem, Hotspot, VerbId } from "../types";

export type PendingArrive = {
  hotspot: Hotspot;
  verb: VerbId;
  withItem: GameItem | null;
  options?: {
    onDialogueOpen?: () => void;
    onSpecial?: () => void;
  };
};

export type PendingConsumeConfirm = {
  hotspot: Hotspot;
  item: GameItem;
  verb: VerbId;
  options?: PendingArrive["options"];
};
