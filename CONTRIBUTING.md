# Contributing

This repo is a **point-and-click adventure engine** plus game **packs**.
Licensed under **[GPL-3.0-only](./LICENSE)** — contributions are under the same terms.

**New here?** Plain-language paths: [`docs/HOW-TO.md`](./docs/HOW-TO.md).

## Setup

```sh
npm install
npm run verify       # typecheck + test + check-assets
npm run dev          # http://localhost:8080
```

CI runs the same checks on pushes/PRs.

## What kind of change is this?

| Area | Paths | Expectations |
|---|---|---|
| **Engine** | `src/engine/` | Keep packs working; add/extend tests in `createGame.test.ts` (or nearby); update `ENGINE.md` / `PACKS.md` if the authoring contract changes |
| **Host shell** | `src/components/game/`, `src/contexts/` | Prefer pack `specials` / modalities over hardcoding game ids; no pack-specific imports in the engine |
| **Pack content** | `src/games/<id>/` | Valid `GameDefinition`; art per [`ASSETS.md`](./src/engine/ASSETS.md); register in `registry.ts` (or use `npm run new-pack`) |
| **Docs / tooling** | `*.md`, `scripts/`, `.github/` | Keep root README links accurate; scaffolds must leave `typecheck` + `test` green |

**Rule:** engine code never imports a specific game. Games never reimplement travel/inventory/dialogue.

## New game pack

```sh
npm run new-pack -- my-game --title "My Game"
npm run typecheck && npm test
```

Plain guide: [`docs/HOW-TO.md`](./docs/HOW-TO.md).  
Authoring guide: [`src/engine/PACKS.md`](./src/engine/PACKS.md).  
Teaching pack: [`src/games/attic-study/WALKTHROUGH.md`](./src/games/attic-study/WALKTHROUGH.md).  
Puzzle recipes: [`docs/RECIPES.md`](./docs/RECIPES.md) · `/pick/recipes`. Author mode: Ctrl+Shift+H.  
Starter pack: [`src/games/_template/`](./src/games/_template/).

## PR checklist

- [ ] `npm run typecheck` and `npm test` pass
- [ ] `npm run check-assets` passes (warnings OK for legacy art; no new hard-limit violations)
- [ ] Engine API changes documented (`PACKS.md` / `ENGINE.md` / `ASSETS.md` as needed)
- [ ] Pack changes: stable `definition.id`, save-safe; use `runtime.travel` / exits, not raw `currentLocation` writes in UI
- [ ] No secrets or large binary dumps unrelated to the game

## Asset rules

Documented in [`src/engine/ASSETS.md`](./src/engine/ASSETS.md). Enforced by `npm run check-assets`:

- **Errors** (CI fail): unreadable images, rooms over 1 MB, oversized items/NPCs/comics
- **Warnings** (do not fail CI): rooms below 1280×720, non-canonical dimensions — fix when touching that art; use `--strict` locally if you want warnings to fail

## License & copyright

**Copyright (C) 2025–2026 Aaron Davidson** — see [`COPYRIGHT`](./COPYRIGHT) and [`LICENSE`](./LICENSE) (`GPL-3.0-only`).

By contributing, you agree your changes are licensed under the GNU GPL v3.0 only (`GPL-3.0-only`), same as this repository. Please do not remove copyright or attribution notices.
