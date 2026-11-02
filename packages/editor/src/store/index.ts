// The only door to the store library: nothing outside this folder imports it directly.

export { applyPatch, withBoxFor, withDraft } from "./apply-patch";
export {
  type ArgsOf,
  type CanState,
  type CommandArgs,
  type CommandContext,
  type CommandHooks,
  type CommandName,
  canRun,
  type Run,
} from "./commands";
export { type ContentCommands, tidyTheme, withTheme } from "./content";
export {
  StoreProvider,
  useDocumentCommands,
  useEditorState,
  useHostSync,
  useOptionalStore,
  useRun,
  useSelectionCommands,
  useStore,
  useStoreApi,
  useStoreShallow,
  useViewCommands,
} from "./context";
export { createEditorStore, type EditorStore } from "./create-editor-store";
export { type DocumentCommands, initialDocumentState } from "./document";
export type { GeometryCommands } from "./geometry";
export { initialHostState, setHost } from "./host";
export { createNotifier, type Notifier } from "./notifier";
export { initialSelectionState, type SelectionCommands } from "./selection";
export type {
  DocumentState,
  Draft,
  Editing,
  EditorState,
  HostState,
  SelectionState,
  Tool,
  ViewState,
} from "./state";
export type { StructureCommands } from "./structure";
export { initialViewState, type ViewCommands } from "./view";
