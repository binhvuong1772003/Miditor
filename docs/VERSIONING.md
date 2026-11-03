# Versioning

The three packages (`@miditor/core`, `@miditor/render`, `@miditor/editor`) are at `0.0.0` and not published.
These are the rules for when they are.

## What is stable and what is not

- A member of the public surface is **experimental** unless its comment says `@stable`. Experimental means it may
  change or go away in any release, with a note in the changelog.
- `@stable` members change only in a major version, after one minor version in which the old way still works
  and warns once.
- The public surface is what `packages/editor/src/index.ts` exports, and the types they reach. The files
  `packages/editor/src/__snapshots__/*.snap` hold it as text: a change to the surface shows as a change to a
  snapshot, and a reviewer must approve it.
- `docs/reference.md` lists the names a host can use (places, hidable parts, permissions, commands). It is
  written by a test from the code, so it cannot be out of date.

## Saved pages

- A page carries `schemaVersion`. A change that old pages cannot read gets a migration (`migratePage`) and a
  new version number in the same change. A page of a newer version is refused with a clear error, never
  half-read.
- Adding an optional field to a block, or a new kind of field, is not a change of the page shape.

## Plugins

- A plugin may say `apiVersion`. The editor leaves out (with one warning) a plugin that needs a newer one than
  it has. `PLUGIN_API_VERSION` goes up only when a plugin written for the old one could break.

## Phasing a member out

1. Mark it `@deprecated` with what to use instead, and warn once at run time.
2. Keep it for at least one minor version.
3. Remove it in the next major version (or any release while it is `0.x`), and say so in the changelog.

## Checks that keep these rules

- `pnpm test` fails when the surface snapshots or `docs/reference.md` are out of date.
- `pnpm size` fails when a bundle grows past `budgets.json`; `pnpm perf` fails when a part commits more often
  than `e2e/render-budget.json` allows. Raising a budget is a change in a pull request, with the reason.
