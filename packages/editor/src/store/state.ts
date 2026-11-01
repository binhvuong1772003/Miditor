import type { Device } from "@midito-kitchen/core";

/** The panel the tool rail shows beside the canvas. */
export type Tool = "blocks" | "layers" | "images" | "themes";

/**
 * How the editor is looked at, none of it in the page data or its history: the width the page is shown
 * at, the zoom of the canvas, the tool of the rail and whether its panel is open, and what a screen
 * reader is told.
 */
export type ViewState = {
  frame: Device;
  zoom: number;
  tool: Tool;
  panelOpen: boolean;
  announcement: string;
};

/** The words of a block being typed on the block itself: which block and which of its props. */
export type Editing = { id: string; prop: string; multiline: boolean };

/**
 * What is selected, and where the editor is working. It belongs to the editor, not to the page data:
 * Save does not include it.
 */
export type SelectionState = {
  /** The block the panel and the handles are for. */
  selectedId: string | null;
  /** More blocks selected with Shift or a box, besides `selectedId`: children of the same parent. */
  picked: string[];
  /** The block whose children a press selects: the page at the start, a group once it is entered. */
  scopeId: string;
  hoverId: string | null;
  editing: Editing | null;
};

/** What the editor keeps in its store; the pieces of state move here a few at a time. */
export type EditorState = ViewState & SelectionState;
