import type { PageData, Registry } from "@midito-kitchen/core";
import { amend, commit, createHistory, type History } from "../history";
import { change } from "./change";
import type { EditorStore } from "./create-editor-store";
import { type Denial, guard, type Intent, type Permissions } from "./permissions";
import { afterStep } from "./selection";
import type { DocumentState, Draft, SelectionState } from "./state";

/**
 * What a command needs besides the state, and that the host can change while the editor is open:
 * how many steps of history are kept, and the kinds of block there are. It is read when a command runs.
 */
export type Env = {
  limit: unknown;
  registry: Registry;
  /** What the host lets people do. Without it nothing is asked. */
  permissions?: Permissions | undefined;
  /** Told when a change is refused. */
  denied?: ((denial: Denial) => void) | undefined;
  /** Set while a command runs when a change was refused, so the command can be given up whole. */
  refusal?: { endsDraft: boolean } | null | undefined;
};

// The commands on the page being edited. Like the others they are plain functions of the state, and
// they give back the very state when nothing changes: a page that comes out of a change as the same
// object is no step of history and is no change for the host.

/** A page just opened: nothing to undo, nothing changed since it was saved. */
export function initialDocumentState(page: PageData): DocumentState {
  return { history: createHistory(page), savedPage: page, draft: null, waiting: false };
}

/**
 * Asks the permissions about a change. `true` when it is refused: the host is told and the command that
 * made it is marked refused, so it can be given up whole (see `runner`).
 */
function refuses(
  state: DocumentState,
  next: PageData,
  env: Env,
  intent: Intent,
  endsDraft: boolean,
): boolean {
  const denial = guard(state.history.present, next, env.permissions, intent);
  if (!denial) return false;
  env.denied?.(denial);
  env.refusal = { endsDraft: (env.refusal?.endsDraft ?? false) || endsDraft };
  return true;
}

/** Stores one change as one step. */
export function edit<S extends DocumentState>(
  state: S,
  make: (page: PageData) => PageData,
  env: Env,
  intent?: Intent,
): S {
  const next = make(state.history.present);
  if (refuses(state, next, env, intent, false)) return state;
  const history = commit(state.history, next, env.limit);
  return change(state, { history } as Partial<S>);
}

/** Like `edit`, and what is pending in a panel is over: it was stored, or it is dropped. */
export function editAndEndDraft<S extends DocumentState>(
  state: S,
  make: (page: PageData) => PageData,
  env: Env,
  intent?: Intent,
): S {
  const next = make(state.history.present);
  if (refuses(state, next, env, intent, true)) return change(state, { draft: null } as Partial<S>);
  const history = commit(state.history, next, env.limit);
  return change(state, { history, draft: null } as Partial<S>);
}

/** Puts a change into the step before it, so a run of small ones (a held arrow key) is one step to undo. */
export function editInLastStep<S extends DocumentState>(
  state: S,
  make: (page: PageData) => PageData,
  env: Env,
): S {
  const next = make(state.history.present);
  if (refuses(state, next, env, undefined, false)) return state;
  const history = amend(state.history, next, env.limit);
  return change(state, { history } as Partial<S>);
}

export const setWaiting = <S extends DocumentState>(state: S, waiting: boolean): S =>
  change(state, { waiting } as Partial<S>);

export const setDraft = <S extends DocumentState>(state: S, draft: Draft | null): S =>
  change(state, { draft } as Partial<S>);

/**
 * One step back or forward. What is pending is dropped, and the selection stays if its block does
 * (see `afterStep`). It is all one change, so nothing is drawn with the page of one and the selection
 * of the other. Never refused: it only walks back through changes that were allowed.
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
  env: Env,
): S {
  const stored = make ? editAndEndDraft(state, make, env) : state;
  return markSaved(stored);
}

/** The commands tied to a store. `env.limit` is read each time, because the host can change it. */
export function documentCommands<S extends DocumentState & SelectionState>(
  store: EditorStore<S>,
  env: Env,
) {
  const run = runner(store, env);
  return {
    edit: (make: (page: PageData) => PageData) => run((state) => edit(state, make, env)),
    editAndEndDraft: (make: (page: PageData) => PageData) =>
      run((state) => editAndEndDraft(state, make, env)),
    editInLastStep: (make: (page: PageData) => PageData) =>
      run((state) => editInLastStep(state, make, env)),
    setDraft: (draft: Draft | null) => run((state) => setDraft(state, draft)),
    setWaiting: (waiting: boolean) => run((state) => setWaiting(state, waiting)),
    step: (move: (history: History<PageData>) => History<PageData>) =>
      run((state) => step(state, move)),
    markSaved: () => run(markSaved),
    saveWith: (make: ((page: PageData) => PageData) | null) =>
      run((state) => saveWith(state, make, env)),
  };
}

export type DocumentCommands = ReturnType<typeof documentCommands<DocumentState & SelectionState>>;

/**
 * The way the commands of one store change its state. A command that was refused anywhere is given up
 * whole: the state comes back as it was (with the pending panel change dropped when it was that change
 * that was refused), so nothing that follows an edit (selecting what was added, clearing what was
 * deleted) happens for an edit that did not. Says whether the command was refused.
 */
export function runner<S extends DocumentState>(store: EditorStore<S>, env: Env) {
  return (command: (state: S) => S): boolean => {
    let refused = false;
    store.setState((state) => {
      env.refusal = null;
      const next = command(state);
      const refusal = takeRefusal(env);
      if (!refusal) return next;
      refused = true;
      return refusal.endsDraft && state.draft
        ? change(state, { draft: null } as Partial<S>)
        : state;
    });
    return refused;
  };
}

/** What the command that just ran was refused for, if it was; and forget it. */
function takeRefusal(env: Env) {
  const refusal = env.refusal;
  env.refusal = null;
  return refusal;
}
