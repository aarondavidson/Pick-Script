import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  type AmbientId,
  type DraftCustomSfx,
  type DraftMusicCue,
  type DraftRoomMusic,
  type DraftSfxBinding,
  type MusicPresetId,
} from "@/authoring/audioPresets";
import {
  formatPackAudioModule,
  formatRoomMusicAssignments,
  formatSfxBindingPatches,
  suggestId,
} from "@/authoring/codegen";
import { toast } from "@/hooks/use-toast";
import { soundFX } from "@/utils/soundEffects";
import {
  AmbientMusicEngine,
  getThemeByPreset,
} from "@/utils/musicEngine";
import {
  applyAudioToPackDraft,
  listPackHotspotIds,
  listPackRoomIds,
} from "@/studio/packArtBridge";
import { loadPackDraftAsync } from "@/studio/packDraftIdb";
import { isMusicFileBed } from "@/engine/audio";
import { packAudioPlayer } from "@/utils/packAudioPlayer";
import { AudioCuesPanel } from "@/studio/AudioCuesPanel";
import { AudioRoomMapPanel } from "@/studio/AudioRoomMapPanel";
import { AudioSfxBindingsPanel } from "@/studio/AudioSfxBindingsPanel";
import { buildPackAudio } from "@/studio/buildPackAudio";

/**
 * Design pack music (per location) and SFX bindings for interactions.
 * Apply writes into the Pack draft (not only Copy TS).
 */
export function AudioTool() {
  const [cues, setCues] = useState<DraftMusicCue[]>([
    { cue: "attic", preset: "noir", ambient: "hum" },
    { cue: "home", preset: "calm", ambient: "none" },
  ]);
  const [cueName, setCueName] = useState("streets");
  const [cuePreset, setCuePreset] = useState<MusicPresetId>("ambient");
  const [cueAmbient, setCueAmbient] = useState<AmbientId>("wind");
  const [cueFileSrc, setCueFileSrc] = useState("");

  const [rooms, setRooms] = useState<DraftRoomMusic[]>([
    { roomId: "attic", musicCue: "attic" },
  ]);
  const [roomId, setRoomId] = useState("start");
  const [roomCue, setRoomCue] = useState("home");
  const [packRooms, setPackRooms] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [packHotspots, setPackHotspots] = useState<
    Array<{ id: string; name: string; roomId: string }>
  >([]);

  const [bindings, setBindings] = useState<DraftSfxBinding[]>([]);
  const [bindHotspot, setBindHotspot] = useState("desk");
  const [bindWhen, setBindWhen] = useState<"interact" | "useWith">("interact");
  const [bindKey, setBindKey] = useState("creak");

  const [customSfx, setCustomSfx] = useState<DraftCustomSfx[]>([]);
  const [customKey, setCustomKey] = useState("chest_open");
  const [customFile, setCustomFile] = useState("chest-open.mp3");

  const previewRef = useRef<AmbientMusicEngine | null>(null);

  useEffect(() => {
    return () => {
      previewRef.current?.stop();
      previewRef.current = null;
    };
  }, []);

  useEffect(() => {
    void (async () => {
      const doc = await loadPackDraftAsync();
      const musicMap = doc.audio?.music ?? {};
      const ambientMap = doc.audio?.ambient ?? {};
      const loadedCues: DraftMusicCue[] = Object.entries(musicMap).map(
        ([cue, mapped]) => {
          if (isMusicFileBed(mapped)) {
            return {
              cue,
              preset: (mapped.fallbackPreset || "ambient") as MusicPresetId,
              ambient: (ambientMap[cue] as AmbientId) || "none",
              fileSrc: mapped.src,
              fileGain: mapped.gain,
              fallbackPreset: (mapped.fallbackPreset ||
                "ambient") as MusicPresetId,
            };
          }
          if (
            typeof mapped === "string" &&
            (mapped.startsWith("/") ||
              mapped.startsWith("data:") ||
              mapped.includes("://"))
          ) {
            return {
              cue,
              preset: "ambient" as MusicPresetId,
              ambient: (ambientMap[cue] as AmbientId) || "none",
              fileSrc: mapped,
            };
          }
          return {
            cue,
            preset: (typeof mapped === "string"
              ? mapped
              : mapped && typeof mapped === "object" && "preset" in mapped
                ? mapped.preset
                : "ambient") as MusicPresetId,
            ambient: (ambientMap[cue] as AmbientId) || "none",
          };
        }
      );
      if (loadedCues.length) setCues(loadedCues);

      const roomAssign: DraftRoomMusic[] = Object.values(doc.rooms)
        .filter((r) => r.music)
        .map((r) => ({ roomId: r.id, musicCue: r.music! }));
      if (roomAssign.length) setRooms(roomAssign);

      const hsBinds: DraftSfxBinding[] = [];
      for (const room of Object.values(doc.rooms)) {
        for (const h of room.hotspots ?? []) {
          if (h.interactSound) {
            hsBinds.push({
              hotspotId: h.id,
              when: "interact",
              soundKey: h.interactSound,
            });
          }
          if (h.useWithSound) {
            hsBinds.push({
              hotspotId: h.id,
              when: "useWith",
              soundKey: h.useWithSound,
            });
          }
        }
      }
      if (hsBinds.length) setBindings(hsBinds);

      const pr = await listPackRoomIds();
      setPackRooms(pr);
      if (pr[0]) setRoomId(pr[0].id);
      const ph = await listPackHotspotIds();
      setPackHotspots(ph);
      if (ph[0]) setBindHotspot(ph[0].id);
    })();
  }, []);

  const previewSfx = async (key: string) => {
    try {
      await soundFX.unlock();
    } catch {
      /* ignore */
    }
    soundFX.playKey(key);
  };

  const previewMusic = (preset: MusicPresetId, fileSrc?: string) => {
    previewRef.current?.stop();
    packAudioPlayer.stop({ channel: "music" });
    if (fileSrc?.trim()) {
      void (async () => {
        await packAudioPlayer.unlock();
        packAudioPlayer.setMusicVolume(0.45);
        const id = await packAudioPlayer.play(fileSrc.trim(), {
          key: "preview",
          channel: "music",
          loop: true,
          gain: 1,
        });
        window.setTimeout(() => {
          packAudioPlayer.stop({ channel: "music" });
        }, 2800);
        toast({
          title: "Preview",
          description:
            id != null
              ? `File bed (~3s)`
              : `File failed — try synth “${preset}”`,
        });
      })();
      return;
    }
    const engine = new AmbientMusicEngine(getThemeByPreset(preset));
    previewRef.current = engine;
    engine.start(0.45, "none");
    window.setTimeout(() => {
      engine.stop();
      if (previewRef.current === engine) previewRef.current = null;
    }, 2800);
    toast({ title: "Preview", description: `Music preset “${preset}” (~3s)` });
  };

  const addCue = () => {
    const cue = suggestId(cueName, "music");
    setCues((prev) => {
      const rest = prev.filter((c) => c.cue !== cue);
      return [
        ...rest,
        {
          cue,
          preset: cuePreset,
          ambient: cueAmbient,
          ...(cueFileSrc.trim()
            ? {
                fileSrc: cueFileSrc.trim(),
                fallbackPreset: cuePreset,
              }
            : {}),
        },
      ];
    });
  };

  const addRoom = () => {
    const id = suggestId(roomId, "room");
    const musicCue = suggestId(roomCue, cues[0]?.cue || "home");
    setRooms((prev) => {
      const rest = prev.filter((r) => r.roomId !== id);
      return [...rest, { roomId: id, musicCue }];
    });
  };

  const addBinding = () => {
    const hotspotId = suggestId(bindHotspot, "hotspot");
    const soundKey = bindKey.trim() || "click";
    setBindings((prev) => {
      const rest = prev.filter(
        (b) => !(b.hotspotId === hotspotId && b.when === bindWhen)
      );
      return [...rest, { hotspotId, when: bindWhen, soundKey }];
    });
  };

  const addCustomSfx = () => {
    const key = suggestId(customKey, "sfx");
    const filename =
      customFile.trim() || `${key.replace(/_/g, "-")}.mp3`;
    setCustomSfx((prev) => {
      const rest = prev.filter((s) => s.key !== key);
      return [...rest, { key, filename }];
    });
  };

  const applyToPack = async () => {
    try {
      await applyAudioToPackDraft({
        audio: buildPackAudio(cues, customSfx),
        roomMusic: rooms,
        sfxBindings: bindings,
      });
      toast({
        title: "Applied to pack draft",
        description: "Music cues, room assignments, and SFX bindings saved",
      });
    } catch (e) {
      toast({
        title: "Apply failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    }
  };

  const copyAudioTs = async () => {
    const code = formatPackAudioModule({
      exportName: "packAudio",
      defaultMusic: cues[0]?.cue,
      cues,
      customSfx,
    });
    await navigator.clipboard.writeText(code);
    toast({
      title: "Copied audio.ts",
      description: "Paste as src/games/<id>/audio.ts and wire on the definition",
    });
  };

  const copyRooms = async () => {
    await navigator.clipboard.writeText(formatRoomMusicAssignments(rooms));
    toast({ title: "Copied room music fields" });
  };

  const copyBindings = async () => {
    await navigator.clipboard.writeText(formatSfxBindingPatches(bindings));
    toast({
      title: "Copied hotspot sound fields",
      description: "Add interactSound / useWithSound on those hotspots",
    });
  };

  const cueOptions = cues.map((c) => c.cue);

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground leading-relaxed">
        Wire{" "}
        <strong className="font-normal text-foreground">location music</strong>{" "}
        and{" "}
        <strong className="font-normal text-foreground">interaction SFX</strong>
        , preview, then{" "}
        <strong className="font-normal text-foreground">Apply to pack</strong>{" "}
        (writes the Pack draft). Copy TS remains for advanced packs.
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void applyToPack()}
          className="pixel-font text-xs min-h-[44px] px-4 border-2 border-primary text-primary"
        >
          Apply to pack draft
        </button>
        <Link
          to="/pick"
          className="pixel-font text-xs min-h-[44px] px-4 border border-game-border inline-flex items-center"
        >
          Open Pack
        </Link>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <AudioCuesPanel
          cues={cues}
          cueName={cueName}
          cuePreset={cuePreset}
          cueAmbient={cueAmbient}
          cueFileSrc={cueFileSrc}
          onCueNameChange={setCueName}
          onCuePresetChange={setCuePreset}
          onCueAmbientChange={setCueAmbient}
          onCueFileSrcChange={setCueFileSrc}
          onAddCue={addCue}
          onRemoveCue={(cue) =>
            setCues((prev) => prev.filter((x) => x.cue !== cue))
          }
          onPreviewMusic={previewMusic}
        />
        <AudioRoomMapPanel
          rooms={rooms}
          roomId={roomId}
          roomCue={roomCue}
          cueOptions={cueOptions}
          packRooms={packRooms}
          onRoomIdChange={setRoomId}
          onRoomCueChange={setRoomCue}
          onAddRoom={addRoom}
          onRemoveRoom={(id) =>
            setRooms((prev) => prev.filter((x) => x.roomId !== id))
          }
          onCopyRooms={() => void copyRooms()}
        />
        <AudioSfxBindingsPanel
          bindings={bindings}
          bindHotspot={bindHotspot}
          bindWhen={bindWhen}
          bindKey={bindKey}
          customSfx={customSfx}
          customKey={customKey}
          customFile={customFile}
          packHotspots={packHotspots}
          onBindHotspotChange={setBindHotspot}
          onBindWhenChange={setBindWhen}
          onBindKeyChange={setBindKey}
          onCustomKeyChange={setCustomKey}
          onCustomFileChange={setCustomFile}
          onAddBinding={addBinding}
          onRemoveBinding={(hotspotId, when) =>
            setBindings((prev) =>
              prev.filter(
                (x) => !(x.hotspotId === hotspotId && x.when === when)
              )
            )
          }
          onAddCustomSfx={addCustomSfx}
          onRemoveCustomSfx={(key) =>
            setCustomSfx((prev) => prev.filter((x) => x.key !== key))
          }
          onPreviewSfx={(key) => void previewSfx(key)}
          onCopyBindings={() => void copyBindings()}
        />
      </div>

      <section className="border border-game-border bg-game-ui/90 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="pixel-font text-sm text-accent">Export PackAudio</h3>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void applyToPack()}
              className="pixel-font text-xs min-h-[44px] px-4 border-2 border-primary text-primary"
            >
              Apply to pack
            </button>
            <button
              type="button"
              onClick={() => void copyAudioTs()}
              className="pixel-font text-xs min-h-[44px] px-4 border-2 border-accent text-accent hover:bg-accent/10"
            >
              Copy audio.ts
            </button>
          </div>
        </div>
        <pre className="bg-black/40 border border-game-border p-3 text-[10px] md:text-xs text-accent/90 overflow-x-auto max-h-64 whitespace-pre">
          {formatPackAudioModule({
            defaultMusic: cues[0]?.cue,
            cues,
            customSfx,
          })}
        </pre>
      </section>
    </div>
  );
}
