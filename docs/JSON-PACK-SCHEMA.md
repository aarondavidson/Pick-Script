# JSON pack schema (`.pack.json`)

Cheat sheet for Studio / Harbor Fog–style packs. Canonical TypeScript types live in
[`src/engine/jsonPackTypes.ts`](../src/engine/jsonPackTypes.ts). Authoring guide:
[`PACKS.md`](../src/engine/PACKS.md).

`schemaVersion` is currently **`1`** (`JSON_PACK_SCHEMA_VERSION`).

Untrusted packs are sanitized at compile (`parseJsonPack` / `createGameFromJson`) —
nesting caps, allowlisted specials, safe identifier keys, media URL checks.

---

## Document root

| Field | Type | Notes |
|---|---|---|
| `schemaVersion` | `1` | Required |
| `id` | string | Stable slug → save keys |
| `title` / `subtitle` | string | Launcher + header |
| `version` | string | Content semver |
| `credits` | `{ work, author, license?, url? }[]` | Optional asset credits, shown in Settings → Credits and on the win screen. Non-https `url`s are dropped; max 100 rows |
| `startRoom` | string | Must exist in `rooms` |
| `verbMode` | `classic` \| `simple` \| `coin` | Optional |
| `rooms` | `Record<id, JsonPackRoom>` | Required |
| `links` | `JsonPackLink[]` | Bidirectional exits |
| `items` | `JsonPackItem[]` | Catalog |
| `combinations` | `JsonPackCombination[]` | Inventory recipes |
| `dialogues` | optional | Extra trees (usually on hotspots) |
| `cutscenes` | `JsonPackCutscene[]` | |
| `hints` | `JsonPackHint[]` | Progressive + optional `hotspotId` pulse |
| `quests` / `achievements` | arrays | Journal |
| `actors` | optional | Ego / NPC art (incl. facing sheets) |
| `audio` | `PackAudio` | Music / ambient / voice / SFX maps |
| `comics` | `Record<id, JsonPackComic>` | Allowlisted pages |
| `flagCutscenes` | `{ [flag]: cutsceneId }` | Auto-start |
| `mapGroups` / `mapFog` / `mapFastTravel` | optional | World map |
| `stuckAssist` / `autosave` / `i18n` / `feel` | optional | QoL |

Compile: `createGameFromJson(doc)` → `GameDefinition`.

---

## Room (`JsonPackRoom`)

| Field | Notes |
|---|---|
| `id`, `name`, `image` | `image` = data URL or https |
| `music` | Cue key into `audio.music` |
| `hotspots` | See below |
| `walkboxes` | AABB; optional `points[]` polygon |
| `regions` | Enter/exit triggers (not walkable floor) |
| `timers` | Dwell triggers (`afterMs`, `once`, `actions`) |
| `entryPoint` | Ego spawn % |
| `layers` / `particles` | Presentation |
| `transitionIn` / `transitionOut` | fade / slide-* |

### Walkbox

```json
{ "id": "floor", "x": 10, "y": 60, "width": 80, "height": 30, "scale": 1 }
```

Polygon (optional): add `"points": [{ "x": 10, "y": 60 }, …]` (≥3). Containment uses point-in-polygon; AABB still used for adjacency/path BFS.

### Region

```json
{
  "id": "near_bell",
  "x": 40, "y": 50, "width": 20, "height": 20,
  "onEnterFlag": "heardBell",
  "onExitFlag": "leftBell",
  "everyEnter": false,
  "juice": "medium",
  "onEnterActions": [{ "op": "sound", "key": "creak" }],
  "onExitActions": [{ "op": "message", "text": "The fog closes in." }]
}
```

### Timer

```json
{
  "id": "fog_thickens",
  "afterMs": 8000,
  "once": true,
  "setFlag": "fogThick",
  "message": "The fog thickens.",
  "actions": [{ "op": "juice", "preset": "soft" }]
}
```

Persists via `timerSeen_<roomId>_<id>` when `once` (default true). Paused during cutscenes.

---

## Hotspot (`JsonPackHotspot`)

| Field | Notes |
|---|---|
| `id`, `name`, `x/y/width/height` | % of room |
| `kind` | `interact` \| `pickup` \| `use-with-target` \| `character` |
| `lookText` / `useText` | Simple responses |
| `itemId` / `itemName` / … | Pickup |
| `useWith` | Rules array |
| `dialogue` | Character talk tree |
| `actions` / `actionVerbs` | PackAction chains |
| `special` | Allowlisted minigame / comic / trade |
| `interactJuice` / `interactHaptic` | Feel |
| `approach` | Walk-to point % |
| `frames` / `fps` / `animClass` | Overlay motion |

### Special (`JsonPackSpecial`)

| `kind` | Required fields | Allowlist |
|---|---|---|
| `minigame` | `minigameId` | `pixel-invaders`, `hacking`, `sequence-lock`, `slider-puzzle` |
| `comic` | `comicId` | pack `comics` or builtins |
| `trade` | `requireItemId`, `giveItemId`, flags… | safe ids |

Optional `config` on minigame specials (sanitized — max lengths, safe ids; evil keys rejected):

| `minigameId` | `config` shape |
|---|---|
| `sequence-lock` | `{ sequence: string[], labels?: Record<string,string>, winFlag?: string }` |
| `slider-puzzle` | `{ order: string[], target: string[], winFlag?: string }` |

Default win flags when omitted: `beatSequenceLock` / `beatSliderPuzzle`. Host sets the flag on modality win (then pack `onModalityWin` may add rewards).

Studio: Pack hotspot inspector → **Specials** cards (Sequence lock / Slider puzzle include CSV + winFlag fields).

---

## PackActions (ActionList-lite)

Used on hotspot `actions`, region enter/exit, timers, Guided editor.

| `op` | Purpose |
|---|---|
| `message` / `say` | Text / speech |
| `setFlag` / `clearFlag` | Flags |
| `giveItem` / `takeItem` | Inventory |
| `setObjectState` | Hotspot state |
| `sound` / `haptic` / `juice` | Feel |
| `cutscene` | Start named cutscene |
| `requireItem` | Stop chain if missing (`failMessage`) |
| `if` | `{ flag? \| hasItem? \| equals?, then[], else? }` — nest depth ≤ 4 |

```json
{
  "op": "if",
  "hasItem": "brass_key",
  "then": [{ "op": "setFlag", "flag": "doorOpen" }],
  "else": [{ "op": "message", "text": "It's locked." }]
}
```

---

## Cutscene steps

Shared sync fields: `label`, `goto`, `waitForSpeech`, `waitForWalk`.

| `op` | Notes |
|---|---|
| `message` / `wait` / `juice` | Beats |
| `walk` | Ego/NPC walk; waits by default |
| `sayLine` | Speech; optional `mouthCues` / `voiceKey` / `juice` |
| `parallel` | Walk + say together |
| `sound` / `music` / `setFlag` | Side effects |
| `camera` | `{ pan?, zoom?, follow? }` |
| `goto` / `label` | Jump (visit-capped for safety) |

---

## Dialogue / lip-sync

Line fields: `id`, `text`, `voiceKey`, `mouthCues`, `lipSyncKey`, `choices`.

`mouthCues`: Rhubarb-style `{ t: ms, shape: "A"|"B"|…|"X" }[]`. Runtime drives ActorSprite / SpeechBar mouth classes when cues are present.

---

## Actors (directional costumes)

```json
"animations": {
  "idle": { "down": "…", "up": "…", "left": "…", "right": "…" },
  "walk": { "down": "…", "up": "…", "left": "…", "right": "…" }
}
```

Aliases `n/s/e/w` accepted. Missing facings fall back to `scaleX` flip.

---

## Links / gates

```json
{
  "from": "docks",
  "to": "watch",
  "fromLabel": "Watch office",
  "toLabel": "Docks",
  "requireFlag": "hasPass",
  "lockedLabel": "Sealed door",
  "showWhenBlocked": true
}
```

---

## Hints

```json
{
  "id": "find_key",
  "title": "The key",
  "tiers": ["Search the docks.", "Try the ropes.", "Look at the ropes."],
  "untilFlag": "hasKey",
  "hotspotId": "ropes"
}
```

`hotspotId` → stuck-assist pulse outline on that hotspot.

---

## Related

- [`PACKS.md`](../src/engine/PACKS.md) — authoring (TS + JSON)
- [`docs/STUDIO.md`](./STUDIO.md) — P.I.C.K. UI
- [`docs/SECURITY.md`](./SECURITY.md) — packUrl / sanitize threat model
- Harbor Fog demo: [`src/games/harbor-fog/README.md`](../src/games/harbor-fog/README.md)
