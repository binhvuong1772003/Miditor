# M1b Controller Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A host drives and reads the editor from code outside the `<Editor>` tree, through a controller it creates and gives to `<Editor controller={...}>` (tier 3).

**Architecture:** The editor keeps its own store. A controller is a handle: it holds the control object and the store of the editor attached to it, forwards commands to it, and lets a hook subscribe to its state. Attaching is internal. Nothing about tiers 1 and 2 changes.

**Tech Stack:** React 19, Vitest, Playwright, biome.

**Spec:** `docs/superpowers/specs/2026-11-01-m1-control-api-design.md` (section "Tier 3: the controller (M1b)")

## Global Constraints

- Hosts that give no `controller` work exactly as after M1a; `pnpm perf` numbers stay: add Text 2, type 5 chars 2, drag 15, select none 4, hover block 3, select block 4.
- `EditorController` has every member of `EditorApi` (same names, same returns).
- Not attached (never, or gone): a command does nothing, returns `false` (`null` for `addBlock`, `Promise<false>` for `save`) and warns once per controller; a read gives the idle view.
- Idle view: `data` an empty page, `selection {id: null, picked: []}`, `frame "desktop"`, `zoom 1`, `canUndo false`, `canRedo false`, `status undefined`.
- A second editor given an attached controller is ignored with a `console.error`; the first keeps the controller.
- The attach function is not exported from `index.ts`. `architecture.test.ts` and `public-surface.test.ts` keep passing (update the snapshots for the new public names).
- `useEditor(controller, selector)` compares the members of what the selector returns, like the in-tree form.

## Review Focus

- A host part reads the controller before any editor has mounted: idle view, no throw, no loop. (Tasks 1, 2)
- StrictMode mounts the editor twice: attach, detach, attach leaves it attached and working. (Task 2)
- The `controller` prop changes between renders: the old one is released, the new one attached. (Task 2)
- Two editors given one controller: the second is ignored with an error, the first keeps working. (Tasks 1, 3)
- The editor unmounts while a host bar stays: its reads go idle and its commands return false. (Tasks 1, 3)
- A selector that builds a new object each time does not loop on the controller. (Task 2)

---

### Task 1: The controller

**Files:**
- Create: `packages/editor/src/controller.ts` (public: `createEditor`, `EditorController`; internal: `attachController`)
- Test: `packages/editor/src/controller.test.ts`

**Interfaces:**
- Consumes: `EditorApi` (`control-api.ts`), `EditorView` and `viewOf` (`control.ts`), `EditorState`, `EditorStore` (`./store`), `emptyPage` (`@midito-kitchen/core`).
- Produces:

  ```ts
  export interface EditorController extends EditorApi {}
  export function createEditor(): EditorController;
  // internal, not in index.ts
  export function attachController(
    controller: EditorController,
    editor: { api: EditorApi; store: EditorStore<EditorState> },
  ): (() => void) | null;          // the release function, or null when another editor holds it
  export function controllerState(controller: EditorController): {
    subscribe(listener: () => void): () => void;   // told on attach, release, and every state change
    snapshot(): EditorState | null;                // the attached store's state, or null
  };
  export const idleView: EditorView;
  ```

  `attachController` logs `console.error` and returns `null` when the controller is held; the release function only releases if the controller is still held by that same editor.

- [ ] **Step 1: Write failing tests**: `commands do nothing before an editor is attached and warn once` (false / null / `await save() === false`, one `console.warn` for several calls); `commands go to the attached editor` (stub `api` records calls); `a second attach is refused with an error and the first keeps the controller`; `release lets another editor attach`; `a release from an editor that no longer holds it does nothing`; `subscribe is told on attach, on release and on a change of the attached store`; `snapshot is null when nothing is attached`.
- [ ] **Step 2: Run** `pnpm exec vitest run packages/editor/src/controller.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `controller.ts` with no React: a private record per controller (WeakMap) holding the attached editor, the listeners, the unsubscribe of the store, and the warned flag. Every `EditorController` method delegates to the attached `api` or returns the not-attached answer; write the delegating object so a missing member is a type error (`satisfies EditorApi`).
- [ ] **Step 4: Run** the file, `tsc`, `pnpm lint`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(editor): a controller a host can drive the editor with`.

### Task 2: `useCreateEditor`, `useEditor(controller)` and the `controller` prop

**Files:**
- Modify: `packages/editor/src/control-context.tsx` (extra overloads), `packages/editor/src/controller.ts` (add `useCreateEditor`, or a new `controller-hooks.ts` if React must stay out of `controller.ts`), `packages/editor/src/Editor.tsx` (the prop and the attach effect), `packages/editor/src/index.ts`
- Test: `packages/editor/src/control-context.test.tsx`

**Interfaces:**
- Consumes: Task 1.
- Produces:

  ```ts
  export function useCreateEditor(): EditorController;
  export function useEditor(controller: EditorController): EditorController;
  export function useEditor<R>(controller: EditorController, select: (view: EditorView) => R): R;
  // EditorProps gains: controller?: EditorController
  ```

  The overloads tell a controller from a selector by `typeof argument === "function"`. The selector form uses `useSyncExternalStore` on `controllerState(controller)` and returns `select(state ? viewOf(state) : idleView)`, keeping the previous result when its members are equal (a small shallow compare in the module; zustand stays inside `store/`).
  In `EditorBody` an effect attaches `{ api, store }` to `props.controller` when it is given and releases on cleanup (re-runs when the controller changes).

- [ ] **Step 1: Write failing tests** (SSR renders as in the existing file): `useEditor(controller) returns the controller`; `useEditor(controller, selector) gives the idle view before an editor is attached`; `a selector that builds a new object gives equal results for equal members`; `useCreateEditor gives the same controller on every render`.
- [ ] **Step 2: Run** the file. Expected: FAIL.
- [ ] **Step 3: Implement** the overloads, `useCreateEditor` (`useState(createEditor)`), the prop and the effect. The controller prop does not enter the store and does not cause a render when unchanged.
- [ ] **Step 4: Run** unit tests, `pnpm e2e`, `pnpm perf` (numbers unchanged), `tsc`, `pnpm lint`. Expected: all pass.
- [ ] **Step 5: Commit** `feat(editor): useCreateEditor, useEditor(controller) and the controller prop`.

### Task 3: e2e outside the editor, docs, surface

**Files:**
- Modify: `apps/playground/src/App.tsx`, create `apps/playground/src/OutsideBar.tsx` (`?control&outside`), `packages/editor/src/__snapshots__/*` (regenerate), `packages/editor/README.md`, `ARCHITECTURE.md`, `docs/superpowers/specs/2026-10-31-m0-render-baseline.md`
- Test: `e2e/controller.spec.ts`

**Interfaces:**
- Consumes: `useCreateEditor`, `useEditor(controller, selector)` from `@midito-kitchen/editor`.
- Produces: a host bar above the editor (outside `<Editor>`) with "Outside undo" (disabled by `canUndo`), "Outside save", "Outside add Text", a selection readout; `?control&outside&two` gives one controller to two editors.

- [ ] **Step 1: Write failing e2e** (`controller.spec.ts`): `the bar before the editor mounts is idle, then follows the editor`; `Outside add Text adds a block and the readout shows its id`; `Outside undo is off until there is a change, then undoes`; `a second editor given the same controller is ignored and the first keeps working` (the console error is seen); `the readout goes idle when the editor is closed` (a toggle button in the demo unmounts it); each also under `E2E_STRICT=1`.
- [ ] **Step 2: Run** `pnpm e2e e2e/controller.spec.ts`. Expected: FAIL (no `?control&outside`).
- [ ] **Step 3: Implement** `OutsideBar` and the branches in `App.tsx`.
- [ ] **Step 4: Docs**: README gets "Control the editor from outside" (tier 3 example, idle rules, one controller per editor, the second is ignored); `ARCHITECTURE.md` gets the controller paragraph; regenerate snapshots with `pnpm exec vitest run packages/editor/src/public-surface.test.ts -u` and read the diff; baseline doc gets the M1b size and the unchanged perf line.
- [ ] **Step 5: Run** `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm e2e`, `E2E_STRICT=1 pnpm e2e`, `pnpm build`, `pnpm perf`. Expected: all green, perf as in Global Constraints.
- [ ] **Step 6: Commit** `feat(playground): an app bar outside the editor drives it through a controller`, then `docs: the controller, its surface and its numbers`.
