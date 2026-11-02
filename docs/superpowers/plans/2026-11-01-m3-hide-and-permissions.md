# M3 Hide and Permissions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A host gives `permissions`, `hide` and `onDenied` to `<Editor>`; a refused permission refuses the change whatever path asked for it, and hidden parts are not drawn.

**Architecture:** One guard sits in the three functions every page change ends in (`edit`, `editAndEndDraft`, `editInLastStep` in `store/document.ts`). It compares the page before and after, sorts what changed into added, removed, moved and edited, asks the matching permission for each node, and refuses the whole change if any answer is no. The interface asks the same permissions to draw itself off. `hide` is a typed list of names read by the parts when they draw.

**Tech Stack:** React 19, TypeScript, Vitest + fast-check, Playwright, biome.

**Spec:** `docs/superpowers/specs/2026-11-01-m3-hide-and-permissions-design.md`

## Global Constraints

- A host that gives none of the three props sees no change; `pnpm perf` stays: add Text 2, type 5 chars 2, drag 15, select none 4, hover block 3, select block 4. With no permissions the guard does nothing and returns the same objects.
- Permissions: `canEdit(node)`, `canDelete(node)`, `canDuplicate(node)`, `canDrag(node)`, `canAdd(parent, kind)`; each optional, default `true`, boolean or function. Page settings, theme and fonts are asked of `canEdit(root)`.
- A change is allowed whole or refused whole; the state comes back as it was. Undo and redo are never refused.
- Sorting rules are exactly those of the spec section "Settled after the builder check": only the root of an added or removed subtree is asked; moved = parent, position, size, rotation, anchors, phone placement or rank among surviving siblings changed; edited = props, non-position styles, or the page's settings; `children` of the parent is not an edit; group = add + move children; ungroup = remove + move children; reorder and reparent = moved; cut = removed; paste = added; duplicate asks `canDuplicate` of each original and not `canAdd`.
- `onDenied({ action: "edit" | "delete" | "duplicate" | "drag" | "add", nodeId: string | null })` is called once per refused change; repeats of the same action on the same node within one second are told once. A refused panel change ends the draft.
- `hide` names (one typed union): `header`, `rail`, `panelStart`, `panelEnd`, `quickActions`, `contextMenu`, `header.undo`, `header.redo`, `header.frame`, `header.zoom`, `header.save`, `header.status`, `tool.blocks`, `tool.layers`, `tool.images`, `tool.themes`, `props.align`, `props.anchors`, `props.phone`. Hiding never blocks a command. An unknown name is ignored with one warning. A hidden open tool falls back on the first tool left.
- `permissions`, `hide` and `onDenied` are read when a change is made or a part is drawn, so they may change while the editor is open. Everything is `@experimental`.
- The docs say first that the host's server must check the page again.
- `architecture.test.ts` keeps passing (zustand only in `store/`, `store.setState` only in `store/`); update the `public-surface` snapshots.

## Review Focus

- A held key (nudge) on a locked block: one `onDenied`, no state change, no history step. (Task 2)
- A multi-select where one block is locked: the whole change is refused, no block moves. (Task 2)
- Cut of a block that cannot be deleted: the clipboard is not the problem, the block stays. (Task 2)
- Group and ungroup with mixed permissions follow the spec rule exactly. (Task 2)
- `permissions` that change while the editor is open take effect for the next change. (Task 3)
- Hiding the open tool; hiding `panelEnd` while a block is selected; hiding `header.save`: no crash, the rest works. (Task 5)
- The control API (`editor.remove()`, `editor.addBlock()`) is refused by the same guard. (Tasks 2, 3)

---

### Task 1: The guard, pure

**Files:**
- Create: `packages/editor/src/store/permissions.ts`
- Test: `packages/editor/src/store/permissions.test.ts`

**Interfaces:**
- Produces:

  ```ts
  export interface Permissions {
    canEdit?: boolean | ((node: TreeNode) => boolean);
    canDelete?: boolean | ((node: TreeNode) => boolean);
    canDuplicate?: boolean | ((node: TreeNode) => boolean);
    canDrag?: boolean | ((node: TreeNode) => boolean);
    canAdd?: boolean | ((parent: TreeNode, kind: string) => boolean);
  }
  export type Action = "edit" | "delete" | "duplicate" | "drag" | "add";
  export type Denial = { action: Action; nodeId: string | null };
  export type Intent = { kind: "duplicate"; originals: readonly string[] } | undefined;
  export function guard(before: PageData, after: PageData, permissions: Permissions | undefined, intent?: Intent): Denial | null;
  ```

  `guard` returns the first refusal, or `null` when every change is allowed or `permissions` is `undefined`. It compares the two trees by node id and applies the sorting rules in Global Constraints. Answers for a node are cached in a `WeakMap` keyed by node object per permission function.
  `TreeNode` and `PageData` come from `@midito-kitchen/core`; use the geometry helpers there (`boxFor`, etc.) to tell position from the rest of the styles.

- [ ] **Step 1: Write failing tests** with fast-check and fixed cases: `no permissions: null`, `a removed node asks canDelete of the subtree root only`, `an added subtree asks canAdd once for its root with the parent and kind`, `a moved node asks canDrag` (parent change; position change; rank change among survivors), `deleting a sibling moves no one`, `an edit of props asks canEdit and an edit of position asks canDrag`, `a style change touching position and colour asks both`, `a change of the parent's children is no edit of the parent`, `page settings, theme and fonts ask canEdit of the root`, `group and ungroup follow the rule`, `duplicate with an intent asks canDuplicate of each original and not canAdd`, `one refusal among several refuses`, `a boolean permission works as a function that returns it`, `the answers are cached per node object`.
- [ ] **Step 2: Run** `pnpm exec vitest run packages/editor/src/store/permissions.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `permissions.ts` with no React and no store library.
- [ ] **Step 4: Run** the file, `tsc`, `pnpm lint`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(editor): a guard that sorts a change and asks the permission for it`.

### Task 2: The guard in the store

**Files:**
- Modify: `packages/editor/src/store/document.ts` (the three functions and `Env`), every caller of them in `store/` (23 call sites), `store/structure.ts` (duplicate and paste pass an intent), `store/commands.ts` if needed
- Test: `packages/editor/src/store/guard-paths.test.ts`

**Interfaces:**
- Consumes: Task 1.
- Produces: `Env` gains `permissions?: Permissions` and `denied?: (denial: Denial) => void`. `edit`, `editAndEndDraft` and `editInLastStep` take `env` where they took `limit` (the builder may keep `limit` and add `env`; the behaviour is fixed): they compute the new page, call `guard(before, after, env.permissions, intent)`, and on a denial call `env.denied`, return the state unchanged (with `draft: null` for `editAndEndDraft`), and add no history step. Duplicate passes `{ kind: "duplicate", originals }`; paste and add pass none. `step` (undo and redo) is not guarded. Repeats of one denial within one second are told once.

- [ ] **Step 1: Write failing tests** (store level, real store, commands called as the editor calls them) with a permission off, one test per path, each asserting the state is the same object, `denied` called once, and with the permission on the change happens: add, drop from library, paste, cut, duplicate, group, ungroup, delete, reorder, nudge (held key: one denial), align, distribute, anchor, typed number, gesture end (`placeBoxes`), turn, move into a parent, panel patch (draft ends), page info, theme colour, theme font, put theme; plus `undo and redo work with every permission off` and `multi-select with one locked block is refused whole`.
- [ ] **Step 2: Run** the file. Expected: FAIL.
- [ ] **Step 3: Implement** the changes in `document.ts` and its callers; keep the diff mechanical.
- [ ] **Step 4: Run** `pnpm exec vitest run`, `pnpm exec tsc --noEmit`, `pnpm e2e`, `pnpm perf` (unchanged), `pnpm lint`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(editor): every change of the page asks the permissions first`.

### Task 3: The props and the surface of the editor

**Files:**
- Modify: `packages/editor/src/Editor.tsx` (props `permissions`, `hide`, `onDenied`; give them to `Env` through the live ref used by `useRun` and `useDocumentCommands`), `packages/editor/src/store/context.tsx`, `packages/editor/src/store/commands.ts` (`canRun` takes the permissions so a button is off when the command would be refused), `packages/editor/src/control-api.ts` if a command needs it, `packages/editor/src/index.ts`
- Test: `packages/editor/src/permissions-api.test.tsx`

**Interfaces:**
- Consumes: Tasks 1, 2.
- Produces: `EditorProps.permissions?: Permissions`, `EditorProps.hide?: readonly HideName[]` (the type is created in Task 5; add the prop there), `EditorProps.onDenied?: (denial: Denial) => void`. Exports `Permissions`, `Denial` from `index.ts`. A screen-reader announcement "Not allowed" (i18n key `a11y.denied`, English and Vietnamese) is made on a denial.

- [ ] **Step 1: Write failing tests**: `editor.remove() is refused for a block with canDelete false and returns false`, `editor.addBlock() returns null when canAdd is false`, `canRun is false for a command the permission would refuse`, `changed permissions apply to the next change`, `onDenied is called with the action and the node id`, `no props: same behaviour as before`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** unit tests, `pnpm e2e`, `E2E_STRICT=1 pnpm e2e`, `pnpm perf`, `tsc`, `pnpm lint`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(editor): permissions, hide and onDenied on the editor`.

### Task 4: The interface follows the permissions

**Files:**
- Modify: `packages/editor/src/canvas/SelectionBox.tsx`, `packages/editor/src/Editor.tsx` (selection box props, inline edit), `packages/editor/src/PropertiesPanel.tsx`, `packages/editor/src/PropFields.tsx`, `packages/editor/src/BlocksPanel.tsx`, `packages/editor/src/QuickActions.tsx`, `packages/editor/src/EmptyPage.tsx`
- Test: `packages/editor/src/permissions-ui.test.tsx`

**Interfaces:**
- Consumes: Task 3 (a way for a part to ask "may the selected block be edited, dragged, deleted, duplicated" and "may a block be added"; add `usePermission` or equivalent that caches per node).
- Produces: a block with `canDrag` false shows no handles and cannot be dragged; with `canEdit` false its fields are read-only and double press does not start typing; library cards, the Add button, `EmptyPage` add are off when `canAdd` for the page is false; quick actions and menu lines for delete and duplicate are off by their permission.

- [ ] **Step 1: Write failing tests**: `no handles for a block that cannot be dragged`, `fields are read-only for a block that cannot be edited`, `cards are off when blocks cannot be added`, `quick action delete is off when canDelete is false`, `menu duplicate line is off when canDuplicate is false`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** unit tests, `pnpm e2e`, `pnpm perf`, `tsc`, `pnpm lint`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(editor): the interface turns off what the permissions refuse`.

### Task 5: Hide

**Files:**
- Create: `packages/editor/src/hide.ts` (`HideName`, `useHidden(name): boolean`, context)
- Modify: `Toolbar.tsx`, `Rail.tsx`, `StartPanel.tsx`, `EndPanel.tsx`, `QuickActions` draw site, context menu draw site, align/distribute/anchors/phone-reset sections of `PropertiesPanel.tsx`, `Editor.tsx` (`hide` prop and context), `index.ts`
- Test: `packages/editor/src/hide.test.tsx`

**Interfaces:**
- Produces: `export type HideName = "header" | "rail" | ...` (the union in Global Constraints); `useHidden(name: HideName): boolean`; each named part returns `null` (or omits its buttons) when hidden; an open tool that is hidden falls back on the first tool left; unknown names warn once.

- [ ] **Step 1: Write failing tests**: one per group (`a hidden place is not drawn`, `hidden header parts are absent and the rest stays`, `a hidden tool is absent from the rail and the panel shows the first tool left`, `props.align, props.anchors and props.phone hide their sections`), `an unknown name warns once`, `hiding does not stop the command` (`editor.undo()` still works with `header.undo` hidden).
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** unit tests, `pnpm e2e`, `pnpm perf`, `tsc`, `pnpm lint`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(editor): hide parts of the interface by name`.

### Task 6: Playground demo and e2e

**Files:**
- Create: `apps/playground/src/PermissionsDemo.tsx`, `e2e/permissions.spec.ts`; modify `apps/playground/src/App.tsx` (`?permissions`, `?permissions&viewer`)

**Interfaces:**
- Consumes: everything above, from `@midito-kitchen/editor`.
- Produces: a demo where the page's footer block is locked by id (`canDelete`, `canDrag`, `canEdit` false for it) and a `?viewer` variant where everything is off; a host notice (`data-testid="denied"`) fed by `onDenied`; `hide` of `tool.themes` and `props.anchors`.

- [ ] **Step 1: Write failing e2e**: `the Delete key, the menu line and editor.remove() all refuse the locked block`, `dragging and nudging the locked block change nothing and the host is told once`, `the locked block's fields are read-only`, `a viewer can select and look but nothing changes`, `hidden parts are absent`, `a refused action shows the host's notice`, `undo still works after other changes with the locked block present`; each also under `E2E_STRICT=1`.
- [ ] **Step 2: Run** `pnpm e2e e2e/permissions.spec.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the demo and branches.
- [ ] **Step 4: Run** `pnpm e2e` and `E2E_STRICT=1 pnpm e2e`. Expected: all pass.
- [ ] **Step 5: Commit** `test(e2e): a host locks blocks and hides parts through permissions`.

### Task 7: Docs, surface and numbers

**Files:**
- Modify: `packages/editor/README.md`, `ARCHITECTURE.md`, `docs/superpowers/specs/2026-10-31-m0-render-baseline.md`, snapshots (add `store/permissions.ts` types and `hide.ts` to `public-surface.test.ts`)

- [ ] **Step 1: Regenerate** snapshots with `pnpm exec vitest run packages/editor/src/public-surface.test.ts -u`; read the diff: only the new names.
- [ ] **Step 2: Docs**: README "Control what people can do" (permissions table with what each asks, the sorting in plain words, locking by a function of the node, `onDenied`, `hide` names table, the warning that the server must check again, what is not governed: undo, Save); `ARCHITECTURE.md` "Permissions" (the chokepoint and why); baseline: M3 size row and the perf line.
- [ ] **Step 3: Run** `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm e2e`, `E2E_STRICT=1 pnpm e2e`, `pnpm build`, `pnpm perf`. Expected: all green, perf as in Global Constraints.
- [ ] **Step 4: Commit** `docs: permissions and hide, their surface and their numbers`.
