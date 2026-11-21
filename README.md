# P.I.C.K. + S.C.R.I.P.T.

Portable Adventure Engine — visual editor (P.I.C.K.) and runtime (S.C.R.I.P.T.).

Make SCUMM-style point-and-click adventures — no code needed — and play them on the web, iPhone and Android.

- **Play:** rooms, inventory, use-with puzzles, dialogue, cutscenes, map travel, hints, quests, saves that survive updates. Works with a mouse, touch, the **keyboard alone** or a **screen reader**; interface and voice acting can be translated.
- **Make:** the Studio (P.I.C.K.) builds a whole game in the browser — a New game wizard, hotspots drawn on your art, puzzles, music, voice lines, a ship checklist, and an ending — then exports one `.pack.json` file anyone can import or host.
- **Your art, your licence:** bring your own pictures (prompt suggestions for any image tool, a list of free CC0 packs, palette matching, credits for what you use). Games made with the engine may use any licence.

Teaching demos: **Attic Study** (one room, two puzzles) and **Harbor Fog** (a five-room mystery).

## Documentation

| You want to… | Read |
|---|---|
| Play the demos, make a first game, share it — plain language | [`docs/HOW-TO.md`](./docs/HOW-TO.md) · [`docs/ENGINE-LANDING.md`](./docs/ENGINE-LANDING.md) |
| Use the Studio (tabs, art, palettes, credits, endings) | [`docs/STUDIO.md`](./docs/STUDIO.md) |
| Make art with an image AI | [`docs/IMAGE-GEN-STARTER.md`](./docs/IMAGE-GEN-STARTER.md) |
| Copy-paste puzzle patterns | [`docs/RECIPES.md`](./docs/RECIPES.md) |
| Write packs in TypeScript / every pack field | [`src/engine/PACKS.md`](./src/engine/PACKS.md) · [`docs/JSON-PACK-SCHEMA.md`](./docs/JSON-PACK-SCHEMA.md) |
| Art and audio sizes | [`src/engine/ASSETS.md`](./src/engine/ASSETS.md) |
| Put it online / build the phone apps | [`DEPLOY.md`](./DEPLOY.md) · [`CAPACITOR.md`](./CAPACITOR.md) |
| Use the engine inside your own app | [`docs/ENGINE-PACKAGE.md`](./docs/ENGINE-PACKAGE.md) |
| Take a new engine release | [`docs/UPGRADING.md`](./docs/UPGRADING.md) |
| Contribute or cut a release | [`CONTRIBUTING.md`](./CONTRIBUTING.md) · [`docs/RELEASING.md`](./docs/RELEASING.md) · [`docs/SHIP-NIGHT.md`](./docs/SHIP-NIGHT.md) |
| Engine internals | [`src/engine/ENGINE.md`](./src/engine/ENGINE.md) · [`src/engine/SHELL.md`](./src/engine/SHELL.md) · [`docs/SECURITY.md`](./docs/SECURITY.md) |

## Versions & updates

Current release: **0.5.0** — see [`CHANGELOG.md`](./CHANGELOG.md).

- Using the engine in your own app? Install the package from a release — [`docs/ENGINE-PACKAGE.md`](./docs/ENGINE-PACKAGE.md).
- Building a game on the engine? [`docs/UPGRADING.md`](./docs/UPGRADING.md) explains how to take a new release and keep players' saves working.
- Maintaining the engine? [`docs/RELEASING.md`](./docs/RELEASING.md) has the versioning policy and release checklist.

Get releases from the [Releases page](https://github.com/aarondavidson/Pick-Script/releases) (notes, source, and a ready-to-host web build). Use tagged releases (`v0.5.0`), not `main`, as the base for a shipped game. To be notified of new versions: **Watch → Custom → Releases**.

## Develop

Needs **Node.js 22.12+** (`nvm use` reads `.nvmrc`).

```sh
npm install
npm run dev
npm run build
npm run verify   # typecheck + lint + tests + asset check + release consistency
npm run test:e2e # play screen in a real browser (phone + desktop)
```

## License

**Your game can use any licence.** The engine is GPL-3.0-only with the
[Pick-Script Game Exception](./LICENSE-EXCEPTION.md): games you make with it —
packs, art, audio, writing, your own code — may be open or closed, free or
commercial. Only changes to the engine itself must stay open. See `COPYRIGHT` /
`LICENSE` / `LICENSE-EXCEPTION.md`.
