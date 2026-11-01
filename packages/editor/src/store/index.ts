// The only door to the store library: nothing outside this folder imports it directly.

export { StoreProvider, useStore, useStoreApi, useStoreShallow } from "./context";
export { createEditorStore, type EditorStore } from "./create-editor-store";

/** What the editor keeps in its store; the pieces of state move here a few at a time. */
export type EditorState = Record<never, never>;
