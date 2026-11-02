import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { type EditorView, viewOf } from "./control";
import type { EditorApi } from "./control-api";
import { controllerState, createEditor, type EditorController, idleView } from "./controller";
import { shallowEqual } from "./shallow";
import { type EditorState, useOptionalStore } from "./store";

export const ApiContext = createContext<EditorApi | null>(null);

/** Gives the parts drawn inside one editor its control object. */
export function ControlProvider({ api, children }: { api: EditorApi; children: ReactNode }) {
  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>;
}

/**
 * A controller for `<Editor controller={...} />`, made once for the part that calls this (it stays the
 * same across renders and under StrictMode). The part and everything below it can drive the editor
 * from outside its tree with it.
 */
export function useCreateEditor(): EditorController {
  return useState(createEditor)[0];
}

/** Where a hook reads the editor from: a state it can follow, and the means to follow it. */
type Source = { subscribe(listener: () => void): () => void; snapshot(): EditorState | null };

const nothing: Source = { subscribe: () => () => {}, snapshot: () => null };

/**
 * Inside the editor: the control object of the editor this part is drawn in (`editor.save()`). With a
 * selector it reads a piece of the editor instead (`useEditor((view) => view.canUndo)`), and the part is
 * drawn again only when what the selector gives changes; the members of a new object or array are
 * compared, so a selector may build one.
 *
 * Anywhere, with a controller made by `useCreateEditor()` and given to `<Editor controller>`: the
 * controller itself, or a piece of the editor attached to it (an idle view while there is none).
 */
export function useEditor(): EditorApi;
export function useEditor(controller: EditorController): EditorController;
export function useEditor<R>(select: (view: EditorView) => R): R;
export function useEditor<R>(controller: EditorController, select: (view: EditorView) => R): R;
export function useEditor<R>(
  first?: EditorController | ((view: EditorView) => R),
  second?: (view: EditorView) => R,
): EditorApi | EditorController | R {
  const controller = typeof first === "object" ? first : undefined;
  const select = typeof first === "function" ? first : second;
  const api = useContext(ApiContext);
  const store = useOptionalStore();
  // The editor held by a controller, or the one this part is drawn in: one way to follow either.
  const source = useMemo<Source>(
    () =>
      controller
        ? controllerState(controller)
        : store
          ? { subscribe: store.subscribe, snapshot: store.getState }
          : nothing,
    [controller, store],
  );
  const last = useRef<{ result: unknown } | null>(null);
  const handle = controller ?? api;
  // The same result, in the very same object, while its members are the same, so a part is drawn
  // again only when what it reads has changed.
  const read = () => {
    const state = source.snapshot();
    const next = select ? select(state ? viewOf(state) : idleView) : handle;
    if (last.current && shallowEqual(last.current.result, next)) return last.current.result;
    last.current = { result: next };
    return next;
  };
  const result = useSyncExternalStore(source.subscribe, read, read);
  if (!handle) throw new Error("useEditor must be used inside <Editor>");
  return result as EditorApi | EditorController | R;
}
