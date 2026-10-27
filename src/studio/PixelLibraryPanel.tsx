import {
  PIXEL_LIBRARIES,
  pixelLibraryGalleries,
  type PixelLibraryEntry,
} from "@/studio/pixelLibraries";

function LibraryRow({ lib }: { lib: PixelLibraryEntry }) {
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
    </li>
  );
}

/**
 * Curated free pixel-art galleries — open download pages; import PNGs via Upload.
 */
export function PixelLibraryPanel({
  compact,
}: {
  compact?: boolean;
}) {
  const galleries = pixelLibraryGalleries();
  const packs = PIXEL_LIBRARIES.filter((e) => e.kind !== "gallery");

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
            <LibraryRow key={lib.id} lib={lib} />
          ))}
        </ul>
      </div>
    </section>
  );
}
