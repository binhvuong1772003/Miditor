import { createContext, type ReactNode, useContext } from "react";
import { type EditorView, viewOf } from "./control";
import type { EditorApi } from "./control-api";
import { type EditorState, useStoreShallow } from "./store";

export const ApiContext = createContext<EditorApi | null>(null);

/** Gives the parts drawn inside one editor its control object. */
export function ControlProvider({ api, children }: { api: EditorApi; children: ReactNode }) {
  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>;
}

/**
 * The control object of the editor this part is drawn in, to drive it from code (`editor.save()`).
 * With a selector it reads a piece of the editor instead (`useEditor((view) => view.canUndo)`), and the
 * part is drawn again only when what the selector gives changes; the members of a new object or array
 * are compared, so a selector may build one.
 */
export function useEditor(): EditorApi;
export function useEditor<R>(select: (view: EditorView) => R): R;
export function useEditor<R>(select?: (view: EditorView) => R): EditorApi | R {
  const api = useContext(ApiContext);
  if (!api) throw new Error("useEditor must be used inside <Editor>");
  // Called either way, so the order of hooks does not depend on the argument.
  const read = useStoreShallow<EditorState, R | undefined>((state) =>
    select ? select(viewOf(state)) : undefined,
  );
  return select ? (read as R) : api;
}
