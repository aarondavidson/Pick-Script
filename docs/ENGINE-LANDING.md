# Start here — play, make, share

Welcome. This is the friendly homepage for the **Portable Adventure Engine**.

You can **play** finished demos, **make** a short game in about half an hour, and **share** it — mostly without writing code.

**New to everything?** Read the full plain guide: **[HOW-TO.md](./HOW-TO.md)**.

---

## 1. Play a tiny game (Attic)

One room, two puzzles, real art and sound. Best first experience.

1. Run `npm run dev`
2. Open **http://localhost:8080/play/attic-study**
3. Look at the desk → take the key → use it on the chest

How that game was built: [attic-study/WALKTHROUGH.md](../src/games/attic-study/WALKTHROUGH.md)

---

## 2. Play a bigger demo (Harbor)

A short dockside mystery with several rooms — closer to a “real” adventure length for a weekend project.

Open **http://localhost:8080/play/harbor-fog**

Notes: [harbor-fog/README.md](../src/games/harbor-fog/README.md)

---

## 3. Make pictures for your game

Use AI (or free art) so the rooms look like *your* story.

- Prompts & sizes: **[IMAGE-GEN-STARTER.md](./IMAGE-GEN-STARTER.md)**
- Room pictures: wide, about **1920×1080**
- Item icons: square, about **256×256**

For the 30-minute starter, paint the **main square / hub** first. The key item is usually named **`harbor_key`** in Studio.

---

## 4. Make a game in about 30 minutes

Same path as the home-screen card **Make a game in 30 minutes**:

1. Theme + pictures → open `/pick?funnel=1` (prompts in IMAGE-GEN-STARTER)
2. New game → choose **short-mystery** → `/pick?new=short-mystery`
3. After create, Pack jumps to **Art handoff** — assign hub art + key icon
4. Run **Ship checklist** → **Play** your draft

You can also open both steps at once:

`http://localhost:8080/pick?funnel=1&new=short-mystery`

---

## 5. Before you share — Ship checklist

In Studio → Pack tab, open **Ship checklist**. It looks for missing pictures, broken doors, clickables that do nothing, and “stuck forever” puzzles.

Then:

- **Play draft** — try the whole path once
- **Download .pack.json** — send the file to a friend, or
- **Publish to launcher** — installs only in *this* browser

Full night-before checklist for maintainers: [SHIP-NIGHT.md](./SHIP-NIGHT.md)

---

## Names (optional)

| Name | Plain meaning |
|---|---|
| **P.I.C.K.** | Maker tools (Design studio at `/pick`) |
| **S.C.R.I.P.T.** | The engine that runs the game |

More: [PICK-SCRIPT.md](./PICK-SCRIPT.md)
