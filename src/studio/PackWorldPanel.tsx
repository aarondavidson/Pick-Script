import { useMemo, useState } from "react";
import {
  AMBIENT_IDS,
  MUSIC_PRESET_HINTS,
  MUSIC_PRESET_IDS,
  type AmbientId,
  type MusicPresetId,
} from "@/authoring/audioPresets";
import { suggestId } from "@/authoring/codegen";
import type { JsonPackDocument } from "@/engine/jsonPack";
import type { MapFogConfig } from "@/engine/mapFog";
import { toast } from "@/hooks/use-toast";

export interface PackWorldPanelProps {
  doc: JsonPackDocument;
  onChange: (doc: JsonPackDocument) => void;
}

function fastTravelEnabled(doc: JsonPackDocument): boolean {
  const ft = doc.mapFastTravel;
  if (ft === false) return false;
  if (ft === true || ft == null) return true;
  return ft.enabled !== false;
}

function fastTravelRequireVisited(doc: JsonPackDocument): boolean {
  const ft = doc.mapFastTravel;
  if (typeof ft === "object" && ft) return ft.requireVisited !== false;
  return true;
}

/**
 * Map groups / fast-travel + pack-level music cues in the same draft.
 */
export function PackWorldPanel({ doc, onChange }: PackWorldPanelProps) {
  const roomIds = Object.keys(doc.rooms);
  const groups = useMemo(
    () => Object.entries(doc.mapGroups ?? {}),
    [doc.mapGroups]
  );
  const musicCues = useMemo(
    () => Object.entries(doc.audio?.music ?? {}),
    [doc.audio?.music]
  );

  const [groupName, setGroupName] = useState("World");
  const [groupRooms, setGroupRooms] = useState("");
  const [cueName, setCueName] = useState("streets");
  const [cuePreset, setCuePreset] = useState<MusicPresetId>("ambient");
  const [cueAmbient, setCueAmbient] = useState<AmbientId>("none");
  const [fogRevealRoom, setFogRevealRoom] = useState("");
  const [fogRevealFlag, setFogRevealFlag] = useState("");
  const [fogTravelRoom, setFogTravelRoom] = useState("");
  const [fogTravelFlag, setFogTravelFlag] = useState("");

  const fog: MapFogConfig = doc.mapFog ?? { enabled: false };
  const fogEnabled = fog.enabled === true;

  const setFastTravel = (enabled: boolean, requireVisited: boolean) => {
    onChange({
      ...doc,
      mapFastTravel: { enabled, requireVisited },
    });
  };

  const setFog = (next: MapFogConfig) => {
    onChange({
      ...doc,
      mapFog: next.enabled ? next : { ...next, enabled: false },
    });
  };

  const addGroup = () => {
    const name = groupName.trim() || "World";
    const ids = (groupRooms.trim()
      ? groupRooms.split(/[\s,]+/)
      : roomIds
    )
      .map((s) => s.trim())
      .filter(Boolean);
    const unknown = ids.filter((id) => !doc.rooms[id]);
    if (unknown.length) {
      toast({
        title: "Unknown rooms",
        description: unknown.join(", "),
        variant: "destructive",
      });
      return;
    }
    onChange({
      ...doc,
      mapGroups: { ...(doc.mapGroups ?? {}), [name]: ids },
    });
    toast({ title: "Map group saved", description: name });
  };

  const addMusicCue = () => {
    const cue = suggestId(cueName, "music");
    const audio = doc.audio ?? { music: {}, ambient: {} };
    onChange({
      ...doc,
      audio: {
        ...audio,
        music: { ...(audio.music ?? {}), [cue]: cuePreset },
        ambient: {
          ...(audio.ambient ?? {}),
          ...(cueAmbient !== "none" ? { [cue]: cueAmbient } : {}),
        },
      },
    });
    toast({ title: "Music cue added", description: `${cue} → ${cuePreset}` });
  };

  return (
    <section className="border border-game-border bg-game-ui/90 p-4 space-y-4">
      <div>
        <h3 className="pixel-font text-sm text-accent">World</h3>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          Map groups, fast-travel, and pack music cues — same draft as rooms and
          puzzles.
        </p>
      </div>

      <div className="space-y-2 border border-border/60 p-3">
        <h4 className="pixel-font text-[11px] text-accent">Map</h4>
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={fastTravelEnabled(doc)}
            onChange={(e) =>
              setFastTravel(e.target.checked, fastTravelRequireVisited(doc))
            }
          />
          Enable Map / fast-travel
        </label>
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={fastTravelRequireVisited(doc)}
            disabled={!fastTravelEnabled(doc)}
            onChange={(e) =>
              setFastTravel(fastTravelEnabled(doc), e.target.checked)
            }
          />
          Only visited rooms
        </label>

        <div className="border-t border-border/50 pt-3 mt-2 space-y-2">
          <h4 className="pixel-font text-[11px] text-primary">Map fog (optional)</h4>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Shroud unrevealed rooms as ??? until the player visits or a story
            flag clears the fog. Use travel flags to show a sealed district
            without allowing fast-travel yet.
          </p>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={fogEnabled}
              onChange={(e) =>
                setFog({
                  ...fog,
                  enabled: e.target.checked,
                  clearOnVisit: fog.clearOnVisit !== false,
                })
              }
            />
            Enable map fog
          </label>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={fog.clearOnVisit !== false}
              disabled={!fogEnabled}
              onChange={(e) =>
                setFog({ ...fog, enabled: true, clearOnVisit: e.target.checked })
              }
            />
            Clear fog on visit
          </label>
          {fogEnabled && (
            <>
              <div className="grid sm:grid-cols-2 gap-2">
                <label className="block text-xs space-y-1">
                  <span className="text-muted-foreground">Reveal room</span>
                  <select
                    className="w-full bg-background border border-border px-2 py-2"
                    value={fogRevealRoom || roomIds[0] || ""}
                    onChange={(e) => setFogRevealRoom(e.target.value)}
                  >
                    {roomIds.map((id) => (
                      <option key={id} value={id}>
                        {id}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs space-y-1">
                  <span className="text-muted-foreground">Reveal flag</span>
                  <input
                    className="w-full bg-background border border-border px-2 py-2 font-mono text-[11px]"
                    value={fogRevealFlag}
                    onChange={(e) => setFogRevealFlag(e.target.value)}
                    placeholder="met_guide"
                  />
                </label>
              </div>
              <button
                type="button"
                className="pixel-font text-[10px] min-h-[36px] px-2 border border-border"
                onClick={() => {
                  const room = fogRevealRoom || roomIds[0];
                  const flag = fogRevealFlag.trim();
                  if (!room || !flag) return;
                  setFog({
                    ...fog,
                    enabled: true,
                    revealByFlag: {
                      ...(fog.revealByFlag ?? {}),
                      [room]: flag,
                    },
                  });
                  toast({
                    title: "Reveal rule",
                    description: `${room} ← ${flag}`,
                  });
                }}
              >
                Add reveal-by-flag
              </button>
              <div className="grid sm:grid-cols-2 gap-2">
                <label className="block text-xs space-y-1">
                  <span className="text-muted-foreground">Travel gate room</span>
                  <select
                    className="w-full bg-background border border-border px-2 py-2"
                    value={fogTravelRoom || roomIds[0] || ""}
                    onChange={(e) => setFogTravelRoom(e.target.value)}
                  >
                    {roomIds.map((id) => (
                      <option key={id} value={id}>
                        {id}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs space-y-1">
                  <span className="text-muted-foreground">Travel flag</span>
                  <input
                    className="w-full bg-background border border-border px-2 py-2 font-mono text-[11px]"
                    value={fogTravelFlag}
                    onChange={(e) => setFogTravelFlag(e.target.value)}
                    placeholder="bridge_open"
                  />
                </label>
              </div>
              <button
                type="button"
                className="pixel-font text-[10px] min-h-[36px] px-2 border border-border"
                onClick={() => {
                  const room = fogTravelRoom || roomIds[0];
                  const flag = fogTravelFlag.trim();
                  if (!room || !flag) return;
                  setFog({
                    ...fog,
                    enabled: true,
                    travelByFlag: {
                      ...(fog.travelByFlag ?? {}),
                      [room]: flag,
                    },
                  });
                  toast({
                    title: "Travel gate",
                    description: `${room} needs ${flag}`,
                  });
                }}
              >
                Add travel-by-flag (sealed until flag)
              </button>
              <ul className="text-[10px] space-y-1 text-muted-foreground">
                {Object.entries(fog.revealByFlag ?? {}).map(([r, f]) => (
                  <li key={`r-${r}`}>
                    Reveal {r} ← {f}{" "}
                    <button
                      type="button"
                      className="text-destructive"
                      onClick={() => {
                        const next = { ...(fog.revealByFlag ?? {}) };
                        delete next[r];
                        setFog({ ...fog, enabled: true, revealByFlag: next });
                      }}
                    >
                      ✕
                    </button>
                  </li>
                ))}
                {Object.entries(fog.travelByFlag ?? {}).map(([r, f]) => (
                  <li key={`t-${r}`}>
                    Travel {r} needs {f}{" "}
                    <button
                      type="button"
                      className="text-destructive"
                      onClick={() => {
                        const next = { ...(fog.travelByFlag ?? {}) };
                        delete next[r];
                        setFog({ ...fog, enabled: true, travelByFlag: next });
                      }}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-2 pt-2">
          <label className="block text-xs space-y-1">
            <span className="text-muted-foreground">Group name</span>
            <input
              className="w-full bg-background border border-border px-2 py-2 min-h-[40px]"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          </label>
          <label className="block text-xs space-y-1">
            <span className="text-muted-foreground">
              Rooms (comma-separated, blank = all)
            </span>
            <input
              className="w-full bg-background border border-border px-2 py-2 min-h-[40px]"
              value={groupRooms}
              onChange={(e) => setGroupRooms(e.target.value)}
              placeholder={roomIds.join(", ")}
            />
          </label>
        </div>
        <button
          type="button"
          onClick={addGroup}
          className="pixel-font text-xs min-h-[40px] px-3 border-2 border-accent text-accent"
        >
          Save map group
        </button>
        <ul className="text-xs space-y-1">
          {groups.length === 0 && (
            <li className="text-muted-foreground">
              Default at compile: one “World” group with every room.
            </li>
          )}
          {groups.map(([name, ids]) => (
            <li
              key={name}
              className="flex justify-between border border-border/50 px-2 py-1 gap-2"
            >
              <span className="truncate">
                {name}: {ids.join(", ")}
              </span>
              <button
                type="button"
                className="text-destructive shrink-0"
                onClick={() => {
                  const next = { ...(doc.mapGroups ?? {}) };
                  delete next[name];
                  onChange({
                    ...doc,
                    mapGroups: Object.keys(next).length ? next : undefined,
                  });
                }}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-2 border border-border/60 p-3">
        <h4 className="pixel-font text-[11px] text-accent">Audio cues</h4>
        <label className="block text-xs space-y-1">
          <span className="text-muted-foreground">Default music cue</span>
          <select
            className="w-full bg-background border border-border px-2 py-2 min-h-[40px]"
            value={doc.audio?.defaultMusic || ""}
            onChange={(e) => {
              const audio = doc.audio ?? { music: {}, ambient: {} };
              onChange({
                ...doc,
                audio: {
                  ...audio,
                  defaultMusic: e.target.value || undefined,
                },
              });
            }}
          >
            <option value="">— none —</option>
            {Object.keys(doc.audio?.music ?? {}).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <div className="grid sm:grid-cols-3 gap-2">
          <label className="block text-xs space-y-1">
            <span className="text-muted-foreground">Cue id</span>
            <input
              className="w-full bg-background border border-border px-2 py-2 min-h-[40px]"
              value={cueName}
              onChange={(e) => setCueName(e.target.value)}
            />
          </label>
          <label className="block text-xs space-y-1">
            <span className="text-muted-foreground">Preset</span>
            <select
              className="w-full bg-background border border-border px-2 py-2 min-h-[40px]"
              value={cuePreset}
              onChange={(e) =>
                setCuePreset(e.target.value as MusicPresetId)
              }
            >
              {MUSIC_PRESET_IDS.map((p) => (
                <option key={p} value={p}>
                  {p} — {MUSIC_PRESET_HINTS[p]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs space-y-1">
            <span className="text-muted-foreground">Ambient</span>
            <select
              className="w-full bg-background border border-border px-2 py-2 min-h-[40px]"
              value={cueAmbient}
              onChange={(e) => setCueAmbient(e.target.value as AmbientId)}
            >
              {AMBIENT_IDS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button
          type="button"
          onClick={addMusicCue}
          className="pixel-font text-xs min-h-[40px] px-3 border-2 border-accent text-accent"
        >
          Add music cue
        </button>
        <ul className="text-xs space-y-1">
          {musicCues.map(([cue, preset]) => {
            const presetLabel =
              typeof preset === "string"
                ? preset
                : "src" in preset
                  ? `file${preset.fallbackPreset ? ` · ${preset.fallbackPreset}` : ""}`
                  : preset.preset;
            const amb = doc.audio?.ambient?.[cue];
            return (
              <li
                key={cue}
                className="flex justify-between border border-border/50 px-2 py-1"
              >
                <span>
                  {cue} → {presetLabel}
                  {amb ? ` · ${amb}` : ""}
                </span>
                <button
                  type="button"
                  className="text-destructive"
                  onClick={() => {
                    const audio = doc.audio ?? { music: {}, ambient: {} };
                    const music = { ...(audio.music ?? {}) };
                    const ambient = { ...(audio.ambient ?? {}) };
                    delete music[cue];
                    delete ambient[cue];
                    onChange({
                      ...doc,
                      audio: { ...audio, music, ambient },
                    });
                  }}
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ul>
        <p className="text-[10px] text-muted-foreground">
          Assign cues per room in the Rooms panel. Advanced SFX bindings still
          live under the Audio tab.
        </p>
      </div>
    </section>
  );
}
