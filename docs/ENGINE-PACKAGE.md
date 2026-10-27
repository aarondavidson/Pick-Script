# Shared engine package (scaffold)

Future npm package: **`@portable-adventure/engine`** (alias intent: `@pick-script/engine`).

Manifest: [`packages/engine/package.json`](../packages/engine/package.json).  
Entry: [`packages/engine/src/index.js`](../packages/engine/src/index.js) — stub until extract + publish (throws with a clear message). Types: [`packages/engine/src/index.d.ts`](../packages/engine/src/index.d.ts).

## Status

| Phase | State |
|---|---|
| Scaffold (`packages/engine`) | Done — private, not published |
| Extract / move `src/engine` | **Not done** (too risky for this pass) |
| Root npm `workspaces` | **Skipped** — avoids Vite/CI coupling until extract |
| Pack dry-run (`npm run pack:engine`) | Done — validates `package.json` + tarball file list |
| Publish to npm | After extract + stable API |

## Pack dry-run

From the monorepo root:

```bash
npm run pack:engine
```

This runs [`scripts/pack-engine-dry-run.mjs`](../scripts/pack-engine-dry-run.mjs), which:

1. Checks `main` / `exports` / `types` point at files that exist under `packages/engine`.
2. Rejects a deep re-export of `../../../src/engine` (that path is outside the package and would not be in the tarball).
3. Runs `npm pack --dry-run` in `packages/engine` and asserts the tarball would include `package.json`, `README.md`, and the index entry.

The stub index **throws** if imported from a packed install:

> use the monorepo path (`@/engine` → `src/engine`) until extract + publish

That is intentional: dry-run proves the package shape is packable; it does not ship the full runtime yet.

## How titles depend on the engine

### Today (monorepo)

- App and packs import `@/engine` → `src/engine/`.
- Do **not** import `@portable-adventure/engine` in app code yet.

```ts
// Monorepo (correct today)
import { createGameFromJson, translate } from "@/engine";
```

### Games in their own repos (until publish)

Games built on the engine in separate repositories **vendor** a copy of `src/engine`. Cross-cutting fixes land here first, then get copied or cherry-picked into those repos.

### Post-publish (target)

1. Extract `src/engine` into `packages/engine` (or a dedicated Pick-Script package repo).
2. Replace the stub `src/index.js` with real re-exports of the public API.
3. Publish `@portable-adventure/engine` under GPL-3.0-only.
4. Games in other repos depend on the package version instead of vendoring `src/engine`.

```ts
// After publish (target)
import { createGameFromJson, translate } from "@portable-adventure/engine";
```

5. Optionally enable `"workspaces": ["packages/*"]` in the monorepo root once tooling is verified.

## Author note

Keep engine public surface documented in `src/engine` and [`PICK-SCRIPT.md`](./PICK-SCRIPT.md). The package name is reserved here so the split does not invent a new identity later.
