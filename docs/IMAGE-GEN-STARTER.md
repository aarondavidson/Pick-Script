# AI pictures for your adventure

**In plain words:** copy-paste prompts so an image AI draws your room and item icons. Then drop the files into Studio.

**Never made a game before?** Start with [HOW-TO.md](./HOW-TO.md) §2–3, then come back here for the prompts.

### Two simple paths

1. **One-room Attic style** — desk → key → chest → locket (prompts below).
2. **30-minute mystery** — five rooms; draw the **main hub** first, then side rooms later. In Studio the key is usually named **`harbor_key`**. Open `/pick?funnel=1` and use **Art handoff** after the wizard.

Sizes & technical rules (when you need them): [`src/engine/ASSETS.md`](../src/engine/ASSETS.md)  
How Attic was wired: [`src/games/attic-study/WALKTHROUGH.md`](../src/games/attic-study/WALKTHROUGH.md)  
Short homepage: [`ENGINE-LANDING.md`](./ENGINE-LANDING.md)

---

## What to ask the AI for

| Picture | Size | What it’s for |
|---|---|---|
| Room background (`attic.jpg` or your name) | **1920×1080**, wide 16:9, JPG/WebP under ~500 KB | The place you walk around — paint the desk & chest **into** the scene |
| Key icon | **256×256** | Inventory picture |
| Reward icon (locket, etc.) | **256×256** | Inventory picture for the prize |

You do **not** need separate images for every clickable thing. Paint the desk and chest clearly in the room (lower part of the frame; leave floor space to walk). The game adds invisible click boxes on top.

---

## Recommended AI image models (2026)

Pick one; all work if you set resolution / crop afterward.

| Model / product | Best for | Notes for this pack |
|---|---|---|
| **ChatGPT (GPT Image / DALL·E in ChatGPT)** | Absolute beginners | Paste the master prompt; ask for 16:9 then “upscale/export 1920×1080”. Easy iteration in chat. |
| **Google Gemini (Image / Imagen)** | Fast free/cheap drafts | Good for stylized rooms; check output isn’t 1:1 square — request 16:9 explicitly. |
| **Microsoft Copilot Designer** | Free quick tries | Same prompt; download largest size; crop to 16:9. |
| **Midjourney** | Strong mood / illustration | Use `--ar 16:9`. Upscale; export and resize to 1920×1080. |
| **Flux** (via fal.ai, Together, Leonardo, etc.) | Controllable “game background” look | Prefer Flux for pixel-adjacent or painted adventure art; set width/height 1920×1080 when the UI allows. |
| **Stable Diffusion / SDXL / ComfyUI** | Local or fine control | Use a 16:9 checkpoint; img2img later for consistency. Steeper learning curve. |
| **Adobe Firefly** | Commercial-safe stock vibe | Good if you need clearer licensing for a public ship. |

**Practical pick if you’re new:** ChatGPT or Gemini for the room + two icons in one session, then compress with Studio → Pixels or any JPG compressor to ≤500 KB.

**Pixel-art tip:** After generating, run through **P.I.C.K. Studio → Pixels** (or your pixelate tool) to snap to the engine’s asset presets — don’t ask the model for tiny pixel sprites as the *only* step; generate clean art first, then pixel-clean.

---

## Step 0 — Fill your theme (copy this block)

Replace the brackets, then paste into the image model as context:

```text
GAME THEME CARD
- Game title: [e.g. Moonlit Greenhouse]
- Tone: [cozy / spooky / noir / funny / fantasy — pick one]
- Setting one-liner: [e.g. a dusty botanical attic above a florist shop]
- Time of day / light: [golden hour / stormy / candlelit / neon]
- Color palette: [3–5 colors, e.g. sage green, cream, brass, deep teal]
- Player fantasy: [curious kid / detective / witch apprentice]
- Must appear in the room art (clearly readable):
  1. A DESK or workbench (left or center) — where a KEY can be found
  2. A CHEST, trunk, or locked box (right or opposite side) — where a LOCKET/reward is hidden
  3. A clear FLOOR band across the lower third for a character to walk
- Style: 2D point-and-click adventure background, readable silhouettes, not photoreal clutter, no UI, no text, no watermark, no logos
```

---

## Prompt 1 — Room background (1920×1080)

Paste **after** your theme card:

```text
Create a single wide 16:9 point-and-click adventure ROOM BACKGROUND for a browser game.

Composition:
- Aspect ratio 16:9, landscape, suitable for 1920×1080
- Camera: straight-on or slight three-quarter view of one interior room (no collage, no split panels)
- Lower third: clear walkable floor with simple perspective
- Mid ground: furniture with readable shapes
- Upper area: ceiling / windows / atmosphere (less critical detail)

Required props (obvious, large enough to click in a game):
1) A desk or table with drawers — place it so a player would naturally look/use it first
2) A closed chest, trunk, or strongbox — clearly separate from the desk
Keep both fully visible; do not crop them at the frame edge.

Style:
- [MATCH THEME CARD tone and palette]
- Illustrated or painted adventure-game look (think classic 90s PC adventure clarity, not busy concept-art chaos)
- Soft lighting that matches the theme; gentle depth
- No characters, no inventory UI, no captions, no letters on props, no modern phone UI

Negative / avoid:
photoreal smartphone photo, blurry, watermark, logo, text, split-screen, multiple rooms, overhead map, muddy brown sludge, extreme fisheye, NSFW

Output: one image, 16:9. If you can set size, use 1920×1080.
```

**After generation:** Download → crop/resize to **1920×1080** → save as `attic.jpg` (or your room id) under `src/games/<your-pack>/assets/` → aim **≤ 500 KB**.

---

## Prompt 2 — Key inventory icon (256×256)

```text
Create a single INVENTORY ITEM ICON for a point-and-click game.

Subject: a [brass / iron / crystal / wooden — pick one] KEY that fits this theme: [one line from theme card].

Requirements:
- Centered object on a simple solid or soft gradient background (not a full room)
- Square composition, readable at small size
- Clear silhouette, slight game-art shading, no text, no fingers holding it
- Style consistent with a cozy/adventure UI icon

Size: 256×256 if possible; otherwise square and I’ll resize.

Avoid: photoreal stock photo, watermark, busy background, multiple keys.
```

Save as `items/key.jpg` (or `.png` with simple background).

---

## Prompt 3 — Locket / reward icon (256×256)

```text
Create a single INVENTORY ITEM ICON for a point-and-click game.

Subject: a [heart locket / pocket watch / carved amulet / sealed envelope — pick one]
that feels like a REWARD found inside a chest, matching this theme: [one line from theme card].

Requirements:
- Centered, square, readable at 64×64 thumbnail size
- Same art style language as the key icon (matching palette)
- No text, no watermark, plain/simple background

Size: 256×256 if possible.

Avoid: full character portraits, room backgrounds, clutter.
```

Save as `items/locket.jpg` (rename to match your item id).

---

## Optional — style consistency pass

If the icons don’t match the room:

```text
Redraw this item as a 256×256 inventory icon in the SAME palette and illustration style as the attached room background. Keep a plain simple background. No text.
```

(Attach the room image as reference if the model supports image input.)

---

## Drop into the pack

**Studio-first (recommended):**

1. `/pick?funnel=1&new=short-mystery` (or blank / key→door for a 1-room Attic loop)
2. Pack → **Art handoff** — assign hub room + `harbor_key` (or key/locket for Attic-style)
3. Draw hotspots → **Ship checklist** → Play draft

**TypeScript path:**

1. Scaffold: `npm run new-pack -- my-game --title "My Game"` or copy Attic Study.
2. Put files under `src/games/my-game/assets/` as in the walkthrough.
3. Vite-import them in the pack (see Attic Study `WALKTHROUGH.md` §1).
4. Play: `/play/my-game` — Look/Use desk → get key → Use key with chest.

---

## One-shot mega-prompt (if the model allows multiple images)

```text
You are helping me art-direct a tiny point-and-click game (1 room, 2 puzzles).

Using my THEME CARD below, generate THREE images:

A) Room background — 16:9, 1920×1080 intent, desk + chest clearly visible, walkable floor, no UI/text/characters
B) Key icon — 256×256 square, plain background
C) Reward locket/amulet icon — 256×256 square, same style as B

THEME CARD:
[paste filled theme card here]

Keep A/B/C visually consistent (palette + illustration style).
```

---

## Licensing reminder

You are responsible for the generator’s terms (commercial use, training-data policy). For a public GPL game ship, prefer tools/licenses you’re allowed to redistribute. When in doubt, generate privately for learning, or use clearly licensed assets from the Studio pixel library links.
