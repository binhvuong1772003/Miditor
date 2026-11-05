# Layers drag and drop with dnd-kit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In the Layers tab, rows can be dragged, with the pointer or the keyboard, to change the order of blocks and to put a block into another block, as one step of history, keeping the block where it is on the page.

**Architecture:** `@dnd-kit/react` (pinned) gives the sensors, the lifted row and the keyboard drag; our own pure module decides where a drop lands (above, inside or below a row) and our own store command writes it. Nothing on the canvas changes: `react-moveable` and the canvas gestures are not touched. The command reuses `moveNode` and `reparentNode` of core, so permissions (`canDrag`), phone and history work like every other change.

**Tech Stack:** React 19, `@dnd-kit/react` 0.5.3, vitest (node, no DOM), Playwright e2e, biome.

**Spec:** none written. The decisions are in the memory note `dnd-feel` ("approach 3", owner agreed 2026-11-04): dnd-kit does structure, Moveable keeps geometry; Layers first because it lives only in the main document; the Blocks-panel cards come in a later plan. Keyboard drag onto the canvas is out of scope.

## Global Constraints

- Pin dnd-kit to an exact version: `"@dnd-kit/react": "0.5.3"` (no `^`), as `react-moveable` is pinned. The package is 0.x and Puck pins 0.4.0.
- Raise the editor budget in `budgets.json` in the same commit that adds the dependency, to the measured size plus about 3%, and say the new numbers in the commit body.
- Commits: small, one logical change each, imperative English, conventional style (`feat:`, `fix:`, `refactor:`, `test:`, `chore:`), no AI mention, no trailer.
- After every code step: `npx biome check --write .` (never `--unsafe`), `pnpm -r exec tsc --noEmit`, `pnpm build` before any e2e (the playground reads `dist`).
- e2e must pass in both modes: `E2E_STRICT=1 npx playwright test` and `E2E_INLINE=1 E2E_STRICT=1 npx playwright test`.
- Unit tests have no DOM (vitest node): test pure functions with plain objects.
- Do not touch `SelectionBox.tsx`, `useGestures.ts` behaviour, or the iframe code, other than the refactor in Task 3.
- All user-visible text goes through `t(...)` with a key in `i18n/en.ts` and `locales/vi.ts`.
- Reading rects: a page px is `zoom` in the rects of an element on the screen and `1` in the frame of the page (see `unit` in `useGestures.ts`). Every measure of a block uses that, or it is wrong off 100%.

## Review Focus

- A click on a row still selects it; a small movement must not start a drag.
- A row cannot be dropped into itself or into what is inside it; dropping where it already is changes nothing and makes no step of history.
- Which parent a drop between two rows of different depth belongs to: it follows the row dropped over and the zone, never the depth of the row above.
- The block stays where it is on the page after it changes parent, with the canvas at 100% and at 50%, in a frame and in place.
- Keyboard: Space lifts, arrows move, Space drops, Escape cancels only the drag (it must not clear the selection), and focus ends on the moved row. The list's own Arrow keys must not fight the drag.
- Refused changes: `canDrag` false for a block gives `onDenied` and no change; the phone screen gives no drag; one Undo takes back a drop.

## File Structure

- Create `packages/editor/src/layer-drop.ts` (+ `.test.ts`): pure rules of where a drop lands.
- Create `packages/editor/src/canvas/frames.ts` (+ `.test.ts`): `pageUnit` and `frameOfElement`, taken out of `useGestures.ts`.
- Modify `packages/editor/src/canvas/useGestures.ts`: use `frames.ts` (refactor only).
- Modify `packages/editor/src/store/geometry.ts`, `store/document.ts` (types): the command `moveBlock`.
- Modify `packages/editor/src/LayersPanel.tsx`, `LayersPanel.module.css`: the drag.
- Modify `packages/editor/src/StartPanel.tsx`, `Editor.tsx`: wire `onMove`.
- Modify `packages/editor/src/i18n/en.ts`, `locales/vi.ts`: strings.
- Create `e2e/layers-drag.spec.ts`.
- Modify `packages/editor/package.json`, `budgets.json`, `packages/editor/README.md`.

### Task 1: Add the dependency and raise the budget

**Files:** Modify `packages/editor/package.json`, `budgets.json`, lockfile.

**Interfaces:**
- Produces: `@dnd-kit/react` importable from `packages/editor/src`.

- [ ] **Step 1: Add `"@dnd-kit/react": "0.5.3"` to `dependencies` of `packages/editor/package.json` and run `pnpm install`.** Check that `@dnd-kit/dom`, `abstract`, `geometry`, `state`, `collision` came in at 0.5.3 too (`pnpm why @dnd-kit/dom`).
- [ ] **Step 2: Import it once so it is in the bundle** (a throwaway `export` is not allowed: do this in Task 4; for now only measure with a scratch import in a file you do not commit), run `pnpm build` and `pnpm size`. Expected: the editor grows by about 31 to 39 kB gzip.
- [ ] **Step 3: Set the editor limits in `budgets.json` to the measured raw and gzip sizes of the final build of Task 4, plus about 3%.** Until then leave them and do not commit a failing `pnpm size`: commit this task together with Task 4's first working build, or raise the limits here to a number you then tighten.
- [ ] **Step 4: Commit** `chore(editor): add dnd-kit, pinned, and raise the editor size budget`.

### Task 2: Where a drop lands (pure)

**Files:** Create `packages/editor/src/layer-drop.ts`, `packages/editor/src/layer-drop.test.ts`.

**Interfaces:**
- Consumes: `canMove(registry, root, id, newParentId)`, `findNode`, `parentOf` from `@miditor/core`; `TreeNode`, `Registry`.
- Produces:

```ts
export type DropZone = "above" | "inside" | "below";
export interface LayerPlace {
  parentId: string;
  /** As in `moveNode`: counts the children of the new parent without the moved block; the last place is the topmost. */
  index: number;
  zone: DropZone;
  overId: string;
}
/** The zone of a row at `offset` px down its `height`; the middle half is "inside" when the row can hold blocks, else halves. */
export function zoneAt(offset: number, height: number, canHold: boolean): DropZone;
/** Where dragging `draggedId` over row `overId` in `zone` would put it; `undefined` when it may not go there or would stay where it is. */
export function placeFor(args: {
  root: TreeNode;
  registry: Registry;
  draggedId: string;
  overId: string;
  zone: DropZone;
}): LayerPlace | undefined;
```

The list shows the topmost block first and the last child is drawn on top, so "above" a row means a higher place, that is a larger index.

- [ ] **Step 1: Write the failing tests** in `layer-drop.test.ts`. Build a small tree with a registry in which `Container` has `canContain: true` and `Text` does not (copy the shape from `layer-tree.test.ts`). Cases, each an `it`:
  - `zoneAt(2, 40, true)` is `"above"`, `zoneAt(20, 40, true)` is `"inside"`, `zoneAt(38, 40, true)` is `"below"`; with `canHold` false `zoneAt(10, 40, false)` is `"above"` and `zoneAt(30, 40, false)` is `"below"`.
  - Root children `[a, b, c]` (c on top): dragging `a` "above" `c` gives `{ parentId: "root", index: 2 }` (the siblings without `a` are `[b, c]`, above `c` is after it); "below" `b` gives `{ parentId: "root", index: 0 }`.
  - "inside" a `Container` `box` with children `[x, y]` gives `{ parentId: "box", index: 2 }`; inside a `Text` gives `undefined`.
  - Over itself, over a descendant of itself as "inside", and over the root: `undefined`.
  - A drop that leaves the order as it is, such as `b` "below" `c`'s… (choose the case where the result equals the current order): `undefined`.
  - Dropping "above" a row that is a child of `box` gives `parentId: "box"`, whatever the depth of the row above it in the list.
- [ ] **Step 2: Run** `cd packages/editor && npx vitest run src/layer-drop.test.ts`. Expected: FAIL, module missing.
- [ ] **Step 3: Implement `zoneAt` and `placeFor`.** For "above" and "below" the parent is `parentOf(root, overId)` and the index comes from the position of `overId` among the parent's children without `draggedId` (`k`: above is `k + 1`, below is `k`). For "inside" the parent is `overId` and the index is its children count without `draggedId`. Refuse with `canMove(registry, root, draggedId, parentId)`. Return `undefined` when `parentId` is the current parent and the new index equals the current index of the block among its siblings.
- [ ] **Step 4: Run the tests.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(editor): rules for where a dragged layer lands`.

### Task 3: Share the measure of a frame (refactor)

**Files:** Create `packages/editor/src/canvas/frames.ts`, `frames.test.ts`; modify `canvas/useGestures.ts`.

**Interfaces:**
- Produces:

```ts
/** What a page px is in the rects of a block: `zoom` when the block is on the screen, 1 in the frame of the page. */
export function pageUnit(element: HTMLElement, zoom: number, main?: Document): number;
/** A block's padding box, where its middle is and how far it is turned, in page px. */
export function frameOfElement(element: HTMLElement, unit: number, rotation: number): Frame; // Frame from @miditor/core
```

- [ ] **Step 1: Failing tests** with plain-object elements: `pageUnit({ ownerDocument: main }, 0.5, main)` is `0.5`; with another `ownerDocument` it is `1`. `frameOfElement` returns `{ size: { w: clientWidth, h: clientHeight }, center: { x: (left + width / 2) / unit, y: ... }, rotation }` for an element with `clientWidth`, `clientHeight` and `getBoundingClientRect()`.
- [ ] **Step 2: Run, FAIL. Step 3: implement** by moving the body of `frameOfElement` out of `dropTarget` in `useGestures.ts` and the `unit` line (`block && block.ownerDocument !== document ? 1 : zoom`) into `pageUnit`; `useGestures.ts` calls them.
- [ ] **Step 4: Run unit tests and the e2e files `gestures`, `reparent-position`, `document`** in both modes. Expected: PASS, nothing else changed.
- [ ] **Step 5: Commit** `refactor(editor): measure a frame in one place`.

### Task 4: The command that moves a block among layers

**Files:** Modify `packages/editor/src/store/geometry.ts`, `store/document.ts`; test `store/layers-move.test.ts`.

**Interfaces:**
- Consumes: `moveNode`, `reparentNode`, `parentOf`, `findNode`, `Frame` from core; `edit`, `withRoot`, `settle` helpers as `moveToParent` uses them.
- Produces on the documents commands: `moveBlock(args: { id: string; parentId: string; index: number; options?: { from: Frame; to: Frame } }): void`. Action types: `"block.reorder"` when the parent does not change, `"block.reparent"` when it does (both already exist).

- [ ] **Step 1: Failing tests** (model them on `store/actions.test.ts`): reorder within the page changes the order and is one step of history that Undo takes back; moving into a box with `options` frames keeps the block's place on the page (assert `moveBetweenFrames` result, as in the core test of `reparentNode`); without `options` a change of parent is refused (state unchanged); on the phone screen nothing changes; a block into itself changes nothing.
- [ ] **Step 2: Run, FAIL. Step 3: implement `moveBlock`** next to `moveToParent`: same parent → `moveNode(root, id, parentId, index)`; other parent → `reparentNode(root, id, parentId, { ...options, index })`; no step of history when the tree is the same. Register it in `geometryCommands` with the right `type`.
- [ ] **Step 4: Run tests. Step 5: Commit** `feat(editor): a command to move a block among layers`.

### Task 5: Drag the rows

**Files:** Modify `LayersPanel.tsx`, `LayersPanel.module.css`, `StartPanel.tsx`, `i18n/en.ts`, `locales/vi.ts`.

**Interfaces:**
- Consumes: `placeFor`, `zoneAt` (Task 2); from `@dnd-kit/react`: `DragDropProvider` (`onDragStart`, `onDragOver`, `onDragEnd`), `useDraggable({ id, handle })` returning `{ ref, handleRef, isDragging }`, `useDroppable({ id })` returning `{ ref, isDropTarget }`, `DragOverlay`.
- Produces: new props on `LayersPanelProps`: `onMove?: (id: string, parentId: string, index: number) => void` and `disabled?: boolean` (true on the phone screen and when the editor is read only, as the other editing parts decide). Each row gets a grip button (`data-layer-grip`, name `t("layers.move", { name })`) that is the drag handle for the pointer and the keyboard.

- [ ] **Step 1: Spike, in a file you do not commit,** mount a `DragDropProvider` with two rows and log the argument of `onDragOver` and `onDragEnd` to learn what `event.operation` holds (`source`, `target`, `canceled`, `position.current`) and where the keyboard sensor puts `position`. Write what you found as a comment above the handler you write in Step 3. If the pointer position is not available for a keyboard drag, use the centre of the lifted row's rect instead.
- [ ] **Step 2: Failing e2e** `e2e/layers-drag.spec.ts` (first test only): open Layers, drag the grip of the `sample` row onto the lower half of the `sample-2` row, expect the order on the page changed (`blocks(page)` order, or the row order in the list). Run, FAIL.
- [ ] **Step 3: Implement.** Wrap the `ul` in `DragDropProvider`. Each `li`: `useDraggable({ id, handle })` and `useDroppable({ id })`, both refs set on the `li`. While dragging, compute `zoneAt` from the pointer (or lifted-row centre) against the `li` rect under it, `placeFor` for the result; store `{ overId, zone }` in state to draw an insertion line (above, below) or a tint (inside) with `data-drop="above|inside|below"` and CSS in `LayersPanel.module.css`; draw nothing when `placeFor` is `undefined`. On `onDragEnd` not canceled and with a place, call `onMove(id, place.parentId, place.index)`. Use `DragOverlay` for the lifted row. `PointerSensor` activation: a movement of 4 px, so a click never starts a drag. Keep the existing `keys` handler; it must ignore keys while a drag is on.
- [ ] **Step 4: Strings:** `layers.move` ("Move {name}" / "Di chuyển {name}"), `layers.moved` ("{name} moved into {parent}", "Đã đưa {name} vào {parent}"), `layers.movedPage` ("{name} moved onto the page", "Đã đưa {name} ra trang"), `layers.reordered` ("{name} moved", "Đã đổi chỗ {name}").
- [ ] **Step 5: Run the e2e from Step 2 until PASS, then `layer-tree.test.ts`, unit tests, lint.** Commit `feat(editor): drag rows in Layers with dnd-kit`.
- [ ] **Step 6: Now set the budget (Task 1 Step 3) from `pnpm size` and commit it** with the dependency commit if still open, else `chore(editor): size budget for dnd-kit`.

### Task 6: Wire it to the page

**Files:** Modify `Editor.tsx`, `StartPanel.tsx`.

**Interfaces:**
- Consumes: `documents.moveBlock` (Task 4), `frameOfElement`, `pageUnit` (Task 3), `elementOf(workspace, id)`, `turnOf(root, id, frame)`, `announce`, `note`.
- Produces: `moveLayer(id, parentId, index)` in `Editor.tsx`, given to `LayersPanel` as `onMove`.

- [ ] **Step 1: Failing e2e** (second test of `layers-drag.spec.ts`): put a Text block (`addFromBlocks`) on the page, drag its grip onto the middle of the `sample` row, expect the block inside `sample` on the page (`surface(page).locator('[data-miditor-id="sample"] [data-miditor-id="n1"]')`) **and its middle on the screen within 1.5 px of where it was before**, at zoom 100% and after two `Zoom out` clicks.
- [ ] **Step 2: Implement `moveLayer`:** when the parent is the same call `documents.moveBlock({ id, parentId, index })`; otherwise measure `from` (the current parent's element) and `to` (the new parent's element) with `frameOfElement(el, pageUnit(el, zoom), turnOf(...))` and call `documents.moveBlock({ id, parentId, index, options: { from, to } })`. Keep the moved block selected. Announce with the strings of Task 5.
- [ ] **Step 3: Run** the e2e, then the whole suite in both modes. Expected: PASS.
- [ ] **Step 4: Commit** `feat(editor): Layers moves blocks on the page`.

### Task 7: Keyboard, permissions, phone, undo, docs

**Files:** Modify `e2e/layers-drag.spec.ts`, `LayersPanel.tsx` as needed, `packages/editor/README.md`.

- [ ] **Step 1: Failing e2e, one test each:** (a) keyboard: focus a row's grip, `Space`, `ArrowDown`, `Space`, expect the order changed and focus on the moved row's grip; (b) `Escape` during a keyboard drag cancels it and leaves the selection as it was; (c) one `Undo` takes back a drop (page and order as before); (d) with `permissions={{ canDrag: false }}` (see `permissions.spec.ts` for how the playground sets it) a drop changes nothing and `onDenied` is told; (e) on the phone screen the grips are not shown.
- [ ] **Step 2: Fix what fails** (most likely: `Escape` forwarded to the editor root clears the selection; `keys` handler of the list takes the arrows during a drag).
- [ ] **Step 3: README:** a short section "Reordering blocks in Layers" (pointer and keyboard, what the line and the tint mean, that it is one step of history and obeys `canDrag`).
- [ ] **Step 4: Run lint, typecheck, unit, e2e in both modes, `pnpm size`.** Commit `test(editor): keyboard, permissions and undo for dragging layers` and `docs(editor): reordering blocks in Layers`.
