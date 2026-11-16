# Releasing the engine

Maintainer checklist for cutting a version of Pick-Script. Game authors
upgrading to a release: see [`UPGRADING.md`](./UPGRADING.md).

The engine is distributed openly and other games copy `src/engine/` into their
own repos, so a release is a promise: **a tag is a tested, documented point
that is safe to copy.** `main` between tags is not.

## Versioning policy

[Semantic versioning](https://semver.org), one number for the whole repo.

| Bump | When | Examples |
|---|---|---|
| **Patch** | Fixes only; no pack, save or API change needed by anyone | Wrong message, crash, stale save picked on load |
| **Minor** | New optional features; new exports; new optional pack fields | New modality, new `GameDefinition` field |
| **Major** | Something a game author must change | Removed export, required field, raised `JSON_PACK_MIN_SCHEMA_VERSION` |

While the version is `0.x`, a minor release may change behaviour, but only with
an entry under **Upgrade notes** in the changelog and in `UPGRADING.md`.

The version is written in four places that must agree —
`npm run check:release` (part of `npm run verify` and CI) fails if they do not:

- `package.json` and `package-lock.json`
- `packages/engine/package.json`
- `ENGINE_VERSION` in `src/engine/version.ts`

## Compatibility rules

These are what make updates safe for people who are not watching the repo.

### Public API

The contract is the exports of `src/engine/index.ts` and `src/engine/script`.

- Add freely. New fields on `GameDefinition` and pack types must be optional.
- To remove or rename: keep the old export, mark it `@deprecated` naming the
  replacement, list it under **Deprecated** in the changelog, and remove it no
  sooner than the next minor release (next major once the engine is `1.x`).
- Never change what an existing export does without an **Upgrade notes** entry.

### Saves

- Only **add** fields to `GameState` / `SaveSlot`. Give every new field a
  default in `normalizeLoadedState` (`state.ts`) so older saves load.
- Never rename storage keys (`adventure_<id>_save_<n>`, `adventure_<id>_autosave`)
  or the IndexedDB database without a copy-forward step.
- New envelope shapes get a new `format` string; keep reading the old one.
- A save that cannot be loaded is marked `incompatible` — never deleted, never
  returned as "empty".
- Add a test in `saveUpdates.test.ts` with a fixture of the old shape.

### `.pack.json` schema

- New optional fields do **not** bump `schemaVersion`.
- Bump `JSON_PACK_SCHEMA_VERSION` only when an existing field changes meaning
  or shape. In the same change, add the upgrade step to `JSON_PACK_MIGRATIONS`
  (`jsonPackCompile.ts`), keyed by the version it upgrades from. A test fails
  if a supported older version has no migration.
- Raise `JSON_PACK_MIN_SCHEMA_VERSION` (dropping support for old files) only in
  a major release.
- Update [`JSON-PACK-SCHEMA.md`](./JSON-PACK-SCHEMA.md).

### New features packs can depend on

Mention the release in the feature's docs ("since 0.3.0") so authors know what
to put in `minEngineVersion`.

## Every change (pull request)

- Add a line under `## Unreleased` in `CHANGELOG.md`, in the right group:
  **Upgrade notes**, **Added**, **Changed**, **Fixed**, **Deprecated**,
  **Removed**, **Security**.
- Update the docs for anything an author can see or use
  (`PACKS.md`, `ENGINE.md`, `SHELL.md`, `ASSETS.md`, `JSON-PACK-SCHEMA.md`).
- Add or extend a test next to the code.

## Cutting a release

1. **Decide the number** from what is under `## Unreleased` (table above).
2. **Bump every copy of the version:**
   ```bash
   npm version 0.3.0 --no-git-tag-version
   ```
   ```bash
   npm version 0.3.0 --no-git-tag-version --prefix packages/engine
   ```
   Then edit `ENGINE_VERSION` in `src/engine/version.ts` to match.
3. **Changelog:** rename `## Unreleased` to `## 0.3.0 — YYYY-MM-DD` and add a
   fresh, empty `## Unreleased` above it. Make sure **Upgrade notes** says, for
   each behaviour change, whether authors need to act.
4. **`UPGRADING.md`:** add a `0.2.x → 0.3.0` section under *Version notes*.
5. **QA — all must pass:**
   ```bash
   npm ci
   ```
   ```bash
   npm run verify
   ```
   ```bash
   npm run lint
   ```
   ```bash
   npm run check:cli
   ```
   ```bash
   npm run pack:engine
   ```
   ```bash
   npm run build
   ```
   ```bash
   npm audit --omit=dev
   ```
6. **Manual smoke** (`npm run dev`):
   - Play Attic Study and Harbor Fog to their endings.
   - Load a save exported from the **previous** release (keep one backup JSON
     per release for this) — it must load and continue.
   - Studio: create a pack from a template, playtest, download the `.pack.json`,
     import it again on the launcher.
7. **Merge to `main`**, then tag the merge commit and push the tag:
   ```bash
   git tag -a v0.3.0 -m "Pick-Script 0.3.0"
   ```
   ```bash
   git push origin v0.3.0
   ```
   CI runs on the tag and fails if the tag does not match the version.
8. **GitHub release:** create it from the tag and paste the changelog section.

## Patch releases for an older line

If a fix is needed for people who cannot take the newest minor yet, branch from
the old tag (`git switch -c release/0.2 v0.2.0`), cherry-pick the fix, and
release `0.2.1` from that branch with the same checklist.

## Not yet published to npm

`@portable-adventure/engine` is still a scaffold
([`ENGINE-PACKAGE.md`](./ENGINE-PACKAGE.md)). Its version is kept in step so the
first published version matches the engine it contains.
