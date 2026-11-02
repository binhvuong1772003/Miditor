# M4 Composition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A host places the parts of the editor itself inside `<EditorProvider>`; `<Editor />` with no children is the same default layout built from the same parts.

**Architecture:** `EditorBody` is split into `EditorProvider` (all state, hooks, keys and clipboard, one root element, a context "shell") and parts that read the shell. In steps 1 and 2 the provider still holds the canvas state, so nothing changes on screen; in step 3 the canvas-only state moves into the canvas part and the provider keeps a small handle.

**Tech Stack:** React 19, TypeScript, Vitest, Playwright, biome.

**Spec:** `docs/superpowers/specs/2026-11-01-m4-composition-design.md`

## Global Constraints

- `<Editor />` with no children: same markup, behaviour and keys as now; the whole existing suite (unit, e2e, StrictMode) passes unchanged at the end of every task.
- No moment of `pnpm perf` counts more commits than now (add Text 2, type 5 chars 2, drag 15, select none 4, hover block 3, select block 4); a count may go down only after Task 3.
- Parts: `Editor.Header`, `Editor.Rail`, `Editor.StartPanel`, `Editor.Blocks`, `Editor.Layers`, `Editor.Images`, `Editor.Themes`, `Editor.Canvas`, `Editor.Properties`; each also exported by name (`EditorHeader`, `EditorRail`, `EditorStartPanel`, `EditorBlocks`, `EditorLayers`, `EditorImages`, `EditorThemes`, `EditorCanvas`, `EditorProperties`). The provider is `EditorProvider`; `useEditorRoot(): HTMLElement | null`.
- A part outside a provider throws `Error("<Name> must be used inside <EditorProvider>")`. `Canvas` at most once mounted at a time: a second logs one error and draws nothing.
- The root element carries `data-miditor-editor`, `data-scheme`, `lang`, the appearance variables, `data-panel`, and `data-layout="default"` only in the default layout. The grid and narrow-screen rules of `Editor.module.css` apply only under `[data-layout="default"]`.
- A hidden tool is hidden everywhere (`Editor.Layers` vanishes under `hide: ["tool.layers"]`); the four tool panels ignore `panelOpen`; `StartPanel` collapses on `panelOpen: false` only in the default layout (by CSS).
- Without a canvas: nudge, group, ungroup and duplicate do nothing (the commands refuse a missing container), Fit does nothing, adding a block uses zero sizes.
- `architecture.test.ts` keeps passing; `canvas/` still does not import `Editor.tsx`; update the `public-surface` snapshots.
- Everything new is `@experimental`.

## Review Focus

- `<Editor />` markup identical to before, byte for byte where the test compares it. (Tasks 1, 2)
- A part drawn outside a provider; two canvases; a canvas that unmounts and mounts again (a dialog). (Task 2)
- StrictMode with a custom layout: selecting, adding and dragging still work. (Tasks 2, 4)
- Properties inside a portal keeps the appearance via `useEditorRoot`. (Task 4)
- No count of `pnpm perf` rises after the canvas keeps its own state. (Task 3)
- A layout with no rail, no header, no canvas, no properties each works. (Tasks 2, 4)

---

### Task 1: The provider, the shell, and prop-less panel parts

**Files:**
- Create: `packages/editor/src/shell.tsx` (the shell context and `useShell`), `packages/editor/src/EditorProvider.tsx` (moved from `EditorBody`)
- Modify: `packages/editor/src/Editor.tsx`, `Toolbar.tsx`, `Rail.tsx`, `StartPanel.tsx`, `EndPanel.tsx`
- Test: `packages/editor/src/composition.test.tsx`

**Interfaces:**
- Produces:

  ```ts
  export interface Shell { /* registry, shownRegistry, documents, selecting, viewing, run, config,
     logo, headerStart, headerActions, status, saving, onSave, fit, addBlock, dragFromLibrary,
     dropFromLibrary, parentSize, pageHeight, selectedRect, shownDef + the canvas elements and
     measures still held by the provider (workspace, block, stageBox...) */ }
  export function useShell(name: string): Shell;   // throws "<name> must be used inside <EditorProvider>"
  export function EditorProvider(props: EditorProps & { children?: ReactNode; layout?: "default" }): ReactElement;
  ```

  `Toolbar`, `Rail`, `StartPanel`, `EndPanel` lose their props and read `useShell`. `Editor` is `EditorProvider` with the default layout as children. The default layout still draws the canvas `<section>` from the provider (moved in Task 2).

- [ ] **Step 1: Write failing tests**: `a part outside a provider throws its name`, `Editor draws the same markup as before` (compare `renderToString(<Editor />)` with a stored string captured from the current code in the test via a snapshot file `__snapshots__/editor-markup.snap` written before the refactor), `Editor with overrides and hide draws the same markup as before`.
- [ ] **Step 2: Capture** the markup snapshot first from the unchanged code (`pnpm exec vitest run packages/editor/src/composition.test.tsx -u`), commit it as part of this task, then make the other tests fail.
- [ ] **Step 3: Implement** the split. Keep all hooks in the provider unchanged; build the shell object each render; the four parts read it. No behaviour change.
- [ ] **Step 4: Run** unit tests, `pnpm e2e`, `E2E_STRICT=1 pnpm e2e`, `pnpm perf` (unchanged), `tsc`, `pnpm lint`. Expected: all pass, markup snapshot unchanged.
- [ ] **Step 5: Commit** `refactor(editor): a provider and a shell, and panels that read it`.

### Task 2: The canvas part, the public names and the layout split

**Files:**
- Create: `packages/editor/src/canvas/Canvas.tsx`, `packages/editor/src/parts.tsx` (the `Editor.X` members and named exports)
- Modify: `packages/editor/src/Editor.tsx`, `EditorProvider.tsx`, `Editor.module.css`, `StartPanel.tsx` (the four tool panels as separate exports), `index.ts`
- Test: `packages/editor/src/composition.test.tsx`

**Interfaces:**
- Consumes: Task 1.
- Produces: `Canvas` is the `<section>` JSX moved out of the provider's return, reading the shell (the state is still the provider's); registers itself with the provider (mounted count, error on a second); `Editor.Header`, `Editor.Rail`, `Editor.StartPanel`, `Editor.Blocks`, `Editor.Layers`, `Editor.Images`, `Editor.Themes`, `Editor.Canvas`, `Editor.Properties` and their named exports; `useEditorRoot()`; the root takes `data-layout="default"` only in the default layout; CSS grid and narrow rules scoped to `[data-layout="default"]`; `EditorProvider` with children and no layout is a plain block root.

- [ ] **Step 1: Write failing tests**: `each part draws the same markup inside Editor as the old part`, `a second Canvas draws nothing and logs one error`, `a canvas that unmounts lets another mount`, `Editor.Layers is hidden by hide tool.layers`, `the tool panels draw whatever panelOpen says`, `a provider with children and no layout has no data-layout`, `a layout with no header, no rail, no properties renders`, `useEditorRoot gives the root element after mount`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** Keep `Editor.module.css` class names; add the attribute scoping.
- [ ] **Step 4: Run** unit tests, `pnpm e2e`, `E2E_STRICT=1 pnpm e2e`, `pnpm perf` (unchanged), `tsc`, `pnpm lint`; regenerate the surface snapshots and read the diff. Expected: pass.
- [ ] **Step 5: Commit** `feat(editor): EditorProvider and the parts to place anywhere`.

### Task 3: The canvas keeps its own state

**Files:**
- Modify: `packages/editor/src/canvas/Canvas.tsx`, `EditorProvider.tsx`, `shell.tsx`; move `useGestures`, `usePointer`, `useBlockMarks`, `useAltHeld`, labels, marquee and menu state call sites from the provider into `Canvas`
- Test: `packages/editor/src/composition.test.tsx`, `pnpm perf`

**Interfaces:**
- Produces: the provider keeps as state only `workspace`, `block`, `stageBox` (set by the canvas, cleared on unmount) and the draft/selection concerns; the canvas registers in a non-reactive part of the handle `gesturing(): boolean` and `setDropHint(id: string | null): void`, which the keys and the library drag call. Behaviour is unchanged.

- [ ] **Step 1: Write failing tests**: `the keys ignore a key while a gesture is on` (through the handle), `a library drag shows the drop hint through the handle`, `without a canvas the handle is empty and nothing throws`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement the move**, one hook at a time, running the full suite after each.
- [ ] **Step 4: Run** unit tests, `pnpm e2e`, `E2E_STRICT=1 pnpm e2e`, `pnpm perf`: **no moment may count more than before**; record the new numbers. `tsc`, `pnpm lint`.
- [ ] **Step 5: Commit** `refactor(editor): the canvas holds its own state`.

### Task 4: Playground `?compose` and e2e

**Files:**
- Create: `apps/playground/src/ComposeDemo.tsx`, `e2e/compose.spec.ts`; modify `apps/playground/src/App.tsx` (`?compose`, `?compose&nocanvas`, `?compose&two`)

**Interfaces:**
- Consumes: `EditorProvider`, `Editor.*`, `useEditorRoot` from `@miditor/editor`.
- Produces: a layout with Layers on the right, Properties in a dialog (portal into the editor root), the rail along the bottom, the canvas filling the middle; a variant without a canvas; a variant with two providers.

- [ ] **Step 1: Write failing e2e**: `selecting, adding, dragging, undo and the keys work in a custom layout`, `the context menu works in the custom layout`, `Properties in a dialog keeps the appearance and closing it loses nothing`, `Layers placed on the right follows the selection`, `a layout with no header and no rail still works`, `without a canvas the keys that need a container do nothing and nothing throws`, `two providers keep their own state`, `<Editor /> default is unchanged (the existing suite)`; each also under `E2E_STRICT=1`.
- [ ] **Step 2: Run** `pnpm e2e e2e/compose.spec.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the demo and branches.
- [ ] **Step 4: Run** `pnpm e2e` and `E2E_STRICT=1 pnpm e2e`. Expected: all pass.
- [ ] **Step 5: Commit** `test(e2e): a host lays the editor out itself`.

### Task 5: Docs, surface and numbers

**Files:**
- Modify: `packages/editor/README.md`, `ARCHITECTURE.md`, `docs/superpowers/specs/2026-10-31-m0-render-baseline.md`, snapshots (add `parts.tsx`, `shell.tsx` public types to `public-surface.test.ts`)

- [ ] **Step 1: Regenerate** snapshots with `pnpm exec vitest run packages/editor/src/public-surface.test.ts -u`; read the diff: only the new names.
- [ ] **Step 2: Docs**: README "Lay the editor out yourself" (the provider, a table of the parts with their landmarks, the default layout, the rules: one canvas, `useEditorRoot` for portals, what happens without a canvas, hide and overrides still apply, the grid trap of M2 does not apply to a custom layout); `ARCHITECTURE.md` "Composition" (provider and shell, the handle, why the canvas owns its state); baseline: M4 size row and the new counts.
- [ ] **Step 3: Run** `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm e2e`, `E2E_STRICT=1 pnpm e2e`, `pnpm build`, `pnpm perf`. Expected: all green, no count higher than before.
- [ ] **Step 4: Commit** `docs: composition, its surface and its numbers`.
