import type { ComponentType } from "react";
import type { GameState } from "@/engine";
import { PixelInvadersGame } from "./PixelInvadersGame";
import { HackingGame } from "./HackingGame";
import { SequenceLockGame } from "./SequenceLockGame";
import { SliderPuzzleGame } from "./SliderPuzzleGame";
import { DialLockGame } from "./DialLockGame";
import { WireMatchGame } from "./WireMatchGame";

/**
 * Props every registered minigame player must accept.
 * LocationView opens/closes via the registry — no hardcoded id branches.
 */
export interface ModalityPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  onWin: () => void;
  alreadyWon: boolean;
  /** Declarative minigame config from PackModality / JsonPackSpecial. */
  config?: Record<string, unknown>;
}

export interface ModalityRegistration {
  /** Modal / overlay component for this minigame id */
  Component: ComponentType<ModalityPlayerProps>;
  /** Whether the player already completed this modality (convention flags). */
  isAlreadyWon: (gameState: GameState) => boolean;
}

/**
 * Pack minigame id → player UI.
 * Register new modality players here (or via `registerModalityPlayer`) instead of
 * branching on minigameId inside LocationView.
 */
export const modalityRegistry: Record<string, ModalityRegistration> = {
  "pixel-invaders": {
    Component: PixelInvadersGame,
    isAlreadyWon: (s) => !!s.flags.beatArcade,
  },
  hacking: {
    Component: HackingGame,
    isAlreadyWon: (s) => !!s.flags.hackedDatabase,
  },
  "sequence-lock": {
    Component: SequenceLockGame,
    isAlreadyWon: (s) => !!s.flags.beatSequenceLock,
  },
  "slider-puzzle": {
    Component: SliderPuzzleGame,
    isAlreadyWon: (s) => !!s.flags.beatSliderPuzzle,
  },
  "dial-lock": {
    Component: DialLockGame,
    isAlreadyWon: (s) => !!s.flags.beatDialLock,
  },
  "wire-match": {
    Component: WireMatchGame,
    isAlreadyWon: (s) => !!s.flags.beatWireMatch,
  },
};

export function getModalityPlayer(
  minigameId: string
): ModalityRegistration | undefined {
  return modalityRegistry[minigameId];
}

export function registerModalityPlayer(
  minigameId: string,
  entry: ModalityRegistration
): void {
  modalityRegistry[minigameId] = entry;
}
