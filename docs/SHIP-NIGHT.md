# Ship-night checklist

**In plain words:** a night-before release punch list for maintainers — run the checks, play the demos, don’t ship if something’s red.

Everyday makers sharing a Studio pack only need the in-app **Ship checklist** — see [HOW-TO.md](./HOW-TO.md) §9.

Landing context: [`ENGINE-LANDING.md`](./ENGINE-LANDING.md)

---

## A — Typecheck / test / build

```sh
npm ci
npm run typecheck
npm test
npm run build
# optional full gate:
npm run verify   # typecheck + test + check-assets
```

- [ ] `typecheck` exit 0  
- [ ] `test` exit 0  
- [ ] `build` → `dist/` exit 0  
- [ ] `verify` exit 0 (if you ran it)

---

## B — Capacitor check

```sh
npm run check:capacitor
```

- [ ] `check:capacitor` exit 0  
- [ ] No surprise config drift vs [`CAPACITOR.md`](../CAPACITOR.md)

---

## C — Play packs (manual smoke)

```sh
npm run dev
```

| Pack | Route | Smoke |
|---|---|---|
| **Attic Study** | `/play/attic-study` | Desk → key → chest → locket; audio unlock; save/load |
| **Harbor Fog** | `/play/harbor-fog` | Hub → wings → key/chest → lighthouse gate |
| **short-mystery** | Studio → New game → `short-mystery` → Play draft | 5 rooms, gated climax, hint thread |

- [ ] Attic completable  
- [ ] Harbor loop + gate  
- [ ] short-mystery draft plays from Pack → Play draft

---

## D — Sequence-lock

In a pack or Studio specials: place a `sequence-lock` minigame hotspot.

- [ ] Pads accept input in order  
- [ ] Wrong order resets / fails gracefully  
- [ ] Win sets `winFlag` (default `beatSequenceLock`) and unlocks downstream content if wired

Refs: [`docs/JSON-PACK-SCHEMA.md`](./JSON-PACK-SCHEMA.md) · [`src/engine/PACKS.md`](../src/engine/PACKS.md)

---

## E — Puzzle graph

Studio Pack → Ship checklist / Puzzle graph panel:

- [ ] Graph shows pickups → items/flags → gated exits  
- [ ] Soft-locks highlighted (flag never set)  
- [ ] Edit path works (add gated link / suggest unlock) without corrupting draft

---

## F — Vercel env

Public player vs private studio preview ([`DEPLOY.md`](../DEPLOY.md)):

| Env | Public production | Private preview |
|---|---|---|
| `VITE_ENABLE_STUDIO` | unset / false | `true` |
| `VITE_STUDIO_SECRET` | unset | set if gating unlock |

- [ ] Public build: Studio locked / absent  
- [ ] SPA routes (`/play/attic-study`) work via `vercel.json`  
- [ ] Import `.pack.json` / `/play?packUrl=` still works without Studio

---

## Done when

All A–F boxes checked (or consciously skipped with a note). Then merge / deploy.
