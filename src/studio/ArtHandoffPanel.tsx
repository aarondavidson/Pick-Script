import { useEffect, useRef, useState } from "react";
import type { JsonPackDocument } from "@/engine/jsonPack";
import { isMissingOrPlaceholderArt } from "@/engine/packDoctor";
import { suggestId } from "@/authoring/codegen";
import {
  ART_HANDOFF_STARTER_BLURB,
  artHandoffItemLabel,
  guessArtHandoffIds,
  IMAGE_GEN_STARTER_PATH,
  upsertItemIcon,
} from "@/studio/artHandoff";
import { fileToDataUrl, updateRoom } from "@/studio/packDraft";
import { fileToShrunkDataUrl } from "@/studio/imageShrink";
import {
  prepareRoomArt,
  ROOM_ART_HEIGHT,
  ROOM_ART_WIDTH,
} from "@/studio/roomArtPipeline";
import { toastError, toastOk } from "@/studio/toastError";

export interface ArtHandoffPanelProps {
  doc: JsonPackDocument;
  roomId: string;
  onChange: (doc: JsonPackDocument) => void;
  /** Optional: scroll/focus room art in PackRoomsPanel after assign */
  onAssignedRoom?: () => void;
}

function ChecklistMark({ done }: { done: boolean }) {
  return (
    <span
      className={`pixel-font text-[10px] ${
        done ? "text-primary" : "text-accent"
      }`}
    >
      <span className="sr-only">{done ? "Done: " : "Todo: "}</span>
      <span aria-hidden>{done ? "✓" : "○"}</span>
    </span>
  );
}

/**
 * Image-gen → Studio handoff: assign room / key / reward art to the pack draft.
 */
export function ArtHandoffPanel({
  doc,
  roomId,
  onChange,
  onAssignedRoom,
}: ArtHandoffPanelProps) {
  const roomRef = useRef<HTMLInputElement>(null);
  const keyRef = useRef<HTMLInputElement>(null);
  const rewardRef = useRef<HTMLInputElement>(null);
  const guessed = guessArtHandoffIds(doc);
  const [keyId, setKeyId] = useState(guessed.keyId);
  const [rewardId, setRewardId] = useState(guessed.rewardId);
  const syncedForDoc = useRef<string | null>(null);

  useEffect(() => {
    const sig = `${doc.id}:${Object.keys(doc.items ?? {}).sort().join(",")}`;
    if (syncedForDoc.current === sig) return;
    syncedForDoc.current = sig;
    const next = guessArtHandoffIds(doc);
    setKeyId(next.keyId);
    setRewardId(next.rewardId);
  }, [doc]);

  const room = doc.rooms[roomId];
  const keyItem = doc.items?.[suggestId(keyId, "item")];
  const rewardItem = doc.items?.[suggestId(rewardId, "item")];
  const roomOk = room && !isMissingOrPlaceholderArt(room.image);
  const keyOk = !!keyItem?.icon;
  const rewardOk = !!rewardItem?.icon;
  const roomCount = Object.keys(doc.rooms).length;

  const assignRoom = async (file: File | null) => {
    if (!file || !room) return;
    try {
      const { dataUrl, width, height } = await prepareRoomArt(file, {
        fit: "cover",
        pixelate: false,
      });
      onChange(updateRoom(doc, roomId, { image: dataUrl }));
      toastOk("Start room art", `${width}×${height} → ${room.name || roomId}`);
      onAssignedRoom?.();
    } catch (e) {
      toastError("Room art rejected", e);
    }
  };

  const assignItem = async (
    role: "key" | "reward",
    file: File | null
  ) => {
    if (!file) return;
    const rawId = role === "key" ? keyId : rewardId;
    const existing = doc.items?.[suggestId(rawId, "item")];
    const name = artHandoffItemLabel(role, rawId, existing?.name);
    try {
      let dataUrl: string;
      try {
        dataUrl = await fileToShrunkDataUrl(file, {
          maxEdge: 256,
          preserveAlpha: true,
        });
      } catch {
        dataUrl = await fileToDataUrl(file);
      }
      onChange(
        upsertItemIcon(doc, {
          id: rawId,
          name,
          description:
            existing?.description ||
            (role === "key"
              ? "Opens the locked thing"
              : "The prize — end the loop"),
          icon: dataUrl,
        })
      );
      toastOk(
        role === "key" ? "Key icon assigned" : "Reward icon assigned",
        suggestId(rawId, "item")
      );
    } catch (e) {
      toastError("Item icon rejected", e);
    }
  };

  const copyBlurb = async () => {
    try {
      await navigator.clipboard.writeText(ART_HANDOFF_STARTER_BLURB);
      toastOk("Copied", IMAGE_GEN_STARTER_PATH);
    } catch (e) {
      toastError("Copy failed", e);
    }
  };

  if (!room) {
    return (
      <section
        id="art-handoff"
        className="border border-game-border bg-game-ui/90 p-4 space-y-3"
        aria-label="Art handoff from image gen"
      >
        <h3 className="pixel-font text-sm text-accent">Art handoff</h3>
        <p className="text-xs text-muted-foreground leading-relaxed" role="status">
          No room selected — pick a start room in the Rooms panel, or create a
          pack with the New game wizard first.
        </p>
      </section>
    );
  }

  return (
    <section
      id="art-handoff"
      className="border border-game-border bg-game-ui/90 p-4 space-y-3"
      aria-label="Art handoff from image gen"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="pixel-font text-sm text-accent">Art handoff</h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Drop AI exports into the draft — sizes match{" "}
            <code className="text-accent text-[11px]">
              {IMAGE_GEN_STARTER_PATH}
            </code>
            . Defaults follow{" "}
            <code className="text-accent text-[11px]">short-mystery</code> (
            <code className="text-accent text-[11px]">harbor_key</code>
            {roomCount > 1 ? ` · ${roomCount} rooms` : ""}).
          </p>
        </div>
        <button
          type="button"
          onClick={() => void copyBlurb()}
          className="pixel-font text-[10px] min-h-[36px] px-3 border border-game-border text-muted-foreground hover:text-accent"
        >
          Copy prompt blurb
        </button>
      </div>

      <ul className="text-xs text-muted-foreground space-y-1.5 border border-border/60 px-3 py-2">
        <li className="flex flex-wrap items-center gap-2">
          <ChecklistMark done={!!roomOk} />
          Room {ROOM_ART_WIDTH}×{ROOM_ART_HEIGHT}
          <span className="text-[10px] opacity-80">
            ({room.name || roomId})
          </span>
        </li>
        <li className="flex flex-wrap items-center gap-2">
          <ChecklistMark done={keyOk} />
          Key item 256×256
          <span className="text-[10px] opacity-80">({keyId})</span>
        </li>
        <li className="flex flex-wrap items-center gap-2">
          <ChecklistMark done={rewardOk} />
          Reward item 256×256 (optional)
          <span className="text-[10px] opacity-80">({rewardId})</span>
        </li>
      </ul>

      <div className="grid sm:grid-cols-3 gap-2">
        <div className="space-y-1">
          <button
            type="button"
            className="w-full pixel-font text-[10px] min-h-[40px] px-2 border-2 border-accent text-accent"
            onClick={() => roomRef.current?.click()}
            aria-controls="art-handoff-room-file"
          >
            Assign → start room
          </button>
          <input
            id="art-handoff-room-file"
            ref={roomRef}
            type="file"
            accept="image/*"
            className="sr-only"
            aria-label={`Assign room art for ${room.name || roomId}`}
            onChange={(e) => {
              void assignRoom(e.target.files?.[0] ?? null);
              e.target.value = "";
            }}
          />
        </div>
        <div className="space-y-1">
          <label
            className="block text-[10px] text-muted-foreground"
            htmlFor="art-handoff-key-id"
          >
            Key id
            <input
              id="art-handoff-key-id"
              className="mt-0.5 w-full bg-background border border-border px-2 py-1 text-xs min-h-[32px]"
              value={keyId}
              onChange={(e) => setKeyId(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="w-full pixel-font text-[10px] min-h-[40px] px-2 border border-accent text-accent"
            onClick={() => keyRef.current?.click()}
            aria-controls="art-handoff-key-file"
          >
            Assign → key icon
          </button>
          <input
            id="art-handoff-key-file"
            ref={keyRef}
            type="file"
            accept="image/*"
            className="sr-only"
            aria-label={`Assign key icon for item ${keyId}`}
            onChange={(e) => {
              void assignItem("key", e.target.files?.[0] ?? null);
              e.target.value = "";
            }}
          />
        </div>
        <div className="space-y-1">
          <label
            className="block text-[10px] text-muted-foreground"
            htmlFor="art-handoff-reward-id"
          >
            Reward id
            <input
              id="art-handoff-reward-id"
              className="mt-0.5 w-full bg-background border border-border px-2 py-1 text-xs min-h-[32px]"
              value={rewardId}
              onChange={(e) => setRewardId(e.target.value)}
            />
          </label>
          <button
            type="button"
            className="w-full pixel-font text-[10px] min-h-[40px] px-2 border border-accent text-accent"
            onClick={() => rewardRef.current?.click()}
            aria-controls="art-handoff-reward-file"
          >
            Assign → reward icon
          </button>
          <input
            id="art-handoff-reward-file"
            ref={rewardRef}
            type="file"
            accept="image/*"
            className="sr-only"
            aria-label={`Assign reward icon for item ${rewardId}`}
            onChange={(e) => {
              void assignItem("reward", e.target.files?.[0] ?? null);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground leading-relaxed">
        Repo authors: open{" "}
        <code className="text-accent">{IMAGE_GEN_STARTER_PATH}</code> for theme
        card + prompts. After assign, draw hotspots and run Ship checklist.
      </p>
    </section>
  );
}
