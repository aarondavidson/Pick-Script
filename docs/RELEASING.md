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
   npm run test:e2e
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
7. **Merge to `main`** through a pull request with green CI.
8. **Publish:** on GitHub open **Actions → Release → Run workflow** and run it
   on `main`. That is the whole step. The workflow
   ([`release.yml`](../.github/workflows/release.yml)):
   - re-runs every check and refuses to continue if any fails
   - refuses if `vX.Y.Z` has already been released
   - creates the tag `vX.Y.Z` on that commit
   - publishes a **GitHub Release** whose notes are this version's
     `CHANGELOG.md` section, marked as *Latest*
   - attaches `pick-script-web-X.Y.Z.zip` (the built player + Studio, ready
     for any static host), `portable-adventure-engine-X.Y.Z.tgz` (the
     installable package) and `SHA256SUMS.txt`
   - publishes the package to npm as well **if** the repository has an
     `NPM_TOKEN` secret (Settings → Secrets and variables → Actions) with
     publish rights to the `@portable-adventure` scope; otherwise it skips
     that step and the `.tgz` on the release is the way to install

   Prefer tagging by hand? Pushing an annotated tag starts the same workflow:
   ```bash
   git tag -a v0.3.0 -m "Pick-Script 0.3.0"
   ```
   ```bash
   git push origin v0.3.0
   ```
9. **Check the result:** the [Releases page](https://github.com/aarondavidson/Pick-Script/releases)
   shows the new version as *Latest* with its notes and files.

## How people get a release

| They want | They use |
|---|---|
| To see what changed | The [Releases page](https://github.com/aarondavidson/Pick-Script/releases) — or **Watch → Custom → Releases** to be notified |
| The source at a tested point | The tag (`git checkout v0.3.0`) or the *Source code* archive on the release |
| The engine in their own app | `npm install` the `portable-adventure-engine-X.Y.Z.tgz` URL from the release — [`ENGINE-PACKAGE.md`](./ENGINE-PACKAGE.md) |
| A ready-to-host build | `pick-script-web-X.Y.Z.zip` on the release — unzip onto any static host |
| To update a game built on the engine | [`UPGRADING.md`](./UPGRADING.md) |

## GitHub rules of the road

- **`main` is always releasable.** Changes arrive by pull request with green
  CI. Recommended repository setting: *Settings → Branches → protect `main`*
  (require a pull request and the "Typecheck & test" check).
- **Tags are permanent.** Never move or delete a published `vX.Y.Z` tag —
  people pin to it. A bad release is fixed by a new patch release.
  Recommended setting: *Settings → Tags → protect `v*`*.
- **One naming scheme:** tags are `vMAJOR.MINOR.PATCH`, release titles are
  `Pick-Script MAJOR.MINOR.PATCH`. Do not create releases by hand in the
  GitHub UI — the workflow keeps the tag, version, notes and files in step.
- **Releases before this scheme:**
  - **0.1.0** is the pre-release tagged `Beta` ("v0.1.0 (first public beta)").
    The repository history was rewritten on 2026-10-27 to drop content that
    should not have been public; `Beta` now points at the rewritten first
    commit, "Initial public release". A clone made before that date shares no
    history with `main` — clone again.
  - **0.2.0** (commit `4a760f8`) was released before the Release workflow
    existed, so it has no `v0.2.0` tag or GitHub Release. Releases from
    **0.3.0** on follow this scheme.

## Patch releases for an older line

If a fix is needed for people who cannot take the newest minor yet, branch from
the old tag (`git switch -c release/0.4 v0.4.0`), cherry-pick the fix, and
release `0.4.1` from that branch with the same checklist.

## The package

`@portable-adventure/engine` is built by `npm run pack:engine` and attached to
each release ([`ENGINE-PACKAGE.md`](./ENGINE-PACKAGE.md)). Its version always
equals the engine version (`npm run check:release`). Its public API is whatever
`packages/engine/src/index.ts` exports — the compatibility rules above apply.
