# Games (packs)

**In plain words:** each game is a **pack** — one folder (or one Studio download) with rooms, pictures, and puzzles.

You play packs at `/play/<game-id>`. The home screen lists them from [`registry.ts`](./registry.ts).

Tone is up to you: cozy, spooky, funny, sunny — as long as it’s point-and-click. Pick your own art and music.

**New makers:** prefer Studio first — [docs/HOW-TO.md](../../docs/HOW-TO.md) — then come back here if you want a code folder in the repo.

---

## Docs (friendly → deeper)

| Doc | Purpose |
|---|---|
| **[docs/HOW-TO.md](../../docs/HOW-TO.md)** | Plain-language paths for every use case |
| **[docs/ENGINE-LANDING.md](../../docs/ENGINE-LANDING.md)** | Short play → make → ship |
| **[attic-study/WALKTHROUGH.md](./attic-study/WALKTHROUGH.md)** | Build a tiny game from scratch |
| **[docs/IMAGE-GEN-STARTER.md](../../docs/IMAGE-GEN-STARTER.md)** | AI art prompts |
| **[docs/RECIPES.md](../../docs/RECIPES.md)** | Puzzle ideas (`/pick/recipes`) |
| **[harbor-fog/README.md](./harbor-fog/README.md)** | Multi-room demo notes |
| **[_template/README.md](./_template/README.md)** | Code starter folder |
| **[../engine/PACKS.md](../engine/PACKS.md)** | Full authoring guide (technical) |
| **[docs/JSON-PACK-SCHEMA.md](../../docs/JSON-PACK-SCHEMA.md)** | Field cheat sheet (technical) |
| **[../engine/ASSETS.md](../engine/ASSETS.md)** | Picture sizes & audio rules |

---

## Games that ship with the project

| Pack | Plain role | Play at |
|---|---|---|
| **attic-study** | Tiny teaching game | `/play/attic-study` |
| **harbor-fog** | Short dockside mystery | `/play/harbor-fog` |
| **_template** | Blank-ish code starter | `/play/template-adventure` |

Full games can live in their own repositories — see [`docs/PRODUCTS.md`](../../docs/PRODUCTS.md).

---

## Create a pack (two ways)

### A) Studio (recommended)

1. `/pick?funnel=1&new=short-mystery`
2. Art handoff → Ship checklist → Play
3. **Download .pack.json** to share, or land it in the repo with `npm run pack-from-json`

### B) Code scaffold

```sh
npm run new-pack -- my-game --title "My Game"
# → src/games/my-game/ + registry entry + /play/my-game
```

Or copy `_template` and edit [`registry.ts`](./registry.ts).

Suggested layout when you grow past one file:

```
src/games/my-game/
  README.md           # short pitch + how to run
  manifest.ts         # the game definition
  index.ts
  audio.ts            # optional music / SFX map
  specials.ts         # optional minigames / comics
  content/
    rooms/
    dialogues/
    itemCombinations.ts
```

### Register it (code path)

Edit [`registry.ts`](./registry.ts):

```ts
import { myGame } from "./my-game/manifest";

export const gameCatalog: GameCatalogEntry[] = [
  // existing entries…
  {
    id: myGame.id,
    title: myGame.title,
    subtitle: myGame.subtitle,
    version: myGame.version,
    blurb: "Shown on the launcher card.",
    definition: myGame,
  },
];
```

---

## Rules of thumb

- Keep art inside the pack folder (`assets/`), not in shared app chrome folders.
- Prefer Studio for new short games; use TypeScript packs when you need deep custom logic.
- Don’t import one title’s code from another pack or from the engine core.
- Catalog `id` must match `manifest.id` (URL slug + save key).

### Verify a code pack

```sh
npm run dev            # open /play/my-game
npm run typecheck
npm test
```

`createGame` checks structure at boot — missing start room, bad exits, duplicate hotspot ids, etc. fail with a clear list.

## What belongs in a pack vs the shared app

| In the pack (your game) | In the shared app / engine |
|---|---|
| Rooms, clickables, dialogue | Verb bar, map chrome |
| Item combines, quests, achievements | Save / load dialogs |
| Characters, cutscenes, hints | Speech bar, transitions |
| Minigames / comics unique to your story | Shared minigame *players* |
| Music map, translations, map groups | Music engine, Settings |
| Optional intro / ending chrome | Host wires those hooks — no hard-coded game-id branches |

Do **not** hardcode your hotspot ids inside shared UI. Use pack `specials` / `shell` instead.

## Minimal viable pack (code)

Required:

- `id`, `title`, `version`, `startRoom`
- `rooms` (at least one)
- `combinations` (may be empty)
- `achievements`, `quests` (may be empty lists)

Nice next steps: player actor, default “I can’t do that” lines, one exit, one Look hotspot.

See the `_template` manifest for a working dual-room example.

More conventions: [`../engine/PACKS.md`](../engine/PACKS.md).
