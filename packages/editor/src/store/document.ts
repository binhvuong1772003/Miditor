import type { PageData, Registry, TreeNode } from "@miditor/core";
import { amend, commit, createHistory, type History } from "../history";
import type { Measured } from "../phone-freeze";
import { change } from "./change";
import type { EditorStore } from "./create-editor-store";
import { type Denial, guard, type Intent, type Permissions } from "./permissions";
import { afterStep } from "./selection";
import type { DocumentState, Draft, SelectionState } from "./state";

/** What a change of the page was: the name of the command that made it. @experimental */
export type EditorActionType =
  | "edit"
  | "history.undo"
  | "history.redo"
  | "history.jump"
  | "block.add"
  | "block.drop"
  | "block.edit"
  | "block.duplicate"
  | "block.group"
  | "block.ungroup"
  | "block.delete"
  | "block.reorder"
  | "block.paste"
  | "block.rect"
  | "block.place"
  | "block.turn"
  | "block.nudge"
  | "block.anchor"
  | "block.align"
  | "block.distribute"
  | "block.reparent"
  | "phone.reset"
  | "phone.arrange"
  | "page.info"
  | "page.theme"
  | "sources.update"
  | (string & {});

/**
 * What `onAction` is told besides the pages: the kind of change and the blocks it was about (the block
 * that was edited, the ones selected when a command ran, the block an add made). @experimental
 */
export interface EditorAction {
  type: EditorActionType;
  ids: readonly string[];
}

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
  /**
   * Where each free block is drawn now, by id, when a phone draws the page as a flow: the editor gives
   * it so that the first change of the phone layout can place every block where it is drawn.
   */
  measurePhone?: ((root: TreeNode) => ReadonlyMap<string, Measured> | null) | undefined;
  /** Told after a command that changed the page was kept, with the page after it and the page before it. */
  onAction?: ((action: EditorAction, page: PageData, prevPage: PageData) => void) | undefined;
  /**
   * Set while a command runs when it first stored a change that was pending in a panel (see `settle`): which
   * block, and the page right after that, so the runner tells it as a change of its own.
   */
  settled?: { id: string; page: PageData } | null | undefined;
  /** Set while a command runs when a change was refused, so the command can be given up whole. */
  refusal?: { endsDraft: boolean } | null | undefined;
};

// The commands on the page being edited. Like the others they are plain functions of the state, and
// they give back the very state when nothing changes: a page that comes out of a change as the same
// object is no step of history and is no change for the host.

/**
 * A page just opened, nothing changed since it was saved. Without `steps` there is nothing to undo; with
 * them (what a host kept of an earlier session) there is what came before the page and what undo took away.
 */
export function initialDocumentState(
  page: PageData,
  steps?: { past: readonly PageData[]; future: readonly PageData[] },
): DocumentState {
  const history = steps
    ? { past: steps.past, present: page, future: steps.future }
    : createHistory(page);
  return { history, savedPage: page, draft: null, waiting: false };
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
 * deleted) happens for an edit that did not. Says whether the command was refused. A command that
 * changed the page and was kept is told to `env.onAction`, after the state is set, with `action` (or the
 * plain `"edit"`) and the blocks it was about. A change that was pending in a panel and was stored first
 * by the command is told on its own, as an edit of its block, before the command.
 */
export function runner<S extends DocumentState>(store: EditorStore<S>, env: Env) {
  return (
    command: (state: S) => S,
    action?: { type: EditorActionType; ids?: readonly string[] },
  ): boolean => {
    let refused = false;
    const told: { action: EditorAction; page: PageData; prev: PageData }[] = [];
    store.setState((state) => {
      env.refusal = null;
      env.settled = null;
      told.length = 0;
      const next = command(state);
      const refusal = takeRefusal(env);
      const settled = takeSettled(env);
      if (!refusal) {
        let from = state.history.present;
        if (settled) {
          told.push({
            action: { type: "block.edit", ids: [settled.id] },
            page: settled.page,
            prev: from,
          });
          from = settled.page;
        }
        if (next.history.present !== from) {
          told.push({
            action: {
              type: action?.type ?? "edit",
              ids: action?.ids ?? idsOf(state, next, action?.type),
            },
            page: next.history.present,
            prev: from,
          });
        }
        return next;
      }
      refused = true;
      return refusal.endsDraft && state.draft
        ? change(state, { draft: null } as Partial<S>)
        : state;
    });
    if (!refused) for (const done of told) env.onAction?.(done.action, done.page, done.prev);
    return refused;
  };
}

/** The blocks a command was about when it did not say: the new one for an add, else the selected ones. */
function idsOf(before: DocumentState, after: DocumentState, type: EditorActionType | undefined) {
  const at = (state: DocumentState) => state as Partial<SelectionState>;
  if (type === "block.add" || type === "block.drop" || type === "block.paste") {
    const id = at(after).selectedId;
    return id ? [id, ...(at(after).picked ?? [])] : [];
  }
  const { selectedId, picked } = at(before);
  return selectedId ? [selectedId, ...(picked ?? [])] : [];
}

/** The change that was pending in a panel and that the command that just ran stored first, if any; and forget it. */
function takeSettled(env: Env) {
  const settled = env.settled;
  env.settled = null;
  return settled;
}

/** What the command that just ran was refused for, if it was; and forget it. */
function takeRefusal(env: Env) {
  const refusal = env.refusal;
  env.refusal = null;
  return refusal;
}
