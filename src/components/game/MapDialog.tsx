import { useGame } from "@/contexts/GameContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Map, MapPin, Lock, ArrowRight, CloudFog } from "lucide-react";
import { useMemo, useState } from "react";
import { soundFX } from "@/utils/soundEffects";
import {
  getMapRoomStatus,
  resolveMapTravelPolicy,
} from "@/engine/mapFog";
import type { PlayDialogChromeProps } from "@/components/game/playDialogChrome";

/**
 * World map — fast travel ALWAYS goes through travelToRoom → runtime.travel
 * so onExit / onEnter / scripts / transitions stay consistent.
 * Optional mapFog shrouds unrevealed rooms until visit / story flags.
 */
export const MapDialog = ({
  open: openProp,
  onOpenChange,
  hideTrigger = false,
}: PlayDialogChromeProps = {}) => {
  const {
    gameState,
    travelToRoom,
    travelThroughExit,
    inputLocked,
    definition,
    runtime,
    showMessage,
  } = useGame();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const controlled = openProp !== undefined;
  const open = controlled ? openProp : uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;

  const policy = useMemo(
    () => resolveMapTravelPolicy(definition),
    [definition]
  );

  const fogOn = !!definition.mapFog?.enabled;

  const locationGroups = useMemo(() => {
    if (definition.mapGroups) return definition.mapGroups;
    return { Locations: Object.keys(definition.rooms) };
  }, [definition]);

  const currentExits = useMemo(() => {
    const room = runtime.getRoom(gameState.currentLocation);
    return (room?.exits ?? []).filter((exit) => {
      const blocked = exit.blocked?.(gameState);
      if (blocked && exit.showWhenBlocked === false) return false;
      return true;
    });
  }, [runtime, gameState]);

  if (!policy.enabled) return null;

  const handleTeleport = (locationId: string) => {
    if (inputLocked) return;
    const status = getMapRoomStatus(definition, gameState, locationId);
    if (!status.canTravel) {
      if (status.travelBlockedReason) {
        showMessage(status.travelBlockedReason);
        soundFX.error();
      }
      return;
    }
    const ok = travelToRoom(locationId);
    if (ok) {
      soundFX.doorOpen();
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="pixel-font bg-secondary/50 hover:bg-accent/20 min-h-[44px]"
          >
            <Map className="w-4 h-4 mr-2" />
            Map
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-3xl bg-card border-2 border-game-border max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="pixel-font text-accent text-xl">
            World Map
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {fogOn
              ? "Fog lifts as you explore and the story advances"
              : policy.requireVisited
                ? "Tap a visited location to fast travel"
                : "Tap a location to travel"}
          </p>
        </DialogHeader>

        {currentExits.length > 0 && (
          <div className="mb-4 p-3 border border-game-border/60 bg-secondary/20 rounded">
            <p className="pixel-font text-xs text-primary mb-2">
              From here
            </p>
            <div className="flex flex-wrap gap-2">
              {currentExits.map((exit) => {
                const dest = runtime.getRoom(exit.to);
                const blocked = !!exit.blocked?.(gameState);
                const label =
                  blocked && exit.lockedLabel ? exit.lockedLabel : exit.label;
                return (
                  <button
                    key={`${exit.direction}-${exit.to}`}
                    type="button"
                    disabled={inputLocked}
                    onClick={() => {
                      if (inputLocked) return;
                      if (blocked) {
                        showMessage(
                          exit.blockedMessage ??
                            "You can't go that way right now."
                        );
                        soundFX.error();
                        return;
                      }
                      const ok = travelThroughExit(exit);
                      if (ok) {
                        soundFX.doorOpen();
                        setOpen(false);
                      } else {
                        soundFX.error();
                      }
                    }}
                    className={`pixel-font text-xs min-h-[40px] px-3 border border-border bg-game-ui/80 hover:bg-accent/15 disabled:opacity-40 inline-flex items-center gap-1.5 ${
                      blocked ? "opacity-70" : ""
                    }`}
                  >
                    <ArrowRight className="w-3 h-3" />
                    {label}
                    {!blocked && dest ? ` → ${dest.name}` : ""}
                    {blocked ? " (sealed)" : ""}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <ScrollArea className="h-[min(420px,50vh)] pr-4">
          {Object.entries(locationGroups).map(([groupName, locationIds]) => (
            <div key={groupName} className="mb-6">
              <h3 className="pixel-font text-primary text-lg mb-3 border-b border-border pb-2">
                {groupName}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {locationIds.map((locationId) => {
                  const location = runtime.getRoom(locationId);
                  if (!location) return null;

                  const status = getMapRoomStatus(
                    definition,
                    gameState,
                    locationId
                  );
                  const isCurrent =
                    locationId === gameState.currentLocation;
                  const fogged = status.visibility === "fogged";
                  const travelOk = status.canTravel;
                  const sealed =
                    status.visibility === "known" &&
                    !travelOk &&
                    !isCurrent;

                  return (
                    <button
                      key={locationId}
                      type="button"
                      onClick={() => handleTeleport(locationId)}
                      disabled={inputLocked || isCurrent}
                      className={`p-3 min-h-[56px] border rounded text-left transition-all touch-manipulation ${
                        isCurrent
                          ? "bg-accent/20 border-accent"
                          : fogged
                            ? "bg-muted/20 border-border/40 opacity-80 cursor-default"
                            : sealed
                              ? "bg-secondary/20 border-border/70 opacity-80"
                              : travelOk
                                ? "bg-secondary/30 border-border hover:bg-secondary/50 active:bg-accent/10"
                                : "bg-muted/10 border-border/50 opacity-40 cursor-not-allowed"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {fogged ? (
                          <CloudFog className="w-4 h-4 shrink-0 mt-0.5 text-muted-foreground" />
                        ) : sealed || (!travelOk && !isCurrent) ? (
                          <Lock className="w-4 h-4 shrink-0 mt-0.5 text-muted-foreground" />
                        ) : (
                          <MapPin
                            className={`w-4 h-4 shrink-0 mt-0.5 ${
                              isCurrent ? "text-accent" : "text-primary"
                            }`}
                          />
                        )}
                        <div>
                          <div
                            className={`pixel-font text-sm ${
                              isCurrent
                                ? "text-accent"
                                : fogged
                                  ? "text-muted-foreground tracking-widest"
                                  : travelOk
                                    ? "text-foreground"
                                    : "text-muted-foreground"
                            }`}
                          >
                            {fogged
                              ? "???"
                              : location.name}
                            {isCurrent && " (Current)"}
                            {sealed && " (sealed)"}
                          </div>
                          {fogged ? (
                            <div className="text-xs text-muted-foreground mt-1">
                              Shrouded in fog
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {sealed && status.travelBlockedReason
                                ? status.travelBlockedReason
                                : location.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
