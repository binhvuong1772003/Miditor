import type { Device, PageData } from "@miditor/core";
import { resolveStatus, type SaveStatus } from "./save-status";
import { canRun, type EditorState } from "./store";

/**
 * What a host can read of the editor, as a selector receives it. A plain value made from the store,
 * with no React in it.
 */
export interface EditorView {
  /** @stable The page as it is stored, as `onSave` would receive it: without a pending draft. */
  readonly data: PageData;
  /** @stable The selected block (`null` for none) and the other blocks picked with it. */
  readonly selection: {
    readonly id: string | null;
    readonly picked: readonly string[];
  };
  /** @stable The width the page is shown at. */
  readonly frame: Device;
  /** @experimental The zoom of the canvas, 1 for the page at its own size. */
  readonly zoom: number;
  /** @stable Whether there is a step to undo. */
  readonly canUndo: boolean;
  /** @stable Whether there is a step to redo. */
  readonly canRedo: boolean;
  /** @stable What the header says, or `undefined` when it says nothing. */
  readonly status: SaveStatus | undefined;
}

/** The read side of the editor for one state of its store. Pure. */
export function viewOf(state: EditorState): EditorView {
  return {
    data: state.history.present,
    selection: { id: state.selectedId, picked: state.picked },
    frame: state.frame,
    zoom: state.zoom,
    canUndo: canRun(state, "history.undo"),
    canRedo: canRun(state, "history.redo"),
    status: resolveStatus(state.hostStatus, {
      hasSave: state.hasSave,
      clean: state.history.present === state.savedPage,
      waiting: state.waiting,
    }),
  };
}
