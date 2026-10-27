import { useGame } from "@/contexts/GameContext";
import type { ActorInstance } from "@/engine";
import { resolveActorCostumeUrl } from "@/engine/actorArt";
import { mouthShapeClass } from "@/engine/speech";
import { safeCssColor } from "@/engine/security";
import { useMouthShape } from "@/hooks/useMouthShape";

interface ActorSpriteProps {
  actor: ActorInstance;
}

/**
 * Renders a runtime actor in room space (%).
 * Bitmap costumes (URL / data:) draw as images; otherwise CSS stand-ins.
 */
export const ActorSprite = ({ actor }: ActorSpriteProps) => {
  const { runtime, gameState, sayLines } = useGame();
  const def = runtime.getActorDef(actor.id);
  const isEgo = gameState.egoId === actor.id;
  const costumeKey = actor.costume ?? def?.defaultCostume;
  const animState = actor.animState ?? "idle";

  const costume = resolveActorCostumeUrl({
    costumeKey,
    sprite: def?.sprite,
    costumes: def?.costumes,
    animations: def?.animations,
    animState,
    facing: actor.facing,
    fallbackClass: isEgo ? "actor-ego" : "actor-npc",
  });

  const animClass =
    costume.kind === "css"
      ? runtime.resolveActorAnimClass(def?.animations, animState)
      : animState === "walk"
        ? "actor-bitmap-walk"
        : animState === "talk"
          ? "actor-bitmap-talk"
          : "actor-bitmap-idle";

  const room = runtime.getRoom(gameState.currentLocation);
  const depth = runtime.depthScaleAt(actor.x, actor.y, room?.walkboxes);

  const bubble = sayLines.find((l) => l.actorId === actor.id);
  const mouthShape = useMouthShape(bubble);
  const talkColor =
    safeCssColor(def?.talkColor) ?? (isEgo ? "#f5e6a8" : "#9fd4d8");
  /** Flip when sheet lacks this facing (L/R only or single frame). */
  const faceScaleX = costume.flipX ? -1 : 1;

  return (
    <div
      className={`absolute pointer-events-none actor-sprite ${
        costume.kind === "css" ? costume.className : "actor-bitmap"
      } ${animClass} ${mouthShapeClass(mouthShape)} ${isEgo ? "actor-is-ego" : ""}`}
      style={{
        left: `${actor.x}%`,
        top: `${actor.y}%`,
        transform: `translate(-50%, -90%) scale(${depth})`,
        zIndex: Math.round(actor.y * depth),
        transformOrigin: "bottom center",
      }}
      data-actor-id={actor.id}
      data-anim={animState}
      data-costume={costume.kind}
      data-mouth-shape={mouthShape}
      aria-label={def?.name ?? actor.id}
    >
      {bubble && !bubble.portrait && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 max-w-[140px] px-2 py-1 text-[10px] md:text-xs pixel-font text-center rounded border border-game-border bg-card/95 leading-tight"
          style={{ color: talkColor, borderColor: talkColor }}
        >
          {bubble.text}
        </div>
      )}
      <div style={{ transform: `scaleX(${faceScaleX})` }}>
        {costume.kind === "bitmap" ? (
          <img
            src={costume.url}
            alt=""
            className="actor-bitmap-img"
            draggable={false}
          />
        ) : (
          <div
            className="actor-body"
            style={{
              ["--actor-color" as string]: talkColor,
            }}
          />
        )}
      </div>
      <div className="actor-label pixel-font">
        {isEgo ? "" : def?.name ?? ""}
      </div>
    </div>
  );
};
