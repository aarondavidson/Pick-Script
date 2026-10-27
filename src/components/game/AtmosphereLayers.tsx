import type { Room, RoomLayer } from "@/engine";
import { cssPlayUrlValue } from "@/engine/security";
import { sceneAnimClassName, useFrameCycle } from "@/hooks/useFrameCycle";

interface AtmosphereLayersProps {
  room: Room;
  /** Camera translate % from runtime.cameraToTranslate */
  camTranslate: { x: number; y: number };
  /** "behind" = depth < 0; "front" = depth >= 0 */
  layer: "behind" | "front";
}

function LayerImage({
  layer,
  camTranslate,
}: {
  layer: RoomLayer;
  camTranslate: { x: number; y: number };
}) {
  const parallax = layer.parallax ?? 0;
  const ox = camTranslate.x * parallax;
  const oy = camTranslate.y * parallax;
  const frameUrl = useFrameCycle(layer.frames, layer.fps ?? 4);
  const staticUrl = layer.image;
  const active = frameUrl || staticUrl;
  const bg = cssPlayUrlValue(active);
  if (!bg) return null;
  const animCls = sceneAnimClassName(layer.animClass);
  return (
    <div
      className={`absolute inset-0 bg-cover bg-center pointer-events-none ${animCls}`.trim()}
      style={{
        backgroundImage: bg,
        opacity: layer.opacity ?? 1,
        transform: `translate(${ox}%, ${oy}%)`,
        zIndex: layer.depth ?? 0,
      }}
      data-layer={layer.id}
    />
  );
}

function ParticleBed({ kind }: { kind: NonNullable<Room["particles"]> }) {
  if (!kind || kind === "none") return null;
  const cls =
    kind === "rain"
      ? "atmosphere-particles atmosphere-rain"
      : kind === "dust"
        ? "atmosphere-particles atmosphere-dust"
        : kind === "sparks"
          ? "atmosphere-particles atmosphere-sparks"
          : kind === "fog"
            ? "atmosphere-particles atmosphere-fog"
            : kind === "stars"
              ? "atmosphere-particles atmosphere-stars"
              : kind === "sparkle"
                ? "atmosphere-particles atmosphere-sparkle"
                : kind === "fireflies"
                  ? "atmosphere-particles atmosphere-fireflies"
                  : null;
  if (!cls) return null;
  return (
    <div className={`absolute inset-0 pointer-events-none ${cls}`} aria-hidden />
  );
}

/**
 * Parallax room layers + lightweight particle bed.
 * Supports looping `frames` / `animClass` on layers and night sky particles.
 */
export function AtmosphereLayers({
  room,
  camTranslate,
  layer,
}: AtmosphereLayersProps) {
  const layers = (room.layers ?? []).filter((l) =>
    layer === "behind" ? (l.depth ?? 0) < 0 : (l.depth ?? 0) >= 0
  );

  return (
    <>
      {layers.map((l) => (
        <LayerImage key={l.id} layer={l} camTranslate={camTranslate} />
      ))}
      {layer === "front" && room.particles && room.particles !== "none" && (
        <ParticleBed kind={room.particles} />
      )}
    </>
  );
}
