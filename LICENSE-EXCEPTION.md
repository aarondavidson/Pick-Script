# Pick-Script Game Exception

Version 1.0 — additional permission under section 7 of the GNU General Public
License, version 3 ("GPLv3").

Copyright (C) 2025–2026 Aaron Davidson

Pick-Script (the "Engine") is licensed under GPL-3.0-only. This file grants an
**additional permission** on top of that licence, so that games made with the
Engine do not have to be released under the GPL.

## In plain words

- **Your game is yours.** Rooms, art, audio, writing, puzzles, pack files
  (`.pack.json` or TypeScript packs), your own shell UI and your own code may be
  released under any licence you choose — open or closed, free or commercial.
- **The Engine stays open.** If you change the Engine itself and distribute the
  result, your changes to the Engine remain under GPL-3.0-only with this
  exception, and you must make that source available as the GPL requires.
- **Keep the credit.** Keep the copyright notice and a copy of the GPL and this
  exception with what you distribute.

## Definitions

- **Engine** — the files of this repository as distributed by the copyright
  holder, and any modified version of those files. This includes `src/engine/`,
  the play UI, the Studio (P.I.C.K.), the tooling in `scripts/`, and the
  published package `@portable-adventure/engine`.
- **Game Content** — material that is not derived from the Engine's source
  code and that the Engine loads, runs or presents: game definitions and packs,
  artwork, audio, text, translations, dialogue, puzzle and script data,
  configuration, and independent program code that uses the Engine only
  through its documented public interfaces (the exports of the Engine package,
  the `GameDefinition` contract and the `.pack.json` format).
- **Game** — a work that combines the Engine, modified or not, with Game
  Content, in any form, including a bundled web build or a native app.

Copying a demo pack that ships in this repository (`src/games/`) and changing
it is modifying Engine material, not creating Game Content; new packs you
author are Game Content. The scaffold produced by `npm run new-pack` and packs
exported by the Studio are Game Content.

## Grant of additional permission

As a special exception to GPLv3, the copyright holder of the Engine gives you
permission to convey a Game under terms of your choice, and to licence the
Game Content under terms of your choice, provided that:

1. The Engine portion of the Game remains licensed under GPL-3.0-only with
   this exception. If you modified the Engine, you make the Corresponding
   Source of the **Engine as you modified it** available under those terms, as
   GPLv3 sections 4–6 require. You are not required to provide the source of
   the Game Content.
2. You keep intact all copyright and licence notices of the Engine, and convey
   with the Game a copy of GPLv3 and of this exception, or a prominent notice
   stating that the Game uses Pick-Script and where its source and these terms
   can be obtained.
3. You do not present the Engine itself as your own work or remove the
   attribution described in `COPYRIGHT`.

This permission does not extend to the Engine itself: conveying the Engine,
alone or modified, apart from a Game, is governed by GPL-3.0-only.

## Modified versions

If you modify the Engine you may extend this exception to your version, and
you are encouraged to do so. If you do not wish to, delete this exception
statement from your version; your version is then under GPL-3.0-only alone.

## No other change

Except as stated above, GPLv3 applies unchanged, including its disclaimer of
warranty and limitation of liability. This exception is not legal advice; if
your situation is unusual, ask a lawyer.

SPDX identifier used in this repository:
`GPL-3.0-only WITH LicenseRef-Pick-Script-Game-Exception-1.0`
