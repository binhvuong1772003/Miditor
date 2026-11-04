# External sources, step 2: check on open, "Update" banner, `get`/`getMany`

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (or subagent-driven-development). Steps use checkbox (`- [ ]`) syntax.

**Goal:** When a page opens, the editor checks the items stored in `external` fields against the host's source (one `getMany` call, or `get` in parallel), says "N blocks have newer data. Update" without changing anything, and one press of Update refreshes them in one undo step.

**Architecture:** Pure code in `@miditor/core` (find the stored items of a page, ask a source for ids with merging, chunking, limits and timeout, judge an answer against what is stored, apply answers). The editor keeps the last answers in its store, derives the banner by comparing them with the page as it is now, and adds a command `refreshSources`. The source types move to core; the editor re-exports them.

**Tech Stack:** TypeScript, React, Vitest, Playwright (`E2E_STRICT=1`), biome (`pnpm exec biome check --write .`, never `--unsafe`).

**Spec:** `docs/superpowers/specs/2026-11-03-external-sources-design.md` (its sections "What the person and the host get", "Decided after the builder check" items 2, 3, 4, 5, 6). Step 1 is merged: `data`, `at`, `pickValue`, `metadata`.

## Global Constraints

- Nothing changes in the page until the person presses Update: no `onChange`, no history step from a check.
- Compare `{ label, data }` by deep JSON equality; `at` is left out. Missing stored `data` counts as changed.
- `getMany`: a key present with `null` is "gone"; a key missing from the answer is "could not check"; chunks of 100; chunks that answered count even if another failed; 15 s timeout per call; no retry; equal ids are asked once; `get` calls run at most 5 at a time.
- A source with neither `get` nor `getMany` is not checked and shows no note. A source with no entry in `config.sources` is not checked.
- Only `external` fields of blocks the person may edit (`permissions.canEdit`) and that are not hidden are checked and updated. Fields inside `array` and `object` values count.
- A "gone" item keeps what it had; Update never touches it. A failed check never empties anything.
- `signal` aborts on a new check and on unmount.
- Strings in both locales (`i18n/en.ts` and `locales/vi.ts`). Commit by small feature; no AI mention, no trailers; never push. After core changes run `pnpm build` before editor tests. Raise `budgets.json` only if `pnpm size` fails, in its own commit.
- Branch `feat/external-sources-2` (already created from main).

## Review Focus

- Two blocks pointing at the same id cause one request; 250 ids with `getMany` cause 3 calls; one failing chunk does not discard the others.
- A late answer for an item the person has since changed or cleared never overwrites it (the banner is derived from the page as it is now).
- A host with only `get`: never more than 5 in flight; a `get` that rejects or times out is "could not check", not "gone".
- Update is one undo step and one `onChange`; undo brings back the old data and the banner reappears.
- A block the person may not edit, or an unknown source, is neither checked nor updated.

---

### Task 1: Source types move to core, with `get` and `getMany`

**Files:** Create `packages/core/src/registry/external-source.ts`; modify `packages/core/src/index.ts`, `packages/editor/src/external-field.tsx` (import and re-export the types from core instead of declaring them), `packages/editor/src/index.ts`; update `packages/editor/src/__snapshots__/index.ts.snap` with `pnpm exec vitest run packages/editor/src/public-surface.test.ts -u`.

**Interfaces — Produces (in core, exported):**
```ts
export interface ExternalItem {
  id: string;
  label: string;
  data?: JsonValue;
  hint?: string;
  image?: string;
}
export interface SourceContext {
  metadata: JsonValue | undefined;
}
export interface ExternalSource {
  search(query: string, signal: AbortSignal, ctx: SourceContext): Promise<readonly ExternalItem[]>;
  get?(id: string, signal: AbortSignal, ctx: SourceContext): Promise<ExternalItem | null>;
  getMany?(
    ids: readonly string[],
    signal: AbortSignal,
    ctx: SourceContext,
  ): Promise<Readonly<Record<string, ExternalItem | null>>>;
}
```

- [ ] Step 1: Write a type-level test in `packages/core/src/registry/external-source.test.ts` that builds a source with only `search`, one with `search`+`get`, one with all three (so `tsc` and the test fail until the file exists).
- [ ] Step 2: Run `pnpm exec vitest run packages/core/src/registry/external-source.test.ts` — FAIL (module missing).
- [ ] Step 3: Create the file with the types and doc comments (the doc comments move from `external-field.tsx`, adding `get`/`getMany`); export from core `index.ts`; make `external-field.tsx` `import type` and `export type` them from `@miditor/core`.
- [ ] Step 4: `pnpm build`, `pnpm typecheck`, `pnpm exec vitest run packages/core packages/editor` — PASS (refresh the surface snapshot).
- [ ] Step 5: Commit `refactor: move the source types to core and add get and getMany`

### Task 2: Find the stored items of a page, and write answers back

**Files:** Create `packages/core/src/registry/external-refs.ts`, test `external-refs.test.ts`; export from `index.ts`.

**Interfaces — Produces:**
```ts
export interface ExternalRef {
  nodeId: string;
  path: readonly (string | number)[];
  source: string;
  value: { id: string; label: string; data?: JsonValue; at?: string };
}
export function externalRefs(registry: Registry, page: PageData): ExternalRef[];
export function withExternalValues(
  page: PageData,
  changes: readonly { nodeId: string; path: readonly (string | number)[]; value: JsonValue }[],
): PageData;
```
`path` starts with the prop name; nested fields add the array index or object key. Only non-`null` stored values appear. `withExternalValues` returns the same `page` object when `changes` is empty or nothing differs.
- [ ] Step 1: Tests: a block with a plain `external` prop; one inside an `array` of `object`s (path `["items", 1, "page"]`); a `null` value skipped; an unknown kind skipped; a field of another type skipped; `withExternalValues` replaces by path, leaves the rest of the page object-identical (`toBe` on untouched nodes), returns the same page for no change.
- [ ] Step 2: Run — FAIL. Step 3: Implement by walking the tree with the registry's `fields` (follow `array.item` and `object.fields`, depth at most `MAX_FIELD_DEPTH`). Step 4: Run core tests — PASS. Step 5: Commit `feat(core): find the stored items of external fields and write them back`

### Task 3: Ask a source for ids: merging, chunks, limits

**Files:** Create `packages/core/src/registry/load-items.ts`, test `load-items.test.ts`; export.

**Interfaces — Produces:**
```ts
export type Answer =
  | { status: "found"; item: ExternalItem }
  | { status: "gone" }
  | { status: "failed" };
export const GET_MANY_CHUNK = 100;
export const GET_CONCURRENCY = 5;
export const SOURCE_TIMEOUT_MS = 15000;
export function loadItems(
  source: ExternalSource,
  ids: readonly string[],
  signal: AbortSignal,
  ctx: SourceContext,
): Promise<ReadonlyMap<string, Answer>>;
```
`ids` are de-duplicated. With `getMany`: chunks of `GET_MANY_CHUNK`, chunks in parallel; a chunk that rejects or times out marks only its ids `failed`; a key present with `null` is `gone`; a key missing from the answer is `failed`. Else with `get`: at most `GET_CONCURRENCY` in flight; `null` is `gone`; a rejection or timeout is `failed`. With neither: every id `failed`. An aborted `signal` ends the work and the promise rejects with an `AbortError`. Each call gets a signal that aborts on timeout or when `signal` aborts.
- [ ] Step 1: Tests with fake sources and fake timers: duplicates asked once (`get` called once for ids `["a","a","b"]`); 250 ids → `getMany` called 3 times (100,100,50); one chunk rejecting leaves the others `found`; missing key → `failed`; `null` → `gone`; `get`-only never exceeds 5 in flight over 12 ids (track a counter); a `get` that never settles becomes `failed` after `SOURCE_TIMEOUT_MS`; abort rejects.
- [ ] Step 2: Run — FAIL. Step 3: Implement. Step 4: Run core tests — PASS. Step 5: Commit `feat(core): load the items of a source in chunks, merged and limited`

### Task 4: Judge an answer against what is stored

**Files:** Create `packages/core/src/registry/judge-sources.ts`, test `judge-sources.test.ts`; export.

**Interfaces — Produces:**
```ts
export type Verdict = "same" | "changed" | "gone" | "failed";
export function judge(stored: ExternalRef["value"], answer: Answer | undefined): Verdict;
export function updateValue(stored: ExternalRef["value"], item: ExternalItem, now: Date): JsonValue;
```
`judge`: `undefined` or `failed` → `"failed"`; `gone` → `"gone"`; `found`: `"same"` when `label` and `data` are deeply equal and the stored `data` exists whenever the item has `data`; else `"changed"` (stored `data` missing while the item has `data` is `changed`; an item with no `data` and a stored value with no `data` is `same` when labels match). `updateValue` returns what `pickValue` of step 1 returns for the item: it must reuse the same code — move `pickValue`'s body (copy, 8000 bytes, 16 levels, plain JSON) to core as `pickValue(item, now)` and have the editor import it. When `pickValue` would refuse (`null`), `updateValue` returns the stored value unchanged.
- [ ] Step 1: Tests: each verdict; `at` ignored (same data, different `at` → `same`); updateValue writes `label`, `data`, `at`; refusal keeps stored; the editor's existing `pickValue` tests still pass from the new place (move them to core, keep one re-export test in the editor).
- [ ] Step 2: Run — FAIL. Step 3: Implement and move `pickValue`/`copyThatFits` helpers to core (`packages/core/src/registry/pick-value.ts`), editor re-exports. Step 4: `pnpm build`, run core + editor tests — PASS. Step 5: Commit `feat(core): judge a stored item against the source and update it`

### Task 5: The check and the command in the editor

**Files:** Create `packages/editor/src/store/sources.ts`, test `packages/editor/src/store/sources.test.ts`; modify `store/state.ts` (add `SourcesState`), `store/create-editor-store.ts` (initial state), `Editor.tsx` (run the check), `control-api.ts`/`control.ts`/`controller.ts` (`checkSources()`).

**Interfaces:**
- State: `sourceAnswers: ReadonlyMap<string, Answer>` keyed `` `${source}\u0000${id}` ``, and `checking: boolean`.
- Pure: `sourceReport(state: { history, sourceAnswers }, registry, sources: Readonly<Record<string, ExternalSource>> | undefined, permissions): { changed: ExternalRef[]; gone: ExternalRef[]; failed: ExternalRef[] }` — derived from the page now (`state.history.present`) and the stored answers; skips refs whose source is unknown or has neither `get` nor `getMany`, whose node `permissions.canEdit` refuses, or that the editor hides.
- Command (in `sources.ts`, `contentCommands`-style): `refreshSources(): boolean` — one `edit` that applies `updateValue` to every `changed` ref via `withExternalValues`; same page object when nothing changed; one history step.
- `checkSources(): Promise<void>` in the editor body: reads the refs of the current page, groups ids by source, calls `loadItems` for each source with `getMany`/`get` (wrapped with the editor's metadata and an `AbortController` kept in a ref; a new check aborts the old), then stores the answers with `setSourceAnswers`. Runs once when the editor mounts (after the first paint, not blocking it), when `metadata` changes (deep JSON compare), and on `controller.checkSources()`. A rejected `loadItems` (abort) is ignored.
- [ ] Step 1: Tests (store-level, no React): `sourceReport` classifies by verdict; derived from the page as it is now — set answers, then edit the stored value to match → it leaves `changed` (late answer cannot overwrite); skips non-editable node and unknown source; `refreshSources` updates all changed refs in one step and `undo` brings them back and `sourceReport` lists them again; unchanged → same state object, no step; a refused edit (`canEdit` false for a node) leaves that block alone.
- [ ] Step 2: Run — FAIL. Step 3: Implement state, report, command and the check effect; add `checkSources()` to the controller API (`@experimental`). Step 4: `pnpm build`, run editor tests — PASS. Step 5: Commit `feat(editor): check the stored items of a page against their sources and update them on request`

### Task 6: The banner and the notes

**Files:** Create `packages/editor/src/SourcesBanner.tsx` (+ test); modify `Editor.tsx` or `parts.tsx` to place it, `external-field.tsx` (notes for one field), i18n both locales, CSS module for the banner.

**Interfaces:** `SourcesBanner()` reads `sourceReport` from the store; renders nothing when `changed.length === 0`; else `<div role="status">` with the text `sources.newer` (`{count}` blocks have newer data) and a button `sources.update` that calls `refreshSources`. `ExternalField` shows, under its chip, `<p role="note">` with `field.gone` ("No longer in the source: it keeps what it had") when the stored item is in `gone`, and `field.unchecked` ("Could not check this item") when in `failed`; the field gets the report through a small context, so its props do not change.
- [ ] Step 1: Tests: banner renders nothing with no changes; shows count 3 and the button; pressing it calls the command once; the field shows the right note for gone and failed and none for same/changed; strings exist in both locales (the registry test covers the key sets).
- [ ] Step 2: Run — FAIL. Step 3: Implement; place the banner above the canvas, inside the editor, never over the page. Step 4: Run editor tests — PASS. Step 5: Commit `feat(editor): say when stored items have newer data, and let the person update them`

### Task 7: Playground, e2e, docs

**Files:** modify `apps/playground/src/items-source.ts` (add `getMany` and a way to change a price: a module-level `setPrice(id, price)` used by a button or `?items-changed`), `apps/playground/src/App.tsx`, `e2e/external-field.spec.ts`, `packages/editor/README.md`, `docs/PLAYGROUND.md`.

- [ ] Step 1: e2e (`E2E_STRICT=1`): open `/?items-changed` with a stored page holding an Item card with old data (seed with `localStorage` like other specs), expect the banner "1 block has newer data" (plural handled), nothing saved yet (stored page still old), press Update, expect the card to show the new price and the stored page to hold it with a new `at`, Undo brings the old price and the banner back; a second case: an item removed from the source shows the note "No longer in the source" and no banner; a third: `getMany` is called once for two cards with different ids (count requests through a counter the playground exposes on `window`).
- [ ] Step 2: Run — FAIL. Step 3: Implement the playground side and README (`get`, `getMany`, the banner, Update, `controller.checkSources()`, the rules for gone/failed, and that a source without `get`/`getMany` is not checked). Step 4: Full checks: biome, `pnpm typecheck`, `pnpm build`, `pnpm size`, `pnpm exec vitest run`, `E2E_STRICT=1 pnpm exec playwright test`. Step 5: Commit `feat(playground): items that change, and e2e for the update banner` and `docs(editor): describe checking and updating stored items`

## Done when

All checks pass; opening a page with a changed item shows the banner and nothing else changes until Update; the owner has seen it in the browser. Merging is the owner's call.
