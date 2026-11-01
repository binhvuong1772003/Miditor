import {
  canInsert,
  duplicateNode,
  findNode,
  groupNodes,
  insertNode,
  type NewNodeOverrides,
  newNode,
  nextId,
  type PageData,
  pasteNodes,
  type Reorder,
  removeNode,
  reorderNode,
  type TreeNode,
  ungroupNode,
  updateNode,
} from "@midito-kitchen/core";
import { placeAt } from "../drop-place";
import { applyPatch } from "./apply-patch";
import type { EditorStore } from "./create-editor-store";
import { type Env, edit, editAndEndDraft, setDraft } from "./document";
import { clearSelection, reconcile, selectMany, selectManyLast, selectOnly } from "./selection";
import type { DocumentState, SelectionState, ViewState } from "./state";

// The commands that add, take away, copy, group and reorder blocks. Each reads what is selected from
// the state it is given, changes the page and the selection in one go, and gives back the very state
// when there was nothing to do. The measures that only the screen knows (the size of a block, of its
// parent) are handed in by the part that took them.

export type State = DocumentState & SelectionState & ViewState;

/** A width and a height in px, as the screen measured them. */
export type Size = { w: number; h: number };
/** A place in px. */
export type Point = { x: number; y: number };

/** A change that is pending in a panel is stored first, as before anything else that changes the page. */
export function settle<S extends State>(state: S, env: Env): S {
  const pending = state.draft;
  if (!pending) return state;
  return editAndEndDraft(
    state,
    (page) => {
      const root = updateNode(page.root, pending.id, (n) =>
        applyPatch(n, pending, state.frame, env.registry),
      );
      return root === page.root ? page : { ...page, root };
    },
    env.limit,
  );
}

const rootOf = (state: DocumentState) => state.history.present.root;
const withRoot =
  (make: (root: TreeNode) => TreeNode) =>
  (page: PageData): PageData => {
    const root = make(page.root);
    return root === page.root ? page : { ...page, root };
  };

/** The selected block and the ones picked with it, the main one first. */
const selection = (state: SelectionState): string[] =>
  state.selectedId === null ? [] : [state.selectedId, ...state.picked];

/**
 * A new block of `kind`, selected. It goes inside the selected block when that kind lets blocks in
 * (`inside` is the size of the selected block), and on the page otherwise, in the middle of it
 * (`page` is the size of the page as drawn).
 */
export function addBlock<S extends State>(
  state: S,
  args: { kind: string; overrides?: NewNodeOverrides | undefined; inside: Size; page: Size },
  env: Env,
): S {
  if (state.frame === "phone") return state;
  const settled = settle(state, env);
  const root = rootOf(settled);
  const id = nextId(root);
  const selected = settled.selectedId ? findNode(root, settled.selectedId) : undefined;
  const inner = selected
    ? newNode(env.registry, args.kind, id, args.inside, args.overrides)
    : undefined;
  const intoSelected = inner && selected && canInsert(env.registry, root, selected.id, inner);
  const parentId = intoSelected && selected ? selected.id : root.id;
  const node = intoSelected
    ? inner
    : newNode(env.registry, args.kind, id, args.page, args.overrides);
  if (!node) return settled;
  return selectOnly(
    edit(
      settled,
      withRoot((tree) => insertNode(tree, parentId, node)),
      env.limit,
    ),
    id,
    parentId,
  );
}

/**
 * A card from the library let go over the block `parentId`: a block of `kind` is added there. `at` is
 * where the pointer is in that block, or nothing for a parent that is turned, which has no simple map
 * from the screen: the block then goes in its middle.
 */
export function dropBlock<S extends State>(
  state: S,
  args: { kind: string; parentId: string; container: Size; at: Point | null },
  env: Env,
): S {
  const settled = settle(state, env);
  const root = rootOf(settled);
  const id = nextId(root);
  const made = newNode(env.registry, args.kind, id, args.container);
  if (!made) return settled;
  const node = args.at ? placeAt(made, args.container, args.at) : made;
  return selectOnly(
    edit(
      settled,
      withRoot((tree) => insertNode(tree, args.parentId, node)),
      env.limit,
    ),
    id,
    args.parentId,
  );
}

/** A copy of each selected block, a little down and to the right, selected in place of them. */
export function duplicateSelected<S extends State>(
  state: S,
  args: { container: Size | null },
  env: Env,
): S {
  const { selectedId } = state;
  const root0 = rootOf(state);
  if (state.frame === "phone" || !selectedId || selectedId === root0.id || !args.container) {
    return state;
  }
  const settled = settle(state, env);
  const options = { shift: { x: 16, y: 16 }, container: args.container };
  const originals = selection(settled);
  // Each copy is made on the tree the one before left, so the ids the copies get are known now.
  const copies: string[] = [];
  let root = rootOf(settled);
  for (const id of originals) {
    const copy = nextId(root);
    const next = duplicateNode(root, id, options);
    if (next !== root) copies.push(copy);
    root = next;
  }
  if (copies.length === 0) return settled;
  return selectManyLast(
    edit(
      settled,
      withRoot((tree) => originals.reduce((acc, id) => duplicateNode(acc, id, options), tree)),
      env.limit,
    ),
    copies,
  );
}

/** The selected blocks become one group, selected, where they were. */
export function groupSelected<S extends State>(
  state: S,
  args: { container: Size | null },
  env: Env,
): S {
  if (state.frame === "phone") return state;
  if (!state.selectedId || state.picked.length === 0 || !args.container) return state;
  const settled = settle(state, env);
  const ids = selection(settled);
  const root = rootOf(settled);
  const id = nextId(root);
  const container = args.container;
  if (groupNodes(root, ids, id, container) === root) return settled;
  return selectMany(
    edit(
      settled,
      withRoot((tree) => groupNodes(tree, ids, id, container)),
      env.limit,
    ),
    [id],
  );
}

/** The selected group is gone and its blocks are selected, each where it was on the page. */
export function ungroupSelected<S extends State>(
  state: S,
  args: { container: Size | null },
  env: Env,
): S {
  if (state.frame === "phone" || !args.container || !state.selectedId) return state;
  const group = findNode(rootOf(state), state.selectedId);
  if (group?.type !== "Group") return state;
  if (ungroupNode(rootOf(state), group.id, args.container) === rootOf(state)) return state;
  const members = group.children.map((child) => child.id);
  const container = args.container;
  return selectManyLast(
    edit(
      state,
      withRoot((tree) => ungroupNode(tree, group.id, container)),
      env.limit,
    ),
    members,
  );
}

/** The selected block and everything in it is gone. The root cannot be deleted. */
export function deleteSelected<S extends State>(state: S, env: Env): S {
  if (state.frame === "phone") return state;
  if (!state.selectedId || state.selectedId === rootOf(state).id) return state;
  const gone = selection(state);
  const next = edit(
    setDraft(state, null),
    withRoot((tree) => gone.reduce((acc, id) => removeNode(acc, id), tree)),
    env.limit,
  );
  return reconcile(clearSelection(next), rootOf(next));
}

/** The selected block one place or all the way up or down among its siblings. Only the main one. */
export function reorderSelected<S extends State>(state: S, to: Reorder, env: Env): S {
  if (state.frame === "phone" || !state.selectedId || state.selectedId === rootOf(state).id) {
    return state;
  }
  const settled = settle(state, env);
  const id = state.selectedId;
  return edit(
    settled,
    withRoot((tree) => reorderNode(tree, id, to)),
    env.limit,
  );
}

/**
 * Blocks from the clipboard pasted into `parentId`, a little further down and to the right (`shift`),
 * and selected. `pasted` tells whether any block was pasted, for the part that counts the pastes.
 */
export function pasteBlocks<S extends State>(
  state: S,
  args: {
    nodes: readonly TreeNode[];
    parentId: string;
    container: Size;
    shift: { x: number; y: number };
  },
  env: Env,
): { state: S; pasted: boolean } {
  if (state.frame === "phone") return { state, pasted: false };
  const settled = settle(state, env);
  const done = pasteNodes(rootOf(settled), args.parentId, args.nodes, {
    shift: args.shift,
    container: args.container,
  });
  if (done.ids.length === 0) return { state: settled, pasted: false };
  return {
    state: selectMany(
      edit(
        settled,
        withRoot(
          (tree) =>
            pasteNodes(tree, args.parentId, args.nodes, {
              shift: args.shift,
              container: args.container,
            }).root,
        ),
        env.limit,
      ),
      done.ids,
      args.parentId,
    ),
    pasted: true,
  };
}

/** The commands tied to a store. */
export function structureCommands<S extends State>(store: EditorStore<S>, env: Env) {
  const run = (command: (state: S) => S) => store.setState(command);
  return {
    addBlock: (args: Parameters<typeof addBlock>[1]) => run((state) => addBlock(state, args, env)),
    dropBlock: (args: Parameters<typeof dropBlock>[1]) =>
      run((state) => dropBlock(state, args, env)),
    duplicateSelected: (container: Size | null) =>
      run((state) => duplicateSelected(state, { container }, env)),
    groupSelected: (container: Size | null) =>
      run((state) => groupSelected(state, { container }, env)),
    ungroupSelected: (container: Size | null) =>
      run((state) => ungroupSelected(state, { container }, env)),
    deleteSelected: () => run((state) => deleteSelected(state, env)),
    reorderSelected: (to: Reorder) => run((state) => reorderSelected(state, to, env)),
    /** What is pending in a panel is stored. */
    settleDraft: () => run((state) => settle(state, env)),
    /** Whether any block was pasted. */
    pasteBlocks: (args: Parameters<typeof pasteBlocks>[1]): boolean => {
      let pasted = false;
      run((state) => {
        const done = pasteBlocks(state, args, env);
        pasted = done.pasted;
        return done.state;
      });
      return pasted;
    },
  };
}

export type StructureCommands = ReturnType<typeof structureCommands<State>>;
