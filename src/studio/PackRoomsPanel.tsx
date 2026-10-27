import { useState, type RefObject } from "react";
import { Link } from "react-router-dom";
import { MUSIC_PRESET_IDS } from "@/authoring/audioPresets";
import type { JsonPackDocument } from "@/engine/jsonPack";
import { isMissingOrPlaceholderArt } from "@/engine/packDoctor";
import { addRoom, removeRoom, updateRoom } from "@/studio/packDraft";
import { toastError, toastOk } from "@/studio/toastError";
import type { DitherMode } from "@/studio/pixelate";
import {
  prepareRoomArt,
  ROOM_ART_HEIGHT,
  ROOM_ART_WIDTH,
} from "@/studio/roomArtPipeline";
import { studioTabHref } from "@/engine/validationHelp";

export interface PackRoomsPanelProps {
  doc: JsonPackDocument;
  roomId: string;
  onChange: (doc: JsonPackDocument) => void;
  /** List click — PackTool clears hotspot selection */
  onSelectRoom: (id: string) => void;
  /** Add / delete room — id only, no hotspot clear (matches prior PackTool) */
  onRoomIdChange: (id: string) => void;
  /** Owned by PackTool so Design Coach can scroll/focus art upload */
  roomArtFocusRef: RefObject<HTMLLabelElement | null>;
  roomArtRef: RefObject<HTMLInputElement | null>;
}

/**
 * Room list, fields, and art upload — extracted from PackTool.
 */
export function PackRoomsPanel({
  doc,
  roomId,
  onChange,
  onSelectRoom,
  onRoomIdChange,
  roomArtFocusRef,
  roomArtRef,
}: PackRoomsPanelProps) {
  const [newRoomName, setNewRoomName] = useState("Kitchen");
  const [roomArtPixelate, setRoomArtPixelate] = useState(false);
  const [roomArtDither, setRoomArtDither] =
    useState<DitherMode>("floyd-steinberg");
  const [roomArtFit, setRoomArtFit] = useState<"cover" | "contain">("cover");

  const room = doc.rooms[roomId];
  const roomIds = Object.keys(doc.rooms);

  const onRoomImage = async (file: File | null) => {
    if (!file || !room) return;
    try {
      const { dataUrl, width, height } = await prepareRoomArt(file, {
        fit: roomArtFit,
        pixelate: roomArtPixelate,
        dither: roomArtDither,
        useGamePalette: true,
      });
      onChange(updateRoom(doc, roomId, { image: dataUrl }));
      toastOk(
        "Room art ready",
        `${width}×${height}${
          roomArtPixelate ? " · pixelated" : ""
        } · embedded in draft`
      );
    } catch (e) {
      toastError("Image rejected", e);
    }
  };

  return (
    <section className="border border-game-border bg-game-ui/90 p-4 space-y-3">
      <h3 className="pixel-font text-sm text-accent">Rooms</h3>
      <div className="flex flex-wrap gap-2">
        {roomIds.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => onSelectRoom(id)}
            className={`pixel-font text-[10px] min-h-[36px] px-2 border ${
              id === roomId
                ? "border-accent text-accent"
                : "border-game-border"
            }`}
          >
            {doc.rooms[id]?.name || id}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1 bg-background border border-border px-2 py-2 min-h-[40px] text-xs"
          value={newRoomName}
          onChange={(e) => setNewRoomName(e.target.value)}
          placeholder="New room name"
        />
        <button
          type="button"
          onClick={() => {
            const next = addRoom(doc, newRoomName);
            const added = Object.keys(next.rooms).find((k) => !doc.rooms[k]);
            onChange(next);
            if (added) onRoomIdChange(added);
          }}
          className="pixel-font text-xs min-h-[40px] px-3 border-2 border-accent text-accent"
        >
          Add room
        </button>
      </div>
      {room && (
        <div className="space-y-2 border-t border-border pt-3">
          <label className="block text-xs space-y-1">
            <span className="text-muted-foreground">Display name</span>
            <input
              className="w-full bg-background border border-border px-2 py-2"
              value={room.name}
              onChange={(e) =>
                onChange(updateRoom(doc, roomId, { name: e.target.value }))
              }
            />
          </label>
          <label className="block text-xs space-y-1">
            <span className="text-muted-foreground">Music cue</span>
            <select
              className="w-full bg-background border border-border px-2 py-2"
              value={room.music || ""}
              onChange={(e) => {
                const music = e.target.value || undefined;
                let next = updateRoom(doc, roomId, { music });
                if (music && doc.audio) {
                  const musicMap = { ...doc.audio.music };
                  if (!musicMap[music]) {
                    musicMap[music] = (
                      MUSIC_PRESET_IDS as readonly string[]
                    ).includes(music)
                      ? music
                      : "ambient";
                  }
                  next = {
                    ...next,
                    audio: { ...doc.audio, music: musicMap },
                  };
                }
                onChange(next);
              }}
            >
              <option value="">— default —</option>
              {Object.keys(doc.audio?.music ?? { home: "calm" }).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              {MUSIC_PRESET_IDS.map((p) => (
                <option key={`p-${p}`} value={p}>
                  {p} (preset)
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs space-y-1">
            <span className="text-muted-foreground">Atmosphere</span>
            <select
              className="w-full bg-background border border-border px-2 py-2"
              value={room.particles || "none"}
              onChange={(e) => {
                const particles = e.target.value as
                  | "none"
                  | "rain"
                  | "dust"
                  | "sparks"
                  | "fog"
                  | "stars"
                  | "sparkle"
                  | "fireflies";
                onChange(
                  updateRoom(doc, roomId, {
                    particles: particles === "none" ? undefined : particles,
                  })
                );
              }}
            >
              <option value="none">None</option>
              <option value="stars">Stars (night)</option>
              <option value="sparkle">Sparkle</option>
              <option value="fireflies">Fireflies</option>
              <option value="rain">Rain</option>
              <option value="dust">Dust</option>
              <option value="sparks">Sparks</option>
              <option value="fog">Fog</option>
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-xs space-y-1">
              <span className="text-muted-foreground">Enter transition</span>
              <select
                className="w-full bg-background border border-border px-2 py-2"
                value={room.transitionIn?.kind || ""}
                onChange={(e) => {
                  const kind = e.target.value;
                  onChange(
                    updateRoom(doc, roomId, {
                      transitionIn: kind
                        ? {
                            kind: kind as NonNullable<
                              typeof room.transitionIn
                            >["kind"],
                            durationMs: room.transitionIn?.durationMs ?? 320,
                          }
                        : undefined,
                    })
                  );
                }}
              >
                <option value="">Pack default</option>
                <option value="fade">Fade</option>
                <option value="slide-left">Slide left</option>
                <option value="slide-right">Slide right</option>
                <option value="slide-up">Slide up</option>
                <option value="slide-down">Slide down</option>
                <option value="none">None</option>
              </select>
            </label>
            <label className="block text-xs space-y-1">
              <span className="text-muted-foreground">Leave transition</span>
              <select
                className="w-full bg-background border border-border px-2 py-2"
                value={room.transitionOut?.kind || ""}
                onChange={(e) => {
                  const kind = e.target.value;
                  onChange(
                    updateRoom(doc, roomId, {
                      transitionOut: kind
                        ? {
                            kind: kind as NonNullable<
                              typeof room.transitionOut
                            >["kind"],
                            durationMs:
                              room.transitionOut?.durationMs ?? 320,
                          }
                        : undefined,
                    })
                  );
                }}
              >
                <option value="">Pack default</option>
                <option value="fade">Fade</option>
                <option value="slide-left">Slide left</option>
                <option value="slide-right">Slide right</option>
                <option value="slide-up">Slide up</option>
                <option value="slide-down">Slide down</option>
                <option value="none">None</option>
              </select>
            </label>
          </div>
          <label ref={roomArtFocusRef} className="block text-xs space-y-1">
            <span className="text-muted-foreground">
              Room art → {ROOM_ART_WIDTH}×{ROOM_ART_HEIGHT}
            </span>
            <input
              ref={roomArtRef}
              type="file"
              accept="image/*"
              className="w-full text-xs"
              onChange={(e) => void onRoomImage(e.target.files?.[0] ?? null)}
            />
            <div className="flex flex-wrap gap-2 pt-1">
              <select
                className="bg-background border border-border px-1 py-1 text-[10px]"
                value={roomArtFit}
                onChange={(e) =>
                  setRoomArtFit(
                    e.target.value === "contain" ? "contain" : "cover"
                  )
                }
              >
                <option value="cover">Fit: cover (crop)</option>
                <option value="contain">Fit: contain (letterbox)</option>
              </select>
              <label className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                <input
                  type="checkbox"
                  checked={roomArtPixelate}
                  onChange={(e) => setRoomArtPixelate(e.target.checked)}
                />
                Pixelate + palette
              </label>
              {roomArtPixelate && (
                <select
                  className="bg-background border border-border px-1 py-1 text-[10px]"
                  value={roomArtDither}
                  onChange={(e) =>
                    setRoomArtDither(e.target.value as DitherMode)
                  }
                >
                  <option value="floyd-steinberg">Dither: FS</option>
                  <option value="ordered">Dither: ordered</option>
                  <option value="none">Dither: none</option>
                </select>
              )}
            </div>
            {isMissingOrPlaceholderArt(room?.image) ? (
              <span className="text-[10px] text-accent block">
                Missing art — stage shows a labeled placeholder until you
                upload.
              </span>
            ) : (
              <span className="text-[10px] text-muted-foreground block">
                Embedded at {ROOM_ART_WIDTH}×{ROOM_ART_HEIGHT}
              </span>
            )}
            <span className="text-[10px] text-muted-foreground block">
              Or{" "}
              <Link
                to={studioTabHref("pixels", { send: "room" })}
                className="text-primary underline"
              >
                generate in Pixels → Send to pack
              </Link>
              {" · "}
              free galleries below
            </span>
          </label>
          {roomIds.length > 1 && (
            <button
              type="button"
              className="text-xs text-destructive"
              onClick={() => {
                const next = removeRoom(doc, roomId);
                onChange(next);
                onRoomIdChange(next.startRoom);
              }}
            >
              Delete room
            </button>
          )}
        </div>
      )}
    </section>
  );
}
