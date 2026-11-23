# Changelog

All notable changes to Pick-Script. Versions follow
[semantic versioning](https://semver.org); the policy and release checklist are
in [`docs/RELEASING.md`](./docs/RELEASING.md). **Upgrading a game?** Read
[`docs/UPGRADING.md`](./docs/UPGRADING.md) — each release lists what, if
anything, you need to change.

## Unreleased

### Fixed

- **Documentation** — the README now says what the engine does and maps every guide by task; HOW-TO's first-game steps include setting an ending (Studio games never reached the win screen without one), palettes and credits; pack-field docs say which release added each feature ("since 0.x"), for `minEngineVersion`; STUDIO.md no longer lists the removed AI generation, Pixor or the Lospec gallery; SHIP-NIGHT's QA gate matches RELEASING (lint, CLI, package, browser tests, audit, keyboard play, endings); `verify` is described with lint everywhere; RELEASING records the rewritten history behind the `Beta` tag and that 0.2.0 has no tag; the 0.1.0 → 0.2.0 upgrade notes cover the removed AI generation, title modes and React Router 7
- **Changelog** — features that shipped in the first public beta were listed as new in 0.2.0; they are now under 0.1.0, with what 0.2.0 later removed marked
- **Art drawn in a hotspot faded in and out** — the idle discovery pulse animated the opacity of the whole hotspot, so overlay art (`frames`, `stateOverlays`) sat at 30–60% opacity, cutscenes included. The pulse now changes only the outline's colour, and the hotspot's unused `opacity-50` while input is locked is gone (the idle pulse and the active and stuck-assist styles always overrode it). Overlay art also now scales like the room picture: crisp with `presentation.crispPixels`, smooth otherwise (it always inherited `crisp-edges`)
- `tsconfig.node.json` no longer lists the deleted AI-proxy files

### Security

- Dev toolchain: `typescript-eslint` 8.72 → 8.73, which moves its `minimatch` dependency from 10.2.6 to 11.x and clears the glob-pattern denial-of-service advisory (GHSA-g3hv-75wg-m249). Lint tooling only — nothing shipped to players or package users was affected

## 0.5.0 — 2026-11-16

Playable without a mouse or a screen, translatable interface, voice acting you can actually author.

### Upgrade notes

No pack changes are required. Details: [`docs/UPGRADING.md`](./docs/UPGRADING.md#040--050).

- **Pinch-zoom is allowed again** — the page no longer sets `user-scalable=no`. If you copied `index.html`, remove `maximum-scale` / `user-scalable` from your viewport tag too
- **Dialogs changed shape** — every dialog is now capped to the screen with its body scrolling inside and the close button pinned (44px). Custom dialog content that relied on the dialog itself scrolling still works; content that positioned things against the dialog edge should be checked
- **Enter on a focused hotspot acts without arming a verb** (Look, or the first verb the hotspot takes). Pointer behaviour is unchanged
- **Lint must be clean** — `npm run lint` fails on any warning and is part of `npm run verify` and CI

### Added

- **Keyboard and screen-reader play** — hotspots are focusable buttons with names; Tab moves between them, Enter / Space interacts; the verb coin opens from the keyboard (arrows move, Esc closes and returns focus); a "Skip to the scene" link; the scene is a labelled region that announces the room and how many things are in it; messages are announced; conversations are proper dialogs (Esc closes, focus lands on the first reply); the start screen is a real button; `<html lang>` follows the game language
- **Translatable interface** — every menu, button, save dialog, system message and screen-reader label goes through `src/engine/uiStrings.ts` (~210 `ui.*` keys). A pack translates the interface by adding those keys to its locale catalog; hosts can `registerUiStrings(locale, table)`; `uiStringsCsv()` exports the list for translators. Sentence wording and word order (`Look at {target}`) are keys too
- **Voice acting** — Studio → Pack → **Voice acting**: attach a recording to any spoken line, preview it, see how many lines are voiced. Per-language recordings via `"<voiceKey>@<locale>"` (`resolveVoiceUrl`). Inline `data:audio/…` clips are accepted in packs (`isSafeAudioUrl`) and become files with **Download for web hosting**
- **Browser tests** for keyboard-only play, the verb coin, phone dialogs and a translated interface (13 in total)

### Fixed

- **Dialogs could not be closed on a phone** — the hints dialog (and any tall dialog) ran off the screen with the close button out of reach
- **Skipped speech kept talking** — skipping a line or moving on in a conversation now stops its voice clip; music returns to full volume after a voiced conversation line
- **Quests added at runtime were lost on load** — `addQuest` quests now survive a save and load (malformed ones are still dropped)
- Selected buttons (yellow fill) had unreadable shadowed text
- The cutscene preview in Studio ignored a duration edit while playing
- Removed a game-specific check from the shared voice fallback, the unused `InventoryDialog`, and the stale `bun.lockb`

## 0.4.0 — 2026-11-16

The engine becomes something you can install: a real package with the play UI, games that can use any licence, packs that keep their art in files, and saves that survive on phones.

### Upgrade notes

No pack changes are required. Details: [`docs/UPGRADING.md`](./docs/UPGRADING.md#030--040).

- **Licence:** now GPL-3.0-only **with the [Pick-Script Game Exception](./LICENSE-EXCEPTION.md)**. Games made with the engine (packs, art, audio, writing, your own code) may use any licence. Changes to the engine itself stay GPL
- **Custom shells:** `AdventurePlaySurface` no longer reads the app router. Pass `onHome` (and optionally `homeLabel`) to show a home control; without it there is none. `PlayMobileMenu` takes the same `onHome`
- **`npm run pack:engine`** now builds the real package tarball (it was a dry-run of a stub)
- Capacitor apps: add `@capacitor/preferences` and run `npx cap sync` — saves are mirrored to native storage

### Added

- **Installable package** — `@portable-adventure/engine` is built from the same sources the app runs: engine + play UI + styles + type declarations. One component plays a game: `<PickScriptGame definition={…} />`. Attached to every GitHub Release as a `.tgz` (`npm run build:package` / `pack:engine`); see [`docs/ENGINE-PACKAGE.md`](./docs/ENGINE-PACKAGE.md)
- **Assets outside the JSON** — packs can reference `assets/…` files next to `pack.json` instead of embedding every image. Studio: **Download for web hosting (.zip)**; CLI: `npm run pack-assets -- game.pack.json out/dir`; engine: `externalizePackAssets`, `resolvePackAssetUrls`, `fetchJsonPack`. Hosted packs have no size cap and their art is cached by the browser
- **Room preloading** — a room's art is loaded before it is shown (with a "Loading…" state instead of a blank scene) and the rooms one exit away are fetched in the background. `collectRoomMediaUrls` / `neighbourRoomIds` for custom shells
- **Native save storage** — `setSaveMirror` / `createKeyValueSaveMirror` mirror saves to durable host storage; the app registers `@capacitor/preferences` on iOS / Android so saves survive the OS clearing web-view storage. The newest copy wins on boot
- **`configureDeployLock({ strictPlay, saveIntegrityKey })`** — runtime alternative to the `VITE_*` build variables, for package consumers
- **Browser tests** — `npm run test:e2e` (Playwright) covers the three play layouts, character scaling, touch play + autosave, hosted packs and the loading state; runs in CI and before every release
- **GitHub Releases** — `Release` workflow publishes a GitHub Release (notes from this changelog; web build zip, engine package `.tgz`, checksums) from `main` via **Actions → Release → Run workflow** or a pushed `v*` tag; publishes to npm too when an `NPM_TOKEN` secret exists. Release rules in [`docs/RELEASING.md`](./docs/RELEASING.md)

### Fixed

- The play UI crashed outside a router (home link) — it could not be embedded in another app
- Type declarations: `getVisibleHotspots`, `useCutsceneHost` and verb helpers now have explicit return types
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
- **Studio's AI image generation is removed** (`/api/generate`, `RD_TOKEN`, `STUDIO_API_SECRET`) — if you deployed it, delete those variables from your host; make art in your own image tool
- **Single-title `VITE_PRODUCT` modes are removed** (and their scripts); only `engine` remains — see [`docs/PRODUCTS.md`](./docs/PRODUCTS.md)
- **React Router 7** — only matters if your own code imports `react-router-dom`

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

### Also in 0.2.0

Changes made after the first public beta.

- **Win flag** — packs (JSON + TS) can set `winFlag`; the game ends and shows the win screen when it turns on. Studio: Quests & achievements → Game ends when flag; `pack-doctor` reports packs with no ending and win flags nothing sets. Previously Studio-made packs could never reach the win screen
- **Fix: template sticky note** — using (not looking at) the note on a fresh game said “You already took the key” while handing over the key. Responses can now be state functions that return a translation key, so gated copy stays translatable
- **Dependencies** — `npm audit`: 32 → **0** advisories. Non-breaking updates (Capacitor 8.5.3 …); React Router 7.18; Vite 8 + Vitest 5 + `@vitejs/plugin-react-swc` 4; `uuid` override under `xcode`; removed unused `zod`, `@hookform/resolvers`, `react-hook-form`, `@tailwindcss/typography` and `ui/form.tsx`. Requires **Node.js 22.12+** (Vitest 5): `engines`, `.nvmrc`, CI reads `.nvmrc`
- **Asset credits** — `credits` on packs (TS + JSON), shown in Settings → Credits and on the default win screen; **Add credit to pack** in the art library; blending packs carries donor credits
- **Custom palettes** — Pixels → Palette: Custom accepts pasted hex / GPL / Paint.NET palettes (e.g. from Lospec)
- **Art library corrections** — fixed license labels (Pixel Adventure is CC-BY on OGA, Super Grotto unconfirmed, CraftPix not CC0, Gothicvania music needs credit); removed Pixor (a paid tool) and the Lospec gallery (a showcase) in favor of the Lospec palette list; Tiled → room art guide in `docs/STUDIO.md`
- **Engine-only repo** — removed the title-product modes (`dev:*` / `build:*` / `cap:sync:*` variants, `.env.*` files) and the repo-split tooling; launcher/Studio “edit shipped titles” panels removed
- **Bring your own art** — removed the server-side AI image proxy (`api/`, dev middleware); Studio Pixels keeps upload + pixelate and offers copyable prompt suggestions for any image tool
- **Fix** — `npm run new-pack` / `pack-from-json` no longer emit an invalid `registry.ts` when the last catalog entry has no trailing comma

## 0.1.0 — 2026-10-26

First public beta of the **portable SCUMM-inspired engine** plus packs — the GitHub pre-release tagged `Beta`.

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

### Also in the first public beta

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

- **Free pixel galleries** — expanded Studio library (itch CC0, OpenGameArt CC0 filter, Kenney, CraftPix freebies, Pixor, Lospec + ready packs — Pixor and the Lospec gallery were dropped in 0.2.0); Pack + Pixels tabs; docs drop retail-import framing
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
- **Pack pixel studio** (`/studio`): Retro Diffusion proxy + client pixelate; `docs/STUDIO.md` *(the AI proxy was removed in 0.2.0 — bring your own art)*
- **Puzzle recipes** (`/recipes`, `docs/RECIPES.md`) — copy-paste patterns between Attic and full titles
- **Author mode** — Settings or Ctrl+Shift+H: hotspot % edit, copy object, flags/exits panel
- **Copyright / attribution** — `COPYRIGHT` (Aaron Davidson, GPL-3.0-only; the Game Exception was added in 0.4.0); credit in README, package.json, launcher
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

### Add a game

```sh
npm run new-pack -- my-game --title "My Game"
npm run verify
npm run dev
# → /play/my-game
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) and [DEPLOY.md](./DEPLOY.md).
