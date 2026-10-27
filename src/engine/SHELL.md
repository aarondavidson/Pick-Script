# Adventure shell (web + iOS)

The **host shell** is the reusable UI around the portable engine: verb bar, sentence line, inventory, map, exits, speech, save/load, audio unlock.

**Targets:** modern browsers (Vercel/static) and **iOS via Capacitor** (same `dist/`).  
**Content:** GPL packs under `src/games/` (engine-native art and scripts).

---

## Player flow

1. **Tap to start** — unlocks a **shared** Web Audio context (required on iOS)
2. **Sentence line** — shows `Look at Desk`, `Use Brass Key with Chest`, `Give Ticket to Guard`
3. **Verbs** — classic 8 (look/talk/use/pickup/open/push/pull/**give**), simple Look/Use, or coin radial (`definition.verbMode`: `classic` \| `simple` \| `coin`)
4. **Inventory** — tap item → arms Use-with → tap hotspot; with **Give** armed, tap item then NPC/hotspot
5. **Exits** — direction buttons; blocked exits show a message
6. **Map** — fast travel to visited rooms (optional per pack)
7. **Travel rule** — always `travelThroughExit` / `travelToRoom` / `runtime.travel`

Walkboxes define where the ego can walk. Optional **`Room.regions`** fire enter triggers (set flag, message, …) when the ego steps in — see Pack stage → Regions in Studio, or [`PACKS.md`](./PACKS.md).

---

## Pack-owned shell hooks

Title chrome that used to key off `definition.id` is opted in on the pack:

```ts
shell: {
  // Lazy loaders — the host never imports pack UI paths itself
  intro: () => import("./ui/Intro").then((m) => ({ default: m.Intro })),
  canvasFx: () => import("./ui/Fx").then((m) => ({ default: m.Fx })),
  complete: () => import("./ui/Ending").then((m) => ({ default: m.Ending })),
  chrome: {                     // optional — hide play-header extras
    hideJournal: true,
    hideQuests: true,
    hideMap: true,
    hideAchievements: true,
    hideHints: true,
    hideHome: true,
  },
},
legacySaveKeyPrefix: "oldname_save_", // optional one-time save-key migration
```

**Mobile:** phones use a single **Menu** control (extras + Settings) so the stage sits higher. Desktop keeps the toolbar.

**Chrome flags** apply to both the desktop toolbar and the mobile Menu sheet. Map is also hidden when `mapFastTravel: false` (see below). Resolver: `resolvePlayChrome` in `playChrome.ts`.

Omit `shell` (or set `complete: "generic"`) for the generic complete screen. The intro shows until `flags.introSeen` is set; `complete` receives `ShellCompleteProps` (`{ gameState, onRestart }`). Lazy components are built in `src/components/game/shellUi.ts`, so the host stays pack-agnostic.

---

## Linking rooms

Prefer `linkRooms` so doors stay bidirectional:

```ts
import { linkRooms } from "@/engine";

const door = linkRooms("kitchen", "street", {
  direction: "south",
  fromLabel: "Front door",
  toLabel: "Kitchen",
  forwardBlocked: (s) => !s.flags.hasKey,
  forwardBlockedMessage: "Locked.",
});

// kitchen.exits = [door.forward]
// street.exits  = [door.back]
```

Or hand-write `RoomExit` objects (`direction`, `to`, `label`, optional `blocked`).

---

## World map / fast travel

| Pack field | Effect |
|---|---|
| omit / `{ enabled: true }` | Map shown when pack has **>1 room** |
| `mapFastTravel: false` | Hide Map (Attic Study) |
| `mapGroups: { "Town": ["street", "park"] }` | Grouped list |
| `{ requireVisited: false }` | Travel anywhere on the map (open / debug) |

### Optional map fog (`mapFog`)

Omit entirely if you don’t need it. When `mapFog.enabled`:

| Field | Behavior |
|---|---|
| `clearOnVisit` | Visiting clears fog (default true) |
| `revealByFlag` | `roomId → flag` reveals name/description early |
| `travelByFlag` | Room stays **known but sealed** until flag |
| `alwaysKnown` | Never fog (defaults to start room) |

Fogged tiles show as `???`. Sealed known rooms show a lock + reason.

### Visible locked exits

Gated links (`requireFlag` / `requireItem`) stay listed by default with optional `lockedLabel` (“Sealed tunnel”). Set `showWhenBlocked: false` to hide until unlocked.

Map UI also lists **exits from the current room**. Travel always goes through the engine.

---

## Scene atmosphere & animation

| Feature | How |
|---|---|
| Particle beds | `Room.particles`: `stars`, `sparkle`, `fireflies`, `rain`, `fog`, `dust`, `sparks` |
| Overlay layers | `Room.layers[]` — image + optional `frames` / `fps` / `animClass` / parallax |
| Hotspot loops | Hotspot `frames` + `fps` (lanterns, flags) and/or `animClass` (`twinkle`, `bob`, `sway`, `flicker`, `pulse`) |
| Studio | Pack → Atmosphere select + **Atmosphere & layers** panel (multi-file = frame loop) |

Pick particles for **your** tone: `sparkle` / `fireflies` for bright comedy, `stars` for night mystery, `rain` / `fog` for noir, `dust` for attics. There is no global dark filter — only pack-authored beds (plus a pack's optional `shell.canvasFx`).

---

## Audio (web + iOS)

| Layer | Source |
|---|---|
| Music | Procedural synth presets via `PackAudio.music` + `Room.music` |
| Ambient bed | `PackAudio.ambient` (`rain`, `drip`, `hum`, …); volume tracks the music slider |
| One-shot SFX | Built-in oscillator keys + `PackAudio.sfx` samples via shared `AudioContext` (`packAudioPlayer`) |
| Channels / stop | `{ op: "sound" \| "stopSound", key?, channel? }` — host stops by key and/or channel |
| Speech duck | Dialogue / VO briefly ducks music + ambient |
| Unlock | Shared `AudioContext` — never closed while the app runs |

Settings: **Music** and **Sound effects** sliders (persisted in `localStorage`). Both mute and SFX volume apply to pack MP3 samples (not only oscillators).

Authoring: [`ASSETS.md`](./ASSETS.md) · pack example: `src/games/attic-study/audio.ts`.

---

## Touch & safe area

- Controls use **≥44px** tap targets where practical
- `viewport-fit=cover` + CSS `--sat/--sab/--sal/--sar`
- Game chrome pads with safe-area insets (notch / home indicator)
- No hover-only interactions for critical verbs
- **Hold empty floor** (~380ms) to reveal all hotspot outlines (Thimbleweed-style)
- **Item cursor** lifts above the finger on touch / coarse pointers so inventory art stays visible

## Event juice & stuck assist

| Feature | How |
|---|---|
| Juice cues | Hotspot `interactJuice` / `useWithJuice`, or `{ op: "juice", preset }` — shake / flash / burst |
| Reduced motion | Settings → Reduce motion (or OS `prefers-reduced-motion`) strips shake/burst |
| Stuck assist | After idle / failed interacts, banner offers the next progressive hint |
| Consume warn | Use-with that sets `consumeItem` (or `takeItem` actions) confirms before removing the item |
| Feel lint | `pack-doctor` flags interactive hotspots with no SFX/haptic/juice (`feel:dry:…`) |
| Line catalog | Studio Dialogue → Export CSV (stable `lineId` + `voiceKey`); Import locale → `pack.i18n` |
| VO timing | `sayLine` / dialogue `voiceKey` plays pack VO; talk anim + speech bar extend to clip length |
| Captions / text | Settings → Captions + text size (sm/md/lg) |

## Settings & place kits

New Game Wizard: **tone** (mystery / comedy / sunny / minimal) then **place** (space, forest, city, office, cyberpunk, European city, California, Deep South, water, adventure trek). Place seeds start-room music + particles only — packs stay free to mix any genre with any setting.

---

## Capacitor

See [`../../CAPACITOR.md`](../../CAPACITOR.md): `npm run cap:ios` after Xcode + CocoaPods are installed.

**Ship chrome (web + native same `dist/`):**

| Concern | Behavior |
|---|---|
| Safe area | Play surface + mobile menu pad with `--sat/--sab/--sal/--sar` (`env(safe-area-inset-*)`; `0` on desktop) |
| Audio resume | `MusicContext` resumes suspended `AudioContext` on `visibilitychange` / focus / pageshow |
| Save quota | Save/Load failure toast → one-tap **Export backup** |

---

## Advanced vs beginner

| Audience | Path |
|---|---|
| New builder | Play Attic Study → [`../games/attic-study/WALKTHROUGH.md`](../games/attic-study/WALKTHROUGH.md) → Studio Pack tab or `npm run new-pack` |
| Advanced | Full `GameDefinition`, specials, scripts, cutscenes — [`PACKS.md`](./PACKS.md) / [`ENGINE.md`](./ENGINE.md) |
| Visual builder | **Shipped** — [`../../docs/STUDIO.md`](../../docs/STUDIO.md) · plan archive: [`ADMIN_BUILDER_PLAN.md`](../../docs/ADMIN_BUILDER_PLAN.md) |
