# @portable-adventure/engine

**Pick-Script** — a point-and-click adventure engine (S.C.R.I.P.T.) with a
ready-made play UI for React. Phone, tablet and desktop layouts, touch, saves,
audio, hints, journal and map are included.

```bash
npm install https://github.com/aarondavidson/Pick-Script/releases/download/v0.4.0/portable-adventure-engine-0.4.0.tgz
```

```tsx
import { PickScriptGame, createGameFromJson } from "@portable-adventure/engine";
import "@portable-adventure/engine/style.css";
import pack from "./my-game.pack.json";

export default function App() {
  return <PickScriptGame definition={createGameFromJson(pack)} />;
}
```

Make packs with the Studio (P.I.C.K.) in the
[Pick-Script repository](https://github.com/aarondavidson/Pick-Script).

- Full guide: [docs/ENGINE-PACKAGE.md](https://github.com/aarondavidson/Pick-Script/blob/main/docs/ENGINE-PACKAGE.md)
- Releases and notes: <https://github.com/aarondavidson/Pick-Script/releases>
- Upgrading: [docs/UPGRADING.md](https://github.com/aarondavidson/Pick-Script/blob/main/docs/UPGRADING.md)

## Licence

GPL-3.0-only **with the Pick-Script Game Exception**: games you make with the
engine — packs, art, audio, writing, your own code — may use any licence, open
or closed. Changes to the engine itself stay GPL. See `LICENSE-EXCEPTION.md`.
