# Template adventure (starter pack)

**In plain words:** a **blank-ish code starter** — one small puzzle (note → key → unlock hall), plus a second room. Prefer the **Studio** 30-minute path if you’re new: [docs/HOW-TO.md](../../../docs/HOW-TO.md).

## Quick copy (code path)

```sh
npm run new-pack -- my-game --title "My Game"
npm run dev
# → http://localhost:8080/play/my-game
```

Or manually: `cp -R src/games/_template src/games/my-game`, then edit ids and [`../registry.ts`](../registry.ts).

Full guide: [`../../engine/PACKS.md`](../../engine/PACKS.md).  
Picture sizes: [`../../engine/ASSETS.md`](../../engine/ASSETS.md).  
Contributing: [`../../../CONTRIBUTING.md`](../../../CONTRIBUTING.md).

## Room art path

1. Drop a **1920×1080** JPG (16:9, ≤ 500 KB target) under this pack’s `assets/`
2. Vite-import it at the top of `manifest.ts` (see the `startRoomImg` comment)
3. Assign `image: yourImport` on each room
4. Run `npm run check-assets` — rooms over **1 MB** fail CI

This pack ships `./assets/start.jpg` as a placeholder so it boots without shared `src/assets/` art.

## What this pack demonstrates

| Feature | Where |
|---|---|
| One-room puzzle | Look `note` → `starter_key` + `gotKey` → east exit unlocks |
| Blocked exit | `exits[0].blocked` / `blockedMessage` |
| Simple verbs (Look / Use) | `verbMode: "simple"` |
| Multi-ego | `playableActors`, Buddy in `hallway` |
| Walkboxes + fade travel | `start` ↔ `hallway` |
| Autosave | `autosave: true` |
| Progressive hints | `hints` + `untilFlagHint(..., "gotKey")` |
| Pack audio cues | `audio` + `Room.music` |
| i18n (`en` / `es`) | `i18n.messages` + `msg(...)` |
| Local room script | `localScripts.hum` |
| Pack entry | [`index.ts`](./index.ts) re-exports the definition |

## Edit checklist

- [ ] Change `id` to a stable slug (`my-game`) — used for saves (`new-pack` does this)
- [ ] Set `title` / `subtitle` / `version`
- [ ] Replace room art imports — **1920×1080 JPG**, 16:9
- [ ] Rewrite the sticky-note puzzle (or delete it and add yours)
- [ ] Add rooms under `rooms` (or split into `content/rooms/` as you grow)
- [ ] Set `Room.music` cues + `audio.music` presets
- [ ] Add portraits (**256×256**) if characters use the speech bar
- [ ] Add `combinations` when you have inventory puzzles
- [ ] Confirm launcher `blurb` in `registry.ts`

## Run

```sh
npm run dev
# Launcher:  http://localhost:8080/
# This pack: http://localhost:8080/play/template-adventure
```

After you change `id`, the play URL becomes `/play/<your-id>`.

## Growing past one file

```
my-game/
  index.ts             # re-export
  manifest.ts          # wires GameDefinition
  content/rooms/*.ts   # one room per file (see src/engine/PACKS.md)
  content/dialogues/
  specials.ts
  audio.ts
```

Keep exporting a single `GameDefinition` from `manifest.ts`.
