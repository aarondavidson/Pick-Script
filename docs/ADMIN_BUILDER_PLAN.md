# Plan: visual admin for new game builders

> **Status (current):** Phases **A–C are shipped** in `/studio` (Pack handoff, puzzles/map/audio, dialogue/hints/quests, publish, IndexedDB drafts). Phase **D is partial** (TS codegen started; specials/i18n bridge still open). Treat this doc as the original roadmap archive — day-to-day authoring lives in **[`STUDIO.md`](./STUDIO.md)**.

**Goal:** Let someone with little coding experience build a playable pack (rooms, hotspots, exits, items, basic audio) while keeping the full TypeScript `GameDefinition` path for advanced authors.

**Constraint:** Same content must ship to **web** and **iOS** (Capacitor). Admin is an authoring tool; the runtime stays the portable engine.

---

## Principles

1. **Packs remain the source of truth** — admin reads/writes pack files (or a JSON intermediate that compiles to a pack).
2. **Progressive disclosure** — wizard for beginners; “Advanced JSON / TS” panel for power users.
3. **Engine-native assets only** — authors upload art or pull from free pixel galleries (see Studio → Pixels).
4. **Touch-aware preview** — live playframe at phone + desktop widths.
5. **GPL** — generated packs stay under the project license; document that clearly in the UI.

---

## Personas

| Persona | Needs |
|---|---|
| **Newbie** | Upload room image, click to place hotspots, link rooms on a graph, pick music preset, press Play |
| **Hobbyist** | Inventory puzzles, blocked doors, map groups, simple dialogue |
| **Advanced** | Raw `GameDefinition`, scripts, specials, i18n — keep current repo workflow |

---

## Phased delivery

### Phase A — Pack studio MVP — **shipped**

**Route:** `/studio` (gated in production via `VITE_ENABLE_STUDIO`). Docs: [`STUDIO.md`](./STUDIO.md).

| Feature | Detail |
|---|---|
| New pack wizard | id, title → Studio wizard / starter gallery (CLI `new-pack` still for TS packs) |
| Room list | Add room → upload **1920×1080** JPG (client-side resize) |
| Hotspot editor | Click-drag boxes on room image (% coords), Intent Wizard + ActionLists |
| Exit linker | Visual room graph; `linkRooms` semantics |
| Play preview | In-studio Live preview + `/play/studio-draft` |
| Export | `.pack.json` download + Publish to launcher + `pack-from-json` |

### Phase B — Puzzle & map — **shipped**

- Inventory items: upload icon, grant on hotspot interact
- Use-with wiring (item → hotspot) in Pack → Puzzles
- Blocked exits (flag / item gates + locked labels)
- Map groups + fast travel + optional map fog
- Music preset dropdown + ambient per room / pack audio cues

### Phase C — Polish & publish — **shipped**

- Dialogue node editor (linear + choices, talk-gates)
- Hints / quests / achievements forms
- Publish to this browser’s launcher; share via Import / `packUrl`
- Capacitor path documented separately (`CAPACITOR.md`)
- Undo/redo, autosave draft to IndexedDB (+ localStorage mirror)

### Phase D — Advanced bridge — **partial**

**Done / started:**

- Sync studio JSON → TypeScript pack codegen (`formatJsonPackAsManifestTs` / Pack → Copy TS pack)
- Live validation with `validateGameDefinition` / pack-doctor + inline fix-it links
- Blend packs, regions, ActionList reorder, setting kits, line catalog CSV

**Still open:**

- Specials / modalities as “plugin cards” (minigame picker)
- Full i18n key editor beyond CSV import
- Bidirectional TS pack ↔ studio JSON round-trip for deep specials (TS packs stay Author-mode / source edit)

---

## Suggested data model (studio)

Keep a **JSON pack document** the studio edits (see `JsonPackDocument` in `src/engine/jsonPack.ts`). Compile via `createGameFromJson` so beginners never touch TS; advanced users keep TS packs side-by-side in the registry.

---

## UX sketch (one composition)

1. **Left:** Rooms / Items / Map tabs  
2. **Center:** Room canvas (image + hotspots) or map graph  
3. **Right:** Inspector (selected hotspot/exit fields)  
4. **Bottom:** Play / Validate / Export  

Mobile authors: inspector as bottom sheet; canvas pinch-zoom.

Shipped Studio follows Guided progressive disclosure rather than this exact chrome — see [`STUDIO.md`](./STUDIO.md).

---

## Technical notes

| Topic | Recommendation |
|---|---|
| Stack | Same React/Vite app; code-split `StudioApp` |
| Storage | IndexedDB drafts; optional File System Access API on desktop Chrome |
| Assets | Store as blob URLs in draft; on export write into pack `assets/` |
| Validation | Reuse `validateGameDefinition` + `check-assets` rules |
| iOS | Studio can be **web-only**; device testing uses exported pack in the player shell |
| Security | Studio in production should not expose arbitrary FS write without local CLI |

---

## Success metrics

- Newbie ships **1 room + 2 puzzles** without writing TypeScript (Attic Study parity) — **met** via Guided Pack + Harbor Fog demo
- Advanced author can still open `manifest.ts` and never use the studio — **met**
- Exported pack passes `npm run verify` and runs on web + Capacitor iOS — **met** for JSON → `pack-from-json` path

---

## Implementation order (archive)

1. JSON pack type + `createGameFromJson` — **shipped**
2. `/studio` shell + room image upload + hotspot draw — **shipped**
3. `linkRooms` graph UI — **shipped**
4. Preview player — **shipped**
5. Export / Publish — **shipped**
6. Item + use-with forms — **shipped**
7. Map / audio toggles — **shipped**
8. Codegen to TS — **started** (`formatJsonPackAsManifestTs`)

Also shipped beyond the original list: validator fix-it links; Author mode draft editing; Items / Dialogue / World / IndexedDB; Design coach; starter gallery; pack-doctor; walkboxes / regions / approach painters; blend packs; ActionLists; setting kits; Harbor Fog demo.

This plan intentionally keeps the **robust engine** as the core and treats the admin UI as a **friendly compiler** into that core.
