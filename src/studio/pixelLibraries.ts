/**
 * Curated free (CC0 / permissive) pixel-art galleries for Studio authors.
 * Links only — we do not redistribute third-party zips in the repo.
 * Prefer CC0; always re-check the license badge on the source page.
 */

export interface PixelLibraryEntry {
  id: string;
  name: string;
  author: string;
  license: string;
  /** Short why-it-helps for adventure packs */
  blurb: string;
  /** Best use in this engine */
  goodFor: string[];
  url: string;
  /** Optional tip for download / import */
  tip?: string;
  /** Gallery hub vs single pack */
  kind?: "gallery" | "pack";
}

/** Hand-picked galleries + packs that map well to point-and-click rooms / props / items. */
export const PIXEL_LIBRARIES: PixelLibraryEntry[] = [
  // --- Browse hubs (start here) ---
  {
    id: "itch-cc0-pixel",
    name: "itch.io — CC0 Pixel Art",
    author: "itch.io community",
    license: "CC0 (filtered)",
    blurb:
      "Largest searchable gallery of CC0 pixel packs — rooms, items, characters, tiles.",
    goodFor: ["rooms", "items", "characters", "gallery"],
    url: "https://itch.io/game-assets/assets-cc0/tag-pixel-art",
    tip: "Sort by downloads. Open a pack → Download → Upload PNG into Pixels or Pack.",
    kind: "gallery",
  },
  {
    id: "opengameart",
    name: "OpenGameArt — 2D Art",
    author: "Community",
    license: "Varies (filter CC0)",
    blurb: "Long-running free art hub. Filter license to CC0 before you ship.",
    goodFor: ["rooms", "items", "characters", "gallery"],
    url: "https://opengameart.org/art-search-advanced?keys=&field_art_type_tid%5B%5D=9&field_art_licenses_tid%5B%5D=14&sort_by=count&sort_order=DESC",
    tip: "License → CC0 / Public Domain. Art Type → 2D Art.",
    kind: "gallery",
  },
  {
    id: "kenney-hub",
    name: "Kenney Asset Library",
    author: "Kenney",
    license: "CC0",
    blurb:
      "Trusted free catalog — pixel packs for rooms, UI, furniture, and prototypes.",
    goodFor: ["rooms", "items", "UI", "gallery"],
    url: "https://kenney.nl/assets?q=pixel",
    tip: "Attribution optional but appreciated. Download ZIP → extract PNGs → Upload.",
    kind: "gallery",
  },
  {
    id: "craftpix-free",
    name: "CraftPix — Free assets",
    author: "CraftPix",
    license: "Free license (check pack)",
    blurb:
      "Free 2D kits and backgrounds (many pixel). Good for quick room placeholders.",
    goodFor: ["rooms", "characters", "UI", "gallery"],
    url: "https://craftpix.net/freebies/",
    tip: "Read each freebie’s license line — not everything is CC0.",
    kind: "gallery",
  },
  {
    id: "lospec",
    name: "Lospec Palette & Gallery",
    author: "Lospec",
    license: "Varies per asset",
    blurb: "Palettes + pixel gallery — great with Studio pixelate / color limits.",
    goodFor: ["palettes", "inspiration", "gallery"],
    url: "https://lospec.com/gallery",
    tip: "Also browse lospec.com/palette-list for pixelate presets.",
    kind: "gallery",
  },
  {
    id: "pixor-library",
    name: "Pixor — CC0 sprite packs",
    author: "Pixor",
    license: "CC0",
    blurb:
      "Category ZIPs (pickups, interior, kitchen, dungeon…) with sprite sheets — ideal inventory icons.",
    goodFor: ["items", "props", "furniture", "gallery"],
    url: "https://pixor.art/library/packs/",
    tip: "Start with Pickups or Interior. No account required.",
    kind: "gallery",
  },

  // --- Strong single packs ---
  {
    id: "kenney-roguelike-rpg",
    name: "Roguelike / RPG Pack (1700+ tiles)",
    author: "Kenney",
    license: "CC0",
    blurb:
      "16×16 floors, walls, furniture, doors — stitch into room backgrounds or prop sheets.",
    goodFor: ["rooms", "furniture", "props"],
    url: "https://opengameart.org/content/roguelikerpg-pack-1700-tiles",
    kind: "pack",
  },
  {
    id: "kenney-indoors",
    name: "Roguelike Indoors",
    author: "Kenney",
    license: "CC0",
    blurb: "Indoor furniture and kitchen pieces for attic / apartment / HQ rooms.",
    goodFor: ["rooms", "furniture"],
    url: "https://kenney.nl/assets/roguelike-indoors",
    kind: "pack",
  },
  {
    id: "kenney-ui-adventure",
    name: "UI Pack — Pixel Adventure",
    author: "Kenney",
    license: "CC0",
    blurb: "500+ adventure-themed UI sprites — inventory frames, buttons, badges.",
    goodFor: ["UI", "items"],
    url: "https://opengameart.org/content/ui-pack-pixel-adventure",
    kind: "pack",
  },
  {
    id: "kenney-1bit",
    name: "1-Bit Pack",
    author: "Kenney",
    license: "CC0",
    blurb: "1000+ tiles/characters/items — rapid prototypes and silhouette style.",
    goodFor: ["prototype", "items", "characters"],
    url: "https://opengameart.org/content/1-bit-pack",
    kind: "pack",
  },
  {
    id: "kenney-tiny-dungeon",
    name: "Tiny Dungeon",
    author: "Kenney",
    license: "CC0",
    blurb: "Dungeon tiles, weapons, items, characters — warehouse / basement vibes.",
    goodFor: ["rooms", "items", "characters"],
    url: "https://kenney-assets.itch.io/tiny-dungeon",
    kind: "pack",
  },
  {
    id: "stealthix-backgrounds",
    name: "Pixel-Art Backgrounds",
    author: "stealthix",
    license: "CC0",
    blurb: "Nine hand-drawn backgrounds — quick full-bleed room art starters.",
    goodFor: ["rooms"],
    url: "https://opengameart.org/content/pixel-art-backgrounds-0",
    tip: "Upscale with nearest-neighbor in Pixels, then Send to pack.",
    kind: "pack",
  },
  {
    id: "oga-cc0-backgrounds",
    name: "CC0 Backgrounds (collection)",
    author: "Technopeasant (curator)",
    license: "CC0 (listed)",
    blurb: "Curated OGA list of CC0 scenery / room-like backdrops.",
    goodFor: ["rooms", "gallery"],
    url: "https://opengameart.org/content/cc0-backgrounds",
    tip: "Open each linked pack and confirm CC0 on that page.",
    kind: "gallery",
  },
  {
    id: "pixel-frog-adventure",
    name: "Pixel Adventure",
    author: "Pixel Frog",
    license: "CC0",
    blurb: "Characters, objects, tilesets — colorful adventure props and pickups.",
    goodFor: ["items", "characters", "props"],
    url: "https://pixelfrog-assets.itch.io/pixel-adventure-1",
    kind: "pack",
  },
  {
    id: "ansimuz-grotto",
    name: "Super Grotto Escape Pack",
    author: "ansimuz",
    license: "CC0",
    blurb: "16×16 cave/ruins tiles, props, VFX — atmospheric adventure rooms.",
    goodFor: ["rooms", "props", "VFX"],
    url: "https://ansimuz.itch.io/super-grotto-escape-pack",
    kind: "pack",
  },
  {
    id: "ansimuz-gothicvania",
    name: "Gothicvania Town",
    author: "ansimuz",
    license: "CC0",
    blurb: "Complete town scene kit — streets, buildings, props for outdoor rooms.",
    goodFor: ["rooms", "props"],
    url: "https://ansimuz.itch.io/gothicvania-town",
    kind: "pack",
  },
];

export function pixelLibrariesForTag(tag: string): PixelLibraryEntry[] {
  const t = tag.toLowerCase();
  return PIXEL_LIBRARIES.filter(
    (e) =>
      e.goodFor.some((g) => g.toLowerCase().includes(t)) ||
      e.blurb.toLowerCase().includes(t) ||
      e.kind === t
  );
}

/** Gallery hubs first — best “where do I start?” list for authors. */
export function pixelLibraryGalleries(): PixelLibraryEntry[] {
  return PIXEL_LIBRARIES.filter((e) => e.kind === "gallery");
}
