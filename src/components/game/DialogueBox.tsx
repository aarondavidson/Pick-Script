import { useState, useEffect } from "react";
import {
  type DialogueTree,
  type GameState,
  applyDialogueOnView,
  dialogueChoiceTakenPatch,
  viewDialogueNode,
  setActorAnimState,
} from "@/engine";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { soundFX } from "@/utils/soundEffects";
import { safeCssColor } from "@/engine/security";
import { useGame } from "@/contexts/GameContext";
import {
  getCaptionsEnabled,
  getTextScale,
  textScaleClass,
} from "@/utils/playPrefs";

interface DialogueBoxProps {
  npcName: string;
  dialogueTree: DialogueTree;
  gameState: GameState;
  /** Actor talk color (SCUMM talkColor) */
  talkColor?: string;
  /** Controllable / NPC actor id for talk anim */
  actorId?: string;
  /** Stable key for once-per-tree dialogue flags */
  treeKey?: string;
  onChoice: (newState: Partial<GameState>) => void;
  onClose: () => void;
}

export const DialogueBox = ({
  npcName,
  dialogueTree,
  gameState,
  talkColor,
  actorId,
  treeKey = "default",
  onChoice,
  onClose,
}: DialogueBoxProps) => {
  const { t, playVoice } = useGame();
  const [currentNodeId, setCurrentNodeId] = useState(dialogueTree.startNode);
  const [captionsOn] = useState(() => getCaptionsEnabled());
  const [textScale] = useState(() => getTextScale());
  const color = safeCssColor(talkColor);

  const view = viewDialogueNode(
    dialogueTree,
    currentNodeId,
    gameState,
    treeKey
  );

  useEffect(() => {
    if (!view?.node) return;
    const patch = applyDialogueOnView(view.node, gameState);
    if (patch && Object.keys(patch).length > 0) {
      onChoice(patch);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per node
  }, [currentNodeId]);

  // Talk anim + VO for current node
  useEffect(() => {
    if (!view?.node) return;
    if (actorId) {
      onChoice(setActorAnimState(gameState, actorId, "talk"));
    }
    if (view.node.voiceKey) {
      playVoice(view.node.voiceKey);
    }
    return () => {
      if (actorId) {
        onChoice(setActorAnimState(gameState, actorId, "idle"));
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentNodeId, actorId, view?.node?.voiceKey]);

  if (!view) {
    onClose();
    return null;
  }

  const availableChoices = view.choices;
  const fallbackText = view.text;
  const dialogueText = view.node.lineKey
    ? t(view.node.lineKey, fallbackText)
    : fallbackText;

  const handleChoice = (
    choice: (typeof availableChoices)[0],
    index: number
  ) => {
    soundFX.click();
    const rawIndex =
      view.node.choices?.findIndex(
        (c) =>
          c === choice ||
          (c.text === choice.text && c.nextNode === choice.nextNode)
      ) ?? index;
    const patch = dialogueChoiceTakenPatch(
      choice,
      rawIndex >= 0 ? rawIndex : index,
      gameState,
      treeKey
    );
    if (Object.keys(patch).length > 0) {
      onChoice(patch);
    }

    if (choice.nextNode === "END") {
      if (actorId) {
        onChoice(setActorAnimState(gameState, actorId, "idle"));
      }
      onClose();
    } else {
      setCurrentNodeId(choice.nextNode);
    }
  };

  const handleClose = () => {
    soundFX.click();
    if (actorId) {
      onChoice(setActorAnimState(gameState, actorId, "idle"));
    }
    onClose();
  };

  const bodyClass = `pixel-font leading-relaxed ${textScaleClass(textScale)}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-2 md:p-4 bg-black/60 animate-in fade-in safe-all"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div className="relative w-full max-w-2xl bg-game-ui border-4 border-primary rounded-lg shadow-2xl animate-in zoom-in-95 max-h-[80vh] overflow-y-auto safe-bottom">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-10 w-10 md:h-8 md:w-8 hover:bg-destructive/20 touch-manipulation z-10"
          onClick={handleClose}
        >
          <X className="h-5 w-5" />
        </Button>

        <div className="p-4 md:p-6">
          <div className="mb-4">
            <h3
              className="pixel-font text-lg md:text-xl mb-2"
              style={{ color: color || undefined }}
            >
              <span className={color ? "" : "text-accent"}>{npcName}</span>
            </h3>
            {captionsOn && (
              <div
                className="bg-background/50 border-2 rounded p-3 md:p-4 min-h-[80px] md:min-h-[100px]"
                style={{ borderColor: color || undefined }}
              >
                <p className={bodyClass} style={{ color: color || undefined }}>
                  <span className={color ? "" : "text-foreground"}>
                    {dialogueText}
                  </span>
                </p>
              </div>
            )}
            {!captionsOn && (
              <p className="text-[10px] text-muted-foreground pixel-font">
                Captions off — enable in Settings
              </p>
            )}
          </div>

          {availableChoices.length > 0 ? (
            <div className="space-y-2">
              {availableChoices.map((choice, index) => {
                const choiceKey = choice.choiceId;
                const label =
                  choiceKey && choiceKey.startsWith("dlg.")
                    ? t(choiceKey, choice.text)
                    : choice.text;
                return (
                  <Button
                    key={`${choice.choiceId || choice.text}-${index}`}
                    variant="outline"
                    className="w-full justify-start pixel-font text-left h-auto py-3 md:py-3 min-h-[48px] hover:bg-primary/20 hover:border-primary active:bg-primary/30 transition-all touch-manipulation"
                    onClick={() => handleChoice(choice, index)}
                  >
                    <span className="text-primary mr-2">▶</span>
                    <span className={textScaleClass(textScale)}>{label}</span>
                  </Button>
                );
              })}
            </div>
          ) : (
            <Button
              variant="default"
              className="w-full pixel-font min-h-[48px] touch-manipulation"
              onClick={handleClose}
            >
              [Close]
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
