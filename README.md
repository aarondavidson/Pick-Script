# P.I.C.K. + S.C.R.I.P.T.

Portable Adventure Engine — visual editor (P.I.C.K.) and runtime (S.C.R.I.P.T.).

**Start here:** [`docs/ENGINE-LANDING.md`](./docs/ENGINE-LANDING.md) — Attic → Harbor → AI art → 30-min Studio funnel → ship.

AI art prompts: [`docs/IMAGE-GEN-STARTER.md`](./docs/IMAGE-GEN-STARTER.md).

Teaching demos: Attic Study + Harbor Fog.

## Versions & updates

Current release: **0.3.0** — see [`CHANGELOG.md`](./CHANGELOG.md).

- Building a game on the engine? [`docs/UPGRADING.md`](./docs/UPGRADING.md) explains how to take a new release and keep players' saves working.
- Maintaining the engine? [`docs/RELEASING.md`](./docs/RELEASING.md) has the versioning policy and release checklist.

Get releases from the [Releases page](https://github.com/aarondavidson/Pick-Script/releases) (notes, source, and a ready-to-host web build). Use tagged releases (`v0.3.0`), not `main`, as the base for a shipped game. To be notified of new versions: **Watch → Custom → Releases**.

## Develop

Needs **Node.js 22.12+** (`nvm use` reads `.nvmrc`).

```sh
npm install
npm run dev
npm run build
npm run verify   # typecheck + tests + asset check + release consistency
```

## License

GPL-3.0-only — see `COPYRIGHT` / `LICENSE`.
