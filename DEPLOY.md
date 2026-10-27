# Deploy

For **iOS** builds see [CAPACITOR.md](./CAPACITOR.md). For shell/travel/audio authoring see [src/engine/SHELL.md](./src/engine/SHELL.md).

## Vercel (easiest + free)

**Cost:** $0 on [Hobby](https://vercel.com/pricing) for personal/non-commercial demos.

### Path A — Dashboard (recommended, ~2 minutes)

1. Merge or push the branch you want live (usually `main`)
2. Open [vercel.com/new](https://vercel.com/new) and sign in with **GitHub**
3. **Import** `aarondavidson/Pick-Script` (or your fork)
4. Confirm settings (Vite auto-detects these):
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
5. Click **Deploy**

You get a URL like `https://pick-script-….vercel.app`.  
Client-side routes (`/play/attic-study`) work via [`vercel.json`](./vercel.json) rewrites.

Optional: Project → Settings → Domains → add a custom domain (still free on Hobby for one project).

### Path B — Claim a temporary CLI deploy

From a machine with the repo (no account needed first):

```sh
npx vercel deploy --temporary --yes
```

You get a `*.vercel.app` URL (short-lived) plus a **claim** link. Open the claim URL while logged into Vercel to keep the project on Hobby ($0).

### Path C — CLI after login

```sh
npx vercel login
npx vercel --prod
```

### Public player deploy (recommended)

Keep the **public** production project locked down:

| Env | Public | Private preview (you edit) |
|---|---|---|
| `VITE_ENABLE_STUDIO` | unset / false | `true` (engine product only) |
| `VITE_LOCKED_GAMES` | optional, e.g. `harbor-fog` | usually unset |
| `VITE_STRICT_PLAY` | unset (defaults **on**) | `false` if you need draft override |
| `VITE_SAVE_INTEGRITY_KEY` | optional long random string | same or unset |
| `VITE_STUDIO_SECRET` | n/a | optional passphrase |

Security hardening notes: [`docs/SECURITY.md`](./docs/SECURITY.md).

There is no server-side code: the deploy is a static SPA under `dist/`, so there are no API keys or paid services to protect. Authors bring their own art (see [`docs/IMAGE-GEN-STARTER.md`](./docs/IMAGE-GEN-STARTER.md)).

Strict play (default on public builds):

- `/studio` and `/recipes` redirect home
- Shipped packs cannot be replaced by `localStorage` “installed” drafts
- Sidecar hotspot overlays and `/play/studio-draft` are ignored
- Fast-travel refuses unvisited rooms; saves sanitize unknown rooms
- `vercel.json` sends CSP + `nosniff` / frame / referrer headers

**Threat model:** this is a client SPA. Someone who downloads and patches the JS can still cheat. Deploy lock is for players poking DevTools / storage — not anti-cheat for competitive multiplayer.

### Shipping a Studio pack (not just this repo)

| Path | How |
|---|---|
| Same browser | Studio → **Publish to launcher** → `/play/<id>` |
| Another player | **Download .pack.json** → their launcher **Import** |
| Shareable link | Host the file; open `/play?packUrl=https://…/game.pack.json` |
| Inside this GitHub app | `npm run pack-from-json -- ./game.pack.json` then deploy as usual |

### What not to bother with

- Paid Pro / teams — not needed for a public demo
- GitHub Pages — works but needs `base` path tweaks; Vercel is less fiddly for SPAs
- JS obfuscation / anti-devtools theater — high cost, low real security

---

## After deploy — smoke checklist

- [ ] Engine product `/` shows Attic Study featured + Build yours (studio link hidden on public)
- [ ] `/studio` redirects home on public (or loads on private engine preview with flag)
- [ ] `/play/attic-study` — Look desk → Inventory → select key → click chest
- [ ] `/play/harbor-fog` — audio unlock → docks load
- [ ] Hard-refresh `/play/attic-study` (SPA rewrite OK)
- [ ] Response headers include `Content-Security-Policy`
