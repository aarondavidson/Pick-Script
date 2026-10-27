# Products

**In plain words:** this repository ships one product — the **Portable Adventure Engine** (P.I.C.K. maker tools + S.C.R.I.P.T. runtime, with a multi-game launcher).

Everyday guide: [HOW-TO.md](./HOW-TO.md). Names: [PICK-SCRIPT.md](./PICK-SCRIPT.md).

| Product | `VITE_PRODUCT` / mode | What it is |
|---|---|---|
| **Portable Adventure Engine** | `engine` (default) | Maker tools + multi-game launcher (demos: Attic Study, Harbor Fog, template) |

Product settings live in [`src/product/productConfig.ts`](../src/product/productConfig.ts). A game built on the engine can live in its own repository and add a single-title product there (`isTitleProduct: true`, `catalogGameIds: ["your-game"]`) so its launcher becomes a title splash.

## Local

```sh
npm run dev   # catalog + studio (same as dev:engine)
```

## Lock packs on a shared deploy

`VITE_LOCKED_GAMES=harbor-fog` (comma-separated) removes those packs from the
launcher and blocks `/play/<id>`. Combine with **no** `VITE_ENABLE_STUDIO` so
players cannot open P.I.C.K. Author mode.

## Vercel

| Project | Env |
|---|---|
| Engine (public) | defaults — Studio off |
| Engine (private authoring) | `VITE_ENABLE_STUDIO=true` (+ optional `VITE_STUDIO_SECRET`) |

## Catalog rules

- **Engine:** all static packs + Studio installs / import
- **Title product** (in a game's own repo): only that game id; deep-links to other packs show “Game not found”
