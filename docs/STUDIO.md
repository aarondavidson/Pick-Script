# Design studio (P.I.C.K.)

**In plain words:** this is the **maker workshop** where you build a game with rooms, pictures, and clickable spots — then play-test and download it.

**Open it at:** `/pick` (older bookmark `/studio` still works).  
Tabs: Pack · Pixels · Hotspots · Scene · Audio · Combines.

Everyday path (no code): **[HOW-TO.md](./HOW-TO.md)** · short funnel: **[ENGINE-LANDING.md](./ENGINE-LANDING.md)**.

Prefer the **Pack** tab: one self-contained game file (`.pack.json` with pictures inside). Advanced tabs can still spit out code snippets for TypeScript packs. API keys never ship in the player app.

### First-time path (Guided mode)

Guided mode (default) shows **one job at a time**:

1. **New game wizard** → pick a starter (recommend **short-mystery**)
2. **Art handoff** / upload room art → draw a hotspot → Intent Wizard (no scripting)
3. **Ship checklist** + coach tip → Live preview → **Play** / **Publish** / **Download**

Extra panels (items, dialogue, hints…) stay under **Polish…** until the core loop works. Errors use plain “what to do” language. Inventory, verbs, saves, and the map already exist — you add **story and art**, not a new engine.

### Private authoring (you edit; players cannot)

Client apps cannot hide tools from a determined user who owns a build that includes them. The practical gate:

| Build | Studio + Author mode |
|---|---|
| `npm run dev` | Always on |
| Production **without** `VITE_ENABLE_STUDIO` | **Off** — `/studio` unavailable, Settings hides Author mode, launcher hides the studio link |
| Production **with** `VITE_ENABLE_STUDIO=true` | On (optional `VITE_STUDIO_SECRET` + `/studio?unlock=…`) |

**Recommended:** edit packs locally or on a private Vercel preview with the flag; keep the public deploy without `VITE_ENABLE_STUDIO`.

Public builds also enable **strict play** (see `DEPLOY.md` / `ENGINE.md`): installed pack overrides cannot replace shipped game ids, sidecars are ignored, and `/play/studio-draft` redirects home. Use a private preview (`VITE_ENABLE_STUDIO=true`, optionally `VITE_STRICT_PLAY=false`) when you need those author loops.

### Ship / share a finished pack

1. **Publish to launcher** — installs in *this browser* (`localStorage`). Post-publish banner: Play link, copy URL, Download `.pack.json`.
2. **Share the file** — recipients use launcher **Import .pack.json** (no Studio needed), then `/play/<id>`.
3. **Hosted URL** — put the file on any HTTPS host (or `/public/packs/…`) and open `/play?packUrl=https://…/game.pack.json` (or a same-origin `/packs/….pack.json`).
4. **Into this repo** — Download `.pack.json`, then:
   ```sh
   npm run pack-from-json -- ./my-game.pack.json
   npm run verify
   ```
   Extracts images to `src/games/<id>/assets/`, writes `manifest.ts`, registers in `registry.ts`.

### Free pixel art

Pixels tab → **Free pixel art sources** (also linked from Pack when you need room art).

**Galleries (browse first):**
- [itch.io CC0 Pixel Art](https://itch.io/game-assets/assets-cc0/tag-pixel-art)
- [OpenGameArt 2D + CC0 filter](https://opengameart.org/art-search-advanced?keys=&field_art_type_tid%5B%5D=9&field_art_licenses_tid%5B%5D=14&sort_by=count&sort_order=DESC)
- [Kenney](https://kenney.nl/assets?q=pixel) · [CraftPix freebies](https://craftpix.net/freebies/) · [Pixor CC0 packs](https://pixor.art/library/packs/) · [Lospec gallery](https://lospec.com/gallery)

**Flow:** download PNGs → Upload in Pixels or Pack → pixelate / Send to pack. Prefer **CC0**; always re-check the license on the source page.

### Play feel (quests, hints, touch)

- **Objective bar** — first incomplete quest step always shows above the room. Wire `objectiveFlags` (one flag per objective) in Pack → Quests.
- **Hints (H)** — progressive tiers from Pack → Hints; available in live preview too.
- **Validator warnings** — silent hotspots, dead use-with item ids, tiny (&lt;4%) clickables.
- **Guided verb default** — new packs use **coin** (radial Look/Talk/Use) for phones.

### Editing TypeScript packs vs JSON packs

- **TypeScript packs** (e.g. `src/games/attic-study/`) are edited in source. Pack-tab JSON features do **not** round-trip TS specials, comics, or deep dialogue trees. For hotspot % tweaks use **Author mode** in `/play/<id>` (when unlocked).
- **New / Attic-style packs** use the Pack tab (items, dialogue lite, world map/audio, puzzles) end-to-end. **Publish** installs only in that browser’s `localStorage` (never overwrites the GitHub sources). Publishing with a shipped pack's id asks for confirm — it would override that pack **locally only**.

---

## Guided vs Advanced

Studio defaults to **Guided** (prefs in `localStorage` `studio-mode-v1`):

| Mode | Behavior |
|---|---|
| **Guided** | Pack-first tabs (Pack / Pixels / Audio). New Game Wizard, Hotspot Intent Wizard, playtest checklist, draft library, coach **Apply**. Hides Copy TS + Recipes link. |
| **Advanced** | All tabs + Copy TS + raw action JSON + Recipes. |

---

## Tools

| Tab | Purpose |
|---|---|
| **Pack** | New Game Wizard, rooms + art + Intent Wizard hotspots + items/icons + dialogue + map/audio + puzzles + checklist → **Live preview** / **Publish** / **Download .pack.json** |
| **Pixels** | Generate/upload → pixel-clean art; **Send to pack** (room / item); prompt library; batch room+item+char |
| **Audio** | Music cues + SFX bindings; **Apply to pack draft** (not only Copy TS) |
| **Hotspots** | (Advanced) Draw boxes → export hotspot TS |
| **Scene** | (Advanced) Overlay art → pickup / characters |
| **Combines** | (Advanced) Inventory A + B → result recipes |

In play: **Author mode** (`Ctrl+Shift+H` or Settings) — drag existing hotspots, **Add hotspot (draw)** for new areas, copy flags/exits.

---

## Suggested builder loop (Guided, no path hunting)

Primary path — **no `npm run new-pack` required**:

1. **Pack** → **Starter gallery** or **New game wizard** (8 genre kits: blank / key→door / two-room / …)
2. Check **Ship checklist** (`#pack-setup`) — missing room art, dead exits, silent hotspots
3. Upload room art (auto-fits **1920×1080**, optional pixelate) or **Pixels → Send to pack** / free pixel libraries
4. Draw hotspots → **Intent Wizard** (get-item / use-with / locked-exit / talk / give); set **approach points** / **walkboxes** / **regions** on the stage
5. Wire **ActionList** steps on interacts (Guided editor supports ↑↓ reorder) → Live preview → export **Playtest log** if stuck → **Publish to launcher**
6. **Share** — Download `.pack.json` → others **Import** on the launcher home page (no Studio), or `/play?packUrl=…`
7. Optional: **Audio → Apply to pack**; Hotspots/Scene/Combines **Apply to pack**; Advanced for Copy TS / Combines

CLI readiness check:

```sh
npm run pack-doctor -- ./my-game.pack.json
npm run pack-from-json -- ./my-game.pack.json
```

`npm run new-pack` is only for hand-written TypeScript packs.

### Loop accelerators (walk / talk / unlock / puzzle)

| Tool | Where | Job |
|---|---|---|
| **World map graph** | Pack | Drag/click rooms, draw exits, edit flag/item gates on edges |
| **Puzzle graph** | Pack (under ship checklist) | Dependency columns: pickups → items/flags → gated exits, hints, timers, regions; red = soft-lock (never set). Edit: add gated link / suggest unlock |
| **Unlock chain** | Pack | Source (talk / pickup / use-with / combine) → exit gate in one apply |
| **Flag inspector** | Pack | Who sets / who reads each flag; red = never set |
| **Apply recipes** | Pack + `/recipes` | One-click get-item, use-with, locked-exit, combine, talk-gate |
| **Blend packs** | Pack | Merge starter / library / `.pack.json` into draft (layers + rename/skip/overwrite) |
| **Walk regions** | Pack stage | Draw enter-trigger rects (`Room.regions`) — set flag / message on step-in |
| **ActionList** | Pack hotspot | GuidedActionEditor — declarative steps with ↑↓ reorder |
| **Room stub factory** | Pack | N rooms + line/cross links + MISSING ART placeholders |
| **Choice consequences** | Dialogue | Per choice: set/clear flag, give item, which exits unlock |
| **Dialogue playtester** | Dialogue | Click through talk tree; watch flags / inventory / unlocks |
| **State skins** | Stage hotspot | Closed→open overlays (state 0/1) previewed on the hotspot |
| **Soft-lock / stuck** | Ship checklist + pack-doctor | Unreachable rooms, flags never set, unobtainable exit items |

### Authoring accelerators — 11–14 (shipped)

**11. Tone + place** — New game wizard steps 1–2  
Tone: *Mobile mystery*, *Desktop comedy*, *Sunny adventure*, or *Minimal* (`genrePresets.ts`). Place: space, forest, city, office, cyberpunk, European city, California, Deep South, water, adventure (`settingKits.ts`). Seeds music/particles — any tone × any place.

**12. Cutscene from template** — Pack → Cutscenes  
Templates: intro-enter, discovery, escape. Escape can gate an exit + drop a trigger hotspot (`src/authoring/cutsceneTemplates.ts`).

**13. Shared prop / NPC library** — Pack → Prop library  
Drop Guard / Trader / Chest / Desk (key) into a room with art + dialogue / use-with stubs (`src/authoring/propLibrary.ts`, `PropLibraryPanel`).

**14. Blend packs** — Pack → Blend packs  
Compose tone × place × content: keep the current draft as base, pull slices (rooms, items, actors, links, audio, combinations, quests, hints, cutscenes, achievements, flags, i18n, map) from a starter kit, another library draft, or an imported `.pack.json`. Colliding ids rename by default (`src/engine/blendPacks.ts`, `PackBlendPanel`). API: `blendPacks` / `blendPacksMany`.

**Demo pack:** Harbor Fog (`/play/harbor-fog`) — 5 rooms, Harbor Master + Trader, key→chest + coin→trader puzzles, painted room art under `src/games/harbor-fog/assets/`. Built with the same kits/library/templates as Studio.

### Scene animation (pixel overlays)

| Tool | Where | Job |
|---|---|---|
| **Particle bed** | Pack → Atmosphere | `stars` / `sparkle` / `fireflies` / rain / fog / dust / sparks |
| **Overlay layers** | Pack → Atmosphere & layers | Upload 1 image (static) or multi-select (frame loop) + depth / motion |
| **Hotspot frames** | Hotspot JSON / TS | `frames` + `fps` + `animClass` (`twinkle`, `bob`, `sway`, `flicker`, `pulse`) |

Harbor Fog night rooms use **stars**; the shack window and lighthouse beacon use short glow frame loops.


### JSON pack runtime

- Schema: `JsonPackDocument` (`src/engine/jsonPack.ts`)
- Compile: `createGameFromJson(doc)` → `GameDefinition`
- Validate: `validateJsonPack(doc)`
- Draft storage: **IndexedDB** (`adventure-studio`) with `localStorage` mirror (`studio-pack-draft-v1`); undo/redo in Pack tab; play handoff: `sessionStorage`
- Live preview: `PackPreview` + shared `AdventurePlaySurface` (`variant="preview"`)
- Validation issues link to `/recipes#recipe-…` and `/pick?tab=…`
- **Copy TS pack** → `createGameFromJson` manifest with `./assets/<room>.jpg` stubs
- **Items** — catalog + embedded icons bound to pickups (`itemIcons` at compile)
- **Dialogue** — lite talk trees on character hotspots (linear + ≤3 choices, `END`)
- **World** — `mapGroups` / fast-travel + optional **map fog** (reveal/travel flags) + pack music cues
- **Room links** — gated exits can show a **locked label** (visible doorway) or hide until unlocked
- **Puzzles** — use-with rules + inventory combinations; exits can require flag or item
- **Publish to launcher** — installs draft in this browser (`/play/<pack-id>` + home list)
- **Design coach** — optional tips (function + feel) by design phase; **Apply** mutates the draft or focuses the next step; **Dismiss** / **Turn off** (prefs in `localStorage`). Same prefs apply in Author mode.
- **Draft library** — named IndexedDB slots so Reset/Publish does not clobber other ideas
- **Puzzle kits** — forms → JSON (`get-item`, `use-with`, `locked-exit`) without visiting `/recipes`
- **Walkboxes** — draw walkable floors + entry point; **depth scale** (0.7–1.2) and near/far pair for actor foreshortening
- **Walk regions** — enter-trigger rects on the Pack stage (`setFlag`, message, …)
- **Approach points** — click to place where the ego walks before interacting
- **ActionLists** — GuidedActionEditor on hotspot interacts (reorder with ↑↓); ops include message / flags / giveItem / juice / haptic / …
- **Verbs** — pack `verbMode` classic (incl. **Give**) / simple / coin
- **Quests & achievements** — objective bar + journal; pair steps with `objectiveFlags` / `completeFlag` / `unlockFlag`
- **Actors & costumes** — sprite / portrait / idle·walk·talk slots + stage preview; dialogue/cutscene **lip-sync slots** (`mouthCues` / `lipSyncKey`)
- **Audio file beds** — cue → `/audio/*.mp3` (or synth preset); shared music bus + speech ducking
- **Line catalog** — Dialogue → Export CSV (`lineId` + `voiceKey`); Import locale → `pack.i18n`
- **Haptics / juice** — hotspot styles + `{ op: "haptic" }` / `{ op: "juice" }`
- **Cutscene ops** — message / wait / walk / sound / setFlag / music / sayLine
- **Ship checklist / pack doctor** — missing art, dead exits, silent hotspots (`npm run pack-doctor`)
- **Starter gallery** — downloadable genre kits (key-chest, talk-gate, combine, map hub, …)
- **Room art pipeline** — resize to 1920×1080 + optional palette dither on upload
- **Hints / stuck assist** — progressive tiers; idle/fail banner offers next hint
- **Cutscenes** — message / wait / walk / sound steps; play from preview cheats
- **Dialogue graph** — visual node graph + choice jumps / require-flag / set-flag (talk-gates)
- **Playtest cheats** — in Live preview: jump room, give item, toggle flag, play cutscene
- **Playtest log** — export room/flag/inventory timeline (Markdown / JSON) when stuck
- **Ship coach tips** — Publish / Import / pack size when the draft is playable


---

## Pixels (quick start)

```sh
npm run dev
# → http://localhost:8080/studio
```

1. Pick preset: room / item / character / portrait / comic
2. Copy a suggested prompt into your own image tool (see [IMAGE-GEN-STARTER.md](./IMAGE-GEN-STARTER.md)), then **Upload** the result — or upload art you drew / downloaded
3. Pick a **Palette**: the built-in game palette, **Custom** (paste colors), or **Adaptive** (taken from the image)
4. **Send to pack**, or Download → `src/games/<id>/assets/` (items under `assets/items/`)
5. Continue in **Scene** or **Hotspots**

### One palette for every image

Art from different sources (AI, packs, your own drawings) looks like one game when it shares a palette.

1. Pick a palette on [Lospec](https://lospec.com/palette-list) — 16–32 colors is a good size for rooms.
2. Copy its colors (or open the downloaded **HEX**, **GPL** or Paint.NET **TXT** file and copy everything).
3. Pixels → **Palette: Custom** → paste. The swatches show what was read.
4. Keep that palette for every room, item and character in the pack.

### Tiles to room art (Tiled)

Many free packs (Kenney's Roguelike/RPG, 1-Bit, Tiny Dungeon…) ship as **tiles** with Tiled sample maps. Rooms in this engine are one image, so assemble the room first:

1. Install [Tiled](https://www.mapeditor.org/) (free) and open the pack's sample `.tmx` map, or make a new map using the pack's tilesheet.
2. Size the map for 16:9 — with 16×16 tiles, **30×17 tiles** is about 480×272.
3. Leave the lower part of the map as open floor so the player has room to walk.
4. **File → Export As Image**. Turn on **Use current zoom level** and zoom to **400%** first, so the image comes out about 1920×1088. A smaller export gets stretched to 1920×1080 on upload and turns blurry.
5. Upload it in Pack → room art (or Pixels with Dither **None** to remap colors to your palette).
6. Draw hotspots and walkboxes on top — they are invisible click areas, so furniture in the image doesn't need to be separate sprites.

### Ending the game

Pack → **Quests & achievements** → **Game ends when flag**. When that flag turns on — from the final puzzle, a dialogue choice, a cutscene, a pickup (`got_<itemId>`) or a minigame win — players see the win screen. `pack-doctor` notes a pack with no ending, and warns if nothing ever sets the win flag.

### Credits

Free asset packs ask for credit; CC-BY ones **require** it. In the art library (Pixels or Pack tab), **Add credit to pack** on each pack you use. Credits are saved in the pack (`credits`) and players see them in **Settings → Credits** (and on the win screen, for packs that end the game). TypeScript packs can set `credits` on the `GameDefinition` the same way.

---

## Hotspots & pickups

- **Pickup** hotspots grant an inventory item and set `got_<itemId>`
- **Use-with target** stubs `onUseWith` / `useWithResponses`
- **Character** sets `isActor` + `actorId`; Pack → Dialogue authors a lite talk tree

Export is paste-ready for `rooms.<id>.hotspots: [ … ]`.

---

## Audio (music + SFX)

- **Music cues** — map `cue → synth preset` (`calm`, `noir`, `eerie`, …) + optional ambient (`hum`, `rain`, `drip`, …)
- **Room music** — each room sets `music: "<cue>"`; host resolves via `PackAudio`
- **Interact SFX** — hotspot fields `interactSound` / `useWithSound` (built-in keys or `audio.sfx` MP3s)
- **Auto host SFX** — inventory gain → `pickup`; achievement → `success` (no binding needed)
- Preview buttons unlock Web Audio on first click (iOS-safe shared context)

---

## Combines

Matches engine `combinations` keys (`"a+b"`). Result art: make an **Inventory item** in Pixels, then set `icon` on the result object.

---

## Architecture

| Piece | Role |
|---|---|
| `src/pages/Studio.tsx` | Tab shell |
| `src/studio/PackTool.tsx` | Pack orchestrator (draft / publish / panel wiring) |
| `src/studio/PackRoomsPanel.tsx` | Room list + art upload |
| `src/studio/PackStageCanvas.tsx` | Hotspot / walkbox / region stage |
| `src/studio/PackLinksPanel.tsx` | Exit link graph |
| `src/studio/toastError.ts` | Shared Studio toast helpers |
| `src/studio/GuidedActionEditor.tsx` | ActionList form builder (↑↓ reorder) |
| `src/studio/PackBlendPanel.tsx` | Merge donor packs into draft |
| `src/engine/blendPacks.ts` | Pure pack merge + id remap |
| `src/engine/packActions.ts` | ActionList-lite ops |
| `src/engine/regions.ts` | Walk-region enter triggers |
| `src/engine/lineCatalog.ts` | Line CSV export / locale import |
| `src/studio/PackItemsPanel.tsx` | Item catalog + icons |
| `src/studio/PackWorldPanel.tsx` | Map groups + fog + pack audio cues |
| `src/studio/PackDialoguePanel.tsx` | Lite dialogue editor |
| `src/studio/PackPreview.tsx` | In-studio live playframe |
| `src/components/game/AdventurePlaySurface.tsx` | Shared `/play` + preview UI |
| `src/studio/packDraft.ts` | localStorage helpers / play handoff |
| `src/studio/packDraftIdb.ts` | IndexedDB draft persistence |
| `src/studio/usePackDraft.ts` | Draft hook + undo/redo |
| `src/authoring/designCoach.ts` | Non-blocking design suggestions |
| `src/authoring/settingKits.ts` / `genrePresets.ts` | Tone + place seeds |
| `src/studio/DesignCoachPanel.tsx` | Pack-tab coach UI |
| `src/components/authoring/DesignCoachLive.tsx` | Author-mode coach tips |
| `src/engine/jsonPack.ts` | JSON → GameDefinition (barrel) |
| [`REFACTORING.md`](./REFACTORING.md) | Module extraction best practices |
| `src/studio/PixelTool.tsx` | Art pipeline |
| `src/studio/HotspotTool.tsx` | Area designer |
| `src/studio/SceneTool.tsx` | Overlay → inventory |
| `src/studio/AudioTool.tsx` | Music + SFX designer |
| `src/studio/CombineTool.tsx` | Combine recipes |
| `src/authoring/codegen.ts` | TS emitters |

