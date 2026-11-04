# External sources, step 3: `store: "reference"` and `resolveSources`

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (or subagent-driven-development). Steps use checkbox syntax.

**Goal:** A host can mark an `external` field `store: "reference"`: the page then holds only `{ id, label }`, the editor's canvas shows the item's `data` read from the source (never written into the page), and the host fills `data` where it draws the page with `resolveSources`.

**Architecture:** Core gets the field option, `fillItemData` (put an item's data into a copy of a page) and `resolveSources` (load every item of a page and fill them, built on the loader of step 2). The editor keeps using the answers of the check of step 2 as its cache: the canvas draws a copy of the page filled from them for reference fields; the banner and Update ignore reference fields (nothing of them is stored).

**Tech Stack:** TypeScript, React, Vitest, Playwright (`E2E_STRICT=1`), biome (`pnpm exec biome check --write .`, never `--unsafe`).

**Spec:** `docs/superpowers/specs/2026-11-03-external-sources-design.md` ("How it is stored: the host chooses per field", decisions 3, 7). Steps 1-2 are merged.

## Global Constraints

- `store` is `"snapshot"` (default) or `"reference"`. Anything else makes the registry invalid (`validateRegistry` reports the field).
- A reference value is exactly `{ id, label }`: no `data`, no `at`. `pickValue(item, now, store)` with `"reference"` returns that even when the item has `data`.
- `<Render>` stays pure: it never calls the network. A page with `{ id, label }` and no `data` draws with `data` missing.
- The page, history and `onChange` never receive `data` of a reference field; only the drawn copy does.
- `resolveSources` never throws for a source: it returns `{ page, failed }` where `failed` lists `{ nodeId, source, id }` of items it could not load (a missing key, a rejected or slow call, a gone item stays as it was and is listed too). It leaves `data` missing for them.
- Banner/Update/`refreshSources` and the "could not check / gone" notes apply to snapshot fields only; for a reference field the notes still show (gone, could not load).
- A reference field whose source has neither `get` nor `getMany` shows a note in its panel (`field.noLoad`) and the block is drawn with `data` missing; never hidden.
- Both locales for every string. Commit by small feature; no AI mention, no trailers; never push. After core changes run `pnpm build` before editor tests.
- Branch `feat/external-sources-3` (created from main).

## Review Focus

- Switching a field from snapshot to reference leaves old `data` in stored pages: it is ignored for drawing (overwritten) and the banner no longer counts it; switching back shows the banner (missing data counts as changed).
- A reference pick never writes `data`/`at`, even for an item that has `data`; Undo of the pick works.
- `resolveSources` for two blocks of one id loads it once; a failed source leaves the other sources filled; items inside `array`/`object` and in `phoneProps` are filled.
- Drawing the canvas copy never changes the page object (identity) when there is nothing to fill, so memoised parts do not redraw.
- No call to the host when the page has no `external` field.

---

### Task 0: Raise the size budget

- [ ] Edit `budgets.json`: editor raw 370000 → 385000, gzip 96000 → 100000 (the owner chose features first, size later). `pnpm size` passes. Commit `chore: raise the editor size budget for references`.

### Task 1: The field option and what a pick stores

**Files:** `packages/core/src/registry/types.ts`, `validate-registry.ts`, `pick-value.ts`, `external-refs.ts` (+ tests `array-object.test.ts` registry cases, `pick-value.test.ts`, `external-refs.test.ts`).
**Interfaces:** `Field` external variant gains `store?: "snapshot" | "reference"`; `ExternalRef` gains `store: "snapshot" | "reference"`; `pickValue(item: ExternalItem, now: Date, store?: "snapshot" | "reference"): JsonValue | null`.
- [ ] Tests: registry with `store: "reference"` and `"snapshot"` valid, `"live"` or `3` gives a `field` issue; `pickValue(item with data, now, "reference")` equals `{ id, label }` with two keys; `externalRefs` reports `store` (default `"snapshot"`). RED, implement, GREEN. Commit `feat(core): let an external field store a reference to its item`.

### Task 2: Fill data into a page, and `resolveSources`

**Files:** create `packages/core/src/registry/fill-item-data.ts` and `resolve-sources.ts` (+ tests); move the grouping loop of the editor's `checkPage` into core as `loadPageItems`; export from `index.ts`.
**Interfaces:**
```ts
export function loadPageItems(page: PageData, registry: Registry, sources: Readonly<Record<string, ExternalSource>> | undefined, signal: AbortSignal, ctx: SourceContext, include?: (ref: ExternalRef) => boolean): Promise<ReadonlyMap<string, Answer>>   // key `${source}\u0000${id}`; asks each source once with `loadItems`; skips sources without get/getMany
export const answerKey: (source: string, id: string) => string
export function fillItemData(page: PageData, registry: Registry, itemOf: (ref: ExternalRef) => ExternalItem | undefined, only?: "reference"): PageData   // the very page when nothing is filled
export function resolveSources(page: PageData, registry: Registry, sources: Readonly<Record<string, ExternalSource>> | undefined, options?: { signal?: AbortSignal; metadata?: JsonValue }): Promise<{ page: PageData; failed: { nodeId: string; source: string; id: string }[] }>
```
`fillItemData` writes `{ id, label: item.label, data: <copy that fits the page, via pickValue> }` (no `at`) for each ref the callback answers; an item whose data does not fit is skipped; `only: "reference"` limits it to reference fields. `resolveSources` fills every external ref (both modes) from `loadPageItems`.
- [ ] Tests: fill leaves the very page for no answers; fills nested/`phoneProps`; `only` skips snapshot refs; `resolveSources` loads equal ids once (count `getMany` calls), fills both blocks, lists a gone item and a rejected source in `failed` while the other source is filled, never throws, makes no call for a page without external fields. RED, implement, GREEN. Move `answerKey`/`checkPage` users in the editor to the core versions (editor `checkPage` becomes `loadPageItems` with the canEdit filter as `include`). Commit `feat(core): fill the data of stored items into a page, and resolveSources`.

### Task 3: The editor draws references, and picks them

**Files:** `packages/editor/src/external-field.tsx`, `nested-fields.tsx`, `PropFields.tsx` (pass `store`), `canvas/CanvasView.tsx` (the `shown` page), `store/sources.ts` (report skips reference refs; `seedSourceAnswer`), i18n both locales, tests.
**Interfaces:** `ExternalField` gets `store: "snapshot" | "reference"` and `canLoad: boolean`; on pick it stores `pickValue(item, new Date(), store)` and calls `answers.seedSourceAnswer(source, item)` (puts `{ status: "found", item }` under the key); `sourceReport` leaves out refs whose `store` is `"reference"` for `changed`; the `shown` page of the canvas is `fillItemData(page, registry, (ref) => foundItem(answers, ref), "reference")` (memoised on page, answers, registry). `ExternalNote` is shown for reference too; a new `<p role="note">` with `field.noLoad` ("This source cannot load items, so the block shows no data.") when `store === "reference"` and the source has no `get`/`getMany`.
- [ ] Tests: report ignores a reference ref with an answer; picking with `"reference"` returns `{ id, label }`; canvas copy is the same object with no reference fields and has `data` for a reference field with an answer while the page object still has none; note texts. RED, implement, GREEN. Commit `feat(editor): draw the data of a reference from its source and store only the id`.

### Task 4: Playground, e2e, docs

**Files:** `apps/playground/src/kinds.tsx` (kind `LiveItem`, label "Live item", field `store: "reference"`, source `items`), `Preview.tsx` (run `resolveSources` before `<Render>`), `e2e/external-field.spec.ts`, `packages/editor/README.md`, `packages/core/README.md`, `docs/PLAYGROUND.md`.
- [ ] e2e (`E2E_STRICT=1`): add "Live item", pick "Coffee beans": canvas shows 199; the stored page holds `"item":{"id":"beans","label":"Coffee beans"}` and no `"data"`; open `/?items-changed` (stored page kept): canvas shows 249 with no banner and nothing written; open `/?preview&items-changed`: the preview shows 249 (resolved at view time).
- [ ] Docs: `store`, what is stored, `resolveSources` and its `{ page, failed }`, that `<Render>` calls nothing, how to switch modes. Full checks (biome, typecheck, build, size, vitest, `E2E_STRICT=1 playwright`). Commit `feat(playground): a live item that is a reference, resolved in the preview` and `docs: describe references and resolveSources`.

## Done when

All checks pass and the owner has seen a Live item change in the canvas and the preview without the page being edited. Merging is the owner's call.
