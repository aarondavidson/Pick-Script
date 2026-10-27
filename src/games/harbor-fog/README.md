# Harbor Fog

**In plain words:** a short **dockside mystery** with about five rooms — the “next step” after Attic Study. Built the same way Studio makers build games (rooms, locked doors, props, feel cues).

| | |
|---|---|
| Play | http://localhost:8080/play/harbor-fog |
| Plain maker guide | [`docs/HOW-TO.md`](../../../docs/HOW-TO.md) |
| Build source | [`buildPack.ts`](./buildPack.ts) |
| Schema cheat sheet | [`docs/JSON-PACK-SCHEMA.md`](../../../docs/JSON-PACK-SCHEMA.md) |
| Deeper author guide | [`src/engine/PACKS.md`](../../engine/PACKS.md) |
| Picture sizes | [`src/engine/ASSETS.md`](../../engine/ASSETS.md) |

About **5 rooms · 5–10 minutes**. Phone-friendly tap menus. Pictures live under `assets/`.

This demo stays with the **engine** teaching set (not a standalone store title).

---

## What this pack teaches

| Pattern | Where you’ll see it |
|---|---|
| JSON-first pack (`buildPack` / Studio shape) | `buildPack.ts` |
| Genre preset + cutscene template | `applyGenrePreset`, `applyCutsceneTemplate` |
| Locked exit kit / prop library | `applyLockedExitKit`, `placePropFromLibrary` |
| Walkboxes + depth scale | Docks floor boxes |
| Interact juice / haptics / SFX | Ropes, shack window |
| Overlay frames (`frames` + `animClass`) | Shack window glow |
| Dialogue + voice keys | Watch / dock NPCs |
| Combinations / use-with | Key → chest style chain |
| Hints + stuck assist | Progressive hint threads |
| Music / ambient cues | Pack `audio` map |

Use it as a **reference** when authoring in P.I.C.K. Studio → Pack tab, or when writing `createEmptyJsonPack` + kits by hand.

---

## Solution (spoiler)

High-level path (details may shift with content tweaks):

1. Explore the **docks** — look at ropes / water / shack window  
2. Visit the **watch office** and talk your way toward a pass / key  
3. Open the gated path (locked exit / require flag or item)  
4. Finish the short combination / use-with beat (key → container)  
5. Reach the lighthouse / closing beat and intro cutscene if present  

Automated coverage: `harborFog.playthrough.test.ts`, `harborFog.features.test.ts`.

---

## Layout

```
harbor-fog/
  manifest.ts       # GameDefinition via createGameFromJson(buildHarborFogPack())
  buildPack.ts      # constructs JsonPackDocument
  art.ts            # Vite imports of pack-local JPGs / frames
  audio.ts          # PackAudio cues (if present)
  assets/           # room + item art
  README.md         # this file
```

---

## Local

```sh
npm run dev
# → http://localhost:8080/play/harbor-fog
```

Rebuild / inspect the JSON shape:

```ts
import { buildHarborFogPack } from "@/games/harbor-fog/buildPack";
const doc = buildHarborFogPack(); // JsonPackDocument
```
