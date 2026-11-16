# Upgrading the engine

For anyone who ships a game on S.C.R.I.P.T. — whether your game lives in this
repo (`src/games/<id>/`) or in your own repo with a copied ("vendored")
`src/engine/`.

Maintainers cutting a release: see [`RELEASING.md`](./RELEASING.md).

## Which engine am I on?

```ts
import { ENGINE_VERSION } from "@/engine";
console.log(ENGINE_VERSION); // "0.4.0"
```

Engine copies from before 0.2.0 have no `ENGINE_VERSION` export — treat them as
**0.1.0**.

Three version numbers exist. They move independently:

| Number | Where | Who bumps it | Meaning |
|---|---|---|---|
| **Engine version** | `ENGINE_VERSION`, root `package.json`, git tag `vX.Y.Z` | Engine maintainers | The runtime you are running |
| **Pack version** | `version` on your pack | You | Your game's content; stamped into every save |
| **Pack schema version** | `schemaVersion` in `.pack.json` | Engine maintainers | The shape of the JSON file format |

## How to upgrade

1. **Read the notes.** Open [`CHANGELOG.md`](../CHANGELOG.md) and read every
   **Upgrade notes** block between your version and the target. The per-version
   summaries below repeat the parts that need action.
2. **Take a release, not `main`.** The
   [Releases page](https://github.com/aarondavidson/Pick-Script/releases) lists
   the tested points, with notes and downloads.
3. **Replace the engine as a whole.**
   - *Installed as a package (recommended, 0.4.0+):* install the new `.tgz`
     from the release — see [`ENGINE-PACKAGE.md`](./ENGINE-PACKAGE.md).
   - *Game inside this repo:* merge or rebase onto the tag.
   - *Vendored copy:* delete your `src/engine/` and copy the tagged one in.
     The runtime is self-contained (it imports nothing outside the folder
     except `react`, and reads build flags from Vite's `import.meta.env`), so a
     whole-folder swap is safe. Do not merge file by file. A few `*.test.ts`
     files import this repo's demo packs (`@/games/…`, `@/authoring/…`) — skip
     those tests if your repo does not have them.
4. **Check it.**
   ```bash
   npm run typecheck
   ```
   ```bash
   npm test
   ```
   ```bash
   npm run pack-doctor -- path/to/your.pack.json
   ```
5. **Test an old save.** Before upgrading, save in your current build and use
   **Save menu → Export backup**. After upgrading, import it and load it. This
   is the single most valuable check — players keep their saves across updates.
6. **Ship.** Bump your own pack `version` if your content changed (see
   [Updating your own game](#updating-your-own-game-without-breaking-saves)).

### Keep local engine edits out of the engine folder

If you change files inside a vendored `src/engine/`, every upgrade becomes a
manual merge. Prefer, in order:

1. Pack hooks — `scripts`, `specials`, `shell`, `migrateSave`.
2. An issue or pull request here, so the fix reaches everyone.
3. If you must patch locally, keep each patch as its own commit with a note,
   so you can re-apply it after the next swap.

## What you can rely on

The engine follows [semantic versioning](https://semver.org). The **public
contract** is:

- everything exported from `src/engine/index.ts` and `src/engine/script`
- the `GameDefinition` shape and the `.pack.json` format
- the save format and browser storage keys (`adventure_<id>_save_<n>`,
  `adventure_<id>_autosave`)
- the `npm run` commands documented in the README and CONTRIBUTING

| Release | May contain |
|---|---|
| **Patch** `0.2.0 → 0.2.1` | Bug fixes only. Safe to take without reading more than the changelog |
| **Minor** `0.2.x → 0.3.0` | New features. While the engine is `0.x`, a minor release may also change behaviour — always listed under **Upgrade notes** |
| **Major** `0.x → 1.0`, `1.x → 2.0` | Breaking changes, with a migration path written here |

Promises that hold across all releases:

- **Old saves keep loading.** Fields are only ever added to the save format;
  missing fields are filled in on load.
- **Old `.pack.json` files keep loading.** When `schemaVersion` goes up, the
  engine upgrades older files automatically (`JSON_PACK_MIGRATIONS`).
- **Removals are announced.** An export is marked `@deprecated` (with its
  replacement) for at least one minor release before it is removed.

Anything not exported from the two entry points is internal and can change in
any release — import from `@/engine`, not from deep file paths.

## Requiring a minimum engine

If your pack uses a feature added in a particular release, say so:

```ts
// TypeScript pack
export const myGame: GameDefinition = {
  id: "my-game",
  version: "1.2.0",
  minEngineVersion: "0.2.0",
  // …
};
```

```json
{ "schemaVersion": 1, "id": "my-game", "version": "1.2.0", "minEngineVersion": "0.2.0" }
```

An older engine then refuses the pack at boot with *"needs engine 0.2.0 or
newer"* instead of failing halfway through play. Engines before 0.2.0 ignore
the field.

## Updating your own game without breaking saves

Every save records your pack `version`. On load:

| Saved version vs. current | No `migrateSave` | With `migrateSave` |
|---|---|---|
| Same | Loads | Loads |
| Minor / patch differs | Loads (console warning) | Migrator runs |
| Major differs | Slot shown as incompatible | Migrator runs |
| Migrator returns `null` or throws | — | Slot shown as incompatible, never deleted |

What the engine does for you on every load (0.2.0+):

- adds **achievements, quests and actors** your update introduced
- refreshes achievement / quest text from the pack, keeping progress
- sets `initialFlags` / `initialObjectStates` the save has never seen
- moves the player to `startRoom` if their room no longer exists
- drops unknown rooms from the visited list

What you must handle in `migrateSave`:

- **renamed or removed room, item or flag ids** — map old ids to new ones
- **puzzles whose solution changed** — decide what an in-progress save means

```ts
migrateSave: (state, from, to) => {
  // 1.x → 2.0 renamed the cellar
  const rename = (id: string) => (id === "cellar" ? "basement" : id);
  return {
    ...state,
    currentLocation: rename(state.currentLocation),
    visitedLocations: state.visitedLocations.map(rename),
  };
},
```

The migrator receives the save **as it was written** (old ids intact). Its
result is then clamped to the current pack, so it does not need to be perfect.

Rules of thumb:

- Never change your pack `id` — it is the save key. If you must, set
  `legacySaveKeyPrefix`.
- Prefer adding new ids over renaming old ones.
- Bump **patch** for text and art, **minor** for new content, **major** when
  old saves cannot sensibly continue.

## Version notes

### 0.3.0 → 0.4.0

No pack data changes are required.

| Change | Do you need to act? |
|---|---|
| Licence is GPL-3.0-only **with the Game Exception** — your game can use any licence | No. If you vendored the engine, take the new `COPYRIGHT` and `LICENSE-EXCEPTION.md` with it |
| The engine is an installable package with the play UI | Optional, recommended: replace a vendored `src/engine` with the package — [`ENGINE-PACKAGE.md`](./ENGINE-PACKAGE.md) |
| `AdventurePlaySurface` / `PlayMobileMenu` no longer use the router | Only custom shells: pass `onHome={() => …}` to keep the home link |
| Room art is preloaded, with a loading state | No. Custom shells can use `collectRoomMediaUrls` |
| Packs may keep media in an `assets/` folder | Optional, recommended for anything bigger than a few rooms: Studio → **Download for web hosting (.zip)** |
| Saves are mirrored to native storage in Capacitor apps | Capacitor apps: `npm install @capacitor/preferences`, `npx cap sync`. Custom native shells: call `setSaveMirror(…)` at startup |
| `npm run pack:engine` builds the real package | Only if you scripted the old dry-run |

Use `configureDeployLock` instead of `VITE_STRICT_PLAY` / `VITE_SAVE_INTEGRITY_KEY`
when you consume the package (those variables are fixed when the package is built;
the packaged default is strict play on, no save sealing).

### 0.2.0 → 0.3.0

No pack data changes are required, but games **look different** — check each one once.

| Change | Do you need to act? |
|---|---|
| The play scene is always 16:9 (the Studio stage shape) | Check room art that is not 16:9 — it is cropped to fill. Hotspots now line up with the art on every screen |
| Characters scale with the room instead of being a fixed pixel size | Check character sizes: slightly smaller on phones, larger on desktop. Adjust with `scale` on the actor / Studio → Pack → Actors → **Size on stage** |
| New phone layouts (upright and sideways) and desktop side panel | No. Custom shells: see "Play layouts" in `src/engine/SHELL.md` |
| `useGameDimensions` hook removed | Only custom shells — use `usePlayLayout` |
| Character images are cut out on import in the Studio | Characters that show in a box: Pack → Actors → **Remove background**, or replace with a transparent PNG |
| New: actor `scale` | Optional. Set `minEngineVersion: "0.3.0"` if your pack relies on it |

### 0.1.0 → 0.2.0

No pack changes are required. Behaviour that changed:

| Change | Do you need to act? |
|---|---|
| `migrateSave` now runs **before** the save is clamped to the pack, and its result is clamped afterwards | Only if your migrator relied on already-sanitized input (e.g. assumed `currentLocation` always exists in the new pack). Renames now work as you would expect |
| A `migrateSave` that throws marks the slot incompatible instead of making it look empty | No |
| Loaded saves gain new achievements / quests / actors / initial flags from the pack | Only if you worked around this by hand in `migrateSave` — the workaround can go |
| Saves whose `gameId` differs from the pack id are always rejected | No (previously a malformed id slipped through) |
| When the browser holds two copies of a save, the one with the newer in-save timestamp wins | No |
| "Copy TS pack" / "Download game folder" now include items, hints, cutscenes, quests, win flag and credits | Re-export any TS pack you generated from Studio with 0.1.0 — it was missing that content |
| Node.js **22.12+** is required for the dev toolchain | Update Node (`nvm use`) |
| New: `ENGINE_VERSION`, `minEngineVersion`, `winFlag`, `credits` | Optional |

Known limit, unchanged: autosave overwrites an incompatible autosave slot.
Manual slots are only overwritten when the player chooses to.
