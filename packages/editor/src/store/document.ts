import type { PageData, Registry } from "@midito-kitchen/core";
import { amend, commit, createHistory, type History } from "../history";
import { change } from "./change";
import type { EditorStore } from "./create-editor-store";
import { afterStep } from "./selection";
import type { DocumentState, Draft, SelectionState } from "./state";

/**
 * What a command needs besides the state, and that the host can change while the editor is open:
 * how many steps of history are kept, and the kinds of block there are. It is read when a command runs.
 */
export type Env = { limit: unknown; registry: Registry };

// The commands on the page being edited. Like the others they are plain functions of the state, and
// they give back the very state when nothing changes: a page that comes out of a change as the same
// object is no step of history and is no change for the host.

/** A page just opened: nothing to undo, nothing changed since it was saved. */
export function initialDocumentState(page: PageData): DocumentState {
  return { history: createHistory(page), savedPage: page, draft: null, waiting: false };
}

/** Stores one change as one step. */
export function edit<S extends DocumentState>(
  state: S,
  make: (page: PageData) => PageData,
  limit: unknown,
): S {
  const history = commit(state.history, make(state.history.present), limit);
  return change(state, { history } as Partial<S>);
}

/** Like `edit`, and what is pending in a panel is over: it was stored, or it is dropped. */
export function editAndEndDraft<S extends DocumentState>(
  state: S,
  make: (page: PageData) => PageData,
  limit: unknown,
): S {
  const history = commit(state.history, make(state.history.present), limit);
  return change(state, { history, draft: null } as Partial<S>);
}

/** Puts a change into the step before it, so a run of small ones (a held arrow key) is one step to undo. */
export function editInLastStep<S extends DocumentState>(
  state: S,
  make: (page: PageData) => PageData,
  limit: unknown,
): S {
  const history = amend(state.history, make(state.history.present), limit);
  return change(state, { history } as Partial<S>);
}

export const setWaiting = <S extends DocumentState>(state: S, waiting: boolean): S =>
  change(state, { waiting } as Partial<S>);

export const setDraft = <S extends DocumentState>(state: S, draft: Draft | null): S =>
  change(state, { draft } as Partial<S>);

/**
 * One step back or forward. What is pending is dropped, and the selection stays if its block does
 * (see `afterStep`). It is all one change, so nothing is drawn with the page of one and the selection
 * of the other.
 */
export function step<S extends DocumentState & SelectionState>(
  state: S,
  move: (history: History<PageData>) => History<PageData>,
): S {
  const history = move(state.history);
  return afterStep(change(state, { history, draft: null } as Partial<S>), history.present.root);
}

/** The page as it is now counts as saved. */
export const markSaved = <S extends DocumentState>(state: S): S =>
  change(state, { savedPage: state.history.present } as Partial<S>);

/**
 * Save: what is pending in a panel (`make`, when there is some) is stored first, and the page that
 * comes out of it, the same one the host is given, counts as saved.
 */
export function saveWith<S extends DocumentState>(
  state: S,
  make: ((page: PageData) => PageData) | null,
  limit: unknown,
): S {
  const stored = make ? editAndEndDraft(state, make, limit) : state;
  return markSaved(stored);
}

/** The commands tied to a store. `env.limit` is read each time, because the host can change it. */
export function documentCommands<S extends DocumentState & SelectionState>(
  store: EditorStore<S>,
  env: Env,
) {
  const run = (command: (state: S) => S) => store.setState(command);
  return {
    edit: (make: (page: PageData) => PageData) => run((state) => edit(state, make, env.limit)),
    editAndEndDraft: (make: (page: PageData) => PageData) =>
      run((state) => editAndEndDraft(state, make, env.limit)),
    editInLastStep: (make: (page: PageData) => PageData) =>
      run((state) => editInLastStep(state, make, env.limit)),
    setDraft: (draft: Draft | null) => run((state) => setDraft(state, draft)),
    setWaiting: (waiting: boolean) => run((state) => setWaiting(state, waiting)),
    step: (move: (history: History<PageData>) => History<PageData>) =>
      run((state) => step(state, move)),
    markSaved: () => run(markSaved),
    saveWith: (make: ((page: PageData) => PageData) | null) =>
      run((state) => saveWith(state, make, env.limit)),
  };
}

export type DocumentCommands = ReturnType<typeof documentCommands<DocumentState & SelectionState>>;
