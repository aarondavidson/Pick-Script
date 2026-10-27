# `@portable-adventure/engine`

Scaffold for publishing the S.C.R.I.P.T. runtime as a package. **Source of truth is still `src/engine/` in this monorepo.**

> **New here?**  
> Product landing: [`docs/ENGINE-LANDING.md`](../../docs/ENGINE-LANDING.md) · AI art: [`docs/IMAGE-GEN-STARTER.md`](../../docs/IMAGE-GEN-STARTER.md)

The packed entry (`src/index.js`) is a **stub** that throws until extract + publish — so `npm pack` succeeds with a valid manifest without shipping a broken deep re-export of `../../../src/engine`.

## Sync strategy (until publish)

| Consumer | How they get the engine |
|---|---|
| This repo (Studio, demos) | Import `@/engine` — do not switch to this package yet |
| Games in their own repos | Vendored copy of `src/engine` |
| Future npm consumers | Depend on `@portable-adventure/engine` once extracted and published |

Until the extract lands:

1. Develop engine APIs under `src/engine/` as today.
2. Refresh games in other repos by copying or cherry-picking `src/engine` changes.
3. Treat `packages/engine` as docs + manifest + packable stub — root `package.json` does **not** declare npm workspaces, so Vite/CI stay unchanged.
4. Validate the package shape with `npm run pack:engine` (dry-run).

See [`docs/ENGINE-PACKAGE.md`](../../docs/ENGINE-PACKAGE.md).
