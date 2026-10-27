# Walkthrough: build a 1-room, 2-puzzle pack

This is how **Attic Study** was put together — the smallest complete game on this engine.
Play it first: `npm run dev` → http://localhost:8080/play/attic-study

---

## What you will ship

| Piece | In this pack |
|---|---|
| 1 room | `attic` with walkbox + 3 hotspots |
| Puzzle 1 | Look/Use **Desk** → inventory item `attic_key` |
| Puzzle 2 | Use **Brass Key** with **Chest** → `locket` + achievement |
| Art | Pack-local `assets/` (1920×1080 room + 256×256 icons) |
| Sound | Synth music/ambient + MP3 SFX via `audio.sfx` |
| Meta | Quest, hints, autosave |

---

## 0. Scaffold

```sh
npm run new-pack -- attic-study --title "Attic Study"
```

Or copy `_template` and register by hand (see [`../README.md`](../README.md)).

---

## 1. Add art (pack-local)

**Brand new? Generate custom art with AI:** copy-paste prompts + model picks in
[`docs/IMAGE-GEN-STARTER.md`](../../../docs/IMAGE-GEN-STARTER.md) (room 1920×1080 + key + locket icons themed to *your* game).

```
src/games/attic-study/assets/
  attic.jpg              # 1920×1080 room background
  items/key.jpg          # 256×256 inventory icon
  items/locket.jpg       # 256×256 reward icon
  sfx/key-pickup.mp3
  sfx/chest-open.mp3
```

Specs: [`../../engine/ASSETS.md`](../../engine/ASSETS.md).

Vite-import in the pack (not string paths):

```ts
import atticImg from "./assets/attic.jpg";
import keyIcon from "./assets/items/key.jpg";
```

Then set `room.image = atticImg` and `item.icon = keyIcon`.

Validate: `npm run check-assets`.

---

## 2. Define audio

`audio.ts` exports a `PackAudio`:

```ts
export const atticStudyAudio: PackAudio = {
  defaultMusic: "attic",
  music: { attic: "noir" },      // → built-in synth preset
  ambient: { attic: "hum" },
  sfx: {
    pickup: keyPickupSfx,        // host plays on inventory gain
    success: chestOpenSfx,       // host plays on achievement unlock
  },
};
```

Wire it on the definition: `audio: atticStudyAudio`, and set `Room.music: "attic"`.

Built-in script sounds still work: `{ op: "sound", key: "creak" }` (room `autoScripts` in this pack).

---

## 3. Puzzle 1 — get an item from a hotspot

Hotspot `desk` with `verbs: ["look", "use"]` and `onInteract`:

1. If the player already has the key → no-op / different message
2. Else append `{ id, name, description, icon }` to `state.inventory` and set `flags.gotKey`

The host plays `sfx.pickup` when inventory grows (pack MP3 if `audio.sfx.pickup` is set).

**Author tip:** In simple verb mode the bar is Look / Use only — don't rely on Pick Up unless you switch to classic verbs.

---

## 4. Puzzle 2 — use inventory item on a hotspot

Hotspot `chest`:

- `useWithResponses.attic_key` — success copy
- `useWithResponses["*"]` — wrong-item copy
- `onUseWith(itemId, state)` — if `itemId === "attic_key"`, set `chestOpen`, remove key, add locket, unlock achievement / complete quest

UI flow for the player:

1. Look/Use the **desk** (key appears in inventory)
2. Open **Inventory** → click **Brass Key** (arms Use and closes the panel)
3. Click the **Chest**

Sentence line reads: `Use Brass Key with Chest`.

---

## 5. Walkboxes & approach points

```ts
walkboxes: [{ id: "floor", x: 8, y: 62, width: 84, height: 28 }],
entryPoint: { x: 48, y: 78 },
// per hotspot:
approach: { x: 28, y: 72 },
```

Coordinates are **percent of the room image** (0–100), not pixels.  
Use **Author mode** in-game (`Ctrl+Shift+H` or Settings → Author mode) to drag boxes, **Copy %** / **Copy object**, and inspect flags — then paste into the pack.

---

## 6. Hints, quest, achievement

- `hints` + `untilFlagHint(..., "gotKey")` / `"chestOpen"` — progressive spoiler ladder
- `quests` — two objectives matching the two puzzles
- `achievements` — unlocked in the chest `onUseWith` patch (host plays `sfx.success`)

---

## 7. Register & verify

```ts
// src/games/registry.ts
import { atticStudyGame } from "./attic-study/manifest";
// …catalog entry with blurb + definition
```

```sh
npm run typecheck
npm test
npm run check-assets
npm run dev
# open /play/attic-study
```

Solution path (spoiler): **Look desk → Use key with chest.**

---

## File map

```
attic-study/
  README.md           # short pitch
  WALKTHROUGH.md      # this file
  index.ts            # re-exports
  audio.ts            # PackAudio
  manifest.ts         # GameDefinition (rooms + puzzles)
  assets/
    attic.jpg
    items/…
    sfx/…
```

When you outgrow one file, split rooms into `content/rooms/` (layout in [`PACKS.md`](../../engine/PACKS.md)).

---

## Next steps after this demo

1. Browse **[/recipes](http://localhost:8080/recipes)** (or [`docs/RECIPES.md`](../../../docs/RECIPES.md)) — locked exit, combine items, map travel, …
2. Add a second room + `exits` with `blocked` gates (see `_template` / recipe `locked-exit`)
3. Add `combinations` for item+item recipes
4. Add `specials` for a minigame / comic
5. Split `manifest.ts` into room modules

Full contract: [`../../engine/PACKS.md`](../../engine/PACKS.md).
