import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { suggestId } from "@/authoring/codegen";
import type { JsonPackActor, JsonPackDocument } from "@/engine/jsonPack";
import { isBitmapCostume } from "@/engine/actorArt";
import { isSafeMediaUrl } from "@/engine/security";
import { toastFail } from "@/studio/toastError";
import { studioTabHref } from "@/engine/validationHelp";

export interface PackActorsPanelProps {
  doc: JsonPackDocument;
  onChange: (doc: JsonPackDocument) => void;
}

function listActorsFromDoc(
  doc: JsonPackDocument
): Array<{ id: string; name: string }> {
  const map = new Map<string, string>();
  map.set("player", doc.actors?.player?.name || "You (player)");
  for (const [id, a] of Object.entries(doc.actors ?? {})) {
    map.set(id, a.name || id);
  }
  for (const room of Object.values(doc.rooms)) {
    for (const h of room.hotspots ?? []) {
      if (h.kind !== "character") continue;
      const id = h.actorId || h.id;
      if (!map.has(id)) map.set(id, h.name);
    }
  }
  return [...map.entries()].map(([id, name]) => ({ id, name }));
}

/**
 * Costume / portrait authoring for pack actors (player + NPCs).
 * Complements Pixels → Send character / portrait.
 */
export function PackActorsPanel({ doc, onChange }: PackActorsPanelProps) {
  const listed = useMemo(() => listActorsFromDoc(doc), [doc]);
  const actors = doc.actors ?? {};
  const [selectedId, setSelectedId] = useState(
    listed[0]?.id ?? "player"
  );
  const [newId, setNewId] = useState("");

  const selected: JsonPackActor | undefined = actors[selectedId];

  const upsert = (id: string, patch: Partial<JsonPackActor>) => {
    const prev = actors[id] ?? { id, name: id === "player" ? "You" : id };
    onChange({
      ...doc,
      actors: {
        ...actors,
        [id]: {
          ...prev,
          ...patch,
          id,
          isEgo: id === "player" ? true : patch.isEgo ?? prev.isEgo,
          canControl:
            id === "player" ? true : patch.canControl ?? prev.canControl,
        },
      },
    });
  };

  const setAnim = (slot: "idle" | "walk" | "talk", url: string) => {
    const animations = { ...(selected?.animations ?? {}) };
    const trimmed = url.trim();
    if (!trimmed) delete animations[slot];
    else animations[slot] = trimmed;
    upsert(selectedId, {
      animations: Object.keys(animations).length ? animations : undefined,
    });
  };

  const idleSheet = selected?.animations?.idle;
  const idleUrl =
    typeof idleSheet === "string"
      ? idleSheet
      : idleSheet &&
        (idleSheet.right ||
          idleSheet.e ||
          idleSheet.down ||
          idleSheet.s ||
          idleSheet.left ||
          idleSheet.w ||
          idleSheet.up ||
          idleSheet.n);
  const previewUrl =
    (idleUrl && isSafeMediaUrl(idleUrl) && idleUrl) ||
    (selected?.sprite && isSafeMediaUrl(selected.sprite) && selected.sprite) ||
    (selected?.portrait &&
      isSafeMediaUrl(selected.portrait) &&
      selected.portrait) ||
    "";

  return (
    <section className="border border-game-border bg-game-ui/90 p-4 space-y-3">
      <div>
        <h3 className="pixel-font text-sm text-accent">Actors & costumes</h3>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          Bitmap sprites for the ego and NPCs. Prefer{" "}
          <Link
            to={studioTabHref("pixels", { send: "character" })}
            className="text-accent underline-offset-2 hover:underline"
          >
            Pixels → Character costume
          </Link>{" "}
          for art, then refine idle / walk / talk slots here.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {listed.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setSelectedId(a.id)}
            className={`pixel-font text-[10px] min-h-[36px] px-2 border ${
              a.id === selectedId
                ? "border-accent text-accent"
                : "border-game-border"
            }`}
          >
            {a.name}
            {isBitmapCostume(actors[a.id]?.sprite) ? "" : " · CSS"}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          className="flex-1 bg-background border border-border px-2 py-2 min-h-[40px] text-xs font-mono"
          value={newId}
          onChange={(e) => setNewId(e.target.value)}
          placeholder="npc_id"
        />
        <button
          type="button"
          className="pixel-font text-xs min-h-[40px] px-3 border-2 border-accent text-accent"
          onClick={() => {
            const id = suggestId(newId || "npc", `npc_${listed.length + 1}`);
            if (actors[id]) {
              toastFail("Actor exists");
              return;
            }
            upsert(id, { name: id, sprite: "actor-npc" });
            setSelectedId(id);
            setNewId("");
          }}
        >
          Add actor
        </button>
      </div>

      {selectedId && (
        <div className="grid md:grid-cols-[120px_1fr] gap-4 border-t border-border pt-3">
          <div className="space-y-2">
            <div
              className="aspect-[3/4] border border-border bg-background/60 flex items-end justify-center overflow-hidden"
              data-testid="actor-costume-preview"
            >
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt=""
                  className="max-h-full max-w-full object-contain"
                  draggable={false}
                />
              ) : (
                <div
                  className={`w-10 h-16 mb-2 ${
                    selectedId === "player" ? "actor-ego" : "actor-npc"
                  }`}
                />
              )}
            </div>
            <p className="text-[10px] text-muted-foreground text-center pixel-font">
              Preview
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-xs space-y-1">
              <span className="text-muted-foreground">Display name</span>
              <input
                className="w-full bg-background border border-border px-2 py-2"
                value={selected?.name || ""}
                onChange={(e) => upsert(selectedId, { name: e.target.value })}
              />
            </label>
            <label className="block text-xs space-y-1">
              <span className="text-muted-foreground">
                Sprite URL (idle default)
              </span>
              <input
                className="w-full bg-background border border-border px-2 py-2 font-mono text-[11px]"
                value={selected?.sprite || ""}
                onChange={(e) => upsert(selectedId, { sprite: e.target.value })}
                placeholder="data:image/… or /assets/…"
              />
            </label>
            <label className="block text-xs space-y-1">
              <span className="text-muted-foreground">Portrait URL</span>
              <input
                className="w-full bg-background border border-border px-2 py-2 font-mono text-[11px]"
                value={selected?.portrait || ""}
                onChange={(e) =>
                  upsert(selectedId, { portrait: e.target.value })
                }
              />
            </label>
            <label className="block text-xs space-y-1">
              <span className="text-muted-foreground">Talk color</span>
              <input
                className="w-full bg-background border border-border px-2 py-2 font-mono text-[11px]"
                value={selected?.talkColor || ""}
                onChange={(e) =>
                  upsert(selectedId, { talkColor: e.target.value })
                }
                placeholder="#f5e6a8"
              />
            </label>
            <div className="grid sm:grid-cols-3 gap-2">
              {(["idle", "walk", "talk"] as const).map((slot) => {
                const sheet = selected?.animations?.[slot];
                const slotValue =
                  typeof sheet === "string"
                    ? sheet
                    : sheet
                      ? "(directional sheet — edit in JSON)"
                      : "";
                return (
                  <label key={slot} className="block text-xs space-y-1">
                    <span className="text-muted-foreground capitalize">
                      {slot} frame
                    </span>
                    <input
                      className="w-full bg-background border border-border px-2 py-2 font-mono text-[10px]"
                      value={slotValue}
                      onChange={(e) => setAnim(slot, e.target.value)}
                      placeholder="URL or CSS class"
                      disabled={typeof sheet === "object" && !!sheet}
                    />
                  </label>
                );
              })}
            </div>
            {selectedId !== "player" && (
              <button
                type="button"
                className="text-xs text-destructive min-h-[36px]"
                onClick={() => {
                  const next = { ...actors };
                  delete next[selectedId];
                  onChange({ ...doc, actors: next });
                  setSelectedId(listed.find((a) => a.id !== selectedId)?.id ?? "player");
                }}
              >
                Remove actor entry
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
