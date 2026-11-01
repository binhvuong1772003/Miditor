import type { Registry } from "@midito-kitchen/core";
import { createContext, type ReactNode, useContext, useMemo, useRef } from "react";
import { useStore as useZustand } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { type CommandContext, type CommandHooks, createRun, type Run } from "./commands";
import { type ContentCommands, contentCommands } from "./content";
import type { EditorStore } from "./create-editor-store";
import { type DocumentCommands, documentCommands } from "./document";
import { type GeometryCommands, geometryCommands } from "./geometry";
import { type SelectionCommands, selectionCommands } from "./selection";
import type { EditorState } from "./state";
import { type StructureCommands, structureCommands } from "./structure";
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

/** The commands on the selection. They stay the same for the life of the editor. */
export function useSelectionCommands(): SelectionCommands {
  const store = useStoreApi<EditorState>();
  return useMemo(() => selectionCommands(store), [store]);
}

/**
 * The commands on the page being edited. `limit` is how many steps of history are kept; it can change
 * while the editor is open, so the commands read it when they run.
 */
export function useDocumentCommands(
  limit: unknown,
  registry: Registry,
): DocumentCommands & StructureCommands & GeometryCommands & ContentCommands {
  const store = useStoreApi<EditorState>();
  const env = useRef({ limit, registry });
  env.current.limit = limit;
  env.current.registry = registry;
  return useMemo(
    () => ({
      ...documentCommands(store, env.current),
      ...structureCommands(store, env.current),
      ...geometryCommands(store, env.current),
      ...contentCommands(store, env.current),
    }),
    [store],
  );
}

/**
 * The door for the commands by name. It stays the same for the life of the editor and takes what the
 * host and the screen give at the time a command runs: `context` and `hooks` are the ones of the last
 * render, so a measure never goes stale.
 */
export function useRun(
  limit: unknown,
  registry: Registry,
  context: CommandContext,
  hooks?: CommandHooks,
): Run {
  const store = useStoreApi<EditorState>();
  const live = useRef({ env: { limit, registry }, context, hooks });
  live.current.env.limit = limit;
  live.current.env.registry = registry;
  live.current.context = context;
  live.current.hooks = hooks;
  return useMemo(
    () =>
      createRun(
        store,
        live.current.env,
        () => live.current.context,
        () => live.current.hooks ?? {},
      ),
    [store],
  );
}
