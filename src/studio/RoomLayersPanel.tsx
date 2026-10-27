import { useState } from "react";
import type { JsonPackDocument } from "@/engine/jsonPack";
import type { RoomLayer, RoomParticles, SceneAnimClass } from "@/engine/types";
import { isSafeMediaUrl } from "@/engine/security";
import { toast } from "@/hooks/use-toast";
import { suggestId } from "@/authoring/codegen";

const PARTICLE_OPTS: { id: RoomParticles; label: string }[] = [
  { id: "none", label: "None" },
  { id: "stars", label: "Stars (night sky)" },
  { id: "sparkle", label: "Sparkle" },
  { id: "fireflies", label: "Fireflies" },
  { id: "rain", label: "Rain" },
  { id: "fog", label: "Fog" },
  { id: "dust", label: "Dust" },
  { id: "sparks", label: "Sparks" },
];

const ANIM_OPTS: { id: SceneAnimClass | ""; label: string }[] = [
  { id: "", label: "None" },
  { id: "twinkle", label: "Twinkle" },
  { id: "bob", label: "Bob" },
  { id: "sway", label: "Sway" },
  { id: "flicker", label: "Flicker" },
  { id: "pulse", label: "Pulse" },
];

export interface RoomLayersPanelProps {
  doc: JsonPackDocument;
  roomId: string;
  onChange: (doc: JsonPackDocument) => void;
}

/**
 * Atmosphere particles + overlay layers (parallax / frame loops / CSS anim).
 */
export function RoomLayersPanel({
  doc,
  roomId,
  onChange,
}: RoomLayersPanelProps) {
  const room = doc.rooms[roomId];
  const [depth, setDepth] = useState(1);
  const [opacity, setOpacity] = useState(0.85);
  const [animClass, setAnimClass] = useState<SceneAnimClass | "">("twinkle");
  const [fps, setFps] = useState(4);

  if (!room) return null;

  const layers = room.layers ?? [];
  const particles = (room.particles ?? "none") as RoomParticles;

  const setParticles = (next: RoomParticles) => {
    onChange({
      ...doc,
      rooms: {
        ...doc.rooms,
        [roomId]: {
          ...room,
          particles: next === "none" ? undefined : next,
        },
      },
    });
  };

  const setLayers = (next: RoomLayer[]) => {
    onChange({
      ...doc,
      rooms: {
        ...doc.rooms,
        [roomId]: {
          ...room,
          layers: next.length ? next : undefined,
        },
      },
    });
  };

  const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("read failed"));
      reader.readAsDataURL(file);
    });

  const addLayerFromFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const urls: string[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      const url = await readFileAsDataUrl(file);
      if (isSafeMediaUrl(url)) urls.push(url);
    }
    if (!urls.length) {
      toast({
        title: "No usable images",
        description: "Use PNG/JPG/WebP/SVG under the media allowlist.",
        variant: "destructive",
      });
      return;
    }
    const id = suggestId("layer", `layer_${layers.length + 1}`);
    const layer: RoomLayer = {
      id,
      image: urls[0]!,
      depth,
      opacity,
      parallax: 0,
      ...(animClass ? { animClass } : {}),
      ...(urls.length > 1 ? { frames: urls, fps } : {}),
    };
    setLayers([...layers, layer]);
    toast({
      title: "Layer added",
      description:
        urls.length > 1
          ? `${id} — ${urls.length} frames @ ${fps} fps`
          : `${id} — static overlay`,
    });
  };

  return (
    <section className="border border-game-border bg-game-ui/90 p-4 space-y-3">
      <div>
        <h3 className="pixel-font text-sm text-accent">Atmosphere & layers</h3>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          Particle beds (stars, rain…) plus image overlays. Multi-select images
          when adding a layer to make a short pixel loop.
        </p>
      </div>

      <label className="block text-xs space-y-1">
        <span className="text-muted-foreground">Particle bed</span>
        <select
          className="w-full bg-background border border-border px-2 py-2 min-h-[36px]"
          value={particles}
          onChange={(e) => setParticles(e.target.value as RoomParticles)}
        >
          {PARTICLE_OPTS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <label className="space-y-1">
          <span className="text-muted-foreground">New layer depth</span>
          <select
            className="w-full bg-background border border-border px-2 py-2"
            value={depth}
            onChange={(e) => setDepth(Number(e.target.value))}
          >
            <option value={-1}>Behind (−1)</option>
            <option value={1}>Front (+1)</option>
            <option value={2}>Front (+2)</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-muted-foreground">Motion</span>
          <select
            className="w-full bg-background border border-border px-2 py-2"
            value={animClass}
            onChange={(e) =>
              setAnimClass(e.target.value as SceneAnimClass | "")
            }
          >
            {ANIM_OPTS.map((o) => (
              <option key={o.id || "none"} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-muted-foreground">Opacity</span>
          <input
            type="number"
            min={0.1}
            max={1}
            step={0.05}
            className="w-full bg-background border border-border px-2 py-2"
            value={opacity}
            onChange={(e) => setOpacity(Number(e.target.value) || 0.85)}
          />
        </label>
        <label className="space-y-1">
          <span className="text-muted-foreground">Loop fps</span>
          <input
            type="number"
            min={1}
            max={12}
            className="w-full bg-background border border-border px-2 py-2"
            value={fps}
            onChange={(e) => setFps(Number(e.target.value) || 4)}
          />
        </label>
      </div>

      <label className="block">
        <span className="pixel-font text-[10px] text-accent">
          Add overlay image(s)
        </span>
        <input
          type="file"
          accept="image/*"
          multiple
          className="mt-1 block w-full text-xs"
          onChange={(e) => {
            void addLayerFromFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </label>

      {layers.length > 0 && (
        <ul className="space-y-2">
          {layers.map((l) => (
            <li
              key={l.id}
              className="border border-border/60 px-2 py-2 flex gap-2 items-center text-xs"
            >
              <img
                src={l.frames?.[0] || l.image}
                alt=""
                className="w-10 h-10 object-contain bg-black/40 border border-border shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="pixel-font text-[11px] text-foreground truncate">
                  {l.id}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  depth {l.depth ?? 0}
                  {l.frames?.length ? ` · ${l.frames.length}f` : ""}
                  {l.animClass ? ` · ${l.animClass}` : ""}
                </div>
              </div>
              <button
                type="button"
                className="pixel-font text-[10px] min-h-[32px] px-2 border border-game-border text-muted-foreground"
                onClick={() => setLayers(layers.filter((x) => x.id !== l.id))}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
