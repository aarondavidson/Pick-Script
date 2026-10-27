import { useEffect, useState } from "react";
import {
  creditForLibrary,
  PIXEL_LIBRARIES,
  pixelLibraryGalleries,
  type PixelLibraryEntry,
} from "@/studio/pixelLibraries";
import { formatCredit, mergeCredits } from "@/engine";
import type { JsonPackDocument } from "@/engine/jsonPack";
import { loadPackDraftAsync, savePackDraftAsync } from "@/studio/packDraftIdb";
import { toast } from "@/hooks/use-toast";

function LibraryRow({
  lib,
  credited,
  onCredit,
}: {
  lib: PixelLibraryEntry;
  credited?: boolean;
  onCredit?: () => void;
}) {
  return (
    <li className="border border-border/80 px-3 py-2 text-xs space-y-1">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <a
          href={lib.url}
          target="_blank"
          rel="noopener noreferrer"
          className="pixel-font text-accent hover:underline"
        >
          {lib.name} ↗
        </a>
        <span className="text-[10px] text-primary pixel-font">
          {lib.license}
        </span>
      </div>
      <p className="text-muted-foreground leading-relaxed">{lib.blurb}</p>
      <p className="text-[10px] text-muted-foreground">
        {lib.author} · {lib.goodFor.filter((g) => g !== "gallery").join(" · ")}
      </p>
      {lib.tip && (
        <p className="text-[10px] text-primary/90 leading-relaxed">{lib.tip}</p>
      )}
      {onCredit && (
        <button
          type="button"
          disabled={credited}
          onClick={onCredit}
          className="pixel-font text-[10px] px-2 py-1 border border-primary/60 text-primary disabled:opacity-50"
        >
          {credited ? "Credited ✓" : "Add credit to pack"}
        </button>
      )}
    </li>
  );
}

/**
 * Curated free pixel-art galleries — open download pages; import PNGs via Upload.
 * Packs can be credited into the draft (shown to players in Settings).
 * Pass `doc` + `onChange` when the parent owns the draft (Pack tab);
 * otherwise the panel loads / saves the stored draft itself.
 */
export function PixelLibraryPanel({
  compact,
  doc,
  onChange,
}: {
  compact?: boolean;
  doc?: JsonPackDocument;
  onChange?: (next: JsonPackDocument) => void;
}) {
  const galleries = pixelLibraryGalleries();
  const packs = PIXEL_LIBRARIES.filter((e) => e.kind !== "gallery");
  const [ownDoc, setOwnDoc] = useState<JsonPackDocument | null>(null);
  const current = doc ?? ownDoc;
  const credits = current?.credits ?? [];

  useEffect(() => {
    if (doc) return;
    void loadPackDraftAsync().then(setOwnDoc);
  }, [doc]);

  const commit = async (next: JsonPackDocument) => {
    if (onChange) {
      onChange(next);
      return;
    }
    try {
      await savePackDraftAsync(next);
      setOwnDoc(next);
    } catch (e) {
      toast({
        title: "Could not save credits",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    }
  };

  const isCredited = (lib: PixelLibraryEntry) =>
    credits.some((c) => c.url === creditForLibrary(lib).url);

  const addCredit = (lib: PixelLibraryEntry) => {
    if (!current) return;
    const credit = creditForLibrary(lib);
    void commit({ ...current, credits: mergeCredits(credits, [credit]) });
    toast({ title: "Credit added", description: formatCredit(credit) });
  };

  const removeCredit = (index: number) => {
    if (!current) return;
    void commit({ ...current, credits: credits.filter((_, i) => i !== index) });
  };

  return (
    <section
      className={
        compact
          ? "space-y-2"
          : "border border-game-border bg-game-ui/90 p-4 space-y-3"
      }
      aria-label="Free pixel art libraries"
    >
      <div>
        <h3 className="pixel-font text-sm text-accent">
          Free pixel art sources
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed mt-1">
          Browse a gallery → download PNGs →{" "}
          <strong className="font-normal text-foreground">Upload</strong> in
          Pixels or Pack → Send / Apply to pack. Prefer{" "}
          <strong className="font-normal text-foreground">CC0</strong>; always
          re-check the license on the page.
        </p>
      </div>

      <div>
        <p className="pixel-font text-[10px] text-primary uppercase tracking-widest mb-2">
          Galleries (start here)
        </p>
        <ul className="space-y-2 max-h-56 overflow-y-auto">
          {galleries.map((lib) => (
            <LibraryRow key={lib.id} lib={lib} />
          ))}
        </ul>
      </div>

      <div>
        <p className="pixel-font text-[10px] text-muted-foreground uppercase tracking-widest mb-2">
          Ready-made packs
        </p>
        <ul className="space-y-2 max-h-48 overflow-y-auto">
          {packs.map((lib) => (
            <LibraryRow
              key={lib.id}
              lib={lib}
              credited={isCredited(lib)}
              onCredit={current ? () => addCredit(lib) : undefined}
            />
          ))}
        </ul>
      </div>

      <div>
        <p className="pixel-font text-[10px] text-muted-foreground uppercase tracking-widest mb-2">
          Pack credits ({credits.length})
        </p>
        <p className="text-[10px] text-muted-foreground leading-relaxed mb-2">
          Players see these in Settings → Credits. Credit what you use — it’s required for
          CC-BY assets and appreciated for CC0.
        </p>
        {credits.length > 0 && (
          <ul className="space-y-1">
            {credits.map((c, i) => (
              <li
                key={`${i}-${c.work}`}
                className="flex items-center justify-between gap-2 text-xs"
              >
                <span className="text-muted-foreground">{formatCredit(c)}</span>
                <button
                  type="button"
                  onClick={() => removeCredit(i)}
                  className="text-[10px] text-destructive underline shrink-0"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
