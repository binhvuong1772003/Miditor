import { createStore, type StoreApi } from "zustand/vanilla";

/**
 * Everything the editor knows lives in one store, outside React, so a part of the screen can read
 * just its piece and be drawn again only when that piece changes.
 *
 * Reading is `get()`, writing is `set(next)`, and `subscribe(listener)` is told after a change. A
 * change that gives back the very state it was handed (`set((state) => state)`) tells nobody, which
 * is what lets a command that has nothing to do leave the page object as it was.
 *
 * Each editor makes its own, so two editors on a page never share a state.
 */
export type EditorStore<S> = StoreApi<S>;

export function createEditorStore<S extends object>(initial: S): EditorStore<S> {
  return createStore<S>()(() => initial);
}
