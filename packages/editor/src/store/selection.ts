import { findNode, parentOf, type TreeNode } from "@midito-kitchen/core";
import { change } from "./change";
import type { EditorStore } from "./create-editor-store";
import type { Editing, SelectionState } from "./state";

// The rules of the selection, as plain functions of the state. Like the commands on the view, they
// give back the very state they were handed when nothing changes.

/** Nothing selected, working on the page. */
export function initialSelectionState(rootId: string): SelectionState {
  return { selectedId: null, picked: [], scopeId: rootId, hoverId: null, editing: null };
}

/** One block selected (or none), nothing picked, working inside `scopeId`. */
export const selectOnly = <S extends SelectionState>(
  state: S,
  id: string | null,
  scopeId: string,
): S => change(state, { selectedId: id, picked: [] as string[], scopeId } as Partial<S>);

/** A block selected and the scope set, without letting go of the blocks picked. */
export const selectInside = <S extends SelectionState>(state: S, id: string, scopeId: string): S =>
  change(state, { selectedId: id, scopeId } as Partial<S>);

/** The first is the selected one and the others are picked; the scope stays unless one is given. */
export const selectMany = <S extends SelectionState>(
  state: S,
  ids: readonly string[],
  scopeId?: string,
): S =>
  change(state, {
    selectedId: ids[0] ?? null,
    picked: ids.slice(1),
    ...(scopeId === undefined ? {} : { scopeId }),
  } as Partial<S>);

/** The same as `selectMany`, with the main one last: the blocks a paste, a copy or a group makes. */
export const selectManyLast = <S extends SelectionState>(
  state: S,
  ids: readonly string[],
  scopeId?: string,
): S =>
  change(state, {
    selectedId: ids.at(-1) ?? null,
    picked: ids.slice(0, -1),
    ...(scopeId === undefined ? {} : { scopeId }),
  } as Partial<S>);

/** Nothing selected; the scope stays where it is. */
export const clearSelection = <S extends SelectionState>(state: S): S =>
  change(state, { selectedId: null, picked: [] as string[] } as Partial<S>);

/** Back to the page: nothing selected and the scope is the page. */
export const selectPage = <S extends SelectionState>(state: S, rootId: string): S =>
  change(state, { selectedId: null, picked: [] as string[], scopeId: rootId } as Partial<S>);

/** Blocks added to the ones picked, except the selected one and those already picked. */
export const addPicks = <S extends SelectionState>(state: S, ids: readonly string[]): S => {
  const more = ids.filter((id, at) => id !== state.selectedId && ids.indexOf(id) === at);
  return change(state, {
    picked: [...state.picked, ...more.filter((id) => !state.picked.includes(id))],
  } as Partial<S>);
};

/** A block picked, or put back if it was picked. */
export const togglePick = <S extends SelectionState>(state: S, id: string): S =>
  change(state, {
    picked: state.picked.includes(id)
      ? state.picked.filter((other) => other !== id)
      : [...state.picked, id],
  } as Partial<S>);

/** The blocks picked besides the selected one, dropped. */
export const clearPicked = <S extends SelectionState>(state: S): S =>
  change(state, { picked: [] as string[] } as Partial<S>);

export const setHover = <S extends SelectionState>(state: S, hoverId: string | null): S =>
  change(state, { hoverId } as Partial<S>);

export const setEditing = <S extends SelectionState>(state: S, editing: Editing | null): S =>
  change(state, { editing } as Partial<S>);

/**
 * The selection after the page changed: whatever points at a block that is gone is let go of. The
 * blocks picked have to be there and be children of the parent of the selected one; the scope goes
 * back to the page when its group is gone. After this, every id the selection holds is in the page.
 */
export function reconcile<S extends SelectionState>(state: S, root: TreeNode): S {
  const there = (id: string) => findNode(root, id) !== undefined;
  const selectedId = state.selectedId !== null && there(state.selectedId) ? state.selectedId : null;
  const parent = selectedId === null ? undefined : parentOf(root, selectedId)?.id;
  const picked =
    parent === undefined
      ? []
      : state.picked.filter(
          (id, at) =>
            id !== selectedId &&
            state.picked.indexOf(id) === at &&
            parentOf(root, id)?.id === parent,
        );
  return change(state, {
    selectedId,
    picked,
    scopeId: there(state.scopeId) ? state.scopeId : root.id,
    hoverId: state.hoverId !== null && there(state.hoverId) ? state.hoverId : null,
    editing: state.editing !== null && there(state.editing.id) ? state.editing : null,
  } as Partial<S>);
}

/**
 * One step back or forward in the history: what is still pending is dropped, the selection stays if
 * its block does, and the blocks picked do not.
 */
export const afterStep = <S extends SelectionState>(state: S, root: TreeNode): S =>
  clearPicked(reconcile(state, root));

/** The commands tied to a store, as for the view. */
export function selectionCommands<S extends SelectionState>(store: EditorStore<S>) {
  const run = (command: (state: S) => S) => store.setState(command);
  return {
    selectOnly: (id: string | null, scopeId: string) =>
      run((state) => selectOnly(state, id, scopeId)),
    selectInside: (id: string, scopeId: string) => run((state) => selectInside(state, id, scopeId)),
    selectMany: (ids: readonly string[], scopeId?: string) =>
      run((state) => selectMany(state, ids, scopeId)),
    selectManyLast: (ids: readonly string[], scopeId?: string) =>
      run((state) => selectManyLast(state, ids, scopeId)),
    clearSelection: () => run(clearSelection),
    selectPage: (rootId: string) => run((state) => selectPage(state, rootId)),
    addPicks: (ids: readonly string[]) => run((state) => addPicks(state, ids)),
    togglePick: (id: string) => run((state) => togglePick(state, id)),
    setHover: (id: string | null) => run((state) => setHover(state, id)),
    setEditing: (editing: Editing | null) => run((state) => setEditing(state, editing)),
    reconcile: (root: TreeNode) => run((state) => reconcile(state, root)),
    afterStep: (root: TreeNode) => run((state) => afterStep(state, root)),
  };
}

export type SelectionCommands = ReturnType<typeof selectionCommands<SelectionState>>;
