import type { Device, PageData } from "@midito-kitchen/core";
import type { History } from "../history";
import type { PanelPatch } from "../patch";

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

/** A change that is being made in a panel and is only drawn: a colour being picked, a number being typed. */
export type Draft = PanelPatch & { id: string };

/** The page that is being edited, the steps that led to it and what has been saved of it. */
export type DocumentState = {
  history: History<PageData>;
  /** The page as it was when it was last saved (or opened), to say whether there is more than that. */
  savedPage: PageData;
  draft: Draft | null;
  /** A change waits for its delayed `onChange`, so the page is not yet what the host has. */
  waiting: boolean;
};

/** What the editor keeps in its store; the pieces of state move here a few at a time. */
export type EditorState = ViewState & SelectionState & DocumentState;
