# Asset & technical requirements

Concrete specs for art, sprites, and audio when building a pack.
Values below match what the **current shell** ships with (Attic Study + template).
If you change the stage size in UI code, update this doc.

**Authoring helper:** open `/studio` (see [`docs/STUDIO.md`](../../docs/STUDIO.md)) to generate or upload art and pixel-clean to the sizes below. Presets live in `src/studio/pixelate.ts` → `ASSET_PRESETS`.

---

## Runtime / tooling requirements

| Requirement | Spec |
|---|---|
| Node.js | 18+ (20 LTS recommended) |
| Package manager | npm (repo uses `package-lock.json`) |
| Browser | Modern Chromium / Firefox / Safari (Web Audio + ES modules) |
| Typecheck | `npx tsc --noEmit` must pass |
| Tests | `npm test` must pass (engine smokes validate packs) |
| Pack contract | Valid `GameDefinition` — `createGame()` throws on structural errors |
| Coordinates | Room space is **percent 0–100**, not pixels |
| Save id | Stable `definition.id` slug (changes orphan old saves) |

Optional: Capacitor wrappers exist for iOS/Android; packs do not need native code.

---

## Stage & layout (presentation shell)

| Property | Value |
|---|---|
| Desktop stage height | **480px** (`LocationView`) |
| Mobile stage height | `min(gameHeight, 400px)`, capped at `50vh` |
| Room coordinates | `%` of room image width/height |
| Hotspot box | `x, y, width, height` in **%** |
| Walkboxes | AABB in **%**; optional `scale` for depth (e.g. `0.85`–`1.05`) |
| `roomSize` | `{ width, height }` vs viewport (`100` = exact fit; `width: 140` enables horizontal scroll) |
| Ego / actor anchor | Drawn at feet; transform origin bottom-center |

**Authoring tip:** Place hotspots in the debug overlay (`?` / debug mode) and export coords — don’t guess pixels.

---

## Room backgrounds

| Spec | Requirement | Notes |
|---|---|---|
| **Format** | JPG or WebP (photos); PNG if you need transparency | Attic Study ships JPG |
| **Resolution** | **1920×1080** (canonical) | Matches the demo pack art |
| **Acceptable** | 1280×720 minimum | Upscaled poorly on desktop stage |
| **Aspect** | **16:9** preferred | Stage letterboxes/crops via `bg-cover` |
| **File size** | **≤ 500 KB** target; **≤ 1 MB** hard max | Bedroom reference ~320 KB |
| **Color space** | sRGB | Avoid Display-P3-only exports |
| **Naming** | Pack-local `src/games/<id>/assets/<roomId>.jpg` (preferred) | Must be Vite-imported (`import img from "…"`) — see attic-study |
| **Safe area** | Keep verbs/UI-critical detail in lower ~70% | Top can be sky/architecture |
| **Walkable band** | Design a clear floor band for walkboxes | Usually lower third |

```ts
import kitchenImg from "../../assets/kitchen.jpg"; // pack-local under src/games/<id>/assets/
// …
{ id: "kitchen", image: kitchenImg, roomSize: { width: 100, height: 100 } }
```

Wider rooms (scrolling): keep height 1080, increase width (e.g. 2688×1080 ≈ 14:9) and set `roomSize: { width: 140, height: 100 }` (or match ratio).

---

## Hotspots (hit targets)

| Spec | Requirement |
|---|---|
| Units | Percent of room (0–100) |
| Min size (touch) | Prefer **≥ 8% × 8%** on mobile; never under ~44 CSS px equivalent |
| Overlap | Allowed; topmost in DOM wins — avoid stacking interactive zones |
| Art | Usually **painted into the background**; no separate hotspot PNG required |
| Approach | Optional `approach: { x, y }` in % for walk-to |

---

## Actors / sprites

Default ego/NPC body is a **CSS stand-in** (`.actor-ego` / `.actor-npc`). Packs should prefer **bitmap costumes**.

### Bitmap costumes (recommended)

| Spec | Requirement |
|---|---|
| **Format** | PNG with alpha (JPG OK if background is painted in) |
| **Frame size** | **64×96** or **128×192** px standing figure (feet at bottom) |
| **Facing** | Engine mirrors with `scaleX` for left/right |
| **Idle / walk / talk** | Optional per-state URLs in `Actor.animations` (else bob/talk CSS on the bitmap) |
| **File size** | ≤ 150 KB per frame |
| **Registration** | Feet at bottom-center of frame |
| **Studio** | Pixels → Send to pack → **Character costume** / **Speech portrait** |

```ts
actors: {
  player: {
    name: "You",
    isEgo: true,
    sprite: playerImg,              // imported URL → bitmap on stage
    portrait: playerImg,            // speech bar
    animations: {
      walk: playerWalkImg,          // optional second frame/URL
    },
  },
}
```

Character hotspots may also set `sprite` / `portrait` — compile stamps the sprite onto the hotspot overlay and the actor registry.

### CSS costume classes (fallback)

| Class | Role | Approx on-stage size |
|---|---|---|
| `.actor-ego` | Player | ~28×48 px box |
| `.actor-npc` / custom | NPCs | same scale; depth via walkbox `scale` |
| Anim classes | `actor-anim-idle` / `walk` / `talk` | Wired from `Actor.animations` when values are CSS classes |

### Optional NPC overlay images

| Spec | Requirement |
|---|---|
| Format | PNG or JPG |
| Size | **512×512** square (e.g. `src/games/<id>/assets/npcs/*`) |
| Use | Decorative overlays / portraits — not the walkbox actor body unless wired |

---

## Portraits (speech bar)

Shown in `SpeechBar` at **56×56** (mobile) / **64×64** (desktop).

| Spec | Requirement |
|---|---|
| **Format** | JPG or PNG |
| **Resolution** | **256×256** (canonical); 128×128 minimum |
| **Framing** | Head / bust, subject centered |
| **File size** | ≤ 80 KB |
| **Field** | `Actor.portrait` — URL string (Vite import) or key your host maps |

```ts
import heroPortrait from "@/assets/portraits/hero.png";
// actors.hero.portrait = heroPortrait
```

If `portrait` is a bare key (no `/`), the shell currently shows a color block — prefer imported URLs.

---

## Inventory / item icons

| Spec | Requirement |
|---|---|
| Format | PNG with alpha |
| Size | **128×128** or **256×256** |
| File size | ≤ 40 KB |
| Field | `GameItem.icon` (Vite URL) and/or pack `definition.itemIcons[id]` |
| Host UI | Resolves `item.icon` → `itemIcons` → placeholder — **no pack hardcodes** |

Reference icons live under `src/games/attic-study/assets/items/`.

---

## Comics (optional modality)

| Spec | Requirement |
|---|---|
| Format | JPG |
| Panel size | **800×544** |
| File size | ≤ 200 KB per panel |
| Pack field | `definition.comics[id].pages[].image` (Vite URL) |

---

## Sound effects (SFX)

| Spec | Requirement |
|---|---|
| **Format** | MP3 (preferred), OGG, or WAV |
| **Length** | **≤ 1.0 s** for UI verbs; ≤ 2 s for world stingers |
| **Sample rate** | 44.1 kHz or 48 kHz |
| **Channels** | Mono OK for UI; stereo OK for stingers |
| **Loudness** | Peak ≈ −3 dBFS; avoid clipping |
| **File size** | ≤ 100 KB each |

### Built-in host keys (always available)

Wired through `soundFX.playKey` / script `{ op: "sound", key }`:

| Key | Use |
|---|---|
| `click` | Generic UI / interact |
| `pickup` | Inventory get |
| `success` | Achievement / puzzle win |
| `verb` | Verb select (also used as VO stub) |
| `error` | Blocked action (oscillator + haptics on native) |
| `creak` / `door` | World stingers |

Pack MP3s (`definition.audio.sfx`) decode through the shared `AudioContext` (`packAudioPlayer`) so **SFX volume / mute apply**. Prefer `{ op: "stopSound", key, channel }` over orphaned HTMLAudio.  
Hotspots may set `interactSound` / `useWithSound` to a built-in or pack key.  
Author these bindings in `/pick?tab=audio` (see [`docs/STUDIO.md`](../../docs/STUDIO.md)).

### Haptics (mobile)

| Field / op | Values |
|---|---|
| `interactHaptic` / `useWithHaptic` | `light` · `medium` · `heavy` · `success` · `warning` · `error` · `selection` |
| Action chain | `{ "op": "haptic", "style": "medium" }` |

When haptic is omitted, the host maps SFX keys (`pickup`→heavy, `success`→success, `error`→error, `creak`/`door`→medium, …).  
Native Capacitor gets real haptics; web uses `navigator.vibrate` where available (silent otherwise).

---

## Music

### Two layers

1. **Procedural ambient** (default) — Web Audio synth presets via pack `audio.music` → `Room.music`
2. **Licensed beds** (optional files) — e.g. intro/epilogue MP3 under `public/audio/`

### Pack music cues (recommended)

```ts
audio: {
  defaultMusic: "streets",
  music: {
    home: "calm",        // → built-in preset name
    warehouse: "eerie",
    // File bed (shared music bus + speech ducking):
    concert: {
      src: "/audio/who-laughs-last.mp3",
      loop: true,
      gain: 0.7,
      fallbackPreset: "upbeat",
    },
  },
  ambient: {
    warehouse: "wind",   // rain | crowd | drip | wind | hum | static | none
    sewer: "drip",
  },
}
```

**Built-in synth presets:** `calm` · `eerie` · `underground` · `upbeat` · `neutral` · `noir` · `ambient`

String shorthand `/audio/foo.mp3` also works. Studio **Audio** tab can set a file bed URL per cue. Music volume / mute / speech ducking apply to both synth and file beds.

### Licensed / streamed beds

| Spec | Requirement |
|---|---|
| Format | **MP3** (recommended), WAV, OGG |
| Loop | Clean loop points; seamless if ambient |
| Length | 60–180 s loops typical |
| Bitrate | 128–192 kbps MP3 |
| Loudness | ≈ −14 LUFS integrated (streaming norm) |
| Path | `public/audio/<name>.mp3` → URL `/audio/<name>.mp3` |

Prefer pack `MusicFileBed` for room music so ducking stays consistent.

**Browser note:** Audio requires a user gesture — keep the unlock overlay before music starts.

---

## Voice (optional)

| Spec | Requirement |
|---|---|
| Format | MP3 / OGG |
| Length | Match line duration (~1–4 s) |
| Naming | Match `sayLine.voiceKey` / dialogue `voiceKey` |
| Pack map | `audio.voice: { hero_hello: "/audio/vo/hero_hello.mp3" }` |
| Line catalog | Studio **Export/Import CSV** (`lineCatalog.ts`) for VA + translators → `pack.i18n` |
| Lip-sync slots | Optional `mouthCues: { t, shape }[]` or `lipSyncKey` on dialogue / sayLine / cutscene lines — stored for Rhubarb-style import; runtime passes through to speech |

Host `onVoice` plays the URL; talk anim / speech bar duration follow VO length (or a text-length estimate). Without a clip, keys may fall back to SFX stubs.

---

## Checklist before shipping a pack

**Art**
- [ ] Every room has a 16:9 background (1920×1080 target)
- [ ] Hotspots sized for touch; walkboxes cover the floor
- [ ] Ego + important NPCs have portraits if they use `sayLine` with bar UI

**Audio**
- [ ] `Room.music` set (or pack `defaultMusic`)
- [ ] Cues resolve through `audio.music` to known presets
- [ ] No autoplay without unlock gate

**Engine**
- [ ] `validateGameDefinition` / `createGame` clean
- [ ] `npx tsc --noEmit` + `npm test` green
- [ ] Registered in `src/games/registry.ts`

---

## Where this is enforced

| Concern | Enforced by |
|---|---|
| Pack structure | `validateGameDefinition` at boot |
| Types | TypeScript |
| Pixel sizes / file KB | `npm run check-assets` (CI) — **errors** on unreadable images + hard size caps; **warnings** for below-min / non-canonical dims (use `--strict` to fail on warnings) |
| Music cue resolution | Runtime `resolveMusicTheme` (unknown → `ambient`) |
