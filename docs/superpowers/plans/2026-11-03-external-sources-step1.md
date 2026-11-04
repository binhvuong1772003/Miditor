# External sources, step 1: `data` in the stored value, `metadata`, and a richer pick list

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A person picks an item from the host's list with a preview, and the page stores the item's `data` (a snapshot) so a block can show it; the host's `search` receives `metadata`.

**Architecture:** The stored value of an `external` field grows from `{ id, label }` to `{ id, label, data?, at? }` (core validation, 8 kB limit on `data`). In the editor, `ExternalItem` gets `data`, `hint`, `image`; a pure `pickValue` builds what is stored; `search` gets a third argument `{ metadata }` supplied by wrapping the sources once in the editor. No check, banner, `get`/`getMany` or `reference` yet (steps 2-4).

**Tech Stack:** TypeScript, React, Vitest (SSR `renderToString`), Playwright e2e (`E2E_STRICT=1`), biome (`pnpm exec biome check --write .`, never `--unsafe`).

**Spec:** `docs/superpowers/specs/2026-11-03-external-sources-design.md` (read its section "Decided after the builder check").

## Global Constraints

- Stored value keys are only `id`, `label` (strings), `data` (any JSON), `at` (ISO date string). Any other key is a `"type"` issue. `{ id, label }` alone stays valid; `null` stays valid.
- `data` is at most **8000 bytes** of `JSON.stringify(data)` measured as UTF-8 (`new TextEncoder().encode(...).length`); more is a `"range"` issue.
- Editor bundle budget is raised in `budgets.json` only if `pnpm size` fails, in its own commit `chore: raise the editor size budget` with the new numbers in the message. No code-splitting.
- The editor has two locales: add every new string to `packages/editor/src/i18n/en.ts` and `packages/editor/src/locales/vi.ts`.
- Commit by small feature, imperative conventional messages (`feat:`, `test:`, `docs:`, `chore:`), no mention of AI, no trailers. Never push.
- After core changes, rebuild core (`pnpm build`) before running editor tests.
- Branch: create `feat/external-sources-1` from `main` after merging `docs/external-sources-design` (ask the owner if main has moved).

## Review Focus

- `data` of exactly 8000 bytes is accepted, 8001 refused; a multi-byte character counts as its UTF-8 bytes, not as 1.
- A host item whose `data` is not plain JSON (an `undefined` inside, a function, a `Date`, a cycle) is refused at pick, never stored and never thrown.
- A page stored before this change (`{ id, label }`) validates and opens unchanged; a stored value with an unknown key is a `"type"` issue.
- `search` of a host that takes only two parameters still works, and `metadata` being `undefined` passes `{ metadata: undefined }`.
- Picking an item with no `data` stores `{ id, label }` exactly (no `data`, no `at` keys), so old and new hosts produce the same page.

---

### Task 1: Stored value accepts `data` and `at`

**Files:**
- Modify: `packages/core/src/registry/types.ts` (export `MAX_EXTERNAL_DATA = 8000`), `packages/core/src/registry/validate-props.ts` (the `"external"` case), `packages/core/src/index.ts` (export the constant)
- Test: `packages/core/src/registry/array-object.test.ts` (the `describe("an external field")` block)

**Interfaces:**
- Produces: `MAX_EXTERNAL_DATA: number` exported from `@miditor/core`; `validateValue(field, value)` accepts `{ id, label, data?, at? }`.

- [ ] **Step 1: Write the failing tests** in the existing `describe("an external field")`:
  - accepts `{ id: "p1", label: "Home", data: { price: 9 }, at: "2026-11-03T10:00:00.000Z" }`;
  - accepts `data: null` and `data` as a string, array and number;
  - `it.each` rejects with `"type"`: `{ id: "p1", label: "Home", extra: 1 }`, `{ id: "p1", label: "Home", at: 5 }`, `{ id: 1, label: "Home" }`;
  - `data` of `"x".repeat(7998)` (JSON length 8000) is accepted, `"x".repeat(7999)` gives `"range"`; `"é".repeat(4000)` (UTF-8 8000 bytes + 2 quotes) gives `"range"`.
- [ ] **Step 2: Run** `pnpm exec vitest run packages/core/src/registry/array-object.test.ts` — expect the new cases FAIL.
- [ ] **Step 3: Implement** the `"external"` case: `null` ok; else a plain object whose keys are a subset of `id|label|data|at`, `id` and `label` strings, `at` (if present) a string, then `data` (if present) measured with `TextEncoder`; over `MAX_EXTERNAL_DATA` returns `"range"`. Any other shape returns `"type"`.
- [ ] **Step 4: Run** the same command — PASS; then `pnpm exec vitest run packages/core` — all PASS.
- [ ] **Step 5: Commit** `feat(core): let an external value carry data and the time it was taken`

### Task 2: `ExternalItem` fields, `pickValue`, and the richer list

**Files:**
- Modify: `packages/editor/src/external-field.tsx`, `packages/editor/src/index.ts` (export `pickValue` is NOT public: keep it internal; export only the widened types), `packages/editor/src/i18n/en.ts`, `packages/editor/src/locales/vi.ts`
- Test: `packages/editor/src/external-field.test.tsx`

**Interfaces:**
- Consumes: `MAX_EXTERNAL_DATA` from `@miditor/core`.
- Produces in `external-field.tsx`:
  - `interface ExternalItem { id: string; label: string; data?: JsonValue; hint?: string; image?: string }` (`hint` and `image` are for the list only and are never stored);
  - `export function pickValue(item: ExternalItem, now: Date): JsonValue | null` — returns `{ id, label }` when the item has no `data`; `{ id, label, data, at: now.toISOString() }` when it has; `null` when `data` is not plain JSON (check with a `JSON.stringify` round trip that equals a deep copy, catching throws) or exceeds `MAX_EXTERNAL_DATA` bytes.

- [ ] **Step 1: Write failing tests** for `pickValue` (no data → exact `{ id, label }` with `Object.keys` length 2; with data → has `data` and `at` equal to the given date's ISO; `data: { a: undefined }` → `null`; a function inside → `null`; a cycle → `null`; 8000 bytes ok, 8001 → `null`), and for the list: `draw` an open panel is not reachable by SSR, so test a new small exported `ItemRow({ item })` component: it renders the label, the `hint` text when given, and an `<img alt="" src=...>` when `image` is given and nothing for either when absent.
- [ ] **Step 2: Run** `pnpm exec vitest run packages/editor/src/external-field.test.tsx` — FAIL.
- [ ] **Step 3: Implement** `pickValue` and `ItemRow`; in the list, each button renders `ItemRow`; its `onClick` calls `pickValue(item, new Date())`: on `null` it keeps the panel open and sets a `tooBig` state that shows `<p role="alert">{t("field.tooBig", { label: item.label })}</p>`; otherwise `onChange(value)` and close as now. Add `"field.tooBig"` to both locales (en: `“{label}” has too much data to be kept in the page.`; vi: translate).
- [ ] **Step 4: Run** the test file — PASS; run `pnpm exec vitest run packages/editor` — PASS.
- [ ] **Step 5: Commit** `feat(editor): store an item's data when it is picked, and show a hint and a picture in the list`

### Task 3: `metadata` reaches `search`

**Files:**
- Modify: `packages/editor/src/external-field.tsx` (the `ExternalSource` type), `packages/editor/src/Editor.tsx` (new prop `metadata?: JsonValue`, wrapping of `config.sources`, docs comment), `packages/editor/src/index.ts` (export `SourceContext`)
- Test: `packages/editor/src/external-field.test.tsx` or a new `packages/editor/src/source-context.test.ts`

**Interfaces:**
- Produces: `interface SourceContext { metadata: JsonValue | undefined }`; `ExternalSource.search(query: string, signal: AbortSignal, ctx: SourceContext): Promise<readonly ExternalItem[]>`; exported pure helper `withMetadata(sources: Readonly<Record<string, ExternalSource>> | undefined, metadata: JsonValue | undefined): Readonly<Record<string, ExternalSource>> | undefined` that returns sources whose `search` calls the original with `(query, signal, { metadata })`.
- `<Editor metadata={...}>`: the sources that reach the properties panel are `withMetadata(<merged config.sources>, metadata)`, memoised on `[sources, metadata]`.

- [ ] **Step 1: Write failing tests** for `withMetadata`: the wrapped `search` passes `{ metadata }` as third argument; `undefined` sources return `undefined`; a source given only two parameters still returns its items; `Object.hasOwn(result, name)` is true only for names in the input (the field relies on `Object.hasOwn`).
- [ ] **Step 2: Run** the test — FAIL.
- [ ] **Step 3: Implement** the type, `withMetadata`, the `metadata` prop (with a doc comment saying it is not stored in the page), and use it where `sources` is read from the merged config in `Editor.tsx` (find it with `grep -n "sources" packages/editor/src/Editor.tsx`).
- [ ] **Step 4: Run** `pnpm exec vitest run packages/editor` and `pnpm exec tsc -b` (or the repo's typecheck script) — PASS.
- [ ] **Step 5: Commit** `feat(editor): pass the host's metadata to the search of a source`

### Task 4: Playground demo, e2e and docs

**Files:**
- Modify: `apps/playground/src/kinds.tsx` (kind `Product` + renderer), `apps/playground/src/App.tsx` (add `products` to `sources`, pass `metadata={{ currency: "VND" }}`), create `apps/playground/src/products-source.ts` (modelled on `pages-source.ts`), `e2e/external-field.spec.ts`, `packages/editor/README.md` (section on `external`, near line 972), `docs/PLAYGROUND.md`
- Test: `e2e/external-field.spec.ts`

**Interfaces:**
- Consumes: `ExternalSource`, `ExternalItem`, `pickValue` behaviour from Tasks 1-3.
- Produces: kind `Product` with `fields: { product: { type: "external", label: "Product", source: "products" } }`, `defaultProps: { product: null }`; its renderer shows `props.product.data.title` and `.price` (a `data-testid="product-card"` element) and "none" when empty. `productsSource.search` answers items `{ id, label, hint: "<price>", data: { title, price } }` from five fixed products, after a short delay, and one product whose `data` is larger than 8000 bytes to try the refusal.

- [ ] **Step 1: Write the failing e2e** (`E2E_STRICT=1`): add the "Product" block, pick "Coffee beans" from the list, expect the card to show its title and price, expect the stored page (the way `e2e/on-change.spec.ts` or the sent-data dialog reads it) to hold `data` and `at`; pick the oversized product and expect the alert "has too much data" with the previous value unchanged; Undo brings the earlier value back; the previous `Related page` test still passes.
- [ ] **Step 2: Run** `pnpm exec playwright test e2e/external-field.spec.ts` (see the repo's e2e script for the config) — FAIL.
- [ ] **Step 3: Implement** the kind, source, wiring and the docs (README: the new stored shape, `data`/`hint`/`image`, the 8 kB limit, `metadata`, and a sentence that checks and refresh come in later steps).
- [ ] **Step 4: Run the full checks:** `pnpm exec biome check --write .`, typecheck, `pnpm build`, `pnpm size`, `pnpm exec vitest run`, the e2e suite with `E2E_STRICT=1`. If `pnpm size` fails, raise `budgets.json` for `packages/editor/dist/index.mjs` by the least round number that passes, as its own commit `chore: raise the editor size budget`, with old and new numbers in the message.
- [ ] **Step 5: Commit** `feat(playground): a product kind that shows the data of the item picked` and `docs(editor): describe the data of an external value and metadata`

## Done when

All checks above pass, the playground shows a picked product's title and price in the canvas, and the owner has looked at it in the browser. Merging is the owner's call.
