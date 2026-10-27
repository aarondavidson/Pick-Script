# Portable Adventure Engine — S.C.R.I.P.T.

**S.C.R.I.P.T.** (*Story Creation & Retro Interactive Puzzle Toolkit*) is this
runtime: pack state, verbs, rooms, dialogue, and save/load. The companion visual
editor is **P.I.C.K.** (*Point-and-Interactive Creation Kit*) — Design studio +
Author mode. Naming map: [`docs/PICK-SCRIPT.md`](../../docs/PICK-SCRIPT.md).

A SCUMM-inspired point-and-click runtime for React (and headless use). Content
lives as packs under `src/games/` (this repo: `attic-study`, `harbor-fog`, `_template`).

---

## SCUMM / modern comparison

| Concept | Classic SCUMM | AGS / Escoria / Visionaire | This engine |
|---|---|---|---|
| Room | Room | Room / Scene | `Room` (`Location` alias) |
| Hotspot / Object | Object | Hotspot / Object | `Hotspot` |
| Actor / NPC | Actor | Character | `Actor` (+ hotspot dialogue) |
| Verb | Verb table | Verb / action | `VerbId` / `VerbDef` (classic includes **Give**) |
| Script | SCUMM bytecode | Room scripts / ActionLists | `onInteract`, PackActions, `ScriptHook`, `namedScripts` |
| Variables | Bits / vars | Global vars | `flags` + `vars` |
| Inventory | Inventory | Inventory | `inventory` + `combinations` |
| Dialogue | SayLine / trees | Dialog trees | `DialogueTree` + `lineId` / `voiceKey` |
| Walk / regions | BOXD / regions | Walkables / terrain | AABB walkboxes (+ optional polygon `points`, `links`, `floor` / `floorTransition`), `Room.regions` enter/exit, `Room.timers` |
| Save | Save games | Save slots | `createSaveAdapter(gameId)` |
| Cutscene | Cutscene mode | Cutscenes | `CutsceneDef` + wait/goto/parallel + camera |

**Still optional / not pursued (by design):**

- Compiled bytecode (TypeScript hooks + JSON PackActions instead)
- Industrial Unity-style navmesh (we keep walkbox BFS + optional explicit `links` / portal midpoints / multi-floor layers)
- Retail SCUMM / AGS / WME import
- 3D / 2.5D worlds
- Parser-first text adventures (Adventuron niche)

Peer research notes (AGS, Visionaire, AC, PowerQuest, Escoria, …) informed
ActionList polish, walk regions, Give, lip-sync, conditionals, and camera ops.

---

## Architecture

```
src/engine/                 # Portable runtime (game-agnostic)
  types.ts / definition.ts / createGame.ts / AdventureProvider.tsx
  validate.ts               # Pack structural validation (boot + CI)
  packActions.ts            # Declarative ActionList-lite chains
  regions.ts                # Walk-region enter triggers
  blendPacks.ts             # Merge donor packs into a base
  specials.ts               # Modality / special-action types
  PACKS.md                  # ★ How to author & ship packs (start here)
  ENGINE.md                 # Architecture + SCUMM comparison (this file)

src/games/
  registry.ts               # Multi-game catalog (product-filtered)
  _template/                # Starter pack
  attic-study/              # Teaching pack (1 room / 2 puzzles)
  harbor-fog/               # Engine demo (JSON-built, 5 rooms)

src/product/                # product config (launcher / branding)
src/contexts/GameContext.tsx
src/components/game/        # Presentation shell (pack-agnostic APIs)
```

**Rule of thumb:** engine never imports a specific game. Games never reimplement
inventory/travel/dialogue walking. Title-specific intro / canvas FX / epilogue
are opted in via `GameDefinition.shell` — not `definition.id === "…"`.

**Pack authoring:** see [`PACKS.md`](./PACKS.md).

---

## Boot a game

Prefer the teaching pack in docs and tests:

```tsx
import { AdventureProvider } from "@/engine";
import { atticStudyGame } from "@/games/attic-study/manifest";

<AdventureProvider definition={atticStudyGame}>
  <YourUI />
</AdventureProvider>
```

Headless / tests:

```ts
import { createGame } from "@/engine";
import { atticStudyGame } from "@/games/attic-study/manifest";

const runtime = createGame(atticStudyGame);
let state = runtime.createInitialState();
const room = runtime.getRoom(state.currentLocation);
```

---

## Authoring a new game

**Plain guide (all use cases):** [`docs/HOW-TO.md`](../../docs/HOW-TO.md).

**Studio-first (30 minutes):** `/pick?funnel=1` → New game → **`short-mystery`** →
Art handoff (hub art + `harbor_key` icon) → Ship checklist → Play draft.
Homepage: [`docs/ENGINE-LANDING.md`](../../docs/ENGINE-LANDING.md).

**TypeScript pack (repo landing):**

1. `npm run new-pack -- my-game --title "My Game"` (or copy `_template/`)
2. Fill `rooms`, `combinations`, `achievements`, `quests`
3. Prefer pack-local `assets/` (Harbor Fog / Attic Study style)
4. Open `/play/my-game`

JSON packs from Studio Download / Import also land with
`npm run pack-from-json`.

### Pack-owned shell knobs

```ts
shell: {
  // Lazy loaders — the UI ships only with the pack that imports it
  intro: () => import("./ui/Intro").then((m) => ({ default: m.Intro })),
  canvasFx: () => import("./ui/Fx").then((m) => ({ default: m.Fx })),
  complete: () => import("./ui/Ending").then((m) => ({ default: m.Ending })), // or omit / "generic"
  chrome: { hideJournal: true }, // optional play-header hides — see SHELL.md
},
legacySaveKeyPrefix: "oldname_save_", // optional: copy oldname_save_<n> → adventure_<id>_save_<n>
```

Omit `shell` to use the generic complete screen. `complete` receives `{ gameState, onRestart }` (`ShellCompleteProps`).
Mobile play uses a compact Menu sheet (Settings folded in). Details: [`SHELL.md`](./SHELL.md).

### Minimal room

```ts
{
  id: "kitchen",
  name: "Kitchen",
  description: "Smells like coffee.",
  image: kitchenImg,
  hotspots: [/* ... */],
  exits: [{ direction: "south", to: "street", label: "Front door" }],
  walkboxes: [{ id: "floor", x: 10, y: 60, width: 80, height: 30, scale: 1 }],
  regions: [
    { id: "near_stove", x: 40, y: 50, width: 20, height: 20, setFlag: "smelledKitchen" },
  ],
  onEnter: (state) => ({ flags: { ...state.flags, seenKitchen: true } }),
}
```

---

## Save isolation

### Saves (web-first)

- **Primary:** IndexedDB (`adventure-game-saves`) with checksummed envelopes
- **Mirror:** `localStorage` keys `adventure_<gameId>_save_<slot>` (+ `_autosave`)
- **Fallback:** in-memory if both unavailable (private mode) — UI prompts Export backup
- **Flush:** on tab hide / `pagehide`
- **Backup:** `runtime.save.exportBackup()` / `importBackup()`
- Old save keys migrate only when the pack sets `legacySaveKeyPrefix`

Enable with `autosave: true` or `{ enabled, debounceMs }` on the pack.

Optional **`VITE_SAVE_INTEGRITY_KEY`**: seals slots (client-side bar, not secrecy).

---

## Deploy lock (strict play)

Public production builds (`!DEV`, no `VITE_ENABLE_STUDIO`) enable **strict play**
by default (`VITE_STRICT_PLAY` overrides).

| Guard | Behavior |
|---|---|
| Pack catalog | Shipped ids win over Studio-installed overrides |
| Sidecar / draft play | Geometry sidecars and `/play/studio-draft` ignored / redirected |
| Fast travel | `travelToRoom` enforces map visited / fog policy |
| State load / patch | Unknown rooms clamped; inventory sanitized |
| Definition | `Object.freeze` on rooms / hotspots / exits |
| Author routes | `/pick` · `/studio` · `/recipes` redirect home when studio is off |

---

## Feature tiers (archive-informed) — all shipped

**Tier A** — `onExit`, `objectStates`, `doSentence` (use-with + **give**), default
verb responses, cutscene controller.

**Tier B** — actors / ego / costumes, concurrent `namedScripts` + `breakHere` /
delay, walkboxes + walk-to-before-interact, camera follow / room scroll.

**Tier B.5** — idle/walk/talk anim, walkbox depth scale, room transitions,
speech bar + `voiceKey` / VO timing, captions + text scale.

**Tier C** — `Room.localScripts`, hotspot export, multi-game launcher + product skins.

**Tier D** — multi-ego, `verbMode` classic / simple / coin, progressive hints,
autosave, stuck assist, event juice + haptics.

**Authoring accelerators** — Studio ActionLists, walk regions, blend packs,
setting kits, line catalog CSV, pack doctor / soft-lock, Harbor Fog demo.

### Classic SCUMM room blocks

| SCUMM block | We have? |
|---|---|
| **ENCD / EXCD** | Yes — `onEnter` / `onExit` |
| **OBCD / VERB** | Yes — `responses` + `onInteract` + PackActions |
| **Object state bits** | Yes — `objectStates[id]` |
| **LSCR** | Yes — `Room.localScripts` |
| **BOXD** | Partial — AABB (+ optional polygon / `links` / multi-floor) + portal+center BFS; plus `regions` / `timers` |
| **Global scripts** | Yes — `namedScripts` + concurrent runner |
| **Sentence / Give** | Yes — `doSentence` (use + give with inventory) |
| **Cutscene** | Yes — wait / goto / parallel / camera / juice |
| **Actors / camera / timing** | Yes — ego, facing costumes, follow + pan/zoom, `delay` / `breakHere` |

---

## Public APIs worth knowing

```ts
import {
  createGame,
  AdventureProvider,
  blendPacks,
  blendPacksMany,
  runPackActions,
  checkRegionEntries,
  resolveVerbs,
  extractPackStrings,
  diagnosePack,
} from "@/engine";
```

| Module | Role |
|---|---|
| `packActions.ts` | ActionList-lite (`if`, `requireItem`, `juice`, …) |
| `regions.ts` | Ego enter/exit on `Room.regions` (flags, juice, ActionLists) |
| `roomTimers.ts` | Dwell timers → flags / actions |
| `walkboxes.ts` | AABB + polygon containment; BFS via AABB or `links`; portal midpoints; multi-floor (`floor` / `vars.walkFloor`) |
| `camera.ts` | Follow + pan/zoom ease (script / cutscene) |
| `blendPacks.ts` | Merge donor pack layers into a base |
| `lineCatalog.ts` | Stable line ids + CSV locale / VA export |
| `juice.ts` / `haptics.ts` / `stuckAssist.ts` | Feel / mobile assist; region + cutscene juice; stuck hotspot pulse |
| `speech.ts` | `mouthCues` → `getMouthShapeAt` live lip-sync |
| `actorArt.ts` | Directional costume sheets |
| `jsonPackSpecials.ts` | Allowlisted JSON specials → `SpecialActionDef` |
| `packDoctor.ts` / `softLock.ts` | Author readiness |

JSON field cheat sheet: [`docs/JSON-PACK-SCHEMA.md`](../../docs/JSON-PACK-SCHEMA.md).

---

## What we match well

- Room + hotspot + verb / Give / use-with sentence bus
- Flags + vars, dialogue trees, inventory combinations
- Save slots, per-game isolation, product skins
- Pack / content separation (`src/games/<id>/`) ready for three remotes
