import { emptyPage } from "@miditor/core";
import type { EditorView } from "./control";
import type { EditorApi } from "./control-api";
import type { EditorState, EditorStore } from "./store";

/**
 * A handle a host makes to drive an editor from outside its tree. It has every command of
 * `EditorApi`; the editor given this controller (`<Editor controller={...} />`) attaches to it when it
 * opens and lets go when it closes. With no editor attached a command does nothing and says `false`.
 */
export interface EditorController extends EditorApi {}

/** What the controller knows of the editor it holds. */
type Attached = {
  api: EditorApi;
  store: EditorStore<EditorState>;
  stopWatching: () => void;
};

type Record = {
  attached: Attached | null;
  listeners: Set<() => void>;
  warned: boolean;
};

const records = new WeakMap<EditorController, Record>();

const recordOf = (controller: EditorController): Record => {
  const record = records.get(controller);
  if (!record) throw new Error("not a controller made by createEditor");
  return record;
};

/** @stable A controller to give to `<Editor controller={...} />`. Made once: see `useCreateEditor`. */
export function createEditor(): EditorController {
  const record: Record = { attached: null, listeners: new Set(), warned: false };
  const warn = () => {
    if (record.warned) return;
    record.warned = true;
    console.warn("[miditor] an editor command was called with no editor attached: ignored");
  };
  // One command: handed to the attached editor, or the answer of "nothing to do".
  const to = <K extends keyof EditorApi>(name: K, none: ReturnType<EditorApi[K]>) =>
    ((...args: unknown[]) => {
      const held = record.attached;
      if (!held) {
        warn();
        return none;
      }
      return (held.api[name] as (...given: unknown[]) => unknown)(...args);
    }) as EditorApi[K];
  const controller: EditorController = {
    undo: to("undo", false),
    redo: to("redo", false),
    save: to("save", Promise.resolve(false)),
    select: to("select", false),
    clearSelection: to("clearSelection", false),
    setFrame: to("setFrame", false),
    setZoom: to("setZoom", false),
    fit: to("fit", false),
    addBlock: to("addBlock", null),
    remove: to("remove", false),
    duplicate: to("duplicate", false),
    group: to("group", false),
    ungroup: to("ungroup", false),
    checkSources: to("checkSources", Promise.resolve()),
    getHistory: to("getHistory", { past: [], future: [], index: 0 }),
    jumpTo: to("jumpTo", false),
    setHistory: to("setHistory", false),
  };
  records.set(controller, record);
  return controller;
}

const tell = (record: Record) => {
  for (const listener of [...record.listeners]) listener();
};

/**
 * An editor takes hold of a controller. Gives back the function that lets go, or `null` when another
 * editor holds it (the first keeps it, and an error says so). Not part of the package's surface.
 */
export function attachController(
  controller: EditorController,
  editor: { api: EditorApi; store: EditorStore<EditorState> },
): (() => void) | null {
  const record = recordOf(controller);
  if (record.attached) {
    console.error(
      "[miditor] this controller already belongs to another editor: the second editor is ignored",
    );
    return null;
  }
  const held: Attached = {
    ...editor,
    stopWatching: editor.store.subscribe(() => tell(record)),
  };
  record.attached = held;
  tell(record);
  return () => {
    if (record.attached !== held) return;
    held.stopWatching();
    record.attached = null;
    tell(record);
  };
}

/** What a hook needs to follow the editor held by a controller, whichever it is and whenever it comes. */
export function controllerState(controller: EditorController) {
  const record = recordOf(controller);
  return {
    subscribe(listener: () => void): () => void {
      record.listeners.add(listener);
      return () => {
        record.listeners.delete(listener);
      };
    },
    /** The state of the editor held, or `null` when there is none. */
    snapshot(): EditorState | null {
      return record.attached?.store.getState() ?? null;
    },
  };
}

/** What a read gives while no editor is attached: an empty page, nothing selected, nothing to undo. */
export const idleView: EditorView = {
  data: emptyPage(),
  selection: { id: null, picked: [] },
  frame: "desktop",
  zoom: 1,
  canUndo: false,
  canRedo: false,
  status: undefined,
};
