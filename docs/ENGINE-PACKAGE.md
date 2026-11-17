# Using the engine as a package

`@portable-adventure/engine` is the Pick-Script engine **and** its play UI as an
installable package. It is built from the same sources this repository's app
runs, so what you install is what the demos play on.

You need a React 18+ app (Vite, Next.js client component, CRA… any bundler that
handles ES modules and CSS imports).

## Install

Every [GitHub Release](https://github.com/aarondavidson/Pick-Script/releases)
has the package attached. Install it by URL:

```bash
npm install https://github.com/aarondavidson/Pick-Script/releases/download/v0.5.0/portable-adventure-engine-0.5.0.tgz
```

Replace both version numbers to move to another release. If the package is also
on the npm registry for that release, this works too:

```bash
npm install @portable-adventure/engine
```

## Play a game

```tsx
import { PickScriptGame, createGameFromJson } from "@portable-adventure/engine";
import "@portable-adventure/engine/style.css";
import pack from "./my-game.pack.json";

const game = createGameFromJson(pack);

export default function App() {
  return <PickScriptGame definition={game} />;
}
```

That is a complete game: phone / tablet / desktop layouts, touch, saves,
audio, hints, journal, map.

| Prop | What it does |
|---|---|
| `definition` | The game — `createGameFromJson(pack)` or a TypeScript `GameDefinition` |
| `onHome` | Shows a home control and is called when the player uses it. Omit for a single-game site |
| `homeLabel` | Text of that control (default "Games") |
| `onRestart` | Called when the player restarts after finishing (default: reload the page) |
| `children` | Your own UI inside the game's providers — it can call `useGame()` |

To switch games, change the component's `key` so it remounts.

### Load a hosted pack

Keep art out of your bundle: host a pack folder (Studio → **Download for web
hosting**) and fetch it.

```tsx
import { fetchJsonPack, createGameFromJson } from "@portable-adventure/engine";

const pack = await fetchJsonPack("https://example.com/games/my-game/pack.json");
const game = createGameFromJson(pack);
```

`assets/…` paths inside `pack.json` are resolved relative to its URL.

## The stylesheet

`style.css` is required. It is a full-page stylesheet: it includes a CSS reset
and sets the page background and colours (CSS variables on `:root`). Give the
game its own page or route rather than a small box inside an existing design.

Add this to your HTML `<head>` so phone layouts and notches work:

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```

## Settings that used to be build variables

`VITE_STRICT_PLAY` and `VITE_SAVE_INTEGRITY_KEY` are fixed when the package is
built. Set them at runtime instead, before rendering:

```ts
import { configureDeployLock } from "@portable-adventure/engine";

configureDeployLock({ strictPlay: true, saveIntegrityKey: "any-string" });
```

The packaged defaults are: strict play **on** (saves are clamped to the pack,
authoring overrides refused), save sealing **off**.

## Native apps

In a Capacitor / Cordova / Tauri / Electron shell, mirror saves to native
storage so the OS cannot evict them:

```ts
import { Preferences } from "@capacitor/preferences";
import { createKeyValueSaveMirror, setSaveMirror } from "@portable-adventure/engine";

setSaveMirror(createKeyValueSaveMirror(Preferences)); // before the first render
```

Any `{ get, set, remove }` async store works — see `SaveMirror`.

## Building your own shell

`PickScriptGame` is a convenience. The pieces are exported too:

```tsx
import {
  GameProvider,
  MusicProvider,
  DebugProvider,
  AdventurePlaySurface, // the whole play screen
  useAdventure,         // runtime + state, for your own components
  createGame,           // headless runtime, no React
} from "@portable-adventure/engine";
```

Layout rules a custom shell should keep are in
[`src/engine/SHELL.md`](../src/engine/SHELL.md#play-layouts).

## What is in the package

| File | Contents |
|---|---|
| `dist/index.js` | Engine + play UI, ES module. React, Radix, lucide etc. are normal dependencies, not bundled |
| `dist/style.css` | All styles |
| `dist/**/*.d.ts` | TypeScript declarations |
| `LICENSE`, `LICENSE-EXCEPTION.md`, `COPYRIGHT` | GPL-3.0-only with the Game Exception — your game can use any licence |

Not included: the Studio (P.I.C.K.) and the demo games. Use the hosted Studio
or the `pick-script-web-X.Y.Z.zip` from the release to author packs.

`ENGINE_VERSION` is exported so you can check what you are running.

## Maintainers

```bash
npm run build:package
```

```bash
npm run pack:engine
```

`build:package` runs the Vite library build (`packages/engine/vite.config.ts`),
syncs the package's `dependencies` with what the bundle imports, copies the
licence files, and fails if the declarations or bundle still point into the
monorepo. `pack:engine` also writes the `.tgz`. The release workflow attaches
that file to the GitHub Release and, when an `NPM_TOKEN` repository secret
exists, publishes it to npm.

The package entry is [`packages/engine/src/index.ts`](../packages/engine/src/index.ts);
adding an export there adds it to the public API (see the compatibility rules
in [`RELEASING.md`](./RELEASING.md)).

### Still vendoring `src/engine`?

Copying the folder keeps working (it only imports `react`), but you get no play
UI and manual updates. Prefer the package.
