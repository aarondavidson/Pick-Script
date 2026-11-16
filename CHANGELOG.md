# Changelog

All notable changes to Pick-Script. Versions follow
[semantic versioning](https://semver.org); the policy and release checklist are
in [`docs/RELEASING.md`](./docs/RELEASING.md). **Upgrading a game?** Read
[`docs/UPGRADING.md`](./docs/UPGRADING.md) — each release lists what, if
anything, you need to change.

## Unreleased

### Added

- **GitHub Releases** — `Release` workflow publishes a GitHub Release (notes from this changelog, built web zip + checksums) from `main` via **Actions → Release → Run workflow** or a pushed `v*` tag; `scripts/release-notes.mjs`; release rules in [`docs/RELEASING.md`](./docs/RELEASING.md)

## 0.3.0 — 2026-11-16

Play screen rework for phones, character sizing and automatic character cut-outs.

### Upgrade notes

- **The play scene is now always 16:9**, the same shape rooms are drawn on in Studio. Before, the scene box changed shape with the screen and cropped the art, so hotspots could sit slightly off the picture. Room art that is not 16:9 is still shown (cropped to fill) — check it once. No pack data changes
- **Character size on screen changes**: check your characters in the preview and adjust **Size on stage** if needed. On a phone they are a little smaller than before, on desktop noticeably larger
- Host shells that render their own play UI: `useGameDimensions` is removed; use `usePlayLayout` (`src/hooks/usePlayLayout.ts`)

### Added

- **Character size** — `scale` on actors (TS + JSON, 0.25–4); Studio: Pack → Actors → **Size on stage** slider. `resolveActorScale` / `stageSpriteScale` exported from `@/engine`

- **Character background removal** — character images brought into the Studio (Pixels → Send to pack as *Character costume*, or Pack → Actors → **Upload character image** / **Remove background**) are cut out automatically when they sit on a flat colour, a grey "fake transparency" checkerboard, or have letterbox bars. Already-transparent PNGs are untouched; busy backgrounds are left alone and the author is told. `pack-doctor` / pack lint warn about JPEG character sprites

### Changed

- **Characters scale with the room** — sprites used to be a fixed pixel size, so the player looked tiny on a large screen and oversized on a phone. They now keep the same size relative to the scene everywhere (speech bubbles and name labels stay a readable size). Default bitmap height is about a quarter of the room
- **Phone play, sideways** — the scene fills the full screen height with actions, exits, goal and menu in a side rail. Applies to any short landscape screen, including phones wider than the old 768px mobile cut-off
- **Phone play, upright** — slim header, edge-to-edge scene, room caption under the scene instead of over it, one row of labelled action buttons, no explanatory panels, no empty sentence box; fits one screen without scrolling
- **Desktop play** — actions and exits sit beside the scene on wide screens, so the whole game fits one screen
- **Studio wording** — the first-game guide and new-game prompt are in plain language (no raw URLs or template ids); the guide can be hidden and stays hidden

### Fixed

- Harbor Fog characters were drawn on a baked-in checkerboard box; the sprites are now transparent PNGs (made with the new background removal)
- Phone menu sheet could run off a short screen; it scrolls and uses two columns when the screen is short

## 0.2.0 — 2026-11-16

First release with a stated update policy: the engine now reports its version,
packs can require a minimum engine, and saves survive pack updates.

### Upgrade notes

No pack changes are required. Details and examples: [`docs/UPGRADING.md`](./docs/UPGRADING.md#010--020).

- `migrateSave` now receives the save **as written** (before it is clamped to the pack); its result is clamped afterwards. Migrators that rename room / item ids now work. Migrators that assumed pre-sanitized input should be re-checked
- Loaded saves are reconciled with the pack: new achievements, quests, actors and initial flags appear in old saves. Remove hand-written workarounds in `migrateSave`
- Re-export any TS pack produced by Studio's **Copy TS pack** / **Download game folder** under 0.1.0 — it was missing most pack content (see Fixed)
- Requires **Node.js 22.12+** for the dev toolchain (`engines`, `.nvmrc`)

### Added

- **Engine version** — `ENGINE_VERSION` and `checkEngineCompatibility()` exported from `@/engine`; saves record the `engineVersion` that wrote them
- **`minEngineVersion`** on packs (TS + JSON) — an older engine refuses the pack with a clear "update the engine" error; blending packs keeps the stricter requirement
- **Pack schema upgrade path** — `migrateJsonPackDocument` / `JSON_PACK_MIGRATIONS` / `JSON_PACK_MIN_SCHEMA_VERSION`; packs made with a newer engine now say so instead of a bare "unsupported schemaVersion"
- **`reconcileStateWithDefinition`** — brings a loaded save up to date with pack content
- **Release tooling** — `npm run check:release` (versions in sync + changelog section; part of `npm run verify` and CI), CI on `v*` tags checks the tag matches the version, CI runs the engine package dry-run
- **Docs** — [`docs/UPGRADING.md`](./docs/UPGRADING.md) (authors) and [`docs/RELEASING.md`](./docs/RELEASING.md) (maintainers: semver policy, compatibility rules, release checklist)

### Fixed

- **Stale save restored after reload** — when IndexedDB and localStorage held different copies of a slot (e.g. after a localStorage quota failure), the localStorage copy always won, even if older. The copy with the newer in-save timestamp now wins and the other store is repaired
- **Saves "vanishing" after a pack update** — a `migrateSave` that threw made the slot look empty (and open to being overwritten). It is now shown as incompatible
- **New achievements / quests never unlockable on old saves** — see Upgrade notes
- **TS export dropped pack content** — "Copy TS pack" and "Download game folder" omitted items, actors, hints, cutscenes, quests, achievements, comics, i18n, `winFlag` and `credits`, so the exported game could differ from the Studio draft and could not be won
- Saves whose `gameId` is malformed (not just different) are rejected; non-object save data is rejected
- `flagIndex.ts` used an `@/engine` alias import inside the engine folder, breaking copies of `src/engine` in repos without that alias

### Also in 0.2.0 (since 0.1.0)

- **Win flag** — packs (JSON + TS) can set `winFlag`; the game ends and shows the win screen when it turns on. Studio: Quests & achievements → Game ends when flag; `pack-doctor` reports packs with no ending and win flags nothing sets. Previously Studio-made packs could never reach the win screen
- **Fix: template sticky note** — using (not looking at) the note on a fresh game said “You already took the key” while handing over the key. Responses can now be state functions that return a translation key, so gated copy stays translatable
- **Dependencies** — `npm audit`: 32 → **0** advisories. Non-breaking updates (Capacitor 8.5.3 …); React Router 7.18; Vite 8 + Vitest 5 + `@vitejs/plugin-react-swc` 4; `uuid` override under `xcode`; removed unused `zod`, `@hookform/resolvers`, `react-hook-form`, `@tailwindcss/typography` and `ui/form.tsx`. Requires **Node.js 22.12+** (Vitest 5): `engines`, `.nvmrc`, CI reads `.nvmrc`
- **Asset credits** — `credits` on packs (TS + JSON), shown in Settings → Credits and on the default win screen; **Add credit to pack** in the art library; blending packs carries donor credits
- **Custom palettes** — Pixels → Palette: Custom accepts pasted hex / GPL / Paint.NET palettes (e.g. from Lospec)
- **Art library corrections** — fixed license labels (Pixel Adventure is CC-BY on OGA, Super Grotto unconfirmed, CraftPix not CC0, Gothicvania music needs credit); removed Pixor (a paid tool) and the Lospec gallery (a showcase) in favor of the Lospec palette list; Tiled → room art guide in `docs/STUDIO.md`
- **Engine-only repo** — removed the title-product modes (`dev:*` / `build:*` / `cap:sync:*` variants, `.env.*` files) and the repo-split tooling; launcher/Studio “edit shipped titles” panels removed
- **Bring your own art** — removed the server-side AI image proxy (`api/`, dev middleware); Studio Pixels keeps upload + pixelate and offers copyable prompt suggestions for any image tool
- **Fix** — `npm run new-pack` / `pack-from-json` no longer emit an invalid `registry.ts` when the last catalog entry has no trailing comma
- **Mobile play chrome** — denser phone header; Settings folded into Menu sheet; `shell.chrome` hide flags (`hideJournal` / …) via `resolvePlayChrome`
- **Plain-language docs** — [`docs/HOW-TO.md`](./docs/HOW-TO.md) covers play / make / AI art / share / publish / iPhone; friendlier README, ENGINE-LANDING, STUDIO, IMAGE-GEN, games READMEs, RECIPES, PACKS, PICK-SCRIPT
- **Studio refactor** — `PackMetaBar` + `artHandoff.ts`; `toastFail` / toast helpers on Pack + graph/dialogue/cutscenes; `studioTabHref({ send })` + `recipesGalleryHref`; PackTool focus helpers
- **Funnel polish** — Art handoff defaults to `harbor_key` / pack items; post-create scroll to `#art-handoff`; empty-starter + wizard default `short-mystery`; Setup board → Ship checklist; `/pick` deep-links; PACKS allowlist docs for dial/wire; Studio-first docs path
- **First-game funnel** — 30-min path on Launcher/Studio; ArtHandoffPanel (AI art → room/items); puzzle graph Fix this; minigame recipes (sequence/slider/dial/wire); playtest walkthrough export; dial-lock + wire-match; cutscene scrubber; i18n Translate stub + CSV BOM; `npm run pack:engine`; [`ENGINE-LANDING.md`](./docs/ENGINE-LANDING.md) + [`SHIP-NIGHT.md`](./docs/SHIP-NIGHT.md)
- **Navmesh / floors** — walkbox `floor` + `links` + portal midpoints; `floorTransition` / `setWalkFloor`; Studio walkbox editors
- **Declarative minigames** — `sequence-lock` + `slider-puzzle` modalities (config + winFlag); Studio specials cards
- **Puzzle graph** — engine `puzzleGraph` + Studio panel (focus nodes, add gated link, suggest unlock)
- **Author ship polish** — Studio Ship checklist; `short-mystery` 5-room template; visual `if`/`requireItem` ActionList cards; Rhubarb mouthCues import; Download game folder (.zip); more recipe apply (look-scenery / give-item / region / timer); locale preview; cutscene timeline form fields; `@portable-adventure/engine` package scaffold; Capacitor store checklist + `npm run check:capacitor`
- **Author docs** — PACKS.md covers conditionals / regions / timers / cutscene sync / costumes / lip-sync / JSON specials; [`docs/JSON-PACK-SCHEMA.md`](./docs/JSON-PACK-SCHEMA.md); Harbor Fog [`README`](./src/games/harbor-fog/README.md); ENGINE.md polygon note corrected
- **Engine enhance** — live lip-sync (`getMouthShapeAt` + ActorSprite/SpeechBar mouth classes); stuck-assist hotspot pulse from hint `hotspotId`; optional `juice` on `RoomRegion` enter + `CutsceneLine` (host `playJuice`)
- **Engine enhance (cont.)** — region enter/exit ActionLists; allowlisted JSON specials (minigame / comic / trade); camera pan/zoom; polygon walkboxes; cutscene timeline (`wait` / `goto` / parallel); timed room triggers; Capacitor safe-area, audio resume, and save export
- **QA refactor** — orphans + CI lint; pack-local art; modality + shell registries; PackTool/Stage/Audio panels; AdventureProvider hooks (walk/interact/travel/cutscene/modality/speech/progression); jsonPack module split; musicEngine presets/ambient split; route + Studio tab lazy-load; pack draft IDB; `@/engine` import boundary; [`docs/REFACTORING.md`](./docs/REFACTORING.md)
- **Peer gaps** — ActionList polish (GuidedActionEditor ↑↓ reorder); walk `Room.regions`; classic **Give** verb (8th); lip-sync data slots (`mouthCues` / `lipSyncKey`) on dialogue / sayLine / cutscenes
- **Blend packs** — `blendPacks` / Studio Pack → Blend packs (merge starter / library / `.pack.json` layers)
- **Shell hooks** — pack-owned `GameDefinition.shell` `{ intro, canvasFx, complete }` + `migrateLegacySaves`; Harbor Fog stays with engine
- **Harbor Fog** — engine teaching demo (`/play/harbor-fog`): 5 rooms, kits / library / feel path
- **P0/P1 feel** — event juice + haptics; stuck assist; captions + text size; line catalog CSV; tone + place setting kits; objective bar / progressive hints (see below)
- **Play feel** — always-on objective bar (`objectiveFlags`); in-game progressive hints (H + preview); pack lint for silent/dead/tiny hotspots; Guided defaults to coin verbs; starter templates seed quests + hints
- **Map fog & sealed exits** — optional `mapFog` (reveal/travel-by-flag, clear on visit); gated links keep visible doorways via `lockedLabel` / `showWhenBlocked`; Pack World + link authoring
- **Newbie-robust Guided Pack** — collapse polish panels; preview starts closed; plain-language validation + scroll-to-fix; ship coach Apply; launcher drops CLI/recipes from the hero; built-in genre mechanics callout

- **Free pixel galleries** — expanded Studio library (itch CC0, OpenGameArt CC0 filter, Kenney, CraftPix freebies, Pixor, Lospec + ready packs); Pack + Pixels tabs; docs drop retail-import framing
- **Studio ship DX** — launcher Import `.pack.json` (no Studio); `/play?packUrl=`; post-publish funnel; `npm run pack-from-json`; Hotspots/Scene/Combines **Apply to pack**; auto-shrink uploads; CC0 pixel library links; Studio-first Guided 5-step launcher; coach **ship** tips; Pack quests & achievements UI
- **Deploy lock (strict play)** — production player builds freeze pack data, block Studio/draft/sidecar overrides of shipped games, enforce map fast-travel policy, sanitize save/load state, optional `VITE_SAVE_INTEGRITY_KEY` sealed saves, CSP + security headers on Vercel
- **Web-robust saves** — IndexedDB primary + localStorage mirror, checksum envelopes, tab-hide flush, Export/Import backup JSON for cross-browser restore; Save menu surfaces storage backend
- **Studio next tier** — Pack walkbox + entry-point editor; hints form; cutscene steps (message/wait/walk/sound); dialogue graph + require-flag choices; Live preview playtest cheats (jump/give/flag/cutscene)
- **Newbie-robust Studio (M1–M4)** — Guided/Advanced mode; New Game Wizard (blank / key→door / two-room); Hotspot Intent Wizard + puzzle kits; playtest checklist; draft library; coach **Apply**; guided action/state/dialogue forms; verb coin mode
- **Pixels → pack** — Send to pack (room/item), curated prompt library, batch room+item+character
- **Audio → pack** — Apply music cues + SFX bindings into the Pack draft (Copy TS still available)
- Capacitor-oriented shell docs (`SHELL.md`, `CAPACITOR.md`)
- `linkRooms` / `mapFastTravel` for easy multi-room linking + map
- Shared AudioContext (iOS-safe); separate music / SFX volume
- Admin builder plan: `docs/ADMIN_BUILDER_PLAN.md`
- **Pack pixel studio** (`/studio`): Retro Diffusion proxy + client pixelate; `docs/STUDIO.md`
- **Puzzle recipes** (`/recipes`, `docs/RECIPES.md`) — copy-paste patterns between Attic and full titles
- **Author mode** — Settings or Ctrl+Shift+H: hotspot % edit, copy object, flags/exits panel
- **Copyright / attribution** — `COPYRIGHT` (Aaron Davidson, GPL-3.0-only); credit in README, package.json, launcher
- **Design studio tools** — hotspots drawer, scene overlays→inventory, combine recipes, character pixel preset; Author mode “Add hotspot (draw)”
- **Studio Audio tab** — location music cues, ambient beds, interact/use-with SFX bindings + preview; hotspot `interactSound` / `useWithSound`
- **Studio Pack handoff** — JSON pack schema + `createGameFromJson`, Pack tab (rooms/art/hotspots/`linkRooms` graph), self-contained `.pack.json` download + `/play/studio-draft`
- **Studio live preview** — in-Pack playframe (phone/tablet/desktop), Refresh remount, shared `AdventurePlaySurface`
- **Validator fix-it links** — pack errors/warnings → Recipes + Studio tabs
- **Author mode draft inspector** — edit kind / item id / look text in-panel before copy
- **JSON → TS codegen** — Pack tab **Copy TS pack** (`formatJsonPackAsManifestTs`)
- **Declarative Pack puzzles** — use-with rules, combinations, exit `requireItem`; **Publish to launcher** installs playable drafts
- **Pack polish (Attic-parity path)** — Items catalog + icons, World (map/audio cues), Dialogue lite, IndexedDB drafts + undo/redo
- **Private authoring gate** — Studio + Author mode off in public production unless `VITE_ENABLE_STUDIO` (optional `VITE_STUDIO_SECRET` / `?unlock=`)
- **Design coach** — ignorable tips for pack function/feel (Pack tab + Author mode); dismiss per tip or turn off entirely

## 0.1.0 — Portable adventure engine

First tagged release of the **portable SCUMM-inspired engine** plus packs.

### Engine (`src/engine/`)
- `GameDefinition` packs: rooms, verbs, inventory, dialogue, actors, walkboxes, scripts, cutscenes, saves, hints, multi-ego, i18n, specials, audio
- `createGame` + `validateGameDefinition`; React `AdventureProvider`
- Pack `itemIcons` + host `resolveItemIcon` (no game-specific UI imports)
- Pack `audio.sfx` URL playback; pickup/success on inventory / achievements

### Packs (`src/games/`)
- **attic-study** — 1 room, 2 puzzles, art + SFX + [WALKTHROUGH](./src/games/attic-study/WALKTHROUGH.md)
- **_template** — starter copied by `npm run new-pack`

### Tooling
- `npm run new-pack -- <id>` — scaffold + registry
- `npm run check-assets` — ASSETS.md hard limits (CI)
- `npm run verify` — typecheck + test + assets
- GitHub Actions CI; `vercel.json` SPA rewrites

### License
- **GPL-3.0-only** — see [LICENSE](./LICENSE) · copyright [COPYRIGHT](./COPYRIGHT) (Aaron Davidson)

### Add a game

```sh
npm run new-pack -- my-game --title "My Game"
npm run verify
npm run dev
# → /play/my-game
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) and [DEPLOY.md](./DEPLOY.md).
