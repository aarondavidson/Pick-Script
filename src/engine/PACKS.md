# Authoring game packs

**In plain words:** a **pack** is one complete game — rooms, pictures, puzzles — that plugs into this engine. You should not need to rewrite the engine for a new title.

Everyday makers: start with **[docs/HOW-TO.md](../../docs/HOW-TO.md)** (no code). This page is the deeper authoring reference.

**North star:** register a pack in `src/games/registry.ts` and it is playable at `/play/:gameId`.

**Tone is yours.** Mystery, comedy, sunny adventure, cozy puzzle — atmosphere comes from your art, particles, and music, not a fixed “dark adventure” look.

Also see:

- Plain guide [`docs/HOW-TO.md`](../../docs/HOW-TO.md)
- Repo root [`README.md`](../../README.md)
- [`ASSETS.md`](./ASSETS.md) — picture & sound sizes
- [`../games/README.md`](../games/README.md) — pack folders
- [`../games/attic-study/WALKTHROUGH.md`](../games/attic-study/WALKTHROUGH.md) — tiny teaching game
- [`../games/harbor-fog/README.md`](../games/harbor-fog/README.md) — multi-room demo
- [`../../docs/JSON-PACK-SCHEMA.md`](../../docs/JSON-PACK-SCHEMA.md) — `.pack.json` fields
- [`../../docs/RECIPES.md`](../../docs/RECIPES.md) — puzzle recipes (`/pick/recipes`)
- Author mode in play — `Ctrl+Shift+H` or Settings
- [`../games/_template/README.md`](../games/_template/README.md) — code starter
- [`ENGINE.md`](./ENGINE.md) — runtime notes

---

## Quick start

**Studio-first (recommended):** open `/pick?funnel=1` → New game → **`short-mystery`** → Art handoff → Ship checklist → Play draft. See [`docs/ENGINE-LANDING.md`](../../docs/ENGINE-LANDING.md) · [`docs/HOW-TO.md`](../../docs/HOW-TO.md).

**TypeScript pack (repo landing):**

1. `npm run new-pack -- my-game --title "My Game"` (or copy `_template/` manually)
2. Fill `manifest.ts` (rooms, actors, combinations, achievements, quests)
3. Add art under pack-local `assets/` (imported from the manifest) — see [`ASSETS.md`](./ASSETS.md)
4. Pack is auto-registered in `src/games/registry.ts` when using `new-pack`
5. Run the app → `/play/my-game`
6. `npm run typecheck`, `npm test`, and `npm run check-assets` must stay green (also enforced in CI)

PR / license expectations: [`CONTRIBUTING.md`](../../CONTRIBUTING.md).

Validation runs automatically inside `createGame(definition)`. Invalid packs throw at boot with a list of structural errors.

---

## Pack layout

```
src/games/
  README.md                   # pack author overview
  registry.ts                 # catalog for launcher + routes
  _template/                  # starter pack (copy this) + README
  attic-study/                # teaching pack (1 room / 2 puzzles)
  harbor-fog/                 # engine demo (JSON-built, 5 rooms)
  my-game/
    README.md                 # short pitch + run instructions (encouraged)
    manifest.ts               # GameDefinition export (required)
    index.ts                  # re-export (optional)
    audio.ts                  # PackAudio map (optional)
    specials.ts               # minigames / comics / trades (optional)
    assets/                   # prefer pack-local art (Harbor Fog / Attic Study style)
    content/
      rooms/                  # one file per room (recommended at scale)
        index.ts
      dialogues/
      itemCombinations.ts
```

Shared UI lives in `src/components/game/`. Engine code lives in `src/engine/` and **must not** import a specific pack. Prefer **pack-local** `assets/` under the pack folder (see Attic Study / Harbor Fog) over dumping everything into shared `src/assets/`.

---

## `GameDefinition` checklist

| Field | Required | Notes |
|---|---|---|
| `id` | yes | Stable slug; used for save keys (`adventure_<id>_save_<n>`) |
| `title` / `subtitle` | title yes | Shown in launcher + in-game header |
| `version` | yes | Content semver (independent of engine) |
| `startRoom` | yes | Must exist in `rooms` |
| `rooms` | yes | `Record<roomId, Room>` |
| `combinations` | yes | May be `{}` |
| `achievements` / `quests` | yes | Arrays (may be empty) |
| `egoId` | recommended | Controllable actor; omit to disable walker |
| `actors` / `initialActors` | recommended | Portraits, sprites, placements |
| `verbs` / `verbMode` | optional | Classic 8 verbs (look/talk/use/pickup/open/push/pull/**give**); `verbMode`: `classic` \| `simple` \| `coin` |
| `shell` | optional | Pack-owned intro / canvasFx / complete as lazy `import()` loaders (omit for generic complete) |
| `legacySaveKeyPrefix` | optional | Copy old `<prefix><slot>` saves into this pack's slots once |
| `stuckAssist` | optional | Idle / failed-interact → next progressive hint |
| `playableActors` | optional | Multi-ego switch list |
| `hints` | optional | Progressive hint threads |
| `autosave` | optional | `true` or `{ enabled, debounceMs }` |
| `mapGroups` | optional | World map sections → room ids |
| `flagCutscenes` | optional | `{ flagName: cutsceneId }` auto-start |
| `specials` / `comics` / `onModalityWin` | optional | Minigames, comics, trades |
| `cutscenes` / `namedScripts` / `scripts` | optional | Drama + ambient logic |
| `defaultVerbResponses` | recommended | Fallbacks when a verb is invalid |
| `defaultTransition` | optional | Room fade/slide default |
| `saveSlots` | optional | Default 3 |

Per-room optional: `regions` (enter/exit + ActionLists), `walkboxes` (AABB + optional polygon), `timers`, particles / layers. Studio can **blend** donor packs into a draft via `blendPacks` (Pack → Blend packs).

**Puzzle graph (Studio):** `buildPuzzleGraph(doc)` in `puzzleGraph.ts` builds a capped dependency DAG from JSON packs (rooms, pickups, use-with, items, flags, gated exits, hints, timers, regions). Soft-lock flags (read but never set — same as `flagsNeverSet` / pack-doctor) mark red in the Pack → **Puzzle graph** panel. Pure engine helper — no React.

Full field docs: `definition.ts`, `types.ts`, `ENGINE.md`. JSON shape: [`JSON-PACK-SCHEMA.md`](../../docs/JSON-PACK-SCHEMA.md).

---

## Rooms & hotspots

Coordinates are **percent of the room image** (0–100), not pixels.

```ts
{
  id: "kitchen",
  name: "Kitchen",
  description: "Smells like coffee.",
  image: kitchenImg,          // Vite-imported URL string
  music: "calm-home",         // optional ambient key (see Audio)
  roomSize: { width: 100, height: 100 },
  entryPoint: { x: 50, y: 75 },
  walkboxes: [
    { id: "floor", x: 10, y: 60, width: 80, height: 30, scale: 1 },
    // Optional polygon (room %); AABB still used for path adjacency:
    // { id: "dock", x: 0, y: 50, width: 100, height: 40, points: [{x:0,y:70},{x:100,y:70},{x:80,y:90},{x:20,y:90}] },
  ],
  regions: [
    {
      id: "near_stove",
      x: 40, y: 50, width: 20, height: 20,
      setFlag: "smelledKitchen",
      juice: "soft",
      onEnterActions: [{ op: "sound", key: "creak" }],
      onExitActions: [{ op: "message", text: "You step back from the heat." }],
    },
  ],
  timers: [
    {
      id: "kettle",
      afterMs: 10000,
      once: true,
      message: "The kettle clicks off.",
      setFlag: "kettleDone",
    },
  ],
  hotspots: [/* … */],
  exits: [{ direction: "south", to: "street", label: "Front door" }],
  onEnter: (state) => ({ flags: { ...state.flags, seenKitchen: true } }),
  onExit: (state) => ({}),
  transitionIn: { kind: "fade", durationMs: 300 },
}
```

### Walkboxes, regions, timers

| Feature | Role |
|---|---|
| **Walkboxes** | Where the ego can walk. Default AABB. Optional `points[]` (≥3) → point-in-polygon containment. Pathfinding is BFS between boxes (AABB adjacency, or explicit `links` when set). Paths insert **portal midpoints** on shared edges, then intermediate centroids. |
| **Multi-floor** | Optional `floor` (0–8, default 0) on each box. Ego only pathfinds on the current walk floor: `state.vars.walkFloor` (preferred) or `Room.activeFloor`. Use `floorTransition: { toFloor }` on a ladder/landing box (applied when ego arrives at that box) or PackAction `{ op: "setWalkFloor", floor }`. |
| **Regions** | Invisible AABBs for **enter/exit** triggers (flags, messages, juice, `onEnterActions` / `onExitActions`). Not floor mesh. |
| **Timers** | Fire after ego dwells `afterMs` in the room. `once` (default) persists as `timerSeen_<room>_<id>`. Paused during cutscenes. |

When `floor` / `links` / `floorTransition` are omitted, behavior matches classic single-floor AABB BFS.

### Hotspot fields that matter

- `verbs` + `responses` — classic verb table
- `onInteract` / `onUseWith` — state patches
- `dialogue` — opens talk UI
- `actorId` / `isActor` — portrait / talk color / NPC anim cue
- `special` — key into `definition.specials` (defaults to hotspot `id`)
- `approach` / `skipWalkTo` — walk-to-before-interact
- `journalEntry` — auto journal on look/use

### Travel rule (important)

All room changes must go through **`runtime.travel` / `travelThroughExit` / `travelToRoom`**.
Never set `currentLocation` directly in UI — that skips `onExit` / `onEnter`, scripts, and transitions.
The world map already uses `travelToRoom`.

### Easy room links

```ts
import { linkRooms } from "@/engine";

const door = linkRooms("kitchen", "street", {
  direction: "south",
  fromLabel: "Front door",
  toLabel: "Kitchen",
});
// kitchen.exits.push(door.forward);
// street.exits.push(door.back);
```

### Map / fast travel

```ts
mapGroups: { Home: ["bedroom", "kitchen"], Town: ["street", "park"] },
mapFastTravel: { enabled: true, requireVisited: true },
// mapFastTravel: false  → hide Map (one-room packs)
```

Shell behavior (touch, audio, Capacitor): [`SHELL.md`](./SHELL.md).

---

## Graphics & audio (summary)

**Full numeric specs:** [`ASSETS.md`](./ASSETS.md) (room 1920×1080, portraits 256×256, SFX ≤1s, music presets, tooling requirements).

### Quick reference

| Asset | Canonical size / format |
|---|---|
| Room background | **1920×1080** JPG/WebP, 16:9, ≤500 KB |
| Portrait | **256×256** JPG/PNG (UI shows 64×64) |
| Actor bitmap (optional) | **64×96** or **128×192** PNG alpha |
| Item icon | **128×128** or **256×256** PNG |
| Comic panel | **800×544** JPG |
| SFX | MP3/OGG/WAV, **≤1 s**, ≤100 KB |
| Music bed (file) | MP3 128–192 kbps, loopable; or pack synth presets via `audio.music` |

### Rooms / actors (authoring)

```ts
import kitchenImg from "./assets/kitchen.jpg"; // pack-local

{
  id: "kitchen",
  image: kitchenImg,
  music: "home",
  roomSize: { width: 100, height: 100 },
  // hotspots in % …
}

actors: {
  hero: {
    id: "hero",
    name: "Alex",
    isEgo: true,
    sprite: "actor-ego",       // CSS stand-in or imported URL
    portrait: heroPortraitUrl, // Vite import preferred
    talkColor: "#f5e6a8",
    // Single sheet (scaleX flip) — or per-facing maps:
    animations: {
      idle: {
        down: idleDownUrl,
        up: idleUpUrl,
        left: idleLeftUrl,
        right: idleRightUrl,
      },
      walk: {
        down: walkDownUrl,
        up: walkUpUrl,
        left: walkLeftUrl,
        right: walkRightUrl,
      },
      talk: talkUrl, // string still OK; missing facings flip
    },
  },
}
```

Facing aliases: `up|down|left|right` or `n|s|e|w`. Runtime picks facing from walk delta.

- Hotspots are hit-rects in **%**; paint interactables into the background
- Depth: `Walkbox.scale` shrinks actors upstage
- Comics: `definition.comics` + special `{ modality: { type: "comic", comicId } }`
- Lip-sync: put Rhubarb-style `mouthCues: [{ t, shape }]` on dialogue / `sayLine` (shapes `A`–`F`, `X`). Shell animates ActorSprite / SpeechBar when cues exist.

### Sound wiring

| Layer | How |
|---|---|
| SFX | `onSound` / `{ op: "sound", key }` — built-ins: `click`, `pickup`, `success`, `verb`, `creak`, `door`; hotspot `interactSound` / `useWithSound` |
| Music | `Room.music` → `PackAudio.music` cue → synth preset; ambient via `PackAudio.ambient` |
| JSON packs | `createGameFromJson` / Studio **Pack** tab → self-contained `.pack.json` (data URL assets) |
| Music | `Room.music` → pack `audio.music` → preset (`calm`, `eerie`, …) |
| Voice | `sayLine.voiceKey` + `audio.voice` map |
| Unlock | User gesture required (audio unlock overlay) |

```ts
{ op: "sound", key: "click" }
{ op: "music", key: "warehouse" }
{ op: "sayLine", actorId: "hero", text: "Hello?", voiceKey: "hero_hello" }
```

---

## PackActions (conditional chains)

Declarative ActionList-lite on hotspot `actions`, region enter/exit, and room timers.
Sanitized for untrusted JSON (nest depth ≤ 4, chain length capped).

| `op` | Purpose |
|---|---|
| `message` / `say` | UI text / speech |
| `setFlag` / `clearFlag` | Flags |
| `giveItem` / `takeItem` | Inventory |
| `setObjectState` | Hotspot object state |
| `sound` / `haptic` / `juice` | Feel |
| `cutscene` | Start named cutscene id |
| `requireItem` | If item missing → `failMessage` and **stop** chain |
| `if` | `{ flag? \| hasItem? \| equals: { var, value }, then[], else? }` |

```ts
actions: [
  { op: "requireItem", itemId: "brass_key", failMessage: "It's locked." },
  {
    op: "if",
    flag: "doorOiled",
    then: [{ op: "setFlag", flag: "doorOpen" }, { op: "juice", preset: "medium" }],
    else: [{ op: "message", text: "The hinges scream. Oil them first." }],
  },
],
```

Studio: **Guided action editor** supports basic `if` / `requireItem`.

---

## Cutscenes (timeline sync)

JSON / Studio steps compile to `CutsceneDef`. Useful ops beyond message/wait:

| Step | Behavior |
|---|---|
| `walk` / `sayLine` | Default wait-for-walk / wait-for-speech |
| `parallel` | Start walk + say together, then wait for both |
| `label` / `goto` | Jump (engine caps revisits so packs can’t infinite-loop) |
| `camera` | `{ pan: { x, y, durationMs? }, zoom?, follow? }` |
| `juice` on a line | Shake/flash/burst when the beat starts |
| `mouthCues` on `sayLine` | Live lip-sync while the line plays |

Script opcodes (named scripts): `cameraPan`, `cameraZoom`, `cameraFollow`.

---

## Specials (minigames, comics, trades)

Keep game-unique UI **out of** generic components. Declare it on the pack:

```ts
specials: {
  arcade_machine: {
    interceptVerbs: ["use", "look"],
    run: () => ({
      modality: { type: "minigame", minigameId: "pixel-invaders" },
    }),
  },
  trader: {
    // after-hook (no interceptVerbs): runs after a normal successful interact
    run: ({ state }) =>
      state.flags.hasCoin
        ? { patch: { /* trade */ }, message: "Deal!" }
        : null,
  },
},
comics: { my_comic: { /* … */ } },
onModalityWin: (key, state) => {
  if (key === "pixel-invaders") return { patch: {…}, achievementId: "…" };
  return null;
},
```

**JSON / Studio (no TS):** hotspot `special: { kind: "minigame" \| "comic" \| "trade", … }`
compiles into `definition.specials`. Studio Pack → hotspot inspector → **Specials** cards.
Only allowlisted minigame ids (`pixel-invaders`, `hacking`, `sequence-lock`, `slider-puzzle`, `dial-lock`, `wire-match`) and safe comic ids are accepted.

Built-in modalities the shared shell understands:

- `comic` → `ComicReader`
- `minigame` ids `pixel-invaders`, `hacking` → modality registry players
- Declarative templates (config on `special.config`, passed via `PackModality.config`):
  - `sequence-lock` — press pads in order; `{ sequence, labels?, winFlag }` (default flag `beatSequenceLock`)
  - `slider-puzzle` — reorder 3–4 segments; `{ order, target, winFlag }` (default flag `beatSliderPuzzle`)
  - `dial-lock` — N-position dial(s); `{ positions, target, winFlag }` (default flag `beatDialLock`)
  - `wire-match` — connect left terminals to shuffled right ends; `{ pairs, winFlag }` (default flag `beatWireMatch`)

```ts
// Hotspot special (JSON / Studio)
{
  kind: "minigame",
  minigameId: "sequence-lock",
  config: {
    sequence: ["a", "b", "c"],
    labels: { a: "1", b: "2", c: "3" },
    winFlag: "lockOpen",
  },
}
```

On win, `completeModality` sets `config.winFlag` (or the convention default), then runs pack `onModalityWin` for extra rewards (same path as Pixel Invaders → `beatArcade`).

New minigames: `registerModalityPlayer` + allowlist id + pack special — keep custom rewards in `onModalityWin`.

---

## Multi-ego, verbs, hints, autosave

See Tier D notes in `ENGINE.md`. Short version:

- `playableActors` + `switchEgo` / `setEgo` opcode — per-ego inventories
- `verbMode: "classic" | "simple" | "coin"` — Settings can override (localStorage); classic includes **Give**
- `hints: [untilFlagHint(…)]` — progressive tiers in the Hints dialog; optional `hotspotId` for stuck pulse
- `stuckAssist` — after idle / failed interacts, banner offers the next hint **and** pulses that hotspot when `hotspotId` is set
- `autosave: true` — debounced to `adventure_<id>_autosave`

---

## Saves

- Manual slots: `adventure_<gameId>_save_<1..N>`
- Autosave: `adventure_<gameId>_autosave`
- Always use `runtime.save.*` from the active pack — never hardcode another game’s adapter in UI
- Legacy key migration runs only when the pack sets `legacySaveKeyPrefix`

---

## Save versioning

Every save/autosave stores `definition.version`.

| Situation | Behavior |
|---|---|
| No version on old save | Load allowed; next save stamps current version |
| Same version | Load normally |
| Minor/patch drift, no migrator | Load with console warning |
| Major mismatch, no migrator | Slot marked `incompatible` — UI refuses load |
| `migrateSave(state, from, to)` provided | Return migrated state, or `null` to reject |

```ts
migrateSave: (state, from, to) => {
  // bump flags / reshape inventory for breaking content changes
  return state;
},
```

---

## Pack audio map

Prefer named cues over room-id substrings:

```ts
audio: {
  defaultMusic: "streets",
  music: { home: "calm", warehouse: "eerie", concert: "upbeat" },
  ambient: { warehouse: "wind", sewer: "drip", concert: "crowd" },
},
// on each room:
{ id: "bedroom", music: "home", /* … */ }
```

Built-in synth presets: `calm`, `eerie`, `underground`, `upbeat`, `neutral`, `noir`, `ambient`.
Host resolves `Room.music` → cue → preset via `setMusicCue`.

---

## Authoring at scale

Split large packs into per-room modules:

```
src/games/my-game/content/
  rooms/
    index.ts      # aggregates + applies audio cues
    bedroom.ts
    street.ts
  dialogues/
  itemCombinations.ts
```

Larger packs use this layout. Keep `locations.ts` as a thin re-export if you want a stable import path.

---

## Localization (i18n)

```ts
i18n: {
  defaultLocale: "en",
  messages: {
    en: { "hotspot.note.look": "A sticky note." },
    es: { "hotspot.note.look": "Una nota adhesiva." },
  },
},
// in hotspot responses:
import { msg } from "@/engine";
responses: { look: msg("hotspot.note.look", "A sticky note.") }
```

- `t(key)` / `locale` / `setLocale` on AdventureProvider (Settings shows Language when 2+ locales)
- Locale persisted per `gameId` in localStorage
- Inline English strings still work — migrate gradually

---

## Validation & tests

```ts
import { validateGameDefinition, createGame } from "@/engine";

const result = validateGameDefinition(myGame);
// result.errors / result.warnings

createGame(myGame); // throws if invalid
```

CI / local:

```bash
npx tsc --noEmit
npm test
```

Smoke tests boot each catalog pack, travel, interact, and assert save-key isolation.

---

## Adding a pack — end-to-end

**Prefer Studio:** `/pick` → Pack → wizard (`short-mystery` or blank) → Art handoff → Ship checklist → Download `.pack.json` (or Publish locally). Land sources later with `npm run pack-from-json`.

**TypeScript path:**

1. **Scaffold** from `_template` / `npm run new-pack`
2. **Art** — room JPGs, optional portraits/sprites/comics under pack-local `assets/` (or `src/assets`)
3. **Content** — rooms/hotspots/exits first; then dialogues; then combinations
4. **Actors** — ego placement + any NPCs worth portraits
5. **Juice** — transitions, speech, regions, local scripts, hints, stuck assist
6. **Specials / shell** — minigames/comics only if needed; set `shell` only for pack-owned intro/FX/epilogue
7. **Register** in `registry.ts` with a short `blurb`
8. **Validate** — boot the pack; fix `createGame` errors
9. **Playtest** — map travel, save/load, verb modes (incl. Give), one full puzzle chain

---

## What not to do

- Don’t import `@/games/<id>/...` from `src/engine/**`
- Don’t set `currentLocation` in React components
- Don’t put NPC/arcade/comic id branches in shared UI — use `specials` + `modalityRegistry`
- Don’t grow a second copy of inventory/travel/dialogue logic in the pack
- Don’t skip `validateGameDefinition` when reshaping rooms/exits
- Don’t put pack art in shared `src/assets/` — use `src/games/<id>/assets/`
- Don’t branch shared shell on `definition.id` — use `GameDefinition.shell`

**Maintainers:** module extraction patterns live in [`docs/REFACTORING.md`](../../docs/REFACTORING.md).
