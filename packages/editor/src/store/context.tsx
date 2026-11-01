import { createContext, type ReactNode, useContext, useMemo } from "react";
import { useStore as useZustand } from "zustand";
import { useShallow } from "zustand/react/shallow";
import type { EditorStore } from "./create-editor-store";
import type { EditorState } from "./state";
import { type ViewCommands, viewCommands } from "./view";

const StoreContext = createContext<EditorStore<never> | null>(null);

/** Gives the parts of one editor its store; a second editor on the page brings its own. */
export function StoreProvider<S extends object>({
  store,
  children,
}: {
  store: EditorStore<S>;
  children: ReactNode;
}) {
  return (
    <StoreContext.Provider value={store as EditorStore<never>}>{children}</StoreContext.Provider>
  );
}

/** The store itself, to give it commands. It does not draw the part again when the state changes. */
export function useStoreApi<S extends object>(): EditorStore<S> {
  const store = useContext(StoreContext);
  if (!store) throw new Error("The store is read outside of an editor");
  return store as unknown as EditorStore<S>;
}

/**
 * One piece of the state. The part is drawn again only when the piece changes, compared with
 * `Object.is`, so a selector that gives back a new object or array every time must use
 * `useStoreShallow` instead, or the part is drawn again for ever.
 */
export function useStore<S extends object, R>(select: (state: S) => R): R {
  return useZustand(useStoreApi<S>(), select);
}

/** Like `useStore`, for a piece made of a new object or array each time: its members are compared. */
export function useStoreShallow<S extends object, R>(select: (state: S) => R): R {
  return useZustand(useStoreApi<S>(), useShallow(select));
}

/** `useStore` for the state of the editor, so a part does not spell the type out. */
export const useEditorState = <R,>(select: (state: EditorState) => R): R =>
  useStore<EditorState, R>(select);

/** The commands on the view (frame, zoom, tool, announcements). They stay the same for the life of the editor. */
export function useViewCommands(): ViewCommands {
  const store = useStoreApi<EditorState>();
  return useMemo(() => viewCommands(store), [store]);
}
