# How to use this project (plain language)

This page is for **everyone** — players, first-time makers, and people who just want a game online. No jargon required.

If a word feels unfamiliar, skip it. Follow the steps for the job you want.

---

## What is this?

A kit for **point-and-click adventure games** in the browser (and optionally on iPhone).

Think: click a desk, find a key, open a chest — like classic adventure games.

Two friendly names you’ll see:

| Name | Plain meaning |
|---|---|
| **P.I.C.K.** | The **maker tools** (the Design studio) |
| **S.C.R.I.P.T.** | The **game engine** that runs your story |

You do **not** need to memorize those. Just remember: **Studio = make**, **Play = play**.

---

## Pick your path

| I want to… | Go to |
|---|---|
| Play the demo games | [§1 Play](#1-play-the-demo-games) |
| Make my first game in about 30 minutes | [§2 Make a game](#2-make-a-game-in-about-30-minutes) |
| Create pictures with AI for my game | [§3 AI art](#3-create-art-with-ai) |
| Use free ready-made pixel art | [§4 Free art](#4-use-free-pixel-art) |
| Share my game with a friend | [§5 Share](#5-share-your-game-with-someone) |
| Put the site on the internet | [§6 Publish online](#6-put-the-website-online) |
| Try it on an iPhone | [§7 iPhone](#7-try-it-on-an-iphone) |
| Nudge hotspots while playing | [§8 Tweak while playing](#8-tweak-a-game-while-playing) |
| Check the game before sharing | [§9 Checklist](#9-check-before-you-share) |
| Dig deeper (technical) | [§10 More reading](#10-more-reading-when-youre-ready) |

---

## 1. Play the demo games

**Goal:** Feel how a finished game plays.

1. Install [Node.js](https://nodejs.org/) 22 or newer (the LTS download is fine).
2. On your computer, open a terminal in this project folder.
3. Run:
   ```sh
   npm install
   npm run dev
   ```
4. Open **http://localhost:8080** in your browser.
5. Start with **Attic Study** (one room, two puzzles). Then try **Harbor Fog** (bigger mystery).

| Game | What it’s for |
|---|---|
| **Attic Study** | Tiny teaching game — best first play |
| **Harbor Fog** | Short dockside mystery — more rooms |

**Tip:** On phones, tap a hotspot — a small menu of Look / Talk / Use usually appears.

---

## 2. Make a game in about 30 minutes

**Goal:** Your own playable mystery with rooms and a key — without writing code.

1. Start the app (`npm run dev`) if it isn’t running.
2. Open: **http://localhost:8080/pick?funnel=1&new=short-mystery**  
   (Or from the home screen, use **Make a game in 30 minutes**.)
3. Finish the **New game** wizard (the **short-mystery** starter is recommended: five rooms and a harbor key).
4. The Pack tab scrolls to **Art handoff** — drop in your room picture and key icon (see §3 or §4).
5. Draw clickable areas (hotspots) on the picture if the starter needs them.
6. Give the game an ending: **Quests & achievements → Game ends when flag**. Use the flag your last puzzle sets (picking up an item sets `got_<item id>`). Without one, players never see the win screen.
7. Open **Ship checklist** — fix anything red.
8. Click **Play draft** to try it — play it to the win screen. When happy, **Publish to launcher** (this browser only) or **Download** the game file.

That’s the whole maker loop: **wizard → art → ending → checklist → play**.

More detail: [ENGINE-LANDING.md](./ENGINE-LANDING.md) · [STUDIO.md](./STUDIO.md)

---

## 3. Create art with AI

**Goal:** Room backgrounds and item icons that match *your* theme.

1. Open [IMAGE-GEN-STARTER.md](./IMAGE-GEN-STARTER.md) — or Studio → **Pixels**, pick a suggested prompt and press **Copy prompt**.
2. Fill in the **theme card** (title, mood, colors, what must appear in the room).
3. Paste the prompts into ChatGPT, Gemini, Midjourney, or similar. Pick-Script doesn't make images itself — you use your own image tool.
4. Export:
   - Room picture: wide landscape, about **1920×1080**
   - Item icons: square, about **256×256**
5. In Studio → Pack → **Art handoff**, assign the files.

**For the 30-minute funnel:** paint the **main hub room** first. The key item name in Studio is usually **`harbor_key`**.

You do **not** need separate pictures for every clickable object — paint the desk/chest into the room; the game uses invisible click boxes on top.

---

## 4. Use free pixel art

**Goal:** Skip AI and use free assets.

1. Open Studio → **Pixels** tab.
2. Follow the **Free pixel art sources** links (itch.io CC0, OpenGameArt, Kenney, etc.).
3. Download images you’re allowed to use (prefer **CC0** / clearly free).
4. Upload in Pixels or Pack, then **Send to pack**.
5. Mixing art from different places? In Pixels choose **Palette: Custom** and paste a palette from [Lospec](https://lospec.com/palette-list) — use the same one for every picture so they look like one game.
6. In the art list, press **Add credit to pack** for each pack you used. Players see the credits in **Settings → Credits** and on the win screen.

Always double-check the license on the download page before you publish publicly — some free packs **require** credit (CC-BY), and the art list marks the ones that do.

---

## 5. Share your game with someone

**Goal:** A friend can play without Studio.

1. In Pack, click **Download .pack.json** (one file — pictures are inside).
2. Send them that file.
3. They open the launcher home page → **Import .pack.json** → play.

**Or put it online (best for bigger games):**

1. In Pack, click **Download for web hosting (.zip)**. You get a folder with a
   small `pack.json` and an `assets` folder holding your pictures as normal files.
2. Upload that folder to any web host with HTTPS (GitHub Pages, Netlify, your own site).
3. Share a play link like:

`/play?packUrl=https://…/my-game/pack.json`

This way there is no size limit, and pictures load faster the second time. The
single `.pack.json` file is fine for small games, but it must stay under about
12 MB to be installed in a browser.

**Publish to launcher** only installs the game in *your* browser. It does not upload it for the world.

---

## 6. Put the website online

**Goal:** A public URL (free Vercel path works well).

1. Push your code to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new) → Import this repo.
3. Keep the Vite defaults → Deploy.
4. Share the `https://….vercel.app` link.

Details: [DEPLOY.md](../DEPLOY.md).

For a public site, keep the Design studio **off** so visitors play games but don’t edit them. (Developers: see Studio “private authoring” notes.)

---

## 7. Try it on an iPhone

**Goal:** Run a build in Xcode (Mac required).

```sh
npm run build
npx cap add ios    # once
npm run cap:ios
```

Then open the project in Xcode and run on a simulator or device.  
Guide: [CAPACITOR.md](../CAPACITOR.md).

---

## 8. Tweak a game while playing

**Goal:** Nudge clickable areas without opening the full Studio.

1. Play any game (`/play/…`).
2. Open **Settings** → turn on **Author mode**  
   (on a phone: tap **Menu** → **Settings**; or press **Ctrl+Shift+H** on a keyboard).
3. Drag hotspots, add new ones, copy flags.

This is great for “the desk click box is a bit too small.” Big story changes still belong in Studio or the pack files.

**Phone tip:** the top bar stays short — one **Menu** button holds Journal, Quests, Map, Achievements, Hints, and Settings so the room picture sits higher. Packs can hide unused entries with `shell.chrome` (see [`src/engine/SHELL.md`](../src/engine/SHELL.md)).

---

## Voices and other languages

**Voices:** in Pack, open **Voice acting**. Every spoken line is listed; press
**Add recording** next to a line and choose an audio file. It plays when the
character says that line.

**Other languages:** the game's own text is translated with the Strings export
(CSV). The buttons and menus around the game can be translated too — see
"Translating the interface" in [`PACKS.md`](../src/engine/PACKS.md#translating-the-interface).

**Playing without a mouse:** Tab moves between the things in a room, Enter uses
them, number keys choose an action. This works for players using a keyboard or
a screen reader with no extra setup from you.

---

## 9. Check before you share

**Goal:** Catch “I can’t finish the game” problems early.

In Studio → Pack → **Ship checklist**:

- Missing room pictures
- Doors that go nowhere
- Clickables that do nothing
- Soft-locks (keys/flags the player can never get)

When the checklist looks good: **Play draft** once all the way through, then Download or Publish.

Night-before-ship checklist for maintainers: [SHIP-NIGHT.md](./SHIP-NIGHT.md).

---

## 10. More reading (when you’re ready)

| Topic | Doc |
|---|---|
| Short engine homepage | [ENGINE-LANDING.md](./ENGINE-LANDING.md) |
| Studio tools (Guided mode) | [STUDIO.md](./STUDIO.md) |
| AI art prompts | [IMAGE-GEN-STARTER.md](./IMAGE-GEN-STARTER.md) |
| Puzzle idea gallery | [RECIPES.md](./RECIPES.md) · in-app `/pick/recipes` |
| What “pack” means | [src/games/README.md](../src/games/README.md) |
| Attic build diary | [attic-study/WALKTHROUGH.md](../src/games/attic-study/WALKTHROUGH.md) |
| Names P.I.C.K. / S.C.R.I.P.T. | [PICK-SCRIPT.md](./PICK-SCRIPT.md) |
| Deeper engine notes | [src/engine/PACKS.md](../src/engine/PACKS.md) · [ENGINE.md](../src/engine/ENGINE.md) |

---

## Quick glossary

| Word | Plain meaning |
|---|---|
| **Pack** | One complete game (rooms, art, puzzles) |
| **Room** | A place you can stand and look around |
| **Hotspot** | An invisible clickable box on the picture |
| **Item** | Something in your inventory (key, locket…) |
| **Flag** | A yes/no switch the game remembers (“door unlocked”) — puzzles set flags |
| **Win flag** | The flag that ends the game and shows the win screen |
| **Credits** | Who made the art/music you used — shown to players |
| **Ship checklist** | “Is this game ready to share?” panel |
| **Art handoff** | Where you drop AI/free art into the draft |
| **Draft** | Your work-in-progress game in this browser |
| **`.pack.json`** | Downloadable game file you can send or import |
