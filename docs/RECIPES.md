# Puzzle recipes

**In plain words:** ready-made puzzle patterns you can copy — “get a key,” “use key on chest,” “locked door,” and so on.

**In the app:** open [/pick/recipes](http://localhost:8080/pick/recipes) (same ideas as `src/authoring/recipes.ts`).

**Best first path:** home → **Make a game in 30 minutes** → Studio wizard → Art handoff → Ship checklist → Download. Friends can **Import** your `.pack.json` on the launcher (no Studio needed).

Also useful: play [Attic Study](../src/games/attic-study/WALKTHROUGH.md); plain guide [HOW-TO.md](./HOW-TO.md).  
Grow later with **Author mode** while playing (`Ctrl+Shift+H` or Settings).

---

## Recipes

| Id | Title | Level | Live example |
|---|---|---|---|
| `get-item` | Get an item from a hotspot | new | attic-study desk |
| `use-with` | Use inventory item with hotspot | new | attic-study chest |
| `locked-exit` | Locked exit (blocked door) | new | `_template` hall |
| `flag-responses` | Flag-gated Look / Use text | new | attic-study |
| `hints` | Progressive hints (`untilFlagHint`) | new | attic-study / template |
| `combine-items` | Combine two inventory items | mid | `_template` combinations |
| `map-travel` | Map fast travel | mid | `_template` House |

Snippets are maintained in [`src/authoring/recipes.ts`](../src/authoring/recipes.ts) — prefer copying from `/recipes` so they stay in sync.

---

## Author mode

While playing any pack:

1. **Settings → Author mode**, or **Ctrl+Shift+H**
2. Drag / resize hotspot boxes (saved in `localStorage`)
3. Click a hotspot → **Copy %** or **Copy object**
4. Panel shows **true flags**, inventory ids, and exit blocked/open state
5. **Copy flags / inventory** for bug reports or save debugging

Does not write into your pack files — paste into `manifest.ts` yourself, then `npm run verify`.

---

## Suggested loop

```sh
npm run new-pack -- my-game --title "My Game"
npm run verify
npm run dev
# → /play/my-game  (Author mode)
# → /recipes       (paste a puzzle)
# → /studio        (optional art + Audio tab for music/SFX)
npm run verify
```
