# S.C.R.I.P.T. — Adventure engine

**S.C.R.I.P.T.** (*Story Creation & Retro Interactive Puzzle Toolkit*) is the
runtime & scripting layer of the Portable Adventure Engine. The visual editor
is **P.I.C.K.** — see [`docs/PICK-SCRIPT.md`](../../docs/PICK-SCRIPT.md).

Portable SCUMM-inspired runtime. **Game-agnostic** — it never imports any pack.

## Docs

| Doc | Audience |
|---|---|
| **[../../docs/PICK-SCRIPT.md](../../docs/PICK-SCRIPT.md)** | P.I.C.K. vs S.C.R.I.P.T. naming |
| **[PACKS.md](./PACKS.md)** | Pack authors — how to build and ship a game |
| **[../../docs/JSON-PACK-SCHEMA.md](../../docs/JSON-PACK-SCHEMA.md)** | `.pack.json` field cheat sheet |
| **[SHELL.md](./SHELL.md)** | Host UI — travel, map, audio, touch, Capacitor |
| **[ASSETS.md](./ASSETS.md)** | Image sizes, sprites, portraits, SFX/music requirements |
| **[ENGINE.md](./ENGINE.md)** | Engine internals, SCUMM comparison, feature tiers |
| **[../../docs/REFACTORING.md](../../docs/REFACTORING.md)** | Module extraction & split-safe practices |

## Public entry points

```ts
import {
  createGame,              // headless runtime
  AdventureProvider,       // React host
  useAdventure,
  validateGameDefinition,
  linkRooms,               // bidirectional exits
  msg,                     // i18n helper
} from "@/engine";
```

### Headless

```ts
const runtime = createGame(myDefinition); // validates pack
let state = runtime.createInitialState();
const room = runtime.getRoom(state.currentLocation);
const result = runtime.doSentence(hotspot, "look", state);
```

### React

```tsx
<AdventureProvider definition={myDefinition}>
  <YourUI />
</AdventureProvider>
```

The app host wraps this in `GameProvider` (`src/contexts/GameContext.tsx`) to wire music/SFX.

## Module map

| File | Role |
|---|---|
| `definition.ts` | `GameDefinition` contract (`shell`, `legacySaveKeyPrefix`, …) |
| `types.ts` | Room, Hotspot, Actor, GameState, … |
| `createGame.ts` | Binds a pack into `AdventureRuntime` |
| `AdventureProvider.tsx` | React composer — context + wiring |
| `adventure/useWalkTick.ts` | RAF walk + scripts + camera |
| `adventure/useSentenceInteract.ts` | Sentence / use-with / give |
| `adventure/useTravel.ts` | Exit + map travel + transitions |
| `adventure/useCutsceneHost.ts` | Cutscene start / advance / skip |
| `adventure/useModalityHost.ts` | Pending modality lifecycle |
| `jsonPack.ts` | Barrel for JSON pack API |
| `jsonPackTypes.ts` / `jsonPackCompile.ts` / `jsonPackDialogue.ts` / `jsonPackCutscenes.ts` / `jsonPackValidate.ts` | JSON pack pipeline |
| `validate.ts` | Structural pack checks (boot + CI) |
| `save.ts` | Per-game slots + autosave + versioning |
| `security.ts` | Media + packUrl allowlists, safe JSON |
| `packActions.ts` | Declarative ActionList-lite chains |
| `regions.ts` | Walk-region enter triggers (`Room.regions`) |
| `blendPacks.ts` | Merge donor packs into a base |
| `juice.ts` / `stuckAssist.ts` / `haptics.ts` | Feel / mobile assist |
| `lineCatalog.ts` | Stable line ids + CSV locale / VA export |
| `verbs.ts` / `hints.ts` / `specials.ts` / `audio.ts` / `i18n.ts` | QoL / pack features |
| `scriptRunner.ts` / `actors.ts` / `walkboxes.ts` / … | Classic SCUMM body |

## Invariants

1. **No pack imports** inside `src/engine/**`
2. **Room changes** go through `travel` / `travelThroughExit` / `travelToRoom`
3. **Saves** are keyed by `definition.id` and stamped with `definition.version`
4. **Invalid packs throw** from `createGame` — see `validateGameDefinition`

## Tests

```sh
npm test                 # vitest — createGame smokes
npx tsc --noEmit
```

Add cases next to the code (`*.test.ts`) when you change runtime contracts.
