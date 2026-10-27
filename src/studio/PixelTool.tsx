import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ASSET_PRESETS,
  type AssetPresetId,
  canvasToBlob,
  downloadBlob,
  pixelate,
  type DitherMode,
  DEFAULT_GAME_PALETTE,
} from "@/studio/pixelate";
import { createImageObjectUrl, safeMediaUrl } from "@/engine/security";
import { PROMPT_LIBRARY, promptsForPreset } from "@/studio/promptLibrary";
import {
  applyArtToPackDraft,
  listPackActorIds,
  listPackItemIds,
  listPackRoomIds,
  type PackArtTarget,
} from "@/studio/packArtBridge";
import { PixelLibraryPanel } from "@/studio/PixelLibraryPanel";
import { toast } from "@/hooks/use-toast";

const PRESET_PROMPTS: Record<AssetPresetId, string> = {
  room: PROMPT_LIBRARY.find((p) => p.id === "attic-room")!.prompt,
  item: PROMPT_LIBRARY.find((p) => p.id === "brass-key")!.prompt,
  portrait: PROMPT_LIBRARY.find((p) => p.id === "hero-portrait")!.prompt,
  character: PROMPT_LIBRARY.find((p) => p.id === "npc-shop")!.prompt,
  comic: PROMPT_LIBRARY.find((p) => p.id === "comic-lamp")!.prompt,
};

async function blobUrlToDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

const IMAGE_GEN_GUIDE_URL =
  "https://github.com/aarondavidson/Pick-Script/blob/main/docs/IMAGE-GEN-STARTER.md";

/**
 * Upload / pixel-clean pack art (rooms, items, characters).
 * Authors bring their own art; prompts are suggestions for their own image tool.
 */
export function PixelTool() {
  const [params] = useSearchParams();
  const sendParam = params.get("send");
  const [presetId, setPresetId] = useState<AssetPresetId>(
    sendParam === "room" ? "room" : sendParam === "item" ? "item" : "item"
  );
  const [prompt, setPrompt] = useState(PRESET_PROMPTS.item);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [dither, setDither] = useState<DitherMode>("floyd-steinberg");
  const [useGamePalette, setUseGamePalette] = useState(true);
  const [filename, setFilename] = useState("item.png");
  const [sendTarget, setSendTarget] = useState<PackArtTarget>(
    sendParam === "item" ? "item" : "room"
  );
  const [roomId, setRoomId] = useState("");
  const [itemId, setItemId] = useState("");
  const [itemName, setItemName] = useState("New item");
  const [actorId, setActorId] = useState("player");
  const [rooms, setRooms] = useState<Array<{ id: string; name: string }>>([]);
  const [items, setItems] = useState<Array<{ id: string; name: string }>>([]);
  const [actors, setActors] = useState<Array<{ id: string; name: string }>>([]);
  const resultUrlRef = useRef<string | null>(null);

  const preset = ASSET_PRESETS[presetId];
  const library = promptsForPreset(presetId);

  useEffect(() => {
    void listPackRoomIds().then((r) => {
      setRooms(r);
      if (r[0]) setRoomId(r[0].id);
    });
    void listPackItemIds().then(setItems);
    void listPackActorIds().then((a) => {
      setActors(a);
      if (a[0]) setActorId(a[0].id);
    });
  }, []);

  useEffect(() => {
    setFilename(preset.filename);
    setPrompt(PRESET_PROMPTS[presetId]);
    if (presetId === "room") setSendTarget("room");
    if (presetId === "item") setSendTarget("item");
    if (presetId === "character") setSendTarget("character");
    if (presetId === "portrait") setSendTarget("portrait");
  }, [presetId, preset.filename]);

  const runPixelate = useCallback(
    async (src: string) => {
      setBusy(true);
      setError(null);
      try {
        const canvas = await pixelate(src, {
          pixelWidth: preset.pixelWidth,
          pixelHeight: Math.round(
            preset.pixelWidth * (preset.outputHeight / preset.outputWidth)
          ),
          dither,
          ditherStrength: 0.7,
          palette: useGamePalette ? [...DEFAULT_GAME_PALETTE] : null,
          maxColors: 32,
          outputWidth: preset.outputWidth,
          outputHeight: preset.outputHeight,
        });
        const blob = await canvasToBlob(canvas, preset.mime);
        if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
        const url = URL.createObjectURL(blob);
        resultUrlRef.current = url;
        setResultUrl(url);
        setInfo(
          `Pixelated → ${preset.outputWidth}×${preset.outputHeight}. Send to pack or download.`
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Pixelate failed");
      } finally {
        setBusy(false);
      }
    },
    [preset, dither, useGamePalette]
  );

  useEffect(() => {
    if (!sourceUrl) return;
    void runPixelate(sourceUrl);
  }, [sourceUrl, runPixelate]);

  const onCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      toast({
        title: "Prompt copied",
        description: "Paste it into your image tool.",
      });
    } catch {
      toast({
        title: "Copy failed",
        description: "Select the prompt text and copy it manually.",
        variant: "destructive",
      });
    }
  };

  const onUpload = (file: File | null) => {
    if (!file) return;
    setError(null);
    setInfo(null);
    try {
      const url = createImageObjectUrl(file);
      if (sourceUrl?.startsWith("blob:")) URL.revokeObjectURL(sourceUrl);
      setSourceUrl(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Image rejected");
      toast({
        title: "Image rejected",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    }
  };

  const onDownload = async () => {
    if (!resultUrl) return;
    const res = await fetch(resultUrl);
    const blob = await res.blob();
    downloadBlob(blob, filename);
  };

  const onSendToPack = async () => {
    if (!resultUrl) return;
    try {
      const dataUrl = await blobUrlToDataUrl(resultUrl);
      const next = await applyArtToPackDraft({
        dataUrl,
        target: sendTarget,
        roomId: roomId || undefined,
        itemId: itemId || undefined,
        itemName: itemName || undefined,
        actorId: actorId || undefined,
      });
      toast({
        title: "Sent to pack draft",
        description:
          sendTarget === "room"
            ? `Room art updated on ${roomId || next.startRoom}`
            : sendTarget === "character"
              ? `Costume set on ${actorId || "player"}`
              : sendTarget === "portrait"
                ? `Portrait set on ${actorId || "player"}`
                : `Item icon saved (${itemId || itemName})`,
      });
      setInfo("Applied to Pack draft — open Pack tab to preview.");
      void listPackItemIds().then(setItems);
      void listPackActorIds().then(setActors);
    } catch (e) {
      toast({
        title: "Send failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-3 border border-game-border bg-game-ui/80 text-sm">
        <p className="text-muted-foreground leading-relaxed">
          Bring your own art: draw it, use a free asset library, or generate it
          with any image AI you like. Copy a suggested prompt below, then{" "}
          <strong className="font-normal text-foreground">Upload</strong> the
          result to pixel-clean it.{" "}
          <a
            href={IMAGE_GEN_GUIDE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline"
          >
            Image generation guide
          </a>
        </p>
        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
          After pixelate,{" "}
          <strong className="font-normal text-foreground">Send to pack</strong>{" "}
          writes room art or item icons into the Pack draft — no download hop.
          Need art fast? Browse free CC0 libraries below, download PNGs, then
          Upload.
        </p>
      </div>

      <PixelLibraryPanel />

      <div className="grid md:grid-cols-2 gap-6">
        <section className="space-y-4 border border-game-border bg-game-ui/90 p-4">
          <label className="block space-y-1">
            <span className="pixel-font text-xs text-accent">Preset</span>
            <select
              className="w-full bg-background border border-border px-3 py-2 text-sm min-h-[44px]"
              value={presetId}
              onChange={(e) => setPresetId(e.target.value as AssetPresetId)}
            >
              {(Object.keys(ASSET_PRESETS) as AssetPresetId[]).map((id) => (
                <option key={id} value={id}>
                  {ASSET_PRESETS[id].label}
                </option>
              ))}
            </select>
            <span className="text-xs text-muted-foreground">{preset.hint}</span>
          </label>

          {library.length > 0 && (
            <label className="block space-y-1">
              <span className="pixel-font text-xs text-accent">
                Prompt suggestions
              </span>
              <select
                className="w-full bg-background border border-border px-3 py-2 text-sm min-h-[40px]"
                defaultValue=""
                onChange={(e) => {
                  const entry = library.find((p) => p.id === e.target.value);
                  if (entry) setPrompt(entry.prompt);
                }}
              >
                <option value="" disabled>
                  Curated prompts…
                </option>
                {library.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="block space-y-1">
            <span className="pixel-font text-xs text-accent">
              Prompt (for your image tool)
            </span>
            <textarea
              className="w-full bg-background border border-border px-3 py-2 text-sm min-h-[100px]"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void onCopyPrompt()}
              className="pixel-font text-xs min-h-[44px] px-4 border-2 border-accent bg-accent/15 hover:bg-accent/25"
            >
              Copy prompt
            </button>
            <label className="pixel-font text-xs min-h-[44px] px-4 border border-game-border bg-secondary/40 hover:bg-secondary/60 inline-flex items-center cursor-pointer">
              Upload image
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onUpload(e.target.files?.[0] ?? null)}
              />
            </label>
            {sourceUrl && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void runPixelate(sourceUrl)}
                className="pixel-font text-xs min-h-[44px] px-4 border border-game-border hover:bg-secondary/40 disabled:opacity-40"
              >
                Re-pixelate
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="pixel-font text-xs text-muted-foreground">
                Dither
              </span>
              <select
                className="w-full bg-background border border-border px-2 py-2 text-sm min-h-[40px]"
                value={dither}
                onChange={(e) => setDither(e.target.value as DitherMode)}
              >
                <option value="floyd-steinberg">Floyd–Steinberg</option>
                <option value="ordered">Ordered</option>
                <option value="none">None</option>
              </select>
            </label>
            <label className="flex items-end gap-2 min-h-[40px] pb-2">
              <input
                type="checkbox"
                checked={useGamePalette}
                onChange={(e) => setUseGamePalette(e.target.checked)}
              />
              <span className="text-xs text-muted-foreground">Game palette</span>
            </label>
          </div>

          <label className="block space-y-1">
            <span className="pixel-font text-xs text-muted-foreground">
              Download filename
            </span>
            <input
              className="w-full bg-background border border-border px-3 py-2 text-sm min-h-[40px]"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
            />
          </label>

          {error && (
            <p className="text-sm text-destructive border border-destructive/40 p-2">
              {error}
            </p>
          )}
          {info && !error && (
            <p className="text-sm text-muted-foreground">{info}</p>
          )}
        </section>

        <section className="space-y-4">
          <div className="border border-game-border bg-game-ui/90 p-3">
            <p className="pixel-font text-xs text-accent mb-2">Source</p>
            <div className="aspect-video bg-black/40 flex items-center justify-center overflow-hidden">
              {safeMediaUrl(sourceUrl) ? (
                <img
                  src={safeMediaUrl(sourceUrl)!}
                  alt="Source"
                  className="max-w-full max-h-full object-contain"
                  style={{ imageRendering: "pixelated" }}
                />
              ) : (
                <span className="text-xs text-muted-foreground">
                  Upload an image
                </span>
              )}
            </div>
          </div>
          <div className="border border-game-border bg-game-ui/90 p-3 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <p className="pixel-font text-xs text-accent">Pack-ready</p>
              <button
                type="button"
                disabled={!resultUrl}
                onClick={() => void onDownload()}
                className="pixel-font text-xs px-3 py-1.5 border border-accent disabled:opacity-40"
              >
                Download
              </button>
            </div>
            <div className="aspect-video bg-black/40 flex items-center justify-center overflow-hidden">
              {safeMediaUrl(resultUrl) ? (
                <img
                  src={safeMediaUrl(resultUrl)!}
                  alt="Result"
                  className="max-w-full max-h-full object-contain"
                  style={{ imageRendering: "pixelated" }}
                />
              ) : (
                <span className="text-xs text-muted-foreground">
                  Pixel output
                </span>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground pixel-font">
              {preset.outputWidth}×{preset.outputHeight} · {preset.mime}
            </p>

            <div className="border-t border-border pt-3 space-y-2">
              <p className="pixel-font text-[10px] text-accent">Send to pack</p>
              <label className="block text-xs space-y-1">
                <span className="text-muted-foreground">Target</span>
                <select
                  className="w-full bg-background border border-border px-2 py-2 min-h-[40px]"
                  value={sendTarget}
                  onChange={(e) =>
                    setSendTarget(e.target.value as PackArtTarget)
                  }
                >
                  <option value="room">Current room background</option>
                  <option value="item">Inventory item icon</option>
                  <option value="character">Character costume (walk sprite)</option>
                  <option value="portrait">Speech portrait</option>
                </select>
              </label>
              {(sendTarget === "character" || sendTarget === "portrait") && (
                <label className="block text-xs space-y-1">
                  <span className="text-muted-foreground">Actor</span>
                  <select
                    className="w-full bg-background border border-border px-2 py-2 min-h-[40px]"
                    value={actorId}
                    onChange={(e) => setActorId(e.target.value)}
                  >
                    {actors.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.id})
                      </option>
                    ))}
                    {!actors.some((a) => a.id === "player") && (
                      <option value="player">You (player)</option>
                    )}
                  </select>
                </label>
              )}
              {sendTarget === "room" && (
                <label className="block text-xs space-y-1">
                  <span className="text-muted-foreground">Room</span>
                  <select
                    className="w-full bg-background border border-border px-2 py-2 min-h-[40px]"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                  >
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.id})
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {sendTarget === "item" && (
                <>
                  <label className="block text-xs space-y-1">
                    <span className="text-muted-foreground">
                      Existing item (optional)
                    </span>
                    <select
                      className="w-full bg-background border border-border px-2 py-2 min-h-[40px]"
                      value={itemId}
                      onChange={(e) => {
                        setItemId(e.target.value);
                        const hit = items.find((i) => i.id === e.target.value);
                        if (hit) setItemName(hit.name);
                      }}
                    >
                      <option value="">— new item —</option>
                      {items.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.name} ({i.id})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-xs space-y-1">
                    <span className="text-muted-foreground">Item name</span>
                    <input
                      className="w-full bg-background border border-border px-2 py-2 min-h-[40px]"
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                    />
                  </label>
                </>
              )}
              <button
                type="button"
                disabled={!resultUrl}
                onClick={() => void onSendToPack()}
                className="pixel-font text-xs min-h-[44px] w-full border-2 border-primary text-primary disabled:opacity-40"
              >
                Send to pack draft
              </button>
              <Link
                to="/pick"
                className="block text-center text-[11px] text-primary underline"
              >
                Open Pack tab
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
