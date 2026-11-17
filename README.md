# P.I.C.K. + S.C.R.I.P.T.

Portable Adventure Engine — visual editor (P.I.C.K.) and runtime (S.C.R.I.P.T.).

**Start here:** [`docs/ENGINE-LANDING.md`](./docs/ENGINE-LANDING.md) — Attic → Harbor → AI art → 30-min Studio funnel → ship.

AI art prompts: [`docs/IMAGE-GEN-STARTER.md`](./docs/IMAGE-GEN-STARTER.md).

Teaching demos: Attic Study + Harbor Fog.

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
npm run verify   # typecheck + tests + asset check + release consistency
npm run test:e2e # play screen in a real browser (phone + desktop)
```

## License

**Your game can use any licence.** The engine is GPL-3.0-only with the
[Pick-Script Game Exception](./LICENSE-EXCEPTION.md): games you make with it —
packs, art, audio, writing, your own code — may be open or closed, free or
commercial. Only changes to the engine itself must stay open. See `COPYRIGHT` /
`LICENSE` / `LICENSE-EXCEPTION.md`.
