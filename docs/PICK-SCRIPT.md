# P.I.C.K. & S.C.R.I.P.T.

**In plain words:** two nicknames for the two halves of this project.

| Name | Plain meaning | Where you meet it |
|---|---|---|
| **P.I.C.K.** | **Maker tools** — Design studio, recipes, tweak-while-playing | `/pick`, `/pick/recipes`, Author mode |
| **S.C.R.I.P.T.** | **Game engine** — walks, clicks, saves, dialogue | Runs under the hood when you press Play |

```
Portable Adventure Engine (the whole project)
├── P.I.C.K.     → make & edit
└── S.C.R.I.P.T. → play & run
```

Everyday guide: [HOW-TO.md](./HOW-TO.md). You do **not** need this page to make a first game.

Full games are packs that *run* on S.C.R.I.P.T. and can be *edited* with P.I.C.K. Teaching demos: **Attic Study**, **Harbor Fog**, `_template`.

---

## Code constants (developers)

```ts
import {
  PICK,
  SCRIPT,
  ENGINE_UMBRELLA,
  ENGINE_LAYER_LOCKUP,
  ENGINE_DOCUMENT_TITLE,
  SCRIPT_POWERED_CREDIT,
} from "@/product/branding";
import {
  integerScaleFactor,
  pixelBackgroundStyle,
  resolveCursorState,
  getFlag,
  setVar,
  findWalkPath,
  createSaveAdapter,
} from "@/engine/script";
```

UI chrome should prefer these constants over hard-coded “Studio” / “Author mode”
labels so both acronyms stay visible on launcher, `/pick`, recipes, and settings.

## S.C.R.I.P.T. pillars (implemented)

| Pillar | Module | Host wiring |
|---|---|---|
| **2D Framebuffer & Pixel Scaler** | `src/engine/script/pixelScale.ts` | `LocationView` + pack `presentation.crispPixels` |
| **Pathfinding & Walkmasks** | `src/engine/walkboxes.ts` (re-exported) | Ego walk / approach points |
| **Cursor State Machine** | `src/engine/script/cursorMachine.ts` | `ItemCursor` + body CSS cursor |
| **State System** | `src/engine/script/stateStore.ts` | `flags` / `vars` / `objectStates` on `GameState` |
| **Save System** | `src/engine/save.ts` (re-exported) | Save/Load UI + autosave |

Pack opt-in for crisp pixels:

```ts
presentation: {
  crispPixels: true,
  nativeSize: { width: 640, height: 360 },
}
```

Attic Study enables this; photographic packs leave it off.

## P.I.C.K. surfaces

| Route | Surface |
|---|---|
| `/pick` or `/studio` | Design studio (pack builder) |
| `/pick/recipes` or `/recipes` | Puzzle recipe gallery |
| In `/play/…` → Settings → **P.I.C.K. Author mode** (Ctrl+Shift+H) | Live hotspot / flag editor |

## Optional future polish

Not required for the rename or the five pillars above:

- True offscreen low-res framebuffer blit (vs CSS `image-rendering`)
- Richer polygon walkmeshes (beyond AABB walkboxes)
- Node-graph puzzle cards inside PICK

See [`src/engine/ENGINE.md`](../src/engine/ENGINE.md) for broader SCUMM-tier gaps.

## Tests

```sh
npx vitest run src/engine/script src/product/branding.test.ts
```
