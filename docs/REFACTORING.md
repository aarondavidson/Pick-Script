# Refactoring & module best practices

How we keep the Portable Adventure Engine maintainable while shipping packs
(Harbor Fog, Attic Study, `_template`) alongside it.

Use this when extracting modules or reviewing PRs.

---

## Invariants (never break)

1. **`src/engine/**` never imports a pack** (`@/games/...`). Tests may use attic/template fixtures or inline stubs — not title packs.
2. **Travel only through the engine** — `travel` / `travelThroughExit` / `travelToRoom`. Never assign `currentLocation` in UI.
3. **Title chrome is opt-in** — use `GameDefinition.shell` (`intro` / `canvasFx` / `complete` lazy loaders) and `legacySaveKeyPrefix`. Do not branch on `definition.id === "<some-pack>"` in shared shell.
4. **Minigames / modalities via registry** — `modalityRegistry` (+ `registerModalityPlayer`). Do not hardcode `minigameId === "…"` in `LocationView`.
5. **Pack-local art** — rooms/items/comics live under `src/games/<id>/assets/`. Shared `src/assets/` is for app chrome only (see README there).
6. **Public import paths stay stable** — when splitting a file, keep a barrel re-export (`jsonPack.ts`, `@/engine` index) so callers do not churn.

---

## Preferred shapes

### Engine React host

`AdventureProvider.tsx` is a **composer**. Domain logic lives in hooks under
`src/engine/adventure/`:

| Hook | Responsibility |
|---|---|
| `useWalkTick` | RAF walk + concurrent scripts + camera |
| `useSentenceInteract` | Sentence / use-with / give / consume confirm |
| `useTravel` | Exit + map travel + room transitions |
| `useCutsceneHost` | Start / advance / skip cutscenes |
| `useModalityHost` | Pending modality open / clear / win |
| `useSpeechHost` | Speech enqueue / skip / voice / VO extend |
| `useProgressionHost` | Combine, achievements, quests, journal |

Add a new hook when a concern grows past ~150–200 LOC inside the provider.
Keep `AdventureContextValue` stable unless you are intentionally changing the play API.

### JSON pack pipeline

| Module | Role |
|---|---|
| `jsonPackTypes.ts` | Document / room / hotspot types |
| `jsonPackCompile.ts` | `parseJsonPack`, `createEmptyJsonPack`, shared sanitizers |
| `jsonPackHotspot.ts` | Hotspot compile (pickup / character / use-with) |
| `jsonPackCreateGame.ts` | `createGameFromJson` |
| `jsonPackDialogue.ts` | Dialogue compile |
| `jsonPackCutscenes.ts` | Cutscene + hint compile |
| `jsonPackValidate.ts` | `validateJsonPack` |
| `jsonPack.ts` | **Barrel** — re-exports for `@/engine/jsonPack` |

New compile helpers go in a focused module, then export from the barrel.

### Studio Pack tab

`PackTool.tsx` is an **orchestrator**. Feature UI lives in panels:

- `PackRoomsPanel`, `PackStageCanvas` (→ Viewport / WalkboxRegion / HotspotInspector), `PackLinksPanel`
- `PackDialoguePanel`, `PackCutscenesPanel`, `PackBlendPanel`, …
- Audio tab: `AudioTool` → cues / room map / SFX bindings + `buildPackAudio`
- Pointer math: `stagePointer.ts` (shared with author-mode overlay)
- Draft body: IndexedDB via `packDraftIdb` (localStorage fallback only on IDB failure)
- Errors: `toastError` / `toastOk` from `src/studio/toastError.ts` (play shell may still use `sonner` in SaveLoadMenu)

Extract a panel when a section exceeds ~300 LOC or owns its own form state.

### App / Studio loading

- Routes in `App.tsx` are `React.lazy` (Launcher, Index, Studio, Recipes, NotFound).
- Studio tabs lazy-load tools so Pack does not pull Audio/Pixel.
- Pack shell chrome comes from loaders on `GameDefinition.shell` (`src/components/game/shellUi.ts`) — shared UI never imports `@/games/<title>/…` directly.

### Audio runtime

| Module | Role |
|---|---|
| `musicPresets.ts` | Themes, `resolveMusicTheme`, legacy location heuristics |
| `ambientSfxEngine.ts` | Location ambient SFX |
| `ambientMusicEngine.ts` | Procedural bed synth |
| `musicEngine.ts` | **Barrel** — keep `@/utils/musicEngine` imports stable |

Prefer pack `audio.music` / Room.music over `getThemeForLocation`.

### Security

All URL / JSON allowlists live in `src/engine/security.ts`:

- Media: `isSafeMediaUrl` / `isSafePlayMediaUrl` / `cssPlayUrlValue`
- Remote packs: `assertSafePackUrl`
- Storage: `safeJsonParse`, `STORAGE_LIMITS`

Do not reimplement host blocklists in pages.

---

## Tests

| Layer | Pattern |
|---|---|
| Engine unit | `*.test.ts` next to the module (e.g. `walkboxes.test.ts`) |
| Engine fixtures | attic-study, `_template`, or **inline** `GameDefinition` stubs — not full titles |
| Title playthrough | `src/games/<id>/*playthrough*.test.ts` (owned by that pack) |

When adding an engine test that needs “a pack with shell.complete”, use an inline stub:

```ts
const stub = { id: "t", title: "T", version: "1.0.0", startRoom: "r",
  rooms: { r: { id: "r", name: "R", image: "data:,", hotspots: [], exits: [] } },
  combinations: {}, achievements: [], quests: [],
  shell: { complete: () => Promise.resolve({ default: () => null }) },
};
```

---

## Checklist before extracting a module

- [ ] Public imports still resolve (barrel / index updated)
- [ ] `npx tsc --noEmit` and `npx eslint . --quiet` clean
- [ ] Affected unit + playthrough tests pass
- [ ] No new pack imports into `src/engine/**`
- [ ] No new `definition.id ===` branches in shared UI
- [ ] Split script still produces three green trees (or note follow-up)

---

## Anti-patterns

| Avoid | Prefer |
|---|---|
| Growing `PackTool` / `AdventureProvider` past ~1k LOC again | Extract panel / hook (`PackMetaBar`, feature panels) |
| Copy-paste toast `catch` blocks in Studio | `toastOk` / `toastFail` / `toastError` from `toastError.ts` |
| Hardcoded `/studio?tab=…` or `/recipes` strings | `studioTabHref` / `recipesGalleryHref` / `recipeHref` |
| Local `assertSafePackUrl` in a page | `security.assertSafePackUrl` |
| `@/assets/bedroom.jpg` from a pack | Pack-local `./assets/…` |
| Engine tests importing a full title | Inline stub or attic/template |
| Title UI imports in shared shell | `shell.*` loaders on the pack → pack `ui/` |
| `@/types/game` / `dialogueHelpers` | Import from `@/engine` |
| Sync localStorage-only draft for large packs | `packDraftIdb` async API |

---

## Related docs

- [`PACKS.md`](../src/engine/PACKS.md) — authoring packs
- [`ENGINE.md`](../src/engine/ENGINE.md) — runtime map
- [`STUDIO.md`](./STUDIO.md) — P.I.C.K. tools
- [`PRODUCTS.md`](./PRODUCTS.md) — product config
