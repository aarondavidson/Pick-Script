import type { DraftRoomMusic } from "@/authoring/audioPresets";

export interface AudioRoomMapPanelProps {
  rooms: DraftRoomMusic[];
  roomId: string;
  roomCue: string;
  cueOptions: string[];
  packRooms: Array<{ id: string; name: string }>;
  onRoomIdChange: (v: string) => void;
  onRoomCueChange: (v: string) => void;
  onAddRoom: () => void;
  onRemoveRoom: (roomId: string) => void;
  onCopyRooms: () => void;
}

/**
 * Room → music cue assignments — extracted from AudioTool.
 */
export function AudioRoomMapPanel({
  rooms,
  roomId,
  roomCue,
  cueOptions,
  packRooms,
  onRoomIdChange,
  onRoomCueChange,
  onAddRoom,
  onRemoveRoom,
  onCopyRooms,
}: AudioRoomMapPanelProps) {
  return (
    <section className="border border-game-border bg-game-ui/90 p-4 space-y-3">
      <h3 className="pixel-font text-sm text-accent">Room music</h3>
      <p className="text-xs text-muted-foreground">
        Assign cues to rooms from the current pack draft.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-xs space-y-1">
          <span className="text-muted-foreground">Room</span>
          {packRooms.length ? (
            <select
              className="w-full bg-background border border-border px-2 py-2 min-h-[40px]"
              value={roomId}
              onChange={(e) => onRoomIdChange(e.target.value)}
            >
              {packRooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.id})
                </option>
              ))}
            </select>
          ) : (
            <input
              className="w-full bg-background border border-border px-2 py-2 min-h-[40px]"
              value={roomId}
              onChange={(e) => onRoomIdChange(e.target.value)}
            />
          )}
        </label>
        <label className="block text-xs space-y-1">
          <span className="text-muted-foreground">Music cue</span>
          <select
            className="w-full bg-background border border-border px-2 py-2 min-h-[40px]"
            value={roomCue}
            onChange={(e) => onRoomCueChange(e.target.value)}
          >
            {cueOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button
        type="button"
        onClick={onAddRoom}
        className="pixel-font text-xs min-h-[40px] px-3 border-2 border-accent text-accent"
      >
        Assign room
      </button>
      <ul className="text-xs space-y-1 max-h-36 overflow-y-auto">
        {rooms.map((r) => (
          <li
            key={r.roomId}
            className="flex justify-between border border-border/60 px-2 py-1.5"
          >
            <span>
              <span className="text-accent">{r.roomId}</span> → {r.musicCue}
            </span>
            <button
              type="button"
              className="text-destructive"
              onClick={() => onRemoveRoom(r.roomId)}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        disabled={!rooms.length}
        onClick={onCopyRooms}
        className="pixel-font text-xs min-h-[40px] w-full border border-accent text-accent disabled:opacity-40"
      >
        Copy room music fields
      </button>
    </section>
  );
}
