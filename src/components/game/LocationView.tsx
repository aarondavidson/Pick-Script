import { useGame } from "@/contexts/GameContext";
import { Hotspot } from "./Hotspot";
import { ActorSprite } from "./ActorSprite";
import { DialogueBox } from "./DialogueBox";
import { AtmosphereLayers } from "./AtmosphereLayers";
import { VerbCoin } from "./VerbCoin";
import { useEffect, useMemo, useRef, useState } from "react";
import { type DialogueTree, type Hotspot as HotspotType } from "@/engine";
import { ComicReader } from "./ComicReader";
import { HotspotDebugOverlay } from "./HotspotDebugOverlay";
import { useHotspotOverrides } from "@/hooks/useHotspotOverrides";
import { useDebug } from "@/contexts/DebugContext";
import { isPhoneLayout, usePlayLayout } from "@/hooks/usePlayLayout";
import { SentenceLine } from "./SentenceLine";
import {
  StageScaleProvider,
  useMeasuredStageScale,
} from "@/hooks/useStageScale";
import { cssPlayUrlValue } from "@/engine/security";
import { lookupComic } from "@/engine/specials";
import { pixelBackgroundStyle } from "@/engine/script";
import { getModalityPlayer } from "./modalityRegistry";
import { resolveMinigameWinFlag } from "@/engine/jsonPackSpecials";

export const LocationView = () => {
  const {
    gameState,
    updateGameState,
    runtime,
    definition,
    pendingModality,
    clearModality,
    completeModality,
    showMessage,
    walkEgoTo,
    inputLocked,
    verbMode,
    selectedVerb,
    selectedCombineItem,
  } = useGame();
  const { debugMode } = useDebug();
  const location = runtime.getRoom(gameState.currentLocation);
  const [activeDialogue, setActiveDialogue] = useState<{
    npcName: string;
    tree: DialogueTree;
    talkColor?: string;
    actorId?: string;
    treeKey: string;
  } | null>(null);
  const [comicId, setComicId] = useState<string | null>(null);
  const [activeMinigameId, setActiveMinigameId] = useState<string | null>(null);
  const [activeMinigameConfig, setActiveMinigameConfig] = useState<
    Record<string, unknown> | undefined
  >(undefined);
  const [verbCoin, setVerbCoin] = useState<{
    hotspot: HotspotType;
    x: number;
    y: number;
    onDialogueOpen?: () => void;
  } | null>(null);
  /** Hold empty floor to reveal all hotspots (mobile / touch) */
  const [revealHotspots, setRevealHotspots] = useState(false);
  const holdTimerRef = useRef<number | null>(null);
  /** True if this pointer gesture became a hold-reveal (suppress walk on up) */
  const heldRevealRef = useRef(false);
  const layout = usePlayLayout();
  const phone = isPhoneLayout(layout);
  const [stageEl, setStageEl] = useState<HTMLDivElement | null>(null);
  const stageScale = useMeasuredStageScale(stageEl);

  useEffect(() => {
    return () => {
      if (holdTimerRef.current != null) {
        window.clearTimeout(holdTimerRef.current);
      }
    };
  }, []);

  const { applyOverrides } = useHotspotOverrides(gameState.currentLocation);

  const roomSize = runtime.getRoomSize(location);
  const camTranslate = runtime.cameraToTranslate(gameState.camera, roomSize);
  const roomActors = useMemo(
    () => (location ? runtime.actorsInRoom(gameState, location.id) : []),
    [runtime, gameState, location],
  );

  // Open pack modalities from specials via the modality registry
  useEffect(() => {
    if (!pendingModality) return;
    if (pendingModality.type === "comic") {
      setComicId(pendingModality.comicId);
    } else if (pendingModality.type === "minigame") {
      const entry = getModalityPlayer(pendingModality.minigameId);
      if (entry) {
        setActiveMinigameId(pendingModality.minigameId);
        setActiveMinigameConfig(pendingModality.config);
      } else {
        showMessage(
          `Unknown minigame “${pendingModality.minigameId}” — no player registered.`,
        );
      }
    }
    clearModality();
  }, [pendingModality, clearModality, showMessage]);

  if (!location) {
    return <div>Location not found</div>;
  }

  const baseHotspots = runtime.getVisibleHotspots(
    gameState.currentLocation,
    gameState,
  );
  const visibleHotspots = debugMode
    ? applyOverrides(baseHotspots)
    : baseHotspots;

  const handleDialogueOpen = (
    hotspotName: string,
    tree: DialogueTree,
    actorId?: string,
    hotspotId?: string,
  ) => {
    const actorDef = actorId ? runtime.getActorDef(actorId) : null;
    setActiveDialogue({
      npcName: actorDef?.name ?? hotspotName,
      tree,
      talkColor: actorDef?.talkColor,
      actorId,
      treeKey: hotspotId || actorId || hotspotName,
    });
  };

  const comic = lookupComic(definition.comics, comicId);

  const stageClass =
    layout === "desktop"
      ? "play-stage play-stage--desktop border-2"
      : layout === "phone-landscape"
        ? "play-stage play-stage--landscape"
        : layout === "phone-portrait"
          ? "play-stage border-y"
          : "play-stage border-2";

  const pctFromClient = (clientX: number, clientY: number, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    // Convert viewport click → room % accounting for camera translate + room size
    const localX = ((clientX - r.left) / r.width) * 100;
    const localY = ((clientY - r.top) / r.height) * 100;
    const roomX = (localX - camTranslate.x) * (100 / roomSize.width);
    const roomY = (localY - camTranslate.y) * (100 / roomSize.height);
    return { x: roomX, y: roomY };
  };

  const clearHoldReveal = () => {
    if (holdTimerRef.current != null) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setRevealHotspots(false);
  };

  const handleFloorPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (inputLocked || debugMode) return;
    const target = e.target as HTMLElement;
    if (
      target.closest("[data-hotspot]") ||
      target.closest("[data-verb-coin]")
    ) {
      return;
    }
    if (selectedVerb || selectedCombineItem) return;
    heldRevealRef.current = false;
    if (holdTimerRef.current != null) {
      window.clearTimeout(holdTimerRef.current);
    }
    holdTimerRef.current = window.setTimeout(() => {
      heldRevealRef.current = true;
      setRevealHotspots(true);
    }, 380);
  };

  const handleFloorPointer = (
    e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
  ) => {
    if (inputLocked || debugMode) return;
    const wasReveal = heldRevealRef.current;
    clearHoldReveal();
    heldRevealRef.current = false;
    if (verbCoin) {
      setVerbCoin(null);
      return;
    }
    // Don't walk when a verb/item is armed — hotspots own that click
    if (selectedVerb || selectedCombineItem) return;
    // After hold-reveal, lift without walking
    if (wasReveal) return;

    const target = e.target as HTMLElement;
    if (
      target.closest("[data-hotspot]") ||
      target.closest("[data-verb-coin]")
    ) {
      return;
    }

    const clientX =
      "touches" in e
        ? e.changedTouches[0]?.clientX
        : (e as React.MouseEvent).clientX;
    const clientY =
      "touches" in e
        ? e.changedTouches[0]?.clientY
        : (e as React.MouseEvent).clientY;
    if (clientX == null || clientY == null) return;

    const roomEl = e.currentTarget;
    const { x, y } = pctFromClient(clientX, clientY, roomEl);
    walkEgoTo(x, y);
  };

  const modalityEntry = activeMinigameId
    ? getModalityPlayer(activeMinigameId)
    : undefined;
  const ModalityPlayer = modalityEntry?.Component;
  const modalityWinFlag = activeMinigameId
    ? resolveMinigameWinFlag(activeMinigameId, activeMinigameConfig)
    : undefined;
  const modalityAlreadyWon = modalityEntry
    ? modalityWinFlag
      ? !!gameState.flags[modalityWinFlag]
      : modalityEntry.isAlreadyWon(gameState)
    : false;

  return (
    <>
      <div
        className={`relative bg-card border-game-border overflow-hidden touch-none ${stageClass}`}
        ref={setStageEl}
        data-testid="play-stage"
      >
        <div
          className="absolute origin-top-left"
          style={{
            width: `${roomSize.width}%`,
            height: `${roomSize.height}%`,
            transform: `translate(${camTranslate.x}%, ${camTranslate.y}%) scale(${camTranslate.zoom ?? 1})`,
            willChange: "transform",
          }}
          onClick={handleFloorPointer}
          onTouchEnd={handleFloorPointer}
          onPointerDown={handleFloorPointerDown}
          onPointerUp={clearHoldReveal}
          onPointerCancel={clearHoldReveal}
          onPointerLeave={clearHoldReveal}
        >
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: cssPlayUrlValue(location.image),
              ...pixelBackgroundStyle({
                crisp: !!definition.presentation?.crispPixels,
              }),
            }}
          />

          <AtmosphereLayers
            room={location}
            camTranslate={camTranslate}
            layer="behind"
          />

          {visibleHotspots.map((hotspot) => (
            <Hotspot
              key={hotspot.id}
              hotspot={hotspot}
              forceReveal={revealHotspots}
              onDialogueOpen={
                hotspot.dialogue
                  ? () =>
                      handleDialogueOpen(
                        hotspot.name,
                        hotspot.dialogue!,
                        hotspot.actorId,
                        hotspot.id,
                      )
                  : undefined
              }
              onVerbCoinRequest={
                verbMode === "coin"
                  ? (hs, openDialogue) => {
                      setVerbCoin({
                        hotspot: hs,
                        x: hs.x + hs.width / 2,
                        y: hs.y + hs.height / 2,
                        onDialogueOpen: openDialogue,
                      });
                    }
                  : undefined
              }
            />
          ))}

          <StageScaleProvider value={stageScale}>
            {roomActors.map((actor) => (
            <ActorSprite key={actor.id} actor={actor} />
          ))}
          </StageScaleProvider>

          <AtmosphereLayers
            room={location}
            camTranslate={camTranslate}
            layer="front"
          />

          {verbCoin && (
            <div data-verb-coin>
              <VerbCoin
                hotspot={verbCoin.hotspot}
                x={verbCoin.x}
                y={verbCoin.y}
                onDialogueOpen={verbCoin.onDialogueOpen}
                onClose={() => setVerbCoin(null)}
              />
            </div>
          )}

          <HotspotDebugOverlay
            hotspots={visibleHotspots}
            locationId={gameState.currentLocation}
          />
        </div>

        {/* Desktop / preview: caption over the scene. Phones keep the scene
          clear — portrait shows the caption underneath, landscape a name chip. */}
        {!phone && (
          <div className="absolute bottom-0 left-0 right-0 bg-game-ui/90 border-t-2 border-game-border p-2 md:p-3 pointer-events-none z-10">
            <h2 className="pixel-font text-accent text-sm md:text-lg">
              {location.name}
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground line-clamp-2">
              {location.description}
            </p>
          </div>
        )}
        {layout === "phone-landscape" && (
          <h2 className="absolute top-1 left-1 z-10 pointer-events-none pixel-font text-accent text-[11px] bg-game-ui/80 border border-game-border px-1.5 py-0.5 max-w-[60%] truncate">
            {location.name}
          </h2>
        )}
        {phone && <SentenceLine overlay />}

        {activeDialogue && (
          <DialogueBox
            npcName={activeDialogue.npcName}
            dialogueTree={activeDialogue.tree}
            gameState={gameState}
            talkColor={activeDialogue.talkColor}
            actorId={activeDialogue.actorId}
            treeKey={activeDialogue.treeKey}
            onChoice={(newState) => updateGameState(newState)}
            onClose={() => setActiveDialogue(null)}
          />
        )}

        {comic && (
          <ComicReader
            isOpen={true}
            onClose={() => setComicId(null)}
            comic={comic}
          />
        )}

        {ModalityPlayer && activeMinigameId && modalityEntry && (
          <ModalityPlayer
            isOpen={true}
            onClose={() => {
              setActiveMinigameId(null);
              setActiveMinigameConfig(undefined);
            }}
            onWin={() =>
              completeModality(activeMinigameId, activeMinigameConfig)
            }
            alreadyWon={modalityAlreadyWon}
            config={activeMinigameConfig}
          />
        )}
      </div>
      {layout === "phone-portrait" && (
        <div className="px-2 pt-1.5">
          <h2 className="pixel-font text-accent text-sm leading-tight">
            {location.name}
          </h2>
          <p className="text-xs text-muted-foreground leading-snug line-clamp-2">
            {location.description}
          </p>
        </div>
      )}
    </>
  );
};
