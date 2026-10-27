/**
 * @portable-adventure/engine — publish scaffold stub.
 *
 * The real runtime still lives at monorepo `src/engine/`. This entry exists so
 * `npm pack` produces a valid tarball (README + package.json + index) without
 * shipping a broken deep re-export of `../../../src/engine`.
 *
 * In-monorepo consumers: keep importing from `@/engine`.
 * See docs/ENGINE-PACKAGE.md.
 */

throw new Error(
  "@portable-adventure/engine is not published yet — use the monorepo path (@/engine → src/engine) until extract + publish. See docs/ENGINE-PACKAGE.md"
);
