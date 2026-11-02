# M1a Control API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A host drives the editor from code inside the editor's tree: `useEditor()` gives commands, `useEditor(selector)` reads state, tiers 1 and 2 of the design.

**Architecture:** The control object (`EditorApi`) is built in `EditorBody` from the same `run`, `save` and add-block code the buttons use, kept stable across renders and given to the parts through a context. Reads come from the store through selectors; `status` and `onSave` presence are mirrored into the store so a selector can read them. Nothing in tier 3 (controller) is built here.

**Tech Stack:** React 19, zustand 5 (inside `store/` only), Vitest + fast-check, Playwright, biome.

**Spec:** `docs/superpowers/specs/2026-11-01-m1-control-api-design.md`

## Global Constraints

- A host that uses nothing new keeps working with no change; no part commits more often than before (`pnpm perf` numbers: add Text 2, type 5 chars 2, drag 15, select none 4, hover block 3, select block 4).
- The buttons, keys, menus and the host call the same code; no second copy of a command, no raw `dispatch`, the store is not handed out.
- `useEditor()` outside an editor throws a clear error.
- `data` in the read side is the page as stored, without a pending draft; `save()` stores a pending draft first.
- `save()` returns `Promise<boolean>`: `true` once `onSave` has settled, `false` when it could not run (no `onSave`, status `saving`, `onSave` threw, editor gone). `addBlock(kind, overrides?)` returns the new block's id or `null`.
- A command called when no editor is attached does nothing, returns `false` (`null` for `addBlock`) and warns once in development.
- Each public member has `@stable` or `@experimental` in its comment. Stable: the read side, `undo`, `redo`, `save`, `select`, `setFrame`.
- The architecture test (`architecture.test.ts`) keeps passing: zustand only in `store/`, `store.setState` only in `store/`, `canvas/` does not import `Editor.tsx`.

## Review Focus

- A host calls a command in its first render or first effect, before the editor has filled the control object: returns `false`/`null`, never throws. (Task 4)
- A host keeps `editor` and calls it after the editor unmounted: same, one warning only. (Task 4)
- A selector that builds a new object each time must not loop or redraw on every store change. (Task 5)
- Two editors on one page: a host button inside one never acts on the other. (Task 5)
- StrictMode mounts twice: the object keeps working and its identity does not change between renders. (Task 5)
- `select` with an id that is not in the page, `addBlock` with an unknown kind: nothing changes, `false`/`null`. (Tasks 1, 4)
- `save()` while the status is `saving`: `false`, like the disabled button. (Task 4)

---

### Task 1: Selection and zoom commands in the table

**Files:**
- Modify: `packages/editor/src/store/commands.ts`
- Modify: `packages/editor/src/store/index.ts` (nothing new to export unless a type is added)
- Test: `packages/editor/src/store/commands.test.ts`

**Interfaces:**
- Produces: `CommandArgs` gains `"selection.select": string`, `"selection.clear": undefined`, `"view.zoomTo": number`; `commandTable` entries for them. `selection.select` selects that block alone with the scope set to its parent (`parentOf(root, id)?.id ?? root.id`); an id not in the page gives the same state. `view.zoomTo` clamps to `MIN_ZOOM..MAX_ZOOM` through the existing `setZoom`.

- [ ] **Step 1: Write failing tests** in `commands.test.ts`: `selection.select selects a block and sets its parent as scope`, `selection.select of an id that is not in the page gives the same state` (`expect(after).toBe(before)`), `selection.clear lets go of the selection and the picks`, `view.zoomTo sets the zoom and clamps outside the ladder` (`zoomTo 99` gives `MAX_ZOOM`), and add the three names to the existing property test "can false ⇒ same state".
- [ ] **Step 2: Run** `pnpm exec vitest run packages/editor/src/store/commands.test.ts`. Expected: FAIL (names unknown).
- [ ] **Step 3: Implement** the three table entries using `selectOnly`, `clearSelection` (from `./selection`) and `setZoom` (from `./view`). `can` for `selection.select`: the node exists; `selection.clear`: `selectedId !== null || picked.length > 0`; `view.zoomTo`: true.
- [ ] **Step 4: Run** the same file, then `pnpm exec tsc --noEmit -p packages/editor` and `pnpm lint`. Expected: PASS, clean.
- [ ] **Step 5: Commit** `feat(editor): select, clear and zoom-to as named commands`.

### Task 2: Host state in the store

**Files:**
- Create: `packages/editor/src/store/host.ts`
- Modify: `packages/editor/src/store/state.ts` (add `HostState` to `EditorState`), `packages/editor/src/store/index.ts`, `packages/editor/src/Editor.tsx` (initial state in `Editor`, sync in `EditorBody`)
- Test: `packages/editor/src/store/host.test.ts`

**Interfaces:**
- Produces: `type HostState = { hostStatus: SaveStatus | undefined; hasSave: boolean }`; `initialHostState(host: HostState): HostState`; `setHost(state: S, host: HostState): S` returning the very same state when both fields are equal. `EditorState` includes `HostState`.

- [ ] **Step 1: Write failing tests**: `setHost with the same values gives the same state`; `setHost with a new status gives a new state with it`.
- [ ] **Step 2: Run** `pnpm exec vitest run packages/editor/src/store/host.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `host.ts` (pure, uses `change`); put the first values in the store when `Editor` makes it; in `EditorBody` an effect calls `setHost` when `status` or `onSave !== undefined` change. Do not use state for anything the render already knows.
- [ ] **Step 4: Run** unit tests, `pnpm e2e`, and `pnpm perf` against the numbers in Global Constraints. Expected: unchanged.
- [ ] **Step 5: Commit** `refactor(editor): the host's status and Save are in the store`.

### Task 3: The read side

**Files:**
- Create: `packages/editor/src/control.ts` (public types and `viewOf`)
- Test: `packages/editor/src/control.test.ts`

**Interfaces:**
- Consumes: `EditorState` (Task 2), `canRun` (existing), `resolveStatus` from `./save-status`.
- Produces:

  ```ts
  export interface EditorView {
    readonly data: PageData;                     // @stable, no pending draft
    readonly selection: { readonly id: string | null; readonly picked: readonly string[] }; // @stable
    readonly frame: "desktop" | "phone";         // @stable
    readonly zoom: number;                       // @experimental
    readonly canUndo: boolean;                   // @stable
    readonly canRedo: boolean;                   // @stable
    readonly status: SaveStatus | undefined;     // @stable
  }
  export function viewOf(state: EditorState): EditorView;
  ```

  `status` is what the header says (`resolveStatus(state.hostStatus, { hasSave: state.hasSave, clean: present === savedPage, waiting })`).

- [ ] **Step 1: Write failing tests**: `viewOf gives the page without the draft`, `canUndo and canRedo follow the history`, `status is saved when the page is the saved one` and `unsaved after a change`, `selection reads the selected block and the picks`.
- [ ] **Step 2: Run** `pnpm exec vitest run packages/editor/src/control.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `viewOf` in `control.ts` with `EditorView`; no React in this file.
- [ ] **Step 4: Run** the file and `tsc`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(editor): the read side of the control API`.

### Task 4: The control object

**Files:**
- Modify: `packages/editor/src/control.ts` (add `EditorApi`, `createApi`)
- Modify: `packages/editor/src/Editor.tsx` (build it in `EditorBody`)
- Test: `packages/editor/src/control.test.ts`

**Interfaces:**
- Consumes: `Run` (existing), `viewOf`, `CommandName`.
- Produces:

  ```ts
  export interface EditorApi {
    undo(): boolean; redo(): boolean;            // @stable
    save(): Promise<boolean>;                    // @stable
    select(id: string): boolean;                 // @stable
    clearSelection(): boolean;
    setFrame(frame: "desktop" | "phone"): boolean; // @stable
    setZoom(zoom: number): boolean; fit(): boolean; // @experimental
    addBlock(kind: string, overrides?: NewNodeOverrides): string | null;
    remove(): boolean; duplicate(): boolean; group(): boolean; ungroup(): boolean; // @experimental
  }
  export type ApiDeps = {
    run: Run;
    getState(): EditorState;
    save(): Promise<boolean>;           // the editor's own save, false when it cannot run
    addBlock(kind: string, overrides?: NewNodeOverrides): void; // the editor's own add (measures the screen)
    fit(): void;
    alive(): boolean;                   // false once the editor has unmounted
  };
  export function createApi(deps: ApiDeps): EditorApi;
  ```

  Commands call `deps.run` with the table names; each returns `deps.run`'s answer. `addBlock` returns `selectedId` after the add when `history.present` changed, else `null`. When `!deps.alive()` every method returns `false`/`null`/`Promise<false>` and logs one `console.warn` per object in development.

- [ ] **Step 1: Write failing tests** with a real store and a stub `deps`: `undo undoes like the button` (same state as `run("history.undo")`), `undo with nothing to undo returns the same state`, `addBlock returns the id of the block it made and selects it`, `addBlock with an unknown kind returns null and changes nothing`, `a command after alive() is false returns false and warns once` (spy on `console.warn`, two calls, one warning), `save while the status is saving returns false`.
- [ ] **Step 2: Run** `pnpm exec vitest run packages/editor/src/control.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `createApi`. In `EditorBody`: `save` = the existing function made to return `Promise<boolean>` (`false` without `onSave`, when `status === "saving"`, or when `onSave` throws; it stores a pending draft first as today and the Save button keeps calling it); `addBlock` = existing `addBlockOf`; `fit` = existing `fit`; the object is made once (`useState`/`useMemo` with `[store]`) and reads the latest render through a ref, as `useRun` does; `alive` flips to false in an effect cleanup (StrictMode: set true again on setup).
- [ ] **Step 4: Run** unit tests, `tsc`, `pnpm lint`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(editor): the control object, built from the editor's own commands`.

### Task 5: `useEditor` and the context

**Files:**
- Create: `packages/editor/src/control-context.tsx`
- Modify: `packages/editor/src/Editor.tsx` (wrap the returned tree in the provider), `packages/editor/src/index.ts` (export `useEditor`, `EditorApi`, `EditorView`)
- Test: `packages/editor/src/control-context.test.tsx`

**Interfaces:**
- Consumes: `EditorApi`, `EditorView`, `viewOf`, `useStoreShallow` (existing, shallow compare).
- Produces: `ControlProvider({ api, children })`; `useEditor(): EditorApi` and `useEditor<R>(select: (view: EditorView) => R): R`. Without a provider both throw `Error("useEditor must be used inside <Editor>")`. The selector form compares with shallow equality, so a selector returning a fresh object each call does not loop.

- [ ] **Step 1: Write failing tests** (render with the real `Editor`): `useEditor() inside headerActions undoes a change`, `a host part reading canUndo redraws only when it changes` (render counter), `a selector that returns a new object each time does not loop`, `two editors keep their own control objects` (button in one changes only its page), `the object keeps its identity across renders and under StrictMode`, `useEditor outside an editor throws the message`.
- [ ] **Step 2: Run** `pnpm exec vitest run packages/editor/src/control-context.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement** the provider and hook; the provider sits inside `StoreProvider` and outside everything `EditorBody` draws, so `headerActions`, `logo` and `headerStart` are inside it.
- [ ] **Step 4: Run** unit tests, `pnpm perf` (numbers unchanged), `pnpm exec vitest run packages/editor/src/architecture.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(editor): useEditor reads and drives the editor from inside it`.

### Task 6: e2e in the playground

**Files:**
- Modify: `apps/playground/src/App.tsx`, create `apps/playground/src/ControlDemo.tsx` (shown with `?control`)
- Test: `e2e/control.spec.ts`

**Interfaces:**
- Consumes: `useEditor` from `@miditor/editor`.
- Produces: a host part in `headerActions` with buttons "Host save", "Host undo" (disabled by `canUndo`), "Host select first", "Host add Text".

- [ ] **Step 1: Write the failing e2e** (`control.spec.ts`): `Host undo is off until there is something to undo, then undoes`, `Host add Text adds a block and selects it`, `Host select first selects the first block`, `Host save reaches onSave once with the page`, each also run with `E2E_STRICT=1`.
- [ ] **Step 2: Run** `pnpm e2e e2e/control.spec.ts`. Expected: FAIL (no `?control`).
- [ ] **Step 3: Implement** `ControlDemo` and the `?control` branch in `App.tsx`.
- [ ] **Step 4: Run** `pnpm e2e` and `E2E_STRICT=1 pnpm e2e`. Expected: all pass.
- [ ] **Step 5: Commit** `test(e2e): a host part drives the editor through useEditor`.

### Task 7: Surface report and docs

**Files:**
- Test: `packages/editor/src/public-surface.test.ts` with its snapshot `packages/editor/src/__snapshots__/control.ts.snap`
- Modify: `packages/editor/README.md`, `ARCHITECTURE.md`, `docs/superpowers/specs/2026-10-31-m0-render-baseline.md`

**Interfaces:**
- Produces: `public-surface.test.ts` runs `expect(readFileSync("control.ts")).toMatchFileSnapshot(...)`, so a change to the public types shows in review; `index.ts` exports are also snapshotted.

- [ ] **Step 1: Write the test** and generate the snapshot (`pnpm exec vitest run packages/editor/src/public-surface.test.ts -u`); review the snapshot reads as the surface of the design.
- [ ] **Step 2: Docs**: README section "Control the editor from your code" (tiers 1 and 2, the example from the design, the stable/experimental split, `save()` stores a pending draft, the rules for commands without an editor); `ARCHITECTURE.md` gets a "Control API" section and the new rule; baseline doc gets the M1a row (size, `pnpm perf` unchanged).
- [ ] **Step 3: Run** the full check: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm e2e`, `E2E_STRICT=1 pnpm e2e`, `pnpm build`, `pnpm perf`. Expected: all green, numbers as in Global Constraints.
- [ ] **Step 4: Commit** `docs: the control API, its surface report and its numbers`.
