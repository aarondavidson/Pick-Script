import { useMemo, useState } from "react";
import { useAdventure } from "@/engine";
import type { JsonPackDocument } from "@/engine/jsonPack";

export interface PlaytestCheatsPanelProps {
  doc: JsonPackDocument;
}

/**
 * In-preview cheats: jump room, give item, toggle flag, play cutscene.
 */
export function PlaytestCheatsPanel({ doc }: PlaytestCheatsPanelProps) {
  const {
    gameState,
    updateGameState,
    travelToRoom,
    startNamedCutscene,
    showMessage,
  } = useAdventure();
  const [open, setOpen] = useState(true);
  const [flagName, setFlagName] = useState("");
  const roomIds = Object.keys(doc.rooms);
  const itemIds = Object.keys(doc.items ?? {});
  const cutsceneIds = Object.keys(doc.cutscenes ?? {});
  const flagKeys = useMemo(
    () => Object.keys(gameState.flags ?? {}).sort(),
    [gameState.flags]
  );

  return (
    <div className="border border-accent/40 bg-black/30 mt-2">
      <button
        type="button"
        className="w-full flex justify-between items-center px-3 py-2 pixel-font text-[10px] text-accent"
        onClick={() => setOpen((o) => !o)}
      >
        <span>Playtest cheats</span>
        <span>{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-3 text-xs">
          <div>
            <p className="text-muted-foreground mb-1">Jump to room</p>
            <div className="flex flex-wrap gap-1">
              {roomIds.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    travelToRoom(id);
                    showMessage(`Cheats: → ${doc.rooms[id]?.name || id}`);
                  }}
                  className={`pixel-font text-[9px] min-h-[32px] px-2 border ${
                    gameState.currentLocation === id
                      ? "border-accent text-accent"
                      : "border-game-border"
                  }`}
                >
                  {doc.rooms[id]?.name || id}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-muted-foreground mb-1">Give item</p>
            {itemIds.length === 0 ? (
              <p className="text-muted-foreground">No catalog items.</p>
            ) : (
              <div className="flex flex-wrap gap-1">
                {itemIds.map((id) => {
                  const item = doc.items![id]!;
                  const has = gameState.inventory.some((i) => i.id === id);
                  return (
                    <button
                      key={id}
                      type="button"
                      disabled={has}
                      onClick={() => {
                        updateGameState({
                          inventory: [
                            ...gameState.inventory,
                            {
                              id: item.id,
                              name: item.name,
                              description: item.description || item.name,
                              icon: item.icon,
                            },
                          ],
                        });
                        showMessage(`Cheats: + ${item.name}`);
                      }}
                      className="pixel-font text-[9px] min-h-[32px] px-2 border border-primary text-primary disabled:opacity-40"
                    >
                      {item.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <p className="text-muted-foreground mb-1">Toggle flag</p>
            <div className="flex gap-2 mb-1">
              <input
                className="flex-1 bg-background border border-border px-2 py-1.5 min-h-[32px]"
                value={flagName}
                onChange={(e) => setFlagName(e.target.value)}
                placeholder="got_brass_key"
                list="cheat-flags"
              />
              <datalist id="cheat-flags">
                {flagKeys.map((k) => (
                  <option key={k} value={k} />
                ))}
                {Object.keys(doc.initialFlags ?? {}).map((k) => (
                  <option key={`i-${k}`} value={k} />
                ))}
              </datalist>
              <button
                type="button"
                className="pixel-font text-[9px] min-h-[32px] px-2 border border-accent text-accent"
                onClick={() => {
                  const f = flagName.trim();
                  if (!f) return;
                  const next = !gameState.flags[f];
                  updateGameState({
                    flags: { ...gameState.flags, [f]: next },
                  });
                  showMessage(`Cheats: ${f}=${next}`);
                }}
              >
                Toggle
              </button>
            </div>
            <ul className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
              {flagKeys
                .filter((k) => gameState.flags[k])
                .slice(0, 12)
                .map((k) => (
                  <li key={k}>
                    <button
                      type="button"
                      className="text-[9px] font-mono text-accent border border-accent/30 px-1"
                      onClick={() =>
                        updateGameState({
                          flags: { ...gameState.flags, [k]: false },
                        })
                      }
                    >
                      {k} ✕
                    </button>
                  </li>
                ))}
            </ul>
          </div>

          {cutsceneIds.length > 0 && (
            <div>
              <p className="text-muted-foreground mb-1">Play cutscene</p>
              <div className="flex flex-wrap gap-1">
                {cutsceneIds.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      if (!startNamedCutscene(id)) {
                        showMessage(`No cutscene “${id}”`);
                      }
                    }}
                    className="pixel-font text-[9px] min-h-[32px] px-2 border border-game-border"
                  >
                    {doc.cutscenes?.[id]?.title || id}
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="text-[10px] text-muted-foreground">
            Room: {gameState.currentLocation} · Inv:{" "}
            {gameState.inventory.length} · Flags on:{" "}
            {flagKeys.filter((k) => gameState.flags[k]).length}
          </p>
        </div>
      )}
    </div>
  );
}
