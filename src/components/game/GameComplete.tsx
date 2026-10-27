import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { GameState } from "@/engine";
import { useGame } from "@/contexts/GameContext";
import { getShellComplete } from "./shellUi";
import { CreditsList } from "./CreditsList";

interface GameCompleteProps {
  onRestart: () => void;
  gameState: GameState;
}

export const GameComplete = ({ onRestart, gameState }: GameCompleteProps) => {
  const { definition } = useGame();
  const ShellComplete = getShellComplete(definition);

  if (ShellComplete) {
    return (
      <Suspense fallback={null}>
        <ShellComplete gameState={gameState} onRestart={onRestart} />
      </Suspense>
    );
  }

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-card border-4 border-accent p-8 max-w-2xl mx-4 text-center space-y-6 animate-in fade-in zoom-in-95">
        <h1 className="pixel-font text-4xl text-accent animate-pulse">
          You win!
        </h1>

        <div className="space-y-3 text-foreground">
          <p className="text-lg">
            You finished{" "}
            <span className="text-accent font-bold">{definition.title}</span>.
          </p>
          <p className="text-sm text-muted-foreground">Thanks for playing!</p>
        </div>

        {definition.credits && definition.credits.length > 0 && (
          <section className="text-left text-xs text-muted-foreground space-y-1 max-h-40 overflow-y-auto border-t border-border pt-3">
            <h2 className="pixel-font text-[10px] text-accent uppercase tracking-widest">
              Credits
            </h2>
            <CreditsList credits={definition.credits} />
          </section>
        )}

        <Button
          onClick={onRestart}
          size="lg"
          className="pixel-font bg-accent hover:bg-accent/80"
        >
          Restart
        </Button>
      </div>
    </div>
  );
};
