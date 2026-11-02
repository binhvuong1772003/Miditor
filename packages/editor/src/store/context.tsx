import type { Registry } from "@miditor/core";
import { createContext, type ReactNode, useContext, useEffect, useMemo, useRef } from "react";
import { useStore as useZustand } from "zustand";
import { useShallow } from "zustand/react/shallow";
import type { SaveStatus } from "../save-status";
import { type CommandContext, type CommandHooks, createRun, type Run } from "./commands";
import { type ContentCommands, contentCommands } from "./content";
import type { EditorStore } from "./create-editor-store";
import { type DocumentCommands, documentCommands, type Env } from "./document";
import { type GeometryCommands, geometryCommands } from "./geometry";
import { setHost } from "./host";
import { coalesced, type Denial, type Permissions } from "./permissions";
import { type SelectionCommands, selectionCommands } from "./selection";
import type { EditorState } from "./state";
import { type StructureCommands, structureCommands } from "./structure";
import { type ViewCommands, viewCommands } from "./view";

/** What the host says about who may do what; read each time a command runs, so it may change. */
export type HostRules = {
  permissions?: Permissions | undefined;
  denied?: ((denial: Denial) => void) | undefined;
};

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

/** The store of the editor this part is drawn in, or `null` outside an editor. */
export function useOptionalStore(): EditorStore<EditorState> | null {
  return useContext(StoreContext) as EditorStore<EditorState> | null;
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
  rules?: HostRules,
): DocumentCommands & StructureCommands & GeometryCommands & ContentCommands {
  const store = useStoreApi<EditorState>();
  const env = useRef<Env>({ limit, registry });
  env.current.limit = limit;
  env.current.registry = registry;
  env.current.permissions = rules?.permissions;
  env.current.denied = rules?.denied;
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
  rules?: HostRules,
): Run {
  const store = useStoreApi<EditorState>();
  const live = useRef({ env: { limit, registry } as Env, context, hooks });
  live.current.env.limit = limit;
  live.current.env.registry = registry;
  live.current.env.permissions = rules?.permissions;
  live.current.env.denied = rules?.denied;
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

/** Keep what the host told the editor (`status`, `onSave`) in the store, changing it only when it changes. */
export function useHostSync(hostStatus: SaveStatus | undefined, hasSave: boolean): void {
  const store = useStoreApi<EditorState>();
  useEffect(() => {
    store.setState((state) => setHost(state, { hostStatus, hasSave }));
  }, [store, hostStatus, hasSave]);
}

/**
 * What the host said about who may do what (`permissions`, `onDenied`), as the commands read it. A
 * refusal is told to the host and to the screen reader after the change has been settled, not from inside
 * the store's update, so a host that reacts by driving the editor is safe.
 */
export function useHostRules(
  permissions: Permissions | undefined,
  onDenied: ((denial: Denial) => void) | undefined,
  announce: (text: string) => void,
  deniedText: string,
): HostRules {
  const live = useRef({ onDenied, announce, deniedText });
  live.current = { onDenied, announce, deniedText };
  const denied = useMemo(
    () =>
      coalesced((denial: Denial) => {
        queueMicrotask(() => {
          live.current.onDenied?.(denial);
          live.current.announce(live.current.deniedText);
        });
      }),
    [],
  );
  return { permissions, denied };
}
