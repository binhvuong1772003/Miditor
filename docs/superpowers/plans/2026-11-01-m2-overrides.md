# M2 Overrides Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A host gives `<Editor overrides={{...}}>` and wraps or replaces eight named places of the editor with its own components, each with the editor's `editor` (M1) and the default as `children`.

**Architecture:** One context carries the `overrides` object. A small `OverrideSlot` component looks up its name: no override draws the default as today; an override is drawn inside an error boundary that falls back on the default. Each part wraps its own output in a slot, so the parts need no new props from `Editor.tsx`, except the menu and the quick actions which `Editor.tsx` draws itself.

**Tech Stack:** React 19, TypeScript, Vitest, Playwright, biome.

**Spec:** `docs/superpowers/specs/2026-11-01-m2-overrides-design.md`

## Global Constraints

- A host with no `overrides` sees no change; `pnpm perf` numbers stay: add Text 2, type 5 chars 2, drag 15, select none 4, hover block 3, select block 4.
- The place names are exactly: `header`, `headerActions`, `field`, `rail`, `panelStart`, `panelEnd`, `quickActions`, `contextMenu`. `contextMenu` is a function `({ editor, items }) => items`; the others are components.
- Every component override receives `editor: EditorApi` and `children: ReactNode` (the editor's own part), plus the extra props in the spec table. `panelEnd` also gets `mode: "page" | "block"` and `nodeId: string | null`; `quickActions` also gets `disabled: boolean`; `rail` gets `tools: readonly { id: Tool; name: string; icon: IconName; active: boolean; pick(): void }[]`; `panelStart` gets `tool: Tool`; `field` gets `name: string; field: Field; value: JsonValue; onChange(value: JsonValue): void; nodeId: string`.
- An override that throws while drawing: the default is drawn outside the boundary, one `console.error` names the place, and the host's component is tried again only when its entry in `overrides` changes. The throw of the default itself is not hidden.
- `contextMenu` is called each time the menu opens, in try/catch; a throw or a result that is not an array of valid items gives the default lines and one error. `ContextMenuItem` gains optional `id`; rows are keyed by `id`, else label plus place.
- `field` covers one property drawn as one input; a run of two or more booleans (the switch group) is not overridable. It writes its own property only.
- Everything under `overrides` is `@experimental`. Existing props (`logo`, `headerStart`, `headerActions`, `config.*`) keep working.
- `architecture.test.ts` keeps passing; update `public-surface` snapshots for the new public names.

## Review Focus

- An override that throws on first draw and on a later draw: default shown, one error, retried only when the entry changes. (Task 1)
- An override that ignores `children`, one that wraps it, and one that renders `null`: the editor stays usable around it. (Tasks 2, 4)
- A repeated or empty label in `contextMenu` items does not break the list or key warnings. (Task 5)
- A `field` override for one property leaves every other property, the switch group and undo/redo of the replaced property working. (Task 3)
- Two editors on one page with different `overrides`: each uses its own. (Task 6)
- `overrides` given as a new object every render: works, no loop, no extra store renders. (Task 1)

---

### Task 1: The slot and the boundary

**Files:**
- Create: `packages/editor/src/overrides.tsx`
- Test: `packages/editor/src/overrides.test.tsx`

**Interfaces:**
- Produces:

  ```ts
  export interface Overrides { /* the eight places, all optional, @experimental, typed per the spec table */ }
  export const OverridesContext: React.Context<Overrides | undefined>;
  export function OverrideSlot<N extends keyof ComponentOverrides>(p: {
    name: N; props: Omit<ComponentProps<ComponentOverrides[N]>, "editor" | "children">; children: ReactNode;
  }): ReactElement;
  export function useContextMenuOverride(): Overrides["contextMenu"];
  ```

  `ComponentOverrides` is the seven component places. `OverrideSlot` reads the context; without an override it returns `children`; with one it draws `<Boundary entry={override} name={name} fallback={children}><Override editor={useEditor()} {...props}>{children}</Override></Boundary>`. The boundary is a class component: `getDerivedStateFromError` sets `failed`, `componentDidCatch` logs `console.error("[midito] the override of <name> threw: …")` once per failure, and `failed` resets when `entry` changes. Fallback is rendered outside the boundary's try.

- [ ] **Step 1: Write failing tests** (use `renderToString` for output and a client-free boundary check through `react-dom/server`'s error behaviour where possible; the boundary's catch is covered in Task 6 e2e): `no override draws the default`, `a wrapper draws the default inside its own markup`, `an override that ignores children draws none of the default`, `the override receives editor and the props of the place`, `OverridesContext given a new object each render does not change the output`.
- [ ] **Step 2: Run** `pnpm exec vitest run packages/editor/src/overrides.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement** `overrides.tsx`; no zustand, no `Editor.tsx` import.
- [ ] **Step 4: Run** the file, `tsc`, `pnpm lint`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(editor): a slot that draws a host's override or the default`.

### Task 2: The `overrides` prop, `header` and `headerActions`

**Files:**
- Modify: `packages/editor/src/Editor.tsx` (the prop, the provider around the tree), `packages/editor/src/Toolbar.tsx`, `packages/editor/src/index.ts`
- Test: `packages/editor/src/overrides.test.tsx`

**Interfaces:**
- Consumes: Task 1.
- Produces: `EditorProps.overrides?: Overrides`; `Toolbar` draws `<OverrideSlot name="header">` around its `<header>` and `<OverrideSlot name="headerActions">` around the host's `headerActions` and the Save button (children = those two together). Exports `Overrides` type from `index.ts`.

- [ ] **Step 1: Write failing tests**: `header wraps the bar`, `headerActions replaces Save and the host's actions`, `an editor with no overrides draws the same markup as before` (compare `renderToString` of the editor with and without `overrides={{}}`).
- [ ] **Step 2: Run** the file. Expected: FAIL.
- [ ] **Step 3: Implement** the prop and the two slots; `OverridesContext.Provider` sits inside `ControlProvider` so `editor` is available to slots.
- [ ] **Step 4: Run** unit tests, `pnpm e2e`, `pnpm perf` (numbers unchanged), `tsc`, `pnpm lint`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(editor): overrides for the header and its actions`.

### Task 3: `field`

**Files:**
- Modify: `packages/editor/src/PropFields.tsx`
- Test: `packages/editor/src/overrides.test.tsx` (or `PropFields` render test)

**Interfaces:**
- Consumes: Task 1 (`OverrideSlot name="field"`), the existing `PropField` render.
- Produces: each non-group property cell is wrapped in `<OverrideSlot name="field" props={{ name, field, value: stored, onChange: (v) => onChange(name, v), nodeId }}>`. `PropFields` needs the selected node id: add `nodeId: string` to `PropFieldsProps` and pass it from `PropertiesPanel`.

- [ ] **Step 1: Write failing tests**: `field replaces the input of one property and leaves the others`, `children keeps the editor's own input`, `a run of booleans is not passed to field`, `onChange of the override writes only its own property`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** unit tests, `pnpm e2e`, `pnpm perf`, `tsc`, `pnpm lint`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(editor): an override for the input of a property`.

### Task 4: `rail`, `panelStart`, `panelEnd`

**Files:**
- Modify: `packages/editor/src/Rail.tsx`, `packages/editor/src/StartPanel.tsx`, `packages/editor/src/EndPanel.tsx`
- Test: `packages/editor/src/overrides.test.tsx`

**Interfaces:**
- Consumes: Task 1.
- Produces: `Rail` builds `tools` (`id`, `name`, `icon`, `active` = current tool with the panel open, `pick` = `run("tool.pick", id)`) and wraps its `<nav>` in `rail`; `StartPanel` wraps its `<aside>` in `panelStart` with `tool`; `EndPanel` wraps its `<aside>` in `panelEnd` with `mode` (`"page"` when nothing is selected, else `"block"`) and `nodeId`.

- [ ] **Step 1: Write failing tests**: `rail receives the four tools and pick runs tool.pick`, `a replaced rail still lets the panel change through pick`, `panelStart receives the open tool`, `panelEnd receives mode page with no selection and mode block with one`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** unit tests, `pnpm e2e`, `pnpm perf`, `tsc`, `pnpm lint`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(editor): overrides for the rail and the two panels`.

### Task 5: `quickActions` and `contextMenu`

**Files:**
- Modify: `packages/editor/src/Editor.tsx` (the two places it draws them), `packages/editor/src/ContextMenu.tsx` (`id`, keys)
- Test: `packages/editor/src/overrides.test.tsx`, `packages/editor/src/ContextMenu` test if one exists

**Interfaces:**
- Consumes: Task 1, `useContextMenuOverride`.
- Produces: `quickActions` slot around `<QuickActions>` with `disabled`; `menuItems()` result passed through the `contextMenu` override inside try/catch, with validation (`Array.isArray`, each item `"separator"` or an object with string `label` and function `onSelect`); `ContextMenuItem` gains `id?: string`; rows keyed by `id ?? \`${label}:${index}\``.

- [ ] **Step 1: Write failing tests**: `contextMenu adds a line`, `contextMenu drops a line`, `a throw in contextMenu gives the default lines`, `a result that is not a list gives the default lines`, `two items with the same label render two rows`, `quickActions wrapper receives disabled`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** unit tests, `pnpm e2e` (the context-menu specs), `pnpm perf`, `tsc`, `pnpm lint`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(editor): overrides for the quick actions and the context menu`.

### Task 6: Playground demo and e2e

**Files:**
- Create: `apps/playground/src/OverridesDemo.tsx`, `e2e/overrides.spec.ts`; modify `apps/playground/src/App.tsx` (`?overrides`, `?overrides&throw`, `?overrides&two`)

**Interfaces:**
- Consumes: everything above, from `@midito-kitchen/editor`.
- Produces: a demo with a host bar around the header (Undo still works), a replaced rail, a wrapped panel, a menu line "Host: log" that runs, a `field` replaced for the button's link only, and a variant whose override throws.

- [ ] **Step 1: Write failing e2e**: `the header is wrapped and Undo of the editor still works`, `a replaced rail changes the panel through pick`, `a wrapped panel shows the host's frame around it`, `a line the host adds to the menu is there and runs`, `the host's input replaces the link field and the other fields stay`, `an override that throws shows the default and logs one error`, `two editors keep their own overrides`; each under `E2E_STRICT=1` too.
- [ ] **Step 2: Run** `pnpm e2e e2e/overrides.spec.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the demo and branches.
- [ ] **Step 4: Run** `pnpm e2e` and `E2E_STRICT=1 pnpm e2e`. Expected: all pass.
- [ ] **Step 5: Commit** `test(e2e): a host reshapes the editor through overrides`.

### Task 7: Docs, surface and numbers

**Files:**
- Modify: `packages/editor/README.md`, `ARCHITECTURE.md`, `docs/superpowers/specs/2026-10-31-m0-render-baseline.md`, snapshots in `packages/editor/src/__snapshots__/`
- Test: `packages/editor/src/public-surface.test.ts` (regenerate)

- [ ] **Step 1: Regenerate** snapshots with `pnpm exec vitest run packages/editor/src/public-surface.test.ts -u`; read the diff: only the new names.
- [ ] **Step 2: Docs**: README "Change the editor with overrides" (the eight places in one table with their props, wrap and replace examples, the `contextMenu` function, the `field` rules, keep `overrides` stable, the error rule, the accessibility contract of each part); `ARCHITECTURE.md` "Overrides" section (the slot, the boundary, one context); baseline: M2 size row and the perf line.
- [ ] **Step 3: Run** `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm e2e`, `E2E_STRICT=1 pnpm e2e`, `pnpm build`, `pnpm perf`. Expected: all green, perf as in Global Constraints.
- [ ] **Step 4: Commit** `docs: overrides, their surface and their numbers`.
