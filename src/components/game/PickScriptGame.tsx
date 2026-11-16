import type { ReactNode } from "react";
import type { GameDefinition } from "@/engine";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { DebugProvider } from "@/contexts/DebugContext";
import { GameProvider } from "@/contexts/GameContext";
import { MusicProvider } from "@/contexts/MusicContext";
import { AdventurePlaySurface } from "./AdventurePlaySurface";

export interface PickScriptGameProps {
  /** A compiled game — `createGameFromJson(pack)` or a TypeScript pack */
  definition: GameDefinition;
  /** Shows a home control and is called when the player uses it */
  onHome?: () => void;
  /** Label for the home control (default "Games") */
  homeLabel?: string;
  /** Called when the player restarts after finishing (default: reload page) */
  onRestart?: () => void;
  /** Extra UI rendered inside the game's providers (can call `useGame()`) */
  children?: ReactNode;
}

/**
 * A complete, playable game in one component: engine runtime, audio, the
 * full play UI (phone / tablet / desktop layouts), saves and toasts.
 *
 *   import { PickScriptGame, createGameFromJson } from "@portable-adventure/engine";
 *   import "@portable-adventure/engine/style.css";
 *
 *   <PickScriptGame definition={createGameFromJson(pack)} />
 *
 * Remount (change `key`) to switch games.
 */
export function PickScriptGame({
  definition,
  onHome,
  homeLabel,
  onRestart,
  children,
}: PickScriptGameProps) {
  return (
    <TooltipProvider>
      <DebugProvider>
        <MusicProvider initialLocation={definition.startRoom}>
          <GameProvider definition={definition}>
            <AdventurePlaySurface
              variant="full"
              onHome={onHome}
              homeLabel={homeLabel}
              onRestart={onRestart}
            />
            {children}
          </GameProvider>
        </MusicProvider>
        <Toaster />
        <Sonner />
      </DebugProvider>
    </TooltipProvider>
  );
}
